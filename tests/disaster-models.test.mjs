import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {createGame} from '../public/games/disaster-island/rules.js';
import {makeWorld,makeSurvivor,dispose} from '../public/games/disaster-island/scene.js';
const ctx=new Proxy({},{get(t,p){return t[p]??(()=>{})},set(t,p,v){t[p]=v;return true}});globalThis.document={createElement(){return {getContext(){return ctx}}}};
function check(root){root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(root);assert(!b.isEmpty());root.traverse(o=>{for(const n of o.matrixWorld.elements)assert(Number.isFinite(n));for(const n of o.geometry?.attributes.position?.array||[])assert(Number.isFinite(n));for(const n of o.geometry?.attributes.normal?.array||[])assert(Number.isFinite(n))})}
for(let i=0;i<3;i++){const g=createGame({island:i}),w=makeWorld(g.map);for(const disaster of ['flood','tornado','meteors','quake']){g.disaster=disaster;g.phase='active';g.activeTime=12;g.meteors=[{x:2,z:4,r:3,born:11,impactAt:13,done:false}];g.impacts=[{x:3,z:2,r:3,born:11}];w.update(g,12);check(w.root)}g.map.buildings.forEach(b=>{b.warning=true});w.update(g,13);check(w.root);g.map.buildings.forEach(b=>{b.broken=true;b.brokenAt=10});w.update(g,14);check(w.root);w.dispose()}
for(let i=0;i<8;i++){const g=createGame(),model=makeSurvivor(i),a=g.actors[i];for(const t of [0,1,2]){a.vx=4;a.walk=t;a.onGround=t!==2;model.userData.pose(a,t);check(model)}a.alive=false;model.userData.pose(a,4);check(model);dispose(model)}
console.log('Disaster models passed: three islands, four weather effects, warning and collapse states, eight survivors, both running and airborne poses, and finite geometry.');
