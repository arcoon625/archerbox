import {HOLES, createHole, golfRange, putt, step} from '../public/games/mini-golf/rules.js';

const STEP = 1 / 120;
const DISTANCE_TIE = .025;

export function createGolfMatch(track) {
  const {start, end} = golfRange(track);
  return {
    start, end, hole: start, turn: 0, honors: 0, token: 0, phase: 'aim',
    time: 0, remainder: 0, pause: 0, winner: null, scorecards: [[], []],
    balls: [createHole(HOLES[start]), createHole(HOLES[start])],
  };
}

export function playGolfShot(match, seat, args) {
  if (match.phase !== 'aim' || seat !== match.turn || args.token !== match.token) return false;
  const {angle, power} = args;
  if (!Number.isFinite(angle) || !Number.isFinite(power) || power < 5 || power > 100) return false;
  const ball = match.balls[seat];
  ball.time = match.time;
  if (!putt(ball, Math.atan2(Math.sin(angle), Math.cos(angle)), power)) return false;
  match.token++;
  match.phase = 'rolling';
  return true;
}

function settleShot(match) {
  const seat = match.turn;
  const other = 1 - seat;
  const ball = match.balls[seat];
  const friend = match.balls[other];
  const playerDone = ball.phase !== 'aim';
  const friendDone = friend.phase !== 'aim';

  if (playerDone) match.scorecards[seat].push(ball.strokes);
  if (playerDone && friendDone) {
    if (match.hole + 1 === match.end) {
      const totals = match.scorecards.map(card => card.reduce((sum, strokes) => sum + strokes, 0));
      match.winner = totals[0] === totals[1] ? null : Number(totals[1] < totals[0]);
      match.phase = 'finished';
    } else {
      match.phase = 'hole-complete';
      match.pause = 3.5;
    }
    return;
  }

  if (playerDone) match.turn = other;
  else if (!friendDone) {
    const [x, z] = ball.hole.cup;
    const difference = Math.hypot(friend.x - x, friend.z - z) - Math.hypot(ball.x - x, ball.z - z);
    // Both players tee off before the player farther from the cup plays next.
    if (friend.strokes === 0 || difference >= -DISTANCE_TIE) match.turn = other;
  }
  match.phase = 'aim';
}

function nextHole(match) {
  const index = match.hole - match.start;
  const a = match.scorecards[0][index], b = match.scorecards[1][index];
  if (a !== b) match.honors = Number(b < a);
  match.turn = match.honors;
  match.hole++;
  match.token++;
  match.balls = [createHole(HOLES[match.hole]), createHole(HOLES[match.hole])];
  match.phase = 'aim';
  match.time = 0;
}

export function advanceGolf(match, elapsed) {
  match.remainder += elapsed;
  while (match.remainder >= STEP && match.phase !== 'finished') {
    match.remainder -= STEP;
    if (match.phase === 'hole-complete') {
      match.pause -= STEP;
      if (match.pause <= 0) nextHole(match);
    } else if (match.phase === 'rolling') {
      const ball = match.balls[match.turn];
      step(ball, STEP);
      match.time = ball.time;
      if (ball.phase !== 'rolling') settleShot(match);
    } else match.time += STEP;
  }
}

export function golfMatchView(match) {
  return {
    start: match.start, end: match.end, hole: match.hole, turn: match.turn, token: match.token,
    phase: match.phase, time: match.time, winner: match.winner, scorecards: match.scorecards.map(card => card.slice()),
    balls: match.balls.map(({x, y, z, phase, strokes, notice}) => ({x, y, z, phase, strokes, notice})),
  };
}

export const fullGolfRound = room =>
  room.game === 'mini-golf' && room.status === 'finished' &&
  room.match?.phase === 'finished' && room.match.end - room.match.start === HOLES.length;
