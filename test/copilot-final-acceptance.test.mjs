import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.mjs';
import { createDemo } from '../lib/demo.mjs';

async function waitFor(load, predicate) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const value = await load();
    if (predicate(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for final acceptance case');
}

test('final acceptance API protects invalid requests, enforces one active job, and finds the known boundary', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tod-final-acceptance-space-Δ-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 4 }));
  const fixture = await createDemo(root, { name: 'fixture space Δ', count: 4, brokenAt: 3 });
  const app = await createApp({ port: 0, dataDir: path.join(root, 'data') });
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const html = await (await fetch(base)).text();
    const token = html.match(/name="app-token" content="([^"]+)"/)[1];
    const headers = { 'x-app-token': token, 'content-type': 'application/json' };
    const post = (url, body) => fetch(base + url, { method: 'POST', headers, body: JSON.stringify(body) });
    const get = url => fetch(base + url, { headers }).then(response => response.json());

    assert.equal((await post('/api/investigations', fixture)).status, 400);
    assert.equal((await fetch(base + '/api/investigations', { method: 'POST', headers, body: '{' })).status, 400);
    assert.equal((await fetch(base + '/api/investigations/not-a-case', { headers })).status, 400);
    assert.equal((await fetch(base + '/../package.json', { headers })).status, 404);
    assert.equal((await fetch(base + '/api/health', { headers: { ...headers, Origin: 'https://evil.invalid' } })).status, 403);

    const response = await post('/api/investigations', { ...fixture, repeats: 1, trusted: true });
    const started = await response.json();
    const duplicate = await post('/api/investigations', { ...fixture, repeats: 1, trusted: true });
    assert.equal(duplicate.status, 409);

    const final = await waitFor(() => get(`/api/investigations/${started.id}`), state => !['queued', 'running'].includes(state.status));
    assert.equal(final.status, 'complete', final.error);
    assert.equal(final.result.candidate, fixture.expected);
    assert.ok(final.runs.some(run => run.stage === 'Confirm candidate failure' && run.status === 'bad'));
    assert.ok(final.runs.some(run => run.stage === 'Confirm previous revision passes' && run.status === 'good'));
  } finally {
    await app.close();
  }
});
