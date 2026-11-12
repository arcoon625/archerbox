import assert from 'node:assert/strict';
import {createGame,lineup,snap,step,beginPlaceKick,aimPlaceKick,strikePlaceKick,practicePlaceKicks,kickDistance,direction} from '../public/games/touchdown-rush/rules.js';
import {GOALPOST,KICK_CLEARANCE,kickVelocity,goalCrossing,kickIsGood} from '../public/games/touchdown-rush/kicking.js';
import {makeRoom,readyPlayer,tickRoom,event,encodeRoom,publicRoom,safeInput} from '../server/matches.js';
const advance=(g,seconds)=>{for(let t=0;t<seconds;t+=1/120)step(g,{},1/120);};
const fly=g=>{let t=0;while(g.phase==='placekick-flight'&&t<8){step(g,{},1/120);t+=1/120;}assert.notEqual(g.phase,'placekick-flight');};
const setup=team=>{const g=createGame('pro');g.offense=team;g.line=direction(team)*28;lineup(g);return g;};
const touchdown=g=>{snap(g,'run');g.actors[g.carrier].z=direction(g.offense)*51;step(g,{},1/120);};
for(const team of [0,1]){
 for(const [aim,power,points] of [[0,.8,3],[1,.8,0],[-1,.8,0],[0,.15,0]]){
  const g=setup(team);assert(beginPlaceKick(g));assert.equal(g.placeKick.distance,40);assert.equal(g.scores[team],0);assert(!snap(g,'run'));const clock=g.clock;advance(g,.25);assert.equal(g.clock,clock,'aiming freezes the clock');assert(strikePlaceKick(g,aim,power));assert(!strikePlaceKick(g,aim,power),'a kick cannot launch or score twice');fly(g);assert.equal(g.scores[team],points);assert.equal(g.touchdownSerial||0,0,'field goals never count as touchdowns');assert.equal(g.nextOffense,1-team);
  if(points){assert(g.pendingKickoff);assert.equal(g.event,'FIELD GOAL GOOD!');advance(g,2.6);assert.equal(g.ball.kind,'kickoff');advance(g,3.2);assert.equal(g.offense,1-team);}
  else{assert(!g.pendingKickoff);advance(g,2.6);assert.equal(g.offense,1-team);assert.equal(g.down,1);assert.equal(g.phase,'ready');}
 }
 for(const made of [true,false]){const g=setup(team);touchdown(g);assert.equal(g.scores[team],6);assert(g.pendingTry);assert(!g.ended);advance(g,2.6);assert.equal(g.phase,'placekick-aim');assert.equal(g.placeKick.kind,'extraPoint');assert.equal(g.placeKick.distance,33);strikePlaceKick(g,made?0:1,.8);fly(g);assert.equal(g.scores[team],made?7:6);assert(g.pendingKickoff);assert.equal(g.touchdownSerial,1);advance(g,2.6);assert.equal(g.ball.kind,'kickoff');}
}
{
 const g=createGame();assert.equal(kickDistance(g.line,direction(g.offense)),98);assert(beginPlaceKick(g));strikePlaceKick(g,0,1);fly(g);assert.equal(g.scores[0],0,'out-of-range kicks fall short');
 const blocked=createGame();snap(blocked,'run');assert(!beginPlaceKick(blocked),'cannot turn a ball-carrying run into a field goal');assert(!beginPlaceKick(createGame(),'extraPoint'),'an extra point requires a touchdown');
 const bad=setup(0);beginPlaceKick(bad);aimPlaceKick(bad,Infinity,NaN);assert(Number.isFinite(bad.placeKick.aim)&&Number.isFinite(bad.placeKick.power));aimPlaceKick(bad,999,-999);assert.equal(bad.placeKick.aim,1);assert.equal(bad.placeKick.power,.15);
 for(const d of [-1,1]){const b={from:{x:0,z:d*20},goalZ:d*GOALPOST.z,...kickVelocity(d,0,.8)},cross=goalCrossing(b);assert(Math.abs(cross.z-b.goalZ)<1e-9);assert(cross.y>GOALPOST.crossbar);assert(kickIsGood(b));b.from.x=GOALPOST.halfWidth;assert(!kickIsGood(b),'crossing outside the inner upright fails');}
 const edge={from:{x:0,z:0},goalZ:60,vx:0,vz:20,vy:(GOALPOST.crossbar+KICK_CLEARANCE-.28+4.9*9)/3};assert(!kickIsGood(edge),'a ball touching the crossbar is not a clear kick');edge.vy+=.001;assert(kickIsGood(edge));edge.from.x=GOALPOST.halfWidth-KICK_CLEARANCE+.001;assert(!kickIsGood(edge),'the whole ball must pass inside the upright');
}
// All scoring paths finish a 21-point game or settle an expired-clock result.
{
 const g=setup(0);g.scores[0]=18;beginPlaceKick(g);strikePlaceKick(g,0,.8);fly(g);assert.equal(g.scores[0],21);assert(g.ended);
 const h=setup(0);h.scores[0]=14;touchdown(h);assert.equal(h.scores[0],20);assert(!h.ended);advance(h,2.6);strikePlaceKick(h,0,.8);fly(h);assert.equal(h.scores[0],21);assert(h.ended);
 const last=setup(0);last.clock=0;last.scores[1]=7;touchdown(last);assert(!last.ended,'the extra point is still available with no time left');advance(last,2.6);strikePlaceKick(last,0,.8);fly(last);assert.deepEqual(last.scores,[7,7]);assert(!last.ended,'a tying extra point goes to overtime');
 const miss=setup(0);miss.clock=0;miss.scores[1]=7;touchdown(miss);advance(miss,2.6);strikePlaceKick(miss,1,.8);fly(miss);assert(miss.ended);assert.equal(miss.scores[0],6);
 const cpu=setup(1);cpu.down=4;advance(cpu,2.1);assert.equal(cpu.phase,'placekick-aim');advance(cpu,1.9);assert.equal(cpu.phase,'placekick-flight');fly(cpu);assert.equal(cpu.scores[1],3);
 const practice=createGame();assert(practicePlaceKicks(practice));for(let i=0;i<8;i++){strikePlaceKick(practice,0,.8);fly(practice);advance(practice,2.6);}assert.equal(practice.scores[0],24);assert(!practice.ended);assert.equal(practice.clock,180);
}
// The server owns aim, scoring, and possession. Guest views preserve world
// directions while remapping their kicker, holder, stats, and scoreboard.
for(const team of [0,1]){
 let room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');readyPlayer(room,'a',{},10000);readyPlayer(room,'b',{},10000);room.players.forEach(p=>{p.seen=room.startAt;p.input=safeInput({},room.game);});tickRoom(room,room.startAt);room.match.offense=team;room.match.line=direction(team)*28;lineup(room.match);
 event(room,1-team,'fieldGoal');assert.equal(room.match.phase,'ready');event(room,team,'fieldGoal');assert.equal(room.match.phase,'placekick-aim');event(room,1-team,'placeKick',{aim:0,power:1});assert.equal(room.match.phase,'placekick-aim');event(room,team,'kickAim',{aim:.02,power:.85});assert.equal(room.match.placeKick.power,.85);
 const guest=publicRoom(room,'b').match;assert.equal(guest.placeKick.kicker,team===1?0:11);assert.equal(guest.actors[guest.placeKick.holder].team,guest.offense);assert.equal(guest.placeKick.direction,direction(team));
 event(room,team,'placeKick',{aim:0,power:.85});for(let i=0;i<40&&room.match.phase==='placekick-flight';i++){const now=room.updatedAt+100;room.players.forEach(p=>p.seen=now);tickRoom(room,now);room=JSON.parse(encodeRoom(room));}assert.equal(room.match.scores[team],3);assert(!room.celebration,'field goals do not trigger touchdown dances');assert.equal(publicRoom(room,team?'b':'a').match.stats.fieldGoals,1);assert.equal(publicRoom(room,'b').match.scores[1-team],3);
 room.match.line=direction(team)*28;lineup(room.match);event(room,team,'play',{play:'run'});room.match.actors[room.match.carrier].z=direction(team)*51;
 const tick=()=>{const now=room.updatedAt+100;room.players.forEach(p=>p.seen=now);tickRoom(room,now);room=JSON.parse(encodeRoom(room));};tick();assert(room.celebration);assert.equal(room.match.scores[team],9);event(room,team,'skipCelebration',{},room.updatedAt);for(let i=0;i<40&&room.match.phase!=='placekick-aim';i++)tick();assert.equal(room.match.placeKick.kind,'extraPoint');event(room,1-team,'placeKick',{aim:0,power:.8});assert.equal(room.match.phase,'placekick-aim');event(room,team,'placeKick',{aim:0,power:.8});for(let i=0;i<40&&room.match.phase==='placekick-flight';i++)tick();assert.equal(room.match.scores[team],10);assert.equal(publicRoom(room,team?'b':'a').match.stats.extraPoints,1);assert(!room.celebration,'extra points do not trigger a second touchdown dance');
}
console.log('Place kicks passed: 3-point field goals, 1-point PATs, misses/range, both directions, real post-plane checks, CPU kicks, 21-point finishes, clock expiry/overtime, practice, and authoritative friend aiming/scoring.');
