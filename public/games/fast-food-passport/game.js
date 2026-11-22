import {createCoinRun} from '../../economy/wallet.js?v=passport1';
import {PLACES,START,canWalk,nearPlace,placeById,routeTo,walk} from './town.js?v=realchains1';
import {SAVE_KEY,restore,complete,status,placeOrder,eatOrder,payJob,replay,jobChoices,checkChoice,timingMarker,timingHit} from './rules.js?v=realchains1';
import {townPainter} from './paint.js?v=realchains1';

const $=id=>document.getElementById(id);
const world=$('world'),counter=$('counter'),celebrate=$('celebrate');
const painter=townPainter(world),coinRun=createCoinRun('fast-food-passport');
const newId=()=>crypto.randomUUID();
function load(fallback){
 try{
  const saved=localStorage.getItem(SAVE_KEY);
  if(saved)return restore(JSON.parse(saved),fallback.tour.id);
 }catch{}
 return fallback;
}
let profile=load(restore(null,newId())),position={...START};
let steps=[],destination=null,nearby=null,visit=null,job=null,waiting=false,flushing=false,last=performance.now();
const keys=new Set(),touch=new Map();
const bindings={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};

function tell(message){
 $('alert').textContent=message;
 if(counter.open)$('counterStatus').textContent=message;
}
function refreshPassport(){
 const {tour,completed}=profile;
 $('cash').textContent='$'+tour.cash;
 $('stamps').textContent=tour.stamps.length+' / '+PLACES.length;
 $('progress').value=tour.stamps.length;
 $('tours').textContent=completed?completed+' completed '+(completed===1?'tour':'tours'):'';
 $('finishButton').hidden=!complete(tour);
 $('stops').innerHTML=PLACES.map(place=>{
  const state=status(tour,place.id);
  return `<button type="button" class="stop ${state==='stamped'?'marked':''}" data-stop="${place.id}" aria-label="Walk to ${place.name}${state==='stamped'?', stamp collected':''}"><span class="stopIcon" aria-hidden="true">${place.icon}</span><span><b>${place.name}</b><small>${place.dish}</small></span><strong>${state==='stamped'?'✓':state==='ready'?'Ready':'$'+place.price}</strong></button>`;
 }).join('');
}

function locked(action){
 return navigator.locks?.request(SAVE_KEY,action)??Promise.resolve().then(action);
}
async function change(action,tourId=profile.tour.id){
 if(waiting)return false;
 waiting=true;
 try{
  return await locked(()=>{
   const current=load(profile);
   const okay=current.tour.id===tourId&&action(current);
   profile=current;
   if(okay)try{localStorage.setItem(SAVE_KEY,JSON.stringify(current));}catch{tell('Progress could not be saved in this browser.');}
   refreshPassport();
   return !!okay;
  });
 }catch{tell('Couldn’t save that action. Try again.');return false;}
 finally{waiting=false;}
}

async function flushFinishes(){
 if(flushing||!profile.pending.length)return;
 flushing=true;
 try{
  for(const id of [...profile.pending]){
   const result=await coinRun.unique('finish',id);
   if(!result?.ok)break;
   await locked(()=>{
    const current=load(profile);
    current.pending=current.pending.filter(value=>value!==id);
    profile=current;
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(current));}catch{}
   });
  }
 }finally{flushing=false;}
}

