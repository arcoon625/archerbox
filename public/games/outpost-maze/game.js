import {createCoinRun} from '../../economy/wallet.js?v=rarecoins1';
import {TILE,LEVELS} from './levels.js';
import {SAVE_KEY,GEAR,restoreProfile,buyGear,startLevel,advance,canOpenShop,hazardPhase} from './rules.js';
import {createScene} from './scene.js';

const $=id=>document.getElementById(id);
const coinRun=createCoinRun('outpost-maze');
const keys=new Set();
const touch=new Map();
const bindings={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
let profile;
try{profile=restoreProfile(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));}
catch{profile=restoreProfile(null);}
let selected=profile.active?.level??profile.unlocked;
let game=null;
let mode='menu';
let queuedJump=false,queuedTag=false;
let noticeTimer=0,saveTimer=0,hudTimer=0,walk=0,last=performance.now(),flushing=false;
let world=$('world');
let scene;
try{scene=createScene(world);}
catch{
 const fallback=document.createElement('canvas');
 fallback.id='world';
 fallback.tabIndex=0;
 fallback.setAttribute('aria-label','Maze in overhead view');
 world.replaceWith(fallback);world=fallback;
 scene={
  load(){},snapCamera(){},
  resize(){world.width=world.clientWidth;world.height=world.clientHeight;},
  draw(current){drawMap(world,current,true);}
 };
}
const money=n=>'$'+n.toLocaleString();
const format=time=>Math.floor(time/60)+':'+String(Math.floor(time%60)).padStart(2,'0');
const field=(id,text)=>{if($(id).textContent!==text)$(id).textContent=text;};

function save(){
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(profile));}
 catch{showNotice('Saving is unavailable in this browser.');}
}
async function postFinishes(){
 if(flushing||!profile.pendingFinishes.length)return;
 flushing=true;
 try{
  for(const id of [...profile.pendingFinishes]){
   const result=await coinRun.unique('finish',id);
   if(!result?.ok)break;
   profile.pendingFinishes=profile.pendingFinishes.filter(other=>other!==id);
   save();
  }
 }finally{flushing=false;}
}

function renderMenu(){
 field('menuCredits',money(profile.credits)+' maze credits');
 $('levels').innerHTML=LEVELS.map((level,index)=>{
  const locked=index>profile.unlocked;
  const status=locked?'Locked':profile.active?.level===index?'In progress':profile.completed[index]?'Best '+format(profile.completed[index]):money(level.payout)+' finish bonus';
  return `<button type="button" data-level="${index}" aria-pressed="${selected===index}" ${locked?'disabled':''}><b>${level.name}</b><small>${status}</small></button>`;
 }).join('');
 field('play',profile.active?.level===selected?'Continue maze →':'Enter maze →');
}

function paintHud(){
 field('credits',money(profile.credits));
 field('shields',Array.from({length:3},(_,i)=>i<game.player.hp?'◆':'◇').join(' '));
 $('shields').setAttribute('aria-label',game.player.hp+' shields');
 field('sector',game.level.name.toUpperCase()+' · '+format(game.run.time));
 field('objective',game.run.chip?'Reach the green exit':'Find the blue access chip');
 field('equipped',GEAR.find(item=>item.id===profile.equipped).name);
 $('shopButton').title=canOpenShop(game)?'Open the gear shop':'Shop at the entrance or checkpoint';
}

