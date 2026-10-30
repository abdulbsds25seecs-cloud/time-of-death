import test from 'node:test';
import assert from 'node:assert/strict';
import { BAYER_8, suspectRange, revisionStatus, diffRows } from '../src/dither.mjs';

test('ordered threshold matrix has every rank exactly once',()=>{
  const ranks=BAYER_8.flat().sort((a,b)=>a-b);
  assert.deepEqual(ranks,Array.from({length:64},(_,i)=>i));
});
test('suspect range cools only after consistent repeated evidence',()=>{
  const commits=['a','b','c','d','e'].map(hash=>({hash}));
  const s={commits,repeats:2,runs:[{hash:'a',status:'good'},{hash:'a',status:'good'},{hash:'d',status:'bad'}]};
  assert.deepEqual(suspectRange(s),{start:1,end:4,total:5,resolved:false});
  s.runs.push({hash:'d',status:'bad'});
  assert.deepEqual(suspectRange(s),{start:1,end:3,total:5,resolved:false});
  s.runs.push({hash:'b',status:'good'},{hash:'b',status:'bad'});
  assert.equal(revisionStatus(commits[1],s.runs),'unstable');
  assert.equal(suspectRange(s).start,1);
  s.result={candidate:'c'};
  assert.deepEqual(suspectRange(s),{start:2,end:2,total:5,resolved:true});
});
test('diff gutters distinguish old and new line numbers without colour',()=>{
  const rows=diffRows('@@ -5,2 +5,2 @@\n-old\n+new\n same');
  assert.equal(rows[1].oldLine,5);assert.equal(rows[1].newLine,'');
  assert.equal(rows[2].oldLine,'');assert.equal(rows[2].newLine,5);
  assert.equal(rows[3].oldLine,6);assert.equal(rows[3].newLine,6);
  assert.equal(rows[1].kind,'removed');assert.equal(rows[2].kind,'added');
});
