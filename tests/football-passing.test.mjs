import assert from 'node:assert/strict';
import {createGame,lineup,snap,step,throwPass,passRead,passPosition,direction} from '../public/games/touchdown-rush/rules.js';
import {makeRoom,readyPlayer,tickRoom,event,encodeRoom,publicRoom,safeInput} from '../server/matches.js';

const advance=(g,seconds,dt=1/120)=>{for(let t=0;t<seconds;t+=dt)step(g,()=>({}),dt);};
function flight(team=0,scenario='ground',game=null,release=null){
 // Isolate flight/eligibility from optional player drops and speed traits.
 const g=game||createGame('pro',{playerTraits:false});g.multiplayer=true;g.statsByTeam??=[g.stats,{passes:0,tackles:0,touchdowns:0}];g.offense=team;g.line=0;g.goal=direction(team)*10;lineup(g);assert(snap(g,'deep'));
 if(release)release();else assert(throwPass(g,team*11+1));assert.equal(g.phase,'flight');
 const d=direction(team),b=g.ball,r=g.actors[team*11+1],def=g.actors[(1-team)*11+8];
 for(const a of g.actors){a.x=24;a.z=-d*45;a.blocking=a.blockedBy=null;}
 Object.assign(b,{from:{x:0,z:0},to:{x:scenario==='bounds'?34:0,z:d*18},idealTo:{x:0,z:d*18},duration:1,elapsed:0,arc:scenario==='high'?10:1.7,pressure:0,spread:0,x:0,y:1.65,z:0});
 g.controls[team]=r.id;g.controls[1-team]=def.id;g.control=g.controls[0];
 if(['catch','otherReceiver'].includes(scenario)){const winner=scenario==='catch'?r:g.actors[team*11+2];winner.x=0;winner.z=d*18;g.controls[team]=winner.id;}
 if(['pick','breakup','high'].includes(scenario)){def.x=0;def.z=d*12;}
 if(scenario==='breakup'){r.x=0;r.z=d*12;}
 if(scenario==='ineligible'){const lineman=g.actors[team*11+6];lineman.x=0;lineman.z=d*18;g.controls[team]=lineman.id;}
 if(scenario==='touchback'){b.from.z=d*40;b.to.z=d*58;def.x=0;def.z=d*52;}
 g.control=g.controls[0];return {g,b,r,def,d};
}
const finish=(g,dt)=>{for(let n=0;n<1000&&g.phase==='flight';n++)step(g,()=>({}),dt);assert.notEqual(g.phase,'flight');};

for(const team of [0,1])for(const dt of [1/120,1/30,.2])for(const scenario of ['ground','bounds','catch','otherReceiver','pick','breakup','high','ineligible','touchback']){
 const {g,b,r,def,d}=flight(team,scenario);finish(g,dt);const result=g.passResult;assert(result,'every resolved throw has a visible result');assert.deepEqual(g.scores,[0,0]);
 if(['catch','otherReceiver'].includes(scenario)){
  assert.equal(result.kind,'complete');assert.equal(g.phase,'live');assert.equal(g.carrier,team*11+(scenario==='catch'?1:2));assert.equal(g.statsByTeam[team].passes,1);assert.equal(g.controls[team],g.carrier);
 }else if(['pick','touchback'].includes(scenario)){
  assert.equal(result.kind,'interception');assert.equal(g.carrier,def.id);assert.equal(result.defender,def.id);assert.equal(g.statsByTeam[team].interceptionsThrown,1);assert.equal(g.statsByTeam[1-team].interceptions,1);assert.equal(g.nextOffense,1-team);assert.equal(g.nextDown,1);assert(b.elapsed<b.duration,'passing-lane interception happens before the endpoint');
  const spot=scenario==='touchback'?d*30:def.z;assert.equal(g.nextLine,spot);assert.equal(g.nextGoal,spot-d*10);
 }else{
  assert.equal(result.kind,'incomplete',`${team} ${dt} ${scenario}`);assert.equal(g.phase,'dead');assert.equal(g.nextLine,g.line,'incompletion gains no yards');assert.equal(g.nextDown,2);assert.equal(g.nextOffense,team);assert.equal(g.statsByTeam[team].incompletions,1);assert.equal(g.statsByTeam[team].passes,0);
  if(scenario==='breakup'){assert.equal(result.cause,'brokenUp');assert.equal(g.statsByTeam[1-team].interceptions||0,0,'knocking the ball away is not a catch');}
  if(scenario==='bounds')assert.equal(result.cause,'bounds');
 }
 assert.equal(g.statsByTeam[team].passAttempts,1);const recorded=JSON.stringify(g.statsByTeam);step(g,()=>({}),.01);assert.equal(JSON.stringify(g.statsByTeam),recorded,'outcomes cannot count twice');assert(g.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));
}

