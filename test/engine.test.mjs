import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDemo } from '../lib/demo.mjs';
import { inspectRepository, investigate, newState } from '../lib/engine.mjs';
import { git, run } from '../lib/process.mjs';
import { evidencePacket, validateAnalysis, markdownReport } from '../lib/ai.mjs';
import { createApp } from '../server.mjs';
import http from 'node:http';

test('Git investigation and application acceptance suite', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tod-tests-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 5 }));
  const fixture = await createDemo(root, { count: 8, brokenAt: 5 });
  let result;
  await t.test('finds known boundary and preserves dirty tracked/untracked source files', async () => {
    await writeFile(path.join(fixture.repo, 'notes.md'), 'UNCOMMITTED USER WORK');
    await writeFile(path.join(fixture.repo, 'private-note.txt'), 'UNTRACKED USER WORK');
    const before = (await git(fixture.repo, ['status', '--porcelain'])).stdout;
    result = await investigate({ ...fixture, repeats: 2 }, newState('acceptance'));
    assert.equal(result.status, 'complete', result.error);
    assert.equal(result.result.candidate, fixture.expected);
    assert.equal(result.result.parent, fixture.hashes[3]);
    assert.equal((await readFile(path.join(fixture.repo, 'notes.md'), 'utf8')), 'UNCOMMITTED USER WORK');
    assert.equal((await readFile(path.join(fixture.repo, 'private-note.txt'), 'utf8')), 'UNTRACKED USER WORK');
    assert.equal((await git(fixture.repo, ['status', '--porcelain'])).stdout, before);
    assert.equal((await git(fixture.repo, ['rev-parse', 'HEAD'])).stdout.trim(), fixture.bad);
    assert.ok(result.runs.every(r => r.id && r.hash && Number.isFinite(r.durationMs)));
    assert.equal(result.result.checks % 2, 0);
    assert.ok(result.result.diff.includes('return now <= expiresAt'));
    assert.equal(result.checkout, undefined);
  });
  await t.test('rejects invalid revisions, reversed range, same endpoints and relative repository', async () => {
    await assert.rejects(inspectRepository(fixture.repo, '--help', fixture.bad), /valid Git/);
    await assert.rejects(inspectRepository(fixture.repo, fixture.bad, fixture.good), /ancestor/);
    await assert.rejects(inspectRepository(fixture.repo, fixture.good, fixture.good), /different/);
    await assert.rejects(inspectRepository('.', fixture.good, fixture.bad), /absolute/);
    await assert.rejects(inspectRepository(fixture.repo, 'not-a-real-revision', fixture.bad));
  });
  await t.test('replays a newly written regression script across older commits', async () => {
    const reproScript = "import assert from 'node:assert/strict'; import { sessionIsValid } from './session.mjs'; assert.equal(sessionIsValid(1000,1000),false,'portable boundary check');";
    const s = await investigate({ ...fixture, command: '', reproScript, repeats: 1 }, newState('portable'));
    assert.equal(s.status, 'complete', s.error); assert.equal(s.result.candidate, fixture.expected);
    assert.equal(s.reproScript, reproScript); assert.ok(s.command.includes('Portable Node'));
    assert.equal((await git(fixture.repo, ['ls-files', '.tod-check-*'])).stdout, '');
  });
  await t.test('rejects a purported good endpoint that actually fails', async () => {
    const s = await investigate({ ...fixture, good: fixture.hashes[4], repeats: 1 }, newState('wrong-good'));
    assert.equal(s.status, 'inconclusive'); assert.match(s.error, /working endpoint did not pass/); assert.equal(s.result, undefined);
  });
  await t.test('rejects a purported bad endpoint that actually passes', async () => {
    const s = await investigate({ ...fixture, bad: fixture.hashes[3], repeats: 1 }, newState('wrong-bad'));
    assert.equal(s.status, 'inconclusive'); assert.match(s.error, /failing endpoint did not reproduce/);
  });
  await t.test('unrelated failures do not count as the target regression', async () => {
    const s = await investigate({ ...fixture, command: 'node -e "console.error(\'unrelated\');process.exit(1)"', failurePattern: 'specific regression', repeats: 1 }, newState('unrelated'));
    assert.equal(s.status, 'inconclusive'); assert.equal(s.runs[0].status, 'skip');
  });
  await t.test('missing dependencies are untestable, not bad commits', async () => {
    const s = await investigate({ ...fixture, command: 'node missing-file.mjs', repeats: 1 }, newState('missing'));
    assert.equal(s.status, 'inconclusive'); assert.equal(s.runs[0].status, 'skip');
  });
  await t.test('timeout stops a hanging check without inferring a regression', async () => {
    const s = await investigate({ ...fixture, command: 'node -e "setInterval(()=>{},1000)"', timeoutMs: 500, repeats: 1 }, newState('timeout'));
    assert.equal(s.status, 'inconclusive'); assert.equal(s.runs[0].status, 'timeout'); assert.match(s.error, /timed out/);
  });
  await t.test('shell execution failure codes cannot become bad commits', async () => {
    const s = await investigate({ ...fixture, command: 'node -e "process.exit(127)"', repeats: 1 }, newState('exec-failure'));
    assert.equal(s.status, 'inconclusive'); assert.equal(s.runs[0].status, 'error'); assert.equal(s.result, undefined);
  });
  await t.test('cancellation terminates a running check and produces no result', async () => {
    const controller = new AbortController(); let scheduled = false;
    const s = await investigate({ ...fixture, command: 'node -e "setInterval(()=>{},1000)"', repeats: 1 }, newState('cancel'), state => {
      if (state.phase === 'Verify working endpoint' && !scheduled) { scheduled = true; setTimeout(() => controller.abort(), 150); }
    }, controller.signal);
    assert.equal(s.status, 'cancelled'); assert.equal(s.result, undefined);
  });
  await t.test('alternating repeated results are inconclusive', async () => {
    const command = `node -e "const fs=require('fs');const p='toggle';if(fs.existsSync(p)){fs.unlinkSync(p);process.exit(1)}fs.writeFileSync(p,'1')"`;
    const s = await investigate({ ...fixture, command, repeats: 2 }, newState('flaky'));
    assert.equal(s.status, 'inconclusive'); assert.match(s.error, /Inconsistent/);
  });
  await t.test('skip ambiguity cannot produce a precise candidate', async () => {
    const skipped = await createDemo(root, { count: 8, brokenAt: 5, skipAt: [4, 5], name: 'skipped' });
    const s = await investigate({ ...skipped, repeats: 1 }, newState('skipped'));
    assert.equal(s.status, 'inconclusive'); assert.equal(s.result, undefined);
  });
  await t.test('AI output requires valid evidence references and exports preserve recorded facts', () => {
    const packet = evidencePacket(result);
    const good = { summary: 'Boundary condition changed.', findings: [{ explanation: 'Equality now passes the check.', evidence: ['D1', packet[1].id] }], nextChecks: ['Check intended expiration semantics.'] };
    assert.equal(validateAnalysis(good, packet).findings[0].kind, 'hypothesis');
    assert.throws(() => validateAnalysis({ ...good, findings: [{ explanation: 'Invented', evidence: ['E999'] }] }, packet), /invalid evidence/);
    assert.throws(() => validateAnalysis({ ...good, findings: [] }, packet), /no evidence/);
    assert.throws(() => evidencePacket(newState('empty')), /conclusive/);
    const markdown = markdownReport(result);
    assert.ok(markdown.includes(fixture.expected)); assert.ok(markdown.includes('Not generated. No AI output is implied.'));
  });
  await t.test('HTTP endpoints require origin/host validation, app token and explicit execution trust', async () => {
    const app = await createApp({ dataDir: path.join(root, 'api'), port: 0 });
    const address = await app.listen(); const base = `http://127.0.0.1:${address.port}`;
    try {
      const page = await fetch(base); const html = await page.text(); const token = html.match(/name="app-token" content="([^"]+)"/)[1];
      assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
      assert.equal((await fetch(base + '/api/health')).status, 403);
      assert.equal((await fetch(base + '/api/health', { headers: { 'x-app-token': token, Origin: 'https://untrusted.example' } })).status, 403);
      // Fetch normalizes Host; use a raw HTTP request to exercise DNS-rebinding protection.
      const untrustedHostStatus = await new Promise((resolve, reject) => {
        const request = http.get(base + '/api/health', { headers: { 'x-app-token': token, Host: 'untrusted.example:4317' } }, response => { response.resume(); resolve(response.statusCode); });
        request.on('error', reject);
      });
      assert.equal(untrustedHostStatus, 403);
      assert.equal((await fetch(base + '/api/health', { headers: { 'x-app-token': token } })).status, 200);
      const response = await fetch(base + '/api/investigations', { method: 'POST', headers: { 'x-app-token': token, 'content-type': 'application/json' }, body: JSON.stringify(fixture) });
      assert.equal(response.status, 400); assert.match((await response.json()).error, /trust/);
    } finally { await app.close(); }
  });
  await t.test('process capture bounds noisy command output', async () => {
    const result = await run(process.execPath, ['-e', 'console.log("x".repeat(20000))'], { limit: 1000 });
    assert.equal(result.code, 0); assert.equal(result.stdout.length, 1000); assert.equal(result.truncated, true);
  });
});
