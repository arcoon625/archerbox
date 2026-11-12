import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {createGame} from '../public/games/snowball-showdown/rules.js';
import {makePlayer,makeHands,makeWorld,dispose} from '../public/games/snowball-showdown/scene.js';
const ctx=new Proxy({},{get:(t,k)=>t[k]??(()=>{}),set:(t,k,v)=>(t[k]=v,true)});globalThis.document={createElement:()=>({getContext:()=>ctx})};
function finite(root){root.updateMatrixWorld(true);root.traverse(o=>{assert(o.matrixWorld.elements.every(Number.isFinite));for(const n of o.geometry?.attributes.position?.array||[])assert(Number.isFinite(n));for(const n of o.geometry?.attributes.normal?.array||[])assert(Number.isFinite(n))})}
for(let arena=0;arena<3;arena++){const g=createGame({arena,mode:'squads'}),world=makeWorld(g.map);g.balls=[{id:1,x:0,y:2,z:0}];world.update(g,1);world.burst({x:1,y:1,z:2},1);world.update(g,1.2);finite(world.root);g.balls=[];world.update(g,2);finite(world.root);dispose(world.root);}
const g=createGame({mode:'squads'});for(const p of g.actors){const model=makePlayer(p.id,p.team);model.userData.pose(p,0);const height=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;assert(height>1.8&&height<2.2);for(const pose of [{walk:3,vx:5,throwPose:.15},{pack:1},{dodge:.2},{alive:false},{y:1,vy:2,onGround:false}]){Object.assign(p,pose);model.userData.pose(p,1);finite(model)}dispose(model)}const hands=makeHands();hands.userData.update(g.actors[0]);finite(hands);dispose(hands);
console.log('Snowball models: winter outfits, all poses, 3 arenas, snow, projectiles, bursts and first-person mittens passed.');
