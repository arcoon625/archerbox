import {createCoinRun} from '../../economy/wallet.js?v=basketball1';
import {newGame,tick,shoot,pass,steal} from './court.js';
import {paintCourt,draw} from './art.js';

const $ = id => document.getElementById(id);
const menu = $('menu');
const paused = $('paused');
const canvas = $('court');
const context = canvas.getContext('2d');
const background = document.createElement('canvas');
background.width = canvas.width;
background.height = canvas.height;
paintCourt(background.getContext('2d'));

const coinRun = createCoinRun('basketball-stars');
const keys = new Set();
const touches = new Map();
const directions = {KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
const modes = {duel:'1v1',teams:'3v3',contest:'3-POINT CONTEST'};
const descriptions = {
  duel:'Face a CPU opponent. First to 15, or lead when the 2-minute clock runs out. A tie goes to sudden death.',
  teams:'Play with two CPU teammates. Press E to pass or call for the ball. First to 15 or lead at the buzzer.',
  contest:'Take 15 shots from five spots. Each basket is worth one point. The last ball at each spot is worth two.'
};
const recordKey = 'archerbox-basketball-records-v1';
let game = newGame('duel','rookie');
let playing = false;
let charge = null;
let previous = performance.now();
let animationTime = 0;

function setText(id,text) {
  const element = $(id);
  if(element.textContent!==String(text)) element.textContent=text;
}

function sync() {
  const contest = game.mode==='contest';
  const seconds = Math.ceil(game.clock);
  setText('homeLabel',contest?'POINTS':game.mode==='teams'?'TEAL':'YOU');
  setText('awayLabel',contest?'MADE':game.mode==='teams'?'ORANGE':'CPU');
  setText('modeLabel',modes[game.mode]);
  setText('homeScore',game.score[0]);
  setText('awayScore',contest?game.makes:game.score[1]);
  setText('clock',contest?`${Math.min(15,game.attempts+1)} / 15`:seconds===0?'OT':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'));
  setText('message',game.message);
  setText('help',contest?'Hold Shoot or Space. Release when the marker reaches the green zone.':'Move with WASD, arrows, or the court buttons. Hold Shoot or Space, then release in the green zone.');
  $('dpad').hidden=contest;
  $('pass').hidden=game.mode!=='teams';
  $('steal').hidden=contest;
  $('pause').disabled=!playing;
  $('shoot').disabled=!playing||game.owner!==game.you;
  $('pass').disabled=!playing||game.owner?.team!==0;
  $('steal').disabled=!playing||game.owner?.team!==1;
  setText('shootLabel',charge?'Release to shoot':game.owner===game.you?'Hold to shoot':'Shoot');
}

function clearInputs() {
  keys.clear();
  touches.clear();
  document.querySelectorAll('.pressed').forEach(button=>button.classList.remove('pressed'));
  charge=null;
  $('meter').hidden=true;
}

function beginShot(source) {
  if(!playing||paused.open||game.owner!==game.you||charge) return;
  charge={source,power:0};
  $('needle').style.left='0%';
  $('meter').hidden=false;
}

function endShot(source,fire) {
  if(charge?.source!==source) return;
  const {power}=charge;
  charge=null;
  $('meter').hidden=true;
  if(fire&&playing&&!paused.open) shoot(game,game.you,power);
}

function pause() {
  if(!playing||paused.open) return;
  clearInputs();
  paused.showModal();
}

function readRecord() {
  try{return Number(localStorage.getItem(recordKey+'-'+game.difficulty))||0;}
  catch{return 0;}
}

function showResult() {
  playing=false;
  clearInputs();
  const contest=game.mode==='contest';
  if(contest) {
    const best=Math.max(readRecord(),game.score[0]);
    try{localStorage.setItem(recordKey+'-'+game.difficulty,String(best));}catch{}
    setText('menuTitle','Contest complete');
    setText('result',`${game.score[0]} of 20 points · ${game.makes}/15 baskets · Best: ${best}`);
  } else {
    setText('menuTitle',game.score[0]>game.score[1]?'You win!':'CPU wins');
    setText('result',`Final score · ${game.score[0]}–${game.score[1]}`);
  }
  $('result').hidden=false;
  menu.showModal();
}

$('mode').onchange=()=>setText('modeHelp',descriptions[$('mode').value]);
$('setup').onsubmit=e=>{
  e.preventDefault();
  clearInputs();
  game=newGame($('mode').value,$('difficulty').value);
  coinRun.begin();
  const half=game.difficulty==='rookie'?10.5:7.3;
  $('sweetSpot').style.left=(72-half)+'%';
  $('sweetSpot').style.width=half*2+'%';
  menu.close();
  playing=true;
  sync();
};
menu.addEventListener('cancel',e=>e.preventDefault());
$('pause').onclick=pause;
$('resume').onclick=()=>paused.close();
$('changeMode').onclick=()=>{
  paused.close();
  playing=false;
  setText('menuTitle','Pick your game');
  $('result').hidden=true;
  menu.showModal();
  sync();
};
$('steal').onclick=()=>{if(playing&&!paused.open) steal(game,game.you)};
$('pass').onclick=()=>{if(playing&&!paused.open) pass(game)};

function bindHold(button,start,end) {
  button.addEventListener('pointerdown',event=>{
    if(event.button!==0) return;
    button.setPointerCapture(event.pointerId);
    start(event.pointerId);
  });
  button.addEventListener('pointerup',event=>end(event.pointerId,true));
  for(const type of ['pointercancel','lostpointercapture']) {
    button.addEventListener(type,event=>end(event.pointerId,false));
  }
}
document.querySelectorAll('[data-move]').forEach(button=>bindHold(button,id=>{
  if(!playing||paused.open) return;
  touches.set(id,button.dataset.move);
  button.classList.add('pressed');
},id=>{
  touches.delete(id);
  button.classList.remove('pressed');
}));
bindHold($('shoot'),beginShot,endShot);
document.addEventListener('keydown',event=>{
  if(!playing||paused.open||event.altKey||event.ctrlKey||event.metaKey) return;
  const {code}=event;
  if(Object.hasOwn(directions,code)) {
    event.preventDefault();
    keys.add(code);
  } else if(code==='Space' && (!event.target.closest('button') || event.target===$('shoot'))) {
    event.preventDefault();
    if(!event.repeat) beginShot('keyboard');
  } else if(!event.repeat) {
    if(code==='KeyQ') steal(game,game.you);
    if(code==='KeyE') pass(game);
    if(code==='Escape') pause();
  }
});
document.addEventListener('keyup',event=>{
  keys.delete(event.code);
  if(event.code==='Space') endShot('keyboard',true);
});
window.addEventListener('blur',clearInputs);
document.addEventListener('visibilitychange',()=>{if(document.hidden) pause()});

function frame(now) {
  const dt=Math.min(.04,(now-previous)/1000);
  previous=now;
  if(playing&&!paused.open&&!document.hidden) {
    animationTime+=dt;
    const active=new Set([...Array.from(keys,key=>directions[key]),...touches.values()]);
    tick(game,dt,{x:Number(active.has('right'))-Number(active.has('left')),y:Number(active.has('down'))-Number(active.has('up'))});
    if(charge && game.owner!==game.you) clearInputs();
    if(charge) {
      charge.power=Math.min(1,charge.power+dt*(game.difficulty==='rookie'?1:1.22));
      $('needle').style.left=charge.power*100+'%';
    }
    if(game.event==='basket') void coinRun.counter('basket',game.baskets);
    if(game.finished) showResult();
    sync();
  }
  draw(context,background,game,animationTime);
  requestAnimationFrame(frame);
}
sync();
menu.showModal();
requestAnimationFrame(frame);