function drawMap(canvas,g,large=false){
 const ctx=canvas.getContext('2d');
 const rows=g.level.map;
 const width=rows[0].length,height=rows.length;
 if(!large&&(canvas.width!==width*10||canvas.height!==height*10)){canvas.width=width*10;canvas.height=height*10;}
 const size=Math.min(canvas.width/width,canvas.height/height)*(large?.91:1);
 const left=(canvas.width-width*size)/2,top=(canvas.height-height*size)/2;
 ctx.fillStyle='#14222c';
 ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){
  const tile=rows[z][x];
  ctx.fillStyle=tile==='#'?'#536975':tile==='B'?'#9a7046':'#233743';
  ctx.fillRect(left+x*size,top+z*size,size-.5,size-.5);
 }
 const point=(entity,color,radius=.30)=>{
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.arc(left+(entity.x/TILE+.5)*size,top+(entity.z/TILE+.5)*size,size*radius,0,Math.PI*2);
  ctx.fill();
 };
 point(g.start,'#66acac',.23);
 point(g.exit,g.run.chip?'#bded87':'#d89b75');
 point(g.checkpoint,'#b899fb',.25);
 if(!g.run.chip)point(g.chip,'#7cbfff',.31);
 if(large){
  g.hazards.forEach(h=>point(h,hazardPhase(g,h)==='active'?'#ef826a':'#bfaa60',.28));
  g.tokens.forEach((token,i)=>{if(!g.run.collected.includes(i))point(token,'#ffcf70',.16);});
  g.guards.forEach(guard=>point(guard,guard.stun?'#8adffc':'#ff9e70',.26));
 }
 point(g.player,'#94ffda',.31);
}

function showNotice(text){
 field('notice',text);
 $('notice').hidden=false;
 noticeTimer=3.4;
}

function clearInput(){
 keys.clear();
 touch.clear();
 queuedJump=queuedTag=false;
 document.querySelectorAll('.pressed').forEach(button=>button.classList.remove('pressed'));
}

function toggleMap(){
 if(mode!=='play')return;
 $('mapPanel').hidden=!$('mapPanel').hidden;
 $('mapButton').setAttribute('aria-pressed',String(!$('mapPanel').hidden));
 if(!$('mapPanel').hidden)drawMap($('map'),game);
}

function setView(playing){
 $('menu').hidden=playing;
 $('hud').hidden=$('controls').hidden=!playing;
 if(!playing){
  $('mapPanel').hidden=true;
  $('mapButton').setAttribute('aria-pressed','false');
  $('notice').hidden=true;
 }
}

function start(index){
 const next=startLevel(profile,index);
 if(!next)return;
 game=next;
 selected=index;
 mode='play';
 clearInput();
 walk=0;
 last=performance.now();
 saveTimer=hudTimer=0;
 scene.load(game);
 scene.resize();
 setView(true);
 paintHud();
 showNotice(game.run.checkpoint?'Checkpoint restored.':'Head into the maze. Blue chip first, green exit second.');
 world.focus({preventScroll:true});
 save();
}

function showMenu(){
 mode='menu';
 clearInput();
 setView(false);
 renderMenu();
 $('play').focus();
}

function renderShop(){
 field('shopCredits',money(profile.credits));
 $('gearRows').innerHTML=GEAR.map(item=>{
  const owned=profile.owned.includes(item.id),selected=profile.equipped===item.id;
  const action=selected?'Equipped':owned?'Equip':`Buy · ${money(item.price)}`;
  return `<article class="gearRow" style="--gear:${item.color}"><div><h3>${item.name}</h3><p>${item.detail}</p></div><button type="button" data-gear="${item.id}" aria-label="${action} ${item.name}" ${selected||!owned&&profile.credits<item.price?'disabled':''}>${action}</button></article>`;
 }).join('');
}
function openShop(){
 if(mode==='play'&&!canOpenShop(game)){showNotice('Visit the supply area at the entrance or checkpoint.');return;}
 if(mode!=='menu'&&mode!=='play')return;
 clearInput();
 field('shopStatus','');
 renderShop();
 $('shop').showModal();
}
function pause(){
 if(mode!=='play'||$('shop').open||$('pauseDialog').open)return;
 clearInput();
 save();
 $('pauseDialog').showModal();
}
function complete(){
 mode='finish';
 clearInput();
 $('mapPanel').hidden=true;
 field('finishTitle',game.index===LEVELS.length-1?'Outpost escaped!':'Maze cleared!');
 field('finishSummary',game.level.name+' · '+format(game.run.time)+' · +'+money(game.level.payout)+' maze credits');
 $('next').hidden=game.index===LEVELS.length-1;
 save();
 void postFinishes();
 $('finish').showModal();
}

