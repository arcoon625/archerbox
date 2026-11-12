import assert from 'node:assert/strict';
import {createGame,tick,nextRound,terrainHeight,tornadoPosition,shelter,canOccupy,DISASTERS} from '../public/games/disaster-island/rules.js';
import {restoreWallet,award} from '../public/economy/rules.js';
const dt=1/60;
function go(g,target){const p=g.actors[0],dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.5)return {};let x=dx/d,z=dz/d;if(!canOccupy(g,p,p.x+x*.7,p.z+z*.7)){const a=Math.atan2(x,z);for(const angle of [.8,-.8,1.5,-1.5,2.2,-2.2]){const cx=Math.sin(a+angle),cz=Math.cos(a+angle);if(canOccupy(g,p,p.x+cx*.7,p.z+cz*.7)){x=cx;z=cz;break}}}return {x,z,yaw:0,sprint:true}}
function survive(island,disaster,difficulty='easy'){
 const g=createGame({island,disaster,difficulty,seed:739});let waypoint=0,frames=0;
 while(['prepare','active'].includes(g.phase)&&frames++<8000){let input={},p=g.actors[0];
  if(disaster==='flood'){const route=island===2?[{x:9,z:17},{x:11,z:-7},g.map.config.hill]:[g.map.config.hill];if(waypoint<route.length-1&&Math.hypot(route[waypoint].x-p.x,route[waypoint].z-p.z)<1)waypoint++;input=go(g,route[waypoint])}
  if(disaster==='tornado'){const b=g.map.config.bunker,route=[{x:b.x,z:b.z+5.5},b];if(waypoint===0&&Math.hypot(p.x-route[0].x,p.z-route[0].z)<1)waypoint=1;input=go(g,route[waypoint])}
  if(disaster==='quake')input=go(g,{x:-20,z:16});
  if(disaster==='meteors'){const angle=Math.PI/2+g.elapsed*.23;input=go(g,{x:Math.cos(angle)*25,z:Math.sin(angle)*25});const danger=g.meteors.find(m=>!m.done&&Math.hypot(m.x-p.x,m.z-p.z)<m.r+2.0);if(danger)input=go(g,{x:p.x+(p.x-danger.x)*5,z:p.z+(p.z-danger.z)*5})}
  tick(g,input,dt);for(const a of g.actors)for(const field of ['x','y','z','hp','air','vx','vz'])assert(Number.isFinite(a[field]),field+' stays finite');
 }
 assert.equal(g.phase,'finished');assert(g.result.won,`${island} ${disaster} ${difficulty} must be survivable, health ${g.actors[0].hp}`);assert.equal(g.stats.survived,1);const frozen=JSON.stringify(g);tick(g,{jump:true},dt);assert.equal(JSON.stringify(g),frozen,'result cannot change or pay again');return g;
}
for(let island=0;island<3;island++)for(const d of DISASTERS)for(const difficulty of ['easy','storm'])survive(island,d.id,difficulty);
{
 const g=createGame({disaster:'flood'});while(['prepare','active'].includes(g.phase))tick(g,{},dt);assert(!g.result.won,'waiting on low ground is not flood survival');assert.equal(g.stats.survived,0);
}
{
 const g=createGame({disaster:'quake'}),b=g.map.buildings.find(b=>b.id==='blue-cabin'),p=g.actors[0];Object.assign(p,{x:b.x,z:b.z,y:b.roof,onGround:true});g.elapsed=g.prep+b.collapseAt-.02;g.phase='active';tick(g,{},.04);assert(b.broken);const before=p.y;for(let i=0;i<120&&p.alive;i++)tick(g,{},dt);assert(p.y<before-1,'destroyed roof no longer holds a survivor up');assert(p.hp<100,'a collapse can hurt someone in the building');
}
{
 const g=createGame({disaster:'meteors'}),b=g.map.buildings.find(b=>b.id==='bunker'),p=g.actors[0];Object.assign(p,{x:b.x,z:b.z,y:b.base});assert(shelter(g,p));g.phase='active';g.elapsed=g.prep+1;g.nextMeteor=999;g.meteors=[{id:99,x:b.x,z:b.z,r:3,born:0,impactAt:0,done:false}];tick(g,{},dt);assert.equal(p.hp,100,'an intact concrete roof absorbs the first strike');assert.equal(b.hp,2);b.broken=true;assert.equal(shelter(g,p),undefined,'a broken roof offers no shelter');
}
{
 const g=createGame({disaster:'tornado'});g.elapsed=g.prep+12;g.activeTime=12;g.phase='active';const t=tornadoPosition(g),p=g.actors[0];Object.assign(p,{x:t.x,z:t.z,y:terrainHeight(g.map,t.x,t.z)});for(let i=0;i<15;i++)tick(g,{},dt);assert(p.hp<100,'the funnel really damages survivors');assert(p.vy>0||!p.onGround,'strong wind can lift someone');
}
{
 const g=createGame({disaster:'flood'}),p=g.actors[0],t=g.map.config.tower;Object.assign(p,{x:t.x,z:t.z+13.9,y:terrainHeight(g.map,t.x,t.z+13.9)});for(let i=0;i<175;i++)tick(g,{z:-1,yaw:0},dt);assert(p.y>7,'lookout stairs are walkable all the way to the high platform');
}
{
 const g=createGame({disaster:'quake'}),p=g.actors[0],b=g.map.buildings.find(b=>b.id==='bunker');Object.assign(p,{x:b.x-b.w/2-.4,z:b.z,y:b.base});for(let i=0;i<60;i++)tick(g,{x:1,yaw:0},dt);assert(p.x<b.x-b.w/2,'walls prevent walking through buildings');
}
{
 const g=createGame({disaster:'quake'}),p=g.actors[0];tick(g,{jump:true},dt);assert(p.y>terrainHeight(g.map,p.x,p.z),'jump lifts off the ground');for(let i=0;i<100;i++)tick(g,{jump:true},dt);assert(p.onGround,'held jump does not bounce forever');
}
{
 const g=createGame();assert.equal(new Set(g.schedule).size,4,'surprise expedition has four different disasters');for(let i=0;i<4;i++){const p=g.actors[0];const t=g.disaster==='flood'?g.map.config.hill:g.disaster==='quake'?{x:-22,z:0}:g.map.config.bunker;Object.assign(p,{x:t.x,z:t.z,y:terrainHeight(g.map,t.x,t.z)});g.elapsed=g.prep+g.duration-.001;tick(g,{},.01);assert(g.result.won);if(i<3){assert(nextRound(g));assert.equal(g.phase,'prepare');assert(g.map.buildings.every(b=>!b.broken));assert(g.actors.every(a=>a.hp===100));}else assert.equal(g.phase,'finished')}assert.equal(g.stats.survived,4);const w=restoreWallet(null),reward={game:'disaster-island',event:'survive',run:'test-island',progress:4};assert.equal(award(w,reward).amount,4);assert.equal(award(w,reward).amount,0,'survival coins are deduplicated');
}
console.log('Disaster Island passed: all 24 island/disaster/difficulty combinations survived through movement; low-ground flooding, tornado damage, shelter protection, collapsing supports, collision, jumps, four-round reset and survival rewards.');
