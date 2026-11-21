import {LEVELS,TILE} from './levels.js';

export const SAVE_KEY='archerbox-outpost-maze-v1';
export const GEAR=[
 {id:'pulse',name:'Pulse Tagger',price:0,range:5.5,stun:2,delay:.70,spread:0,color:'#60f3dc',detail:'Free starter. Briefly stuns a nearby soldier you face.'},
 {id:'bubble',name:'Bubble Blaster',price:140,range:7,stun:3.5,delay:.62,spread:0,color:'#f3a4ff',detail:'Wraps one soldier in a bubble that lasts longer.'},
 {id:'chill',name:'Chill Blaster',price:320,range:10,stun:4.5,delay:.88,spread:0,color:'#96dfff',detail:'Long reach and an icy blast that buys you time.'},
 {id:'spark',name:'Spark Launcher',price:570,range:8,stun:5,delay:1.4,spread:3.5,color:'#ffdc70',detail:'Stuns the targeted soldier and nearby soldiers in sight.'}
];
export const CREDIT_PICKUP=20;
const MAX_HP=3;
const STEP=4.9;
const GUARD_SIGHT=6.4;
const RADIUS=.34;
const JUMP_TIME=.77;
const REACH=.92;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const cell=(level,x,z)=>level.map[Math.round(z/TILE)]?.[Math.round(x/TILE)]||'#';
const floor=(level,x,z)=>level.map[z]?.[x]||'#';
const world=(x,z)=>({x:x*TILE,z:z*TILE});
const safeCount=(n,max)=>Number.isSafeInteger(n)?clamp(n,0,max):0;
const newId=()=>globalThis.crypto.randomUUID();

function marker(level,char){
 const row=level.map.findIndex(line=>line.includes(char));
 return world(level.map[row].indexOf(char),row);
}

function cellsWith(level,char){
 const result=[];
 for(let z=0;z<level.map.length;z++){
  for(let x=0;x<level.map[z].length;x++)if(floor(level,x,z)===char)result.push({x,z});
 }
 return result;
}

export function restoreProfile(raw){
 const owned=['pulse',...GEAR.slice(1).filter(gear=>Array.isArray(raw?.owned)&&raw.owned.includes(gear.id)).map(gear=>gear.id)];
 const unlocked=safeCount(raw?.unlocked,LEVELS.length-1);
 const completed=Array.isArray(raw?.completed)?raw.completed.slice(0,LEVELS.length).map(time=>Number.isFinite(time)&&time>0?time:null):[];
 const active=raw?.active;
 const profile={credits:safeCount(raw?.credits,999999),owned,equipped:owned.includes(raw?.equipped)?raw.equipped:'pulse',
  unlocked,completed,active:null,pendingFinishes:[]};
 if(Array.isArray(raw?.pendingFinishes))profile.pendingFinishes=[...new Set(raw.pendingFinishes.filter(id=>typeof id==='string'&&/^[a-z0-9-]{1,56}$/i.test(id)))].slice(-50);
 if(active&&Number.isInteger(active.level)&&active.level>=0&&active.level<=unlocked&&typeof active.id==='string'&&/^[a-z0-9-]{1,56}$/i.test(active.id)){
  const limit=cellsWith(LEVELS[active.level],'$').length;
  profile.active={id:active.id,level:active.level,checkpoint:active.checkpoint===true,chip:active.chip===true,
   collected:[...new Set(Array.isArray(active.collected)?active.collected.filter(i=>Number.isInteger(i)&&i>=0&&i<limit):[])],
   time:Number.isFinite(active.time)?clamp(active.time,0,86400):0};
 }
 return profile;
}

export function buyGear(profile,id){
 const gear=GEAR.find(item=>item.id===id);
 if(!gear)return false;
 if(!profile.owned.includes(id)){
  if(profile.credits<gear.price)return false;
  profile.credits-=gear.price;
  profile.owned.push(id);
 }
 profile.equipped=id;
 return true;
}

function patrol(level,origin,index){
 const route=[origin];
 let current=origin,previous=null;
 for(let i=0;i<4;i++){
  const variants=directions.map(([x,z])=>({x:current.x+x,z:current.z+z}))
   .filter(({x,z})=>!['#','B','!','S','C','E'].includes(floor(level,x,z))&&!(previous?.x===x&&previous?.z===z));
  if(!variants.length)break;
  const next=variants[(index+i)%variants.length];
  route.push(next);
  previous=current;
  current=next;
 }
 return [...route,...route.slice(1,-1).reverse()].map(({x,z})=>world(x,z));
}

