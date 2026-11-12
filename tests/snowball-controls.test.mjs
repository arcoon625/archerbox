import assert from 'node:assert/strict';
import {bindAimControls,capturePointer} from '../public/games/snowball-showdown/controls.js';
function events(){const handlers=new Map();return {addEventListener:(name,fn)=>handlers.set(name,[...(handlers.get(name)||[]),fn]),fire(name,event={}){for(const fn of handlers.get(name)||[])fn(event)}}}
function fixture({lock='pending'}={}){
 const doc=events(),win=events();doc.defaultView=win;doc.pointerLockElement=null;let captures=0,requests=0,active=true,throwing=false,aiming=false,unlocks=0;const looks=[];
 const canvas={ownerDocument:doc,focus(){},setPointerCapture(){captures++;if(lock==='pending')throw new DOMException('Pointer lock in progress','InvalidStateError')},requestPointerLock(){requests++;if(lock==='unsupported')throw new DOMException('Unavailable','NotSupportedError');if(lock==='rejected')return Promise.reject(new DOMException('Unavailable','NotAllowedError'));return Promise.resolve()}};
 const reset=bindAimControls(canvas,{isPlaying:()=>active,onThrow:v=>throwing=v,onAim:v=>aiming=v,onLook:(x,y)=>looks.push([x,y]),onUnlock:()=>unlocks++});
 const down=(type='mouse',button=0)=>canvas.onpointerdown({pointerType:type,button,pointerId:7,clientX:100,clientY:100});
 return {doc,win,canvas,down,reset,looks,get captures(){return captures},get requests(){return requests},get throwing(){return throwing},get aiming(){return aiming},get unlocks(){return unlocks},pause:()=>active=false};
}
{
 // Reproduces the reported crash: requestPointerLock is pending, the browser
 // still reports null, and setPointerCapture would throw InvalidStateError.
 const f=fixture();assert.doesNotThrow(()=>f.down());assert.equal(f.requests,1);assert.equal(f.captures,0);assert(f.throwing);f.doc.pointerLockElement=f.canvas;f.doc.fire('pointerlockchange');assert(f.throwing,'locking does not cancel the first throw');f.doc.fire('mousemove',{movementX:20,movementY:-10});assert.deepEqual(f.looks,[[-.05,.022000000000000002]]);f.down('mouse',2);assert(f.aiming);f.win.fire('pointerup');assert(!f.throwing&&!f.aiming);f.doc.pointerLockElement=null;f.doc.fire('pointerlockchange');assert.equal(f.unlocks,1);f.doc.fire('pointerlockchange');assert.equal(f.unlocks,1,'pause only on a real unlock');
}
for(const lock of ['unsupported','rejected']){
 const f=fixture({lock});assert.doesNotThrow(()=>f.down());await Promise.resolve();f.win.fire('pointermove',{pointerId:7,clientX:110,clientY:90});assert.deepEqual(f.looks,[[-.04,.03]],'drag aim works without pointer lock');assert.equal(f.captures,0);f.win.fire('pointercancel');assert(!f.throwing);f.win.fire('pointermove',{pointerId:7,clientX:140,clientY:50});assert.equal(f.looks.length,1);
}
{
 const f=fixture();assert.doesNotThrow(()=>f.down('touch'));assert.equal(f.requests,0);assert.equal(f.captures,1);f.win.fire('pointermove',{pointerId:7,clientX:90,clientY:120});assert.deepEqual(f.looks,[[.04,-.06]],'touch drag survives a capture race');f.pause();f.down();assert.equal(f.requests,0);f.win.fire('pointermove',{pointerId:7,clientX:150,clientY:150});assert.equal(f.looks.length,1);f.reset();assert(!f.aiming&&!f.throwing);
 const target={ownerDocument:{pointerLockElement:{}},setPointerCapture:()=>assert.fail('do not capture during lock')};assert.equal(capturePointer(target,1),false);assert.equal(capturePointer({setPointerCapture(){throw new DOMException('Pointer ended','NotFoundError')}},1),false);assert.throws(()=>capturePointer({setPointerCapture(){throw new Error('Unexpected failure')}},1),/Unexpected failure/);
}
console.log('Snowball controls: pointer-lock race, captured and released mouse, right-click aim, first throw, denied lock, drag fallback, touch, cancellation and pause passed.');
