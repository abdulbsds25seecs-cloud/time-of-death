import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { git, run } from './process.mjs';

export async function inspectRepository(repo, good, bad) {
  if (typeof repo !== 'string' || !path.isAbsolute(repo)) throw new Error('Choose an absolute path to a trusted local Git repository.');
  for (const ref of [good, bad]) if (typeof ref !== 'string' || !ref.trim() || ref.startsWith('-') || ref.length > 200 || /[\x00-\x20]/.test(ref)) throw new Error('Enter valid Git revisions, such as commit hashes, tags, or HEAD~10.');
  const root = (await git(repo, ['rev-parse', '--show-toplevel'])).stdout.trim();
  const resolve = async ref => (await git(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`])).stdout.trim();
  const goodHash = await resolve(good), badHash = await resolve(bad);
  if (goodHash === badHash) throw new Error('Working and failing revisions must be different.');
  if ((await git(root, ['merge-base', '--is-ancestor', goodHash, badHash], { allowFailure: true })).code !== 0) throw new Error('The working revision must be an ancestor of the failing revision.');
  if ((await git(root, ['rev-list', '--merges', `${goodHash}..${badHash}`])).stdout.trim()) throw new Error('This version supports linear histories. Choose a range without merge commits.');
  const size = Number((await git(root, ['rev-list', '--count', `${goodHash}..${badHash}`])).stdout.trim()) + 1;
  if (size > 500) throw new Error('Choose a smaller range: this version supports up to 500 revisions per investigation.');
  // List the good endpoint explicitly, including when it is a root or merge commit.
  const parse = line => { const [hash, short, subject, date] = line.split('\t'); return { hash, short, subject, date, status: 'untested' }; };
  const first = (await git(root, ['show', '-s', '--format=%H%x09%h%x09%s%x09%aI', goodHash])).stdout.trim();
  const rest = (await git(root, ['log', '--reverse', '--format=%H%x09%h%x09%s%x09%aI', `${goodHash}..${badHash}`], { limit: 180000 })).stdout.trim();
  const commits = [first, ...rest.split('\n')].filter(Boolean).map(parse);
  return { repo: root, good: goodHash, bad: badHash, commits };
}

function classification(result, pattern) {
  if (result.cancelled) return 'cancelled';
  if (result.timedOut) return 'timeout';
  if (result.code === 0) return 'good';
  if (result.code === 125) return 'skip';
  if (result.code === null || result.code < 0 || result.code >= 126) return 'error';
  if (pattern && !(result.stdout + '\n' + result.stderr).includes(pattern)) return 'skip';
  if (!pattern && /ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|Cannot find module|command not found|is not recognized as|ENOENT|No module named|Could not read package.json/i.test(result.stdout + result.stderr)) return 'skip';
  return 'bad';
}

export async function investigate(config, state, emit = () => {}, signal) {
  const started = performance.now();
  let scratch;
  const update = () => { state.elapsedMs = Math.round(performance.now() - started); emit(state); };
  const note = message => { state.events.push({ at: new Date().toISOString(), message }); update(); };
  const checkCancelled = () => { if (signal?.aborted) throw new Error('Investigation cancelled.'); };
  try {
    const reproScript = typeof config.reproScript === 'string' ? config.reproScript.trim() : '';
    if (reproScript.length > 12000) throw new Error('Keep the portable regression check under 12,000 characters.');
    if (!reproScript && (typeof config.command !== 'string' || !config.command.trim() || config.command.length > 2000 || /[\x00\r\n]/.test(config.command))) throw new Error('Provide a single-line check command. Exit 0 = working, 1–124 = failing, 125 = untestable.');
    const timeout = Math.min(300000, Math.max(500, Number(config.timeoutMs) || 30000));
    const repeats = Math.min(3, Math.max(1, Math.trunc(Number(config.repeats) || 2)));
    const info = await inspectRepository(config.repo, config.good, config.bad);
    Object.assign(state, info, { status: 'running', phase: 'Preparing isolated checkout', command: reproScript ? 'Portable Node regression check (injected into every revision)' : config.command, reproScript, repeats, timeoutMs: timeout, failurePattern: String(config.failurePattern || '').slice(0, 500) });
    update(); checkCancelled();
    scratch = await mkdtemp(path.join(os.tmpdir(), 'time-of-death-'));
    const checkout = path.join(scratch, 'checkout');
    state.checkout = checkout;
    note('Cloning committed history into a disposable directory. Original working files are not copied or modified.');
    await git(scratch, ['clone', '--no-hardlinks', '--no-checkout', '--', info.repo, checkout], { timeout: 120000, signal });
    const probe = async (hash, stage) => {
      checkCancelled();
      // Only ever reset/clean the application's disposable clone, never the source.
      await git(checkout, ['reset', '--hard'], { signal });
      await git(checkout, ['clean', '-fdx'], { signal });
      await git(checkout, ['checkout', '--detach', '--force', hash], { signal });
      const harness = `.tod-check-${state.id}.mjs`;
      if (reproScript) await writeFile(path.join(checkout, harness), reproScript);
      state.phase = stage; state.currentHash = hash; update();
      const outcomes = [];
      for (let i = 0; i < repeats; i++) {
        checkCancelled();
        const record = { id: `E${state.runs.length + 1}`, hash, stage, repetition: i + 1, at: new Date().toISOString() };
        state.liveOutput = ''; update();
        const result = await run(reproScript ? process.execPath : config.command, reproScript ? [harness] : [], { cwd: checkout, shell: !reproScript, timeout, signal, limit: 16000, onOutput: (stream, text) => { state.liveOutput = (state.liveOutput + text).slice(-10000); } });
        Object.assign(record, result, { status: classification(result, state.failurePattern) });
        state.runs.push(record); outcomes.push(record.status);
        const commit = state.commits.find(c => c.hash === hash); if (commit) commit.status = record.status;
        update();
        if (record.status === 'cancelled') throw new Error('Investigation cancelled.');
        if (['timeout', 'error'].includes(record.status)) throw new Error(record.status === 'timeout' ? 'The check timed out. Increase its limit or choose a more focused check; no regression verdict was inferred.' : 'The check could not execute normally. Review its command and logs; no regression verdict was inferred.');
      }
      if (new Set(outcomes).size !== 1) throw new Error('Inconsistent repeated results. The check may be flaky; investigation is inconclusive.');
      return outcomes[0];
    };
    if (await probe(info.good, 'Verify working endpoint') !== 'good') throw new Error('The working endpoint did not pass. Choose a revision where this exact check passes.');
    if (await probe(info.bad, 'Verify failing endpoint') !== 'bad') throw new Error('The failing endpoint did not reproduce the target failure. Review its logs and failure text.');
    checkCancelled();
    await git(checkout, ['bisect', 'start', info.bad, info.good], { signal });
    let candidate = null;
    for (let attempts = 0; attempts <= info.commits.length + 1; attempts++) {
      checkCancelled();
      const hash = (await git(checkout, ['rev-parse', 'HEAD'])).stdout.trim();
      const verdict = await probe(hash, 'Narrowing the revision range');
      const step = await git(checkout, ['bisect', verdict], { signal, allowFailure: true });
      const output = step.stdout + '\n' + step.stderr;
      state.bisectLog = (await git(checkout, ['bisect', 'log'], { allowFailure: true })).stdout;
      if (/first bad commit could be any|only 'skip'ped commits left|cannot bisect/i.test(output)) throw new Error('Untestable revisions prevent identifying one commit. Review the bisect log; result is inconclusive.');
      if (step.code !== 0) throw new Error(output.trim() || 'Git bisect could not continue.');
      const match = output.match(/([0-9a-f]{40,64}) is the first bad commit/);
      if (match) { candidate = match[1]; break; }
      note(`${hash.slice(0, 7)} → ${verdict}. Git selected the next revision.`);
    }
    if (!candidate) throw new Error('The search did not converge.');
    if (await probe(candidate, 'Confirm candidate failure') !== 'bad') throw new Error('The candidate no longer reproduces the failure.');
    const parent = (await git(checkout, ['rev-parse', `${candidate}^`])).stdout.trim();
    if (await probe(parent, 'Confirm previous revision passes') !== 'good') throw new Error('The previous revision did not pass. A precise boundary cannot be confirmed.');
    const diff = (await git(checkout, ['diff', '--no-ext-diff', '--no-textconv', '--unified=5', parent, candidate, '--'], { limit: 40000 })).stdout;
    const commit = state.commits.find(c => c.hash === candidate);
    state.result = { candidate, parent, subject: commit?.subject, diff, scope: 'First failing boundary in the selected linear range, assuming a reproducible monotonic regression.', uniqueRevisions: new Set(state.runs.map(r => r.hash)).size, checks: state.runs.length, historySize: state.commits.length };
    state.status = 'complete'; state.phase = 'Failure boundary confirmed'; state.currentHash = candidate;
    if (commit) commit.status = 'culprit';
    note('Candidate fails and its parent passes on repeated checks. This establishes the observed boundary, not the semantic root cause.');
  } catch (error) {
    state.status = signal?.aborted ? 'cancelled' : 'inconclusive'; state.phase = state.status === 'cancelled' ? 'Investigation cancelled' : 'Investigation needs attention'; state.error = error.message;
    note(error.message);
  } finally {
    state.liveOutput = ''; delete state.checkout;
    if (scratch) {
      try { await rm(scratch, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 }); }
      catch { state.cleanupWarning = `Disposable checkout could not be removed: ${scratch}`; }
    }
    update();
  }
  return state;
}

export function newState(id) { return { id, createdAt: new Date().toISOString(), status: 'queued', phase: 'Validating repository', events: [], runs: [], commits: [], elapsedMs: 0 }; }
