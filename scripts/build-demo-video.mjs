import { spawn } from 'node:child_process';
import { mkdir,writeFile,readFile,access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
if(process.platform!=='win32')throw new Error('Local narration currently uses Windows System.Speech. The scene manifest can be narrated with another offline voice.');
const scenes=JSON.parse(await readFile(path.join(root,'article','DEMO_SCENES.json'),'utf8'));
const work=path.join(root,'work','demo-video');await mkdir(work,{recursive:true});
const execute=(program,args,cwd=root)=>new Promise((resolve,reject)=>{const p=spawn(program,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';p.stderr.on('data',x=>{output=(output+x).slice(-4000);});p.stdout.on('data',()=>{});p.on('error',reject);p.on('close',code=>code===0?resolve():reject(new Error(`${program}: ${output}`)));});
const captions=[];let at=0;const list=[];
const stamp=value=>{const ms=Math.round(value*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
for(let i=0;i<scenes.length;i++){
  const scene=scenes[i],image=path.resolve(root,scene.image);if(!image.startsWith(path.join(root,'evidence')+path.sep))throw new Error('Scene images must be recorded project evidence.');await access(image);
  const prefix=String(i+1).padStart(2,'0'),textFile=path.join(work,prefix+'.txt'),audio=path.join(work,prefix+'.wav'),output=path.join(work,prefix+'.mp4');
  await writeFile(textFile,scene.narration);
  await execute('powershell.exe',['-NoProfile','-File',path.join(root,'scripts','Narrate-Scene.ps1'),'-TextFile',textFile,'-OutputFile',audio]);
  const wav=await readFile(audio);let offset=12,bytes=0,rate=0;
  while(offset+8<=wav.length){const name=wav.toString('ascii',offset,offset+4),length=wav.readUInt32LE(offset+4);if(name==='fmt ')rate=wav.readUInt32LE(offset+16);if(name==='data'){bytes=length;break;}offset+=8+length+(length%2);}
  if(!bytes||!rate)throw new Error('Could not measure narrated audio');const duration=bytes/rate;
  await execute('ffmpeg.exe',['-y','-loglevel','error','-loop','1','-framerate','15','-i',image,'-i',audio,'-vf','scale=1280:640:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x100D0E','-t',String(duration),'-c:v','libx264','-preset','veryfast','-crf','21','-threads','4','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k',output]);
  list.push(`file '${prefix}.mp4'`);captions.push(`${i+1}\n${stamp(at)} --> ${stamp(at+duration)}\n${scene.caption}\n`);at+=duration;console.log(`Rendered scene ${i+1}/${scenes.length}`);
}
await writeFile(path.join(work,'scenes.txt'),list.join('\n'));
const destination=path.resolve(root,'../time-of-death-walkthrough.mp4');
await execute('ffmpeg.exe',['-y','-loglevel','error','-f','concat','-safe','0','-i','scenes.txt','-c','copy','-movflags','+faststart',destination],work);
await writeFile(path.resolve(root,'../time-of-death-walkthrough.srt'),captions.join('\n'));
await writeFile(path.join(root,'evidence','walkthrough-build.json'),JSON.stringify({createdAt:new Date().toISOString(),durationSeconds:at,scenes:scenes.length,format:'1280x720 H.264/AAC, 15 fps',source:'Actual app screenshots assembled into a narrated walkthrough; not a continuous live screen recording',narration:'Windows Microsoft David Desktop, synthesized locally',paidServices:false,output:destination},null,2));
console.log(`Saved ${destination} (${at.toFixed(1)} seconds)`);
