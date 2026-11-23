import * as T from '../../vendor/three.module.js';
import {createCoinRun} from '../../economy/wallet.js?v=golf1';
import {connectMatch} from '../../multiplayer/client.js?v=golf-friends1';
import {COURSES, HOLES, aimAt, clamp, createHole, golfRange, holeResult, putt, relativeScore, step} from './rules.js?v=golf-friends1';
import {makeCourse} from './course.js?v=golf-friends1';

const $ = id => document.getElementById(id);
const canvas = $('world');
const menu = $('courseMenu');
const coinRun = createCoinRun('mini-golf');
const friendRound = /^[a-f0-9-]{36}$/.test(new URLSearchParams(location.search).get('room') || '');
const STORE = 'archerbox-mini-golf-best-v1';
const FIXED_STEP = 1 / 120;
const ray = new T.Raycaster();
const cursor = new T.Vector2();
const ground = new T.Plane(new T.Vector3(0, 1, 0), 0);
const worldPoint = new T.Vector3();

let renderer, camera, course, state, angle, drag, frameTime, accumulator = 0;
let holeId = 0, startId = 0, finishId = HOLES.length, practice = false, topView = false;
let scores = [], best = null;
let net, remote, room, pendingToken = null, previousCard = '', closedMessage = '';
let renderedBalls = [null, null];
try {
  const saved = Number(localStorage.getItem(STORE));
  if (Number.isInteger(saved) && saved >= HOLES.length && saved <= HOLES.length * 10) best = saved;
} catch {}

function canPutt() {
  return friendRound
    ? net?.running && remote?.phase === 'aim' && remote.turn === room?.seat && pendingToken === null
    : state.phase === 'aim';
}

const opponent = () => room?.players.find(player => !player.you)?.name || 'Your friend';
const total = card => card.reduce((sum, strokes) => sum + strokes, 0);
const scoreAt = (match, seat, i) => match.scorecards[seat][i] ??
  (i === match.hole - match.start ? match.balls[seat].strokes || '–' : '–');

function scorecard() {
  const {hole, strokes, phase} = state;
  const theme = COURSES[hole.course];
  $('courseName').textContent = theme.name;
  $('courseName').style.color = theme.color;
  $('holeName').textContent = hole.name;
  $('holeNumber').textContent = (holeId - startId + 1) + '/' + (finishId - startId);
  $('par').textContent = hole.par;
  $('strokes').textContent = strokes;
  $('mode').textContent = friendRound ? 'Friend match' : practice ? 'Practice' : 'Full round';
  $('best').textContent = friendRound ? 'Fewest total strokes wins.' :
    best === null ? 'Finish a full round to set your best.' : 'Best full round · ' + best + ' strokes';
  const seat = room?.seat;
  const friendScores = $('matchPlayers');
  friendScores.hidden = !friendRound || !room;
  if (!friendScores.hidden) {
    friendScores.replaceChildren(...['You', opponent()].map((name, order) => {
      const slot = order === 0 ? seat : 1 - seat;
      const box = document.createElement('div');
      if (order === 1) box.className = 'friendScore';
      const label = document.createElement('span');
      label.textContent = name;
      const count = document.createElement('b');
      const card = remote?.scorecards[slot] || [];
      const current = remote && card.length === holeId - startId ? remote.balls[slot].strokes : 0;
      count.textContent = total(card) + current;
      box.append(label, count);
      return box;
    }));
  }
  $('round').replaceChildren(...HOLES.slice(startId, finishId).map((entry, i) => {
    const row = document.createElement('li');
    row.append(i + 1);
    const score = document.createElement('b');
    score.textContent = remote ? scoreAt(remote, seat, i) : scores[i] ?? '–';
    row.append(score);
    if (remote) {
      const other = document.createElement('b');
      other.className = 'friendStroke';
      other.textContent = scoreAt(remote, 1 - seat, i);
      row.append(other);
      row.setAttribute('aria-label', `Hole ${i + 1}, par ${entry.par}, you ${score.textContent}, ${opponent()} ${other.textContent}`);
    } else row.setAttribute('aria-label', `Hole ${i + 1}, par ${entry.par}, ${scores[i] ?? 'unplayed'}`);
    if (i + startId === holeId) row.setAttribute('aria-current', 'step');
    return row;
  }));
  const ready = canPutt();
  for (const id of ['putt','power','left','right']) $(id).disabled = !ready;
  $('hint').textContent = ready ? 'Tap the green to aim, then set your power and putt.' :
    phase === 'rolling' ? 'Ball rolling…' : friendRound ? 'Watch the green and check both scores.' : 'Your score is on the card.';
  const turnNotice = $('turnNotice');
  turnNotice.hidden = !friendRound;
  if (friendRound) {
    const message = closedMessage ? 'Match ended' : !room || room.status === 'waiting' ? 'Get ready to tee off' :
      room.status === 'countdown' ? 'Teeing off together…' : room.status === 'finished' ? 'Round complete' :
      remote.phase === 'hole-complete' ? 'Both players finished the hole' :
      remote.phase === 'rolling' ? (remote.turn === seat ? 'Your ball is rolling' : opponent() + ' is putting') :
      room.controlling === false ? 'Use Play in this tab to take over' :
      pendingToken !== null ? 'Sending your putt…' : ready ? 'Your turn' : opponent() + '’s turn';
    if (turnNotice.textContent !== message) turnNotice.textContent = message;
  }
}

