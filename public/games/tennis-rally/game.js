import * as T from '../../vendor/three.module.js';
import {createCoinRun} from '../../economy/wallet.js?v=tennis1';
import {COURT, SURFACES, LEVELS, canHit, clamp, createMatch, scoring, swing, targetFor, tick} from './rules.js';
import {makeCourt} from './court.js';

const $=id=>document.getElementById(id), canvas=$('world'), menu=$('menu');
const coinRun=createCoinRun('tennis-rally'), STEP=1/120;
const SAVE='archerbox-tennis-record-v1';
const opponents={rookie:'Maya',club:'Kai',pro:'Jules'};
const surfaceNotes=[
  'A steady bounce and medium pace beside the lake.',
  'A higher bounce and a slower ball off the ground.',
  'A lower bounce and a quicker ball off the grass.',
];
const ray=new T.Raycaster(), mouse=new T.Vector2(), spot=new T.Vector3();
const ground=new T.Plane(new T.Vector3(0,1,0),0);
const keys=new Set();
let view,renderer,court,game,mode='preview',high=false,muted=false,audio;
let target=null,lastFrame,accumulator=0,nextHud=0,held=null,padId=null;
let touch={x:0,z:0};
let record={wins:0,losses:0,best:0};
try{
  const saved=JSON.parse(localStorage.getItem(SAVE));
  if([saved?.wins,saved?.losses,saved?.best].every(n=>Number.isSafeInteger(n)&&n>=0))record=saved;
}catch{}

function audioReady(){
  if(muted)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    audio??=new Audio();
    if(audio.state==='suspended')void audio.resume().catch(()=>{});
  }catch{}
}

function ping(type){
  if(muted||!audio)return;
  const [a,b,len,volume]={
    stroke:[238,114,.10,.049],bounce:[167,103,.075,.032],
    point:[420,675,.23,.041],fault:[199,132,.18,.032],
  }[type];
  const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
  osc.type=type==='stroke'?'triangle':'sine';
  osc.frequency.setValueAtTime(a,t);osc.frequency.exponentialRampToValueAtTime(b,t+len);
  gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+len);
  osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+len+.019);
}

function fit(){
  const {width,height}=canvas.getBoundingClientRect();
  if(!(width&&height))return;
  view.aspect=width/height;
  if(high)view.position.set(0,28.8,20.3);
  else if(view.aspect<.93)view.position.set(4.2,19.3,25.3);
  else view.position.set(8.6,15.9,24.7);
  view.lookAt(0,.25,-.7);
  view.fov=view.aspect<.93?48:43;
  view.updateProjectionMatrix();view.updateMatrixWorld();
  const p=new T.Vector3();
  let zoom=1;
  for(const x of [-COURT.doubles,COURT.doubles])for(const z of [-COURT.baseline,COURT.baseline+1.6]){
    p.set(x,0,z).project(view);
    zoom=Math.max(zoom,Math.abs(p.x)/.93,Math.abs(p.y)/.92);
  }
  if(zoom>1){
    view.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(view.fov)/2)*zoom));
    view.updateProjectionMatrix();
  }
  renderer.setSize(width,height,false);
}

function aim(value){
  target=value;
  $('resetAim').textContent=value?'Reset aim':'Auto aim';
  $('resetAim').setAttribute('aria-pressed',!value);
}

function clearInput(){
  keys.clear();held=null;padId=null;touch={x:0,z:0};
  $('stick').firstElementChild.style.transform='';
}

function setup(nextMode){
  const surface=Number($('courtChoice').value);
  const difficulty=$('difficulty').value;
  const bestOf=Number($('format').value);
  const changed=game?.surface!==surface;
  mode=nextMode;
  game=createMatch({surface,difficulty,bestOf,practice:mode==='practice'});
  if(changed){
    court?.dispose();
    court=makeCourt(surface);
  }
  const info=SURFACES[surface];
  $('surface').textContent=info.type;
  $('venue').textContent=info.name;
  $('opponent').textContent=opponents[difficulty];
  $('surfaceNote').textContent=surfaceNotes[surface];
  $('matchFormat').textContent=(bestOf===3?'Best of three sets':'One set')+' · '+LEVELS[difficulty].name+' · CPU opponent';
  $('startPanel').hidden=mode!=='preview';
  $('result').hidden=true;
  accumulator=0;
  clearInput();aim(null);hud();fit();
  if(mode!=='preview'){
    if(mode==='match')coinRun.begin();
    if(menu.open)menu.close();
    audioReady();
    canvas.focus({preventScroll:true});
  }
}

