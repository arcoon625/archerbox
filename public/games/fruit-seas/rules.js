// Fruit Seas simulation. All clocks use active play time; menus and hidden tabs pause it.
export const SAVE_KEY='archerbox-fruit-seas-v2';
export const LEGACY_SAVE_KEY='archerbox-fruit-seas-v1';
import {ISLANDS,PLACES,BUILDINGS,FRUITS,enemyRoster} from './data.js?v=seas2';
export {ISLANDS,PLACES,BUILDINGS,FRUITS};
export const WEAPONS=[
 {id:'cutlass',name:'Sailor’s Cutlass',price:0,damage:18,range:3.3,cooldown:.50,kind:'melee',description:'Your free starting blade. Quick, close-range swings.'},
 {id:'slingshot',name:'Slingshot',price:400,damage:24,range:19,cooldown:.75,kind:'gun',speed:30,description:'A carved wooden frame, leather pouch, and fast stone shots.'},
 {id:'flintlock',name:'Flintlock',price:1000,damage:42,range:24,cooldown:1.15,kind:'gun',speed:42,description:'A polished brass barrel and a powerful single shot.'},
 {id:'sniper',name:'Sniper',price:5000,damage:85,range:48,cooldown:1.8,kind:'gun',speed:65,description:'A long-range rifle with a scope and heavy damage.'}
];
export const STAT_NAMES={strength:'Strength',defense:'Defense',gun:'Gun power',fruit:'Fruit power'};
export const QUEST_REWARD={money:300,levels:1,points:3};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,d,a=0,b=1e7)=>Number.isFinite(v)?clamp(v,a,b):d;
export function maxHP(g){return 100+g.stats.defense*10;}
export function freshGame(id=globalThis.crypto?.randomUUID?.()||'voyage-'+Date.now()){
 return {version:2,runId:id,revision:0,level:1,money:0,points:0,completed:0,kills:0,stats:{strength:0,defense:0,gun:0,fruit:0},island:'starter',x:-72,z:49,y:0,vy:0,yaw:Math.PI,hp:100,owned:['cutlass'],weapon:'cutlass',fruits:[],fruit:null,quest:null,pendingCoins:[],time:0,attack:0,swing:0,hurt:0,regen:0,cooldowns:[0,0],freeze:0,projectiles:[],icebergs:[],events:[],enemyShots:[],areas:[],enemies:enemyRoster()};
}
export function snapshot(g){return JSON.parse(JSON.stringify({...g,events:[]}));}
export function restoreGame(raw){
 const g=freshGame();if(!raw||![1,2].includes(raw.version))return g;
 g.runId=typeof raw.runId==='string'&&/^[\w-]{1,60}$/.test(raw.runId)?raw.runId:g.runId;
 g.revision=Math.floor(num(raw.revision,0));g.completed=Math.floor(num(raw.completed,0,0,100000));g.level=1+g.completed;
 g.money=Math.floor(num(raw.money,0));g.stats=Object.fromEntries(Object.keys(g.stats).map(k=>[k,Math.floor(num(raw.stats?.[k],0,0,g.completed*3))]));
 // A corrupt save cannot spend more points than its completed quests earned.
 let budget=g.completed*3;for(const k of Object.keys(g.stats)){g.stats[k]=Math.min(g.stats[k],budget);budget-=g.stats[k];}g.points=budget;
 g.kills=Math.floor(num(raw.kills,0));g.island=Object.hasOwn(ISLANDS,raw.island)&&g.level>=ISLANDS[raw.island].level?raw.island:'starter';const island=ISLANDS[g.island];
 g.x=num(raw.x,island.spawn.x,-115,120);g.z=num(raw.z,island.spawn.z,-115,75);if(Math.hypot(g.x-island.x,g.z-island.z)>island.r+1||blocked(g.x,g.z)){g.x=island.spawn.x;g.z=island.spawn.z;}
 g.hp=num(raw.hp,maxHP(g),1,maxHP(g));g.yaw=num(raw.yaw,Math.PI,-100,100);g.owned=WEAPONS.filter(w=>w.id==='cutlass'||Array.isArray(raw.owned)&&raw.owned.includes(w.id)).map(w=>w.id);g.weapon=g.owned.includes(raw.weapon)?raw.weapon:'cutlass';g.fruits=FRUITS.filter(f=>Array.isArray(raw.fruits)&&raw.fruits.includes(f.id)).map(f=>f.id);g.fruit=g.fruits.includes(raw.fruit)?raw.fruit:null;
 g.quest=raw.quest&&Object.hasOwn(ISLANDS,raw.quest.island)?{island:raw.quest.island,count:Math.floor(num(raw.quest.count,0,0,5))}:null;
 g.pendingCoins=Array.isArray(raw.pendingCoins)?[...new Set(raw.pendingCoins.filter(v=>typeof v==='string'&&v.startsWith(g.runId+'-')&&/^\d+$/.test(v.slice(g.runId.length+1))&&+v.slice(g.runId.length+1)<=g.completed))]:[];
 g.time=num(raw.time,0,0,1e10);g.cooldowns=[0,1].map(i=>num(raw.cooldowns?.[i],0,0,i?30:10));g.freeze=num(raw.freeze,0,0,10);g.attack=num(raw.attack,0,0,2);g.hurt=num(raw.hurt,0,0,1);
 for(const e of g.enemies){const r=Array.isArray(raw.enemies)?raw.enemies.find(n=>n&&n.id===e.id):null;if(!r)continue;e.x=num(r.x,e.x,e.homeX-13,e.homeX+13);e.z=num(r.z,e.z,e.homeZ-13,e.homeZ+13);e.hp=num(r.hp,e.maxHp,0,e.maxHp);e.respawn=e.hp?0:num(r.respawn,8,0,12);e.slow=num(r.slow,0,0,6);e.frost=num(r.frost,0,0,5);e.frostTick=num(r.frostTick,1,0,1);e.frostDamage=num(r.frostDamage,10,0,1e7);e.yaw=num(r.yaw,0,-100,100);e.casts=Math.floor(num(r.casts,0));e.aimX=num(r.aimX,e.x,-115,120);e.aimZ=num(r.aimZ,e.z,-115,75);e.state=['idle','chase','windup','recover','return'].includes(r.state)?r.state:'idle';e.timer=num(r.timer,0,0,2);}
 g.projectiles=Array.isArray(raw.projectiles)?raw.projectiles.filter(p=>p&&['stone','bullet','slow','frost','fireball','sand'].includes(p.kind)&&g.enemies.some(e=>e.id===p.target)&&Number.isFinite(p.x)&&Number.isFinite(p.z)).slice(0,30).map(p=>({...p,x:num(p.x,0,-140,145),z:num(p.z,0,-140,100),vx:num(p.vx,0,-80,80),vz:num(p.vz,0,-80,80),life:num(p.life,1,0,3),damage:num(p.damage,0,0,1e7)})):[];
 g.icebergs=Array.isArray(raw.icebergs)?raw.icebergs.filter(b=>b&&g.enemies.some(e=>e.id===b.target)&&Number.isFinite(b.x)&&Number.isFinite(b.z)).slice(0,3).map(b=>({target:b.target,x:b.x,z:b.z,left:num(b.left,.9,0,1.2),duration:b.kind==='meteor'?1.2:.9,kind:b.kind==='meteor'?'meteor':'iceberg',damage:num(b.damage,b.kind==='meteor'?100:50,0,1e7)})):[];
 g.areas=Array.isArray(raw.areas)?raw.areas.filter(a=>a&&['flame','sandstorm','thunder','gravity','lightning'].includes(a.kind)&&Number.isFinite(a.x)&&Number.isFinite(a.z)).slice(0,12).map(a=>({kind:a.kind,x:num(a.x,0,-115,120),z:num(a.z,0,-115,75),radius:num(a.radius,6,0,7),left:num(a.left,0,0,5),tick:num(a.tick,1,0,999),damage:num(a.damage,0,0,1e7)})):[];
 g.enemyShots=Array.isArray(raw.enemyShots)?raw.enemyShots.filter(p=>p&&['lead','ember','spark'].includes(p.kind)&&Number.isFinite(p.x)&&Number.isFinite(p.z)).slice(0,40).map(p=>({kind:p.kind,x:num(p.x,0,-140,145),z:num(p.z,0,-140,100),vx:num(p.vx,0,-40,40),vz:num(p.vz,0,-40,40),life:num(p.life,1,0,3),damage:num(p.damage,8,0,100)})):[];
 return g;
}
export function blocked(x,z){return BUILDINGS.some(b=>Math.abs(x-b.x)<b.w/2+.45&&Math.abs(z-b.z)<b.d/2+.45);}
export function nearestPlace(g){return PLACES.filter(p=>p.island===g.island).map(p=>({...p,distance:Math.hypot(g.x-p.x,g.z-p.z)})).filter(p=>p.distance<4.1).sort((a,b)=>a.distance-b.distance)[0]||null;}
export function target(g,range=48){return g.enemies.filter(e=>e.island===g.island&&e.hp>0&&Math.hypot(e.x-g.x,e.z-g.z)<=range).sort((a,b)=>Math.hypot(a.x-g.x,a.z-g.z)-Math.hypot(b.x-g.x,b.z-g.z))[0]||null;}
function event(g,text,kind='info',x=g.x,z=g.z){g.events.push({text,kind,x,z});if(g.events.length>20)g.events.shift();}
export function acceptQuest(g){if(g.quest)return false;g.quest={island:g.island,count:0};event(g,'Quest accepted · defeat 5 '+ISLANDS[g.island].plural+'!');return true;}
export function questReward(island){return {money:ISLANDS[island].questMoney,levels:1,points:3};}
export function claimQuest(g){if(!g.quest||g.quest.count<5||g.quest.island!==g.island)return false;const reward=questReward(g.quest.island);g.completed++;g.level++;g.money+=reward.money;g.points+=3;g.hp=maxHP(g);g.pendingCoins.push(g.runId+'-'+g.completed);g.quest=null;event(g,'LEVEL '+g.level+' · +$'+reward.money+' · +3 stat points','level');for(const i of Object.values(ISLANDS))if(g.level===i.level)event(g,i.name+' unlocked! Visit a ferry.','level');return true;}
export function spendStat(g,id){if(!Object.hasOwn(STAT_NAMES,id)||g.points<1)return false;g.points--;g.stats[id]++;if(id==='defense')g.hp=Math.min(maxHP(g),g.hp+10);return true;}
export function buyWeapon(g,id){const w=WEAPONS.find(w=>w.id===id);if(!w||g.island!=='town'||g.level<10||g.owned.includes(id)||g.money<w.price)return false;g.money-=w.price;g.owned.push(id);g.weapon=id;event(g,w.name+' purchased & equipped.');return true;}
export function equipWeapon(g,id){if(!g.owned.includes(id))return false;g.weapon=id;return true;}
export function buyFruit(g,id){const f=FRUITS.find(f=>f.id===id);if(!f||g.island!=='town'||g.level<10||g.fruits.includes(id)||g.money<f.price||g.level<f.level)return false;g.money-=f.price;g.fruits.push(id);event(g,f.name+' purchased. Eat it to unlock its moves.');return true;}
export function eatFruit(g,id){if(!g.fruits.includes(id))return false;g.fruit=id;event(g,FRUITS.find(f=>f.id===id).name+' eaten! Z and X use your powers.');return true;}
export function travel(g,destination){if(!Object.hasOwn(ISLANDS,destination)||g.level<ISLANDS[destination].level||g.island===destination)return false;g.island=destination;g.x=ISLANDS[destination].spawn.x;g.z=ISLANDS[destination].spawn.z;g.y=0;g.vy=0;g.hp=maxHP(g);g.projectiles=[];g.icebergs=[];g.areas=[];g.enemyShots=[];event(g,'Welcome to '+ISLANDS[destination].name+'!');return true;}
function damage(g,e,amount,kind='hit'){if(!e||e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.hit=.25;event(g,'−'+amount,kind,e.x,e.z);if(!e.hp){e.state='idle';e.respawn=9;e.frost=0;e.slow=0;g.kills++;const bounty=ISLANDS[e.island].bounty;g.money+=bounty;if(g.quest?.island===e.island&&g.quest.count<5)g.quest.count++;event(g,e.name+' defeated · +$'+bounty+(g.quest?.island===e.island?' · '+g.quest.count+'/5':''),'kill',e.x,e.z);}}
export function attack(g){const w=WEAPONS.find(w=>w.id===g.weapon);if(g.attack>0)return false;const e=target(g,w.range);if(!e){event(g,'Move closer to an enemy.');return false;}g.yaw=Math.atan2(e.x-g.x,e.z-g.z);g.attack=w.cooldown;g.swing=.28;const power=w.damage+(w.kind==='melee'?g.stats.strength*2:g.stats.gun*3);if(w.kind==='melee')damage(g,e,power);else shoot(g,e,w.id==='slingshot'?'stone':'bullet',w.speed,power);return true;}
function shoot(g,e,kind,speed,damage=0){const dx=e.x-g.x,dz=e.z-g.z,d=Math.hypot(dx,dz)||1;g.projectiles.push({kind,target:e.id,x:g.x,z:g.z,vx:dx/d*speed,vz:dz/d*speed,damage,life:3});g.yaw=Math.atan2(dx,dz);g.swing=.32;}
export function fruitDamage(g,base){return base>0?Math.round(base+g.stats.fruit*2):0;}
export function moveDescription(g,fruit,index){return fruit.moves[index].description.replace('{damage}',fruitDamage(g,fruit.moves[index].base));}
function area(g,kind,x,z,radius,left,damage,tick=1){g.areas.push({kind,x,z,radius,left,damage,tick});}
function areaDamage(g,x,z,radius,amount,kind='hit'){for(const e of g.enemies)if(e.island===g.island&&e.hp>0&&Math.hypot(e.x-x,e.z-z)<=radius)damage(g,e,amount,kind);}
export function usePower(g,index){if(!g.fruit||![0,1].includes(index)||g.cooldowns[index]>0)return false;const f=FRUITS.find(f=>f.id===g.fruit);if(!f)return false;const move=f.moves[index],power=fruitDamage(g,move.base);
 if(g.fruit==='slow'&&index===1){g.freeze=10;g.cooldowns[1]=30*Math.max(.5,1-g.stats.fruit*.02);event(g,'TIME STOP · 10 seconds. Keep moving!','power');return true;}
 const e=target(g,g.fruit==='ember'&&index===1?7:32);if(!e){event(g,'No enemy in power range. Get closer.');return false;}g.cooldowns[index]=move.cooldown*Math.max(.5,1-g.stats.fruit*.02);
 if(g.fruit==='slow')shoot(g,e,'slow',22,power);
 else if(g.fruit==='glacier'){if(index===0)g.icebergs.push({target:e.id,x:e.x,z:e.z,left:.9,duration:.9,kind:'iceberg',damage:power});else shoot(g,e,'frost',30,power);}
 else if(g.fruit==='ember'){if(index===0)shoot(g,e,'fireball',24,power);else{areaDamage(g,g.x,g.z,7,power);area(g,'flame',g.x,g.z,7,.65,0,999);}}
 else if(g.fruit==='sand'){if(index===0)shoot(g,e,'sand',30,power);else area(g,'sandstorm',e.x,e.z,6,5,power);}
 else if(g.fruit==='storm'){if(index===0){damage(g,e,power,'ice');area(g,'lightning',e.x,e.z,1,.4,0,999);}else area(g,'thunder',e.x,e.z,6,3,power);}
 else if(g.fruit==='gravity'){if(index===0)g.icebergs.push({target:e.id,x:e.x,z:e.z,left:1.2,duration:1.2,kind:'meteor',damage:power});else area(g,'gravity',e.x,e.z,7,5,power);}
 event(g,move.name.toUpperCase()+(power?' · '+power+' damage'+(['Frostbite','Sandstorm','Thunderstorm','Gravity Well'].includes(move.name)?' per tick':''):''),'power');return true;
}
function safe(g){return PLACES.some(p=>p.island===g.island&&Math.hypot(g.x-p.x,g.z-p.z)<4.5);}
function move(g,dx,dz,dt){const i=ISLANDS[g.island],speed=6.7;let x=g.x+dx*speed*dt,z=g.z+dz*speed*dt;const d=Math.hypot(x-i.x,z-i.z);if(d>i.r-.6){x=i.x+(x-i.x)/d*(i.r-.6);z=i.z+(z-i.z)/d*(i.r-.6);}if(!blocked(x,g.z))g.x=x;if(!blocked(g.x,z))g.z=z;if(Math.hypot(dx,dz)>.1)g.yaw=Math.atan2(dx,dz);}
function respawnPlayer(g){const s=ISLANDS[g.island].spawn;g.x=s.x;g.z=s.z;g.y=0;g.vy=0;g.hp=maxHP(g);g.hurt=1;g.projectiles=[];g.icebergs=[];g.areas=[];g.enemyShots=[];for(const e of g.enemies){e.x=e.homeX;e.z=e.homeZ;e.state='idle';e.timer=0;}event(g,'Rescued at the dock. Your quest, money and levels are safe.','rescue');}
function hurtPlayer(g,amount){g.hp-=amount;g.hurt=.55;g.regen=0;event(g,'−'+amount,'hurt',g.x,g.z);if(g.hp<=0)respawnPlayer(g);}
function tick(g,input,dt){
 g.time+=dt;g.attack=Math.max(0,g.attack-dt);g.swing=Math.max(0,g.swing-dt);g.hurt=Math.max(0,g.hurt-dt);g.cooldowns=g.cooldowns.map(c=>Math.max(0,c-dt));
 const frozen=Math.min(dt,g.freeze),worldDt=dt-frozen;g.freeze=Math.max(0,g.freeze-dt);
 let dx=num(input.x,0,-1,1),dz=num(input.z,0,-1,1),length=Math.hypot(dx,dz);if(length>1){dx/=length;dz/=length;}move(g,dx*(input.sprint?1.4:1),dz*(input.sprint?1.4:1),dt);
 if(input.jump&&g.y===0){g.vy=7;}g.vy-=18*dt;g.y=Math.max(0,g.y+g.vy*dt);if(!g.y)g.vy=0;
 if(input.attack)attack(g);
 // Player-created attacks stay active in Time Stop. Bandits, windups, slows,
 // frost damage and enemy respawns use worldDt and remain frozen.
 for(const p of g.projectiles){p.life-=dt;const e=g.enemies[p.target];if(!e||e.hp<=0){p.life=0;continue;}const ox=p.x,oz=p.z;p.x+=p.vx*dt;p.z+=p.vz*dt;if(blocked(p.x,p.z)){p.life=0;continue;}const vx=p.x-ox,vz=p.z-oz,t=clamp(((e.x-ox)*vx+(e.z-oz)*vz)/(vx*vx+vz*vz||1),0,1);if(Math.hypot(ox+vx*t-e.x,oz+vz*t-e.z)<1){if(p.kind==='slow'){damage(g,e,p.damage);e.slow=6;event(g,'SLOWED · 6 seconds','power',e.x,e.z);}else if(p.kind==='frost'){e.frost=5;e.frostTick=1;e.frostDamage=p.damage;event(g,'FROSTBITE','ice',e.x,e.z);}else {damage(g,e,p.damage);if(p.kind==='sand'&&e.hp>0)e.slow=3;}p.life=0;}}
 g.projectiles=g.projectiles.filter(p=>p.life>0);
 for(const b of g.icebergs){b.left-=dt;if(b.left<=0){if(b.kind==='meteor')areaDamage(g,b.x,b.z,5,b.damage);else{const e=g.enemies[b.target];if(e&&e.hp>0&&Math.hypot(e.x-b.x,e.z-b.z)<4.5)damage(g,e,b.damage??50,'ice');}event(g,b.kind==='meteor'?'Meteor impact':'Ice impact','impact',b.x,b.z);}}g.icebergs=g.icebergs.filter(b=>b.left>0);
 for(const a of g.areas){const elapsed=Math.min(a.left,dt);a.left-=elapsed;a.tick-=elapsed;if(a.kind==='gravity'&&worldDt)for(const e of g.enemies){if(e.island!==g.island||e.hp<=0)continue;const dx=a.x-e.x,dz=a.z-e.z,d=Math.hypot(dx,dz);if(d>.5&&d<a.radius){const nx=e.x+dx/d*2.6*worldDt,nz=e.z+dz/d*2.6*worldDt;if(!blocked(nx,nz)){e.x=nx;e.z=nz;}}}if(a.kind==='sandstorm')for(const e of g.enemies)if(e.island===g.island&&e.hp>0&&Math.hypot(e.x-a.x,e.z-a.z)<=a.radius)e.slow=Math.max(e.slow,.25);while(a.tick<=1e-8){areaDamage(g,a.x,a.z,a.radius,a.damage,a.kind==='thunder'?'ice':'hit');a.tick+=1;}}g.areas=g.areas.filter(a=>a.left>1e-8);
 if(worldDt)for(const p of g.enemyShots){const ox=p.x,oz=p.z;p.life-=worldDt;p.x+=p.vx*worldDt;p.z+=p.vz*worldDt;if(blocked(p.x,p.z)){p.life=0;continue;}const vx=p.x-ox,vz=p.z-oz,t=clamp(((g.x-ox)*vx+(g.z-oz)*vz)/(vx*vx+vz*vz||1),0,1);if(g.y<1.2&&Math.hypot(ox+vx*t-g.x,oz+vz*t-g.z)<.65){if(!safe(g)&&g.hurt<=0)hurtPlayer(g,p.damage);p.life=0;}}g.enemyShots=g.enemyShots.filter(p=>p.life>0);
 for(const e of g.enemies){e.hit=Math.max(0,e.hit-dt);if(!worldDt)continue;if(e.hp<=0){e.respawn-=worldDt;if(e.respawn<=0){Object.assign(e,{hp:e.maxHp,x:e.homeX,z:e.homeZ,state:'idle',timer:0,slow:0,frost:0});}continue;}e.slow=Math.max(0,e.slow-worldDt);
 if(e.frost>0){const elapsed=Math.min(e.frost,worldDt);e.frost-=elapsed;e.frostTick-=elapsed;while(e.frostTick<=1e-8&&e.hp>0){damage(g,e,e.frostDamage??10,'ice');e.frostTick+=1;}if(!e.hp)continue;}
 if(e.island!==g.island)continue;
 const cfg=ISLANDS[e.island],ranged=cfg.range>3,d=Math.hypot(g.x-e.x,g.z-e.z),home=Math.hypot(e.x-e.homeX,e.z-e.homeZ),factor=e.slow>0?.3:1,protectedZone=safe(g);
 if(protectedZone||home>13||d>22){e.state='return';e.timer=0;}else if(e.state==='idle'&&d<(ranged?16:9))e.state='chase';
 if(e.state==='windup'){e.timer-=worldDt*factor;if(e.timer<=0){if(!protectedZone){if(!ranged){if(d<2.5&&g.y<1.1&&g.hurt<=0)hurtPlayer(g,cfg.damage);}else if((e.type==='ember'||e.type==='storm')&&e.casts%2===1){event(g,e.type==='ember'?'Eruption!':'Lightning!','impact',e.aimX,e.aimZ);if(Math.hypot(g.x-e.aimX,g.z-e.aimZ)<2.7&&g.y<1.2&&g.hurt<=0)hurtPlayer(g,cfg.damage+6);}else{const dx=e.aimX-e.x,dz=e.aimZ-e.z,l=Math.hypot(dx,dz)||1;g.enemyShots.push({kind:e.type==='marine'?'lead':e.type==='ember'?'ember':'spark',x:e.x,z:e.z,vx:dx/l*(e.type==='marine'?15:11),vz:dz/l*(e.type==='marine'?15:11),life:3,damage:cfg.damage});}e.casts++;}e.state='recover';e.timer=ranged?1.7:1;}}
 else if(e.state==='recover'){e.timer-=worldDt*factor;if(e.timer<=0)e.state='chase';}
 else if(e.state==='return'){const a=e.homeX-e.x,b=e.homeZ-e.z,l=Math.hypot(a,b);if(l<.3){e.state='idle';e.hp=Math.min(e.maxHp,e.hp+worldDt*5);}else{const nx=e.x+a/l*2.5*worldDt,nz=e.z+b/l*2.5*worldDt;if(!blocked(nx,nz)){e.x=nx;e.z=nz;}}}
 else if(e.state==='chase'){e.yaw=Math.atan2(g.x-e.x,g.z-e.z);if(d<cfg.range){e.state='windup';e.timer=ranged?1:.7;e.aimX=g.x;e.aimZ=g.z;}else{const speed=cfg.speed*factor*worldDt,nx=e.x+(g.x-e.x)/(d||1)*speed,nz=e.z+(g.z-e.z)/(d||1)*speed;if(!blocked(nx,nz)){e.x=nx;e.z=nz;}}}

 }
 // Enemies separate so that they do not collapse into one unreadable target.
 for(let a=0;a<g.enemies.length&&worldDt;a++)for(let b=a+1;b<g.enemies.length;b++){const e=g.enemies[a],f=g.enemies[b];if(!e.hp||!f.hp||e.island!==f.island)continue;const dx=e.x-f.x,dz=e.z-f.z,d=Math.hypot(dx,dz);if(d>0&&d<1.1){const push=(1.1-d)*.5;e.x+=dx/d*push;e.z+=dz/d*push;f.x-=dx/d*push;f.z-=dz/d*push;}}
 g.regen+=dt;if((safe(g)||g.regen>5)&&g.hp<maxHP(g))g.hp=Math.min(maxHP(g),g.hp+dt*(safe(g)?12:3));
}
export function step(g,input={},dt=0){if(!Number.isFinite(dt)||dt<=0)return;let remaining=Math.min(dt,60);while(remaining>1e-8){const slice=Math.min(remaining,1/60);tick(g,input,slice);remaining-=slice;}}
