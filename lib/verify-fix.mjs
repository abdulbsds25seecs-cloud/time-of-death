import { mkdtemp,rm,writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { git,run } from './process.mjs';
import { classification,inspectRepository } from './engine.mjs';

// Shell commands can redefine their own checks through scripts/configuration.
// Only a direct Node entry point has an identifiable file we can protect here.
function commandEntry(command=''){
  const match=command.trim().match(/^node\s+(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s"'&|;<>`$]+))$/);
  if(!match)return null;
  const entry=(match[1]||match[2]||match[3]).replaceAll('\\','/').replace(/^\.\//,'');
  return !entry.startsWith('-')&&!path.isAbsolute(entry)&&!entry.split('/').includes('..')&&/\.[cm]?js$/.test(entry)?entry:null;
}
const protectedCheckPath=file=>/(^|\/)(__tests__|__snapshots__|tests?|specs?|fixtures?|test[-_]helpers?)(\/|$)|(^|\/)(package(?:-lock)?\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|\.npmrc)$|(^|\/)[^/]*(?:[.-](?:test|spec)\.[^/]+|(?:jest|vitest|playwright|mocha|babel|tsconfig)[^/]*)$/i.test(file);

export async function verifyFix(source,proposal,emit=()=>{},signal){
  const result={status:'running',startedAt:new Date().toISOString(),phase:'Preparing fix verification',runs:[],checks:[],
    scope:'Verifies only the supplied regression check, not semantic correctness. Portable checks are injected after applying the proposal. Command checks protect the direct Node entry point and recognizable test/configuration paths; review imported helpers and dependency behavior yourself. This is not a tamper-proof sandbox.'};
  let scratch;const started=performance.now();
  const update=()=>{result.elapsedMs=Math.round(performance.now()-started);emit(result);};
  const cancelled=()=>{if(signal?.aborted)throw new Error('Fix verification cancelled.');};
  try{
    if(source.status!=='complete'||!source.result)throw new Error('Confirm a failure boundary first.');
    const patch=typeof proposal.patch==='string'?proposal.patch:'';
    const ref=typeof proposal.fixRevision==='string'?proposal.fixRevision.trim():'';
    if(Boolean(patch.trim())===Boolean(ref))throw new Error('Provide either a patch or a proposed fix revision.');
    if(Buffer.byteLength(patch)>180000)throw new Error('Keep the proposed patch under 180 KB.');
    if(ref&&(ref.startsWith('-')||ref.length>200||/[\x00-\x20]/.test(ref)))throw new Error('Enter a valid proposed fix revision.');
    const info=await inspectRepository(source.repo,source.result.parent,source.result.candidate);
    const fixHash=ref?(await git(info.repo,['rev-parse','--verify','--end-of-options',`${ref}^{commit}`],{signal})).stdout.trim():info.bad;
    if(ref&&(await git(info.repo,['merge-base','--is-ancestor',info.bad,fixHash],{allowFailure:true,signal})).code!==0)throw new Error('The fix revision must descend from the candidate commit.');
    result.proposal=patch.trim()?{kind:'patch',sha256:createHash('sha256').update(patch).digest('hex'),patch}:{kind:'revision',hash:fixHash};
    const repeats=Math.min(3,Math.max(1,Number(source.repeats)||2)),timeout=Math.min(300000,Math.max(500,Number(source.timeoutMs)||30000));
    scratch=await mkdtemp(path.join(os.tmpdir(),'time-of-death-fix-'));
    const checkout=path.join(scratch,'checkout');
    await git(scratch,['clone','--no-hardlinks','--no-checkout','--',info.repo,checkout],{signal,timeout:120000});
    for(const variant of [{name:'Passing parent',hash:info.good,expected:'good'},{name:'Original culprit',hash:info.bad,expected:'bad'},{name:'Proposed fix',hash:fixHash,expected:'good',patched:!!patch.trim()}]){
      cancelled();result.phase=variant.name;update();
      await git(checkout,['reset','--hard'],{signal});await git(checkout,['clean','-fdx'],{signal});await git(checkout,['checkout','--detach','--force',variant.hash],{signal});
      if(variant.patched){
        await git(checkout,['apply','--check','--whitespace=nowarn','-'],{signal,input:patch});
        await git(checkout,['apply','--whitespace=nowarn','-'],{signal,input:patch});
        result.diff=(await git(checkout,['diff','--no-ext-diff','--no-textconv','--binary'],{signal,limit:200000})).stdout;
      }else if(variant.name==='Proposed fix')result.diff=(await git(checkout,['diff','--no-ext-diff','--no-textconv',info.bad,fixHash,'--'],{signal,limit:200000})).stdout;
      if(variant.name==='Proposed fix'){
        if(source.reproScript){
          result.checkIntegrity={status:'injected',kind:'portable',sha256:createHash('sha256').update(source.reproScript).digest('hex'),message:'The recorded portable check is injected after the proposal, using the same script for all three variants.'};
        }else{
          const entry=commandEntry(source.command);
          if(!entry){result.checkIntegrity={status:'blocked',kind:'command',message:'This shell command has no supported immutable entry point. Use a portable Node check.'};throw new Error('Check integrity cannot be established for this shell command. Rerun the investigation with a portable Node check before verifying a fix.');}
          const names=await git(checkout,['diff','--name-only','--no-renames','-z',info.bad,'--'],{signal,limit:1000000});
          // git apply leaves newly added files untracked, so diff alone misses them.
          const added=await git(checkout,['ls-files','--others','-z'],{signal,limit:1000000});
          if(names.truncated||added.truncated)throw new Error('The changed-file list was truncated. No check-integrity verdict was inferred.');
          const changed=[...new Set((names.stdout+'\0'+added.stdout).split('\0').filter(Boolean))];
          const blocked=changed.filter(file=>file.toLowerCase()===entry.toLowerCase()||protectedCheckPath(file));
          if(blocked.length){
            result.checkIntegrity={status:'blocked',kind:'command',entry,files:blocked,message:'The proposal changes the check or test/configuration inputs. Review those changes and use a separate portable check.'};
            throw new Error(`Check integrity blocked: the proposal changes ${blocked.slice(0,5).join(', ')}. A changed test cannot establish a passing fix. Use an independent portable check.`);
          }
          const original=await git(checkout,['show',`${info.bad}:${entry}`],{signal,limit:1000000});
          if(original.truncated)throw new Error('Check entry is too large to fingerprint. Use a portable check.');
          result.checkIntegrity={status:'unchanged',kind:'command',entry,sha256:createHash('sha256').update(original.stdout).digest('hex'),message:'The direct Node check and recognized test/configuration paths are unchanged by the proposal. Imported code still needs review.'};
        }
        update();
      }
      const harness='.tod-verify.mjs';if(source.reproScript)await writeFile(path.join(checkout,harness),source.reproScript);
      const rows=[];
      for(let i=0;i<repeats;i++){
        cancelled();const execution=await run(source.reproScript?process.execPath:source.command,source.reproScript?[harness]:[],{cwd:checkout,shell:!source.reproScript,timeout,limit:16000,signal});
        const row={id:`V${result.runs.length+1}`,variant:variant.name,hash:variant.hash,patched:!!variant.patched,repetition:i+1,...execution,status:classification(execution,source.failurePattern)};
        result.runs.push(row);rows.push(row);update();
        if(['timeout','cancelled','error'].includes(row.status))throw new Error(`${variant.name}: ${row.status}. No fix verdict was inferred.`);
      }
      const statuses=new Set(rows.map(r=>r.status));
      const status=statuses.size===1?rows[0].status:'unstable';
      result.checks.push({...variant,status,evidence:rows.map(r=>r.id)});update();
      if(status==='unstable'||status==='skip')throw new Error(`${variant.name} was ${status}; fix verification is inconclusive.`);
      if(status!==variant.expected){
        result.status=variant.name==='Proposed fix'?'rejected':'inconclusive';
        result.message=variant.name==='Proposed fix'?'The proposed fix still fails the regression check.':'The original boundary no longer reproduces. Review the baseline before judging a fix.';return result;
      }
    }
    result.status='passed';result.message='The parent passes, the culprit fails, and the proposed fix passes on the recorded repeated checks.';
  }catch(error){result.status=signal?.aborted?'cancelled':'inconclusive';result.message=error.message;}
  finally{
    result.phase='Fix verification finished';
    if(scratch){const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(scratch));if(/^time-of-death-fix-[^\\/]+$/.test(relative)){try{await rm(scratch,{recursive:true,force:true,maxRetries:4,retryDelay:200});}catch{result.cleanupWarning=scratch;}}}
    update();
  }
  return result;
}
