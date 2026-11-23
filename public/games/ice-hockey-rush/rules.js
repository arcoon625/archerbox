export const RINK = { width: 21, length: 36, corner: 3.4, goalLine: 15.3, goalHalf: 1.77 };
export const PERIOD = 45;
export const OVERTIME = 35;
export const TEAMS = [
  { name: 'Aurora', short: 'AUR', main: '#1977cb', trim: '#8ff3ea' },
  { name: 'Forge', short: 'FOR', main: '#ba382f', trim: '#ffd27b' },
  { name: 'Comets', short: 'COM', main: '#6e4dc5', trim: '#eeceff' },
  { name: 'Rapids', short: 'RAP', main: '#177d6b', trim: '#daee9b' },
];
export const ARENAS = [
  { name: 'Frostline Arena', description: 'A packed indoor rink under blue stadium lights.' },
  { name: 'Harbor Ice Pavilion', description: 'An open-air rink at sunset.' },
  { name: 'Summit Rink', description: 'An outdoor rink ringed by snowy peaks.' },
];
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const length = (x, z) => Math.hypot(x, z);
const direction = side => side === 0 ? -1 : 1;
const goalieZ = side => -direction(side) * (RINK.goalLine - .7);
const distance = (a, b) => length(a.x - b.x, a.z - b.z);
const PLAYER_RADIUS = .48;
const PUCK_RADIUS = .15;

function skater(side, index) {
  return { id: side * 3 + index, side, index, x: 0, z: 0, vx: 0, vz: 0, fx: 0, fz: direction(side), cooldown: 0 };
}

export function createMatch({difficulty = 'rookie', practice = false} = {}) {
  const game = {
    difficulty, practice, phase: 'ready', time: 0, clock: PERIOD, period: 1, delay: 0,
    score: [0, 0], shots: [0, 0], saves: [0, 0], controlled: 0, notice: '',
    skaters: Array.from({length: practice ? 3 : 6}, (_, i) => skater(Math.floor(i / 3), i % 3)),
    goalies: [0, 1].map(side => ({ side, x: 0, z: goalieZ(side) })),
    puck: { x: 0, z: 0, vx: 0, vz: 0, owner: null, ignore: null, ignoreUntil: 0, protectedUntil: 0, receiver: null, shooter: null },
  };
  faceoff(game);
  game.phase = 'ready';
  return game;
}

function faceoff(game) {
  const puck = game.puck;
  game.controlled = 0;
  Object.assign(puck, { x: 0, z: 0, vx: 0, vz: 0, owner: null, ignore: null, ignoreUntil: 0,
    protectedUntil: 0, receiver: null, shooter: null });
  for (const player of game.skaters) {
    const forward = direction(player.side);
    player.x = [0, -4.45, 4.45][player.index] * (player.side === 1 ? -1 : 1);
    player.z = -(player.index === 0 ? (player.side && game.difficulty === 'rookie' ? 2.65 : 1.75) : 4) * forward;
    player.vx = player.vz = player.fx = 0;
    player.fz = forward;
    player.cooldown = 0;
  }
  for (const keeper of game.goalies) keeper.x = 0;
  if (game.practice) {
    givePuck(game, game.skaters[0]);
    game.phase = 'play';
  } else {
    game.phase = 'faceoff';
    game.delay = .85;
    game.notice = game.period === 4 ? 'Overtime · next goal wins' : 'Faceoff';
  }
}

export function start(game) {
  if (game.phase !== 'ready') return;
  faceoff(game);
}

export function insideRink(x, z, margin = 0) {
  const xr = RINK.width / 2 - margin, zr = RINK.length / 2 - margin;
  const ax = Math.abs(x), az = Math.abs(z);
  const cx = RINK.width / 2 - RINK.corner, cz = RINK.length / 2 - RINK.corner;
  return ax <= xr && az <= zr && (ax <= cx || az <= cz || length(ax - cx, az - cz) <= RINK.corner - margin);
}

