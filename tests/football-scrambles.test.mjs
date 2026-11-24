import assert from 'node:assert/strict';
import test from 'node:test';
import {action,createGame,lineup,snap,step,throwPass} from '../public/games/touchdown-rush/rules.js';
import {teamRoster} from '../public/games/touchdown-rush/rosters.js';

const dt=1/120;
function cpuDrive({team='kansas-city-chiefs',front=0,play='deep',multiplayer=false}={}){
 const game=createGame('pro',{teamRosters:[teamRoster('dallas-cowboys'),teamRoster(team)]});
 game.offense=1;game.line=-30;game.goal=-20;game.snapSerial=front;
 game.multiplayer=multiplayer;game.statsByTeam=[game.stats,{}];
 lineup(game);assert(snap(game,play));
 return game;
}
function through(game,condition,seconds=5){
 for(let i=0;i<seconds/dt;i++){
  step(game,{},dt);
  if(condition())return;
 }
 assert.fail('The expected quarterback decision did not happen');
}

test('the CPU throws from the pocket on a clean pass play',()=>{
 const game=cpuDrive();
 for(const a of game.actors.filter(a=>a.team===0)){a.x=23;a.z=42;}
 through(game,()=>game.phase==='flight');
 assert.equal(game.scramble,null);
 assert.equal(game.ball.from.x,0);
 assert.equal(game.statsByTeam[1].passAttempts,1);
});

test('a pressured CPU quarterback can roll out and throw before crossing the line',()=>{
 const game=cpuDrive();
 through(game,()=>!!game.scramble);
 assert.equal(game.event,'QB SCRAMBLE!');
 through(game,()=>game.phase==='flight');
 assert(Math.abs(game.ball.from.x)>1,'the throw comes from outside the original pocket');
 assert(game.ball.from.z<=game.line);
 assert.equal(game.scramble,null);
 assert.equal(game.statsByTeam[1].passAttempts,1);
});

test('a mobile CPU quarterback can tuck the ball, gain real yards, and get tackled',()=>{
 const game=cpuDrive({team:'baltimore-ravens',front:1,play:'corner'});
 through(game,()=>game.scramble?.committed);
 assert.equal(game.event,'QB TAKES OFF!');
 assert.equal(throwPass(game),false);
 through(game,()=>game.phase==='dead');
 assert.equal(game.event,'TACKLED');
 assert.equal(game.statsByTeam[1].passAttempts,undefined);
 assert(game.statsByTeam[1].rushingYards>=1);
 assert.equal(game.tacklePose.carrier,11);
 through(game,()=>game.phase==='ready',3);
 assert.equal(game.scramble,null);
});

test('the defense can still sack a scrambling QB behind the line',()=>{
 const game=cpuDrive();
 through(game,()=>!!game.scramble);
 const qb=game.actors[game.carrier],defender=game.actors[game.control];
 Object.assign(defender,{x:qb.x,z:qb.z,blockedBy:null,cooldown:0});
 action(game,0);
 assert.equal(game.event,'SACKED!');
 assert.equal(game.stats.sacks,1);
 assert(game.nextLine<game.line);
 assert.equal(game.statsByTeam[1].rushingYards,undefined);
});

test('the auto-scramble stays off during friend matches and designed QB runs',()=>{
 const friends=cpuDrive({multiplayer:true});
 for(const a of friends.actors.filter(a=>a.team===0)){a.x=23;a.z=42;}
 for(let i=0;i<240;i++)step(friends,{},dt);
 assert.equal(friends.phase,'live');
 assert.equal(friends.scramble,null);
 assert.equal(friends.ball,null);
 assert(throwPass(friends),'the friend still controls when to pass');

 const keeper=cpuDrive({team:'baltimore-ravens',play:'qbDraw'});
 through(keeper,()=>keeper.phase==='dead');
 assert.equal(keeper.scramble,null);
 assert.equal(keeper.statsByTeam[1].passAttempts,undefined);
});
