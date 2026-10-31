import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='https://abdulbsds25seecs-cloud.github.io/time-of-death/';
const checks=[];
async function get(url){const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,url);checks.push({url,status:response.status});return response;}
assert.match(await(await get(base)).text(),/\.\/demo\//);
const pageURL=base+'demo/',html=await(await get(pageURL)).text();
assert.match(html,/Interactive Case File/);
const assets=[...html.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+)"/g)].map(m=>new URL(m[1],pageURL).href);
assert.ok(assets.some(url=>url.endsWith('.js')));assert.ok(assets.some(url=>url.endsWith('.css')));
for(const url of assets){const content=await(await get(url)).text();if(url.endsWith('.css')){for(const [,font]of content.matchAll(/url\(([^)]+\.woff2)\)/g))await get(new URL(font.replaceAll('"','').replaceAll("'",''),url).href);}}
for(const name of ['clsx-case.json','clsx-case.md','clsx-issue.md']){
 const body=await(await get(pageURL+'reports/'+name)).text();assert.doesNotMatch(body,/[A-Za-z]:[\\/](?:Users|Windows)[\\/]/);
 if(name.endsWith('.json')){const record=JSON.parse(body);assert.equal(record.presentation.kind,'recorded');assert.equal(record.runs.length,14);assert.equal(record.verification.runs.length,6);assert.equal(record.result.candidate.slice(0,7),'3ec8e9f');}
}
const download='https://github.com/abdulbsds25seecs-cloud/time-of-death/releases/download/v0.2.0-preview.20261031/time-of-death-prebuilt.zip';
const zip=await fetch(download,{method:'HEAD',signal:AbortSignal.timeout(30000)});assert.equal(zip.status,200);checks.push({url:download,status:zip.status,kind:'anonymous download HEAD'});
const result={checkedAt:new Date().toISOString(),url:base,status:'passed',checks,limits:'Public HTTP delivery, fonts, scripts, styles, reports and download checked. Interaction has separate React DOM tests. Fresh visual browser QA blocked by Computer Use URL detection.'};
await writeFile('evidence/pages-live-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