function hud(){
  const score=scoring(game),playing=mode==='match'||mode==='practice';
  const serving=game.phase==='serve'&&game.server===0;
  const rallying=game.phase==='flight';
  const ready=rallying&&canHit(game,0);
  const set=game.sets[0]+game.sets[1]+1;
  $('scoring').textContent=mode==='practice'?'Practice':mode==='finished'?'Final':score.label||'Set '+set;
  $('pointsA').textContent=game.practice?game.practiceHits:score.left;
  $('pointsB').textContent=game.practice?'–':score.right;
  for(const [side,letter] of ['A','B'].entries()){
    $('games'+letter).textContent=game.practice?'–':game.games[side];
    $('sets'+letter).textContent=game.practice?'–':game.sets[side];
  }
  $('yourServe').hidden=!playing||game.server!==0;
  $('theirServe').hidden=!playing||game.server!==1;
  $('matchNote').textContent=game.practice?'Warm up without a match score.':
    game.completed.length?game.completed.map(([a,b])=>a+'–'+b).join('  ·  ') :
    'Six games to win a set, by two. Tiebreak at 6–6.';
  $('rally').textContent=rallying?'Rally '+game.rally:game.faults&&playing?'Second serve':'';
  $('hit').disabled=!playing||!(serving||rallying);
  $('lob').disabled=!playing||!rallying;
  $('resetAim').disabled=!playing||!(serving||rallying);
  $('hit').classList.toggle('swingNow',ready);
  const label=serving?'Serve':'Swing';
  if($('hit').firstChild.textContent!==label+' ')$('hit').firstChild.textContent=label+' ';
  const text=!playing?'':ready?'Swing now':game.notice;
  const notice=$('courtNotice');
  if(notice.textContent!==text)notice.textContent=text;
  notice.hidden=!text;
  notice.classList.toggle('good',ready||game.phase==='point'&&game.latestSide===0&&!game.faults);
  $('hint').textContent=serving&&playing?'Tap the yellow mark or choose a spot in the diagonal service box.':
    'Move with WASD or the joystick. Hold Swing until the ball is in reach.';
  $('record').textContent=record.wins+record.losses?`Your record · ${record.wins} wins · ${record.losses} losses`:'';
}

function finish(){
  mode='finished';clearInput();
  const won=game.winner===0;
  if(won){record.wins++;coinRun.once('win');}
  else record.losses++;
  record.best=Math.max(record.best,game.bestRally);
  try{localStorage.setItem(SAVE,JSON.stringify(record));}catch{}
  $('resultTitle').textContent=won?'You win!':opponents[game.difficulty]+' wins';
  $('resultScore').textContent=game.completed.map(([a,b])=>a+'–'+b).join('  ·  ');
  $('resultStats').textContent=`Longest rally · ${game.bestRally} hits`;
  $('result').hidden=false;
  $('status').textContent=$('resultTitle').textContent+' '+$('resultScore').textContent;
  $('rematch').focus({preventScroll:true});
}

function action(lob){
  if(mode==='preview'||mode==='finished'||menu.open)return;
  audioReady();
  const before=game.rally;
  if(swing(game,target,lob)&&game.rally!==before)ping('stroke');
  hud();
}

function joystick(event){
  const rect=$('stick').getBoundingClientRect();
  const x=(event.clientX-rect.x-rect.width/2)/28,z=(event.clientY-rect.y-rect.height/2)/28;
  const n=Math.max(1,Math.hypot(x,z));touch={x:x/n,z:z/n};
  $('stick').firstElementChild.style.transform=`translate(${touch.x*22}px,${touch.z*22}px)`;
}

