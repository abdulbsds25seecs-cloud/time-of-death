import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { investigate, newState } from '../lib/engine.mjs';
import { git } from '../lib/process.mjs';

const root = path.resolve('work', 'copilot-retest');

async function waitFor(load, predicate, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await load();
    if (predicate(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for retest operation');
}

test('API fix verification does not certify a proposal that weakens an imported check helper', async t => {
  await mkdir(root, { recursive: true });
  const fixtureRoot = await (await import('node:fs/promises')).mkdtemp(path.join(root, 'imported-helper-'));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true, maxRetries: 4 }));
  const repo = path.join(fixtureRoot, 'repo');
  await mkdir(repo, { recursive: true });
  await git(repo, ['init', '-b', 'main']);
  await writeFile(path.join(repo, 'session.mjs'), 'export function sessionIsValid(now, expiresAt) { return now < expiresAt; }\n');
  await writeFile(path.join(repo, 'check-helper.mjs'), `import assert from 'node:assert/strict';
import { sessionIsValid } from './session.mjs';
assert.equal(sessionIsValid(1000, 1000), false);
`);
  await writeFile(path.join(repo, 'check.mjs'), "import './check-helper.mjs';\n");
  await git(repo, ['add', '.']);
  await git(repo, ['-c', 'user.name=Time of Death Retest', '-c', 'user.email=retest@example.invalid', 'commit', '-m', 'Known good']);
  const good = (await git(repo, ['rev-parse', 'HEAD'])).stdout.trim();
  await writeFile(path.join(repo, 'session.mjs'), 'export function sessionIsValid(now, expiresAt) { return now <= expiresAt; }\n');
  await git(repo, ['add', 'session.mjs']);
  await git(repo, ['-c', 'user.name=Time of Death Retest', '-c', 'user.email=retest@example.invalid', 'commit', '-m', 'Regression']);
  const bad = (await git(repo, ['rev-parse', 'HEAD'])).stdout.trim();
  const baseline = await investigate({ repo, good, bad, command: 'node check.mjs', repeats: 1 }, newState('imported-helper-baseline'));
  assert.equal(baseline.status, 'complete', baseline.error);

  const app = await createApp({ port: 0, dataDir: path.join(fixtureRoot, 'data') });
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const html = await (await fetch(base)).text();
    const token = html.match(/name="app-token" content="([^"]+)"/)[1];
    const headers = { 'x-app-token': token, 'content-type': 'application/json' };
    await writeFile(path.join(fixtureRoot, 'data', 'reports', `${baseline.id}.json`), JSON.stringify(baseline));
    const patch = `diff --git a/check-helper.mjs b/check-helper.mjs
--- a/check-helper.mjs
+++ b/check-helper.mjs
@@ -1,3 +1 @@
-import assert from 'node:assert/strict';
-import { sessionIsValid } from './session.mjs';
-assert.equal(sessionIsValid(1000, 1000), false);
+process.exit(0);
`;
    const response = await fetch(`${base}/api/investigations/${baseline.id}/verify-fix`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ trusted: true, patch })
    });
    assert.equal(response.status, 202);
    const result = await waitFor(
      () => fetch(`${base}/api/investigations/${baseline.id}`, { headers }).then(value => value.json()),
      value => value.verification?.status && value.verification.status !== 'running'
    );
    assert.notEqual(result.verification.status, 'passed', 'an imported helper that disables the check must not receive a passing fix verdict');
    assert.equal(result.verification.checkIntegrity.status, 'blocked');
  } finally {
    await app.close();
  }
});
