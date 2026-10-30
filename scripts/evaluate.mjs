import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createDemo } from '../lib/demo.mjs';
import { investigate, newState } from '../lib/engine.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'tod-evaluation-'));
const cases = [
  { name: 'early-regression', count: 16, brokenAt: 3 },
  { name: 'middle-regression', count: 24, brokenAt: 15 },
  { name: 'late-regression', count: 24, brokenAt: 23 },
  { name: 'no-regression', count: 8, brokenAt: 99, expectedStatus: 'inconclusive' },
  { name: 'ambiguous-skips', count: 8, brokenAt: 5, skipAt: [4, 5], expectedStatus: 'inconclusive' }
];
const results = [];
try {
  for (const entry of cases) {
    const fixture = await createDemo(temporary, entry);
    const state = await investigate({ ...fixture, repeats: 2 }, newState(randomUUID()));
    const expectedStatus = entry.expectedStatus || 'complete';
    const correct = state.status === expectedStatus && (expectedStatus !== 'complete' || state.result.candidate === fixture.expected);
    results.push({ name: entry.name, synthetic: true, historySize: entry.count, expectedCommit: fixture.expected, observedCommit: state.result?.candidate || null, expectedStatus, observedStatus: state.status, correct, elapsedMs: state.elapsedMs, checks: state.runs.length, distinctRevisions: new Set(state.runs.map(r => r.hash)).size, error: state.error });
    console.log(`${entry.name}: ${correct ? 'PASS' : 'FAIL'} · ${state.runs.length} checks · ${state.elapsedMs} ms`);
  }
  const report = { createdAt: new Date().toISOString(), conditions: { node: process.version, platform: process.platform, cpu: os.cpus()[0]?.model, logicalProcessors: os.cpus().length, totalRAM_GB: +(os.totalmem() / 2 ** 30).toFixed(1), repeats: 2, dependencies: 'None in synthetic test repositories', aiIncluded: false }, cases: results, summary: { correct: results.filter(r => r.correct).length, total: results.length }, limitation: 'Controlled synthetic histories, not a representative sample of real projects. Timings include Git clone/search/cleanup and checks; no AI inference. No sequential wall-time baseline was measured.' };
  await mkdir(path.join(root, '../evidence'), { recursive: true });
  await writeFile(path.join(root, '../evidence/evaluation.json'), JSON.stringify(report, null, 2));
  process.exitCode = results.every(r => r.correct) ? 0 : 1;
} finally { await rm(temporary, { recursive: true, force: true, maxRetries: 5 }); }