export function startLevel(profile,index,id=newId()){
 if(!Number.isInteger(index)||index<0||index>profile.unlocked||!LEVELS[index])return null;
 if(profile.active?.level!==index)profile.active={id,level:index,checkpoint:false,chip:false,collected:[],time:0};
 const run=profile.active;
 const level=LEVELS[index];
 const start=marker(level,'S'),checkpoint=marker(level,'C'),exit=marker(level,'E'),chip=marker(level,'K');
 const location=run.checkpoint?checkpoint:start;
 const game={profile,run,level,index,start,checkpoint,exit,chip,finished:false,
  player:{...location,y:0,jump:0,jumping:false,angle:Math.PI,hp:MAX_HP,immune:1.4,cooldown:0},
  tokens:cellsWith(level,'$').map(({x,z})=>world(x,z)),
  barriers:cellsWith(level,'B').map(({x,z})=>{
   const alongX=floor(level,x-1,z)!=='#'&&floor(level,x+1,z)!=='#';
   return {...world(x,z),halfX:alongX?.34:1.44,halfZ:alongX?1.44:.34};
  }),
  hazards:cellsWith(level,'!').map(({x,z},i)=>({...world(x,z),offset:i*1.28})),
  guards:cellsWith(level,'G').map((origin,i)=>({...world(origin.x,origin.z),angle:Math.PI,route:patrol(level,origin,i),
   next:1,stun:0,alert:0,cooldown:i*.1,walk:0})),
  beam:null,events:[],notice:''};
 return game;
}

function isClear(level,a,b){
 const samples=Math.ceil(dist(a,b)/.29);
 for(let i=1;i<=samples;i++){
  const t=i/samples;
  if(cell(level,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)==='#')return false;
 }
 return true;
}

export function canStand(game,x,z,y){
 for(const sideX of [-1,1])for(const sideZ of [-1,1]){
  if(cell(game.level,x+sideX*RADIUS,z+sideZ*RADIUS)==='#')return false;
 }
 return y>.71||!game.barriers.some(b=>Math.abs(x-b.x)<b.halfX+RADIUS&&Math.abs(z-b.z)<b.halfZ+RADIUS);
}

export function hazardPhase(game,hazard){
 const phase=(game.run.time+hazard.offset)%3.6;
 return phase<1.7?'safe':phase<2.35?'warning':'active';
}

function signal(game,type,text){
 game.events.push(type);
 game.notice=text;
}

function takeHit(game,reason){
 const p=game.player;
 if(p.immune>0)return;
 p.hp--;
 p.immune=1.15;
 if(p.hp>0){signal(game,'hit',reason+' · '+p.hp+' shields left');return;}
 const respawn=game.run.checkpoint?game.checkpoint:game.start;
 Object.assign(p,respawn,{hp:MAX_HP,y:0,jumping:false,jump:0,immune:2.8});
 for(const guard of game.guards)guard.alert=0;
 signal(game,'respawn',game.run.checkpoint?'Back at your checkpoint. Your loot is safe.':'Back at the entrance. Your loot is safe.');
}

export function aimTarget(game,gear){
 const p=game.player;
 const facing={x:Math.sin(p.angle),z:Math.cos(p.angle)};
 return game.guards.filter(g=>{
  const d=dist(p,g);
  const dot=(g.x-p.x)*facing.x+(g.z-p.z)*facing.z;
  return d<=gear.range&&(d<1.5||dot>=d*.53)&&isClear(game.level,p,g);
 }).sort((a,b)=>dist(p,a)-dist(p,b))[0];
}

function tag(game){
 const p=game.player;
 if(p.cooldown>0)return;
 const gear=GEAR.find(item=>item.id===game.profile.equipped);
 p.cooldown=gear.delay;
 const target=aimTarget(game,gear);
 if(!target){signal(game,'miss','Face a soldier with a clear route, then tag.');return;}
 for(const guard of game.guards){
  if(guard===target||(gear.spread>0&&dist(guard,target)<gear.spread&&isClear(game.level,target,guard)&&isClear(game.level,p,guard))){
   guard.stun=Math.max(guard.stun,gear.stun);
   guard.alert=0;
  }
 }
 game.beam={from:{x:p.x,z:p.z,y:p.y+.89},to:{x:target.x,z:target.z,y:.89},color:gear.color,ttl:.15};
 signal(game,'tag','Soldier stunned!');
}

