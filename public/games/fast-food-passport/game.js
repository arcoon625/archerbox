import {createCoinRun} from '../../economy/wallet.js?v=foodshift1';
import {RESTAURANTS,INGREDIENTS,HEAT,restaurantById,pantry} from './menus.js';
import {SAVE_KEY,TICKETS,emptyProfile,restore,newShift,customer,ticket,takeOrder,togglePart,startCooking,stopCooking,setPacked,serve,nextCustomer} from './rules.js?v=shift1';
import {START,STATIONS,nearStation,move,relative,turnToward} from './space.js';
import {kitchen} from './kitchen.js';

const $=id=>document.getElementById(id);
const world=$('world'),dialog=$('stationDialog'),summary=$('summary');
const coinRun=createCoinRun('fast-food-passport');
const bindings={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',KeyD:'right'};
const keys=new Set(),touch=new Map();
const starLine=number=>'★'.repeat(number)+'☆'.repeat(5-number);
const heatName=recipe=>HEAT[recipe.heat]?.name||'Assembly only';
const current=()=>profile.shifts[site];
const meals=()=>ticket(current());
const person=()=>customer(current());
const dishStatus=dish=>dish?.packed?'Packed':dish?.cookAt?'Cooking':dish?.heat==='perfect'?'Cooked':dish?.parts.length?'Preparing':'To make';
function readProfile(fallback){
 try{
  const value=localStorage.getItem(SAVE_KEY);
  if(value)return restore(JSON.parse(value));
 }catch{}
 return fallback;
}
let profile=readProfile(emptyProfile()),site=null,slot=0,stage=null,position={...START};
let yaw=0,pitch=-.055,destination=null,near=null,drag=null,view=null,attemptedView=false;
let busy=false,syncing=false,last=performance.now(),arrival=last;
const focusWorld=()=>{if(view)world.focus({preventScroll:true});};
const locked=action=>navigator.locks?.request(SAVE_KEY,action)??Promise.resolve().then(action);

function announce(text){
 $('workNotice').textContent=text;
 if(dialog.open)$('stationNotice').textContent=text;
}
function writeProfile(value){
 profile=value;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(value));}
 catch{announce('This browser couldn’t save the shift.');}
}
async function mutate(action){
 if(busy||!site)return false;
 const siteId=site;
 if(!current())return false;
 const {id,index,phase}=current(),expected={id,index,phase};
 busy=true;
 try{
  return await locked(()=>{
   const next=readProfile(profile),shift=next.shifts[siteId];
   if(shift?.id!==expected.id||shift.index!==expected.index||shift.phase!==expected.phase){
    profile=next;syncScreen(expected);return false;
   }
   if(!action(shift,next))return false;
   writeProfile(next);
   syncScreen(expected);
   return true;
  });
 }catch{announce('Couldn’t save that action. Try again.');return false;}
 finally{busy=false;}
}

async function flushRewards(){
 if(syncing||!profile.pending.length)return;
 syncing=true;
 try{
  for(const id of [...profile.pending]){
   const result=await coinRun.unique('finish',id);
   if(!result?.ok)break;
   await locked(()=>{
    const next=readProfile(profile);
    next.pending=next.pending.filter(saved=>saved!==id);
    writeProfile(next);
   });
  }
 }finally{syncing=false;}
}

