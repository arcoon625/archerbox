import assert from 'node:assert/strict';
import test from 'node:test';
import {action,chooseDefense,createGame,CPU_DEFENSE_CALL_SECONDS,defenseForKey,direction,lineup,snap,step,throwPass} from '../public/games/touchdown-rush/rules.js';
import {makeRoom,readyPlayer,tickRoom,event,encodeRoom,publicRoom,safeInput} from '../server/matches.js';

function advance(game,seconds){
 for(let i=0;i<seconds*120;i++)step(game,{},1/120);
}
function playAgainst(call){
 const game=createGame('pro',{playerTraits:false});
 game.line=0;game.goal=-10;lineup(game);
 assert(chooseDefense(game,call,1));assert(snap(game,'cross'));
 advance(game,1.2);
 return game;
}

test('Man, Blitz, and Zone change the alignment and the assignments on a real pass play',()=>{
 assert.deepEqual(['Digit1','Digit2','Digit3'].map(code=>defenseForKey(code).id),['man','blitz','zone']);
 const man=playAgainst('man'),blitz=playAgainst('blitz'),zone=playAgainst('zone');
 const middle=16,weakCorner=18,weakSafety=20;
 assert(blitz.actors[15].z>man.actors[15].z+4&&blitz.actors[17].z>man.actors[17].z+4,'outside linebackers blitz toward the quarterback');
 assert(blitz.actors[middle].blockedBy!==null,'the middle linebacker attacks through the line and can be blocked');
 assert(zone.actors[middle].z<man.actors[middle].z-2,'the middle linebacker drops into an underneath zone');
 assert(zone.actors[weakCorner].x<man.actors[weakCorner].x-3,'the corner in Man follows the crossing receiver while Zone holds the outside');
 assert(zone.actors[weakSafety].z<man.actors[weakSafety].z-1,'the zone safety drops deeper');
 assert(throwPass(zone,1));
 advance(zone,.3);
 assert(zone.actors[19].x>12,'the opposite corner holds his zone on a throw away from it');
 assert.equal(chooseDefense(zone,'blitz',1),false,'a coverage call cannot change during a play');
});

test('the defending player has time to pick against the CPU and can start the play early',()=>{
 const game=createGame();game.offense=1;game.line=-30;game.goal=-20;lineup(game);
 const middle=game.actors[5],d=direction(game.offense);
 assert.equal(chooseDefense(game,'blitz',1),false);
 assert.equal(chooseDefense(game,'unknown',0),false);
 assert(chooseDefense(game,'blitz',0));assert.equal(middle.z,game.line+3.3*d);
 step(game,{},CPU_DEFENSE_CALL_SECONDS-.1);
 assert.equal(game.phase,'ready');
 assert(chooseDefense(game,'zone',0));assert.equal(middle.z,game.line+5.8*d);
 action(game);
 assert.equal(game.phase,'live');
 lineup(game);assert.equal(middle.z,game.line+5.8*d,'each team keeps its last call for the next down');
});

test('both seats can select and keep their own call in friend matches',()=>{
 let room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');
 readyPlayer(room,'a',{},10000);readyPlayer(room,'b',{},10000);
 room.players.forEach(p=>{p.seen=room.startAt;p.input=safeInput({},room.game);});
 tickRoom(room,room.startAt);
 event(room,0,'defense',{play:'blitz'});
 assert.equal(room.match.defenseCalls,undefined);
 event(room,1,'defense',{play:'zone'});
 assert.deepEqual(publicRoom(room,'a').match.defenseCalls,['man']);
 assert.deepEqual(publicRoom(room,'b').match.defenseCalls,['zone']);
 room=JSON.parse(encodeRoom(room));room.match.offense=1;lineup(room.match);
 event(room,0,'defense',{play:'blitz'});
 assert.deepEqual(publicRoom(room,'a').match.defenseCalls,['blitz']);
 assert.deepEqual(publicRoom(room,'b').match.defenseCalls,['zone']);
 event(room,1,'play',{play:'deep'});event(room,0,'defense',{play:'man'});
 assert.deepEqual(room.match.defenseCalls,['blitz','zone']);
});
