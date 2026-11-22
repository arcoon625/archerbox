import {restaurantById,INGREDIENTS,HEAT,pantry} from './menus.js';

export const SAVE_KEY='archerbox-fast-food-shifts-v1';
export const TICKETS=[[0],[1],[2],[0,2],[1],[1,2]];
const NAMES=['Maya','Leo','Nova','Jordan','Kai','Avery','Sam','Riley','Jules','Eli'];
const phases=['waiting','working','feedback','finished'];
const heats=['early','perfect','burnt'];
const freshDish=()=>({parts:[],cookAt:null,heat:null,packed:false});
const validId=value=>typeof value==='string'&&/^[a-z0-9-]{1,70}$/i.test(value);
const safeCount=(value,max=999999)=>Number.isSafeInteger(value)&&value>=0?Math.min(value,max):0;
const timeStamp=value=>Number.isFinite(value)&&value>0?value:null;

export function emptyProfile(){
 return {shifts:{},completed:0,pending:[]};
}
export function newShift(site,id){
 if(!restaurantById(site)||!validId(id))return null;
 return {site,id,index:0,phase:'waiting',dishes:[],ratingTotal:0,ordersPerfect:0,tips:0,started:null,feedback:null};
}
export function restore(raw){
 const profile=emptyProfile();
 profile.completed=safeCount(raw?.completed);
 profile.pending=Array.isArray(raw?.pending)?[...new Set(raw.pending.filter(validId))].slice(-50):[];
 for(const [site,entry] of Object.entries(raw?.shifts||{})){
  const restaurant=restaurantById(site);
  if(!restaurant||!validId(entry?.id)||!phases.includes(entry.phase))continue;
  const index=safeCount(entry.index,TICKETS.length-1);
  const dishes=entry.phase==='waiting'?[]:TICKETS[index].map((_,slot)=>{
   const saved=entry.dishes?.[slot];
   const allowed=pantry(restaurant);
   return {
    parts:Array.isArray(saved?.parts)?[...new Set(saved.parts.filter(part=>allowed.includes(part)))]:[],
    cookAt:timeStamp(saved?.cookAt),heat:heats.includes(saved?.heat)?saved.heat:null,packed:saved?.packed===true,
   };
  });
  const shift={site,id:entry.id,index,phase:entry.phase,dishes,started:timeStamp(entry.started),
   ratingTotal:safeCount(entry.ratingTotal,5*TICKETS.length),ordersPerfect:safeCount(entry.ordersPerfect,TICKETS.length),
   tips:safeCount(entry.tips,5*TICKETS.length),feedback:null};
  if(['feedback','finished'].includes(entry.phase))shift.feedback=grade(shift,shift.started+(entry.feedback?.fast===true?1000:120000));
  profile.shifts[site]=shift;
 }
 return profile;
}
export function customer(shift){
 let offset=0;
 for(const char of shift.site)offset+=char.charCodeAt(0);
 const style=(shift.index+offset)%NAMES.length;
 return {name:NAMES[style],style};
}
export function ticket(shift){
 return TICKETS[shift.index].map(index=>restaurantById(shift.site).menu[index]);
}
export function takeOrder(shift,now){
 if(shift.phase!=='waiting')return false;
 shift.phase='working';
 shift.started=now;
 shift.dishes=ticket(shift).map(freshDish);
 return true;
}
export function togglePart(shift,slot,part){
 const draft=shift.dishes[slot];
 if(shift.phase!=='working'||!draft||draft.packed||draft.cookAt||!pantry(restaurantById(shift.site)).includes(part))return false;
 if(draft.parts.includes(part))draft.parts=draft.parts.filter(current=>current!==part);
 else draft.parts.push(part);
 draft.heat=null;
 return true;
}
export function startCooking(shift,slot,now){
 const draft=shift.dishes[slot],meal=ticket(shift)[slot];
 if(shift.phase!=='working'||!meal?.heat||!draft?.parts.length||draft.packed||draft.cookAt)return false;
 draft.heat=null;
 draft.cookAt=now;
 return true;
}
export function stopCooking(shift,slot,now){
 const draft=shift.dishes[slot],method=HEAT[ticket(shift)[slot]?.heat];
 if(shift.phase!=='working'||!draft?.cookAt||!method)return false;
 const seconds=(now-draft.cookAt)/1000;
 draft.heat=seconds<method.from?'early':seconds<=method.to?'perfect':'burnt';
 draft.cookAt=null;
 return true;
}
export function setPacked(shift,slot,packed){
 const draft=shift.dishes[slot];
 if(shift.phase!=='working'||!draft||draft.cookAt)return false;
 if(packed&&(!draft.parts.length||ticket(shift)[slot].heat&&!draft.heat))return false;
 draft.packed=packed;
 return true;
}

function grade(shift,now){
 let mistakes=0;
 const items=ticket(shift).map((meal,index)=>{
  const draft=shift.dishes[index];
  const missing=meal.parts.filter(part=>!draft.parts.includes(part));
  const extra=draft.parts.filter(part=>!meal.parts.includes(part));
  mistakes+=missing.length+extra.length;
  const problems=[];
  if(missing.length)problems.push('Missing '+missing.map(part=>INGREDIENTS[part].name.toLowerCase()).join(', '));
  if(extra.length)problems.push('Didn’t order '+extra.map(part=>INGREDIENTS[part].name.toLowerCase()).join(', '));
  if(meal.heat&&draft.heat!=='perfect'){
   mistakes+=2;
   problems.push(draft.heat==='burnt'?'Cooked too long':'Needed more cooking time');
  }
  return {name:meal.name,problems};
 });
 const stars=Math.max(1,5-Math.ceil(mistakes/items.length));
 const fast=(now-shift.started)<75000;
 const tip=stars===5?(fast?4:3):stars>=3?1:0;
 return {items,stars,fast,tip};
}
export function serve(shift,now){
 if(shift.phase!=='working'||shift.dishes.length!==ticket(shift).length||shift.dishes.some(dish=>!dish.packed))return false;
 const feedback=grade(shift,now);
 shift.phase='feedback';
 shift.feedback=feedback;
 shift.ratingTotal+=feedback.stars;
 shift.ordersPerfect+=Number(feedback.stars===5);
 shift.tips+=feedback.tip;
 return true;
}
export function nextCustomer(profile,shift){
 if(shift.phase!=='feedback')return false;
 if(shift.index===TICKETS.length-1){
  shift.phase='finished';
  profile.completed++;
  profile.pending.push(shift.id);
 }else{
  shift.index++;
  shift.phase='waiting';
  shift.feedback=null;
  shift.started=null;
  shift.dishes=[];
 }
 return true;
}
