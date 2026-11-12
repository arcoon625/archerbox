import assert from 'node:assert/strict';
import {createGame,lineup,snap,step,endPlay,action,throwPass,punt,beginPlaceKick,direction,PLAYS} from '../public/games/touchdown-rush/rules.js';
import {RUN_PLAYS,runLane} from '../public/games/touchdown-rush/playbook.js';
import {makeRoom,readyPlayer,event,publicRoom,encodeRoom} from '../server/matches.js';
function carry(play,front,{mode='pro',dt=1/120,wait=0,serialize=false}={}){
 let g=createGame(mode,{injuries:false,injurySeed:12345});g.snapSerial=front;lineup(g);snap(g,play);
 for(let time=0;time<15&&g.phase==='live';time+=dt){const a=g.actors[g.carrier],lane=runLane(play,g.playTime);step(g,time<wait?{}:{x:Math.abs(a.x-lane)>.2?Math.sign(lane-a.x)*.6:0,z:-1,sprint:true},dt);if(serialize)g=JSON.parse(JSON.stringify(g));}
 return {gain:(g.actors[g.carrier].z-g.line)*direction(g.offense),g};
}
const results={};for(const play of Object.keys(RUN_PLAYS)){
 results[play]=Array.from({length:4},(_,front)=>carry(play,front).gain);
 for(const front of [0,1,2,3]){const {gain,g}=carry(play,front);assert(gain<30,'sprinting straight at the called lane never guarantees a touchdown');assert(g.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));assert.equal(g.phase,'dead');assert.equal(g.scores[0],0);assert.equal(g.stats.sacks||0,0);assert.equal(g.stats.rushingYards,Math.round(gain*10)/10);}
}
assert(Math.max(...results.run)>10&&Math.min(...results.run)<4,'inside runs have both a clear-lane gain and a short stop');
assert(Math.max(...results.qbDraw)>10&&Math.min(...results.qbDraw)<5,'QB draws can break through a gap or be contained');
assert(Math.max(...results.qbSneak)>5&&Math.min(...results.qbSneak)<2,'sneaks can earn useful yards, but a pinched front can stuff them');
for(const play of ['sweepLeft','sweepRight'])assert(results[play][2]>results[play][1]+2,'a pinched interior leaves more room on the edge');
for(const dt of [1/120,1/30,.1])for(const front of [0,1,2,3]){
 const {gain,g}=carry('qbSneak',front,{dt});assert(gain>-2&&gain<25);assert.equal(g.phase,'dead');assert(g.actors.every(a=>Math.abs(a.x)<=25.3&&Math.abs(a.z)<=58));
}
assert(carry('run',1,{wait:1}).gain<carry('run',1).gain,'waiting for a second lets the opening close');
const live=carry('run',1,{serialize:true});assert.deepEqual(JSON.parse(JSON.stringify(live.g)),JSON.parse(JSON.stringify(carry('run',1).g)),'JSON persistence retains the same front, gaps and collisions');
// Front variation follows real snaps; returning to setup/choosing invalid calls cannot reroll it.
const sequence=createGame('pro',{injuries:false}),fronts=[];
for(let n=0;n<4;n++){fronts.push(sequence.actors[12].x);const front=sequence.defensiveFront;assert(!snap(sequence,'made-up-play'));assert.equal(sequence.defensiveFront,front);snap(sequence,'run');endPlay(sequence,'bounds');lineup(sequence);}
assert.equal(new Set(fronts).size,4);assert.equal(sequence.snapSerial,4);assert.equal(sequence.runFit,null);
// The new play is a controllable under-center keeper, on either side, with normal tackles and scoring.
for(const team of [0,1]){
 const g=createGame('pro',{injuries:false});g.offense=team;g.line=0;g.multiplayer=true;g.statsByTeam=[g.stats,{passes:0,tackles:0,touchdowns:0}];lineup(g);assert(snap(g,'qbSneak'));const a=g.actors[g.carrier],d=direction(team);
 assert.equal(g.carrier,team*11);assert.equal(g.controls[team],a.id);assert(Math.abs(a.z-g.line)<1.5,'sneak starts under center, not in a five-yard shotgun');assert.equal(a.role,'QB');assert.equal(g.ball,null);assert(!throwPass(g));assert(!punt(g));assert(!beginPlaceKick(g));
 action(g,team);assert.equal(g.event,'JUKE!');assert(a.juke>0);a.z=d*51;step(g,()=>({}),.001);assert.equal(g.scores[team],6);assert.equal(g.statsByTeam[team].rushingTouchdowns,1);assert.equal(g.statsByTeam[team].sacks||0,0);assert(g.pendingTry);assert(beginPlaceKick(g,'extraPoint'));
}
// Defenders are never granted an invulnerability exception: a human can tackle a reachable runner in a gap.
const tackle=createGame('pro',{injuries:false});tackle.multiplayer=true;tackle.statsByTeam=[tackle.stats,{tackles:0}];tackle.snapSerial=1;lineup(tackle);snap(tackle,'qbSneak');const def=tackle.actors[tackle.controls[1]],qb=tackle.actors[tackle.carrier];qb.x=def.x=20;qb.z=def.z=20;qb.juke=0;action(tackle,1);assert.equal(tackle.phase,'dead');assert.equal(tackle.statsByTeam[1].tackles,1);
for(const team of [0,1]){
 let room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');readyPlayer(room,'a',{injuries:false},10000);readyPlayer(room,'b',{},10000);room.status='playing';room.match.offense=team;room.match.snapSerial=1;lineup(room.match);
 event(room,1-team,'play',{play:'qbSneak'});assert.equal(room.match.phase,'ready');event(room,team,'play',{play:'qbSneak'});assert.equal(room.match.play,'qbSneak');room=JSON.parse(encodeRoom(room));
 const view=publicRoom(room,team?'b':'a').match;assert.equal(view.offense,0);assert.equal(view.carrier,0);assert.equal(view.control,0);assert.equal(view.defensiveFront,1);assert.equal(view.runFit.front,1);assert.equal(view.snapSerial,2);assert.equal(view.actors[0].name,room.match.actors[team*11].name);
 const before=room.match.snapSerial;event(room,team,'play',{play:'qbSneak'});assert.equal(room.match.snapSerial,before,'a repeat live command cannot reselect a front');
}
assert.equal(PLAYS.length,14);assert.equal(PLAYS.filter(p=>p.kind==='run').length,6);
console.log('Running lanes passed: varied short/big gains, inside/outside fronts, timed openings, stuffed sneaks, no automatic touchdowns or tackle immunity, coarse-step safety, normal QB controls/TD/PATs, snap progression and serialized friend views. Pro gains:',JSON.stringify(results));
