import { mkdtemp,rm,writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { git,run } from './process.mjs';
import { classification,inspectRepository } from './engine.mjs';

export async function verifyFix(source,proposal,emit=()=>{},signal){
  const result={status:'running',startedAt:new Date().toISOString(),phase:'Preparing fix verification',runs:[],checks:[],
    scope:'Verifies only the supplied regression check. Passing does not prove a complete or semantically correct fix. Review changes to tests and dependencies.'};
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