function clearInputs(){
 keys.clear();touch.clear();drag=null;
 document.querySelectorAll('.dpad .active').forEach(button=>button.classList.remove('active'));
}
function listRestaurants(){
 $('restaurants').innerHTML=RESTAURANTS.map(restaurant=>{
  const existing=profile.shifts[restaurant.id];
  const description=existing?.phase==='finished'?'Start a new shift':existing?'Resume shift · Customer '+(existing.index+1):restaurant.menu[0].name;
  return `<button class="restaurant" type="button" data-shop="${restaurant.id}" style="--brand:${restaurant.color}"><span class="brand" aria-hidden="true">${restaurant.menu[0].icon}</span><span><b>${restaurant.name}</b><small>${description}</small></span></button>`;
 }).join('');
}
function showSelection(){
 if(dialog.open)dialog.close();
 if(summary.open)summary.close();
 site=null;stage=null;destination=null;clearInputs();
 $('work').hidden=true;
 profile=readProfile(profile);
 listRestaurants();
 $('selection').hidden=false;
}
async function enterShop(id,restart=false){
 if(busy||!restaurantById(id))return;
 busy=true;
 try{
  const shift=await locked(()=>{
   const next=readProfile(profile);
   const saved=next.shifts[id];
   if(!saved||saved.phase==='finished'||restart){
    next.shifts[id]=newShift(id,crypto.randomUUID());
    writeProfile(next);
   }else profile=next;
   return next.shifts[id];
  });
  if(dialog.open)dialog.close();
  if(summary.open)summary.close();
  site=id;slot=0;stage=null;position={...START};yaw=0;pitch=-.055;destination=null;near=null;clearInputs();
  arrival=shift.phase==='waiting'?performance.now():performance.now()-1800;
  $('selection').hidden=true;$('work').hidden=false;
  $('shopName').textContent=restaurantById(id).name;
  if(!attemptedView){
   attemptedView=true;
   try{view=kitchen(world);}catch{view=null;}
  }
  if(view){view.shop(restaurantById(id));view.resize();}
  world.hidden=!view;
  document.querySelector('.dpad').hidden=!view;
  $('workNotice').textContent='';
  renderTicket();focusWorld();
 }catch{announce('Couldn’t open that restaurant. Try again.');}
 finally{busy=false;}
}
function syncScreen(previous){
 const shift=current();
 if(!shift){showSelection();return;}
 if(shift.id!==previous.id||shift.index!==previous.index){
  slot=0;arrival=performance.now();
  if(dialog.open)dialog.close();
 }
 renderTicket();
 if(shift.phase==='finished')openSummary();
 else if(dialog.open&&stage)renderStation();
}
function renderTicket(){
 const shift=current();
 if(!shift)return;
 const guest=person();
 $('customerName').textContent=shift.phase==='finished'?'All customers served':guest.name+' is at the counter';
 $('shiftProgress').textContent='Customer '+(shift.index+1)+' of '+TICKETS.length;
 $('orderNumber').textContent=(shift.index+1)+' / '+TICKETS.length;
 $('tips').textContent='$'+shift.tips;
 let html='';
 if(shift.phase==='finished'){
  html='<button class="primary" type="button" data-results>See shift results</button>';
 }else if(shift.phase==='waiting'){
  html='<p>Go to Order & Pickup to take the next order.</p>';
 }else{
  html=meals().map((meal,index)=>{
   const draft=shift.dishes[index];
   return `<div class="orderItem ${draft.packed?'packed':''}"><span aria-hidden="true">${meal.icon}</span><div><strong>${meal.name}</strong><small>${dishStatus(draft)} · ${heatName(meal)}</small></div></div>`;
  }).join('');
 }
 $('order').innerHTML=html;
 for(const button of document.querySelectorAll('.stations button'))button.disabled=shift.phase==='finished';
 if(view)view.food(shift.phase==='working'?meals()[slot]:null,shift.dishes[slot]);
}
function action(name,label,{primary=false,disabled=false}={}){
 return `<button type="button" data-action="${name}"${primary?' class="primary"':''}${disabled?' disabled':''}>${label}</button>`;
}
function stationLink(id,label){
 return `<button type="button" data-walk="${id}">${label}</button>`;
}
function itemTabs(shift){
 return shift.dishes.length<2?'':`<div class="tabs" aria-label="Food on this order">${meals().map((meal,index)=>
  `<button type="button" data-slot="${index}" aria-pressed="${slot===index}">${shift.dishes[index].packed?'✓ ':''}${meal.name}</button>`).join('')}</div>`;
}
function feedbackBody(shift){
 const {stars,tip,items,fast}=shift.feedback;
 const line=stars===5?'That’s exactly what I ordered!':stars>=3?'Thanks! Here’s what I’d change.':'Could you check my order next time?';
 const detail=items.map(item=>`<div class="feedbackItem"><b>${item.name}</b><p>${item.problems.join(' · ')||'Made just right.'}</p></div>`).join('');
 return `<h3>${person().name}’s feedback</h3><div class="rating" aria-label="${stars} out of 5 stars">${starLine(stars)}</div><p>“${line}”</p>${detail}<p><b>${tip?'Tip earned $'+tip:'No tip on this order'}</b>${tip===4&&fast?' · Quick service bonus':''}</p><div class="actions">${action('next',shift.index===TICKETS.length-1?'Finish shift':'Next customer',{primary:true})}</div>`;
}
function counterBody(shift){
 if(shift.phase==='waiting')return `<h3>${person().name}</h3><p>“Hi! I’m ready to order.”</p><div class="actions">${action('take','Take order',{primary:true,disabled:performance.now()-arrival<1650})}</div>`;
 if(shift.phase==='feedback')return feedbackBody(shift);
 const ready=shift.dishes.every(draft=>draft.packed);
 return `<h3>${person().name}’s order</h3><p>${meals().map(meal=>meal.name).join(' + ')}</p><p>${ready?'Everything is packed. Hand over the order.':'Make each item, then pack it at the Prep Station.'}</p><div class="actions">${action('serve','Serve order',{primary:true,disabled:!ready})}${ready?'':stationLink('prep','Go to prep')}</div>`;
}
function prepBody(shift,recipe,draft){
 const restaurant=restaurantById(site);
 const parts=pantry(restaurant).map(key=>`<button type="button" class="part" data-part="${key}" aria-pressed="${draft.parts.includes(key)}" ${draft.packed||draft.cookAt?'disabled':''}><i aria-hidden="true" style="--part:${INGREDIENTS[key].color}"></i>${INGREDIENTS[key].name}</button>`).join('');
 const staged=draft.packed?action('unpack','Unpack to edit'):action('pack','Pack item',{primary:true,disabled:!draft.parts.length||!!draft.cookAt||!!recipe.heat&&!draft.heat});
 const heat=recipe.heat&&!draft.packed?stationLink('cook','Go to '+HEAT[recipe.heat].name.toLowerCase()):'';
 return `${itemTabs(shift)}<h3>${recipe.icon} ${recipe.name}</h3><p class="recipe">Recipe <b>${recipe.parts.map(key=>INGREDIENTS[key].name).join(' · ')}</b></p><div class="parts">${parts}</div><p>${recipe.heat&&!draft.heat?'Add the ingredients, then use the '+HEAT[recipe.heat].name.toLowerCase()+'.':draft.packed?'Packed and ready.':'Check the ingredients, then pack the item.'}</p><div class="actions">${staged}${heat}${shift.dishes.every(item=>item.packed)?stationLink('counter','Go to pickup'):''}</div>`;
}
function cookBody(shift,recipe,draft){
 const method=HEAT[recipe.heat],tabs=itemTabs(shift);
 if(!method)return `${tabs}<h3>${recipe.name}</h3><p>This item is ready after assembly.</p><div class="actions">${stationLink('prep','Go to prep')}</div>`;
 if(!draft.parts.length)return `${tabs}<h3>${recipe.name}</h3><p>Put ingredients on the prep tray first.</p><div class="actions">${stationLink('prep','Go to prep')}</div>`;
 if(draft.packed)return `${tabs}<h3>${recipe.name}</h3><p>This item is packed and ready for pickup.</p><div class="actions">${stationLink('counter','Go to pickup')}</div>`;
 const heat=draft.heat==='perfect'?'Cooked just right. Pack it at prep.':draft.heat==='burnt'?'Cooked too long. You can cook it again.':draft.heat==='early'?'Taken out a little early. You can cook it again.':'Take it out while the marker is green.';
 return `${tabs}<h3>${method.name} · ${recipe.name}</h3><p id="cookLabel" role="status">${heat}</p><div class="cookBar" aria-hidden="true"><span class="cookZone" style="left:${method.from/8*100}%;width:${(method.to-method.from)/8*100}%"></span><span class="cookNeedle" id="cookNeedle"></span></div><div class="actions">${draft.cookAt?action('stop','Take it out',{primary:true}):action('heat',draft.heat?'Cook again':'Start cooking',{primary:true})}${stationLink('prep','Go to prep')}</div>`;
}
function renderStation(){
 const shift=current();
 if(!stage||!shift||shift.phase==='finished')return;
 const focus=document.activeElement?.dataset;
 const {label}=STATIONS.find(station=>station.id===stage);
 $('stationHeading').textContent=label;
 let body;
 if(stage==='counter')body=counterBody(shift);
 else if(shift.phase!=='working')body=`<p>${shift.phase==='feedback'?'Check what your customer thought.':'Take a customer order at the counter first.'}</p><div class="actions">${stationLink('counter','Go to counter')}</div>`;
 else if(stage==='prep')body=prepBody(shift,meals()[slot],shift.dishes[slot]);
 else body=cookBody(shift,meals()[slot],shift.dishes[slot]);
 $('stationBody').innerHTML=body;
 for(const key of ['action','slot','part']){
  if(focus?.[key]!==undefined){
   const button=$('stationBody').querySelector(`[data-${key}="${CSS.escape(focus[key])}"]`);
   if(button&&!button.disabled)button.focus({preventScroll:true});
   break;
  }
 }
}
function openStation(id){
 if(!current()||current().phase==='finished'||dialog.open||summary.open)return;
 destination=null;clearInputs();
 stage=id;
 $('stationNotice').textContent='';
 renderStation();dialog.showModal();
}
function goTo(id){
 const station=STATIONS.find(entry=>entry.id===id);
 if(!station||!current())return;
 if(dialog.open)dialog.close();
 if(!view||nearStation(position)?.id===id){openStation(id);return;}
 destination=station;focusWorld();
}
function openSummary(){
 if(summary.open)return;
 if(dialog.open)dialog.close();
 clearInputs();destination=null;
 const shift=current();
 $('summaryText').textContent=restaurantById(site).name+' served '+TICKETS.length+' customers.';
 $('summaryStats').innerHTML=`<span><b>${(shift.ratingTotal/TICKETS.length).toFixed(1)} / 5</b>Average rating</span><span><b>${shift.ordersPerfect} / ${TICKETS.length}</b>Perfect orders</span><span><b>$${shift.tips}</b>Tips earned</span>`;
 summary.showModal();
 void flushRewards();
}

