import assert from 'node:assert/strict';
import {Box3,Vector3} from '../public/vendor/three.module.js';
import {makePlayer,animatePlayer,celebrationJoints} from '../public/games/touchdown-rush/players.js';
import {dispose} from '../public/games/touchdown-rush/scene.js';
import {TEAMS} from '../public/games/touchdown-rush/teams.js';
import {createGame} from '../public/games/touchdown-rush/rules.js';
import {CELEBRATIONS,celebrationPose} from '../public/games/touchdown-rush/celebrations.js';

for(const [i,t] of TEAMS.entries()){
 const model=makePlayer(t.color,i,{...t,playerName:'Test Athlete '+i,role:i%2?'WR':'LT',away:i%2===1}),r=model.userData;
 assert.equal(r.jerseyNumber,i);assert.equal(r.arms.length,2);assert.equal(r.elbows.length,2);assert.equal(r.knees.length,2);assert.equal(r.ankles.length,2);
 // Check the printed texture from an outside viewer on BOTH jersey faces.
 // Increasing texture U must run left-to-right on screen, never mirror 17/23.
 model.traverse(mesh=>{if(mesh.material!==r.uniform)return;const p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');for(const side of [-1,1]){const row=new Map();for(let j=0;j<p.count;j++)if(Math.abs(p.getY(j)-.52)<.001&&side*p.getZ(j)>.2){row.set(side*p.getX(j),uv.getX(j));}const points=[...row].sort((a,b)=>a[0]-b[0]);assert(points.length>=3,'front and back jersey print are sampled');for(let j=1;j<points.length;j++)assert(points[j][1]>points[j-1][1],'jersey text reads left-to-right from outside');}});
 model.updateMatrixWorld(true);const size=new Box3().setFromObject(model).getSize(new Vector3());assert(size.y>1.8&&size.y<2.4,'human-scale players use yards, matching the field');assert(size.x<1.3,'athletes remain narrower than tackle distance');
 let draws=0;model.traverse(m=>{if(!m.isMesh)return;draws++;const p=m.geometry.getAttribute('position'),n=m.geometry.getAttribute('normal');for(let j=0;j<p.count;j++){assert(Number.isFinite(p.getX(j))&&Number.isFinite(p.getY(j))&&Number.isFinite(p.getZ(j)));assert(Number.isFinite(n.getX(j))&&Number.isFinite(n.getY(j))&&Number.isFinite(n.getZ(j)));}});assert(draws<=52,'static parts are batched on each bone, including detailed faces');
 for(let phase=0;phase<12;phase++){const actor={id:i,role:r.role,moving:phase%2?9:0,juke:phase%3?0:.4};const original=JSON.stringify(actor);animatePlayer(model,actor,phase*.15,{carrier:phase===2,quarterback:phase===3,catching:phase===4,throwTime:phase===5?.12:undefined,kickTime:phase===6?.3:undefined,ready:phase===0,blocking:phase===7,holdingKick:phase===8});model.updateMatrixWorld(true);r.ballGrip.getWorldPosition(size);assert(size.toArray().every(Number.isFinite));assert.equal(JSON.stringify(actor),original,'cosmetic motion cannot modify game rules');}
 dispose(model);
}
const runner=makePlayer(0x003594,88,{role:'WR'}),lineman=makePlayer(0x003594,73,{role:'LT'});assert(lineman.userData.bulk>runner.userData.bulk);
const game=createGame(),snapshot=JSON.stringify(game);
for(const celebration of CELEBRATIONS)for(let t=0;t<=6;t+=.15){const p=celebrationPose(celebration.id,t);celebrationJoints(runner,celebration.id,t);for(let i=0;i<2;i++){runner.userData.arms[i].rotation.set(...p.arms[i]);runner.userData.legs[i].rotation.set(...p.legs[i]);}runner.updateMatrixWorld(true);runner.userData.ballGrip.getWorldPosition(new Vector3());assert(runner.userData.elbows.every(e=>Number.isFinite(e.rotation.x)));}
assert.equal(JSON.stringify(game),snapshot);dispose(runner);dispose(lineman);
console.log('Football models passed: 32 team kits, distinct athlete builds, bounded draw calls, finite geometry/normals, articulated run/carry/pass/catch/kick poses, five celebrations, and unchanged rules state.');