function constrain(actor, margin, bounce = 0) {
  const xr = RINK.width / 2 - margin, zr = RINK.length / 2 - margin;
  const cx = RINK.width / 2 - RINK.corner, cz = RINK.length / 2 - RINK.corner;
  const dx = Math.abs(actor.x) - cx, dz = Math.abs(actor.z) - cz;
  let nx = 0, nz = 0;
  if (dx > 0 && dz > 0 && length(dx, dz) > RINK.corner - margin) {
    const radius = RINK.corner - margin, d = length(dx, dz);
    nx = Math.sign(actor.x) * dx / d;
    nz = Math.sign(actor.z) * dz / d;
    actor.x = Math.sign(actor.x) * cx + nx * radius;
    actor.z = Math.sign(actor.z) * cz + nz * radius;
  } else if (Math.abs(actor.x) > xr) {
    nx = Math.sign(actor.x);
    actor.x = nx * xr;
  } else if (Math.abs(actor.z) > zr) {
    nz = Math.sign(actor.z);
    actor.z = nz * zr;
  }
  const dot = actor.vx * nx + actor.vz * nz;
  if (dot > 0) {
    actor.vx -= (1 + bounce) * dot * nx;
    actor.vz -= (1 + bounce) * dot * nz;
  }
}

function givePuck(game, player) {
  const puck = game.puck;
  const switched = puck.receiver === player.id && player.side === 0;
  Object.assign(puck, { owner: player.id, vx: 0, vz: 0, receiver: null, shooter: null, protectedUntil: game.time + .48 });
  setPuckOnStick(puck, player);
  if (switched) game.controlled = player.id;
}

function setPuckOnStick(puck, player) {
  puck.x = player.x + player.fx * .77;
  puck.z = player.z + player.fz * .77;
  constrain(puck, PUCK_RADIUS);
}

function aimPlayer(player, target) {
  const dx = target.x - player.x, dz = target.z - player.z;
  const n = length(dx, dz);
  if (n < .04) return;
  player.fx = dx / n;
  player.fz = dz / n;
}

function release(game, player, target, speed, receiver = null) {
  if (game.phase !== 'play' || game.puck.owner !== player.id || distance(player, target) < .05) return false;
  const puck = game.puck;
  aimPlayer(player, target);
  setPuckOnStick(puck, player);
  Object.assign(puck, {
    owner: null, vx: player.fx * speed, vz: player.fz * speed,
    ignore: player.id, ignoreUntil: game.time + .28, receiver, shooter: receiver === null ? player.side : null,
  });
  if (receiver === null) game.shots[player.side]++;
  return true;
}

export function netTarget(game, side) {
  const goalie = game.goalies[1 - side];
  const x = (goalie.x >= .04 ? -1 : 1) * 1.43;
  return { x, z: direction(side) * (RINK.goalLine + 1) };
}

export function shoot(game, target = null, charge = 0) {
  const player = game.skaters[game.controlled];
  return release(game, player, target || netTarget(game, player.side), 15 + 11 * clamp(charge, 0, 1));
}

export function pass(game, target = null) {
  const player = game.skaters[game.controlled];
  const holder = game.skaters[game.puck.owner];
  if (holder && holder !== player && holder.side === player.side) return teamPass(game, holder, player);
  const teammates = game.skaters.filter(mate => mate.side === player.side && mate !== player);
  const contact = target
    ? teammates.reduce((best, mate) => distance(best, target) < distance(mate, target) ? best : mate)
    : teammates.reduce((best, mate) => distance(best, player) < distance(mate, player) ? best : mate);
  return teamPass(game, player, contact);
}

function teamPass(game, from, to) {
  const flight = Math.min(.28, distance(from, to) / 29);
  const target = {x: to.x + to.vx * flight, z: to.z + to.vz * flight};
  return release(game, from, target, 12 + Math.min(7, distance(from, to) * .47), to.id);
}

export function swap(game) {
  if (game.phase !== 'play') return;
  const own = game.skaters.slice(0, 3);
  const owner = own.find(player => player.id === game.puck.owner);
  if (owner) game.controlled = owner.id;
  else {
    const available = own.filter(player => player.id !== game.controlled);
    game.controlled = available.reduce((a, b) => distance(a, game.puck) < distance(b, game.puck) ? a : b).id;
  }
}

function pokePlayer(game, player, range) {
  const puck = game.puck;
  if (game.phase !== 'play' || player.cooldown > game.time) return false;
  player.cooldown = game.time + (player.id === game.controlled ? .55 : .9);
  const holder = game.skaters[puck.owner];
  if (!holder || holder.side === player.side || game.time < puck.protectedUntil || distance(player, puck) > range) return false;
  givePuck(game, player);
  return true;
}

export function poke(game) {
  return pokePlayer(game, game.skaters[game.controlled], 1.9);
}

