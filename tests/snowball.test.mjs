import assert from 'node:assert/strict';
import {ARENAS,MODES,createGame,tick,nextRound,throwBall,updateBalls,aimAt,pack,dodge,blocked,clearLine,findPath,moveActor} from '../public/games/snowball-showdown/rules.js';
import {createCoinRun,readWallet,transactWallet} from '../public/economy/wallet.js';
import {award} from '../public/economy/rules.js';
const advance=(g,seconds,input={})=>{for(let i=0;i<Math.ceil(seconds*120);i++)tick(g,input,1/120)};
function duel(){const g=createGame({mode:'duel'});g.phase='active';g.map={...g.map,obstacles:[]};for(const p of g.actors){p.x=0;p.z=p.team?-5:5;p.shield=0;p.cooldown=0}return g}
function shoot(g,shooter=g.actors[0],target=g.actors[1]){shooter.cooldown=0;shooter.pack=0;shooter.ammo=6;const aim=aimAt(shooter,target);assert(throwBall(g,shooter,aim.yaw,aim.pitch));for(let i=0;i<80&&g.balls.length;i++)updateBalls(g,1/120)}
for(let arena=0;arena<3;arena++)for(const mode of MODES){const g=createGame({arena,mode:mode.id});assert.equal(g.actors.length,mode.size*2);assert.equal(g.actors.filter(p=>p.team===0).length,mode.size);for(const p of g.actors)assert(!blocked(g,p.x,p.z));assert.equal(g.phase,'countdown');assert(!throwBall(g,g.actors[0]));advance(g,3.1);assert.equal(g.phase,'active');assert.equal(g.map.id,ARENAS[arena].id)}
{
 const g=duel(),p=g.actors[0],enemy=g.actors[1];shoot(g);assert.equal(enemy.hp,2);assert.equal(g.stats.hits,1);shoot(g);shoot(g);assert.equal(enemy.alive,false);assert.deepEqual(g.score,[1,0]);assert.equal(g.stats.kos,1);assert.equal(g.stats.roundWins,0);advance(g,3.1);assert(enemy.alive);assert.equal(enemy.hp,3);assert(enemy.shield>0);assert(enemy.z < -16.5);
}
{
 const g=duel(),p=g.actors[0],enemy=g.actors[1];g.map={...g.map,obstacles:[[0,0,4,2,2]]};assert(!clearLine(g,p,enemy));shoot(g);assert.equal(enemy.hp,3);assert.equal(g.stats.hits,0);assert.equal(g.balls.length,0);assert(g.events.some(e=>e.type==='splash'));g.map.obstacles=[];enemy.shield=1;shoot(g);assert.equal(enemy.hp,3);enemy.shield=0;enemy.dodge=.3;shoot(g);assert.equal(enemy.hp,3);
}
{
 const g=duel();g.actors[1].team=0;shoot(g);assert.equal(g.actors[1].hp,3,'no friendly fire');g.actors[1].team=1;g.actors[1].x=5;const p=g.actors[0];p.cooldown=0;assert(throwBall(g,p,0,0));for(let i=0;i<360;i++)updateBalls(g,1/120);assert.equal(g.actors[1].hp,3,'off-target throws miss');assert.equal(g.balls.length,0);
}
{
 const g=duel(),p=g.actors[0];assert(throwBall(g,p));assert(!throwBall(g,p),'throw cooldown');assert.equal(p.ammo,5);assert(pack(g,p));assert(!throwBall(g,p),'packing prevents throws');advance(g,1.6);assert.equal(p.ammo,6);assert.equal(p.pack,0);assert(!pack(g,p));p.ammo=0;p.cooldown=0;assert(!throwBall(g,p));assert(p.pack>0,'empty throw starts packing');
 assert(dodge(g,p,1,0));assert(!dodge(g,p));const x=p.x;advance(g,.2);assert(p.x>x+1);assert(p.dodgeCooldown>0);advance(g,2.4);assert.equal(p.dodgeCooldown,0);assert(dodge(g,p));
}
{
 const g=createGame(),p=g.actors[0];g.phase='active';p.x=0;p.z=14;g.map={...g.map,obstacles:[[0,12,3,1,.65]]};moveActor(g,p,0,-2);assert.equal(p.z,14);p.y=1;moveActor(g,p,0,-2);assert.equal(p.z,12);p.vy=-1;p.onGround=false;advance(g,.24);assert.equal(p.y,.65);assert(p.onGround,'land on a low snow wall');
 const path=findPath(g,{x:0,z:16},{x:0,z:8});assert(path.length>0);for(const n of path)assert(!blocked(g,n.x,n.z,.65));
}
{
 const g=duel();g.score=[3,0];tick(g,{},1/120);assert.equal(g.phase,'result');assert.equal(g.stats.roundWins,1);const frozen=JSON.stringify(g);advance(g,5,{throw:true});assert.equal(JSON.stringify(g),frozen,'results freeze simulation');assert(nextRound(g));assert.equal(g.round,2);assert.deepEqual(g.score,[0,0]);assert.equal(g.stats.roundWins,1);g.phase='active';g.score=[3,0];tick(g,{},1/120);assert.equal(g.phase,'finished');assert.equal(g.stats.roundWins,2);assert(!nextRound(g));
 const cpu=duel();cpu.score=[0,3];tick(cpu,{},1/120);assert.equal(cpu.stats.roundWins,0);assert(!cpu.result.won);
 const tie=duel();tie.remaining=.01;advance(tie,.02);assert(tie.sudden);tie.score=[0,1];tick(tie,{},1/120);assert.equal(tie.phase,'result');assert(!tie.result.won);
 const clock=duel();clock.score=[1,0];clock.remaining=.01;advance(clock,.02);assert(clock.result.won);
}
{
 // A player who aims and uses open lanes can win on every arena; CPUs move,
 // navigate cover, throw, repack, respawn, and finish real timed rounds.
 let hits=0;for(let arena=0;arena<3;arena++)for(const difficulty of ['easy','pro'])for(const mode of MODES){const g=createGame({arena,mode:mode.id,difficulty,seed:arena+41});for(let i=0;i<120*100&&['countdown','active'].includes(g.phase);i++){const p=g.actors[0],targets=g.actors.filter(a=>a.team!==p.team&&a.alive).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)),target=targets.find(a=>clearLine(g,p,a))||targets[0],a=target?aimAt(p,target):{yaw:0,pitch:0},dist=target?Math.hypot(p.x-target.x,p.z-target.z):0;const forward=target&&dist>7?{x:(target.x-p.x)/dist,z:(target.z-p.z)/dist}:{x:Math.sin(i*.005),z:0};tick(g,{...a,...forward,throw:true,assist:true,pack:p.ammo===0},1/120)}assert(['result','finished'].includes(g.phase),`${arena} ${mode.id} ${difficulty} ends`);assert(g.events.some(e=>e.type==='round-end'));assert(g.actors.slice(1).some(p=>p.kos>0||p.hits>0),'CPU players make hits');assert(g.actors.every(p=>[p.x,p.y,p.z,p.vx,p.vz].every(Number.isFinite)));assert(g.actors.every(p=>Math.abs(p.x)<=18.6&&Math.abs(p.z)<=18.6));hits+=g.stats.hits;}assert(hits>20);
}
{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},run=createCoinRun('snowball-showdown',{newId:()=> 'snow-test',write:event=>transactWallet(w=>award(w,event),{storage,notify:()=>{}})});run.begin();await run.counter('round-win',1);await run.counter('round-win',1);await run.counter('round-win',2);assert.equal(readWallet(storage).balance,2,'only new winning rounds award coins');
}
console.log('Snowball physics, cover, friendly fire, shields, dodges, packing, jump landings, CPU navigation, all 18 arena/mode/difficulty combinations, rounds and coins passed.');
