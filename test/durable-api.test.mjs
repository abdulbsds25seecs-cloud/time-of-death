import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../server.mjs';

test('durable case polling retains pending AI status and releases the inference lock on completion',async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'time-of-death-api-'));
  let resolveAnalysis;
  const app=await createApp({port:0,dataDir,analyzeCase:()=>new Promise(resolve=>{resolveAnalysis=resolve;})});
  const address=await app.listen(),base=`http://127.0.0.1:${address.port}`;
  try{
    const html=await (await fetch(base)).text();const token=html.match(/name="app-token" content="([^"]+)"/)[1];
    const headers={'x-app-token':token,'content-type':'application/json'};
    const id='durable-api-test';
    await writeFile(path.join(dataDir,'reports',id+'.json'),JSON.stringify({id,status:'complete',createdAt:new Date().toISOString(),commits:[],runs:[],durability:{framework:'Temporal',workflowId:id},result:{candidate:'bad',parent:'good',diff:''}}));
    const endpoint=`${base}/api/investigations/${id}`;
    assert.equal((await fetch(endpoint+'/analysis',{method:'POST',headers,body:'{}'})).status,202);
    assert.equal((await (await fetch(endpoint,{headers})).json()).analysis.status,'running');
    assert.equal((await fetch(base+'/api/investigations',{method:'POST',headers,body:'{}'})).status,409);
    resolveAnalysis({summary:'Finished',findings:[],nextChecks:[]});
    let current;
    for(let i=0;i<30;i++){current=await (await fetch(endpoint,{headers})).json();if(current.analysis.status==='complete')break;await new Promise(r=>setTimeout(r,10));}
    assert.equal(current.analysis.status,'complete');
    // The next request reaches its trust validation instead of a stale inference lock.
    assert.equal((await fetch(base+'/api/investigations',{method:'POST',headers,body:'{}'})).status,400);
  }finally{
    resolveAnalysis?.({});await app.close();
    const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(dataDir));
    assert.match(relative,/^time-of-death-api-[^\\/]+$/);await rm(dataDir,{recursive:true,force:true});
  }
});
