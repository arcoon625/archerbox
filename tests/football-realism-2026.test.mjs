import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Box3,Vector3} from '../public/vendor/three.module.js';
import {PLAYER_PROFILES,PROFILE_SEASON} from '../public/games/touchdown-rush/player-profiles.js';
import {athleteProfile,portraitFaceGeometry} from '../public/games/touchdown-rush/athlete-detail.js';
import {makePlayer,animatePlayer} from '../public/games/touchdown-rush/players.js';
import {makeBall,dispose} from '../public/games/touchdown-rush/scene.js';
import {CURRENT_STATS,CURRENT_SEASON} from '../public/games/touchdown-rush/season-stats.js';
import {playerTraits} from '../public/games/touchdown-rush/traits.js';
assert.equal(PROFILE_SEASON,2026);assert.equal(CURRENT_SEASON,2026);
assert.equal(Object.keys(PLAYER_PROFILES).length,1816);assert(Object.keys(CURRENT_STATS).length>1000);
for(const [id,p] of Object.entries(PLAYER_PROFILES)){
 assert(p.height>=60&&p.height<=90&&p.weight>=140&&p.weight<=420);
 assert(p.face.length===4&&p.face.every(Number.isFinite));const [x,y,w,h]=p.face;assert(x>=0&&y>=0&&x+w<=1.001&&y+h<=1.001);
 const path=new URL('../public/games/touchdown-rush/faces/'+id+'.webp',import.meta.url);assert(fs.statSync(path).size>500);assert.equal(fs.readFileSync(path).toString('ascii',8,12),'WEBP');
}
assert.deepEqual([athleteProfile('3918298','QB').height,athleteProfile('3918298','QB').weight],[77,237]);
assert.deepEqual([athleteProfile('3117251','RB').height,athleteProfile('3117251','RB').weight],[71,210]);
const heights=[];
for(const [id,role] of [['3918298','QB'],['3117251','RB'],['2577417','QB']]){
 const m=makePlayer(0x003594,17,{playerId:id,role});animatePlayer(m,{moving:0,role},0);m.updateMatrixWorld(true);const box=new Box3().setFromObject(m);heights.push(box.max.y);
 assert(Math.abs(box.max.y-athleteProfile(id,role).heightYards)<.02,'measured athlete height is physically visible');
 let triangles=0;m.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.getAttribute('position').count)/3;});assert(triangles<55000,'detailed athletes have a bounded geometry budget');dispose(m);assert(m.userData.disposed);
}
assert(heights[0]>heights[1]+.1,'Allen is visibly taller than McCaffrey');
const g=portraitFaceGeometry(PLAYER_PROFILES['2577417'].face),p=g.getAttribute('position'),uv=g.getAttribute('uv'),n=g.getAttribute('normal');
const center=14*29+14;assert(n.getZ(center)<-.5,'curved nose and face normals point outward through the mask');assert(uv.getX(center-1)>uv.getX(center+1),'portrait reads correctly from an outside front view');assert(uv.getY(center+29)>uv.getY(center),'portrait eyes remain above the mouth');for(const value of p.array)assert(Number.isFinite(value));g.dispose();
for(const [id,r] of Object.entries(CURRENT_STATS)){const t=playerTraits(id,r.position);for(const k of ['speed','accuracy','hands','finish','tackle'])assert(t[k]>=55&&t[k]<=99);if(t.dataSeason===2026)assert(t.source.includes('/seasons/2026/'));}
const purdy=playerTraits('4361741','QB');assert.equal(purdy.dataSeason,2026);assert(purdy.notes.some(s=>s.startsWith('2026:')));
const fallback=playerTraits('4433970','QB');if(fallback.dataSeason===2025)assert(fallback.notes.some(n=>n.includes('limited 2026 sample')));
const ball=makeBall(),size=new Box3().setFromObject(ball).getSize(new Vector3());assert(size.z>.30&&size.z<.34&&size.x<.20,'football size follows the yard scale');dispose(ball);
console.log('2026 realism passed: 1,816 measurements/portraits, individual human heights, outward unmirrored faces, bounded geometry, 2026 stat sources with honest baselines, safe disposal and a human-scale football.');
