import assert from 'node:assert/strict';
import {test} from 'node:test';
import {LEVELS,TILE} from '../public/games/outpost-maze/levels.js';
import {CREDIT_PICKUP,restoreProfile,startLevel,buyGear,advance,canStand,aimTarget,GEAR} from '../public/games/outpost-maze/rules.js';

const quiet={x:0,z:0,jump:false,fire:false};
const find=(level,marker)=>level.map.flatMap((row,z)=>[...row].flatMap((char,x)=>char===marker?[{x,z}]:[]));
function path(level,start,end){
 const queue=[start],seen=new Set([start.x+','+start.z]);
 for(let i=0;i<queue.length;i++){
  const point=queue[i];
  if(point.x===end.x&&point.z===end.z)return Array.from((function*(){for(let p=point;p;p=p.previous)yield p;})()).reverse();
  for(const [dx,dz] of [[0,1],[0,-1],[-1,0],[1,0]]){
   const x=point.x+dx,z=point.z+dz,key=x+','+z;
   if(!level.map[z]?.[x]||level.map[z][x]==='#'||seen.has(key))continue;
   seen.add(key);
   queue.push({x,z,previous:point});
  }
 }
 throw Error('Maze route is blocked');
}
function walk(game,goal){
 for(let i=0;i<80;i++){
  const dx=goal.x*TILE-game.player.x,dz=goal.z*TILE-game.player.z;
  if(Math.hypot(dx,dz)<.17||game.finished)return;
  const air=game.barriers.some(b=>
   Math.abs(b.x-game.player.x)<b.halfX+.8&&Math.abs(b.z-game.player.z)<b.halfZ+.8);
  advance(game,1/60,{x:dx,z:dz,jump:air,fire:false});
 }
 throw Error('Movement stopped before '+JSON.stringify(goal));
}

test('all three mazes play from entrance through chip to exit and pay once',()=>{
 const profile=restoreProfile(null);
 for(const [index,level] of LEVELS.entries()){
  const game=startLevel(profile,index,'maze-'+index);
  assert(game);
  assert(level.map.every(row=>row.length===level.map[0].length));
  for(const tile of ['S','K','C','E'])assert.equal(find(level,tile).length,1);
  assert(game.guards.length>=3);
  assert(game.barriers.length);
  for(const guard of game.guards)assert(guard.route.every(({x,z})=>level.map[Math.round(z/TILE)][Math.round(x/TILE)]!=='#'));
  // Keep patrol damage out of the route test. Combat is exercised independently.
  game.guards.length=0;
  game.hazards.length=0;
  const [start]=find(level,'S'),[chip]=find(level,'K'),[exit]=find(level,'E'),[checkpoint]=find(level,'C');
  const startingCredits=profile.credits;
  for(const stop of path(level,start,checkpoint).slice(1))walk(game,stop);
  assert(game.run.checkpoint);
  for(const stop of path(level,checkpoint,chip).slice(1))walk(game,stop);
  assert(game.run.chip);
  for(const stop of path(level,chip,exit).slice(1))walk(game,stop);
  assert(game.finished);
  assert.equal(profile.credits,startingCredits+game.run.collected.length*CREDIT_PICKUP+level.payout);
  assert.equal(profile.active,null);
  assert(profile.completed[index]>0);
  const balance=profile.credits;
  advance(game,.1,quiet);
  assert.equal(profile.credits,balance);
 }
 assert.equal(profile.unlocked,2);
 assert.deepEqual(profile.pendingFinishes,['maze-0','maze-1','maze-2']);
});

test('solid walls, cheap gear, checkpoints, and a locked exit behave correctly',()=>{
 const profile=restoreProfile(null);
 assert.equal(startLevel(profile,1,'locked'),null);
 const game=startLevel(profile,0,'saved');
 game.guards.length=0;
 const barrier=game.barriers[0];
 assert(!canStand(game,barrier.x,barrier.z,0));
 assert(canStand(game,barrier.x,barrier.z,1.1));
 assert(!canStand(game,0,0,2));
 Object.assign(game.player,game.exit);
 advance(game,.02,quiet);
 assert(!game.finished);
 assert(game.notice.includes('chip'));
 Object.assign(game.player,game.checkpoint);
 advance(game,.02,quiet);
 assert(game.run.checkpoint);
 Object.assign(game.player,game.tokens[0]);
 advance(game,.02,quiet);
 assert.equal(profile.credits,CREDIT_PICKUP);
 assert(!buyGear(profile,'bubble'));
 const restored=restoreProfile(JSON.parse(JSON.stringify(profile)));
 const continued=startLevel(restored,0,'ignored');
 assert.equal(continued.run.id,'saved');
 assert.equal(continued.player.x,continued.checkpoint.x);
 assert.equal(continued.player.z,continued.checkpoint.z);
 assert.deepEqual(continued.run.collected,[0]);
 restored.credits=140;
 assert(buyGear(restored,'bubble'));
 assert(buyGear(restored,'bubble'));
 assert.equal(restored.credits,0);
 assert.deepEqual(restored.owned,['pulse','bubble']);
 assert.equal(restoreProfile(restored).equipped,'bubble');
});

test('patrolling soldiers notice players and a tagger stuns only with a clear shot',()=>{
 const profile=restoreProfile(null),game=startLevel(profile,0,'practice');
 const guard=game.guards[0],player=game.player;
 game.guards=[guard];
 guard.route=[guard];
 Object.assign(guard,{x:TILE,z:TILE*2,cooldown:0,angle:Math.PI});
 Object.assign(player,{x:TILE,z:TILE,angle:0,immune:0});
 const target=aimTarget(game,GEAR[0]);
 assert.equal(target,guard);
 for(let i=0;i<48;i++)advance(game,1/60,quiet);
 assert.equal(player.hp,2);
 advance(game,.02,{...quiet,fire:true});
 assert(guard.stun>1);
 assert.equal(guard.alert,0);
 Object.assign(guard,{x:TILE*3,z:TILE});
 Object.assign(player,{x:TILE,z:TILE,angle:Math.PI/2,cooldown:0});
 assert.equal(aimTarget(game,GEAR[1]),undefined,'the wall blocks a shot');
 advance(game,.02,{...quiet,fire:true});
 assert(game.notice.includes('clear route'));
});
