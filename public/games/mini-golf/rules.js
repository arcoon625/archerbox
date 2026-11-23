export const COURSES = [
  { name: 'Pirate Ship', color: '#ffd17a', note: 'Bank around cargo on a ship at sea.' },
  { name: 'Rooftop Garden', color: '#ffa394', note: 'Thread the planters above a sunset skyline.' },
  { name: 'Moon Station', color: '#8ce9f2', note: 'Launch over obstacles in low gravity.' },
];

export const LIMIT = 10;
export const BALL_RADIUS = .21;
export const WIDTH = 10;
export const LENGTH = 20;
export const HOLES = [
  { name: 'Captain’s Putt', course: 0, par: 2, tee: [0, 7.2], cup: [0, -6.5],
    blocks: [[-3.2, 1, 2.3, 1.6], [3.35, -2.8, 1.85, 2.2]] },
  { name: 'Crate Passage', course: 0, par: 3, tee: [-2.6, 7.4], cup: [2.8, -6.9],
    blocks: [[-2.65, .7, 4.7, 1], [2.6, -3.4, 4.8, 1]], sand: [[-3.4, -6.6, 2.3, 3]] },
  { name: 'Skyline Slalom', course: 1, par: 3, tee: [-2.6, 7.2], cup: [-1.7, -7],
    blocks: [[-2.7, 3, 4.6, 1.05], [2.5, -1.3, 5, 1.1], [-3.55, -4.7, 2.1, 1]] },
  { name: 'Garden Gate', course: 1, par: 3, tee: [1.9, 7.2], cup: [1, -7.2],
    blocks: [[-.9, -4.6, 2.7, .9]], sweep: [0, -.8, 2.7, .7, 3.1] },
  { name: 'Moon Bounce', course: 2, par: 2, tee: [0, 7.5], cup: [0, -6.9],
    blocks: [[0, -.7, 4.6, .85]], pads: [[0, 3.05, 2.8, 1.3]] },
  { name: 'Satellite Sweep', course: 2, par: 3, tee: [-1.8, 7.4], cup: [2.1, -7.2],
    blocks: [[-2.9, 1.5, 3.5, 1.05], [2.9, -3.6, 3.5, 1.05]],
    sweep: [0, -1.2, 2.35, .75, 3.45], sand: [[-3.6, -6.5, 2, 2.8]], pads: [[2.45, 3.9, 1.65, 1.2]] },
];

export function golfRange(track) {
  const start = track === 0 ? 0 : (track - 1) * 2;
  return {start, end: track === 0 ? HOLES.length : start + 2};
}

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const aimAt = (x, z, tx, tz) => Math.atan2(tx - x, z - tz);
export const powerSpeed = value => clamp(value, 5, 100) * .17;
export const holeObstacle = (hole, time) => hole.sweep && [
  hole.sweep[0] + Math.sin(time * 1.45) * hole.sweep[4], ...hole.sweep.slice(1, 4)
];

export function createHole(hole) {
  const [x, z] = hole.tee;
  return { hole, x, z, vX: 0, vZ: 0, y: 0, vY: 0, time: 0, strokes: 0,
    phase: 'aim', lie: [x, z], bounceAt: 0, notice: '' };
}

export function putt(state, angle, power) {
  if (state.phase !== 'aim' || !Number.isFinite(angle) || !Number.isFinite(power)) return false;
  const speed = powerSpeed(power);
  state.lie = [state.x, state.z];
  state.vX = Math.sin(angle) * speed;
  state.vZ = -Math.cos(angle) * speed;
  state.strokes++;
  state.phase = 'rolling';
  state.notice = '';
  return true;
}

const contains = (rect, x, z) => Math.abs(x - rect[0]) < rect[2] / 2 && Math.abs(z - rect[1]) < rect[3] / 2;

export function resetBall(state) {
  if (state.phase !== 'rolling') return;
  [state.x, state.z] = state.lie;
  state.y = state.vY = state.vX = state.vZ = 0;
  state.strokes = Math.min(LIMIT, state.strokes + 1);
  state.phase = state.strokes >= LIMIT ? 'limit' : 'aim';
  state.notice = 'Back to your last spot. One penalty stroke.';
}

