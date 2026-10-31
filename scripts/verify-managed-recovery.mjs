import net from 'node:net';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const executable=process.argv[2]||process.env.TEMPORAL_CLI;
if(!executable)throw Error('Pass the path to your already installed Temporal CLI. No cloud service is required.');
const reservation=net.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
const service=spawn(executable,['server','start-dev','--headless','--port',String(port),'--db-filename',path.resolve(`work/temporal-final-${randomUUID()}.db`),'--log-level','error'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let log='',startupError;service.stdout.on('data',chunk=>{log=(log+chunk).slice(-2000);});service.stderr.on('data',chunk=>{log=(log+chunk).slice(-2000);});service.on('error',error=>{startupError=error;});
try{
  const deadline=Date.now()+30000;let ready=false;
  while(Date.now()<deadline){
    if(startupError)throw startupError;if(service.exitCode!==null)throw Error('Temporal exited: '+log);
    ready=await new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.on('connect',()=>{socket.destroy();resolve(true);});socket.on('error',()=>resolve(false));socket.setTimeout(400,()=>{socket.destroy();resolve(false);});});
    if(ready)break;await new Promise(r=>setTimeout(r,200));
  }
  if(!ready)throw Error('Temporal startup timed out.');
  const exit=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/verify-recovery.mjs'],{windowsHide:true,env:{...process.env,SENTRY_DSN:'',TEMPORAL_ADDRESS:`127.0.0.1:${port}`},stdio:'inherit'});child.on('error',reject);child.on('close',resolve);});
  if(exit!==0)throw Error('Worker recovery verification failed.');
}finally{if(service.exitCode===null){service.kill('SIGINT');await Promise.race([new Promise(r=>service.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);if(service.exitCode===null)service.kill('SIGKILL');}}
