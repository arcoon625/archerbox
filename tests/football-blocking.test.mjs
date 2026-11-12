import assert from 'node:assert/strict';
import {createGame,lineup,snap,step,action,direction,distance,RUN_PLAYS} from '../public/games/touchdown-rush/rules.js';
import {makeRoom,readyPlayer,tickRoom,event,encodeRoom,publicRoom,safeInput} from '../server/matches.js';

// A human defender cannot sprint through a stationary human blocker, even
// after contact is shed or when the simulation uses a larger time step.
for(const team of [0,1])for(const dt of [1/120,1/30,.2]){
 const g=createGame('pro');g.multiplayer=true;g.statsByTeam=[g.stats,{passes:0,tackles:0,touchdowns:0}];g.offense=team;g.line=0;lineup(g);snap(g,'deep');
 const d=direction(team),b=g.actors[team*11+6],def=g.actors[(1-team)*11],carrier=g.actors[g.carrier];
 for(const a of g.actors){a.x=24;a.z=d*(a.team===team?-45:45);}
 b.x=def.x=carrier.x=0;b.z=0;def.z=d*2;carrier.z=-d*5;g.controls[team]=b.id;g.controls[1-team]=def.id;g.control=g.controls[0];
 let sawHold=false,sawShed=false;
 for(let t=0;t<3.2;t+=dt){step(g,seat=>seat===team?{}:{z:-d,sprint:true},dt);assert.equal(g.phase,'live');assert(distance(b,def)>=1.079,'solid bodies never overlap');assert((def.z-b.z)*d>1.07,'defender cannot cross through the blocker');sawHold ||= def.blockedBy===b.id;sawShed ||= def.shedBlock;}
 assert(sawHold&&sawShed,'engagements hold, then expire');
 carrier.x=0;carrier.z=-d*.7;carrier.juke=0;def.cooldown=0;action(g,1-team);assert.equal(g.phase,'live','no tackle through a blocker even within tackle range');
 // A defender who gets around the block can still make a normal tackle.
 def.x=2.8;def.z=0;def.cooldown=0;step(g,()=>({}),.01);carrier.x=2.8;carrier.z=-d*.5;action(g,1-team);assert.equal(g.phase,'dead');assert.equal(g.statsByTeam[1-team].tackles,1);
}

// A normal run can earn a few yards, without a guaranteed first down.
for(const play of ['run','sweepLeft','sweepRight']){
 const g=createGame('pro');assert(snap(g,play));assert.equal(g.carrier,5);assert.equal(g.control,5);assert.equal(g.scores[0],0);assert(g.actors[5].z>g.line,'handoff stays behind the line');
 let engaged=0;
 for(let t=0;t<12&&g.phase==='live';t+=1/120){const a=g.actors[g.carrier],lane=RUN_PLAYS[play].lane;step(g,{x:Math.abs(a.x-lane)>.2?Math.sign(lane-a.x)*.6:0,z:-1,sprint:true},1/120);engaged=Math.max(engaged,g.actors.filter(a=>a.blocking!=null).length);}
 const gain=g.line-g.actors[g.carrier].z;assert(gain>0&&gain<8,'ordinary runs gain yards without guaranteed first downs');assert(engaged>=2,'several teammates engage separate defenders');assert.equal(g.scores[0],0,'a run is not an automatic touchdown');assert.equal(g.phase,'dead');assert.equal(g.nextLine,g.actors[g.carrier].z);assert(g.actors[5].stamina<100);
}

