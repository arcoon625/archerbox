import assert from 'node:assert/strict';
import test from 'node:test';
import {action,canHurdle,createGame,hurdle,hurdleHeight,lineup,snap,step} from '../public/games/touchdown-rush/rules.js';
import {event,makeRoom,readyPlayer,publicRoom} from '../server/matches.js';

const dt=1/120;
function runGame(offense=0,multiplayer=false){
 const game=createGame('pro',{injuries:false,playerTraits:false});
 game.offense=offense;game.line=0;game.goal=offense?10:-10;game.multiplayer=multiplayer;
 game.statsByTeam=[game.stats,{tackles:0}];lineup(game);snap(game,'run');
 for(const a of game.actors.filter(a=>a.id!==game.carrier)){a.x=24;a.z=a.team===offense?42:-42;}
 return game;
}
function advance(game,seconds,input={}){
 for(let frame=0;frame<seconds/dt;frame++)step(game,input,dt);
}

test('the runner hops once, keeps steering, and recovers on the ground',()=>{
 const game=runGame(),runner=game.actors[game.carrier],start=runner.z;
 assert(!hurdle(game,1),'a defender cannot hurdle');
 assert(hurdle(game));assert.equal(game.event,'HURDLE!');
 assert(runner.stamina<100);assert(!hurdle(game),'a second press cannot stack the jump');
 advance(game,.31,{z:-1,sprint:true});
 assert(hurdleHeight(runner)>.8);
 assert(runner.z<start-1,'movement continues through the jump');
 advance(game,.34,{z:-1});
 assert.equal(hurdleHeight(runner),0);
 assert(!canHurdle(game),'the runner has a short recovery');
 advance(game,1.32);
 assert(canHurdle(game));
});

test('a well-timed hurdle clears a defender and the runner can be tackled after landing',()=>{
 const game=runGame(),runner=game.actors[game.carrier],defender=game.actors[11];
 advance(game,.4);
 assert(hurdle(game));
 advance(game,.31);
 defender.x=runner.x;defender.z=runner.z;
 step(game,{},dt);
 assert.equal(game.phase,'live','the closest AI defender misses during the top of the hurdle');
 defender.x=24;defender.z=-42;
 advance(game,.34);
 defender.x=runner.x;defender.z=runner.z;
 step(game,{},dt);
 assert.equal(game.phase,'dead','a grounded runner can be tackled again');
});

test('contact plus a tackle press works before the jump clears the defender',()=>{
 const game=runGame(0,true),runner=game.actors[game.carrier],defender=game.actors[game.controls[1]];
 assert(hurdle(game,0));runner.juke=0;
 defender.x=runner.x;defender.z=runner.z;
 action(game,1);
 assert.equal(game.phase,'dead');assert.equal(hurdleHeight(runner),0);
 assert.equal(game.statsByTeam[1].tackles,1);
});

test('friend matches accept the hurdle from the controlling runner and share the pose',()=>{
 const room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');
 readyPlayer(room,'a',{},10000);readyPlayer(room,'b',{},10000);room.status='playing';
 room.match.offense=1;lineup(room.match);
 event(room,1,'play',{play:'deep'});event(room,1,'hurdle');
 assert.equal(room.match.actors[11].hurdle,0,'the dropback passer cannot hurdle');
 lineup(room.match);event(room,1,'play',{play:'run'});
 const runner=room.match.actors[room.match.carrier];
 event(room,0,'hurdle');assert.equal(runner.hurdle,0);
 event(room,1,'hurdle');assert(runner.hurdle>0);
 const guest=publicRoom(room,'b').match;
 assert.equal(guest.actors[guest.carrier].hurdle,runner.hurdle);
});
