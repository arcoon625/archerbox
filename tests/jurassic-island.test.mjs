import assert from 'node:assert/strict';
import {SPECIES,MISSIONS,BASE,STATIONS,NESTS,createGame,blocked,clearLine,protectedAt,interaction,ready,goalFor,useFlare,recover,nextMission,tick,distance} from '../public/games/jurassic-island/rules.js';
import {award,restoreWallet} from '../public/economy/rules.js';
const advance=(g,seconds,input={})=>{for(let t=0;t<seconds;t+=1/60)tick(g,input,1/60)};
const face=(g,d)=>g.yaw=Math.atan2(-(d.x-g.player.x),-(d.z-g.player.z));
function hold(g,seconds){for(let t=0;t<seconds;t+=1/60)tick(g,{interact:true,yaw:g.yaw},1/60)}
function route(g,target){
 const start=[Math.round(g.player.x),Math.round(g.player.z)],end=[Math.round(target.x),Math.round(target.z)],key=p=>p.join(','),queue=[start],prev=new Map([[key(start),null]]);
 for(let i=0;i<queue.length&&!prev.has(key(end));i++)for(const delta of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[queue[i][0]+delta[0],queue[i][1]+delta[1]],k=key(p);if(prev.has(k)||blocked(g,...p,.42))continue;prev.set(k,queue[i]);queue.push(p)}
 assert(prev.has(key(end)),'reachable landmark '+key(end));const path=[];for(let p=end;p;p=prev.get(key(p)))path.unshift({x:p[0],z:p[1]});return path;
}
function walk(g,target){for(const waypoint of route(g,target)){let limit=150;while(distance(g.player,waypoint)>.10&&limit-->0){const dx=waypoint.x-g.player.x,dz=waypoint.z-g.player.z,n=Math.hypot(dx,dz);tick(g,{x:dx/n,z:dz/n},1/60)}assert(limit>0,'walkable route without crossing a wall')}assert(distance(g.player,target)<.2)}
assert.equal(SPECIES.length,6);assert.equal(MISSIONS.length,3);
for(const selection of ['expedition','survey','power','rescue','unknown'])for(const difficulty of ['easy','ranger']){const g=createGame({selection,difficulty});assert.equal(g.dinos.length,8);assert.equal(g.schedule.length,['expedition','unknown'].includes(selection)?3:1);assert(!ready(g));assert(!blocked(g,BASE.x,BASE.z));assert(goalFor(g));}
{
 const g=createGame();assert(blocked(g,41,0));assert(blocked(g,0,21));assert(!clearLine(g,{x:0,z:16},{x:0,z:27}));assert(clearLine(g,{x:8,z:26},{x:8,z:30}));
 for(const p of [...STATIONS,...NESTS,...SPECIES.map(s=>s.home)])route(g,p);
 const z=g.player.z;advance(g,1,{z:-1,sprint:true});assert(g.player.z<z-7);assert(g.player.stamina<80);const stamina=g.player.stamina;advance(g,1);assert(g.player.stamina>stamina);
 tick(g,{jump:true});assert(g.player.y>0);advance(g,1);assert.equal(g.player.y,0);assert(g.player.onGround);
 g.player.x=8;g.player.z=26;advance(g,3,{x:-1});assert(!blocked(g,g.player.x,g.player.z));
}
{
 const g=createGame({selection:'survey'}),d=g.dinos.find(d=>d.species==='brachio');g.dinos=[d];g.player.x=d.x;g.player.z=d.z+12;g.player.shield=100;face(g,d);assert.equal(interaction(g).type,'photo');hold(g,.5);assert.equal(g.photos.length,0);tick(g,{});assert.equal(g.hold,0);g.yaw+=Math.PI;assert.equal(interaction(g),null);face(g,d);hold(g,1.4);assert.deepEqual(g.photos,['brachio']);hold(g,2);assert.equal(g.photos.length,1,'a species can only be photographed once per expedition');g.photos=[];g.player.z=d.z+20;face(g,d);assert.equal(interaction(g),null);g.player.x=0;g.player.z=26;d.x=0;d.z=16;face(g,d);assert.equal(interaction(g),null,'building blocks photography');
}
{
 // Walk through an entire power mission using the same collision and action rules as the browser.
 const g=createGame({selection:'power'});g.player.shield=10000;
 for(const station of STATIONS){walk(g,station);assert.equal(interaction(g).target,station.id);hold(g,2.2);assert(g.repaired.includes(station.id));assert(protectedAt(g,g.player));}
 assert(ready(g));assert.equal(goalFor(g).kind,'base');assert.equal(g.stats.completed,0,'objectives alone do not award a mission');walk(g,BASE);hold(g,1.1);assert.equal(g.phase,'finished');assert.equal(g.stats.completed,1);const time=g.time;advance(g,2,{interact:true});assert.equal(g.time,time);assert.equal(g.stats.completed,1);assert(!nextMission(g));
 const wallet=restoreWallet(null);assert.equal(award(wallet,{game:'jurassic-island',event:'mission',run:'expedition',progress:g.stats.completed}).amount,1);assert.equal(award(wallet,{game:'jurassic-island',event:'mission',run:'expedition',progress:g.stats.completed}).amount,0);
}
{
 const g=createGame();g.player.shield=10000;
 for(const s of SPECIES){const d=g.dinos.find(d=>d.species===s.id);g.player.x=d.x;g.player.z=d.z+9;for(let t=0;t<1.8;t+=1/60){face(g,d);tick(g,{yaw:g.yaw,interact:true})}assert(g.photos.includes(s.id),s.id+' scanned');}
 assert(ready(g));Object.assign(g.player,BASE);hold(g,1.1);assert.equal(g.phase,'result');assert(nextMission(g));assert.equal(g.mission,'power');assert.equal(g.photos.length,6);g.player.shield=10000;
 for(const station of STATIONS){Object.assign(g.player,station);hold(g,2.2)}Object.assign(g.player,BASE);hold(g,1.1);assert(nextMission(g));assert.equal(g.mission,'rescue');g.player.shield=10000;
 for(const nest of NESTS){walk(g,nest);assert.equal(interaction(g).type,'egg');hold(g,.8);assert(g.eggs.includes(nest.id))}walk(g,BASE);hold(g,1.1);assert.equal(g.phase,'finished');assert.equal(g.stats.completed,3);assert.equal(g.eggs.length,3);
 const wallet=restoreWallet(null);assert.equal(award(wallet,{game:'jurassic-island',event:'mission',run:'full',progress:3}).amount,3);
}
{
 const g=createGame({selection:'rescue'}),d=g.dinos[0];g.dinos=[d];Object.assign(g.player,{x:20,z:-8,shield:0});Object.assign(d,{x:20,z:-15,tx:20,tz:-15,think:100});tick(g,{});assert.equal(d.state,'chase');assert(useFlare(g));assert.equal(g.flareAmmo,2);assert(!useFlare(g),'cooldown prevents repeated throws');tick(g,{});assert.equal(d.state,'distracted');advance(g,9.2);assert.equal(g.flares.length,0);
 Object.assign(g.player,{x:20,z:-10,shield:0,hp:100});Object.assign(d,{x:20,z:-10,attack:0});tick(g,{});assert(g.player.hp<100,'predator contact costs health');const hp=g.player.hp;tick(g,{});assert.equal(g.player.hp,hp,'contact cooldown avoids damage every frame');
 Object.assign(g.player,{...BASE,shield:0});Object.assign(d,{...BASE,attack:0});tick(g,{});assert.notEqual(d.state,'chase');assert.equal(g.flareAmmo,3,'base refills flares');
 g.photos=['trex'];g.eggs=['valley'];g.repaired=['west'];g.player.hp=5;g.flareAmmo=0;const before=g.missionTime;assert(recover(g,true));assert.equal(g.missionTime,before+10);assert.equal(g.player.hp,100);assert.equal(g.flareAmmo,3);assert.deepEqual(g.photos,['trex']);assert.deepEqual(g.eggs,['valley']);assert.deepEqual(g.repaired,['west']);assert.equal(g.stats.rescues,1);assert(protectedAt(g,STATIONS[0]));
}
console.log('Jurassic Island passed: six species, all three missions, complete walking routes, hold actions, camera direction, collisions, flares, predator damage, safe zones, rescues, progression and coin rewards.');
