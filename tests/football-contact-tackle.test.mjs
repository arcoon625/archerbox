import assert from 'node:assert/strict';
import test from 'node:test';
import {action,createGame,direction,lineup,snap,step} from '../public/games/touchdown-rush/rules.js';

function defense(offense=1,multiplayer=false){
 const game=createGame('pro',{injuries:false,playerTraits:false});
 game.multiplayer=multiplayer;game.statsByTeam=[game.stats,{tackles:0}];game.offense=offense;game.line=0;lineup(game);
 assert(snap(game,'qbSneak'));
 const defTeam=1-offense,defender=game.actors[multiplayer?game.controls[defTeam]:game.control],runner=game.actors[game.carrier];
 for(const a of game.actors){a.x=-23;a.z=a.team===offense?-40:40;}
 Object.assign(runner,{x:10,z:-direction(offense)*2,juke:0});
 Object.assign(defender,{x:runner.x+1.18,z:runner.z});
 return {game,defender,defTeam,runner};
}

test('the player needs both contact and a tackle press',()=>{
 const {game,defender,defTeam,runner}=defense();
 defender.traits={...defender.traits,tackle:99};
 action(game,defTeam);
 assert.equal(game.phase,'live');
 assert.equal(game.event,'GET CLOSER');
 assert.equal(game.stats.tackles,0);
 assert.equal(defender.cooldown,0,'missing at a distance does not block the next press');
 defender.x=runner.x+.8;game.playTime=1;
 step(game,{},1/120);
 assert.equal(game.phase,'live','touching alone never credits the controlled defender');
 action(game,defTeam);
 assert.equal(game.phase,'dead');
 assert.equal(game.stats.tackles,1);
 assert.equal(game.tacklePose.tackler,defender.id);
 action(game,defTeam);
 assert.equal(game.stats.tackles,1,'one tackle is counted');
});

test('a blocker or an active juke can still prevent a contact tackle',()=>{
 const {game,defender,defTeam,runner}=defense();
 defender.x=runner.x+.85;
 const blocker=game.actors[17];blocker.x=runner.x+.45;blocker.z=runner.z;
 action(game,defTeam);
 assert.equal(game.event,'BLOCKED!');
 assert.equal(game.stats.tackles,0);
 blocker.x=-23;runner.juke=.1;
 action(game,defTeam);
 assert.equal(game.event,'RUNNER DODGED');
 assert.equal(game.stats.tackles,0);
 runner.juke=0;
 action(game,defTeam);
 assert.equal(game.stats.tackles,1);
});

test('each friend must get their controlled defender into contact',()=>{
 for(const offense of [0,1]){
  const {game,defender,defTeam,runner}=defense(offense,true);
  action(game,defTeam);
  assert.equal(game.statsByTeam[defTeam].tackles,0);
  defender.x=runner.x;
  action(game,defTeam);
  assert.equal(game.statsByTeam[defTeam].tackles,1);
 }
});
