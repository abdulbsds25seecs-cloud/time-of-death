export const BAYER_8 = [
  [0,48,12,60,3,51,15,63], [32,16,44,28,35,19,47,31],
  [8,56,4,52,11,59,7,55], [40,24,36,20,43,27,39,23],
  [2,50,14,62,1,49,13,61], [34,18,46,30,33,17,45,29],
  [10,58,6,54,9,57,5,53], [42,26,38,22,41,25,37,21]
];

export const glyph = status => ({ good:'○', bad:'×', skip:'∅', timeout:'⊣', unstable:'≠', culprit:'×', cancelled:'■', error:'!', untested:'–' }[status] || '–');

export function revisionStatus(commit, runs = [], repeats = 1) {
  const recorded = runs.filter(r => r.hash === commit.hash);
  if (!recorded.length) return 'untested';
  const statuses = new Set(recorded.map(r => r.status));
  if (statuses.size > 1 && ![...statuses].every(x => ['good','culprit'].includes(x))) return 'unstable';
  return recorded.at(-1).status;
}

export function suspectRange(state) {
  const commits = state?.commits || [];
  if (!commits.length) return { start: 0, end: 0, total: 0, resolved: false };
  if (state.result) { const index = commits.findIndex(c => c.hash === state.result.candidate); return { start: index, end: index, total: commits.length, resolved: true }; }
  let start = 0, end = commits.length - 1;
  commits.forEach((c, index) => {
    const rows = (state.runs || []).filter(r => r.hash === c.hash);
    const status = revisionStatus(c, state.runs);
    if (rows.length < (state.repeats || 1)) return;
    if (status === 'good') start = Math.max(start, index + 1);
    if (status === 'bad') end = Math.min(end, index);
  });
  return { start, end, total: commits.length, resolved: false };
}

export function diffRows(diff = '') {
  let before = 0, after = 0;
  return diff.split('\n').map((text, index) => {
    const hunk = text.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    let kind = 'context', oldLine = '', newLine = '';
    if (hunk) { before = +hunk[1]; after = +hunk[2]; kind = 'hunk'; }
    else if (/^(diff |index |--- |\+\+\+ |\\)/.test(text)) kind = 'meta';
    else if (text.startsWith('-')) { kind = 'removed'; oldLine = before++; }
    else if (text.startsWith('+')) { kind = 'added'; newLine = after++; }
    else if (text.startsWith(' ')) { oldLine = before++; newLine = after++; }
    return { text, kind, oldLine, newLine, index };
  });
}