function moveGuards(game,dt){
 const p=game.player;
 for(const guard of game.guards){
  guard.cooldown=Math.max(0,guard.cooldown-dt);
  if(guard.stun>0){guard.stun=Math.max(0,guard.stun-dt);continue;}
  const range=dist(guard,p);
  const direction=(p.x-guard.x)*Math.sin(guard.angle)+(p.z-guard.z)*Math.cos(guard.angle);
  const canSee=range<GUARD_SIGHT&&(direction>range*.42||range<1.6)&&isClear(game.level,guard,p)&&p.immune<=0;
  if(canSee)guard.alert=Math.min(.72,guard.alert+dt);
  else guard.alert=Math.max(0,guard.alert-dt*2.6);
  if(canSee&&guard.alert>=.57&&guard.cooldown===0){
   guard.angle=Math.atan2(p.x-guard.x,p.z-guard.z);
   guard.cooldown=1.35;
   game.beam={from:{x:guard.x,z:guard.z,y:.94},to:{x:p.x,z:p.z,y:p.y+.85},color:'#ff9868',ttl:.15};
   takeHit(game,'A soldier tagged you');
  }
  if(canSee||guard.route.length<2)continue;
  let target=guard.route[guard.next];
  if(dist(guard,target)<.06){guard.next=(guard.next+1)%guard.route.length;target=guard.route[guard.next];}
  const d=dist(guard,target);
  if(d>.0001){
   const distance=Math.min(d,(1.40+game.index*.25)*dt);
   guard.angle=Math.atan2(target.x-guard.x,target.z-guard.z);
   guard.x+=(target.x-guard.x)*distance/d;
   guard.z+=(target.z-guard.z)*distance/d;
   guard.walk+=dt;
  }
 }
}

function checkItems(game){
 const {run,profile,player:p}=game;
 if(!run.checkpoint&&dist(p,game.checkpoint)<REACH){
  run.checkpoint=true;
  p.hp=MAX_HP;
  signal(game,'checkpoint','Checkpoint saved. Shields restored.');
 }
 game.tokens.forEach((token,i)=>{
  if(!run.collected.includes(i)&&dist(p,token)<REACH){
   run.collected.push(i);
   profile.credits=Math.min(999999,profile.credits+CREDIT_PICKUP);
   signal(game,'credits','+'+CREDIT_PICKUP+' maze credits');
  }
 });
 if(!run.chip&&dist(p,game.chip)<REACH){
  run.chip=true;
  signal(game,'chip','Access chip found. The green exit is open!');
 }
 if(dist(p,game.exit)>1.23)return;
 if(!run.chip){
  if(game.notice!=='The exit needs the blue access chip.')signal(game,'locked','The exit needs the blue access chip.');
  return;
 }
 game.finished=true;
 const previous=profile.completed[game.index];
 profile.completed[game.index]=previous?Math.min(previous,run.time):Math.max(run.time,.01);
 profile.unlocked=Math.max(profile.unlocked,Math.min(LEVELS.length-1,game.index+1));
 profile.credits=Math.min(999999,profile.credits+game.level.payout);
 profile.active=null;
 profile.pendingFinishes.push(run.id);
 signal(game,'finish','Maze cleared!');
}

export function advance(game,dt,input){
 game.events.length=0;
 if(game.finished)return;
 game.run.time+=dt;
 const p=game.player;
 p.immune=Math.max(0,p.immune-dt);
 p.cooldown=Math.max(0,p.cooldown-dt);
 if(game.beam){game.beam.ttl-=dt;if(game.beam.ttl<=0)game.beam=null;}
 if(input.jump&&!p.jumping){p.jumping=true;p.jump=0;}
 if(p.jumping){
  p.jump+=dt;
  p.y=p.jump>=JUMP_TIME?0:Math.sin(p.jump/JUMP_TIME*Math.PI)*1.48;
  if(p.jump>=JUMP_TIME)p.jumping=false;
 }
 const norm=Math.hypot(input.x,input.z);
 if(norm>.01){
  const dx=input.x/norm,dz=input.z/norm;
  p.angle=Math.atan2(dx,dz);
  const x=p.x+dx*STEP*dt,z=p.z+dz*STEP*dt;
  if(canStand(game,x,p.z,p.y))p.x=x;
  if(canStand(game,p.x,z,p.y))p.z=z;
 }
 // A jump that ends over a crate leaves you on top until you walk off.
 if(!p.jumping)p.y=canStand(game,p.x,p.z,0)?0:.74;
 if(input.fire)tag(game);
 moveGuards(game,dt);
 if(p.y<.61&&game.hazards.some(h=>dist(p,h)<.91&&hazardPhase(game,h)==='active'))takeHit(game,'You stepped on an active pad');
 checkItems(game);
}

export const canOpenShop=game=>dist(game.player,game.start)<2.75||game.run.checkpoint&&dist(game.player,game.checkpoint)<2.75;
