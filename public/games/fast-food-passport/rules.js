import {PLACES,placeById} from './town.js';

export const SAVE_KEY='archerbox-fast-food-passport-v1';
export const START_CASH=12;
const validId=id=>typeof id==='string'&&/^[\da-z-]{1,56}$/i.test(id);
const natural=n=>Number.isSafeInteger(n)&&n>=0;
const cleanPlaces=value=>Array.isArray(value)?[...new Set(value.filter(id=>placeById(id)))]:[];
const newTour=id=>({id,cash:START_CASH,stamps:[],orders:[],jobs:[]});

export function restore(raw,id){
 const tour=raw?.tour;
 const result={completed:natural(raw?.completed)?raw.completed:0,
  pending:Array.isArray(raw?.pending)?[...new Set(raw.pending.filter(validId))].slice(-50):[],
  tour:newTour(id)};
 if(validId(tour?.id)){
  result.tour={id:tour.id,cash:natural(tour.cash)?Math.min(tour.cash,999):START_CASH,
   stamps:cleanPlaces(tour.stamps),orders:cleanPlaces(tour.orders),jobs:cleanPlaces(tour.jobs)};
 }
 return result;
}

export const complete=tour=>tour.stamps.length===PLACES.length;
export const status=(tour,id)=>tour.stamps.includes(id)?'stamped':tour.orders.includes(id)?'ready':'new';

export function placeOrder(profile,id){
 const {tour}=profile,place=placeById(id);
 if(!place||status(tour,id)!=='new'||tour.cash<place.price)return false;
 tour.cash-=place.price;
 tour.orders.push(id);
 return true;
}

export function eatOrder(profile,id){
 const {tour}=profile;
 if(status(tour,id)!=='ready')return false;
 tour.orders=tour.orders.filter(order=>order!==id);
 tour.stamps.push(id);
 if(complete(tour)){
  profile.completed++;
  profile.pending.push(tour.id);
 }
 return true;
}

export function payJob(profile,id){
 const {tour}=profile,place=placeById(id);
 if(!place||complete(tour)||tour.jobs.includes(id))return false;
 tour.jobs.push(id);
 tour.cash+=place.pay;
 return true;
}

export function replay(profile,id){
 if(!complete(profile.tour))return false;
 profile.tour=newTour(id);
 return true;
}

export function jobChoices(job){
 if(job.type==='match')return job.choices;
 return [job.steps[1],job.extra,job.steps[2],job.steps[0]];
}
export function checkChoice(job,step,choice){
 if(job.type==='match')return choice===job.answer;
 return jobChoices(job)[choice]===job.steps[step]&&step<job.steps.length;
}
export function timingMarker(elapsed){
 const progress=(Math.max(0,elapsed)%2400)/1200;
 return progress<=1?progress:2-progress;
}
export function timingHit(job,elapsed){
 const marker=timingMarker(elapsed);
 return marker>=job.zone[0]&&marker<=job.zone[1];
}
