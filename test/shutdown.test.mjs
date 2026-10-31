import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';

test('shutdown aborts AI, saves its outcome and restart preserves the established boundary',async t=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'tod-shutdown-'));
  t.after(async()=>{assert.match(path.relative(os.tmpdir(),dataDir),/^tod-shutdown-[^\\/]+$/);await rm(dataDir,{recursive:true,force:true,maxRetries:4});});
  let started;
  const entered=new Promise(resolve=>{started=resolve;});
  const app=await createApp({port:0,dataDir,analyzeCase:(_s,_model,{signal})=>new Promise((_resolve,reject)=>{
    started();signal.addEventListener('abort',()=>reject(new Error('Autopsy cancelled during shutdown.')),{once:true});
  })});
  const address=await app.listen(),base=`http://127.0.0.1:${address.port}`;
  const id='shutdown-ai',result={candidate:'bad',parent:'good',diff:''};
  await writeFile(path.join(dataDir,'reports',id+'.json'),JSON.stringify({id,status:'complete',createdAt:new Date().toISOString(),commits:[],runs:[],result}));
  try{
    const token=(await(await fetch(base)).text()).match(/name="app-token" content="([^"]+)"/)[1];
    const headers={'x-app-token':token,'content-type':'application/json'};
    assert.equal((await fetch(`${base}/api/investigations/${id}/analysis`,{method:'POST',headers,body:'{}'})).status,202);
    await entered;
    await Promise.all([app.close(),app.close()]);
    const saved=JSON.parse(await readFile(path.join(dataDir,'reports',id+'.json'),'utf8'));
    assert.equal(saved.analysis.status,'error');assert.match(saved.analysis.error,/cancelled/);
    assert.equal(saved.status,'complete');assert.deepEqual(saved.result,result);
  }finally{await app.close();}
  const restarted=await createApp({port:0,dataDir});
  try{
    const next=await restarted.listen(),url=`http://127.0.0.1:${next.port}`;
    const token=(await(await fetch(url)).text()).match(/name="app-token" content="([^"]+)"/)[1];
    const current=await(await fetch(`${url}/api/investigations/${id}`,{headers:{'x-app-token':token}})).json();
    assert.equal(current.analysis.status,'error');assert.deepEqual(current.result,result);
  }finally{await restarted.close();}
});