$('levels').onclick=e=>{
 const button=e.target.closest('[data-level]');
 if(!button)return;
 selected=Number(button.dataset.level);
 renderMenu();
 $('levels').querySelector('[data-level="'+selected+'"]').focus();
};
$('play').onclick=()=>start(selected);
$('shopButton').onclick=$('menuShop').onclick=openShop;
$('closeShop').onclick=()=>$('shop').close();
$('shop').addEventListener('close',()=>{if(mode==='play'){paintHud();world.focus({preventScroll:true});}else renderMenu();});
$('gearRows').onclick=e=>{
 const button=e.target.closest('[data-gear]');
 if(!button)return;
 const item=GEAR.find(gear=>gear.id===button.dataset.gear);
 if(!buyGear(profile,item.id))return;
 save();
 renderShop();
 field('shopStatus',item.name+' equipped.');
 $('closeShop').focus();
};
$('pause').onclick=pause;
$('resume').onclick=()=>$('pauseDialog').close();
$('pauseDialog').addEventListener('close',()=>{if(mode==='play')world.focus({preventScroll:true});});
$('leave').onclick=()=>{$('pauseDialog').close();showMenu();};
$('finish').addEventListener('cancel',e=>{e.preventDefault();$('finish').close();showMenu();});
$('finishMenu').onclick=()=>{$('finish').close();showMenu();};
$('next').onclick=()=>{$('finish').close();start(game.index+1);};
$('retry').onclick=()=>{$('finish').close();start(game.index);};
$('mapButton').onclick=toggleMap;
$('jump').onclick=()=>{queuedJump=true;};
$('tag').onclick=()=>{queuedTag=true;};
document.querySelectorAll('[data-direction]').forEach(button=>{
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  button.setPointerCapture(event.pointerId);
  touch.set(event.pointerId,button.dataset.direction);
  button.classList.add('pressed');
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  button.addEventListener(type,event=>{touch.delete(event.pointerId);button.classList.remove('pressed');});
 }
});
document.addEventListener('keydown',event=>{
 if(mode!=='play'||$('shop').open||$('pauseDialog').open||event.metaKey||event.ctrlKey||event.altKey)return;
 const code=event.code;
 if(Object.hasOwn(bindings,code)){
  event.preventDefault();
  keys.add(code);
 }else if(code==='Space'&&!event.target.closest('button')){
  event.preventDefault();
  if(!event.repeat)queuedJump=true;
 }else if(!event.repeat){
  if(code==='KeyJ')queuedTag=true;
  if(code==='KeyM')toggleMap();
  if(code==='KeyE')openShop();
  if(code==='Escape')pause();
 }
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(mode==='play')save();}});
window.addEventListener('resize',()=>scene.resize());

function frame(now){
 requestAnimationFrame(frame);
 const dt=Math.min(.035,Math.max(0,(now-last)/1000));last=now;
 if(!game||document.hidden)return;
 if(mode==='play'&&!$('shop').open&&!$('pauseDialog').open){
  const input=new Set([...Array.from(keys,code=>bindings[code]),...touch.values()]);
  const x=Number(input.has('right'))-Number(input.has('left'));
  const z=Number(input.has('down'))-Number(input.has('up'));
  const previousX=game.player.x,previousZ=game.player.z;
  advance(game,dt,{x,z,jump:queuedJump,fire:queuedTag});
  queuedJump=queuedTag=false;
  if(game.events.includes('respawn')){scene.snapCamera(game);walk=0;}
  else walk+=Math.hypot(game.player.x-previousX,game.player.z-previousZ)*2.6;
  if(game.events.length)showNotice(game.notice);
  saveTimer+=dt;
  if(game.events.some(event=>['credits','checkpoint','chip','respawn'].includes(event))||saveTimer>=5){save();saveTimer=0;}
  if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0)$('notice').hidden=true;}
  hudTimer+=dt;
  if(hudTimer>.12||game.events.length){paintHud();if(!$('mapPanel').hidden)drawMap($('map'),game);hudTimer=0;}
  if(game.finished)complete();
 }
 scene.draw(game,walk,dt);
}
renderMenu();
scene.resize();
void postFinishes();
requestAnimationFrame(frame);
