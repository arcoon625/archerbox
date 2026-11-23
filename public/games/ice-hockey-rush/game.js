import * as T from '../../vendor/three.module.js';
import {createCoinRun} from '../../economy/wallet.js?v=hockey1';
import { ARENAS, TEAMS, RINK, clamp, createMatch, netTarget, pass, poke, shoot, start, swap, tick } from './rules.js';
import {buildRink} from './rink.js';

const $ = id => document.getElementById(id);
const canvas = $('world'), menu = $('menu');
const STEP = 1 / 120, RECORD = 'archerbox-ice-hockey-record-v1';
const coinRun = createCoinRun('ice-hockey-rush');
const raycaster = new T.Raycaster(), cursor = new T.Vector2(), intersection = new T.Vector3();
const floor = new T.Plane(new T.Vector3(0, 1, 0), 0);
const keys = new Set();

let renderer, camera, rink, game, last, accumulator = 0, top = false, manualAim = null;
let charging = false, power = 0, padId = null;
let touch = {x: 0,z: 0};
let teams = [0, 1], mute = false, audio, nextHud = 0;
let record = { wins: 0, losses: 0, draws: 0 };
try {
  const saved = JSON.parse(localStorage.getItem(RECORD));
  if ([saved?.wins, saved?.losses, saved?.draws].every(value => Number.isSafeInteger(value) && value >= 0)) record = saved;
} catch {}

function sound(type) {
  if (mute || !audio) return;
  const start = audio.currentTime, osc = audio.createOscillator(), gain = audio.createGain();
  const presets = {
    shoot: [137, 66, .13, .06, 'triangle'],
    pass: [218, 110, .09, .033, 'triangle'],
    poke: [260, 150, .09, .03, 'triangle'],
    goal: [440, 755, .42, .055, 'triangle'],
    against: [180, 108, .32, .046, 'triangle'],
    drop: [825, 660, .15, .015, 'sine'],
  };
  const [from, to, length, volume, shape] = presets[type];
  osc.type = shape;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + length);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(.001, start + length);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + length + .02);
}

function unlockAudio() {
  if (mute) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audio ??= new Audio();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
  } catch {}
}

function fit() {
  const {width, height} = canvas.getBoundingClientRect();
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.fov = camera.aspect < .92 ? 51 : 44;
  if (top) camera.position.set(0, 49, .75);
  else if (camera.aspect < .86) camera.position.set(4.3, 35, 29);
  else camera.position.set(11.1, 23.8, 37.2);
  camera.lookAt(0, .14, -1);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  // Keep the playable ice inside the visible area at narrow phone and tablet widths.
  const bound = new T.Vector3();
  let scale = 1;
  for (const x of [-RINK.width / 2,RINK.width / 2]) {
    for (const z of [-RINK.length / 2,RINK.length / 2]) {
      bound.set(x,0,z).project(camera);
      scale = Math.max(scale, Math.abs(bound.x) / .95, Math.abs(bound.y) / .95);
    }
  }
  if (scale > 1) {
    camera.fov = T.MathUtils.radToDeg(2 * Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov) / 2) * scale));
    camera.updateProjectionMatrix();
  }
  renderer.setSize(width, height, false);
}

function clearControls() {
  keys.clear();
  charging = false;
  power = 0;
  padId = null;
  touch = {x: 0,z: 0};
  $('stick').firstElementChild.style.transform = '';
  $('charge').firstElementChild.style.width = '0';
}

function setup(practice = false, preview = false) {
  const team = Number($('team').value);
  teams = [team, team === 1 ? 0 : 1];
  const arena = Number($('arena').value);
  rink?.dispose();
  game = createMatch({difficulty: $('difficulty').value, practice});
  rink = buildRink(arena, teams, game);
  $('homeName').textContent = TEAMS[teams[0]].name;
  $('awayName').textContent = TEAMS[teams[1]].name;
  $('rinkName').textContent = ARENAS[arena].name;
  document.querySelector('.own').style.setProperty('--team', TEAMS[teams[0]].main);
  document.querySelector('.away').style.setProperty('--team', TEAMS[teams[1]].main);
  $('result').hidden = true;
  clearControls();
  setAim(null);
  accumulator = 0;
  nextHud = 0;
  if (!preview) {
    if (!practice) coinRun.begin();
    if (menu.open) menu.close();
    unlockAudio();
    start(game);
    canvas.focus({preventScroll: true});
  }
  hud();
  fit();
}

