import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {createServer} from 'vite';

test('public recorded explorer distinguishes replay, real evidence and local execution',async t=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.github.io/time-of-death/demo/'}),previous=new Map();
 for(const [key,value]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});}
 const vite=await createServer({configFile:false,server:{middlewareMode:true}});let root;
 try{
  const {default:Explorer}=await vite.ssrLoadModule('/demo/CaseExplorer.jsx');
  root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Explorer)));
  const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));
  await t.test('opens on real case with clear recorded notice and runnable-app download',()=>{
   assert.match(document.body.textContent,/does not run Git, access your files or execute checks/);
   assert.equal(document.querySelectorAll('.demo-commit').length,9);
   assert.equal(document.querySelectorAll('.demo-commit.culprit').length,1);
   assert.equal(document.querySelectorAll('.receipt-list details').length,4);
   assert.match(document.querySelector('.demo-header .primary').href,/releases\/download\/.*\.zip$/);
   assert.equal(document.querySelectorAll('.download-actions a[download]').length,3);
  });
  await t.test('untested selection has no invented logs; tabs show original diff, six patch receipts and reviewed AI error',async()=>{
   const untested=document.querySelector('.demo-commit.untested');await act(async()=>untested.click());
   assert.match(document.querySelector('.demo-empty').textContent,/No receipt/);
   await act(async()=>button('Candidate diff').click());assert.match(document.querySelector('.demo-diff').textContent,/exports/);
   await act(async()=>button('Fix verification').click());assert.equal(document.querySelectorAll('.receipt-list details').length,6);
   assert.deepEqual([...document.querySelectorAll('.demo-fix-outcomes strong')].map(n=>n.textContent),['○ good','× bad','○ good']);
   await act(async()=>button('Local AI autopsy').click());assert.match(document.querySelector('.demo-model-review').textContent,/reverses the chronology/);
  });
  await t.test('replay reveals saved receipts, can pause and restores full recording',async()=>{
   await act(async()=>button('Replay recorded search').click());assert.equal(document.querySelector('[role=status]').textContent,'Replaying saved results…');
   assert.match(document.querySelector('.demo-stats').textContent,/0 \/ 14 checks/);
   await act(async()=>button('Pause replay').click());assert.match(document.querySelector('[role=status]').textContent,/paused/);
   await act(async()=>button('Show full recording').click());assert.match(document.querySelector('[role=status]').textContent,/complete/);
   assert.match(document.querySelector('.demo-stats').textContent,/14 \/ 14 checks/);
   await act(async()=>button('How to explore').click());assert.equal(document.querySelectorAll('.demo-guide li').length,4);
  });
  await t.test('published reports exclude recording workstation paths and carry recorded provenance',async()=>{
   for(const file of ['demo/case.json','docs/demo/reports/clsx-case.json','docs/demo/reports/clsx-case.md','docs/demo/reports/clsx-issue.md']){
    const body=await readFile(file,'utf8');assert.doesNotMatch(body,/[A-Za-z]:[\\/](?:Users|Windows)[\\/]/);
   }
   const data=JSON.parse(await readFile('demo/case.json','utf8'));assert.equal(data.record.presentation.kind,'recorded');assert.equal(data.record.runs.length,14);
  });
 }finally{if(root)await act(async()=>root.unmount());await vite.close();dom.window.close();for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