function orient() {
  const {width, height} = canvas.getBoundingClientRect();
  if (!(width && height)) return;
  camera.aspect = width / height;
  const narrow = camera.aspect < .94;
  camera.fov = narrow ? 51 : 43;
  if (topView) {
    camera.position.set(0, 31, 1.1);
    camera.lookAt(0, 0, -.2);
  } else {
    camera.position.set(...(narrow ? [4.1, 25, 17.1] : [9.8, 16.7, 22.5]));
    camera.lookAt(0, .18, -.3);
  }
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function setPower(value) {
  $('power').value = String(clamp(Math.round(value), 5, 100));
  $('powerValue').textContent = $('power').value + '%';
}

function loadHole(id) {
  holeId = id;
  course?.dispose();
  state = createHole(HOLES[id]);
  course = makeCourse(state.hole, friendRound);
  renderedBalls = [null, null];
  angle = aimAt(state.x, state.z, ...state.hole.cup);
  accumulator = 0;
  drag = null;
  setPower(id === 0 ? 72 : 60);
  $('result').hidden = true;
  $('fieldNotice').textContent = '';
  $('fieldNotice').hidden = true;
  scorecard();
  orient();
}

function begin(which = null) {
  practice = which !== null;
  startId = practice ? which * 2 : 0;
  finishId = practice ? startId + 2 : HOLES.length;
  scores = [];
  if (!practice) coinRun.begin();
  if (menu.open) menu.close();
  loadHole(startId);
  canvas.focus({preventScroll: true});
}

function shoot() {
  if (!canPutt()) return;
  const power = Number($('power').value);
  if (friendRound) {
    pendingToken = remote.token;
    net.event('putt', {angle, power, token: pendingToken});
  } else if (!putt(state, angle, power)) return;
  drag = null;
  $('fieldNotice').hidden = true;
  scorecard();
  if (!friendRound) $('status').textContent = 'Stroke ' + state.strokes;
}

function showFriendResult(title, message, final) {
  $('result').hidden = false;
  $('resultInfo').textContent = final ? 'FRIEND MATCH' : 'HOLE COMPLETE';
  $('resultTitle').textContent = title;
  $('resultScore').textContent = message;
  $('next').hidden = !final;
  $('next').textContent = 'Back to Lobby';
  $('resultCourses').hidden = true;
  if (final) $('next').focus({preventScroll: true});
}

function receiveRoom(data) {
  room = data;
  const match = data.match;
  const previous = remote;
  const seat = room.seat;
  remote = match;
  if (pendingToken !== match.token || !data.controlling) pendingToken = null;
  $('readyGolf').hidden = true;
  startId = match.start;
  finishId = match.end;
  if (!previous || holeId !== match.hole) loadHole(match.hole);
  state = {...match.balls[seat], hole: HOLES[holeId], time: match.time};
  if (match.phase === 'aim' && match.turn === seat &&
      (previous?.phase !== 'aim' || previous.turn !== seat || previous.hole !== match.hole)) {
    angle = aimAt(state.x, state.z, ...state.hole.cup);
    if (document.activeElement === document.body || document.activeElement === $('readyGolf')) canvas.focus({preventScroll: true});
  }

  const card = JSON.stringify([data.status, data.controlling, match.hole, match.turn, match.phase, match.token,
    match.balls.map(ball => [ball.strokes,ball.phase]), pendingToken]);
  if (card !== previousCard) {
    previousCard = card;
    scorecard();
  }
  if (data.status === 'finished' && previous?.phase !== 'finished') {
    const totals = match.scorecards.map(total);
    const title = match.winner === null ? 'Tie game!' : match.winner === seat ? 'You win!' : opponent() + ' wins!';
    showFriendResult(title, `You ${totals[seat]} · ${opponent()} ${totals[1 - seat]} strokes`, true);
    if (match.end - match.start === HOLES.length) coinRun.once('finish');
  } else if (match.phase === 'hole-complete' && previous?.phase !== 'hole-complete') {
    showFriendResult('On to the next hole', `You ${match.balls[seat].strokes} · ${opponent()} ${match.balls[1 - seat].strokes} strokes`, false);
  }
}

function connectGolf() {
  $('golfConnection').hidden = false;
  $('courses').hidden = true;
  $('friendPlay').hidden = true;
  coinRun.begin();
  net = connectMatch({
    game: 'mini-golf', startButton: 'readyGolf', mount: $('golfConnectionStatus'),
    onWaiting(data) {
      const first = !room;
      room = data;
      const range = golfRange(data.track);
      startId = range.start;
      finishId = range.end;
      if (first || holeId !== range.start) loadHole(range.start);
    },
    onRoom: receiveRoom,
    onClosed(data) {
      closedMessage = data.message || 'Your friend left this round.';
      $('readyGolf').hidden = true;
      room = data;
      scorecard();
      showFriendResult('Match ended', closedMessage, true);
    },
  });
}

function finish() {
  scores.push(state.strokes);
  const last = holeId + 1 === finishId;
  const title = holeResult(state);
  const total = scores.reduce((a, b) => a + b, 0);
  const playedPar = HOLES.slice(startId, holeId + 1).reduce((a, hole) => a + hole.par, 0);
  const newRecord = last && !practice && (best === null || total < best);
  if (newRecord) {
    best = total;
    try { localStorage.setItem(STORE, String(best)); } catch {}
  }
  if (last && !practice) coinRun.once('finish');
  scorecard();
  $('result').hidden = false;
  $('resultInfo').textContent = newRecord ? 'NEW PERSONAL BEST' : title.toUpperCase();
  $('resultTitle').textContent = last ? (practice ? 'Practice complete' : 'Round complete') : title;
  $('resultScore').textContent = last ?
    `${total} strokes · ${relativeScore(total - playedPar)} to par` :
    `${state.strokes} ${state.strokes === 1 ? 'stroke' : 'strokes'} · Par ${state.hole.par}`;
  $('next').textContent = last ? 'Play again ↻' : 'Next hole →';
  $('status').textContent = $('resultTitle').textContent + ' ' + $('resultScore').textContent;
  $('next').focus({preventScroll: true});
}

function groundAt(event) {
  const box = canvas.getBoundingClientRect();
  cursor.set(2 * (event.clientX - box.left) / box.width - 1, 1 - 2 * (event.clientY - box.top) / box.height);
  ray.setFromCamera(cursor, camera);
  return ray.ray.intersectPlane(ground, worldPoint);
}

function pointerAim(event) {
  const point = groundAt(event);
  if (!point) return;
  if (drag.fromBall) {
    const pull = Math.hypot(point.x - state.x, point.z - state.z);
    if (pull < .25) return;
    angle = aimAt(point.x, point.z, state.x, state.z);
    setPower(pull * 19);
  } else if (Math.hypot(point.x - state.x, point.z - state.z) > .4) {
    angle = aimAt(state.x, state.z, point.x, point.z);
  }
}

function bind() {
  const turn = amount => { if (canPutt()) angle += amount; };
  $('left').onclick = () => turn(-.105);
  $('right').onclick = () => turn(.105);
  $('power').oninput = () => setPower(Number($('power').value));
  $('putt').onclick = shoot;
  $('view').onclick = () => {
    topView = !topView;
    $('view').setAttribute('aria-pressed', topView);
    $('view').textContent = topView ? 'Course view' : 'Top view';
    orient();
  };
  const openCourses = () => { if (!menu.open) menu.showModal(); };
  $('courses').onclick = $('resultCourses').onclick = openCourses;
  $('friendPlay').onclick = () => {
    if (window.parent === window) location.assign('../../#friends/mini-golf');
    else window.parent.postMessage({type: 'archerbox:golf-friends'}, location.origin);
  };
  $('closeMenu').onclick = () => menu.close();
  $('fullRound').onclick = () => begin();
  $('next').onclick = () => {
    if (friendRound) { net?.leave(); return; }
    if (holeId + 1 < finishId) {
      loadHole(holeId + 1);
      canvas.focus({preventScroll: true});
    } else begin(practice ? HOLES[holeId].course : null);
  };
  COURSES.forEach((theme, i) => {
    const item = document.createElement('button');
    item.type = 'button';
    const name = document.createElement('strong');
    name.textContent = theme.name;
    name.style.color = theme.color;
    const note = document.createElement('small');
    note.textContent = theme.note;
    item.append(name, note);
    item.onclick = () => begin(i);
    $('courseChoices').append(item);
  });
  canvas.addEventListener('pointerdown', event => {
    if (!canPutt() || drag || event.button !== 0) return;
    const point = groundAt(event);
    if (!point) return;
    drag = {
      id: event.pointerId, x: event.clientX, y: event.clientY, angle, power: Number($('power').value),
      fromBall: Math.hypot(point.x - state.x, point.z - state.z) < .70,
    };
    canvas.setPointerCapture(event.pointerId);
    if (!drag.fromBall) pointerAim(event);
  });
  canvas.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) pointerAim(event);
  });
  canvas.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    const shot = drag.fromBall && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 10;
    pointerAim(event);
    drag = null;
    if (shot) shoot();
  });
  canvas.addEventListener('pointercancel', event => {
    if (drag?.id !== event.pointerId) return;
    angle = drag.angle;
    setPower(drag.power);
    drag = null;
  });
  window.addEventListener('keydown', event => {
    if (menu.open || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input')) return;
    const key = event.key.toLowerCase();
    if (!canPutt()) return;
    if (['a','arrowleft'].includes(key)) turn(-.047);
    else if (['d','arrowright'].includes(key)) turn(.047);
    else if (['w','arrowup'].includes(key)) setPower(Number($('power').value) + 2);
    else if (['s','arrowdown'].includes(key)) setPower(Number($('power').value) - 2);
    else if (event.code === 'Space' && !event.repeat && !event.target.closest?.('button')) shoot();
    else return;
    event.preventDefault();
  });
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = frameTime === undefined ? 0 : clamp((now - frameTime) / 1000, 0, .058);
  frameTime = now;
  if (!friendRound && !menu.open && $('result').hidden) {
    accumulator += dt;
    const before = state.phase;
    while (accumulator >= FIXED_STEP) {
      step(state, FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
    if (before !== state.phase) {
      if (state.phase === 'holed' || state.phase === 'limit') finish();
      else if (state.phase === 'aim') {
        scorecard();
        $('status').textContent = state.notice || 'Ready for the next putt.';
      }
    }
    if (state.notice !== $('fieldNotice').textContent || $('fieldNotice').hidden === Boolean(state.notice)) {
      $('fieldNotice').textContent = state.notice;
      $('fieldNotice').hidden = !state.notice;
    }
  }
  if (remote) {
    const rendered = remote.balls.map((ball, seat) => {
      const last = renderedBalls[seat];
      if (!last || last.phase !== 'rolling' || ball.phase !== 'rolling') return {...ball};
      const t = 1 - Math.exp(-dt * 36);
      return {...ball, x: last.x + (ball.x - last.x) * t, y: last.y + (ball.y - last.y) * t, z: last.z + (ball.z - last.z) * t};
    });
    renderedBalls = rendered;
    const notice = remote.balls[remote.turn].notice;
    if ($('fieldNotice').textContent !== notice) {
      $('fieldNotice').textContent = notice;
      $('fieldNotice').hidden = !notice;
    }
    course.update({...rendered[room.seat], time: remote.time}, angle, Number($('power').value),
      canPutt(), rendered[1 - room.seat], remote.turn !== room.seat);
  } else course.update(state, angle, Number($('power').value), canPutt());
  renderer.render(course.scene, camera);
}

try {
  renderer = new T.WebGLRenderer({canvas, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  camera = new T.PerspectiveCamera(43, 1, .1, 190);
  bind();
  if (friendRound) {
    loadHole(0);
    connectGolf();
  } else begin();
  new ResizeObserver(orient).observe(canvas);
  requestAnimationFrame(animate);
} catch {
  $('fieldNotice').textContent = 'The 3D course could not load. Try refreshing this page in a browser with WebGL.';
  $('fieldNotice').hidden = false;
  for (const id of ['courses','view','putt','power','left','right']) $(id).disabled = true;
}
