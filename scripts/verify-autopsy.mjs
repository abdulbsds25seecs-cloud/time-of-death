import { readFile,writeFile,readdir } from 'node:fs/promises';
import { runAutopsy } from '../lib/autopsy-workflow.mjs';
import { initTelemetry,flushTelemetry } from '../lib/telemetry.mjs';
const files=await readdir(new URL('../.data/reports/',import.meta.url));
let state;
for(const file of files){const value=JSON.parse(await readFile(new URL('../.data/reports/'+file,import.meta.url),'utf8'));if(value.synthetic&&value.status==='complete'){state=value;break;}}
if(!state)throw new Error('Run the synthetic demo first. This verification uses synthetic evidence only.');
const envelopes=[];
await initTelemetry({dsn:'https://public@example.invalid/1',transport:()=>({send:async envelope=>{envelopes.push(envelope);return {statusCode:200};},flush:async()=>true})});
const analysis=await runAutopsy(state,process.argv[2]||'qwen2.5-coder:1.5b',{useMastra:true});
await flushTelemetry();
await writeFile(new URL('../evidence/mastra-local-autopsy.json',import.meta.url),JSON.stringify({testedAt:new Date().toISOString(),synthetic:true,caseId:state.id,analysis},null,2));
await writeFile(new URL('../evidence/sentry-local-envelopes.json',import.meta.url),JSON.stringify({destination:'Local in-memory test transport; not uploaded to Sentry',envelopes},null,2));
console.log(JSON.stringify({framework:analysis.orchestration.framework,steps:analysis.orchestration.steps,model:analysis.model,durationMs:analysis.durationMs,tokens:analysis.tokens,capturedEnvelopes:envelopes.length,summary:analysis.summary},null,2));