$('restaurants').onclick=event=>{const id=event.target.closest('[data-shop]')?.dataset.shop;if(id)void enterShop(id);};
$('leave').onclick=showSelection;
$('chooseAgain').onclick=showSelection;
$('again').onclick=()=>void enterShop(site,true);
$('order').onclick=event=>{if(event.target.closest('[data-results]'))openSummary();};
document.querySelector('.stations').onclick=event=>{const target=event.target.closest('[data-go]');if(target)goTo(target.dataset.go);};
$('closeStation').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{
 if(dialog.open)return;
 stage=null;clearInputs();
 if(site&&!summary.open)focusWorld();
});
$('stationBody').onclick=async event=>{
 const button=event.target.closest('button');
 if(!button||busy||!current())return;
 const {slot:nextSlot,part,action:act,walk:nextStation}=button.dataset;
 if(nextStation){goTo(nextStation);return;}
 if(nextSlot!==undefined){slot=Number(nextSlot);renderTicket();renderStation();return;}
 const now=Date.now();
 if(part){await mutate(shift=>togglePart(shift,slot,part));return;}
 if(act==='take'){
  slot=0;
  if(await mutate(shift=>takeOrder(shift,now))){dialog.close();announce('Order taken. Go to Prep Station to make the food.');}
 }else if(act==='heat')await mutate(shift=>startCooking(shift,slot,now));
 else if(act==='stop')await mutate(shift=>stopCooking(shift,slot,now));
 else if(act==='pack'||act==='unpack')await mutate(shift=>setPacked(shift,slot,act==='pack'));
 else if(act==='serve')await mutate(shift=>serve(shift,now));
 else if(act==='next')await mutate((shift,p)=>nextCustomer(p,shift));
};