function formatClock(value) {
  const sec = Math.ceil(value);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

function hud() {
  const {score, clock, period, phase, practice, puck} = game;
  const human = puck.owner === game.controlled;
  $('homeScore').textContent = score[0];
  $('awayScore').textContent = score[1];
  $('period').textContent = practice ? 'Practice' : period === 4 ? 'Overtime' : 'Period ' + period;
  $('clock').textContent = practice ? '—' : formatClock(clock);
  $('setup').hidden = phase !== 'ready';
  $('stats').hidden = phase === 'ready';
  $('shots').textContent = game.shots[0];
  $('saves').textContent = game.saves[0];
  const owner = game.skaters[puck.owner];
  const live = phase === 'play';
  $('possession').textContent = !live ? 'Ready' : human ? 'You have the puck' :
    owner ? (owner.side === 0 ? 'Team has puck' : 'Opponent has puck') : 'Loose puck';
  $('possession').classList.toggle('active', human && live);
  $('shoot').disabled = !live || !human;
  $('pass').disabled = !live || owner?.side !== 0;
  $('poke').disabled = !live || human;
  $('swap').disabled = !live || human;
  $('aim').disabled = !live;
  $('announcement').textContent = game.notice;
  $('announcement').hidden = !game.notice || phase === 'ready' || phase === 'finished';
  $('record').textContent = record.wins + record.losses + record.draws ? `Your record · ${record.wins} W · ${record.losses} L · ${record.draws} D` : 'Play a match to start your record.';
}

function finish() {
  if (game.score[0] > game.score[1]) {
    record.wins++;
    $('resultTitle').textContent = TEAMS[teams[0]].name + ' wins!';
    coinRun.once('win');
  } else if (game.score[0] < game.score[1]) {
    record.losses++;
    $('resultTitle').textContent = TEAMS[teams[1]].name + ' wins';
  } else {
    record.draws++;
    $('resultTitle').textContent = 'Match tied';
  }
  try { localStorage.setItem(RECORD, JSON.stringify(record)); } catch {}
  $('finalScore').textContent = game.score.join(' – ');
  $('matchStats').textContent = `${game.shots[0]} shots · ${game.saves[0]} goalie saves`;
  $('result').hidden = false;
  $('status').textContent = $('resultTitle').textContent + ' ' + $('finalScore').textContent;
  $('rematch').focus({preventScroll: true});
}

function setAim(target) {
  manualAim = target;
  $('aim').setAttribute('aria-pressed', !target);
  $('aim').textContent = target ? 'Reset aim' : 'Auto aim';
}

function aimWith(event) {
  if (event.button !== 0 || game.phase !== 'play') return;
  const rect = canvas.getBoundingClientRect();
  cursor.set(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height);
  raycaster.setFromCamera(cursor, camera);
  if (raycaster.ray.intersectPlane(floor, intersection)) {
    setAim({x: clamp(intersection.x, -RINK.width / 2, RINK.width / 2), z: clamp(intersection.z, -RINK.length / 2, RINK.length / 2)});
  }
}

function chargeStart() {
  if (game.phase !== 'play' || game.puck.owner !== game.controlled || menu.open) return;
  unlockAudio();
  charging = true;
  power = 0;
}
function chargeRelease() {
  if (!charging) return;
  charging = false;
  if (shoot(game, manualAim, power)) sound('shoot');
  power = 0;
  hud();
}
function action(command) {
  if (menu.open || game.phase !== 'play') return;
  unlockAudio();
  if (command === 'pass' && pass(game, manualAim)) sound('pass');
  if (command === 'poke' && poke(game)) sound('poke');
  if (command === 'swap') swap(game);
  hud();
}

function joystick(event) {
  const rect = $('stick').getBoundingClientRect();
  const dx = (event.clientX - rect.left - rect.width / 2) / 30;
  const dz = (event.clientY - rect.top - rect.height / 2) / 30;
  const scale = 1 / Math.max(1, Math.hypot(dx, dz));
  touch = {x: dx * scale, z: dz * scale};
  $('stick').firstElementChild.style.transform = `translate(${touch.x * 26}px,${touch.z * 26}px)`;
}

function bind() {
  for (const [list, entries] of [[$('arena'), ARENAS], [$('team'), TEAMS]]) {
    entries.forEach((entry, i) => list.append(new Option(entry.name, i)));
  }
  $('arenaNote').textContent = ARENAS[0].description;
  $('arena').onchange = () => {
    $('arenaNote').textContent = ARENAS[Number($('arena').value)].description;
    if (game.phase === 'ready') setup(false, true);
  };
  $('team').onchange = () => { if (game.phase === 'ready') setup(false, true); };
  const openMenu = () => {
    if (menu.open) return;
    clearControls();
    menu.showModal();
  };
  $('options').onclick = $('resultOptions').onclick = openMenu;
  $('close').onclick = () => menu.close();
  $('play').onclick = $('menuPlay').onclick = $('rematch').onclick = () => setup();
  $('practice').onclick = $('menuPractice').onclick = () => setup(true);
  $('sound').onclick = () => {
    mute = !mute;
    if (!mute) unlockAudio();
    $('sound').textContent = mute ? 'Sound off' : 'Sound on';
    $('sound').setAttribute('aria-pressed', !mute);
  };
  $('view').onclick = () => {
    top = !top;
    $('view').textContent = top ? 'Rink view' : 'Top view';
    $('view').setAttribute('aria-pressed', top);
    fit();
  };
  $('aim').onclick = () => setAim(null);
  canvas.addEventListener('pointerdown', aimWith);
  for (const command of ['pass','poke','swap']) $(command).onclick = () => action(command);
  $('shoot').addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    $('shoot').setPointerCapture(e.pointerId);
    chargeStart();
  });
  $('shoot').addEventListener('pointerup', chargeRelease);
  $('shoot').addEventListener('pointercancel', () => { charging = false; power = 0; });
  $('shoot').onclick = event => {
    if (event.detail === 0) { chargeStart(); chargeRelease(); }
  };
  $('stick').addEventListener('pointerdown', event => {
    if (padId !== null || game.phase !== 'play') return;
    padId = event.pointerId;
    $('stick').setPointerCapture(padId);
    joystick(event);
  });
  $('stick').addEventListener('pointermove', event => {
    if (padId === event.pointerId) joystick(event);
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) $('stick').addEventListener(type, event => {
    if (padId !== event.pointerId) return;
    padId = null;
    touch = {x: 0,z: 0};
    $('stick').firstElementChild.style.transform = '';
  });
  window.addEventListener('blur', clearControls);
  window.addEventListener('keydown', event => {
    if (menu.open || event.altKey || event.metaKey || event.ctrlKey || event.target.closest?.('input,select')) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      openMenu();
      return;
    }
    if (key === ' ' && !event.target.closest?.('button')) {
      event.preventDefault();
      if (!event.repeat) chargeStart();
    } else if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)) {
      keys.add(key);
      event.preventDefault();
    } else if (!event.repeat && ['e','f','q'].includes(key)) {
      action({e: 'pass',f: 'poke',q: 'swap'}[key]);
    }
  });
  window.addEventListener('keyup', event => {
    keys.delete(event.key.toLowerCase());
    if (event.code === 'Space' && !event.target.closest?.('button')) chargeRelease();
  });
}

