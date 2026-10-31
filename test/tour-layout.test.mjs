import test from 'node:test';
import assert from 'node:assert/strict';
import {tourPlacement,TOUR_STEPS} from '../src/tour-layout.mjs';

test('desktop tour can point beside an input without covering its spotlight',()=>{
  const position=tourPlacement({left:50,right:290,top:220,bottom:260},{width:1440,height:900},{height:320});
  assert.equal(position.side,'right');
  assert.ok(position.left>=position.hole.left+position.hole.width+18);
  assert.ok(position.top+320<=900-14);
  assert.ok(position.hole.left<=50&&position.hole.left+position.hole.width>=290);
});

test('narrow and short viewports keep readable tour cards inside the visible screen',()=>{
  for(const viewport of [{width:375,height:667},{width:320,height:480},{width:812,height:375}]){
    for(const target of [{left:20,right:viewport.width-20,top:50,bottom:90},{left:-20,right:viewport.width+20,top:-200,bottom:1200}]){
      const placed=tourPlacement(target,viewport,{height:700});
      assert.ok(placed.left>=14);assert.ok(placed.top>=14);
      assert.ok(placed.left+placed.width<=viewport.width-14);
      assert.ok(placed.hole.left>=14&&placed.hole.top>=14);
      assert.ok(placed.hole.left+placed.hole.width<=viewport.width-14);
      assert.ok(placed.hole.top+placed.hole.height<=viewport.height-14);
    }
  }
});

test('welcome and missing tour targets use a centered card without a fake spotlight',()=>{
  const placed=tourPlacement(null,{width:375,height:667},{height:420});
  assert.equal(placed.side,'center');assert.equal(placed.hole,null);
  assert.equal(placed.left,14);assert.equal(placed.top,(667-420)/2);
  assert.equal(TOUR_STEPS.length,9);
  assert.ok(TOUR_STEPS.some(step=>step.target==='.export-region'));
});
