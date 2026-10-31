import { Worker, NativeConnection } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import * as activities from './activities.mjs';
import { initTelemetry, flushTelemetry } from '../../lib/telemetry.mjs';
await initTelemetry();
const connection=await NativeConnection.connect({address:process.env.TEMPORAL_ADDRESS||'127.0.0.1:7233'});
try{
  const worker=await Worker.create({connection,taskQueue:process.env.TOD_TEMPORAL_TASK_QUEUE||'time-of-death',workflowsPath:fileURLToPath(new URL('./workflows.cjs',import.meta.url)),
    activities,maxConcurrentActivityTaskExecutions:1,maxConcurrentWorkflowTaskExecutions:1,maxCachedWorkflows:0});
  console.log('Time of Death durable worker ready. One investigation at a time.');
  await worker.run();
}finally{await flushTelemetry();await connection.close();}