function input() {
  const has = (a,b) => keys.has(a) || keys.has(b) ? 1 : 0;
  return {
    x: touch.x || has('d','arrowright') - has('a','arrowleft'),
    z: touch.z || has('s','arrowdown') - has('w','arrowup'),
    sprint: keys.has('shift') || Math.hypot(touch.x, touch.z) > .92,
    aim: manualAim,
  };
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = last === undefined ? 0 : clamp((now-last)/1000,0,.07);
  last = now;
  if (!menu.open && game.phase !== 'finished') {
    const phase = game.phase;
    accumulator += dt;
    const signals = input();
    while (accumulator >= STEP) { tick(game, signals, STEP); accumulator -= STEP; }
    if (charging) {
      if (game.puck.owner !== game.controlled) { charging = false; power = 0; }
      else power = Math.min(1, power + dt * 1.55);
    }
    if (phase !== game.phase) {
      if (game.phase === 'goal') {
        sound(game.notice === 'Goal!' ? 'goal' : 'against');
        setAim(null);
        clearControls();
      }
      if (game.phase === 'faceoff') sound('drop');
      if (game.phase === 'finished') finish();
      if (game.notice) $('status').textContent = game.notice;
      hud();
    }
    if (now > nextHud) { hud(); nextHud = now + 120; }
  }
  $('charge').firstElementChild.style.width = (power * 100).toFixed(0) + '%';
  rink.update(game, manualAim || netTarget(game,0), charging);
  renderer.render(rink.scene,camera);
}

try {
  renderer = new T.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  camera = new T.PerspectiveCamera(44,1,.1,155);
  bind();
  setup(false,true);
  new ResizeObserver(fit).observe(canvas);
  requestAnimationFrame(frame);
} catch (error) {
  console.error('Unable to load the 3D rink', error);
  $('announcement').textContent = 'The 3D rink could not load. Try a browser with WebGL.';
  $('announcement').hidden = false;
  for (const button of document.querySelectorAll('main button')) button.disabled = true;
}
