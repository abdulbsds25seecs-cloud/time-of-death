#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDemo } from './lib/demo.mjs';
import { investigate, newState } from './lib/engine.mjs';
import { markdownReport } from './lib/ai.mjs';
import { runAutopsy } from './lib/autopsy-workflow.mjs';
import { initTelemetry, flushTelemetry } from './lib/telemetry.mjs';
import { checkReadiness } from './lib/doctor.mjs';
import { verifyFix } from './lib/verify-fix.mjs';
import { issueReport } from './lib/issue-report.mjs';
await initTelemetry();
const { values } = parseArgs({ options: { demo: { type: 'boolean' }, repo: { type: 'string' }, good: { type: 'string' }, bad: { type: 'string' }, command: { type: 'string' }, check: { type: 'string' }, 'failure-text': { type: 'string' }, timeout: { type: 'string', default: '30000' }, repeats: { type: 'string', default: '2' }, model: { type: 'string' }, output: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean' },doctor:{type:'boolean'},issue:{type:'boolean'},'verify-case':{type:'string'},patch:{type:'string'},'fix-revision':{type:'string'} } });
if (values.help || (!values.demo && !values.repo&&!values['verify-case'])) {
  console.log('Additional workflows: --doctor checks endpoints only; --issue exports a bug-report draft.\nVerify a saved case: --verify-case case.json --patch fix.diff [--json --output result.json]\nOr use --fix-revision COMMIT instead of --patch. Checks execute trusted code with your permissions.');
  console.log(`Time of Death — local regression investigation\n\nnode cli.mjs --demo [--model gemma3:1b] [--output report.md]\nnode cli.mjs --repo C:\\Projects\\app --good HEAD~20 --bad HEAD --command "node check.mjs"\nnode cli.mjs --repo /projects/app --good v1 --bad HEAD --check /path/to/regression.mjs\n\n--check replays an external Node script in every revision (relative imports work).\n--failure-text scopes bad exits to a specific output substring. --repeats 1|2|3\n--json exports the full case. --output writes a file; otherwise stdout.\n\nCommands execute trusted repository code with your permissions. Disposable clones\nisolate Git state, not code execution. No dependencies are installed automatically.`);
} else {
  const controller = new AbortController(); process.on('SIGINT', () => controller.abort());
  const root = path.dirname(fileURLToPath(import.meta.url));
  const config = values.demo ? await createDemo(path.join(root, '.data')) : values;
  if (values.check) config.reproScript = await readFile(path.resolve(values.check), 'utf8');
  let lastPhase = '';
  let state;
  if(values['verify-case']){
    state=JSON.parse(await readFile(path.resolve(values['verify-case']),'utf8'));
    state.verification=await verifyFix(state,{fixRevision:values['fix-revision'],patch:values.patch?await readFile(path.resolve(values.patch),'utf8'):undefined},()=>{},controller.signal);
  }else state = await (values.doctor?checkReadiness:investigate)({ ...config, timeoutMs: values.timeout, repeats: values.repeats, failurePattern: values['failure-text'] }, newState(randomUUID()), s => {
    if (s.phase !== lastPhase) { console.error(`${s.phase} · ${s.runs.length} checks`); lastPhase = s.phase; }
  }, controller.signal);
  if (values.model && state.result) { try { state.analysis = { status: 'complete', ...await runAutopsy(state, values.model) }; } catch (e) { state.analysis = { status: 'error', error: e.message }; console.error(e.message); } }
  const report = values.json ? JSON.stringify(state, null, 2) : values.issue?issueReport(state):markdownReport(state);
  if (values.output) { await writeFile(path.resolve(values.output), report); console.error(`Saved ${path.resolve(values.output)}`); } else console.log(report);
  process.exitCode = values['verify-case']?(state.verification.status==='passed'?0:2):['complete','ready'].includes(state.status)?0:2;
}
await flushTelemetry();
