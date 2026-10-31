// Opt-in end-to-end check against an already running local Temporal service.
import { Client,Connection } from '@temporalio/client';
import { spawn } from 'node:child_process';
import { readFile,writeFile,rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createDemo } from '../lib/demo.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),id=randomUUID(),taskQueue=`time-of-death-recovery-${id}`;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const connection=await Connection.connect({address:process.env.TEMPORAL_ADDRESS||'127.0.0.1:7233'});
const client=new Client({connection});
let worker,oldCheckout;
const launch=()=>spawn(process.execPath,['integrations/temporal/worker.mjs'],{cwd:root,env:{...process.env,TOD_TEMPORAL_TASK_QUEUE:taskQueue},stdio:['ignore','pipe','pipe'],windowsHide:true});
try{
  const demo=await createDemo(path.join(root,'.data'));
  const config={...demo,synthetic:true,repeats:2,reproScript:"import assert from 'node:assert/strict'; import { sessionIsValid } from './session.mjs'; await new Promise(r=>setTimeout(r,400)); assert.equal(sessionIsValid(1000,1000),false,'expiration regression');"};
  worker=launch();let workerLog='';worker.stdout.on('data',x=>workerLog+=x);worker.stderr.on('data',x=>workerLog+=x);
  const handle=await client.workflow.start('durableInvestigation',{taskQueue,workflowId:id,args:[config,id]});
  const deadline=Date.now()+60000;let cached=0;
  while(Date.now()<deadline){
    try{cached=Object.keys(JSON.parse(await readFile(path.join(root,'.data','durable',id,'checks.json'),'utf8'))).length;}catch{}
    if(cached>=3)break;
    if(worker.exitCode!==null)throw new Error('Worker exited: '+workerLog.slice(-1500));
    await pause(100);
  }
  if(cached<3)throw new Error('No checkpoints recorded within 60 seconds. Check the Temporal service and worker log.');
  try{oldCheckout=JSON.parse(await readFile(path.join(root,'.data','reports',id+'.json'),'utf8')).checkout;}catch{}
  const killedPid=worker.pid;worker.kill('SIGKILL');await new Promise(resolve=>worker.once('exit',resolve));
  worker=launch();worker.stdout.on('data',()=>{});worker.stderr.on('data',()=>{});
  let deadlineTimer;
  const result=await Promise.race([handle.result(),new Promise((_,reject)=>{deadlineTimer=setTimeout(()=>reject(new Error('Recovery did not finish within 90 seconds')),90000);})]).finally(()=>clearTimeout(deadlineTimer));
  if(result.status!=='complete'||result.candidate!==demo.expected||result.resumedChecks<cached)throw new Error('Recovery verification failed: '+JSON.stringify({result,cached,expected:demo.expected}));
  const proof={testedAt:new Date().toISOString(),scenario:'Force-killed native Windows worker after completed check checkpoints; restarted worker against the same SQLite-backed Temporal service',workflowId:id,killedPid,cachedBeforeKill:cached,...result,expectedCandidate:demo.expected,passed:true,limits:'Local checkpoint disk and repository retained; an in-flight check can repeat. This does not test disk loss or remote worker migration.'};
  await writeFile(path.join(root,'evidence','temporal-recovery.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
}finally{
  if(worker&&worker.exitCode===null){worker.kill('SIGINT');await Promise.race([new Promise(r=>worker.once('exit',r)),pause(10000)]);if(worker.exitCode===null)worker.kill('SIGKILL');}
  await connection.close();
  // A forced crash cannot run finally cleanup. Remove only this test's recorded clone.
  if(oldCheckout){const scratch=path.resolve(path.dirname(oldCheckout)),relative=path.relative(path.resolve(os.tmpdir()),scratch);
    if(/^time-of-death-[^\\/]+$/.test(relative))await rm(scratch,{recursive:true,force:true,maxRetries:4,retryDelay:200});}
}
