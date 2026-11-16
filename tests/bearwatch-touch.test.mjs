import assert from 'node:assert/strict';
import test from 'node:test';
import {joystickVector, bindJoystick} from '../public/games/bearwatch/touch-controls.js';
import {freshGame, tick} from '../public/games/bearwatch/rules.js';

test('forest joystick has a dead zone, proportional speed, and a circular limit', () => {
  assert.deepEqual(joystickVector(2, 2, 30), {x:0, z:0});
  assert.deepEqual(joystickVector(0, -300, 30), {x:0, z:-1});
  const half = joystickVector(15, 0, 30);
  assert(half.x > .3 && half.x < .6);
  const diagonal = joystickVector(300, -300, 30);
  assert(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-10);
  assert.deepEqual(joystickVector(NaN, 0, 30), {x:0, z:0});
});

function harness() {
  const listeners = new Map(), captured = new Set(), thumb = {offsetWidth:54, style:{}}, moves = [];
  let playing = true;
  const element = {
    querySelector: () => thumb,
    getBoundingClientRect: () => ({left:10, top:20, width:124, height:124}),
    classList: {toggle() {}},
    addEventListener: (name, handler) => listeners.set(name, handler),
    setPointerCapture: id => captured.add(id),
    hasPointerCapture: id => captured.has(id),
    releasePointerCapture: id => captured.delete(id),
  };
  const joystick = bindJoystick(element, {enabled:() => playing, onMove:(x, z) => moves.push({x, z})});
  const send = (type, pointerId = 1, clientX = 72, clientY = 25) => listeners.get(type)({pointerId, clientX, clientY, button:0, preventDefault() {}});
  return {send, moves, thumb, captured, joystick, pause:() => {playing = false;}};
}

test('a second finger cannot steal movement, and all release paths stop the stick', () => {
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    const h = harness();
    h.send('pointerdown');
    assert.equal(h.moves.at(-1).z, -1);
    h.send('pointerdown', 2, 100, 82);
    h.send('pointermove', 2, 100, 82);
    h.send('pointerup', 2);
    assert.equal(h.moves.length, 1, 'camera or action finger leaves movement alone');
    h.send('pointermove', 1, 300, 82);
    assert.equal(h.moves.at(-1).x, 1, 'captured finger can drag beyond the circle');
    h.send(ending);
    assert.deepEqual(h.moves.at(-1), {x:0, z:0});
    assert.equal(h.captured.size, 0);
    h.send('pointermove');
    assert.deepEqual(h.moves.at(-1), {x:0, z:0}, 'lifting does not leave movement stuck');
  }
});

test('pausing resets capture and blocks touches until the game is playing', () => {
  const h = harness();
  h.send('pointerdown');
  h.pause();
  h.joystick.reset();
  assert.equal(h.captured.size, 0);
  h.send('pointerdown');
  assert.deepEqual(h.moves.at(-1), {x:0, z:0});
  assert.equal(h.captured.size, 0);
});

test('joystick output actually moves the survivor and releasing stops movement', () => {
  const h = harness(), g = freshGame();
  const start = {...g.player};
  h.send('pointerdown');
  tick(g, {x:h.moves.at(-1).x, z:h.moves.at(-1).z}, .2);
  assert(g.player.z < start.z);
  h.send('pointerup');
  const stopped = {...g.player};
  tick(g, h.moves.at(-1), .2);
  assert.equal(g.player.x, stopped.x);
  assert.equal(g.player.z, stopped.z);
});
