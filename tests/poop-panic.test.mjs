import assert from 'node:assert/strict';
import {GOAL,createGame,tick,launch,aimAt,dodge,blocked,clearLine,restoreRecord,recordRun} from '../public/games/poop-panic/rules.js';
import {award,restoreWallet} from '../public/economy/rules.js';
const advance=(g,time,input={})=>{for(let t=0;t<time;t+=1/60)tick(g,input,1/60)};
const active=options=>{const g=createGame(options);advance(g,3.1);assert.equal(g.phase,'active');return g};
{
 const g=createGame();assert(!launch(g));assert.equal(g.stats.throws,0);advance(g,3.1);assert(launch(g,Math.PI,0));assert(!launch(g),'only one player projectile at a time');advance(g,1);assert.equal(g.phase,'lost');assert.equal(g.result.reason,'miss');const time=g.time;advance(g,5);assert.equal(g.time,time);assert.equal(g.stats.kos,0);assert(!recordRun(null,g).unlocked);
}
{
 const g=active();dodge(g,1,0);g.balls.push({id:90,owner:1,x:g.player.x,y:1,z:g.player.z-.1,vx:0,vy:0,vz:10,life:1});tick(g,{},1/60);assert.equal(g.phase,'lost');assert.equal(g.result.reason,'hit','one CPU hit ends the run even during a dodge');
}
{
 const g=active({seed:32});const wallet=restoreWallet(null);
 for(let ko=0;ko<GOAL;ko++){
  while(!g.enemy.alive)tick(g,{});const aim=aimAt(g.player,g.enemy);assert(launch(g,aim.yaw,aim.pitch));let frames=160;while(g.phase==='active'&&g.stats.kos===ko&&frames-->0)tick(g,{});
  assert.equal(g.stats.kos,ko+1,'a real projectile scores knockout '+(ko+1));assert.equal(award(wallet,{game:'poop-panic',event:'knockout',run:'clean-run',progress:g.stats.kos}).amount,1);
  assert.equal(award(wallet,{game:'poop-panic',event:'knockout',run:'clean-run',progress:g.stats.kos}).amount,0,'KO reward cannot repeat');
  if(ko<9){assert.equal(g.phase,'active');assert(!recordRun(null,g).unlocked,'nine or fewer KOs do not unlock the prize')}
 }
 assert.equal(g.phase,'won');const r=recordRun(null,g);assert(r.unlocked&&r.equipped);assert.equal(r.best,10);assert.equal(r.wins,1);assert.equal(wallet.balance,10);assert.deepEqual(restoreRecord(JSON.parse(JSON.stringify(r))),r);assert(restoreRecord(r).equipped);
 const bad=active();launch(bad,Math.PI);advance(bad,1);const after=recordRun(r,bad);assert(after.unlocked&&after.equipped,'the cosmetic persists after a later lost run');assert.equal(after.best,10);assert(!launch(g),'a completed run cannot fire');
}
{
 const g=active({difficulty:'pro'});assert.equal(g.difficulty,'pro');const before=g.player.z;advance(g,.5,{z:-1,sprint:true});assert(g.player.z<before-3);tick(g,{jump:true});assert(g.player.y>0);advance(g,1);assert(g.player.onGround);assert(blocked(-8,3));assert(!clearLine({x:-8,z:7},{x:-8,z:0}));
 const r=restoreRecord({unlocked:false,equipped:true,best:900,wins:-5,bestTime:-1});assert(!r.equipped);assert.equal(r.best,10);assert.equal(r.wins,0);assert.equal(r.bestTime,null);
}
console.log('Poop Panic passed: countdown, strict single-life misses and hits, dodge without invincibility, ten real projectile knockouts, permanent cosmetic unlock, replay-safe coins, movement and cover.');
