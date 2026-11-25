import assert from 'node:assert/strict';
import {test} from 'node:test';
import {TEAMS} from '../public/games/touchdown-rush/teams.js';
import {OFFENSE_PLAYS,PLAYS,diagramPaths,recommendedPlays,teamPlaybook} from '../public/games/touchdown-rush/playbook.js';
import {createGame,snap,step,endPlay,beginPlaceKick,strikePlaceKick} from '../public/games/touchdown-rush/rules.js';
import {makeReplayRecorder,replayAt} from '../public/games/touchdown-rush/replay.js';
import {makeRoom,readyPlayer,tickRoom,event,publicRoom} from '../server/matches.js';

test('all NFL teams have data and 38 available calls, with situational picks',()=>{
 const ids=OFFENSE_PLAYS.map(play=>play.id);
 assert.equal(ids.length,38);
 assert.equal(new Set(ids).size,ids.length);
 for(const {id} of TEAMS){
  const book=teamPlaybook(id);
  assert(book.fromStats);
  for(const play of [...book.passCalls,...book.runCalls,...recommendedPlays(book,1,10)])assert(ids.includes(play));
  assert.equal(recommendedPlays(book,3,1)[0],'qbSneak');
 }
 const bills=teamPlaybook('buffalo-bills',86),packers=teamPlaybook('green-bay-packers');
 assert(bills.passShare<.5&&packers.passShare>.6);
 assert(recommendedPlays(bills,1,10).includes('qbPower'));
 assert(recommendedPlays(packers,3,10).includes('verticals'));
 for(const play of OFFENSE_PLAYS.filter(p=>!PLAYS.includes(p))){
  const game=createGame('pro');
  assert(snap(game,play.id));
  for(let i=0;i<120;i++)step(game,{},1/120);
  assert(game.actors.every(actor=>Number.isFinite(actor.x)&&Number.isFinite(actor.z)));
  assert.equal(diagramPaths(play.id).length,play.kind==='run'?1:5);
 }
});

test('one of the new calls works from the guest’s playbook',()=>{
 const room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');
 readyPlayer(room,'a',{team:'green-bay-packers'},10000);
 readyPlayer(room,'b',{team:'buffalo-bills'},10000);
 room.players.forEach(player=>{player.seen=room.startAt;});
 tickRoom(room,room.startAt);
 event(room,0,'play',{play:'mesh'});
 assert.equal(publicRoom(room,'a').match.play,'mesh');
 const guest=publicRoom(room,'b').match;
 assert.equal(guest.play,'mesh');
 assert.equal(guest.teamIds[0],'buffalo-bills');
 assert.equal(guest.selected,12);
});

test('replay preserves the last completed play and its tackle without advancing the game',()=>{
 const recorder=makeReplayRecorder(),g=createGame();
 recorder.record(g,0);
 assert.equal(recorder.latest(),null);
 snap(g,'zoneLeft');
 const runner=g.actors[g.carrier];
 recorder.record(g,.1);
 const x=runner.x;
 runner.x+=6;
 recorder.record(g,.3);
 endPlay(g,'tackle',g.actors[12]);
 recorder.record(g,.4);
 const clip=recorder.latest(),clock=g.clock;
 assert.equal(clip.event,'TACKLED');
 assert(Math.abs(replayAt(clip,.1).actors[g.carrier].x-x-3)<1e-6);
 assert.deepEqual(replayAt(clip,clip.duration).tacklePose,{carrier:g.carrier,tackler:12});
 assert.equal(g.clock,clock);
 assert.equal(replayAt(clip,0).actors[g.carrier].x,x);
 step(g,{},2.6);
 recorder.record(g,3);
 snap(g,'mesh');
 recorder.record(g,3.1);
 assert.equal(recorder.latest(),clip);
 recorder.reset();
 assert.equal(recorder.latest(),null);
});

test('a field goal records the moving ball and the separate kicking lineup',()=>{
 const recorder=makeReplayRecorder(),g=createGame('pro',{weather:{kind:'clear'}});
 g.line=-28;
 assert(beginPlaceKick(g));
 recorder.record(g,0);
 assert(strikePlaceKick(g,0,.8));
 let seconds=.01;
 recorder.record(g,seconds);
 while(g.phase==='placekick-flight'&&seconds<10){
  step(g,{},1/30);seconds+=1/30;
  recorder.record(g,seconds);
 }
 const clip=recorder.latest();
 assert(clip);
 assert(clip.frames.some(frame=>frame.ball.y>2));
 assert(clip.frames.at(-1).ball.finished);
 assert.equal(clip.frames[0].actors[g.placeKick.kicker].specialRole,'K');
 assert.equal(g.scores[0],3);
});
