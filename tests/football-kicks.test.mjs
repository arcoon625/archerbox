import assert from 'node:assert/strict';
import {createGame,lineup,punt,kickoff,step,endPlay,action,direction} from '../public/games/touchdown-rush/rules.js';
import {makeRoom,readyPlayer,tickRoom,event,encodeRoom,publicRoom,safeInput} from '../server/matches.js';
function advance(g,seconds,input={}){for(let t=0;t<seconds;t+=1/120)step(g,input,1/120)}
for(const team of [0,1])for(const kind of ['punt','kickoff']){
 const g=createGame('rookie');g.offense=team;g.line=team?-30:30;lineup(g);const scores=g.scores.slice();assert((kind==='punt'?punt:kickoff)(g));assert.equal(g.phase,'kick');assert.equal(g.ball.target,(1-team)*11+1);
 const initial=g.ball.z;advance(g,1);assert(g.ball.y>5);assert.notEqual(g.ball.z,initial);assert.deepEqual(g.scores,scores,'a kick never scores on its own');assert(!punt(g),'cannot repeatedly punt while ball is airborne');
 advance(g,2.3);assert.equal(g.offense,1-team);assert.equal(g.phase,'live');assert.equal(g.returnPlay.kind,kind);assert.equal(g.carrier,(1-team)*11+1);assert.equal(g.control,g.offense===0?g.carrier:g.control);assert(g.actors[g.carrier].juke>0,'catch grace gives the returner time to move');
 // Return movement, sprint and juke use the normal football controls.
 if(g.offense===0){const runner=g.actors[g.carrier],old=runner.z;advance(g,.2,{z:-1,sprint:true});assert(runner.z<old);action(g);assert(runner.cooldown>0);}
 // Stopping a return sets up first-and-ten for the receiving team.
 const r=g.actors[g.carrier];r.z+=direction(g.offense)*8;endPlay(g,'tackle');assert.equal(g.nextDown,1);assert.equal(g.nextOffense,1-team);assert.equal(g.event,'RETURN STOPPED');assert(!g.returnPlay);advance(g,3);assert.equal(g.down,1);assert.equal(g.phase,'ready');
}
for(const team of [0,1]){
 const g=createGame('rookie');g.offense=team;g.line=direction(team)*40;lineup(g);punt(g);advance(g,3);assert.equal(g.event,'TOUCHBACK');assert.equal(g.phase,'ready');assert.equal(g.offense,1-team);assert.equal(g.line,-direction(1-team)*30);assert(!g.returnPlay);
 const cpu=createGame();cpu.offense=1;cpu.line=-30;cpu.down=4;lineup(cpu);advance(cpu,2.1);assert.equal(cpu.ball.kind,'punt','CPU can punt on fourth down');
}
for(const kind of ['punt','kickoff']){
 const g=createGame('rookie');g.offense=1;g.line=-30;lineup(g);(kind==='punt'?punt:kickoff)(g);advance(g,3.2);assert.equal(g.offense,0);const runner=g.actors[g.carrier];runner.z=-51;step(g,{},.01);assert.equal(g.scores[0],6);assert.equal(g.stats.returnTouchdowns,1);assert.equal(g.event,kind==='punt'?'PUNT RETURN TOUCHDOWN!':'KICK RETURN TOUCHDOWN!');assert(g.pendingTry);assert.equal(g.stats.touchdowns,1);
}
// Friends share possession, receiver control, ball position and a return touchdown.
let r=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');readyPlayer(r,'a',{},10000);readyPlayer(r,'b',{},10000);r.players.forEach(p=>{p.seen=r.startAt;p.input=safeInput({},r.game)});tickRoom(r,r.startAt);event(r,1,'punt');assert.equal(r.match.phase,'ready','only the possessing team can punt');event(r,0,'punt');assert.equal(r.match.phase,'kick');
for(let i=0;i<33;i++){const now=r.updatedAt+100;r.players.forEach(p=>p.seen=now);tickRoom(r,now);r=JSON.parse(encodeRoom(r));}
assert.equal(r.match.offense,1);assert.equal(r.match.controls[1],12);const guest=publicRoom(r,'b').match;assert.equal(guest.offense,0);assert.equal(guest.control,1);assert.equal(guest.returnPlay.team,0);assert.deepEqual(publicRoom(r,'a').match.actors.map(a=>[a.x,a.z]).sort(),guest.actors.map(a=>[a.x,a.z]).sort());
r.match.actors[r.match.carrier].z=51;const now=r.updatedAt+100;r.players.forEach(p=>p.seen=now);tickRoom(r,now);assert.deepEqual(r.match.scores,[0,6]);assert(r.celebration);assert.equal(r.celebration.seat,1);assert.equal(publicRoom(r,'b').match.stats.returnTouchdowns,1);
console.log('Football kicks passed: punts, CPU fourth-down punts, automatic catches, player returns, first downs, touchbacks, kickoffs after scores, return touchdowns and shared friend control/scoring.');
