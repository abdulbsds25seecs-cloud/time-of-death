#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDemo } from './lib/demo.mjs';
import { investigate, newState } from './lib/engine.mjs';
import { analyze, markdownReport } from './lib/ai.mjs';
const { values } = parseArgs({ options: { demo: { type: 'boolean' }, repo: { type: 'string' }, good: { type: 'string' }, bad: { type: 'string' }, command: { type: 'string' }, check: { type: 'string' }, 'failure-text': { type: 'string' }, timeout: { type: 'string', default: '30000' }, repeats: { type: 'string', default: '2' }, model: { type: 'string' }, output: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean' } } });
if (values.help || (!values.demo && !values.repo)) {
  console.log(`Time of Death — local regression investigation\n\nnode cli.mjs --demo [--model gemma3:1b] [--output report.md]\nnode cli.mjs --repo C:\\Projects\\app --good HEAD~20 --bad HEAD --command "node check.mjs"\nnode cli.mjs --repo /projects/app --good v1 --bad HEAD --check /path/to/regression.mjs\n\n--check replays an external Node script in every revision (relative imports work).\n--failure-text scopes bad exits to a specific output substring. --repeats 1|2|3\n--json exports the full case. --output writes a file; otherwise stdout.\n\nCommands execute trusted repository code with your permissions. Disposable clones\nisolate Git state, not code execution. No dependencies are installed automatically.`);
} else {
  const controller = new AbortController(); process.on('SIGINT', () => controller.abort());
  const root = path.dirname(fileURLToPath(import.meta.url));
  const config = values.demo ? await createDemo(path.join(root, '.data')) : values;
  if (values.check) config.reproScript = await readFile(path.resolve(values.check), 'utf8');
  let lastPhase = '';
  const state = await investigate({ ...config, timeoutMs: values.timeout, repeats: values.repeats, failurePattern: values['failure-text'] }, newState(randomUUID()), s => {
    if (s.phase !== lastPhase) { console.error(`${s.phase} · ${s.runs.length} checks`); lastPhase = s.phase; }
  }, controller.signal);
  if (values.model && state.result) { try { state.analysis = { status: 'complete', ...await analyze(state, values.model) }; } catch (e) { state.analysis = { status: 'error', error: e.message }; console.error(e.message); } }
  const report = values.json ? JSON.stringify(state, null, 2) : markdownReport(state);
  if (values.output) { await writeFile(path.resolve(values.output), report); console.error(`Saved ${path.resolve(values.output)}`); } else console.log(report);
  process.exitCode = state.status === 'complete' ? 0 : 2;
}
