import assert from 'node:assert/strict';
import {ARENAS,WEAPONS,createGame,tick,nextRound,nearestEnemy,beginAttack,dodge,hit,clearLine,moveActor,finishRound,angle,weaponOf,distance} from '../public/games/battle-arena/rules.js';
import {restoreWallet,award} from '../public/economy/rules.js';
const advance=(g,time,input={})=>{for(let t=0;t<time;t+=1/60)tick(g,typeof input==='function'?input(g):input,1/60)};
function duel(weapon='sword'){const g=createGame({weapon});g.phase='combat';const [p,e]=g.actors;p.x=e.x=0;p.z=0;e.z=-1.8;p.yaw=0;e.yaw=Math.PI;return {g,p,e}}
assert.equal(ARENAS.length,3);assert.equal(WEAPONS.length,6);assert.equal(new Set(WEAPONS.map(w=>w.id)).size,6);
for(const mode of ['duel','teams','survival']){const g=createGame({mode,name:'Archer'});assert.equal(g.actors[0].name,'Archer');assert.equal(g.actors.filter(a=>a.player).length,1);assert.equal(g.actors.length,mode==='teams'?6:2);assert.equal(new Set(g.actors.map(a=>a.name)).size,g.actors.length);assert.equal(g.phase,'countdown');const before=g.actors.map(a=>[a.x,a.z,a.hp]);advance(g,1);assert.equal(g.time,mode==='survival'?100:90);assert.deepEqual(g.actors.map(a=>[a.x,a.z,a.hp]),before);advance(g,2.1);assert.equal(g.phase,'combat')}
{
 const {g,p,e}=duel();assert(beginAttack(g,p));assert(!beginAttack(g,p));assert(hit(g,p,e));const hp=e.hp;assert(hp<100);assert(!hit(g,p,e));assert.equal(e.hp,hp,'one swing only hits an opponent once');
 const far=duel();far.e.z=-10;assert(beginAttack(far.g,far.p));assert(!hit(far.g,far.p,far.e),'range matters');far.e.z=1.8;assert(!hit(far.g,far.p,far.e),'attacks cannot hit behind you');
 const g2=createGame({mode:'teams'});g2.phase='combat';const [a,b]=g2.actors;b.x=a.x;b.z=a.z-1;assert(beginAttack(g2,a));assert(!hit(g2,a,b));assert.equal(b.hp,100,'no friendly fire');
}
{
 const {g,p,e}=duel();e.block=true;e.blockAge=.4;beginAttack(g,p);hit(g,p,e);assert(e.hp>97);assert.equal(e.stamina,84);
 const back=duel();back.e.block=true;back.e.blockAge=.4;back.e.yaw=0;beginAttack(back.g,back.p);hit(back.g,back.p,back.e);assert(back.e.hp<90,'a shield does not protect the back');
 const parry=duel();parry.e.block=true;parry.e.blockAge=.05;beginAttack(parry.g,parry.p);hit(parry.g,parry.p,parry.e);assert.equal(parry.e.hp,100);assert.equal(parry.p.attack,null);assert(parry.p.stun>=.5);
 const heavy=duel('hammer');heavy.e.block=true;heavy.e.blockAge=.4;beginAttack(heavy.g,heavy.p,true);hit(heavy.g,heavy.p,heavy.e);assert(heavy.e.hp<85);assert.equal(heavy.e.stamina,69);
 const broken=duel();broken.e.block=true;broken.e.blockAge=.4;broken.e.stamina=4;beginAttack(broken.g,broken.p,true);hit(broken.g,broken.p,broken.e);assert.equal(broken.e.stamina,0);assert(!broken.e.block);assert(broken.e.stun>=.65);
}
{
 const {g,p,e}=duel();assert(dodge(g,e,1,0));assert(!dodge(g,e,1,0));beginAttack(g,p);hit(g,p,e);assert.equal(e.hp,100,'an active dodge avoids the attack');assert.equal(e.stamina,76);
 p.attack=null;p.cooldown=0;p.stamina=0;assert(!beginAttack(g,p));assert(!dodge(g,p,1,0));e.x=10;e.z=0;e.stun=100;advance(g,1);assert(p.stamina>0&&p.stamina<=100,'stamina recovers');
}
{
 for(let arena=0;arena<3;arena++){const g=createGame({arena});const p=g.actors[0];moveActor(g,p,500,500);assert(Math.hypot(p.x,p.z)<=ARENAS[arena].radius-.59);const o=ARENAS[arena].obstacles[0];p.x=o.x;p.z=o.z;moveActor(g,p,0,0);assert(distance(p,o)>=o.r+.479,'pillars are solid');const a={x:o.x,z:o.z-1.7},b={x:o.x,z:o.z+1.7};assert(!clearLine(g,a,b));g.phase='combat';Object.assign(g.actors[0],a,{weapon:'spear',yaw:Math.PI});Object.assign(g.actors[1],b);beginAttack(g,g.actors[0]);assert(!hit(g,g.actors[0],g.actors[1]),'no attacks through pillars')}
 const {g,p,e}=duel();p.x=e.x=0;p.z=e.z=0;p.stun=e.stun=100;tick(g,{},.01);assert(distance(p,e)>.97,'fighters cannot overlap');
}
{
 const {g,p,e}=duel();e.hp=1;beginAttack(g,p);hit(g,p,e);assert(!e.alive);tick(g,{},.01);assert.equal(g.phase,'round-end');assert.equal(g.stats.roundWins,1);assert.equal(g.stats.kos,1);assert.equal(g.score[0],1);
 const wallet=restoreWallet(null);const reward=()=>award(wallet,{game:'battle-arena',event:'round-win',run:'match',progress:g.stats.roundWins});assert.equal(reward().amount,1);assert.equal(reward().amount,0);
 const before=JSON.stringify([g.actors,g.time,g.stats,g.result]);advance(g,3,{light:true,x:1});assert.equal(JSON.stringify([g.actors,g.time,g.stats,g.result]),before,'results freeze the simulation');
 assert(nextRound(g));assert.equal(g.round,2);assert(g.actors.every(a=>a.hp===100&&a.stamina===100));g.phase='combat';finishRound(g,0);assert.equal(g.phase,'finished');assert.equal(reward().amount,1);assert.equal(wallet.balance,2);assert(!nextRound(g));assert(!finishRound(g,0));assert.equal(g.stats.roundWins,2);
 const loss=duel();finishRound(loss.g,1);assert.equal(loss.g.stats.roundWins,0);assert(!finishRound(loss.g,0));const draw=duel();finishRound(draw.g,null);assert(draw.g.result.draw);assert.equal(draw.g.stats.roundWins,0);assert.deepEqual(draw.g.score,[0,0]);
}
{
 const g=createGame({mode:'survival'});for(let wave=1;wave<=5;wave++){assert.equal(g.wave,wave);assert.equal(g.actors.length,1+Math.min(4,1+Math.floor(wave/2)));g.phase='combat';finishRound(g,0);assert.equal(g.stats.roundWins,wave);if(wave<5)assert(nextRound(g));}assert.equal(g.phase,'finished');assert(g.result.won);assert(!nextRound(g));
 const loss=createGame({mode:'survival'});loss.phase='combat';finishRound(loss,1);assert.equal(loss.phase,'finished');assert.equal(loss.stats.roundWins,0);
}
{
 const g=createGame({arena:0});g.phase='combat';const [p,cpu]=g.actors;p.x=-6;p.z=-3.8;cpu.x=-6;cpu.z=3.8;assert(!clearLine(g,p,cpu));advance(g,9);assert(clearLine(g,p,cpu),'CPU walks around the pillar');assert(distance(p,cpu)<3.2,'CPU reaches a rival on the far side of cover');
}
{
 const g=createGame({mode:'survival'});g.phase='combat';g.time=.001;g.actors[1].hp=1;tick(g,{},.01);assert.equal(g.phase,'finished');assert(!g.result.won,'survival requires clearing every rival, not waiting with more health');assert.equal(g.stats.roundWins,0);assert.equal(g.result.reason,'time');
}
// Run full, unmodified CPU matches on every arena and weapon. The policy uses
// the same movement/attack inputs as a player, with no forced damage or wins.
let wins=0,matches=0;
for(let arena=0;arena<3;arena++)for(const w of WEAPONS){
 const g=createGame({arena,weapon:w.id,seed:190+arena});const play=g=>{const p=g.actors[0],e=nearestEnemy(g,p);if(!e)return {};const d=distance(p,e),yaw=angle(e.x-p.x,e.z-p.z);return {yaw,x:d>w.reach*.73?Math.sin(yaw):0,z:d>w.reach*.73?-Math.cos(yaw):0,light:true}};
 for(let round=0;round<8&&g.phase!=='finished';round++){advance(g,100,play);assert(['round-end','finished'].includes(g.phase));if(g.phase==='round-end')nextRound(g)}
 assert.equal(g.phase,'finished');assert(g.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)&&a.hp>=0&&a.hp<=100&&a.stamina>=0&&a.stamina<=100));if(g.result.won)wins++;matches++;
}
assert(wins>=10,'Rookie is approachable with every weapon family');
for(const difficulty of ['rookie','pro']){const g=createGame({mode:'teams',difficulty,seed:74});advance(g,96,gg=>{const p=gg.actors[0],e=nearestEnemy(gg,p);return e?{yaw:angle(e.x-p.x,e.z-p.z),light:true}:{}});assert(['round-end','finished'].includes(g.phase));assert(g.actors.some(a=>!a.alive),'CPU teammates and rivals battle independently');}
console.log(`Battle Arena passed: all six weapons and three arenas, ${wins}/${matches} Rookie policy match wins, CPU teams, reach/facing, parries, guard breaks, stamina, dodges, collisions, cover, countdowns, first-to-two rounds, five survival waves, frozen results and coin deduplication.`);
