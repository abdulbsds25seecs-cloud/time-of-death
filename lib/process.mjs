import { spawn } from 'node:child_process';

export function run(program, args, { cwd, timeout = 20000, signal, shell = false, limit = 48000, onOutput } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return resolve({ code: null, stdout: '', stderr: '', cancelled: true, durationMs: 0 });
    const started = performance.now();
    let stdout = '', stderr = '', truncated = false, timedOut = false, cancelled = false;
    const child = spawn(program, args, { cwd, shell, windowsHide: true, detached: process.platform !== 'win32', env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' } });
    let finished = false;
    const stop = () => {
      if (!child.pid || finished) return;
      if (process.platform === 'win32') {
        const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
        killer.on('error', () => child.kill());
      } else { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
    };
    const abort = () => { cancelled = true; stop(); };
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeout);
    for (const [stream, key] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']]) stream.on('data', data => {
      const value = data.toString();
      const current = key === 'stdout' ? stdout : stderr;
      const remaining = Math.max(0, limit - current.length);
      if (value.length > remaining) truncated = true;
      if (key === 'stdout') stdout += value.slice(0, remaining); else stderr += value.slice(0, remaining);
      if (remaining) onOutput?.(key, value.slice(0, remaining));
    });
    const cleanup = () => { finished = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    child.on('error', error => { cleanup(); reject(error); });
    child.on('close', code => { cleanup(); resolve({ code, stdout, stderr, timedOut, cancelled, truncated, durationMs: Math.round(performance.now() - started) }); });
  });
}

export async function git(cwd, args, options = {}) {
  const result = await run('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', ...args], { cwd, ...options });
  if (result.code !== 0 && !options.allowFailure) throw new Error(result.cancelled ? 'Investigation cancelled.' : result.timedOut ? 'Git operation timed out.' : result.stderr.trim() || result.stdout.trim() || `Git exited ${result.code}`);
  return result;
}