function cancelWalk(){
 steps=[];destination=null;
}
function clearInput(){
 keys.clear();touch.clear();
 document.querySelectorAll('.dpad .active').forEach(button=>button.classList.remove('active'));
}
function walkingTo(place){
 if(counter.open||celebrate.open)return;
 if(nearPlace(position)===place){openCounter(place);return;}
 const path=routeTo(position,place.door);
 if(!path.length)return;
 destination=place;steps=path;
 world.focus({preventScroll:true});
}
function openCounter(place){
 if(counter.open||celebrate.open)return;
 clearInput();cancelWalk();
 visit={place,tourId:profile.tour.id};job=null;
 $('placeName').textContent=place.name;
 $('dishIcon').textContent=place.icon;
 $('dishName').textContent=place.dish;
 renderCounter();
 counter.showModal();
}
function renderCounter(message=''){
 if(!visit)return;
 const place=visit.place,{tour}=profile,state=status(tour,place.id),worked=tour.jobs.includes(place.id);
 $('counterStatus').textContent=message;
 const meal=state==='stamped'?'<p>Stamp collected. This stop is checked off.</p>':
  state==='ready'?'<p>Your order is ready!</p><div class="actions"><button type="button" class="action" data-act="eat">Eat '+place.dish+' ↗</button></div>':
  `<p>Your order costs <b>$${place.price}</b>. You have <b>$${tour.cash}</b>.</p><div class="actions"><button type="button" data-act="buy" class="action" ${tour.cash<place.price?'disabled':''}>Order · $${place.price}</button></div>`;
 const work=worked||complete(tour)?'':`<div class="actions"><button type="button" data-act="job">Help at the counter · Earn $${place.pay}</button></div>`;
 const short=state==='new'&&tour.cash<place.price
  ?'<p>'+ (worked?'Help at another restaurant to earn more cash.':'Help at this counter to earn more cash.')+'</p>':'';
 $('counterBody').innerHTML=meal+work+short;
}
function renderJob(){
 const task=job.spec;
 $('counterStatus').textContent='';
 let ui=`<h3>${task.title}</h3>`;
 if(task.type==='timing'){
  const [low,high]=task.zone;
  ui+=`<p>${task.tip}</p><div class="meter" aria-hidden="true"><span class="zone" style="left:${low*100}%;width:${(high-low)*100}%"></span><span class="marker" id="timingMarker"></span></div><div class="actions"><button type="button" class="action" data-act="timing">Stop ↗</button></div>`;
 }else{
  ui+=task.type==='stack'?`<p>${task.steps.map((step,index)=>index<job.step?'✓ '+step:step).join(' → ')}</p>`:`<p>Ticket <b>${task.ticket}</b></p>`;
  ui+=`<div class="choices">${jobChoices(task).map((choice,index)=>`<button type="button" class="choice" data-choice="${index}" ${task.steps?.slice(0,job.step).includes(choice)?'disabled':''}>${choice}</button>`).join('')}</div>`;
 }
 $('counterBody').innerHTML=ui+'<div class="actions"><button type="button" data-act="back">Back to menu</button></div>';
}
async function jobDone(){
 if(!visit||!job)return;
 const {place,tourId}=visit;
 const earned=await change(current=>payJob(current,place.id),tourId);
 if(visit?.place!==place)return;
 job=null;
 renderCounter(earned?'Nice work! +$'+place.pay+' town cash.':'This counter job is finished.');
}
function showFinish(){
 if(celebrate.open)return;
 if(counter.open)counter.close();
 clearInput();
 $('stampRoll').innerHTML=PLACES.map(place=>`<span title="${place.name}">${place.icon}</span>`).join('');
 celebrate.showModal();
}

$('counterBody').onclick=async event=>{
 if(waiting||!visit)return;
 const option=event.target.closest('button'),act=option?.dataset.act,{place,tourId}=visit;
 if(act==='buy'){
  if(await change(current=>placeOrder(current,place.id),tourId))renderCounter();
 }else if(act==='eat'){
  if(!await change(current=>eatOrder(current,place.id),tourId))return;
  if(complete(profile.tour)){showFinish();void flushFinishes();}
  else renderCounter('Stamp earned for '+place.name+'!');
 }else if(act==='job'){
  job={spec:place.job,step:0,started:performance.now()};
  renderJob();
 }else if(act==='back'){
  job=null;renderCounter();
 }else if(act==='timing'&&job){
  if(timingHit(job.spec,performance.now()-job.started))await jobDone();
  else tell('Missed the green zone. Try again!');
 }else if(option?.dataset.choice!==undefined&&job){
  if(!checkChoice(job.spec,job.step,Number(option.dataset.choice))){tell('Try another option. Check the ticket above.');return;}
  job.step++;
  if(!job.spec.steps||job.step===job.spec.steps.length)await jobDone();
  else renderJob();
 }
};

