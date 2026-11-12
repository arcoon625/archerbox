import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {makeWorld,makePerson,makePoop,makeUnderwear,dispose} from '../public/games/poop-panic/scene.js';
import {createGame} from '../public/games/poop-panic/rules.js';
const ctx=new Proxy({},{get:(t,p)=>t[p]??(()=>{}),set(t,p,v){t[p]=v;return true}});globalThis.document={createElement(){return {getContext(){return ctx}}}};
function check(root){root.updateMatrixWorld(true);assert(!new THREE.Box3().setFromObject(root).isEmpty());root.traverse(o=>{for(const n of o.matrixWorld.elements)assert(Number.isFinite(n));for(const n of o.geometry?.attributes.position?.array||[])assert(Number.isFinite(n))})}
const world=makeWorld(),g=createGame();g.splats=[{x:1,y:0,z:3,born:0}];world.update(g,2);check(world.root);dispose(world.root);for(let i=0;i<11;i++){const p=makePerson(i);p.userData.pose({...g.player,walk:2,vx:3,throwPose:.2},2,true);check(p);const prize=[];p.traverse(o=>{if(o.userData.reward==='golden-underwear')prize.push(o)});assert.equal(prize.length,1);assert(prize[0].visible);p.userData.pose(g.player,3,false);assert(!prize[0].visible);dispose(p)}for(const root of [makePoop(),makeUnderwear()]){check(root);dispose(root)}
console.log('Poop models passed: city courtyard, eleven fully clothed characters, optional over-clothes Golden Underwear, projectiles, trophy and splats.');
