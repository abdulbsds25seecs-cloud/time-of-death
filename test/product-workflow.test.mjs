import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createDemo } from '../lib/demo.mjs';
import { investigate,newState } from '../lib/engine.mjs';
import { checkReadiness } from '../lib/doctor.mjs';
import { verifyFix } from '../lib/verify-fix.mjs';
import { issueReport } from '../lib/issue-report.mjs';
import { markdownReport } from '../lib/ai.mjs';
import { git } from '../lib/process.mjs';

test('readiness, proposed fix and issue-draft workflow',async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'tod-product-'));
  t.after(async()=>{assert.match(path.relative(path.resolve(os.tmpdir()),path.resolve(root)),/^tod-product-[^\\/]+$/);await rm(root,{recursive:true,force:true,maxRetries:4});});
  const fixture=await createDemo(root,{count:5,brokenAt:3});
  await t.test('doctor checks repeated endpoints without declaring a culprit',async()=>{
    const state=await checkReadiness({...fixture,repeats:2},newState('doctor-ready'));
    assert.equal(state.status,'ready',state.error);assert.equal(state.doctor.verdict,'ready');assert.equal(state.runs.length,4);assert.equal(state.result,undefined);
    assert.ok(state.runs.every(row=>!row.stage.includes('Narrowing')));
  });
  await t.test('doctor diagnoses a missing check and reads scripts without running them',async()=>{
    // No package.json exists in this fixture; a missing command must remain blocked.
    const state=await checkReadiness({...fixture,command:'node missing-check.mjs',repeats:1},newState('doctor-missing'));
    assert.equal(state.doctor.verdict,'blocked');assert.equal(state.issue.kind,'dependency');assert.match(state.doctor.suggestions.join(' '),/portable Node check/);assert.equal(state.result,undefined);
  });
  const original=await investigate({...fixture,repeats:2,failurePattern:'A session at its exact expiration'},newState('fix-baseline'));
  assert.equal(original.status,'complete',original.error);
  const patch='diff --git a/session.mjs b/session.mjs\n--- a/session.mjs\n+++ b/session.mjs\n@@ -1,4 +1,4 @@\n // Epoch timestamps use the same units. Sessions expire at expiresAt.\n export function sessionIsValid(now, expiresAt) {\n-  return now <= expiresAt;\n+  return now < expiresAt;\n }\n';
  await writeFile(path.join(fixture.repo,'private-untracked.txt'),'KEEP ME');
  const before=(await git(fixture.repo,['status','--porcelain'])).stdout;
  await t.test('a real patch produces pass/fail/pass receipts and preserves the source tree',async()=>{
    const verified=await verifyFix(original,{patch});
    assert.equal(verified.status,'passed',verified.message);
    assert.deepEqual(verified.checks.map(check=>check.status),['good','bad','good']);assert.equal(verified.runs.length,6);
    assert.ok(verified.runs.filter(row=>row.variant==='Proposed fix').every(row=>row.patched));
    assert.equal((await git(fixture.repo,['status','--porcelain'])).stdout,before);
    assert.equal(await readFile(path.join(fixture.repo,'private-untracked.txt'),'utf8'),'KEEP ME');
    original.verification=verified;
    const issue=issueReport(original);assert.match(issue,/Proposed fix: good/);assert.match(issue,/No issue has been published/);assert.ok(issue.includes(original.result.candidate));
    assert.match(markdownReport(original),/V6/);
  });
  await t.test('a proposal that still fails is rejected and an invalid patch stays inconclusive',async()=>{
    const rejected=await verifyFix(original,{fixRevision:original.result.candidate});
    assert.equal(rejected.status,'rejected');assert.equal(rejected.checks.at(-1).status,'bad');
    const invalid=await verifyFix(original,{patch:'not a unified diff'});assert.equal(invalid.status,'inconclusive');assert.equal(invalid.checks.length,2);
    const conflicting=await verifyFix(original,{patch,fixRevision:'HEAD'});assert.equal(conflicting.status,'inconclusive');assert.equal(conflicting.runs.length,0);
  });
  await t.test('cancellation cannot produce a passing fix verdict',async()=>{
    const controller=new AbortController();controller.abort();const value=await verifyFix(original,{patch},()=>{},controller.signal);
    assert.equal(value.status,'cancelled');assert.equal(value.runs.length,0);
  });
});