function skate(player, x, z, speed, dt, aim = null) {
  const n = length(x, z);
  const move = Math.min(1, n);
  const dx = n > 0 ? x / n : 0, dz = n > 0 ? z / n : 0;
  const mix = 1 - Math.exp(-(n ? 8 : 5.3) * dt);
  player.vx += (dx * speed * move - player.vx) * mix;
  player.vz += (dz * speed * move - player.vz) * mix;
  player.x += player.vx * dt;
  player.z += player.vz * dt;
  constrain(player, PLAYER_RADIUS);
  if (aim) aimPlayer(player, aim);
  else if (move > .05) aimPlayer(player, {x: player.x + dx, z: player.z + dz});
}

function drivePlayers(game, input, dt) {
  const {skaters, puck} = game;
  const holder = skaters[puck.owner];
  const human = skaters[game.controlled];
  const speed = game.difficulty === 'pro' ? 7.25 : 5.9;
  const nearest = [0, 1].map(side => skaters.filter(p => p.side === side)
    .reduce((best, p) => !best || distance(p, puck) < distance(best, puck) ? p : best, null));
  for (const player of skaters) {
    const fwd = direction(player.side);
    if (player === human) {
      skate(player, input.x || 0, input.z || 0, input.sprint ? 9.9 : 7.7, dt, puck.owner === player.id ? input.aim : null);
      continue;
    }
    let target, look;
    if (holder === player) {
      const goalDistance = RINK.goalLine - player.z * fwd;
      const shootingLane = Math.abs(player.x) < 5.9 && goalDistance < 8.5 && goalDistance > 1.8;
      if (game.time >= player.cooldown && shootingLane) {
        player.cooldown = game.time + 1.1;
        release(game, player, netTarget(game, player.side), player.side === 0 ? 19 : (game.difficulty === 'pro' ? 21 : 16.8));
      } else if (game.time >= player.cooldown && holder.side === 1 && distance(human, holder) < 2.2) {
        const outlet = skaters.find(p => p.side === 1 && p !== player && (p.z - player.z) * fwd > 1.35 && distance(p, player) < 9);
        if (outlet && teamPass(game, player, outlet)) player.cooldown = game.time + 1.15;
      }
      target = {x: clamp(player.x * .53, -4, 4), z: fwd * 11.4};
      look = target;
    } else if (puck.receiver === player.id && puck.owner === null) {
      target = {x: puck.x + puck.vx * .12, z: puck.z + puck.vz * .12};
      look = puck;
    } else if (holder?.side !== player.side && nearest[player.side] === player) {
      target = {x: puck.x + puck.vx * .12, z: puck.z + puck.vz * .12};
      look = puck;
      const close = distance(player, puck) < (player.side === 1 && game.difficulty === 'rookie' ? 1.05 : 1.36);
      if (close) pokePlayer(game, player, 1.36);
    } else {
      const wing = player.index === 1 ? -1 : player.index === 2 ? 1 : (puck.x > 0 ? -1 : 1);
      target = {
        x: wing * (holder?.side === player.side ? 5.5 : 3.55) + puck.x * .18,
        z: clamp(puck.z + fwd * (holder?.side === player.side ? 3.6 : -4.5), -12.9, 12.9),
      };
      look = puck;
    }
    skate(player, (target.x - player.x) * .75, (target.z - player.z) * .75, player.side === 0 ? 5.85 : speed, dt, look);
  }
  for (const [i, a] of skaters.entries()) {
    for (const b of skaters.slice(i + 1)) {
      const dx = b.x - a.x, dz = b.z - a.z;
      const space = length(dx, dz);
      if (!(space > 0 && space < PLAYER_RADIUS * 1.75)) continue;
      const correction = (PLAYER_RADIUS * 1.75 - space) / (2 * space);
      a.x -= dx * correction; a.z -= dz * correction;
      b.x += dx * correction; b.z += dz * correction;
      constrain(a, PLAYER_RADIUS); constrain(b, PLAYER_RADIUS);
    }
  }
}

function coverNet(game, dt) {
  for (const goalie of game.goalies) {
    const puck = game.puck, gap = Math.abs(puck.z - goalie.z);
    const lookAhead = clamp(gap * .025, .008, .14);
    const available = goalie.side === 0 || game.difficulty === 'pro';
    const track = gap < 12 ? puck.x + puck.vx * lookAhead : puck.x * .35;
    const target = clamp(track * (available ? .53 : .43), -1.35, 1.35);
    goalie.x += clamp(target - goalie.x, -(available ? 3.65 : 2.25) * dt, (available ? 3.65 : 2.25) * dt);
  }
}

