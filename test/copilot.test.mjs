import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDemo } from '../lib/demo.mjs';
import { investigate, newState } from '../lib/engine.mjs';
import { verifyFix } from '../lib/verify-fix.mjs';

test('fix verification does not accept a patch that disables the command-based regression check', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tod-copilot-review-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 4 }));

  const fixture = await createDemo(root, { count: 4, brokenAt: 3 });
  const baseline = await investigate({ ...fixture, repeats: 1 }, newState('copilot-baseline'));
  assert.equal(baseline.status, 'complete', baseline.error);

  const check = (await readFile(path.join(fixture.repo, 'check.mjs'), 'utf8')).trimEnd();
  const oldLines = check.split('\n');
  const patch = [
    'diff --git a/check.mjs b/check.mjs',
    '--- a/check.mjs',
    '+++ b/check.mjs',
    `@@ -1,${oldLines.length} +1,1 @@`,
    ...oldLines.map(line => `-${line}`),
    '+process.exit(0);',
    ''
  ].join('\n');

  const verified = await verifyFix(baseline, { patch });

  assert.notEqual(
    verified.status,
    'passed',
    'a proposal that replaces the command-based check with process.exit(0) must not be accepted as a fix'
  );
});
