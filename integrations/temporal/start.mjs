import { Client, Connection } from '@temporalio/client';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createDemo } from '../../lib/demo.mjs';
import { fileURLToPath } from 'node:url';
const [argument,existingId]=process.argv.slice(2);
if(!argument)throw new Error('Use npm run durable -- --demo, a trusted config.json path, or --result workflow-id.');
const connection=await Connection.connect({address:process.env.TEMPORAL_ADDRESS||'127.0.0.1:7233'});
try{
  const client=new Client({connection});
  if(argument==='--result')console.log(JSON.stringify(await client.workflow.getHandle(existingId).result(),null,2));
  else{
    const config=argument==='--demo'?{...await createDemo(fileURLToPath(new URL('../../.data/',import.meta.url))),synthetic:true,repeats:2}:JSON.parse(await readFile(argument,'utf8'));
    const id=randomUUID();
    const handle=await client.workflow.start('durableInvestigation',{taskQueue:'time-of-death',workflowId:id,args:[config,id]});
    console.log(`Workflow ${id} started. You can close this terminal; the worker continues.\nRejoin: npm run durable -- --result ${id}`);
    console.log(JSON.stringify(await handle.result(),null,2));
  }
}finally{await connection.close();}
