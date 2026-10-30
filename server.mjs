import http from 'node:http';
import { readFile, writeFile, mkdir, readdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { investigate, newState, inspectRepository } from './lib/engine.mjs';
import { createDemo } from './lib/demo.mjs';
import { modelStatus, markdownReport } from './lib/ai.mjs';
import { runAutopsy } from './lib/autopsy-workflow.mjs';
import { initTelemetry, traced } from './lib/telemetry.mjs';

export async function createApp({ dataDir, port = 4317, analyzeCase = runAutopsy } = {}) {
  await initTelemetry();
  const root = path.dirname(fileURLToPath(import.meta.url));
  dataDir ||= path.join(root, '.data');
  await mkdir(path.join(dataDir, 'reports'), { recursive: true });
  const token = randomBytes(24).toString('hex'), instance = randomUUID();
  const states = new Map(), clients = new Map();
  let active = null, demoPromise;
  const persist = async state => { const dest = path.join(dataDir, 'reports', `${state.id}.json`); await writeFile(dest + '.tmp', JSON.stringify(state)); await rename(dest + '.tmp', dest); };
  const publish = state => { for (const client of clients.get(state.id) || []) client.write(`data: ${JSON.stringify(state)}\n\n`); };
  const getState = async id => {
    if (!/^[\w-]{1,60}$/.test(id)) throw new Error('Invalid investigation ID.');
    if (!states.has(id)||states.get(id)?.durability) {
      const s = JSON.parse(await readFile(path.join(dataDir, 'reports', `${id}.json`), 'utf8'));
      if (!s.durability&&['queued', 'running'].includes(s.status)) { s.status = 'interrupted'; s.error = 'The app stopped before this investigation finished. Start a new investigation.'; }
      if (s.analysis?.status === 'running'&&(!s.durability||(s.analysis.owner&&s.analysis.owner!==instance))) s.analysis = { status: 'error', error: 'AI analysis was interrupted. You can request it again.' };
      states.set(id, s);
    }
    return states.get(id);
  };
  const server = http.createServer(async (req, res) => {
    const json = (status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const host = req.headers.host;
      if (!host || !/^((127\.0\.0\.1)|(localhost)):\d+$/.test(host)) return json(403, { error: 'This application accepts loopback requests only.' });
      const url = new URL(req.url, `http://${host}`);
      res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      if (req.headers.origin && req.headers.origin !== `http://${host}`) return json(403, { error: 'Cross-origin requests are not permitted.' });
      if (!url.pathname.startsWith('/api/')) {
        if(req.method!=='GET')return json(404,{error:'Not found'});
        const asset = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        if(!/^(index\.html|favicon\.svg|assets\/[\w.-]+)$/.test(asset))return json(404,{error:'Not found'});
        const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff'};
        const type=types[path.extname(asset)];if(!type)return json(404,{error:'Not found'});
        let body;
        try { body=await readFile(path.join(root,'dist',asset)); }
        catch(e) { if(e.code==='ENOENT'&&asset==='index.html')return json(503,{error:'Build the interface first: npm install, then npm run build.'});throw e; }
        if(asset==='index.html')body=body.toString('utf8').replace('__TOKEN__',token);
        res.writeHead(200,{'content-type':type});return res.end(body);
      }
      if (req.headers['x-app-token'] !== token && !(url.pathname.endsWith('/events') && url.searchParams.get('token') === token)) return json(403, { error: 'Application token required. Reload the app.' });
      let input = {};
      if (req.method === 'POST') {
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 20000) return json(413, { error: 'Request too large.' }); }
        try { input = JSON.parse(body || '{}'); } catch { return json(400, { error: 'Invalid JSON.' }); }
      }
      if (url.pathname === '/api/health') return json(200, { status: 'ok', version: '1.0.0', node: process.version, memoryMB: Math.round(process.memoryUsage().rss / 1048576), active: active?.id || null });
      if (url.pathname === '/api/models' && req.method === 'GET') return json(200, await modelStatus());
      if (url.pathname === '/api/history' && req.method === 'GET') {
        const files = (await readdir(path.join(dataDir, 'reports'))).filter(f => f.endsWith('.json'));
        const history = [];
        for (const file of files.slice(-100)) { try { const s = await getState(file.slice(0, -5)); history.push({ id: s.id, createdAt: s.createdAt, status: s.status, repo: s.repo, subject: s.result?.subject, elapsedMs: s.elapsedMs }); } catch {} }
        return json(200, history.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20));
      }
      if (url.pathname === '/api/demo' && req.method === 'POST') { demoPromise ||= createDemo(dataDir).catch(e => { demoPromise = null; throw e; }); return json(200, await demoPromise); }
      if (url.pathname === '/api/inspect' && req.method === 'POST') return json(200, await inspectRepository(input.repo, input.good, input.bad));
      if (url.pathname === '/api/investigations' && req.method === 'POST') {
        if ([...states.values()].some(x=>x.analysis?.status==='running')) return json(409,{error:'Wait for the local AI report to finish before starting another investigation.'});
        if (active) return json(409, { error: 'An investigation is already running. Cancel it or wait for its result.' });
        if (input.trusted !== true) return json(400, { error: 'Confirm that you trust the repository and check command.' });
        const state = newState(randomUUID()); states.set(state.id, state);
        const controller = new AbortController(); active = { id: state.id, controller };
        json(202, state);
        traced('Regression investigation','task',{revisions:state.commits.length},()=>investigate(input, state, publish, controller.signal)).finally(async () => { active = null; await persist(state).catch(e => { state.persistenceError = e.message; }); publish(state); });
        return;
      }
      const match = url.pathname.match(/^\/api\/investigations\/([\w-]+)(?:\/(events|cancel|analysis|report))?$/);
      if (match) {
        const [, id, action] = match; const s = await getState(id);
        if (action === 'events' && req.method === 'GET') {
          res.writeHead(200, { 'content-type': 'text/event-stream', connection: 'keep-alive' });
          if (!clients.has(id)) clients.set(id, new Set()); clients.get(id).add(res);
          res.write(`data: ${JSON.stringify(s)}\n\n`);
          const timer = setInterval(async () => {if(s.durability){try{publish(await getState(id));}catch{}}else res.write(': heartbeat\n\n');}, s.durability?2000:15000);
          req.on('close', () => { clearInterval(timer); clients.get(id)?.delete(res); }); return;
        }
        if (action === 'cancel' && req.method === 'POST') {
          if(s.durability){const {Client,Connection}=await import('@temporalio/client');const connection=await Connection.connect({address:process.env.TEMPORAL_ADDRESS||'127.0.0.1:7233'});try{await new Client({connection}).workflow.getHandle(id).cancel();}finally{await connection.close();}return json(200,{cancelled:true});}
          if (active?.id === id) active.controller.abort(); return json(200, { cancelled: active?.id === id }); }
        if (action === 'analysis' && req.method === 'POST') {
          if(active)return json(409,{error:'Wait for the active investigation to finish before running local inference.'});
          if (s.status !== 'complete') return json(400, { error: 'Complete a conclusive investigation first.' });
          if ([...states.values()].some(x => x.analysis?.status === 'running')) return json(409, { error: 'A local AI report is already being generated.' });
          s.analysis = { status: 'running', owner:instance }; await persist(s); publish(s); json(202, s.analysis);
          analyzeCase(s, input.model||'gemma3:1b').then(a => { s.analysis = { status: 'complete', ...a }; }).catch(e => { s.analysis = { status: 'error', error: e.message }; }).finally(async () => { states.set(s.id,s); await persist(s).catch(() => {}); publish(s); }); return;
        }
        if (action === 'report' && req.method === 'GET') {
          const isJSON = url.searchParams.get('format') === 'json';
          res.writeHead(200, { 'content-type': isJSON ? 'application/json' : 'text/markdown; charset=utf-8', 'content-disposition': `attachment; filename="time-of-death-${id.slice(0, 8)}.${isJSON ? 'json' : 'md'}"` });
          return res.end(isJSON ? JSON.stringify(s, null, 2) : markdownReport(s));
        }
        if (!action && req.method === 'GET') return json(200, s);
      }
      return json(404, { error: 'Not found' });
    } catch (error) { json(400, { error: error.code === 'ENOENT' ? 'Repository or investigation not found.' : error.message }); }
  });
  return { server, listen: () => new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server.address()))), close: () => { active?.controller.abort(); for (const set of clients.values()) for (const client of set) client.end(); return new Promise(resolve => server.close(resolve)); } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = await createApp({ port: Number(process.env.PORT) || 4317 });
  const address = await app.listen(); console.log(`Time of Death is ready: http://127.0.0.1:${address.port}\nLocal-only. Prebuilt assets and fonts. No paid services. Press Ctrl+C to stop.`);
  process.on('SIGINT', async () => { await app.close(); process.exit(0); });
}
