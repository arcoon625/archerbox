import assert from 'node:assert/strict';
import {createGame,tick,spawn,roofX,laserZ,clamp,respawn,grappleTarget,medal} from '../public/games/ninja-rooftops/rules.js';
const run=(g,input,seconds)=>{for(let n=0;n<Math.ceil(seconds*120);n++)tick(g,input,1/120);};
// A controller plays actual movement, jumps, wall kicks and rope physics. It
// never teleports to the finish, so unreachable sections fail this test.
for(let index=0;index<3;index++)for(const difficulty of ['easy','pro']){
 const g=createGame(index,2,difficulty);assert.equal(g.course.roofs.length,10);assert.equal(g.course.stars.length,20);assert.equal(g.course.roofs.filter(r=>r.checkpoint).length,4);
 const visited=new Set([0]);
 for(let n=0;n<18000&&g.phase==='playing';n++){
  const p=g.player,c=g.course,current=c.roofs[g.furthest],next=c.roofs[Math.min(9,g.furthest+1)],actual=roofX(next,g.time),tx=p.onGround?clamp(actual,roofX(current,g.time)-current.w/2+.8,roofX(current,g.time)+current.w/2-.8):actual,atFinish=g.furthest===9;
  let x=clamp((tx-p.x)*1.4,-1,1),z=atFinish&&p.z< -171?0:-1;
  if(p.onGround&&Math.abs(tx-p.x)>1&&p.z>current.z-current.d/2+2.5)z=0;
  let jump=p.onGround&&p.z<current.z-current.d/2+1.3&&!atFinish||p.wallGrace>0&&!p.onGround;
  for(const l of c.lasers)if(l.roof===g.furthest&&p.onGround&&Math.abs(p.z-laserZ(l,c,g.time))<3)jump=true;
  let grapple=g.furthest===4;if(p.grapple&&p.z< -86.5)jump=true;if(p.z< -87)grapple=false;
  tick(g,{x,z,sprint:true,jump,grapple},1/120);visited.add(g.furthest);
 }
 assert.equal(g.phase,'finished','course '+index+' '+difficulty+' is completable');assert.equal(visited.size,10);assert(g.wallJumps>0);assert(g.swings>0);assert.equal(g.checkpoint,8);assert(g.elapsed>15&&g.elapsed<150);assert.equal(g.collected.length,new Set(g.collected).size);const frozen=JSON.stringify(g);tick(g,{x:1,jump:true},.02);assert.equal(JSON.stringify(g),frozen,'a completed run stays final');
}
const idle=createGame();run(idle,{},2);assert.equal(idle.player.y,20);assert.equal(idle.player.onGround,true);assert.equal(idle.falls,0);
const walk=createGame(),sprint=createGame();run(walk,{z:-1},.5);run(sprint,{z:-1,sprint:true},.5);assert(sprint.player.z<walk.player.z);
const jump=createGame();run(jump,{jump:true},.25);assert(jump.player.y>21);run(jump,{jump:true},1);assert.equal(jump.player.onGround,true);assert.equal(jump.player.y,20,'holding jump does not repeat');run(jump,{},.05);tick(jump,{jump:true},1/120);assert(jump.player.vy>0);
const wall=createGame();wall.player=spawn(wall.course.roofs[3]);wall.furthest=3;wall.checkpoint=3;
for(let n=0;n<600&&wall.furthest<4;n++){const p=wall.player;tick(wall,{z:-1,sprint:true,jump:p.onGround&&p.z< -53||p.wallGrace>0},1/120);}assert.equal(wall.furthest,4);assert(wall.wallJumps>=1);assert.equal(wall.falls,0);
const rope=createGame();rope.player=spawn(rope.course.roofs[4]);rope.furthest=4;rope.checkpoint=3;assert(grappleTarget(rope));let observed=false;
for(let n=0;n<300;n++){tick(rope,{z:-1,sprint:true,grapple:true},1/120);const p=rope.player;if(p.grapple){observed=true;const a=rope.course.anchors[p.grapple.anchor];assert(Math.hypot(p.x-a.x,p.y+1-a.y,p.z-a.z)<=p.grapple.length+.02,'rope length constrains the swing');}}
assert(observed);tick(rope,{jump:true,grapple:true,z:-1},1/120);assert.equal(rope.player.grapple,null);assert(rope.player.vy>0,'Space releases the rope with an upward leap');
const carry=createGame();carry.checkpoint=5;carry.furthest=7;carry.player=spawn(carry.course.roofs[7],carry.time);const local=carry.player.x-roofX(carry.course.roofs[7],carry.time);run(carry,{},1);assert.equal(carry.player.ground,7);assert(Math.abs(carry.player.x-roofX(carry.course.roofs[7],carry.time)-local)<.02,'moving platforms carry the player');
const hit=createGame();hit.checkpoint=3;hit.furthest=6;const laser=hit.course.lasers[1],roof=hit.course.roofs[6];hit.player=spawn(roof);hit.player.z=laserZ(laser,hit.course,0);tick(hit,{},1/120);assert.equal(hit.falls,1);assert.equal(hit.player.ground,3);assert.equal(hit.furthest,3,'fall progress returns to the saved checkpoint');
const stars=createGame();const star=stars.course.stars[0];stars.player.x=star.x;stars.player.z=star.z;run(stars,{},.1);assert(stars.collected.includes(star.id));const count=stars.collected.length;run(stars,{},.5);assert.equal(stars.collected.length,count);respawn(stars,true);assert.equal(stars.collected.length,count);assert.equal(stars.falls,1);
const fall=createGame();fall.checkpoint=5;fall.furthest=6;fall.player.y=5;tick(fall,{},1/120);assert.equal(fall.player.ground,5);assert.equal(fall.falls,1);assert.equal(fall.player.grapple,null);
const fakeFinish=createGame();fakeFinish.player=spawn(fakeFinish.course.roofs[9]);fakeFinish.player.z=-171;tick(fakeFinish,{},1/120);assert.equal(fakeFinish.phase,'playing','the last checkpoint is required');
assert.equal(medal({...createGame(),elapsed:70,falls:0}),'GOLD');assert.equal(medal({...createGame(),elapsed:120,falls:4}),'SILVER');assert.equal(medal({...createGame(),elapsed:190,falls:8}),'BRONZE');
console.log('Ninja Rooftops passed: six complete courses/difficulties with all rooftops, ground/jump/sprint, wall kicks, constrained grapple and leap-off, moving-platform carry, laser/fall checkpoints, unique stars, medals and frozen finish.');
