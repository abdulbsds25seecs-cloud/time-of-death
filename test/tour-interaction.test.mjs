import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {createServer} from 'vite';

test('tour lifecycle, keyboard isolation, focus restoration, replay and unavailable storage',async t=>{
  const dom=new JSDOM('<!doctype html><button id="launch">Launch</button><div id="root"><div id="mount"></div><input name="repo"><input name="good"><input name="command"><button class="begin">Run</button><div id="timeline"><div class="empty-timeline"></div></div><div id="selected-evidence"><div class="empty-evidence"></div></div><div id="candidate"><div class="empty-candidate"></div></div><div id="autopsy"><div class="established"></div></div><div class="export-region"></div></div>',{url:'http://127.0.0.1:4317/',pretendToBeVisual:true});
  const previous=new Map();
  const set=(key,value)=>{previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});};
  for(const key of ['window','document','localStorage','HTMLElement','Node'])set(key,dom.window[key]);
  set('ResizeObserver',class{observe(){}disconnect(){}});
  set('requestAnimationFrame',dom.window.requestAnimationFrame.bind(dom.window));set('cancelAnimationFrame',dom.window.cancelAnimationFrame.bind(dom.window));set('IS_REACT_ACT_ENVIRONMENT',true);
  dom.window.HTMLElement.prototype.scrollIntoView=function(){};
  dom.window.HTMLElement.prototype.getBoundingClientRect=function(){return this.classList.contains('tour-card')?{left:400,top:100,right:780,bottom:450,width:380,height:350}:{left:30,top:30,right:270,bottom:80,width:240,height:50};};
  const server=await createServer({configFile:false,server:{middlewareMode:true}});
  let root;
  try{
    const {default:GuidedTour}=await server.ssrLoadModule('/src/GuidedTour.jsx');
    const host=document.getElementById('mount'),launch=document.getElementById('launch');
    const button=text=>[...document.querySelectorAll('.tour-card button')].find(b=>b.textContent.trim()===text);
    const press=async key=>act(async()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})));
    await t.test('all nine steps can be navigated without leaking shortcuts behind the modal',async()=>{
      launch.focus();root=createRoot(host);await act(async()=>root.render(React.createElement(GuidedTour)));
      await act(async()=>new Promise(r=>setTimeout(r,500)));
      assert.ok(button('Take tour'));assert.equal(document.getElementById('root').inert,true);
      await act(async()=>button('Take tour').click());
      assert.match(document.getElementById('tour-title').textContent,/Open a case/);
      assert.equal(button('Back').disabled,true);
      let escaped=0;document.addEventListener('keydown',()=>escaped++);
      await press('ArrowRight');assert.match(document.getElementById('tour-title').textContent,/boundaries/);
      await press('ArrowLeft');assert.match(document.getElementById('tour-title').textContent,/Open a case/);
      const buttons=[...document.querySelectorAll('.tour-card button:not(:disabled)')];buttons.at(-1).focus();
      await press('Tab');assert.equal(document.activeElement,buttons[0]);
      await act(async()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true})));
      assert.equal(document.activeElement,buttons.at(-1));
      await press('e');assert.equal(escaped,0,'app export shortcut must not receive tour keys');
      for(let step=1;step<9;step++)await press('ArrowRight');
      assert.ok(button('Finish tour'));await act(async()=>button('Finish tour').click());
      assert.equal(document.querySelector('.tour-card'),null);assert.equal(document.getElementById('root').inert,undefined);
      assert.equal(document.activeElement,launch);assert.equal(document.body.style.overflow,'');assert.equal(localStorage.getItem('time-of-death:tour:v1'),'dismissed');
    });
    await t.test('manual replay works after dismissal and Escape closes it',async()=>{
      await act(async()=>root.render(React.createElement(GuidedTour,{replay:1})));
      assert.ok(button('Take tour'));await press('Escape');assert.equal(document.querySelector('.tour-card'),null);
      await act(async()=>root.unmount());root=createRoot(host);await act(async()=>root.render(React.createElement(GuidedTour)));
      await act(async()=>new Promise(r=>setTimeout(r,500)));assert.equal(document.querySelector('.tour-card'),null);
    });
    await t.test('blocked browser storage still permits onboarding and dismissal',async()=>{
      await act(async()=>root.unmount());
      Object.defineProperty(globalThis,'localStorage',{value:{getItem(){throw Error('Storage blocked');},setItem(){throw Error('Storage blocked');}},configurable:true});
      root=createRoot(host);await act(async()=>root.render(React.createElement(GuidedTour)));
      await act(async()=>new Promise(r=>setTimeout(r,500)));
      assert.ok(button('Do not show again'));await act(async()=>button('Do not show again').click());assert.equal(document.querySelector('.tour-card'),null);
    });
  }finally{if(root)await act(async()=>root.unmount());await server.close();dom.window.close();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