function contact({team=0,mode='pro',play='deep',blocker=6,defender=0}={}){
 const g=createGame(mode);g.multiplayer=true;g.statsByTeam=[g.stats,{passes:0,tackles:0,touchdowns:0}];g.offense=team;g.line=0;lineup(g);snap(g,play);g.playTime=1;
 const d=direction(team),b=g.actors[team*11+blocker],a=g.actors[(1-team)*11+defender],runner=g.actors[g.carrier];
 for(const actor of g.actors){actor.x=24;actor.z=d*(actor.team===team?-45:45);}
 b.x=a.x=runner.x=0;b.z=0;a.z=d*1.2;runner.z=-d*8;runner.juke=0;b.yaw=d<0?0:Math.PI;a.yaw=d<0?Math.PI:0;
 g.controls[team]=b.id;g.controls[1-team]=a.id;g.control=g.controls[0];return {g,b,a,d,runner};
}
for(const team of [0,1]){
 // A player can sidestep DURING contact, rather than waiting while frozen.
 const {g,b,a}=contact({team});step(g,()=>({}),.01);assert.equal(a.blockedBy,b.id);
 const start=a.x;for(let n=0;n<30;n++)step(g,seat=>seat===team?{}:{x:1},.01);
 assert(a.x>start+.3,'engaged defenders retain lateral movement');
 // Reaching a runner on the defender's side of the block is a legal tackle.
 const reach=contact({team});step(reach.g,()=>({}),.01);assert.equal(reach.a.blockedBy,reach.b.id);reach.runner.x=reach.a.x+.7;reach.runner.z=reach.a.z;reach.a.cooldown=0;
 action(reach.g,1-team);assert.equal(reach.g.phase,'dead','a block is not a force field around the runner');
 for(const type of ['behind-blocker','defender-back']){
  const c=contact({team});if(type==='behind-blocker')c.b.yaw+=Math.PI;else c.a.yaw+=Math.PI;
  step(c.g,()=>({}),.01);assert.equal(c.a.blockedBy,null,'no automatic engagement from a player’s back');
 }
 const weak=contact({team,play:'run',blocker:1,defender:1}),strong=contact({team,play:'run',blocker:6,defender:1});
 step(weak.g,()=>({}),.01);step(strong.g,()=>({}),.01);assert(weak.a.blockRemaining<strong.a.blockRemaining,'receivers sustain less contact than linemen');
 const old=weak.b.z;step(weak.g,()=>({}),.1);assert((weak.b.z-old)*weak.d<0,'a defensive tackle pushes a receiver back');
 const times=[];for(const mode of ['rookie','pro','allstar']){const c=contact({team,mode});step(c.g,()=>({}),.01);times.push(c.a.blockRemaining);}
 assert(times[0]>times[1]&&times[1]>times[2],'defensive wins get quicker at higher difficulty');
}

// The server accepts both sweeps for either friend and preserves block links
// across JSON persistence and the guest's remapped actor IDs.
for(const team of [0,1])for(const play of ['sweepLeft','sweepRight']){
 let room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');readyPlayer(room,'a',{difficulty:'pro'},10000);readyPlayer(room,'b',{},10000);room.players.forEach(p=>{p.seen=room.startAt;p.input=safeInput({},room.game);});tickRoom(room,room.startAt);
 room.match.offense=team;room.match.line=team?-30:30;lineup(room.match);event(room,1-team,'play',{play});assert.equal(room.match.phase,'ready');event(room,team,'play',{play});assert.equal(room.match.play,play);assert.equal(room.match.controls[team],team*11+5);
 let sawBlock=false;
 for(let i=0;i<8;i++){const now=room.updatedAt+100;room.players.forEach(p=>p.seen=now);tickRoom(room,now);room=JSON.parse(encodeRoom(room));for(const user of ['a','b']){const view=publicRoom(room,user).match;for(const a of view.actors){if(a.blockedBy!=null){sawBlock=true;const b=view.actors[a.blockedBy];assert.equal(b.blocking,a.id);assert.notEqual(b.team,a.team);assert(distance(a,b)>1.07);}if(a.blocking!=null)assert.equal(view.actors[a.blocking].blockedBy,a.id);}}}
 assert(sawBlock);assert(room.match.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));
}
console.log('Football blocking passed: solid bodies, shorter role/angle-dependent contests, movement during contact, reach tackles, defensive pushback, no captures from behind, modest run gains and serialized friend play.');