world.addEventListener('pointerdown',event=>{
 if(!view||event.button!==0||drag)return;
 focusWorld();
 drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
 world.setPointerCapture(event.pointerId);
});
world.addEventListener('pointermove',event=>{
 if(drag?.id!==event.pointerId)return;
 const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<5)return;
 drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:true};
 destination=null;
 yaw-=dx*.006;
 pitch=Math.max(-.68,Math.min(.68,pitch-dy*.0045));
});
world.addEventListener('pointerup',event=>{
 if(drag?.id!==event.pointerId)return;
 const {moved}=drag;drag=null;
 if(!moved){const hit=view?.pick(event.clientX,event.clientY);if(hit)goTo(hit);}
});
for(const type of ['pointercancel','lostpointercapture'])world.addEventListener(type,()=>{drag=null;});
world.addEventListener('webglcontextlost',()=>{
 view=null;world.hidden=true;destination=null;clearInputs();
 document.querySelector('.dpad').hidden=true;
 announce('Use the station buttons to keep working.');
});
$('interact').onclick=()=>{if(near)openStation(near.id);};
window.addEventListener('keydown',event=>{
 if(!site||!view||dialog.open||summary.open||event.ctrlKey||event.altKey||event.metaKey)return;
 if(bindings[event.code]||['ArrowLeft','ArrowRight'].includes(event.code)){keys.add(event.code);event.preventDefault();}
 if(event.code==='KeyE'&&!event.repeat&&near){event.preventDefault();openStation(near.id);}
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',clearInputs);
for(const button of document.querySelectorAll('[data-move]')){
 button.addEventListener('pointerdown',event=>{
  if(!view)return;
  event.preventDefault();button.setPointerCapture(event.pointerId);
  touch.set(event.pointerId,button.dataset.move);button.classList.add('active');
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{
  touch.delete(event.pointerId);button.classList.remove('active');
 });
}
window.addEventListener('storage',event=>{
 if(event.key!==SAVE_KEY)return;
 const previous=current();
 profile=readProfile(profile);
 if(previous)syncScreen(previous);
 else listRestaurants();
});
window.addEventListener('online',()=>void flushRewards());
new ResizeObserver(()=>view?.resize()).observe(world.parentElement);

function movement(dt){
 const labels=new Set([...keys].map(code=>bindings[code]).concat([...touch.values()]));
 const side=Number(labels.has('right'))-Number(labels.has('left'));
 const forward=Number(labels.has('up'))-Number(labels.has('down'));
 const turn=Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight'));
 if(side||forward||turn){
  destination=null;
  yaw+=turn*dt*1.8;
  const vector=relative(yaw,side,forward);
  move(position,vector.x,vector.z,dt);
 }else if(destination){
  const x=destination.x-position.x,z=destination.z-position.z,dist=Math.hypot(x,z);
  if(dist<.15){
   const {id}=destination;
   yaw=0;pitch=-.055;
   openStation(id);
  }else{
   yaw=turnToward(yaw,Math.atan2(x,z),dt);
   pitch+=(-.055-pitch)*Math.min(1,dt*10);
   move(position,x,z,Math.min(dt,dist/4.9),4.9);
  }
 }
}
function frame(now){
 requestAnimationFrame(frame);
 const dt=Math.min(.05,(now-last)/1000);last=now;
 const shift=current();
 if(!shift||document.hidden)return;
 if(view&&!dialog.open&&!summary.open)movement(dt);
 near=nearStation(position);
 const enable=!!view&&!!near&&shift.phase!=='finished';
 if($('interact').disabled===enable)$('interact').disabled=!enable;
 const hint=destination?'Walking to '+destination.label+'…':near&&view?'Press E to use '+near.label+'.':view?'Drag to look. Use WASD to walk.':'Choose a station from the order ticket.';
 if($('hint').textContent!==hint)$('hint').textContent=hint;
 const accept=$('stationBody').querySelector('[data-action="take"]');
 if(accept?.disabled&&now-arrival>=1650)accept.disabled=false;
 const needle=$('cookNeedle'),draft=shift.dishes[slot];
 if(needle&&draft){
  const seconds=draft.cookAt?Math.min(8,(Date.now()-draft.cookAt)/1000):0;
  needle.style.left=100*seconds/8+'%';
  if(draft.cookAt){
   const {from,to}=HEAT[meals()[slot].heat];
   const text=seconds<from?'Cooking… wait for the green zone.':seconds<=to?'Ready! Take it out now.':'Cooked too long. Take it out to try again.';
   if($('cookLabel').textContent!==text)$('cookLabel').textContent=text;
  }
 }
 view?.draw(position,yaw,pitch,person(),(now-arrival)/1000,shift.phase,shift.dishes.length>0&&shift.dishes.every(dish=>dish.packed));
}
listRestaurants();
void flushRewards();
requestAnimationFrame(frame);
