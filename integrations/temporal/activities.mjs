import { Context } from '@temporalio/activity';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { investigate, newState } from '../../lib/engine.mjs';
import { runAutopsy } from '../../lib/autopsy-workflow.mjs';
import { traced } from '../../lib/telemetry.mjs';
const root = fileURLToPath(new URL('../../',import.meta.url));
const atomic = async (dest,value) => { await writeFile(dest+'.tmp',JSON.stringify(value)); await rename(dest+'.tmp',dest); };

export async function investigateActivity(config,id) {
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw new Error('Invalid case ID');
  const context=Context.current();
  const directory=path.join(root,'.data','durable',id); await mkdir(directory,{recursive:true});
  await mkdir(path.join(root,'.data','reports'),{recursive:true});
  const checkpointFile=path.join(directory,'checks.json');
  let cache={};try{cache=JSON.parse(await readFile(checkpointFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  let resumed=0,queue=Promise.resolve();
  const state=newState(id);
  const reportFile=path.join(root,'.data','reports',`${id}.json`);
  const emit=s=>{
    s.durability={framework:'Temporal',workflowId:id,attempt:context.info.attempt,resumedChecks:resumed,
      note:'Completed checks are checkpointed on this machine. An in-flight check can repeat after a crash.'};
    const snapshot=JSON.parse(JSON.stringify(s));
    queue=queue.then(()=>atomic(reportFile,snapshot));
  };
  const heartbeat=()=>context.heartbeat({completedChecks:Object.keys(cache).length,resumedChecks:resumed});
  const timer=setInterval(heartbeat,2000);heartbeat();
  try {
    await traced('Durable investigation','task',{},()=>investigate(config,state,emit,context.cancellationSignal,{
      async executeCheck(key,perform){
        const index=JSON.stringify(key);
        if(cache[index]){resumed++;return {...cache[index],resumed:true};}
        const result=await perform();
        if(!result.cancelled&&!result.timedOut){cache[index]=result;await atomic(checkpointFile,cache);heartbeat();}
        return result;
      }
    }));
    if(config.model&&state.result&&!context.cancellationSignal.aborted){
      state.analysis={status:'running'};emit(state);
      try{state.analysis={status:'complete',...await runAutopsy(state,config.model)};}
      catch(e){state.analysis={status:'error',error:e.message};}
    }
    emit(state);await queue;
    // Keep Temporal's result small; complete output is in the local case archive.
    return {id:state.id,status:state.status,candidate:state.result?.candidate,resumedChecks:resumed,reportFile};
  } finally {clearInterval(timer);await queue;}
}