function collideGoal(game) {
  const puck = game.puck;
  for (const goalie of game.goalies) {
    const radius = goalie.side === 0 || game.difficulty === 'pro' ? .68 : .61;
    if (distance(goalie, puck) < radius && Math.sign(puck.z - goalie.z || -goalie.z) !== Math.sign(goalie.z)) {
      if (puck.shooter === 1 - goalie.side) game.saves[goalie.side]++;
      const side = Math.sign(puck.x - goalie.x || 1);
      puck.x = goalie.x + side * .45;
      puck.z = goalie.z + direction(goalie.side) * radius;
      puck.vx = side * 4.8;
      puck.vz = direction(goalie.side) * 6.3;
      puck.shooter = null;
      puck.receiver = null;
      return true;
    }
  }
  return false;
}

function goal(game, scorer) {
  game.score[scorer]++;
  game.notice = scorer === 0 ? 'Goal!' : 'Opponent scores';
  game.puck.vx = game.puck.vz = 0;
  game.phase = 'goal';
  game.delay = 1.45;
}

function slidePuck(game, dt) {
  const puck = game.puck, oldZ = puck.z;
  puck.x += puck.vx * dt;
  puck.z += puck.vz * dt;
  const damping = Math.exp(-.46 * dt);
  puck.vx *= damping; puck.vz *= damping;
  for (const [x,z] of [[-RINK.goalHalf, -RINK.goalLine], [RINK.goalHalf, -RINK.goalLine], [-RINK.goalHalf, RINK.goalLine], [RINK.goalHalf, RINK.goalLine]]) {
    const dx = puck.x - x, dz = puck.z - z, n = length(dx, dz);
    if (n > .001 && n < .25) {
      puck.x = x + dx * .25 / n; puck.z = z + dz * .25 / n;
      const dot = (puck.vx * dx + puck.vz * dz) / n;
      if (dot < 0) {
        puck.vx -= 1.73 * dot * dx / n;
        puck.vz -= 1.73 * dot * dz / n;
      }
    }
  }
  if (collideGoal(game)) return;
  const line = RINK.goalLine + PUCK_RADIUS;
  if (Math.abs(puck.x) < RINK.goalHalf - PUCK_RADIUS && Math.abs(oldZ) < line && Math.abs(puck.z) >= line) {
    goal(game, puck.z < 0 ? 0 : 1);
    return;
  }
  constrain(puck, PUCK_RADIUS, .83);
  const speed = length(puck.vx, puck.vz);
  for (const player of game.skaters) {
    if (player.id === puck.ignore && game.time < puck.ignoreUntil) continue;
    const d = distance(player, puck);
    if (d < (puck.receiver === player.id ? 1.05 : .78) && (speed < 12.1 || puck.receiver === player.id)) {
      givePuck(game, player);
      return;
    }
    if (d > .02 && d < .44 && speed >= 12.1) {
      const nx = (puck.x - player.x) / d, nz = (puck.z - player.z) / d;
      const dot = puck.vx * nx + puck.vz * nz;
      if (dot < 0) {
        puck.vx -= 1.5 * dot * nx;
        puck.vz -= 1.5 * dot * nz;
        puck.receiver = null;
      }
    }
  }
}

function advancePhase(game, dt) {
  if (game.phase === 'ready' || game.phase === 'finished') return;
  game.delay -= dt;
  if (game.delay > 0) return;
  if (game.phase === 'goal' && game.period === 4) game.phase = 'finished';
  else if (game.phase === 'faceoff') {
    game.phase = 'play';
    game.notice = '';
    if (game.difficulty === 'rookie' && game.period === 1 && game.clock === PERIOD) givePuck(game, game.skaters[0]);
  } else faceoff(game);
}

export function tick(game, input, dt) {
  game.time += dt;
  if (game.phase !== 'play') {
    advancePhase(game, dt);
    return;
  }
  if (!game.practice) {
    game.clock = Math.max(0, game.clock - dt);
    if (game.clock === 0) {
      if (game.period === 4 || (game.period === 3 && game.score[0] !== game.score[1])) {
        game.phase = 'finished';
        return;
      }
      game.period++;
      game.clock = game.period === 4 ? OVERTIME : PERIOD;
      game.phase = 'break';
      game.notice = game.period === 4 ? 'Overtime · next goal wins' : 'End of period';
      game.delay = 1.8;
      return;
    }
  }
  drivePlayers(game, input, dt);
  coverNet(game, dt);
  const puck = game.puck;
  if (puck.owner !== null) setPuckOnStick(puck, game.skaters[puck.owner]);
  else slidePuck(game, dt);
}
