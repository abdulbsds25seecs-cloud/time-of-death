import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
process.env.SENTRY_DSN='';
const dataDir=await mkdtemp(path.resolve('work/final-journey-'));
const proof={startedAt:new Date().toISOString(),surface:'Real loopback HTTP API, bundled frontend and persisted reports',steps:[],dataDir,status:'running'};
let app,base,headers,id;
const wait=async load=>{const deadline=Date.now()+60000;while(Date.now()<deadline){const value=await load();if(value)return value;await new Promise(r=>setTimeout(r,40));}throw Error('Journey step did not settle.');};
async function start(){app=await createApp({port:0,dataDir});const address=await app.listen();base=`http://127.0.0.1:${address.port}`;const html=await(await fetch(base)).text();const token=html.match(/name="app-token" content="([^"]+)"/)[1];headers={'x-app-token':token,'content-type':'application/json'};return html;}
const get=url=>fetch(base+url,{headers}).then(r=>r.json());
const post=async(url,body)=>{const r=await fetch(base+url,{method:'POST',headers,body:JSON.stringify(body)});assert.ok(r.ok,await r.clone().text());return r.json();};
const settled=async caseId=>wait(async()=>{const s=await get('/api/investigations/'+caseId),h=await get('/api/health');return !['queued','running'].includes(s.status)&&!h.active?s:false;});
try{
  const html=await start();assert.match(html,/Time of Death/);proof.steps.push({name:'Open bundled app',status:'passed'});
  const demo=await post('/api/demo',{});
  const doctor=await settled((await post('/api/doctor',{...demo,trusted:true,repeats:2})).id);
  assert.equal(doctor.doctor.verdict,'ready');assert.equal(doctor.result,undefined);proof.steps.push({name:'Check readiness',status:'passed',receipts:doctor.runs.length});
  const completed=await settled((await post('/api/investigations',{...demo,trusted:true,repeats:2})).id);id=completed.id;
  assert.equal(completed.status,'complete',completed.error);assert.equal(completed.result.candidate,demo.expected);proof.steps.push({name:'Confirm expected synthetic boundary',status:'passed',checks:completed.runs.length});
  const patch='diff --git a/session.mjs b/session.mjs\n--- a/session.mjs\n+++ b/session.mjs\n@@ -1,4 +1,4 @@\n // Epoch timestamps use the same units. Sessions expire at expiresAt.\n export function sessionIsValid(now, expiresAt) {\n-  return now <= expiresAt;\n+  return now < expiresAt;\n }\n';
  await post(`/api/investigations/${id}/verify-fix`,{patch,trusted:true});
  const fixed=await wait(async()=>{const s=await get('/api/investigations/'+id),h=await get('/api/health');return s.verification?.status!=='running'&&!h.active?s:false;});
  assert.equal(fixed.verification.status,'passed',fixed.verification.message);assert.equal(fixed.verification.checkIntegrity.status,'restricted');proof.steps.push({name:'Verify scoped application fix',status:'passed',outcomes:fixed.verification.checks.map(c=>c.status)});
  for(const format of ['json','md','issue']){
    const r=await fetch(`${base}/api/investigations/${id}/report?format=${format}`,{headers});assert.equal(r.status,200);const body=await r.text();assert.ok(body.includes(demo.expected));
    if(format==='json')assert.equal(JSON.parse(body).verification.status,'passed');
    if(format==='issue')assert.match(body,/No issue has been published/);
    proof.steps.push({name:`Export ${format}`,status:'passed',bytes:Buffer.byteLength(body)});
  }
  await app.close();app=null;await start();
  const reopened=await get('/api/investigations/'+id);assert.equal(reopened.status,'complete');assert.equal(reopened.verification.status,'passed');assert.equal(reopened.result.candidate,demo.expected);
  assert.ok((await get('/api/history')).some(s=>s.id===id));proof.steps.push({name:'Close, restart and reopen saved case',status:'passed'});
  proof.status='passed';proof.caseId=id;
}catch(error){proof.status='failed';proof.error=error.message;process.exitCode=1;}
finally{await app?.close();proof.finishedAt=new Date().toISOString();proof.limits='This script checks real HTTP/CLI-adjacent backend behavior, not browser pointer, focus, mobile rendering or model accuracy. Separate browser checks and regression tests cover those surfaces.';await writeFile('evidence/final-product-journey.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));}
