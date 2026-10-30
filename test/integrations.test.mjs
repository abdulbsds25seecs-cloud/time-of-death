import test from 'node:test';
import assert from 'node:assert/strict';
import { runAutopsy } from '../lib/autopsy-workflow.mjs';
import { initTelemetry, traced, flushTelemetry } from '../lib/telemetry.mjs';

const state={command:'private command',result:{candidate:'bad',parent:'good',diff:'private diff'},runs:[
  {id:'E1',hash:'bad',stage:'Confirm candidate failure',code:1,stdout:'private log',stderr:''},
  {id:'E2',hash:'good',stage:'Confirm previous revision passes',code:0,stdout:'',stderr:''}
]};
test('Mastra executes evidence, inference and citation validation; rejects invented references',async()=>{
  const infer=async()=>({summary:'A hypothesis',findings:[{explanation:'Review the change',evidence:['D1','E1']}],nextChecks:['Repeat the boundary check'],model:'test-local'});
  const result=await runAutopsy(state,'test-local',{useMastra:true,infer});
  assert.deepEqual(result.orchestration.steps.map(s=>s.id),['collect-evidence','local-model','validate-citations']);
  assert.equal(result.findings[0].kind,'hypothesis');
  await assert.rejects(runAutopsy(state,'test-local',{useMastra:true,infer:async()=>({...await infer(),findings:[{explanation:'Invented',evidence:['E999']} ]})}),/failed validation/);
});
test('Sentry captures nested spans locally with metadata only; no real DSN or cloud request',async()=>{
  const envelopes=[];
  assert.equal(await initTelemetry({dsn:''}),false);
  await initTelemetry({dsn:'https://public@example.invalid/1',transport:()=>({send:async envelope=>{envelopes.push(envelope);return {statusCode:200};},flush:async()=>true})});
  await traced('Evidence autopsy workflow','gen_ai.invoke_agent',{'gen_ai.request.model':'test-local',command:'private command'},()=>
    traced('local-model','gen_ai.chat',{prompt:'private diff',repo:'C:/private/repo'},async()=>({tokens:12,durationMs:34})));
  await flushTelemetry();
  const serialized=JSON.stringify(envelopes);
  assert.ok(envelopes.length>0,'SDK must emit an actual envelope');
  assert.match(serialized,/gen_ai.invoke_agent/);assert.match(serialized,/gen_ai.chat/);
  assert.match(serialized,/output_tokens/);
  assert.doesNotMatch(serialized,/private command|private diff|private\/repo/);
});
