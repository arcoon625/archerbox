import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {createGame} from '../public/games/laser-maze/rules.js';
import {makeWorld} from '../public/games/laser-maze/scene.js';
const ctx=new Proxy({},{get(t,p){return t[p]??(()=>{})},set(t,p,v){t[p]=v;return true}});globalThis.document={createElement(){return {getContext(){return ctx}}}};
for(let i=0;i<3;i++){const g=createGame(i),world=makeWorld(g.map);for(const time of [0,1.4,3.1,5.7]){g.time=time;world.update(g,time);world.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(world.root);assert(!bounds.isEmpty());let meshes=0;world.root.traverse(o=>{for(const n of o.matrixWorld.elements)assert(Number.isFinite(n));if(o.geometry){meshes++;for(const n of o.geometry.attributes.position?.array||[])assert(Number.isFinite(n));for(const n of o.geometry.attributes.normal?.array||[])assert(Number.isFinite(n))}});assert(meshes<450,'maze uses batched wall and floor rendering')}g.collected=[0,1];g.activated=g.map.checkpoints.map(p=>p.id);g.disabledUntil=20;world.update(g,6);world.dispose()}
console.log('Laser models passed: three complete mazes, finite geometry and animation, batched rendering, collected-card and disabled-laser states.');
