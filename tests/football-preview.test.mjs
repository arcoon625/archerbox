import assert from 'node:assert/strict';
import {createPreview} from '../public/games/touchdown-rush/creator-preview.js';
import {TEAMS} from '../public/games/touchdown-rush/teams.js';

// Exercise the preview's resource lifetime and failures without a GPU.
const frames=new Map();let nextFrame=0;
globalThis.devicePixelRatio=1;
globalThis.requestAnimationFrame=fn=>{frames.set(++nextFrame,fn);return nextFrame;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
globalThis.ResizeObserver=class {observe(){}disconnect(){}};
globalThis.window=new EventTarget();
class Canvas extends EventTarget {getBoundingClientRect(){return {width:400,height:430};}}
const player={id:'athlete-preview-test',name:'Preview Test',position:'QB',number:12,height:72,weight:220,skinTone:'#986344'};
function tick(){const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(performance.now());}
let allocations=0,renders=0,disposals=0,forcedLosses=0,renderFailure=false;
const canvas=new Canvas(),statuses=[];
const preview=createPreview(canvas,{onStatus:s=>statuses.push(s),createRenderer:()=>{
 allocations++;return {setPixelRatio(){},setSize(){},render(){if(renderFailure)throw Error('GPU unavailable');renders++;},renderLists:{dispose(){}},dispose(){disposals++;},forceContextLoss(){forcedLosses++;}};
}});
for(let i=0;i<20;i++){
 preview.update({...player,number:i},TEAMS[0]);tick();assert(frames.size===1);
 preview.suspend();assert.equal(frames.size,0,'hidden editor has no animation loop');
}
assert.equal(allocations,1,'reopening reuses one renderer');assert.equal(renders,20);
assert.equal(disposals,0);assert.equal(forcedLosses,0,'tab changes never invalidate the canvas context');
preview.update(player,TEAMS[0]);
const lost=new Event('webglcontextlost',{cancelable:true});canvas.dispatchEvent(lost);
assert(lost.defaultPrevented);assert.equal(statuses.at(-1),'restoring');assert.equal(frames.size,0);
preview.update({...player,number:99},TEAMS[0]);assert.equal(frames.size,0,'editing during restoration does not render');
canvas.dispatchEvent(new Event('webglcontextrestored'));tick();assert.equal(statuses.at(-1),'ready');assert.equal(renders,21);
preview.suspend();canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));canvas.dispatchEvent(new Event('webglcontextrestored'));
assert.equal(frames.size,0,'restoration while closed does not restart animation');
preview.update(player,TEAMS[0]);tick();assert.equal(renders,22);
const oldWarn=console.warn;console.warn=()=>{};
try{
 renderFailure=true;tick();assert.equal(statuses.at(-1),'unavailable');assert.equal(frames.size,0,'failed renders stop instead of throwing every frame');
 preview.close();preview.close();assert.equal(disposals,1);assert.equal(forcedLosses,0);
 const failedStatuses=[],unavailable=createPreview(new Canvas(),{createRenderer:()=>{throw Error("Cannot read properties of null (reading 'precision')");},onStatus:s=>failedStatuses.push(s)});
 assert.doesNotThrow(()=>{unavailable.update(player,TEAMS[0]);unavailable.suspend();unavailable.update(player,TEAMS[0]);unavailable.close();});
 assert(failedStatuses.every(s=>s==='unavailable'));assert.equal(frames.size,0,'failed initialization remains optional');
}finally{console.warn=oldWarn;}
console.log('Football preview passed: 20 open/close cycles, one renderer, suspended resources, lost-context restoration, render failure and exact precision-crash containment.');
