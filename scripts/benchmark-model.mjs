import { readFile, writeFile } from 'node:fs/promises';
import { analyze, modelStatus } from '../lib/ai.mjs';
const [reportPath, model = 'qwen2.5-coder:1.5b', output = 'evidence/coder-model-attempt.json'] = process.argv.slice(2);
if (!reportPath) throw new Error('Usage: node scripts/benchmark-model.mjs .data/reports/CASE.json MODEL OUTPUT.json');
const started = Date.now();
while (true) {
  const status = await modelStatus();
  if (status.models.some(m => m.name === model)) break;
  if (Date.now() - started > 300000) throw new Error('Model did not become available within five minutes.');
  await new Promise(resolve => setTimeout(resolve, 3000));
}
const state = JSON.parse(await readFile(reportPath, 'utf8'));
const result = await analyze(state, model);
await writeFile(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ model, summary: result.summary, findings: result.findings, nextChecks: result.nextChecks, durationMs: result.durationMs, tokensPerSecond: result.tokensPerSecond }, null, 2));
