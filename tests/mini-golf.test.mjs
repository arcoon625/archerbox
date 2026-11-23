import assert from 'node:assert/strict';
import test from 'node:test';
import { HOLES, LIMIT, aimAt, createHole, holeObstacle, putt, step } from '../public/games/mini-golf/rules.js';

function settle(state) {
  let height = 0;
  for (let i = 0; state.phase === 'rolling' && i < 1200; i++) {
    step(state, 1 / 120);
    height = Math.max(height, state.y);
  }
  assert.notEqual(state.phase, 'rolling', 'a putt ends on its own');
  return height;
}

test('each themed hole has a playable route within par', () => {
  const routes = [
    [[0, 72]],
    [[.43206775658251145, 55], [-1.3508531336808527, 97]],
    [[1.0572956181886235, 100], [.95703016934869, 100]],
    [[.3635811900040426, 97]],
    [[0, 60]],
    [[.19002864918103018, 94]],
  ];
  assert.deepEqual(HOLES.map(hole => hole.course), [0, 0, 1, 1, 2, 2]);
  for (const [i, hole] of HOLES.entries()) {
    const state = createHole(hole);
    for (const [angle, power] of routes[i]) {
      assert(putt(state, angle, power));
      settle(state);
    }
    assert.equal(state.phase, 'holed', hole.name);
    assert(state.strokes <= hole.par, hole.name);
  }
});

test('the moon pad launches the ball above the barrier and into the cup', () => {
  const state = createHole(HOLES[4]);
  assert(putt(state, aimAt(state.x, state.z, ...state.hole.cup), 60));
  assert(!putt(state, 0, 60), 'an unfinished putt cannot be hit again');
  assert(settle(state) > 1);
  assert.equal(state.phase, 'holed');
  assert.equal(state.strokes, 1);
  assert(!putt(state, 0, 60), 'a holed ball cannot be hit again');
});

test('grounded shots bank off the rails and airborne shots can go out of bounds', () => {
  const grounded = createHole(HOLES[0]);
  putt(grounded, Math.PI / 2, 50);
  for (let i = 0; grounded.vX > 0 && i < 300; i++) step(grounded, 1 / 120);
  assert(grounded.vX < 0);
  settle(grounded);
  assert.equal(grounded.strokes, 1);
  assert.equal(grounded.phase, 'aim');

  const airborne = createHole(HOLES[4]);
  airborne.strokes = LIMIT - 2;
  putt(airborne, Math.PI / 2, 100);
  airborne.y = 1.3;
  airborne.vY = 2;
  settle(airborne);
  assert.deepEqual([airborne.x, airborne.z], HOLES[4].tee);
  assert.equal(airborne.phase, 'limit');
  assert.equal(airborne.strokes, LIMIT);
  assert.match(airborne.notice, /penalty/);
  assert.notDeepEqual(holeObstacle(HOLES[3], 0), holeObstacle(HOLES[3], 1));
});
