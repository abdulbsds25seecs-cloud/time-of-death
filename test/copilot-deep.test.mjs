import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createDemo } from '../lib/demo.mjs';
import { investigate, newState } from '../lib/engine.mjs';
import { verifyFix } from '../lib/verify-fix.mjs';
import { createApp } from '../server.mjs';

const campaignDir = path.resolve('work', 'copilot-deep-review');

async function waitFor(load, predicate, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await load();
    if (predicate(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for operation');
}

test('negative fix controls remain rejected or inconclusive and receipts identify the reason', async t => {
  await mkdir(campaignDir, { recursive: true });
  const root = await (await import('node:fs/promises')).mkdtemp(path.join(campaignDir, 'controls-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 4 }));
  const fixture = await createDemo(root, { count: 5, brokenAt: 3 });
  const baseline = await investigate({ ...fixture, repeats: 1 }, newState('deep-controls'));
  assert.equal(baseline.status, 'complete', baseline.error);

  const unrelatedPatch = `diff --git a/session.mjs b/session.mjs
--- a/session.mjs
+++ b/session.mjs
@@ -1,4 +1,4 @@
-// Epoch timestamps use the same units. Sessions expire at expiresAt.
+// Unrelated proposal; the comparison is unchanged.
 export function sessionIsValid(now, expiresAt) {
   return now <= expiresAt;
 }
`;
  const unrelated = await verifyFix(baseline, { patch: unrelatedPatch });
  assert.equal(unrelated.status, 'rejected', unrelated.message);
  assert.equal(unrelated.checks.at(-1).status, 'bad');

  const malformed = await verifyFix(baseline, { patch: 'not a unified diff' });
  assert.equal(malformed.status, 'inconclusive');
  assert.equal(malformed.checks.length, 2);

  const brokenBaseline = await investigate({ ...fixture, good: fixture.hashes[2], repeats: 1 }, newState('deep-broken-baseline'));
  assert.equal(brokenBaseline.status, 'inconclusive');
  assert.equal(brokenBaseline.result, undefined);
  assert.equal(brokenBaseline.runs[0].status, 'bad');
});

test('cancelling an HTTP investigation leaves no false result and permits a later case', async t => {
  await mkdir(campaignDir, { recursive: true });
  const root = await (await import('node:fs/promises')).mkdtemp(path.join(campaignDir, 'cancel-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 4 }));
  const fixture = await createDemo(root, { count: 4, brokenAt: 3 });
  const app = await createApp({ port: 0, dataDir: path.join(root, 'data') });
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const html = await (await fetch(base)).text();
    const token = html.match(/name="app-token" content="([^"]+)"/)[1];
    const headers = { 'x-app-token': token, 'content-type': 'application/json' };
    const post = (url, body) => fetch(base + url, { method: 'POST', headers, body: JSON.stringify(body) });
    const get = url => fetch(base + url, { headers }).then(response => response.json());
    const started = await (await post('/api/investigations', {
      ...fixture, command: 'node -e "setInterval(()=>{},1000)"', timeoutMs: 30000, repeats: 1, trusted: true
    })).json();
    await waitFor(() => get('/api/health'), value => value.active === started.id);
    assert.equal((await post(`/api/investigations/${started.id}/cancel`, {})).status, 200);
    const cancelled = await waitFor(() => get(`/api/investigations/${started.id}`), value => value.status === 'cancelled');
    assert.equal(cancelled.result, undefined);
    await waitFor(() => get('/api/health'), value => value.active === null);

    const next = await (await post('/api/investigations', { ...fixture, repeats: 1, trusted: true })).json();
    const completed = await waitFor(() => get(`/api/investigations/${next.id}`), value => !['queued', 'running'].includes(value.status));
    assert.equal(completed.status, 'complete', completed.error);
    assert.equal(completed.result.candidate, fixture.expected);
  } finally {
    await app.close();
  }
});

test('closing the server during work persists an honest interrupted case for restart inspection', async t => {
  await mkdir(campaignDir, { recursive: true });
  const root = await (await import('node:fs/promises')).mkdtemp(path.join(campaignDir, 'restart-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 4 }));
  const fixture = await createDemo(root, { count: 4, brokenAt: 3 });
  const dataDir = path.join(root, 'data');
  const app = await createApp({ port: 0, dataDir });
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  const html = await (await fetch(base)).text();
  const token = html.match(/name="app-token" content="([^"]+)"/)[1];
  const headers = { 'x-app-token': token, 'content-type': 'application/json' };
  const response = await fetch(base + '/api/investigations', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...fixture, command: 'node -e "setInterval(()=>{},1000)"', timeoutMs: 30000, repeats: 1, trusted: true })
  });
  assert.equal(response.status, 202);
  const started = await response.json();
  await waitFor(async () => {
    const health = await fetch(base + '/api/health', { headers });
    return health.json();
  }, value => value.active === started.id);
  await app.close();

  const files = await readdir(path.join(dataDir, 'reports')).catch(() => []);
  assert.ok(files.includes(`${started.id}.json`), 'server shutdown must retain a report for interrupted work');
  const saved = JSON.parse(await readFile(path.join(dataDir, 'reports', `${started.id}.json`), 'utf8'));
  assert.equal(saved.status, 'cancelled');
  assert.equal(saved.result, undefined);
});
