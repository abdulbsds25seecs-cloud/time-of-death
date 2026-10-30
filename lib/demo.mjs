import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { git } from './process.mjs';

export async function createDemo(root, { count = 24, brokenAt = 15, skipAt = [], name = 'demo-repository' } = {}) {
  const repo = path.join(root, name);
  const manifest = path.join(root, `${name}.json`);
  try { await access(manifest); return JSON.parse(await (await import('node:fs/promises')).readFile(manifest, 'utf8')); } catch {}
  await mkdir(repo, { recursive: true });
  await git(repo, ['init', '-b', 'main']);
  const check = `import assert from 'node:assert/strict';\nimport { sessionIsValid } from './session.mjs';\nassert.equal(sessionIsValid(1000, 1000), false, 'A session at its exact expiration must be rejected');\nassert.equal(sessionIsValid(999, 1000), true, 'An unexpired session should remain valid');\nassert.equal(sessionIsValid(1001, 1000), false, 'An expired session must be rejected');\nconsole.log('PASS: all 3 session boundary checks');\n`;
  await writeFile(path.join(repo, 'check.mjs'), check);
  const hashes = [];
  const subjects = ['Create session validator', 'Document expiration units', 'Name the session cookie', 'Add request identifier', 'Document renewal behavior', 'Add account settings label', 'Normalize UI copy', 'Add session status labels', 'Document clock source', 'Add settings help', 'Describe login flow', 'Add request trace notes', 'Improve settings labels', 'Refactor expiration comparison', 'Allow boundary timestamp in session check', 'Document cookie lifecycle', 'Update support copy', 'Add account menu labels', 'Document retry behavior', 'Clarify logout copy', 'Add troubleshooting note', 'Update project description', 'Document response shape', 'Polish release checklist'];
  for (let i = 1; i <= count; i++) {
    await writeFile(path.join(repo, 'session.mjs'), `// Epoch timestamps use the same units. Sessions expire at expiresAt.\nexport function sessionIsValid(now, expiresAt) {\n  return now ${i >= brokenAt ? '<=' : '<'} expiresAt;\n}\n`);
    await writeFile(path.join(repo, 'notes.md'), `# Session service\n\nSynthetic demonstration repository. Revision ${i}.\n\n${subjects[(i - 1) % subjects.length]}\n`);
    await writeFile(path.join(repo, 'check.mjs'), skipAt.includes(i) ? 'console.error("SKIP: synthetic unavailable environment"); process.exit(125);\n' : check);
    await git(repo, ['add', '.']);
    await git(repo, ['-c', 'user.name=Time of Death Demo', '-c', 'user.email=demo@example.invalid', 'commit', '-m', subjects[(i - 1) % subjects.length]]);
    hashes.push((await git(repo, ['rev-parse', 'HEAD'])).stdout.trim());
  }
  const result = { repo, good: hashes[0], bad: hashes.at(-1), expected: hashes[brokenAt - 1] || null, command: 'node check.mjs', count, brokenAt, synthetic: true, hashes };
  await writeFile(manifest, JSON.stringify(result, null, 2));
  return result;
}
