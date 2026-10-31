import { evidencePacket, analyze, validateAnalysis } from './ai.mjs';
import { traced } from './telemetry.mjs';

// Lazy loading keeps Mastra's dependency graph out of the lightweight default mode.
export async function runAutopsy(state, model, { useMastra = process.env.TOD_MASTRA === '1', infer = analyze, signal } = {}) {
  signal?.throwIfAborted();
  if (!useMastra) return traced('Local autopsy', 'gen_ai.invoke_agent', {'gen_ai.request.model':model,'gen_ai.operation.name':'invoke_agent'}, () => infer(state, model, {signal}));
  const [{ createStep, createWorkflow }, { z }] = await Promise.all([import('@mastra/core/workflows'), import('zod')]);
  const input = z.object({ state: z.any(), model: z.string() });
  const prepared = input.extend({ packet: z.array(z.object({ id:z.string(), kind:z.string(), text:z.string() })) });
  const generated = z.object({ analysis:z.any(), packet:prepared.shape.packet });
  const output = z.object({ analysis:z.any() });
  const steps = [];
  const execute = (id, work) => async context => traced(id, id==='local-model'?'gen_ai.chat':'gen_ai.workflow.step', {'gen_ai.request.model':model}, async () => {
    const started=performance.now(); const result=await work(context.inputData);
    steps.push({id,durationMs:Math.round(performance.now()-started),status:'complete'}); return result;
  });
  const prepare = createStep({id:'collect-evidence', inputSchema:input, outputSchema:prepared,
    execute:execute('collect-evidence', data => ({...data,packet:evidencePacket(data.state)}))});
  const generate = createStep({id:'local-model',inputSchema:prepared,outputSchema:generated,
    execute:execute('local-model', async data => ({packet:data.packet,analysis:await infer(data.state,data.model,{signal})}))});
  const validate = createStep({id:'validate-citations',inputSchema:generated,outputSchema:output,
    execute:execute('validate-citations', data => ({analysis:{...data.analysis,...validateAnalysis(data.analysis,data.packet)}}))});
  const workflow=createWorkflow({id:'evidence-autopsy',inputSchema:input,outputSchema:output}).then(prepare).then(generate).then(validate).commit();
  return traced('Evidence autopsy workflow','gen_ai.invoke_agent',{'gen_ai.request.model':model,'gen_ai.operation.name':'invoke_agent'},async()=>{
    const run=await workflow.createRun(); const result=await run.start({inputData:{state,model}});
    if(result.status!=='success')throw new Error('The Mastra autopsy workflow failed validation or inference. Recorded investigation evidence remains available.');
    return {...result.result.analysis,orchestration:{framework:'Mastra',workflow:'evidence-autopsy',steps}};
  });
}
