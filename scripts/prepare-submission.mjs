import { spawn } from 'node:child_process';
import { readFile,writeFile,mkdir,access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import net from 'node:net';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const {values}=parseArgs({options:{'skip-tests':{type:'boolean'},'temporal-cli':{type:'string'},video:{type:'boolean'}}});
const report={startedAt:new Date().toISOString(),tasks:[],pending:[],postedAnything:false};
const env={...process.env};
const execute=(program,args,extra={})=>new Promise((resolve,reject)=>{
  const {capture,...options}=extra;let output='';
  const child=spawn(program,args,{cwd:root,env,windowsHide:true,stdio:capture?['ignore','pipe','pipe']:'inherit',...options});
  if(capture)for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output=(output+chunk).slice(-2000000);process.stdout.write(chunk);});
  child.once('error',reject);child.once('close',async code=>{try{if(capture)await writeFile(path.join(root,capture),output);code===0?resolve():reject(new Error(`${path.basename(program)} exited ${code}`));}catch(error){reject(error);}});
});
const task=async(name,work)=>{const started=performance.now();console.log(`\n${name}`);try{await work();report.tasks.push({name,status:'passed',durationMs:Math.round(performance.now()-started)});}catch(error){report.tasks.push({name,status:'failed',error:error.message});throw error;}};
let temporal;
try{
  if(!values['skip-tests'])await task('Build and acceptance tests',()=>process.platform==='win32'?execute(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm test'],{capture:'evidence/acceptance-tests.txt'}):execute('npm',['test'],{capture:'evidence/acceptance-tests.txt'}));
  await task('Historical compatibility investigation, readiness, fix receipts and issue draft',()=>execute(process.execPath,['scripts/real-world-demo.mjs']));
  const proof=JSON.parse(await readFile(path.join(root,'evidence','real-world-case.json'),'utf8'));
  await task('Refresh the article evidence block',async()=>{
    const filename=path.join(root,'article','DRAFT.md');let article=await readFile(filename,'utf8');
    const block=`<!-- automation:real-world:start -->\nThe recorded historical run searched ${proof.result.historySize} commits and executed the check ${proof.result.checks} times in ${(proof.elapsedMs/1000).toFixed(3)} seconds, excluding AI inference. It identified \`${proof.result.candidate.slice(0,7)}\`. Fix verification then ran ${proof.verification.runs.length} checks and recorded parent **good**, original culprit **bad**, proposed patch **good**. These are measurements of this reconstructed manifest-resolution check, not a general project benchmark.\n<!-- automation:real-world:end -->`;
    if(article.includes('<!-- automation:real-world:start -->'))article=article.replace(/<!-- automation:real-world:start -->[\s\S]*?<!-- automation:real-world:end -->/,block);
    else article+='\n\n'+block+'\n';
    await writeFile(filename,article);
  });
  if(values['temporal-cli'])await task('Managed local Temporal service and forced-worker-crash verification',async()=>{
    const reservation=net.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
    env.TEMPORAL_ADDRESS=`127.0.0.1:${port}`;
    temporal=spawn(values['temporal-cli'],['server','start-dev','--headless','--port',String(port),'--db-filename',path.join(root,'.data','temporal-preparation.db'),'--log-level','error'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let startupError;temporal.once('error',e=>{startupError=e;});temporal.stdout.on('data',()=>{});temporal.stderr.on('data',()=>{});
    const deadline=Date.now()+30000;let ready=false;
    while(Date.now()<deadline){if(startupError)throw startupError;if(temporal.exitCode!==null)throw new Error('The local Temporal service exited during startup');
      ready=await new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.setTimeout(500,()=>{socket.destroy();resolve(false);});});
      if(ready)break;await new Promise(r=>setTimeout(r,200));}
    if(!ready)throw new Error('The local Temporal service did not become ready');
    await execute(process.execPath,['scripts/verify-recovery.mjs']);
    temporal.kill('SIGINT');temporal=undefined;
  });
  if(values.video)await task('Narrated walkthrough from recorded app screenshots',()=>execute(process.execPath,['scripts/build-demo-video.mjs']));
  if(process.platform==='win32')await task('Package reviewed source and built frontend',()=>execute('powershell.exe',['-NoProfile','-File','scripts/Package-Release.ps1']));
  else report.pending.push('Run the Windows packaging script or package the built dist with the source.');
  const article=await readFile(path.join(root,'article','DRAFT.md'),'utf8');
  if(/\[add the actual|\[Final repository|\[Real demo|\[Recorded evaluation/.test(article))report.pending.push('Add the public repository and hosted demo/video URLs to the article after publication is authorized.');
  report.pending.push('Create the free Sentry project, configure its DSN locally and verify live trace ingestion. Local test envelopes are not live delivery.');
  report.pending.push('Review the article and exports, then authorize public repository/video/article publication. Nothing is posted by this command.');
  report.status='prepared';
}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;}
finally{
  if(temporal?.pid&&temporal.exitCode===null)temporal.kill('SIGINT');
  report.finishedAt=new Date().toISOString();await mkdir(path.join(root,'evidence'),{recursive:true});
  await writeFile(path.join(root,'evidence','submission-preparation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
