import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {WEAPONS,createGame} from '../public/games/battle-arena/rules.js';
import {makeWeapon,makeFighter,makeViewLoadout,makeArena,dispose} from '../public/games/battle-arena/scene.js';
const ctx=new Proxy({}, {get(t,p){if(p==='createLinearGradient')return()=>({addColorStop(){}});return t[p]??(()=>{})},set(t,p,v){t[p]=v;return true}});
globalThis.document={createElement(tag){assert.equal(tag,'canvas');return {width:512,height:512,getContext(){return ctx}}}};
function check(root,label){root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root);assert(!bounds.isEmpty(),label);for(const point of [bounds.min,bounds.max])for(const axis of ['x','y','z'])assert(Number.isFinite(point[axis]),label);let meshes=0;root.traverse(o=>{if(!o.geometry)return;meshes++;for(const n of o.geometry.attributes.position?.array||[])assert(Number.isFinite(n),label+' vertices');for(const n of o.geometry.attributes.normal?.array||[])assert(Number.isFinite(n),label+' normals')});assert(meshes>5,label);return bounds}
for(const w of WEAPONS){const weapon=makeWeapon(w.id);check(weapon,w.name);dispose(weapon);for(const team of [0,1]){const model=makeFighter(team,w.id),g=createGame({weapon:w.id}),a=g.actors[0];a.yaw=Math.PI/2;model.userData.pose(a,1);const front=new THREE.Vector3(0,0,-1).applyQuaternion(model.quaternion);assert(front.x>.99,'fighter faces the same way as collision attacks');check(model,w.name+' armor');a.attack={t:.3,wind:.23,heavy:true};model.userData.pose(a,2);a.attack=null;a.block=true;model.userData.pose(a,3);a.hp=0;a.alive=false;model.userData.pose(a,4);dispose(model)}}
const tones=new Set();
for(let variant=0;variant<6;variant++){
 const model=makeFighter(variant%2,WEAPONS[variant].id,variant),rig=model.userData.rig,a=createGame({weapon:WEAPONS[variant].id}).actors[0];
 tones.add(model.userData.skinTone);model.updateMatrixWorld(true);
 const headBounds=new THREE.Box3().setFromObject(rig.head),feet=Math.min(...rig.ankles.map(foot=>new THREE.Box3().setFromObject(foot).min.y)),height=headBounds.max.y-feet;
 assert(height>1.8&&height<2.1,'fighter is human sized');
 assert(headBounds.getSize(new THREE.Vector3()).y/height<.21,'head and helmet have adult proportions');
 let calls=0;model.traverse(o=>{if(o.isMesh)calls++});assert(calls<100,'six detailed fighters stay within the per-fighter draw budget');
 for(const pose of [{walk:1,vx:4,vz:1},{block:true},{dash:.2},{attack:{t:.1,wind:.25,duration:.9,heavy:true}},{attack:{t:.36,wind:.25,duration:.9,heavy:true}},{attack:{t:.80,wind:.25,duration:.9,heavy:true}},{alive:false}]){
  const actor={...a,...pose},before=JSON.stringify(actor);model.userData.pose(actor,3);model.updateMatrixWorld(true);
  assert.equal(JSON.stringify(actor),before,'animation never changes battle rules or actor state');
  model.traverse(o=>{for(const value of o.matrixWorld.elements)assert(Number.isFinite(value),'all animated joints have finite transforms')});
  for(const hand of rig.hands)assert(new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld).distanceTo(new THREE.Vector3().setFromMatrixPosition(rig.body.matrixWorld))<1.1,'hands stay connected during every action');
 }
 dispose(model);const view=makeViewLoadout(WEAPONS[variant].id);check(view,'first-person '+WEAPONS[variant].name);dispose(view);
}
assert.equal(tones.size,6,'rivals have varied appearances');
for(let i=0;i<3;i++){const arena=makeArena(i);check(arena.root,arena.config.name);assert(arena.config.obstacles.length>=2);dispose(arena.root)}
console.log('Battle models passed: six weapons and human appearances, human proportions, attached joints in seven action poses, first-person equipment, bounded draw calls, unchanged battle state, three arenas and finite geometry.');