$('stops').onclick=event=>{const place=placeById(event.target.closest('[data-stop]')?.dataset.stop);if(place)walkingTo(place);};
world.addEventListener('click',event=>{
 const {x,y}=painter.mapPoint(event.clientX,event.clientY);
 const place=PLACES.find(entry=>Math.abs(entry.x-x)<97&&(Math.abs(entry.door.y-y)<36||y>=entry.bounds.y-38&&y<=entry.bounds.y+entry.bounds.h+30));
 if(place)walkingTo(place);
});
$('enter').onclick=()=>{if(nearby)openCounter(nearby);};
$('closeCounter').onclick=()=>counter.close();
counter.addEventListener('close',()=>{visit=null;job=null;clearInput();if(!celebrate.open)world.focus({preventScroll:true});});
$('finishButton').onclick=showFinish;
$('stay').onclick=()=>celebrate.close();
$('replay').onclick=async()=>{
 if(!await change(current=>replay(current,newId())))return;
 position={...START};cancelWalk();celebrate.close();void flushFinishes();
};
celebrate.addEventListener('close',()=>world.focus({preventScroll:true}));

window.addEventListener('keydown',event=>{
 if(counter.open||celebrate.open||event.altKey||event.ctrlKey||event.metaKey)return;
 if(bindings[event.code]){event.preventDefault();keys.add(event.code);}
 if(event.code==='KeyE'&&nearby&&!event.repeat)openCounter(nearby);
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',clearInput);
for(const button of document.querySelectorAll('[data-move]')){
 button.addEventListener('pointerdown',event=>{
  event.preventDefault();button.setPointerCapture(event.pointerId);
  touch.set(event.pointerId,button.dataset.move);button.classList.add('active');
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{
  touch.delete(event.pointerId);button.classList.remove('active');
 });
}
window.addEventListener('storage',event=>{
 if(event.key!==SAVE_KEY)return;
 const next=load(profile);
 if(next.tour.id!==profile.tour.id){
  position={...START};cancelWalk();
  if(counter.open)counter.close();
  if(celebrate.open)celebrate.close();
 }
 profile=next;refreshPassport();
 if(visit&&!job)renderCounter();
});
window.addEventListener('online',()=>void flushFinishes());
new ResizeObserver(painter.resize).observe(world);

function frame(now){
 requestAnimationFrame(frame);
 const dt=Math.min(.045,(now-last)/1000);last=now;
 const active=new Set([...keys].map(key=>bindings[key]).concat([...touch.values()]));
 const dx=Number(active.has('right'))-Number(active.has('left'));
 const dy=Number(active.has('down'))-Number(active.has('up'));
 let moving=false;
 if(!counter.open&&!celebrate.open){
  if(dx||dy){cancelWalk();walk(position,dx,dy,dt);moving=true;}
  else if(steps.length){
   const goal=steps[0],x=goal.x-position.x,y=goal.y-position.y,dist=Math.hypot(x,y);
   if(dist<4){
    if(canWalk(goal.x,goal.y))position={...goal};
    steps.shift();
    if(!steps.length&&destination){const place=destination;cancelWalk();openCounter(place);}
   }else{walk(position,x,y,Math.min(dt,dist/270),270);moving=true;}
  }
 }
 const detected=nearPlace(position);
 if(detected!==nearby||destination){
  nearby=detected;
  $('enter').disabled=!nearby;
 }
 const tip=destination?'Walking to '+destination.name+'…':nearby?'Press E or open the menu.':'Tap a restaurant to walk there.';
 if($('hint').textContent!==tip)$('hint').textContent=tip;
 if(job?.spec.type==='timing'){
  const marker=$('timingMarker');
  if(marker)marker.style.left=100*timingMarker(now-job.started)+'%';
 }
 painter.draw(position,profile.tour,nearby,steps,moving,now);
}
refreshPassport();
painter.resize();
void flushFinishes();
requestAnimationFrame(frame);
