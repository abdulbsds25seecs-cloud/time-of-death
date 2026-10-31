import { investigate } from './engine.mjs';
import { git } from './process.mjs';

export async function checkReadiness(config,state,emit=()=>{},signal){
  state.operation='doctor';
  await investigate(config,state,emit,signal,{endpointsOnly:true});
  const doctor={verdict:state.status==='ready'?'ready':state.status==='cancelled'?'cancelled':'blocked',
    checks:state.runs.length,diagnosis:state.error||'The supplied check consistently passes at the working revision and fails at the failing revision.',
    suggestions:[],scripts:[],manifests:[]};
  if(state.issue?.kind==='dependency')doctor.suggestions.push('Use a self-contained portable Node check, or prepare the historical environment explicitly. Ignored dependencies from your source checkout are not copied.');
  else if(state.issue?.kind==='unstable')doctor.suggestions.push('Remove clock, network and shared-state dependence from the check before searching history. Repeated outcomes disagreed.');
  else if(state.issue?.kind==='timeout')doctor.suggestions.push('Choose a focused check or increase its timeout. A timeout does not identify a bad commit.');
  else if(doctor.verdict==='blocked')doctor.suggestions.push('Read the endpoint stdout and stderr. Confirm the working revision and use target failure text to exclude unrelated errors.');
  if(!state.reproScript)doctor.suggestions.push('A portable regression script keeps the same test in old revisions where that test did not exist.');
  if(state.repo&&state.good){
    for(const ref of [...new Set([state.good,state.bad])]){
      if(signal?.aborted)break;
      const found=await git(state.repo,['show',`${ref}:package.json`],{allowFailure:true,limit:64000,signal}).catch(()=>null);
      if(found?.code===0&&!found.truncated){try{
        const manifest=JSON.parse(found.stdout);
        doctor.manifests.push({hash:ref,name:typeof manifest.name==='string'?manifest.name.slice(0,100):null,packageManager:typeof manifest.packageManager==='string'?manifest.packageManager.slice(0,100):null});
        for(const [name,command] of Object.entries(manifest.scripts||{}))if(/^[\w:.-]{1,80}$/.test(name)&&typeof command==='string')doctor.scripts.push({hash:ref,name,command:command.slice(0,1000),suggestedCommand:`npm run ${name}`});
      }catch{}}
    }
  }
  state.doctor=doctor;emit(state);return state;
}
