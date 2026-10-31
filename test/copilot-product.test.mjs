import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createDemo } from '../lib/demo.mjs';
import { createApp } from '../server.mjs';
import { git } from '../lib/process.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const campaignDir = path.join(rootDir, 'work', 'copilot-product');

async function command(program, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd: rootDir, windowsHide: true, ...options });
    let stdout = '', stderr = '';
    child.stdout?.on('data', chunk => { stdout += chunk; });
    child.stderr?.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

async function waitFor(load, predicate, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await load();
    if (predicate(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for product operation');
}

function patchForSessionFix() {
  return `diff --git a/session.mjs b/session.mjs
--- a/session.mjs
+++ b/session.mjs
@@ -1,4 +1,4 @@
 // Epoch timestamps use the same units. Sessions expire at expiresAt.
 export function sessionIsValid(now, expiresAt) {
-  return now <= expiresAt;
+  return now < expiresAt;
 }
`;
}

test('product API journey finds the known boundary, preserves the source tree, and exports receipts', async t => {
  process.env.SENTRY_DSN = '';
  await mkdir(campaignDir, { recursive: true });
  const root = await (await import('node:fs/promises')).mkdtemp(path.join(campaignDir, 'case-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 4 }));

  const fixture = await createDemo(root, { count: 5, brokenAt: 3 });
  await writeFile(path.join(fixture.repo, 'notes.md'), 'DIRTY TRACKED\n');
  await writeFile(path.join(fixture.repo, 'staged.txt'), 'STAGED USER DATA\n');
  await git(fixture.repo, ['add', 'staged.txt']);
  await writeFile(path.join(fixture.repo, 'untracked.txt'), 'UNTRACKED USER DATA\n');
  const snapshot = {
    head: (await git(fixture.repo, ['rev-parse', 'HEAD'])).stdout.trim(),
    status: (await git(fixture.repo, ['status', '--porcelain=v1'])).stdout,
    staged: (await git(fixture.repo, ['diff', '--cached', '--binary'])).stdout,
    notes: await readFile(path.join(fixture.repo, 'notes.md'), 'utf8'),
    stagedFile: await readFile(path.join(fixture.repo, 'staged.txt'), 'utf8'),
    untracked: await readFile(path.join(fixture.repo, 'untracked.txt'), 'utf8')
  };

  const app = await createApp({ port: 0, dataDir: path.join(root, 'data') });
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const page = await fetch(base);
    const html = await page.text();
    assert.equal(page.status, 200);
    assert.match(html, /Time of Death/);
    assert.match(html, /assets\/[\w.-]+/);
    const token = html.match(/name="app-token" content="([^"]+)"/)?.[1];
    assert.ok(token);
    const headers = { 'x-app-token': token, 'content-type': 'application/json' };
    const post = (url, body) => fetch(base + url, { method: 'POST', headers, body: JSON.stringify(body) });
    const get = url => fetch(base + url, { headers }).then(response => response.json());

    const readinessResponse = await post('/api/doctor', { ...fixture, repeats: 1, trusted: true });
    assert.equal(readinessResponse.status, 202);
    const readinessStart = await readinessResponse.json();
    const readiness = await waitFor(() => get(`/api/investigations/${readinessStart.id}`), value => value.doctor);
    assert.equal(readiness.doctor.verdict, 'ready');
    assert.equal(readiness.result, undefined);
    assert.equal(readiness.runs.length, 2);

    const investigationResponse = await post('/api/investigations', { ...fixture, repeats: 1, trusted: true });
    assert.equal(investigationResponse.status, 202);
    const started = await investigationResponse.json();
    const completed = await waitFor(() => get(`/api/investigations/${started.id}`), value => !['queued', 'running'].includes(value.status));
    assert.equal(completed.status, 'complete', completed.error);
    assert.equal(completed.result.candidate, fixture.expected);
    assert.equal(completed.result.parent, fixture.hashes[1]);
    assert.ok(completed.runs.some(row => row.stage === 'Confirm candidate failure' && row.status === 'bad'));
    assert.ok(completed.runs.some(row => row.stage === 'Confirm previous revision passes' && row.status === 'good'));

    assert.equal((await git(fixture.repo, ['rev-parse', 'HEAD'])).stdout.trim(), snapshot.head);
    assert.equal((await git(fixture.repo, ['status', '--porcelain=v1'])).stdout, snapshot.status);
    assert.equal((await git(fixture.repo, ['diff', '--cached', '--binary'])).stdout, snapshot.staged);
    assert.equal(await readFile(path.join(fixture.repo, 'notes.md'), 'utf8'), snapshot.notes);
    assert.equal(await readFile(path.join(fixture.repo, 'staged.txt'), 'utf8'), snapshot.stagedFile);
    assert.equal(await readFile(path.join(fixture.repo, 'untracked.txt'), 'utf8'), snapshot.untracked);

    const reportJson = await fetch(`${base}/api/investigations/${started.id}/report?format=json`, { headers });
    const exported = await reportJson.json();
    assert.equal(exported.result.candidate, completed.result.candidate);
    assert.equal(exported.runs.length, completed.runs.length);
    const markdown = await (await fetch(`${base}/api/investigations/${started.id}/report`, { headers })).text();
    const issue = await (await fetch(`${base}/api/investigations/${started.id}/report?format=issue`, { headers })).text();
    assert.match(markdown, new RegExp(completed.result.candidate));
    assert.match(markdown, /Execution evidence/);
    assert.match(issue, /No issue has been published/);
    assert.match(issue, /Candidate:/);

    const fixResponse = await post(`/api/investigations/${started.id}/verify-fix`, { trusted: true, patch: patchForSessionFix() });
    assert.equal(fixResponse.status, 202);
    const fixed = await waitFor(() => get(`/api/investigations/${started.id}`), value => value.verification?.status && value.verification.status !== 'running');
    assert.equal(fixed.verification.status, 'passed', fixed.verification.message);
    assert.deepEqual(fixed.verification.checks.map(check => check.status), ['good', 'bad', 'good']);
    assert.equal(fixed.verification.runs.length, 3);
  } finally {
    await app.close();
  }
});

test('CLI reports the independently known fixture boundary and distinguishes bad environment controls', async t => {
  await mkdir(campaignDir, { recursive: true });
  const root = await (await import('node:fs/promises')).mkdtemp(path.join(campaignDir, 'cli-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 4 }));
  const fixture = await createDemo(root, { count: 4, brokenAt: 3 });
  const output = path.join(root, 'cli.json');
  const cli = await command(process.execPath, ['cli.mjs', '--repo', fixture.repo, '--good', fixture.good, '--bad', fixture.bad, '--command', fixture.command, '--repeats', '1', '--json', '--output', output]);
  assert.equal(cli.code, 0, cli.stderr);
  const report = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(report.status, 'complete');
  assert.equal(report.result.candidate, fixture.expected);
  assert.ok(report.runs.some(row => row.stage === 'Confirm candidate failure' && row.status === 'bad'));

  const missing = await command(process.execPath, ['cli.mjs', '--repo', fixture.repo, '--good', fixture.good, '--bad', fixture.bad, '--command', 'node missing-check.mjs', '--repeats', '1']);
  assert.equal(missing.code, 2);
  assert.match(missing.stdout + missing.stderr, /inconclusive|Dependencies|missing/i);
});

test('false-positive check replacement remains reproducible through the product API', async t => {
  await mkdir(campaignDir, { recursive: true });
  const root = await (await import('node:fs/promises')).mkdtemp(path.join(campaignDir, 'false-positive-'));
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
    const started = await (await post('/api/investigations', { ...fixture, repeats: 1, trusted: true })).json();
    const complete = await waitFor(() => get(`/api/investigations/${started.id}`), value => value.status === 'complete');
    const check = (await readFile(path.join(fixture.repo, 'check.mjs'), 'utf8')).trimEnd().split('\n');
    const patch = ['diff --git a/check.mjs b/check.mjs', '--- a/check.mjs', '+++ b/check.mjs', `@@ -1,${check.length} +1,1 @@`, ...check.map(line => `-${line}`), '+process.exit(0);', ''].join('\n');
    const response = await post(`/api/investigations/${complete.id}/verify-fix`, { trusted: true, patch });
    assert.equal(response.status, 202);
    const result = await waitFor(() => get(`/api/investigations/${complete.id}`), value => value.verification?.status && value.verification.status !== 'running');
    assert.notEqual(result.verification.status, 'passed', 'tampering with the command-based check must not produce a passing fix');
  } finally {
    await app.close();
  }
});
