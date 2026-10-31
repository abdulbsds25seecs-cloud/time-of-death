import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {markdownReport} from '../lib/ai.mjs';
import {issueReport} from '../lib/issue-report.mjs';
const original=JSON.parse(await readFile('evidence/real-world-case.json','utf8'));
const partner=JSON.parse(await readFile('evidence/final-partner-run.json','utf8'));
// Publish only the already-public historical case; remove workstation locations.
const scrub=value=>typeof value==='string'?value.replaceAll(original.repo,'recorded-public-clsx-checkout').replace(/[A-Za-z]:[\\/](?:Users|Windows)[^\r\n'"<>]*/g,'[recording-machine path removed]'):Array.isArray(value)?value.map(scrub):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,scrub(item)])):value;
const record=scrub(original);
record.presentation={kind:'recorded',notice:'These are saved execution results, not checks running in your browser.',sanitization:'Recording-machine paths removed. Raw public evidence remains in the source repository.'};
const model={model:partner.inference.model,summary:partner.inference.summary,durationMs:partner.inference.durationMs,tokens:partner.inference.tokens,review:'The model describes the older passing parent as a revision that resolved the failure. That reverses the chronology. Real citation IDs do not establish a correct explanation.'};
await mkdir('demo/public/reports',{recursive:true});
await writeFile('demo/case.json',JSON.stringify({record,model},null,2));
await writeFile('demo/public/reports/clsx-case.json',JSON.stringify(record,null,2));
await writeFile('demo/public/reports/clsx-case.md',markdownReport(record));
await writeFile('demo/public/reports/clsx-issue.md',issueReport(record));
console.log('Prepared recorded public-history demo and three reports; workstation paths removed.');
