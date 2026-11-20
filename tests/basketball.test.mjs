import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,shotGrade,shoot,tick,pass,steal} from '../public/games/basketball-stars/court.js';

const settle=game=>tick(game,1,{x:0,y:0});
test('perfect open shots score from the right side of the arc and hand over possession',()=>{
  const game=newGame('duel','rookie');
  assert.equal(shotGrade(.62,true),'Perfect');
  assert.notEqual(shotGrade(.62,false),'Perfect');
  assert(shoot(game,game.you,.72,()=>.999));
  settle(game);
  assert.deepEqual(game.score,[3,0]);
  assert.equal(game.event,'basket');
  assert.equal(game.owner.team,1);
  game.owner=game.you;
  game.you.y=160;
  assert(shoot(game,game.you,.72));
  settle(game);
  assert.deepEqual(game.score,[5,0]);
});

test('3v3 supports passing both ways and steals only within reach',()=>{
  const game=newGame('teams','pro');
  assert.equal(game.players.length,6);
  assert(pass(game));
  settle(game);
  assert.equal(game.owner.team,0);
  assert.notEqual(game.owner,game.you);
  assert(pass(game));
  settle(game);
  assert.equal(game.owner,game.you);
  game.owner=game.away[0];
  game.protectedFor=0;
  assert.equal(steal(game,game.you),false);
  game.you.cooldown=0;
  game.you.x=game.owner.x+15;
  game.you.y=game.owner.y;
  assert(steal(game,game.you));
  assert.equal(game.owner,game.you);
});

test('contest advances across five spots, counts bonus balls, and stops at fifteen shots',()=>{
  const game=newGame('contest','rookie');
  const spots=new Set();
  for(let i=0;i<15;i++){
    spots.add(game.you.x+':'+game.you.y);
    assert(shoot(game,game.you,.72));
    settle(game);
  }
  assert.equal(spots.size,5);
  assert.equal(game.makes,15);
  assert.equal(game.baskets,15);
  assert.equal(game.score[0],20);
  assert(game.finished);
  assert.equal(shoot(game,game.you,.72),false);
});

test('an expired tie stays playable until the deciding basket',()=>{
  const game=newGame('duel','rookie');
  game.clock=.01;
  settle(game);
  assert(!game.finished);
  assert(shoot(game,game.you,.72));
  settle(game);
  assert(game.finished);
});
