import assert from 'node:assert/strict';
import test from 'node:test';
import { ARENAS, OVERTIME, PERIOD, RINK, createMatch, insideRink, pass, poke, shoot, start, swap, tick } from '../public/games/ice-hockey-rush/rules.js';

const step = 1 / 120;
const advance = (game, seconds, input = {}) => {
  for (let i = 0; i < Math.round(seconds / step); i++) tick(game, input, step);
};
const warmup = () => {
  const game = createMatch({practice: true});
  start(game);
  return game;
};

test('practice passes select the receiver and pucks rebound off the rounded boards', () => {
  const game = warmup();
  assert.equal(ARENAS.length, 3);
  assert(pass(game, {x: 4, z: 4}));
  advance(game, .65);
  assert.equal(game.controlled, 2);
  assert.equal(game.puck.owner, 2);
  Object.assign(game.puck, {owner: null, receiver: null, x: 9.9, z: 14.9, vx: 17, vz: 9});
  advance(game, .11);
  assert(game.puck.vx < 0);
  assert(insideRink(game.puck.x, game.puck.z, .15));
});

test('a charged corner shot scores while the goalie can stop a shot down the middle', () => {
  const shot = warmup();
  assert(shoot(shot, null, .65));
  advance(shot, 1.3);
  assert.deepEqual(shot.score, [1,0]);
  assert.equal(shot.phase, 'goal');
  advance(shot, 1.6);
  assert.equal(shot.phase, 'play');
  assert.equal(shot.puck.owner, 0);

  const save = warmup();
  assert(shoot(save, {x: 0,z: -RINK.goalLine - 1}, .65));
  advance(save, 1.22);
  assert.deepEqual(save.score, [0,0]);
  assert.equal(save.saves[1], 1);
  assert.equal(save.shots[0], 1);
});

test('the human can skate, score in a match, switch skaters, and recover the puck', () => {
  const game = createMatch();
  start(game);
  advance(game, .9);
  assert.equal(game.skaters.length, 6);
  assert.equal(game.goalies.length, 2);
  assert.equal(game.puck.owner, 0);
  advance(game, .55, {z: -1,sprint: true});
  assert(shoot(game, null, .95));
  advance(game, 1.18);
  assert.deepEqual(game.score, [1,0]);
  advance(game, 2.4);
  const old = game.controlled;
  game.puck.owner = 3;
  swap(game);
  assert.notEqual(game.controlled, old);
  const skater = game.skaters[game.controlled];
  game.puck.x = skater.x + .7;
  game.puck.z = skater.z + .25;
  game.puck.protectedUntil = 0;
  assert(poke(game));
  assert.equal(game.puck.owner, game.controlled);
});

test('matches have three periods and a bounded sudden-death overtime', () => {
  const game = createMatch({difficulty: 'pro'});
  start(game);
  advance(game, .9);
  assert.equal(game.puck.owner, null, 'Pro uses a contested opening faceoff');
  game.clock = step / 2;
  advance(game, step);
  assert.deepEqual([game.period,game.clock,game.phase], [2,PERIOD,'break']);
  advance(game, 2.8);
  assert.equal(game.phase, 'play');
  game.period = 3;
  game.clock = step / 2;
  advance(game, step);
  assert.deepEqual([game.period,game.clock,game.phase], [4,OVERTIME,'break']);
  advance(game, 2.8);
  game.clock = step / 2;
  advance(game, step);
  assert.equal(game.phase, 'finished');
  assert.deepEqual(game.score, [0,0]);
});
