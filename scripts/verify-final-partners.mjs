// Opt-in real local inference + actual Sentry transport acknowledgement.
// Run: node --env-file-if-exists=.env.local scripts/verify-final-partners.mjs
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {investigate,newState} from '../lib/engine.mjs';
import {verifyFix} from '../lib/verify-fix.mjs';
import {runAutopsy} from '../lib/autopsy-workflow.mjs';
import {initTelemetry,traced} from '../lib/telemetry.mjs';
import {markdownReport} from '../lib/ai.mjs';
const source=JSON.parse(await readFile('evidence/real-world-case.json','utf8'));
const proof={startedAt:new Date().toISOString(),kind:'Actual historical investigation, portable fix, local-model Mastra workflow and opt-in live Sentry transport',model:'qwen2.5-coder:1.5b',sentryConfigured:Boolean(process.env.SENTRY_DSN),deliveries:[],status:'running'};
let sdk;
if(proof.sentryConfigured){
  sdk=await import('@sentry/node');
  await initTelemetry({transport:options=>{
    const live=sdk.makeNodeTransport(options);
    return {flush:timeout=>live.flush(timeout),send:async envelope=>{
      const serialized=JSON.stringify(envelope);
      if(serialized.includes(source.repo)||serialized.includes('PACKAGE_MANIFEST_ACCESS')||serialized.includes('require.resolve'))throw Error('Privacy assertion failed: source/check content in telemetry.');
      const entries=envelope[1].filter(([header])=>header.type==='transaction').map(([,event])=>({traceId:event.contexts?.trace?.trace_id,name:event.transaction,spans:event.spans?.length||0}));
      const result=await live.send(envelope);
      proof.deliveries.push({statusCode:result.statusCode,...entries[0],transactions:entries.length,privacyAssertion:'No repository path, check failure text or check expression in serialized envelope'});
      return result;
    }};
  }});
}
let state;
try{
  state=await traced('Submission evidence: historical clsx case','task',{},async()=>{
    const value=await investigate({...source,repeats:2},newState(randomUUID()));
    if(value.status!=='complete'||value.result.candidate!==source.result.candidate)throw Error('Historical boundary was not reproduced.');
    value.realWorld=source.realWorld;
    value.verification=await verifyFix(value,{patch:source.verification.proposal.patch});
    if(value.verification.status!=='passed')throw Error('Portable compatibility patch did not pass.');
    console.log('Historical boundary and portable patch confirmed; starting actual local-model Mastra workflow.');
    const analysis=await runAutopsy(value,proof.model,{useMastra:true});
    value.analysis={status:'complete',...analysis};return value;
  });
  proof.caseId=state.id;proof.candidate=state.result.candidate;proof.checks=state.runs.length;
  proof.fixStatus=state.verification.status;proof.fixChecks=state.verification.runs.length;
  proof.mastra=state.analysis.orchestration;proof.inference={model:state.analysis.model,durationMs:state.analysis.durationMs,tokens:state.analysis.tokens,summary:state.analysis.summary};
  await mkdir('.data/reports',{recursive:true});
  await writeFile(`.data/reports/${state.id}.json`,JSON.stringify(state));
  await writeFile('evidence/final-partner-case.json',JSON.stringify(state,null,2));
  await writeFile('evidence/final-partner-case.md',markdownReport(state));
  proof.status='passed';
}catch(error){proof.status='failed';proof.error=error.message;process.exitCode=1;}
finally{
  if(sdk)proof.sentryFlushed=await sdk.flush(10000);
  proof.liveSentryAcknowledged=proof.deliveries.some(delivery=>delivery.statusCode===200);
  proof.finishedAt=new Date().toISOString();
  proof.limits='HTTP acknowledgement is transport evidence, not a dashboard screenshot. Model citations are validated but its reasoning still needs review. Same-machine execution; no T480 benchmark or exactly-once claim.';
  await writeFile('evidence/final-partner-run.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
}
