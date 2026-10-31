import { spawn,spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT||4317);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535.');
const url=`http://127.0.0.1:${port}/`;
async function status(){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(1200)});return (await response.text()).includes('<title>Time of Death')?'ready':'occupied';}
  catch{return 'offline';}
}
function open(){
  console.log(`Open ${url}`);
  if(!process.argv.includes('--no-open')&&process.platform==='win32'){
    const browser=spawn(process.env.ComSpec||'cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'});
    browser.on('error',()=>console.log('Open the address above in your browser.'));browser.unref();
  }
}
try{
  const current=await status();
  if(current==='ready'){console.log('Time of Death is already running. Reusing it.');open();}
  else{
    if(current==='occupied')throw new Error(`Port ${port} is being used by another application. Choose another PORT or close that application.`);
    if(process.argv.includes('--check-only'))throw new Error('Time of Death is not running.');
    const [major,minor]=process.versions.node.split('.').map(Number);
    if(major<22||(major===22&&minor<13))throw new Error('Install Node.js 22.13 or newer, then reopen this launcher.');
    if(spawnSync('git',['--version'],{windowsHide:true,stdio:'ignore'}).status!==0)throw new Error('Git is missing. Install Git, then reopen this launcher.');
    try{await access(new URL('../dist/index.html',import.meta.url));}catch{throw new Error('The built interface is missing. Extract the entire prebuilt ZIP, or run npm ci and npm run build in the source folder.');}
    const child=spawn(process.execPath,['--env-file-if-exists=.env.local','server.mjs'],{cwd:root,windowsHide:true,stdio:'inherit'});
    let failed;child.on('error',error=>{failed=error;});
    let ready=false;
    for(let i=0;i<60;i++){
      if(failed)throw failed;
      if(child.exitCode!==null)throw new Error('The server could not start. Read the error above; keep this window open when asking for help.');
      if(await status()==='ready'){ready=true;break;}
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    if(!ready)throw new Error('The server did not become ready. Read the terminal output above.');
    console.log('Keep this terminal open. Press Ctrl+C to stop the server.');open();
  }
}catch(error){console.error(`\nCould not open Time of Death: ${error.message}`);process.exitCode=1;}
