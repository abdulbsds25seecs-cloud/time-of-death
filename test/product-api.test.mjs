import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createDemo } from '../lib/demo.mjs';
import { investigate,newState } from '../lib/engine.mjs';
import { createApp } from '../server.mjs';

test('product HTTP flow requires trust, preserves the boundary during fix checks and exports a draft',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'tod-product-api-'));
  const fixture=await createDemo(root,{count:4,brokenAt:3});
  const original=await investigate({...fixture,repeats:1},newState('api-original'));
  const app=await createApp({port:0,dataDir:root});const address=await app.listen(),base=`http://127.0.0.1:${address.port}`;
  try{
    await writeFile(path.join(root,'reports',original.id+'.json'),JSON.stringify(original));
    const token=(await(await fetch(base)).text()).match(/name="app-token" content="([^"]+)"/)[1];
    const headers={'x-app-token':token,'content-type':'application/json'};
    const post=(url,value)=>fetch(base+url,{method:'POST',headers,body:JSON.stringify(value)});
    assert.equal((await post('/api/doctor',fixture)).status,400);
    const doctor=await(await post('/api/doctor',{...fixture,repeats:1,trusted:true})).json();
    const wait=async(load,done)=>{const deadline=Date.now()+15000;while(Date.now()<deadline){const value=await load();if(done(value))return value;await new Promise(r=>setTimeout(r,20));}throw new Error('API operation did not settle');};
    const readiness=await wait(async()=>{
      const state=await(await fetch(`${base}/api/investigations/${doctor.id}`,{headers})).json();
      const health=await(await fetch(base+'/api/health',{headers})).json();return {state,health};
    },x=>x.state.doctor&&!x.health.active);
    assert.equal(readiness.state.doctor.verdict,'ready');assert.equal(readiness.state.result,undefined);
    const endpoint='/api/investigations/'+original.id;
    assert.equal((await post(endpoint+'/verify-fix',{fixRevision:original.result.candidate})).status,400);
    assert.equal((await post(endpoint+'/verify-fix',{fixRevision:original.result.candidate,trusted:true})).status,202);
    const fixed=await wait(async()=>{
      const state=await(await fetch(base+endpoint,{headers})).json();return state;
    },s=>s.verification?.status==='rejected');
    assert.equal(fixed.status,'complete');assert.equal(fixed.result.candidate,original.result.candidate);
    const exported=await fetch(base+endpoint+'/report?format=issue',{headers});
    assert.match(exported.headers.get('content-disposition'),/-issue\.md/);
    assert.match(await exported.text(),/Status: rejected/);
  }finally{
    await app.close();assert.match(path.relative(path.resolve(os.tmpdir()),path.resolve(root)),/^tod-product-api-[^\\/]+$/);await rm(root,{recursive:true,force:true,maxRetries:4});
  }
});
