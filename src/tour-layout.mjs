export function tourPlacement(target,viewport,card){
  const pad=14,gap=18,width=Math.min(380,Math.max(1,viewport.width-pad*2));
  const height=Math.min(card.height||260,Math.max(1,viewport.height-pad*2));
  const clamp=(value,min,max)=>Math.max(min,Math.min(value,Math.max(min,max)));
  if(!target)return {left:(viewport.width-width)/2,top:Math.max(pad,(viewport.height-height)/2),width,side:'center',hole:null};
  const left=clamp(target.left-8,pad,viewport.width-pad),top=clamp(target.top-8,pad,viewport.height-pad);
  const right=clamp(target.right+8,pad,viewport.width-pad),bottom=clamp(target.bottom+8,pad,viewport.height-pad);
  const hole={left,top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};
  let x,y,side;
  if(viewport.width-right>=width+gap+pad){x=right+gap;y=top;side='right';}
  else if(left>=width+gap+pad){x=left-gap-width;y=top;side='left';}
  else if(viewport.height-bottom>=height+gap+pad){x=left;y=bottom+gap;side='bottom';}
  else if(top>=height+gap+pad){x=left;y=top-gap-height;side='top';}
  else{x=(viewport.width-width)/2;y=viewport.height-height-pad;side='bottom';}
  return {left:clamp(x,pad,viewport.width-width-pad),top:clamp(y,pad,viewport.height-height-pad),width,side,hole};
}

export const TOUR_STEPS=[
  {target:'[name="repo"]',title:'Open a case.',body:'Start with an absolute path to a trusted local Git repository. Time of Death investigates a separate checkout, so your working files and staged changes stay where you left them.'},
  {target:'[name="good"]',title:'Give the search its boundaries.',body:'Choose an earlier revision where your check passes and a later revision where it fails. Use a linear history; the search assumes a reproducible transition from good to bad.'},
  {target:'[name="command"]',title:'One failure. One repeatable check.',body:'Enter a check command: exit 0 means good, a targeted failure means bad, and exit 125 skips a revision. Open “Replay a new check in old revisions” to use a portable Node script instead.'},
  {target:'.begin',title:'Let the investigation begin.',body:'Confirm that you trust the code before running it. Check readiness tests just the endpoints; Begin investigation searches the history. The synthetic case in the header is a safe way to learn the workflow.'},
  {target:'#timeline .empty-timeline, #timeline .timeline-scroll',title:'Watch the suspects disappear.',body:'Each mark is a revision. The dithered range narrows as checks eliminate suspects. Select a tested revision to inspect its receipts. Texture shows the unresolved interval, not a probability.'},
  {target:'#selected-evidence .empty-evidence, #selected-evidence .selected-revision',title:'Read what actually happened.',body:'This panel holds the selected revision’s command, exit status, duration, stdout and stderr. These are execution records. A timeout, unstable check or missing dependency must not become a false culprit.'},
  {target:'#candidate .empty-candidate, #candidate .candidate-subject',title:'Establish the time of death.',body:'A boundary is confirmed only when the candidate fails and its parent passes. Inspect its diff, then use “Did the fix work?” to check a proposed patch against the original boundary. A passing check is not proof of semantic correctness.'},
  {target:'#autopsy .established',title:'Evidence first. Autopsy second.',body:'The local model can explain the recorded diff and suggest next checks. Its findings are hypotheses with evidence references. Ollama and a local model are optional; the Git result remains usable without them.'},
  {target:'.export-region',title:'Keep the record.',body:'Export Markdown, JSON or a bug-report draft with the real receipts. Review logs and source paths before sharing. Nothing is posted automatically. Your case archive and this tour are always available from the header.'}
];