function bind(){
  SURFACES.forEach((surface,i)=>$('courtChoice').append(new Option(surface.name,i)));
  for(const id of ['format','courtChoice','difficulty'])$(id).onchange=()=>{
    $('surfaceNote').textContent=surfaceNotes[Number($('courtChoice').value)];
    if(mode==='preview')setup('preview');
  };
  const open=()=>{
    if(!menu.open){clearInput();menu.showModal();}
  };
  $('options').onclick=$('resultOptions').onclick=open;
  $('close').onclick=()=>menu.close();
  $('play').onclick=$('menuPlay').onclick=$('rematch').onclick=()=>setup('match');
  $('practice').onclick=$('menuPractice').onclick=()=>setup('practice');
  $('view').onclick=()=>{
    high=!high;
    $('view').setAttribute('aria-pressed',high);
    $('view').textContent=high?'Court view':'High view';
    fit();
  };
  $('sound').onclick=()=>{
    muted=!muted;
    if(!muted)audioReady();
    $('sound').textContent=muted?'Sound off':'Sound on';
    $('sound').setAttribute('aria-pressed',!muted);
  };
  $('resetAim').onclick=()=>aim(null);
  for(const [id,lob] of [['hit',false],['lob',true]]){
    const button=$(id);
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      button.setPointerCapture(event.pointerId);
      held={id:event.pointerId,lob};action(lob);
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{
      if(held?.id===e.pointerId)held=null;
    });
    button.onclick=event=>{if(event.detail===0)action(lob);};
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||mode==='preview'||mode==='finished')return;
    const rect=canvas.getBoundingClientRect();
    mouse.set(2*(event.clientX-rect.x)/rect.width-1,1-2*(event.clientY-rect.y)/rect.height);
    ray.setFromCamera(mouse,view);
    if(ray.ray.intersectPlane(ground,spot)&&spot.z<-.24)aim({x:clamp(spot.x,-6.8,6.8),z:clamp(spot.z,-14,-.24)});
  });
  $('stick').addEventListener('pointerdown',event=>{
    if(padId!==null||mode==='preview'||mode==='finished')return;
    padId=event.pointerId;$('stick').setPointerCapture(padId);joystick(event);
  });
  $('stick').addEventListener('pointermove',event=>{if(event.pointerId===padId)joystick(event);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])$('stick').addEventListener(type,event=>{
    if(event.pointerId!==padId)return;
    padId=null;touch={x:0,z:0};$('stick').firstElementChild.style.transform='';
  });
  window.addEventListener('blur',clearInput);
  window.addEventListener('keydown',event=>{
    if(menu.open||event.altKey||event.metaKey||event.ctrlKey||event.target.closest?.('input,select'))return;
    const key=event.key.toLowerCase();
    if(key==='escape'){open();return;}
    const strike=(key===' '||key==='e')&&!event.target.closest?.('button');
    if(!strike&&!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key))return;
    keys.add(key);
    event.preventDefault();
    if(strike&&!event.repeat)action(key==='e');
  });
  window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
}

function movement(){
  const has=(a,b)=>keys.has(a)||keys.has(b)?1:0;
  return {
    x:touch.x||has('d','arrowright')-has('a','arrowleft'),
    z:touch.z||has('s','arrowdown')-has('w','arrowup'),
    sprint:keys.has('shift')||Math.hypot(touch.x,touch.z)>.95,
    assist:$('assist').checked,
  };
}

function frame(now){
  requestAnimationFrame(frame);
  const dt=lastFrame===undefined?0:clamp((now-lastFrame)/1000,0,.07);
  lastFrame=now;
  if((mode==='match'||mode==='practice')&&!menu.open){
    const before=game.phase, previousRally=game.rally, previousBounces=game.ball?.bounces||0;
    accumulator+=dt;
    const input=movement();
    while(accumulator>=STEP){
      if((held||keys.has(' ')||keys.has('e'))&&canHit(game,0))swing(game,target,held?.lob||keys.has('e'));
      tick(game,input,STEP);
      accumulator-=STEP;
    }
    if(game.rally>previousRally)ping('stroke');
    else if((game.ball?.bounces||0)>previousBounces)ping('bounce');
    if(before!==game.phase){
      if(game.phase==='serve')aim(null);
      if(game.phase==='point')ping(game.faults||game.latest==='Double fault'?'fault':'point');
      if(game.phase==='finished'){ping(game.winner===0?'point':'fault');finish();}
      if(game.notice)$('status').textContent=game.notice;
      hud();
    }
    if(now>=nextHud){nextHud=now+90;hud();}
  }
  const mark=mode==='preview'||game.server===0&&game.phase==='serve'||game.ball?.hitter===1;
  court.update(game,targetFor(game,target),mark);
  renderer.render(court.scene,view);
}

try{
  renderer=new T.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.02;
  view=new T.PerspectiveCamera(43,1,.1,155);
  bind();setup('preview');
  new ResizeObserver(fit).observe(canvas);
  requestAnimationFrame(frame);
}catch(error){
  console.error('Tennis court could not load',error);
  $('courtNotice').textContent='The 3D court did not load. Try opening Archerbox in a browser with WebGL.';
  $('courtNotice').hidden=false;
  for(const button of document.querySelectorAll('main button'))button.disabled=true;
}
