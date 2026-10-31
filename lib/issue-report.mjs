import path from 'node:path';
const code=(text,language='text')=>'```'+language+'\n'+String(text||'').replaceAll('```','` ` `')+'\n```';
export function issueReport(state){
  const result=state.result;
  const lines=[`# ${result?'Regression: '+(result.subject||result.candidate.slice(0,7)):'Unresolved regression investigation'}`,'',
    '## Observed behavior',result?`The supplied check fails at ${result.candidate} and passes at its parent ${result.parent}.`:state.error||state.phase,'',
    '## Reproduction',`Repository: ${path.basename(state.repo||'local repository')}`,
    `Working revision: ${state.good||'not validated'}`,`Failing revision: ${state.bad||'not validated'}`,
    code(state.command),...(state.reproScript?['Portable check used in every revision:',code(state.reproScript,'js')]:[]),'',
    '## Recorded evidence',`Case ${state.id}; status ${state.status}; ${state.runs.length} check executions; ${state.repeats||'unspecified'} execution(s) per selected revision.`];
  if(result){
    lines.push(`Candidate: ${result.candidate}`,`Passing parent: ${result.parent}`,'', '### Candidate diff',code(result.diff,'diff'));
    for(const row of state.runs.filter(r=>['Confirm candidate failure','Confirm previous revision passes'].includes(r.stage)))
      lines.push('',`### ${row.id}: ${row.stage}`,`${row.hash}; ${row.status}; exit ${row.code}; ${row.durationMs} ms.`,code((row.stdout+'\n'+row.stderr).trim().slice(0,6000)));
  }
  if(state.verification){const v=state.verification;lines.push('','## Proposed fix verification',`Status: ${v.status}`,v.message||v.phase,...(v.checks||[]).map(check=>`- ${check.name}: ${check.status}; revision ${check.hash}${check.patched?' with proposed patch':''}; evidence ${check.evidence.join(', ')}`),v.scope||'');if(v.checkIntegrity)lines.push(`Check integrity: ${v.checkIntegrity.status}. ${v.checkIntegrity.message}`);}
  if(state.analysis?.status==='complete')lines.push('','## AI hypothesis for review',state.analysis.summary,'This is model-generated interpretation, not an executed result.');
  lines.push('','## Limits','The boundary assumes a reproducible monotonic regression in the selected linear history. It does not establish semantic root cause. Logs and patches can contain sensitive material; review this draft before posting. No issue has been published by this export.');
  return lines.join('\n');
}