function collide(state, rect) {
  const [x, z, w, d] = rect;
  const dx = state.x - x, dz = state.z - z;
  const overlapX = w / 2 + BALL_RADIUS - Math.abs(dx);
  const overlapZ = d / 2 + BALL_RADIUS - Math.abs(dz);
  if (overlapX <= 0 || overlapZ <= 0) return;
  if (overlapX < overlapZ) {
    const side = dx < 0 ? -1 : 1;
    state.x += side * overlapX;
    if (state.vX * side < 0) state.vX *= -.72;
  } else {
    const side = dz < 0 ? -1 : 1;
    state.z += side * overlapZ;
    if (state.vZ * side < 0) state.vZ *= -.72;
  }
}

export function step(state, dt) {
  state.time += dt;
  if (state.phase !== 'rolling') return;
  const hole = state.hole;
  let speed = Math.hypot(state.vX, state.vZ);
  if (state.y <= 0) {
    const pad = hole.pads?.find(rect => contains(rect, state.x, state.z));
    if (pad && speed > 2.3 && state.time >= state.bounceAt) {
      state.vY = 4.6;
      state.bounceAt = state.time + 2;
      state.notice = 'Moon bounce!';
    }
  }
  if (state.y > 0 || state.vY > 0) {
    state.y = Math.max(0, state.y + state.vY * dt);
    state.vY -= (hole.course === 2 ? 6.7 : 17) * dt;
    if (!state.y && state.vY < 0) state.vY = 0;
  } else if (speed > 0) {
    const sand = hole.sand?.some(rect => contains(rect, state.x, state.z));
    const scale = Math.max(0, 1 - ((sand ? 4.4 : 1.4) / speed + (sand ? 1.05 : .5)) * dt);
    state.vX *= scale;
    state.vZ *= scale;
  }
  state.x += state.vX * dt;
  state.z += state.vZ * dt;
  const edgeX = WIDTH / 2 - BALL_RADIUS, edgeZ = LENGTH / 2 - BALL_RADIUS;
  if (state.y < .27) {
    if (Math.abs(state.x) > edgeX && Math.abs(state.x) < WIDTH / 2 + .35) {
      state.x = Math.sign(state.x) * edgeX;
      state.vX *= -.85;
    }
    if (Math.abs(state.z) > edgeZ && Math.abs(state.z) < LENGTH / 2 + .35) {
      state.z = Math.sign(state.z) * edgeZ;
      state.vZ *= -.85;
    }
  }
  if (Math.abs(state.x) > WIDTH / 2 + .35 || Math.abs(state.z) > LENGTH / 2 + .35) {
    resetBall(state);
    return;
  }
  if (state.y < .62) {
    for (const block of hole.blocks) collide(state, block);
    const moving = holeObstacle(hole, state.time);
    if (moving) collide(state, moving);
  }
  speed = Math.hypot(state.vX, state.vZ);
  if (state.y < .09 && speed < 4.9 && Math.hypot(state.x - hole.cup[0], state.z - hole.cup[1]) < .36) {
    [state.x, state.z] = hole.cup;
    state.vX = state.vZ = 0;
    state.phase = 'holed';
    return;
  }
  if (state.y === 0 && speed < .07) {
    state.vX = state.vZ = 0;
    state.phase = state.strokes >= LIMIT ? 'limit' : 'aim';
  }
}

export const relativeScore = difference => difference === 0 ? 'E' : difference > 0 ? `+${difference}` : String(difference);
export function holeResult(state) {
  if (state.phase === 'limit') return 'Stroke limit';
  if (state.strokes === 1) return 'Hole in one!';
  const delta = state.strokes - state.hole.par;
  return ({ '-2': 'Eagle!', '-1': 'Birdie!', 0: 'Par', 1: 'Bogey', 2: 'Double bogey' })[delta] ?? 'Hole complete';
}