for(const team of [0,1]){
 const {g}=flight(team,'ground');g.down=4;finish(g,1/120);assert.equal(g.nextOffense,1-team);assert.equal(g.nextDown,1);assert(g.event.includes('INCOMPLETE'));assert(g.event.includes('TURNOVER'));advance(g,2.6);assert.equal(g.offense,1-team);assert.equal(g.line,0);assert.equal(g.passResult,null,'the next drive clears the previous result');
 const pick=flight(team,'pick');finish(pick.g,1/120);const spot=pick.g.nextLine;advance(pick.g,2.6);assert.equal(pick.g.offense,1-team);assert.equal(pick.g.line,spot);assert.equal(pick.g.down,1);
}

// Open stationary passes stay accurate. Pressure and motion introduce recorded,
// repeatable error; saved matches do not reroll the throw between ticks.
function accuracy({moving=0,pressure=false}={}){
 const g=createGame('pro');snap(g,'slant');for(const a of g.actors.filter(a=>a.team===1)){a.x=25;a.z=-45;}const q=g.actors[0];q.moving=moving;
 if(pressure){g.actors[11].x=q.x+1;g.actors[11].z=q.z;}
 const read=passRead(g,1);assert(throwPass(g,1));return {g,read};
}
const open=accuracy(),moving=accuracy({moving:8}),rushed=accuracy({pressure:true}),again=accuracy({pressure:true});
assert.equal(open.g.ball.spread,0);assert.deepEqual(open.g.ball.to,open.g.ball.idealTo);assert(moving.g.ball.spread>0);assert(rushed.g.ball.spread>moving.g.ball.spread);assert(rushed.read.pressure>.7);assert.deepEqual(rushed.g.ball.to,again.g.ball.to);assert.notDeepEqual(rushed.g.ball.to,rushed.g.ball.idealTo);
assert.equal(passPosition(open.g.ball,0).y,1.65);assert(Math.abs(passPosition(open.g.ball,1).y)<1e-6,'uncaught passes actually descend to the ground');

// Both friends receive the same outcome with their own actor/team IDs and stats.
for(const team of [0,1])for(const scenario of ['ground','breakup','pick']){
 let room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');readyPlayer(room,'a',{difficulty:'pro'},10000);readyPlayer(room,'b',{},10000);room.players.forEach(p=>{p.seen=room.startAt;p.input=safeInput({},room.game);});tickRoom(room,room.startAt);
 flight(team,scenario,room.match,()=>{const selected=room.match.selected;event(room,1-team,'target',{target:5},room.updatedAt);assert.equal(room.match.selected,selected,'opponents cannot change your pass target');event(room,team,'action',{},room.updatedAt);});
 for(let i=0;i<20&&room.match.phase==='flight';i++){const now=room.updatedAt+100;room.players.forEach(p=>p.seen=now);tickRoom(room,now);room=JSON.parse(encodeRoom(room));}
 const own=publicRoom(room,team?'b':'a').match,other=publicRoom(room,team?'a':'b').match;
 assert.equal(own.passResult.kind,scenario==='pick'?'interception':'incomplete');assert.equal(other.passResult.kind,own.passResult.kind);assert.equal(own.passResult.fromTeam,0);assert.equal(other.passResult.fromTeam,1);assert.equal(own.stats.passAttempts,1);assert(!room.celebration,'a pass outcome is not a touchdown celebration');
 if(scenario==='pick'){assert.equal(own.passResult.defender,19);assert.equal(other.passResult.defender,8);assert.equal(own.stats.interceptionsThrown,1);assert.equal(other.stats.interceptions,1);}
 else assert.equal(own.stats.incompletions,1);
}
console.log('Passing passed: completions, ground/out-of-bounds misses, passing-lane interceptions, breakups, height/reach, ineligible players, both directions and three step sizes, fourth downs, touchbacks, deterministic accuracy, one-time stats and serialized friend outcomes.');
