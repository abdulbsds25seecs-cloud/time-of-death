const $ = id => document.getElementById(id);
const token = document.querySelector('meta[name=app-token]').content;
let current, stream, filterHash, currentTab = 'evidence', modelsAvailable = false, elapsedTimer, receivedAt = 0;
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const seconds = ms => (ms / 1000).toFixed(1);
$('repro-script').addEventListener('input', () => { $('command').required = !$('repro-script').value.trim(); });
const short = hash => hash?.slice(0, 7) || '—';
async function api(url, body) {
  const response = await fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: { 'x-app-token': token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed.'); return data;
}
function toast(message) { $('toast').textContent = message; $('toast').hidden = !message; }
function showTab(name) {
  currentTab = name;
  document.querySelectorAll('.tab').forEach(button => { const selected = button.dataset.tab === name; button.classList.toggle('active', selected); button.setAttribute('aria-selected', selected); });
  document.querySelectorAll('.tab-content').forEach(panel => { panel.hidden = panel.id !== `tab-${name}`; });
}
document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => showTab(button.dataset.tab)));
function reset() {
  stream?.close(); current = null; filterHash = null; clearInterval(elapsedTimer); toast(''); document.body.classList.remove('compact'); $('case-panel').hidden = true; $('header-case').textContent = 'New investigation'; window.scrollTo({ top: 0 });
}
$('new-investigation').onclick = reset; $('another-button').onclick = reset;
async function loadDemo() {
  const button = $('demo-button'); button.disabled = true; button.querySelector('span').textContent = 'Preparing real Git history…'; toast('');
  try {
    const demo = await api('/api/demo', {});
    $('repo').value = demo.repo; $('good').value = demo.good; $('bad').value = demo.bad; $('command').value = demo.command;
    $('repro-script').value = ''; $('command').required = true;
    $('failure-pattern').value = 'A session at its exact expiration must be rejected'; $('trusted').checked = true;
    $('demo-note').hidden = false; $('demo-note').textContent = 'SYNTHETIC CASE / 24 real commits. An expiration-boundary bug was deliberately introduced. No dependencies, no network, no simulated execution. Start the investigation to find it.';
    $('start-button').focus();
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.querySelector('span').textContent = 'Load the 24-commit demo'; }
}
$('demo-button').onclick = loadDemo;
$('investigation-form').onsubmit = async event => {
  event.preventDefault(); toast(''); $('start-button').disabled = true;
  try {
    const state = await api('/api/investigations', { repo: $('repo').value.trim(), good: $('good').value.trim(), bad: $('bad').value.trim(), command: $('command').value.trim(), reproScript: $('repro-script').value, trusted: $('trusted').checked, timeoutMs: Number($('timeout').value), repeats: Number($('repeats').value), failurePattern: $('failure-pattern').value.trim() });
    filterHash = null; connect(state); showTab('evidence'); window.scrollTo({ top: 0 });
  } catch (error) { toast(error.message); }
  finally { $('start-button').disabled = false; }
};
function connect(state) {
  stream?.close(); render(state);
  stream = new EventSource(`/api/investigations/${state.id}/events?token=${encodeURIComponent(token)}`);
  stream.onmessage = event => { const value = JSON.parse(event.data); render(value); };
  stream.onerror = () => { if (current?.status === 'running' || current?.status === 'queued' || current?.analysis?.status === 'running') $('trace-caption').textContent = 'Connection interrupted. Reconnecting…'; };
  clearInterval(elapsedTimer);
  elapsedTimer = setInterval(() => { if (current && ['running', 'queued'].includes(current.status)) $('metric-time').innerHTML = `${seconds(current.elapsedMs + Date.now() - receivedAt)}<span>s</span>`; }, 250);
}
function render(state) {
  current = state; receivedAt = Date.now();
  document.body.classList.add('compact'); $('case-panel').hidden = false; $('header-case').textContent = `Case ${state.id.slice(0, 8)}`; $('case-id').textContent = state.id.slice(0, 8).toUpperCase();
  $('case-title').textContent = state.phase;
  const running = ['queued', 'running'].includes(state.status);
  $('cancel-button').hidden = !running; $('another-button').hidden = running;
  $('metric-history').textContent = state.commits.length || '—'; $('metric-tested').textContent = new Set(state.runs.map(r => r.hash)).size; $('metric-checks').textContent = state.runs.length; $('metric-time').innerHTML = `${seconds(state.elapsedMs)}<span>s</span>`; $('metric-state').textContent = state.status;
  $('live-badge').textContent = running ? 'LIVE' : state.status.toUpperCase(); $('live-badge').classList.toggle('running', running); $('trace-caption').textContent = 'Actual check outcomes, not predicted progress';
  $('timeline').innerHTML = state.commits.map((c, i) => `<button class="commit-node ${c.status}${running && c.hash === state.currentHash ? ' current' : ''}${c.hash === filterHash ? ' selected' : ''}" data-hash="${escape(c.hash)}" title="${escape(`${i + 1}. ${c.short} · ${c.subject} · ${c.status}`)}" aria-label="${escape(`Commit ${i + 1}: ${c.subject}, ${c.status}`)}"><span class="node-circle"></span><span class="node-label">${String(i + 1).padStart(2, '0')}</span></button>`).join('');
  $('timeline').querySelectorAll('button').forEach(button => { button.onclick = () => { filterHash = button.dataset.hash; showTab('evidence'); render(current); }; });
  const verdict = $('verdict'); verdict.hidden = running; verdict.classList.toggle('alert', state.status !== 'complete');
  if (state.result) verdict.innerHTML = `<div class="verdict-label">✳ FIRST FAILING BOUNDARY CONFIRMED</div><h3>${escape(state.result.subject)}</h3><code>${escape(short(state.result.candidate))}</code><p>The candidate failed; its parent <code>${escape(short(state.result.parent))}</code> passed. ${state.repeats} check${state.repeats === 1 ? '' : 's'} per revision. This is the observed boundary under a reproducible, monotonic regression assumption—not proof of the root cause.</p>`;
  else if (!running) verdict.innerHTML = `<div class="verdict-label">${escape(state.status.toUpperCase())} / NO CONFIRMED CANDIDATE</div><h3>${escape(state.error || 'The investigation did not finish.')}</h3><p>The recorded checks are available below. No unsupported failure verdict has been inferred.</p>`;
  $('evidence-count').textContent = state.runs.length;
  const openIDs = new Set([...$('evidence-list').querySelectorAll('details[open]')].map(d => d.dataset.id));
  const runs = state.runs.filter(r => !filterHash || r.hash === filterHash);
  $('clear-filter').hidden = !filterHash;
  $('evidence-list').innerHTML = runs.length ? [...runs].reverse().map(r => `<details class="evidence-card" data-id="${r.id}" id="evidence-${r.id}" ${openIDs.has(r.id) ? 'open' : ''}><summary><span class="evidence-id">${r.id}</span><span class="badge ${r.status}">${r.status}</span><span class="evidence-hash">${escape(short(r.hash))}</span><span class="evidence-stage">${escape(r.stage)} · ${r.repetition}/${state.repeats}</span><span class="evidence-duration">${r.durationMs} ms</span></summary><div class="evidence-meta">Exit ${escape(r.code)} · ${escape(r.at)}${r.truncated ? ' · OUTPUT TRUNCATED' : ''}</div><pre>${escape((r.stdout + '\n' + r.stderr).trim() || '(No output)')}</pre></details>`).join('') : '<p class="empty-message">Waiting for the first recorded check…</p>';
  $('diff-output').innerHTML = state.result ? state.result.diff.split('\n').map(line => `<span class="${line.startsWith('+') && !line.startsWith('+++') ? 'diff-add' : line.startsWith('-') && !line.startsWith('---') ? 'diff-del' : line.startsWith('@@') ? 'diff-hunk' : ''}">${escape(line)}\n</span>`).join('') : 'The candidate diff appears after a conclusive investigation.';
  $('journal-list').innerHTML = state.events.map(e => `<div class="journal-entry"><time>${escape(new Date(e.at).toLocaleTimeString())}</time><span>${escape(e.message)}</span></div>`).join('') || '<p class="empty-message">Opening the investigation…</p>';
  $('analyze-button').disabled = state.status !== 'complete' || state.analysis?.status === 'running' || !modelsAvailable;
  $('analyze-button').textContent = state.analysis?.status === 'running' ? 'Local model is investigating…' : 'Generate autopsy ↗';
  renderAnalysis(state.analysis);
  if (state.cleanupWarning || state.persistenceError) toast(state.cleanupWarning || `Could not save report: ${state.persistenceError}`);
}
$('clear-filter').onclick = () => { filterHash = null; render(current); };
$('cancel-button').onclick = async () => { try { await api(`/api/investigations/${current.id}/cancel`, {}); } catch (e) { toast(e.message); } };
async function download(format) {
  if (!current) return;
  try {
    const response = await fetch(`/api/investigations/${current.id}/report?format=${format}`, { headers: { 'x-app-token': token } });
    if (!response.ok) throw new Error('Report could not be exported.');
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `time-of-death-${current.id.slice(0, 8)}.${format === 'json' ? 'json' : 'md'}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { toast(e.message); }
}
$('export-md').onclick = () => download('md'); $('export-json').onclick = () => download('json');
$('copy-diff').onclick = async () => { try { await navigator.clipboard.writeText(current?.result?.diff || ''); $('copy-diff').textContent = 'Copied'; setTimeout(() => $('copy-diff').textContent = 'Copy diff', 1500); } catch { toast('Clipboard unavailable. Export the report instead.'); } };
async function loadModels() {
  try {
    const status = await api('/api/models'); modelsAvailable = status.available && status.models.length > 0;
    $('model-select').innerHTML = modelsAvailable ? status.models.map(m => `<option value="${escape(m.name)}">${escape(m.name)} · ${(m.size / 1e9).toFixed(1)} GB</option>`).join('') : '<option value="gemma3:1b">gemma3:1b · not installed</option>';
    const preferred = status.models.find(m => m.name === 'gemma3:1b'); if (preferred) $('model-select').value = preferred.name;
    $('ai-status').textContent = modelsAvailable ? `${status.endpoint} · Local inference · No API bill · Unloads after report` : status.message || 'No local models found. Run ollama pull gemma3:1b, then refresh AI settings.';
    if (current) render(current);
  } catch (e) { $('ai-status').textContent = e.message; }
}
$('settings-button').onclick = async () => { if (!current) { $('guide-dialog').showModal(); } else { showTab('autopsy'); $('tab-autopsy').scrollIntoView({ behavior: 'smooth', block: 'start' }); } await loadModels(); };
$('analyze-button').onclick = async () => { if (!current) return; $('analyze-button').disabled = true; toast(''); try { await api(`/api/investigations/${current.id}/analysis`, { model: $('model-select').value }); } catch (e) { toast(e.message); $('analyze-button').disabled = false; } };
function renderAnalysis(a) {
  if (!a) { $('ai-output').innerHTML = ''; return; }
  if (a.status === 'running') { $('ai-output').innerHTML = '<p class="analysis-summary">Reading the candidate diff and recorded checks… This can take a few minutes on CPU. Your browser remains usable.</p>'; return; }
  if (a.status === 'error') { $('ai-output').innerHTML = `<p class="analysis-summary">${escape(a.error)}</p>`; return; }
  $('ai-output').innerHTML = `<p class="analysis-summary">${escape(a.summary)}</p>${a.findings.map(f => `<div class="finding"><div class="finding-label">HYPOTHESIS / REVIEW REQUIRED</div><p>${escape(f.explanation)}</p>${f.evidence.map(id => `<button class="source-link" data-source="${escape(id)}">↳ ${escape(id)}</button>`).join('')}</div>`).join('')}<h3>Suggested next checks</h3><ol class="next-checks">${a.nextChecks.map(x => `<li>${escape(x)}</li>`).join('')}</ol><p class="ai-note">${escape(a.model)} · ${seconds(a.durationMs)}s · ${escape(a.tokens ?? '—')} output tokens${a.tokensPerSecond ? ` · ${a.tokensPerSecond} tokens/s` : ''}<br>${escape(a.note)}</p>`;
  $('ai-output').querySelectorAll('[data-source]').forEach(button => { button.onclick = () => { const id = button.dataset.source; if (id === 'D1') showTab('diff'); else { filterHash = null; showTab('evidence'); render(current); const detail = $(`evidence-${id}`); if (detail) { detail.open = true; detail.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } }; });
}
async function loadHistory(open = false) {
  try {
    const history = await api('/api/history'); $('history-count').textContent = history.length;
    $('history-list').innerHTML = history.length ? history.map(s => `<button class="history-item" data-id="${escape(s.id)}"><span class="badge ${s.status === 'complete' ? 'good' : 'skip'}">${escape(s.status)}</span><div><strong>${escape(s.subject || s.repo || 'Investigation')}</strong><small>${escape(new Date(s.createdAt).toLocaleString())} · ${seconds(s.elapsedMs)}s · ${escape(s.id.slice(0, 8))}</small></div><span>↗</span></button>`).join('') : '<p class="empty-message">No closed cases yet. Your completed investigations will appear here.</p>';
    $('history-list').querySelectorAll('button').forEach(button => { button.onclick = async () => { try { const state = await api(`/api/investigations/${button.dataset.id}`); filterHash = null; connect(state); $('history-dialog').close(); window.scrollTo({ top: 0 }); } catch (e) { toast(e.message); } }; });
    if (open) $('history-dialog').showModal();
  } catch (e) { toast(e.message); }
}
$('history-button').onclick = () => loadHistory(true); $('guide-button').onclick = () => $('guide-dialog').showModal();
document.querySelectorAll('.close-dialog').forEach(button => button.onclick = () => button.closest('dialog').close());
document.addEventListener('keydown', event => { if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || document.querySelector('dialog[open]')) return; if (event.key.toLowerCase() === 'n' && !['queued', 'running'].includes(current?.status)) reset(); if (event.key.toLowerCase() === 'd' && !current) loadDemo(); if (event.key === '?') $('guide-dialog').showModal(); });
await Promise.all([loadModels(), loadHistory(), api('/api/health').then(h => $('memory-label').textContent = `ENGINE · ${h.memoryMB} MB`).catch(() => {})]);
const health = await api('/api/health').catch(() => null);
if (health?.active) { try { connect(await api(`/api/investigations/${health.active}`)); } catch {} }
