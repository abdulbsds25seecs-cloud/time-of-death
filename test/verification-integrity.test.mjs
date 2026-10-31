import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createDemo} from '../lib/demo.mjs';
import {investigate,newState} from '../lib/engine.mjs';
import {verifyFix} from '../lib/verify-fix.mjs';
import {git} from '../lib/process.mjs';

const fix='diff --git a/session.mjs b/session.mjs\n--- a/session.mjs\n+++ b/session.mjs\n@@ -1,4 +1,4 @@\n // Epoch timestamps use the same units. Sessions expire at expiresAt.\n export function sessionIsValid(now, expiresAt) {\n-  return now <= expiresAt;\n+  return now < expiresAt;\n }\n';

test('fix integrity covers revision proposals, test inputs and injected portable checks',async t=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'tod-integrity-'));
  t.after(async()=>{assert.match(path.relative(os.tmpdir(),root),/^tod-integrity-[^\\/]+$/);await rm(root,{recursive:true,force:true,maxRetries:4});});
  const fixture=await createDemo(root,{count:4,brokenAt:3});
  const original=await investigate({...fixture,repeats:1},newState('integrity'));
  assert.equal(original.status,'complete',original.error);
  const check=await readFile(path.join(fixture.repo,'check.mjs'),'utf8');
  await writeFile(path.join(fixture.repo,'check.mjs'),'process.exit(0);\n');
  await git(fixture.repo,['add','check.mjs']);await git(fixture.repo,['-c','user.name=Time of Death Test','-c','user.email=test@example.invalid','commit','-m','Weaken check']);
  const revision=(await git(fixture.repo,['rev-parse','HEAD'])).stdout.trim();
  await t.test('revision proposals cannot disable the entry check',async()=>{
    const result=await verifyFix(original,{fixRevision:revision});
    assert.equal(result.status,'inconclusive');assert.equal(result.checkIntegrity.status,'blocked');
    assert.deepEqual(result.checkIntegrity.files,['check.mjs']);assert.equal(result.checks.length,2);
    assert.ok(!result.runs.some(row=>row.variant==='Proposed fix'));
  });
  await t.test('renaming a check and adding a test helper cannot bypass review',async()=>{
    for(const patch of [
      'diff --git a/check.mjs b/moved.mjs\nsimilarity index 100%\nrename from check.mjs\nrename to moved.mjs\n',
      'diff --git a/test/helper.mjs b/test/helper.mjs\nnew file mode 100644\n--- /dev/null\n+++ b/test/helper.mjs\n@@ -0,0 +1 @@\n+process.exit(0);\n'
    ]){
      const result=await verifyFix(original,{patch});
      assert.equal(result.status,'inconclusive',result.message);assert.equal(result.checkIntegrity.status,'blocked');
    }
  });
  await t.test('compound shell checks request a portable check instead of certifying a fix',async()=>{
    const result=await verifyFix({...original,command:'node check.mjs && node --version'},{patch:fix});
    assert.equal(result.status,'inconclusive');assert.equal(result.checkIntegrity.status,'blocked');
    assert.match(result.message,/portable Node check/);assert.equal(result.checks.length,2);
  });
  await t.test('portable script stays independent of a replaced committed check',async()=>{
    const source={...original,reproScript:check};
    const failed=await verifyFix(source,{fixRevision:revision});
    assert.equal(failed.status,'rejected');assert.equal(failed.checkIntegrity.status,'injected');
    const passed=await verifyFix(source,{patch:fix});
    assert.equal(passed.status,'passed',passed.message);assert.equal(passed.checkIntegrity.status,'injected');
    assert.deepEqual(passed.checks.map(row=>row.status),['good','bad','good']);
    assert.match(passed.checkIntegrity.sha256,/^[a-f0-9]{64}$/);
  });
});
