export const SAVE_KEY='archerbox-bearwatch-v1';
export const DAY_SECONDS=240,NIGHT_SECONDS=120,DAILY_DIAMONDS=5,CENTURY_DIAMONDS=100;
export const CHEST_DAYS=2,HIKE_UNLOCK=120,FIRE_START=300,FIRE_MAX=480,LOG_SECONDS=120;
export const FIRE={x:0,z:11};
export const SPECIES=Object.freeze({deer:{name:'Deer',health:60,food:3,height:1.15,radius:.55,speed:2.2,flee:5.2},rabbit:{name:'Rabbit',health:25,food:1,height:.32,radius:.27,speed:1.3,flee:4.5},sheep:{name:'Sheep',health:45,food:2,height:.78,radius:.5,speed:1.5,flee:3.4}});
export const BERRIES=[[-12,-2],[15,1],[22,13],[-14,16],[8,-22],[-23,2]].map(([x,z],id)=>({id,x,z}));
export const CAMP_GOALS=[{id:'wood',name:'Gather 6 wood',target:6,reward:5},{id:'hunt',name:'Collect 3 food from hunts',target:3,reward:8},{id:'cook',name:'Cook 2 meals',target:2,reward:5}];
const ANIMAL_STARTS=[['deer',-12,-9],['deer',12,-20],['deer',19,20],['rabbit',-7,-9],['rabbit',8,-10],['rabbit',-17,3],['sheep',12,0],['sheep',22,8],['sheep',-17,17]];
export const bearDanger=g=>g.phase==='night'&&g.survived>=1;
function freshWildlife(){return ANIMAL_STARTS.map(([kind,x,z],id)=>({id,kind,x,z,homeX:x,homeZ:z,yaw:id*1.7,health:SPECIES[kind].health,mode:'graze',flee:0,walk:0,turn:2+id*.27,down:false,harvested:false}));}
export const AXE=Object.freeze({id:"axe",name:"Woodcutting Axe",range:3.3,damage:18,stun:1.1,cooldown:.6});
export const LIMIT=29,BASE={x:0,z:11};
export const CANS=[[-5,8],[5,5],[-3,-1],[11,-14],[-21,-16],[20,6],[-8,-23],[2,24]].map(([x,z],id)=>({id,x,z}));
export const SHOP={x:5,z:14};
export const CHEST={x:-5,z:15};
export const MOUNTAINS=Object.freeze([
 {id:'pinecrest',name:'Pinecrest',x:-19,z:-8,radius:6.5,height:6,reward:10,color:0x93917b},
 {id:'sunridge',name:'Sunridge',x:20,z:-20,radius:7,height:8,reward:10,color:0xaa9c7b},
 {id:'moonpeak',name:'Moonpeak',x:-20,z:21,radius:6.5,height:10,reward:10,color:0x8a9592}
]);
// A broad, walkable summit and continuous slopes share one height function
// between physics, the camera and the rendered terrain.
export function groundHeight(x,z){let y=0;for(const m of MOUNTAINS){const r=Math.hypot(x-m.x,z-m.z);if(r<m.radius)y=Math.max(y,m.height*Math.min(1,(m.radius-r)/(m.radius-1.2)));}return y;}
export const WEAPONS=Object.freeze([
 {id:'stick',name:'Camp Stick',price:0,range:2.8,damage:12,stun:.8,cooldown:1.0,tag:'YOUR STARTER',detail:'A close-range bonk. Always in your backpack.',icon:'╱'},
 {id:'bat',name:'Ranger Bat',price:5,range:3.2,damage:25,stun:1.6,cooldown:1.0,tag:'CLOSE & PERSONAL',detail:'A stronger swing that knocks the bear back.',icon:'╱'},
 {id:'slingshot',name:'Slingshot',price:20,range:19,damage:18,stun:1.2,cooldown:.75,tag:'KEEP YOUR DISTANCE',detail:'Unlimited pebbles. Aim at the bear to slow it.',icon:'Y'},
 {id:'crossbow',name:'Ranger Crossbow',price:50,range:27,damage:40,stun:2.4,cooldown:1.6,tag:'STEADY YOUR AIM',detail:'A powerful foam bolt with a longer reach.',icon:'⌁'},
 {id:'tranquilizer',name:'Sleep Dart',price:100,range:30,damage:15,stun:7,cooldown:4,tag:'MAKE YOUR ESCAPE',detail:'A sleepy dart buys seven seconds to find a can.',icon:'⊙'},
 {id:'flare',name:'Flare Launcher',price:180,range:25,damage:65,stun:4.5,cooldown:3,tag:'LIGHT UP THE NIGHT',detail:'A bright flare that scares the bear away.',icon:'✳'},
 {id:'trail-pistol',name:'Trail Pistol',chestOnly:true,range:23,damage:22,stun:.7,cooldown:.4,tag:'GOLDEN CHEST REWARD',detail:'A quick ranger sidearm. Only found in golden chests.',icon:'⌐'},
 {id:'carbine',name:'Ranger Carbine',chestOnly:true,range:30,damage:34,stun:1.2,cooldown:.55,tag:'GOLDEN CHEST REWARD',detail:'A steady trail rifle. Only found in golden chests.',icon:'⌁'},
 {id:'gold-rifle',name:'Golden Rifle',chestOnly:true,range:35,damage:60,stun:2,cooldown:.7,tag:'LEGENDARY CHEST REWARD',detail:'A shining golden rifle. The rarest chest prize.',icon:'✦'},
 {id:'hunting-rifle',name:'Hunting Rifle',price:0,range:30,damage:35,stun:1.2,cooldown:1.1,tag:'FREE HUNTING GEAR',detail:'Your starter hunting rifle. Aim for deer, rabbits or sheep, then collect their food.',icon:'⌁'}
]);
export const CHEST_LOOT=Object.freeze([
 {id:'trail-pistol',rarity:'Common',chance:35,color:'#a7bca7'},
 {id:'carbine',rarity:'Rare',chance:30,color:'#91bde8'},
 {id:'tranquilizer',rarity:'Rare',chance:20,color:'#91bde8'},
 {id:'flare',rarity:'Epic',chance:10,color:'#ceb1ed'},
 {id:'gold-rifle',rarity:'Legendary',chance:5,color:'#f2d17d'}
]);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const integer=(v,a,b,f=a)=>Math.round(clamp(finite(v,f),a,b));
export function seeded(seed=8361){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const random=seeded();
export const TREES=[];
for(let i=0;i<180;i++){
 const x=(random()-.5)*74,z=(random()-.5)*74;
 if(Math.abs(x)<9.8&&z>1&&z<22||Math.abs(x)<2.5&&z<4||CANS.some(c=>Math.hypot(x-c.x,z-c.z)<2.3)||MOUNTAINS.some(m=>Math.hypot(x-m.x,z-m.z)<m.radius+.5)||Math.hypot(x,z)<4)continue;
 TREES.push({x,z,size:1.3+random()*1.4,tint:random()});
}
export const ROCKS=[[-11,12,1.6],[-18,4,1.4],[16,-5,2],[-4,-13,1.5],[6,-21,1.2],[21,20,1.4]].map(([x,z,r])=>({x,z,r}));
const WALLS=[{x:-8,z:11,w:.6,d:16},{x:8,z:11,w:.6,d:16},{x:0,z:19,w:16,d:.6},{x:-5,z:3,w:6,d:.6},{x:5,z:3,w:6,d:.6}];
function blocked(x,z,g){
 const night=g.phase!=="day";
 if(Math.abs(x)>LIMIT||Math.abs(z)>LIMIT)return true;
 if(TREES.some((t,id)=>!g.felled.includes(id)&&Math.hypot(x-t.x,z-t.z)<.35+t.size*.15))return true;
 if(ROCKS.some(r=>Math.hypot(x-r.x,z-r.z)<r.r+.32))return true;
 if(g.fireFuel>0&&CANS.some(c=>Math.hypot(x-c.x,z-c.z)<.92))return true;
 if(chestCount(g)>0&&distance({x,z},CHEST)<1)return true;
 if(Math.abs(x-5)<2.5&&Math.abs(z-15.5)<1.7)return true;
 if(Math.hypot(x,z-11)<1.2)return true;
 return !night&&WALLS.some(w=>Math.abs(x-w.x)<w.w/2+.32&&Math.abs(z-w.z)<w.d/2+.32);
}
export function freshGame({diamonds=0,owned=['stick'],runId=globalThis.crypto?.randomUUID?.()||'run-'+Date.now()}={}){
 const g={version:1,runId,phase:'day',survived:0,elapsed:0,time:0,diamonds:integer(diamonds,0,999999),owned:[...new Set(['stick','hunting-rifle',...owned.filter(id=>WEAPONS.some(w=>w.id===id))])],equipped:'hunting-rifle',best:0,wins:0,coinTickets:[],hunger:100,rawFood:0,meals:1,cooking:0,foodWarned:false,deathCause:null,wildlife:freshWildlife(),wildlifeClock:0,berryPicked:[],taskCounts:{wood:0,hunt:0,cook:0},taskClaimed:[],fireFuel:FIRE_START,wood:2,tool:null,felled:[],treeHits:{},woodDrops:[],fuelLowWarned:false,hikeUnlocked:false,peaks:[],chestReady:0,chestsOpened:0,pendingRoll:null,
 player:{x:0,z:15,y:0,vy:0,yaw:0,pitch:0,health:100,stamina:100,hidden:-1,invulnerable:0,walk:0},
 bear:{x:-21,z:-23,yaw:0,health:100,stun:0,retreat:0,mode:'away',search:0,lastX:0,lastZ:10,patrol:0,walk:0},cooldown:0,flash:0,shot:null,event:'Welcome to Pine Hollow.',eventTime:6,eventId:0};
 for(const a of g.wildlife){for(let n=0;n<30&&blocked(a.x,a.z,g);n++){a.x=clamp(a.homeX+Math.sin(n*2.4)*(1+n*.18),-26,26);a.z=clamp(a.homeZ+Math.cos(n*2.4)*(1+n*.18),-26,26);}a.homeX=a.x;a.homeZ=a.z;}
 return g;
}
export function notice(g,text,seconds=4){g.event=text;g.eventTime=seconds;g.eventId++;}
export const wallsUp=g=>g.phase==='day';
export const weapon=g=>g.tool==='axe'?AXE:WEAPONS.find(w=>w.id===g.equipped)||WEAPONS[0];
function goalProgress(g,id,count){g.taskCounts[id]+=count;for(const goal of CAMP_GOALS)if(!g.taskClaimed.includes(goal.id)&&g.taskCounts[goal.id]>=goal.target){g.taskClaimed.push(goal.id);g.diamonds+=goal.reward;notice(g,g.event+' CAMP GOAL: +'+goal.reward+' diamonds!',7);}}
export function nearestFood(g){let result=null;for(const a of g.wildlife)if(a.down&&!a.harvested){const d=distance(g.player,a);if(d<2.8&&(!result||d<result.distance))result={...a,distance:d};}return result;}
export function harvestFood(g){if(g.player.hidden>=0||!['day','night'].includes(g.phase))return false;const found=nearestFood(g);if(!found)return false;const a=g.wildlife[found.id],food=SPECIES[a.kind].food;a.harvested=true;g.rawFood+=food;notice(g,'Collected '+food+' raw food. Press R at the campfire to cook it.',6);goalProgress(g,'hunt',food);return true;}
export function nearestBerries(g){return BERRIES.find(b=>!g.berryPicked.includes(b.id)&&distance(g.player,b)<2.5)||null;}
export function forage(g){if(g.player.hidden>=0||!['day','night'].includes(g.phase))return false;const b=nearestBerries(g);if(!b)return false;g.berryPicked.push(b.id);g.hunger=clamp(g.hunger+12,0,100);notice(g,'Fresh berries! +12 hunger. Bushes refill tomorrow.',5);return true;}
export function cookFood(g){
 if(!nearFire(g)||!['day','night'].includes(g.phase)){notice(g,'Stand beside the campfire to cook.');return false;}
 if(g.cooking>0){notice(g,'Your meal is still cooking.');return false;}
 if(g.fireFuel<=0){notice(g,'Add wood first. Cooking needs a lit fire.');return false;}
 if(g.rawFood<1){notice(g,'Hunt an animal and collect its food with E first.');return false;}
 g.rawFood--;g.cooking=5;notice(g,'Cooking one meal… keep the fire lit!',5);return true;
}
export function eatMeal(g){if(!['day','night'].includes(g.phase))return false;if(g.meals<1){notice(g,'No meals. Hunt, collect food, then cook it at camp.');return false;}if(g.hunger>90){notice(g,'You are full. Save your meal for later.');return false;}g.meals--;g.hunger=clamp(g.hunger+45,0,100);g.player.health=clamp(g.player.health+12,0,100);g.foodWarned=false;notice(g,'Meal eaten! +45 hunger and +12 health.',5);return true;}
export const canHike=g=>g.phase==='day'&&g.elapsed>=HIKE_UNLOCK;
export const nearFire=g=>g.player.hidden<0&&distance(g.player,FIRE)<2.8;
export function toggleAxe(g){g.tool=g.tool==='axe'?null:'axe';notice(g,g.tool?'Axe ready. Aim at a tree and click to chop.':'Weapon ready.');return g.tool;}
export function nearestTree(g){
 let result=null;for(const [id,t] of TREES.entries()){const d=distance(g.player,t),angle=Math.atan2(-(t.x-g.player.x),-(t.z-g.player.z)),diff=Math.atan2(Math.sin(angle-g.player.yaw),Math.cos(angle-g.player.yaw));if(!g.felled.includes(id)&&d<AXE.range&&Math.abs(diff)<.65&&(!result||d<result.distance))result={...t,id,distance:d,hits:g.treeHits[id]||0};}return result;
}
export function nearestWood(g){let result=null;for(const d of g.woodDrops){const n=distance(g.player,d);if(n<2.5&&(!result||n<result.distance))result={...d,distance:n};}return result;}
export function collectWood(g){if(g.player.hidden>=0)return false;const d=nearestWood(g);if(!d){notice(g,'Chop a tree, then press E beside its logs.');return false;}g.wood+=d.count;g.woodDrops=g.woodDrops.filter(x=>x.id!==d.id);notice(g,'Collected '+d.count+' wood. Take it to the campfire!',5);goalProgress(g,'wood',d.count);return true;}
export function fuelFire(g){
 if(!nearFire(g)||!['day','night'].includes(g.phase))return false;
 if(g.wood<1){notice(g,'No wood. Press X for your axe and chop a tree.');return false;}
 if(g.fireFuel>FIRE_MAX-LOG_SECONDS){notice(g,'The fire has plenty of fuel. Save your wood.');return false;}
 const relit=g.fireFuel<=0;g.wood--;g.fireFuel=Math.min(FIRE_MAX,g.fireFuel+LOG_SECONDS);g.fuelLowWarned=false;notice(g,relit?'FIRE RELIT! The hiding cans are back.':'Wood added! +2 minutes of fire. Hiding cans protected.',6);return true;
}
export const chestCount=g=>g.chestReady+(g.pendingRoll?1:0);
export const nearChest=g=>g.player.hidden<0&&distance(g.player,CHEST)<2.7;
export function hikeReward(g){
 if(!canHike(g)||g.player.hidden>=0)return null;
 const m=MOUNTAINS.find(m=>!g.peaks.includes(m.id)&&distance(g.player,m)<=1.4&&groundHeight(g.player.x,g.player.z)>=m.height-.4);
 if(!m)return null;g.peaks.push(m.id);g.diamonds+=m.reward;notice(g,m.name.toUpperCase()+' SUMMIT! +'+m.reward+' diamonds.',7);return m;
}
export function rollChest(g,random=Math.random){
 if(g.pendingRoll)return {ok:true,resumed:true,reward:g.pendingRoll};
 if(g.chestReady<1)return {ok:false,reason:'Survive two days to earn a golden chest.'};
 const pick=clamp(finite(random()),0,.999999)*100;let total=0,drop=CHEST_LOOT.at(-1);
 for(const item of CHEST_LOOT){total+=item.chance;if(pick<total){drop=item;break;}}
 const duplicate=g.owned.includes(drop.id),reward={id:drop.id,rarity:drop.rarity,duplicate,diamonds:duplicate?10:0,number:g.chestsOpened+1};
 g.chestReady--;g.chestsOpened++;if(!duplicate)g.owned.push(drop.id);else g.diamonds+=reward.diamonds;g.equipped=drop.id;g.tool=null;g.pendingRoll=reward;
 notice(g,duplicate?'Duplicate gun! +10 diamonds.':WEAPONS.find(w=>w.id===drop.id).name+' unlocked!',6);
 return {ok:true,reward};
}
export function keepChestPrize(g){if(!g.pendingRoll)return false;g.pendingRoll=null;return true;}
export function nearestCan(g){if(g.fireFuel<=0)return null;let result=null;for(const c of CANS){const d=distance(g.player,c);if(d<2.35&&(!result||d<result.distance))result={...c,distance:d};}return result;}
export function interact(g){
 if(!['day','night'].includes(g.phase))return false;
 const p=g.player;
 if(p.hidden>=0){const c=CANS[p.hidden];const options=[[0,1.5],[1.5,0],[-1.5,0],[0,-1.5]];const exit=options.find(([x,z])=>!blocked(c.x+x,c.z+z,g));if(!exit){notice(g,'The way out is blocked.');return false;}p.x=c.x+exit[0];p.z=c.z+exit[1];p.hidden=-1;notice(g,'Out of hiding. Stay alert.');return true;}
 const can=nearestCan(g);if(!can){notice(g,g.fireFuel<=0?'The fire is out! Add wood at camp to restore hiding cans.':'Get close to a green trash can to hide.');return false;}
 p.hidden=can.id;p.x=can.x;p.z=can.z;p.y=0;p.vy=0;notice(g,'Hidden. Keep the campfire burning to stay safe.',5);return true;
}
export function canShop(g){return g.phase==='day'&&g.player.hidden<0&&distance(g.player,SHOP)<7;}
export function buyWeapon(g,id){
 const w=WEAPONS.find(w=>w.id===id);if(!w)return {ok:false,reason:'Unknown weapon.'};
 if(!canShop(g))return {ok:false,reason:g.phase==='night'?'The shop is closed at night.':'Visit the shop inside your base.'};
 if(g.owned.includes(id)){g.equipped=id;g.tool=null;return {ok:true,owned:true};}
 if(w.chestOnly)return {ok:false,reason:'Find this gun in a golden chest.'};
 if(g.diamonds<w.price)return {ok:false,reason:'You need '+(w.price-g.diamonds)+' more diamonds.'};
 g.diamonds-=w.price;g.owned.push(id);g.equipped=id;g.tool=null;notice(g,w.name+' added to your backpack.');return {ok:true};
}
export function equip(g,id){if(!g.owned.includes(id)||!WEAPONS.some(w=>w.id===id))return false;g.equipped=id;g.tool=null;return true;}
export function attack(g){
 if(!['day','night'].includes(g.phase)||g.cooldown>0||g.player.hidden>=0)return false;
 const w=weapon(g),p=g.player,b=g.bear;g.cooldown=w.cooldown;g.flash=.18;g.shot={x:p.x,z:p.z,yaw:p.yaw,pitch:p.pitch,life:.2,kind:w.id};
 if(g.tool==='axe'){
  const tree=nearestTree(g);if(tree){const hits=(g.treeHits[tree.id]||0)+1;if(hits>=3){delete g.treeHits[tree.id];g.felled.push(tree.id);const bundle=g.woodDrops.find(d=>d.id===tree.id);if(bundle)bundle.count+=3;else g.woodDrops.push({id:tree.id,x:tree.x,z:tree.z,count:3});notice(g,'TIMBER! Press E beside the logs to collect 3 wood.',5);}else{g.treeHits[tree.id]=hits;notice(g,'Chop '+hits+' / 3. Keep chopping!',2);}return true;}
 }
 if(w.range>4)for(const a of g.wildlife)if(!a.down&&distance(p,a)<15)a.flee=5;
 const targets=g.wildlife.filter(a=>!a.down).map(a=>({target:a,radius:SPECIES[a.kind].radius,height:SPECIES[a.kind].height,type:'animal'}));
 if(bearDanger(g)&&b.retreat<=0)targets.push({target:b,radius:.8,height:1.1,type:'bear'});
 // The first visible target on the aimed ray takes the hit. Trunks, rocks and
 // daytime walls block the ray, so hunting cannot shoot through the scenery.
 for(const item of targets.sort((a,b)=>distance(p,a.target)-distance(p,b.target))){
  const a=item.target,d=distance(p,a),angle=Math.atan2(-(a.x-p.x),-(a.z-p.z)),diff=Math.atan2(Math.sin(angle-p.yaw),Math.cos(angle-p.yaw));
  const aimPitch=Math.atan2(groundHeight(a.x,a.z)+item.height-groundHeight(p.x,p.z)-p.y-1.65,Math.max(.1,d));
  if(d>w.range||Math.abs(diff)>Math.max(.025,item.radius/Math.max(d,1))||Math.abs(p.pitch-aimPitch)>Math.max(.035,item.radius/Math.max(d,1)))continue;
  let occluded=false;for(let step=.55;step<d-.7;step+=.45){const nx=p.x+(a.x-p.x)*step/d,nz=p.z+(a.z-p.z)*step/d;const rayY=groundHeight(p.x,p.z)+p.y+1.65+(groundHeight(a.x,a.z)+item.height-groundHeight(p.x,p.z)-p.y-1.65)*step/d;if(blocked(nx,nz,g)||groundHeight(nx,nz)>rayY){occluded=true;break;}}if(occluded)continue;
  if(item.type==='animal'){
   a.health=Math.max(0,a.health-w.damage);a.flee=8;if(a.health<=0){a.down=true;a.mode='down';notice(g,SPECIES[a.kind].name+' hunted. Press E nearby to collect food.',5);}else notice(g,'Hit! Follow the '+SPECIES[a.kind].name.toLowerCase()+'.',3);return true;
  }
 b.health-=w.damage;b.stun=Math.max(b.stun,w.stun);b.x=clamp(b.x-Math.sin(p.yaw)*.65,-28,28);b.z=clamp(b.z-Math.cos(p.yaw)*.65,-28,28);
 if(b.health<=0){b.health=100;b.retreat=18;b.mode='retreat';notice(g,'The bear fled! You have 18 seconds to find cover.');}else notice(g,w.id==='tranquilizer'?'Sleep dart hit! Find a hiding spot.':'Hit! The bear is stunned.',2);
 return true;
 }
 return true;
}
function nightfall(g){g.phase='night';g.elapsed=0;Object.assign(g.bear,{x:-21,z:-23,health:100,stun:0,retreat:0,search:0,mode:'prowl',lastX:0,lastZ:10,patrol:0});notice(g,g.survived===0?'FIRST NIGHT IS SAFE. The bear will not attack. Practice hunting and cooking.':'NIGHTFALL. The walls are gone. Find a trash can!',9);}
function dawn(g){
 g.survived++;g.best=Math.max(g.best,g.survived);g.diamonds+=DAILY_DIAMONDS;g.coinTickets.push(g.runId+'-'+g.survived);g.player.health=100;g.player.stamina=100;g.bear.mode='away';g.elapsed=0;
 g.peaks=[];g.hikeUnlocked=false;g.berryPicked=[];g.taskCounts={wood:0,hunt:0,cook:0};g.taskClaimed=[];for(const a of g.wildlife)if(a.harvested){a.down=false;a.harvested=false;a.health=SPECIES[a.kind].health;a.x=a.homeX;a.z=a.homeZ;a.mode="graze";}
 // Trees regrow at dawn, except directly under a player or bear. Logs remain collectible.
 g.felled=g.felled.filter(id=>distance(g.player,TREES[id])<1||distance(g.bear,TREES[id])<1);g.treeHits={};
 const drop=g.survived%CHEST_DAYS===0;if(drop){g.chestReady++;if(g.player.hidden<0&&distance(g.player,CHEST)<1.4)g.player.z=CHEST.z+1.6;}
 if(g.survived===100){g.phase='won';g.wins++;g.diamonds+=CENTURY_DIAMONDS;notice(g,'100 NIGHTS SURVIVED! +100 bonus diamonds!',12);}
 else{g.phase='day';notice(g,drop?'GOLDEN CHEST ARRIVED AT BASE! '+g.survived+' days survived.':'DAWN. Night '+g.survived+' survived! +5 diamonds · +1 coin',drop?12:7);}
}
function moveBear(g,dt){
 const b=g.bear,p=g.player;b.stun=Math.max(0,b.stun-dt);b.retreat=Math.max(0,b.retreat-dt);
 if(!bearDanger(g)){b.mode='away';return;}
 if(b.retreat>0){b.mode='retreat';return;}
 if(b.stun>0){b.mode='stunned';return;}
 const d=distance(b,p);let tx=b.lastX,tz=b.lastZ;
 if(p.hidden<0&&(d<21||b.mode==='chase')){b.mode='chase';b.lastX=tx=p.x;b.lastZ=tz=p.z;b.search=8;}
 else if(b.search>0){b.mode='search';b.search-=dt;}
 else{b.mode='prowl';const waypoints=[[-16,-13],[14,-7],[3,11],[-18,16],[17,22],[16,-22],[-17,-23]];const target=waypoints[b.patrol%waypoints.length];tx=target[0];tz=target[1];if(Math.hypot(tx-b.x,tz-b.z)<2)b.patrol++;}
 const dx=tx-b.x,dz=tz-b.z,n=Math.hypot(dx,dz),speed=(b.mode==='chase'?3.5+g.survived*.009:2.7);
 if(n>1.45){
  const heading=Math.atan2(dx,dz),step=Math.min(n-1.45,speed*dt);
  // Steer around trunks, rocks, cans and the supply hut instead of walking
  // through scenery. Base-wall collision vanishes at exactly nightfall.
  for(const turn of [0,.55,-.55,1.1,-1.1,1.65,-1.65,2.2,-2.2]){const a=heading+turn,nx=b.x+Math.sin(a)*step,nz=b.z+Math.cos(a)*step;if(blocked(nx,nz,g))continue;b.x=nx;b.z=nz;b.yaw=Math.atan2(-Math.sin(a),-Math.cos(a));b.walk+=step;break;}
 }
 if(p.hidden<0&&distance(b,p)<1.8&&p.invulnerable<=0&&Math.abs(groundHeight(p.x,p.z)+p.y-groundHeight(b.x,b.z))<1.5){p.health=Math.max(0,p.health-34);p.invulnerable=1.8;b.stun=.9;notice(g,'The bear hit you! Sprint to a green trash can.',3);if(p.health===0){g.phase='lost';g.deathCause='bear';notice(g,'Caught by the bear. Your diamonds and weapons are safe.',8);}}
}
function moveWildlife(g,dt){
 g.wildlifeClock+=dt;if(g.wildlifeClock<.12)return;dt=Math.min(.2,g.wildlifeClock);g.wildlifeClock=0;
 for(const a of g.wildlife){if(a.down)continue;const spec=SPECIES[a.kind],d=distance(g.player,a);a.flee=Math.max(0,a.flee-dt);a.turn-=dt;
  if(g.player.hidden<0&&d<5)a.flee=3;
  if(a.flee>0){a.mode='flee';a.yaw=Math.atan2(-(a.x-g.player.x),-(a.z-g.player.z));}
  else if(a.turn<=0){a.mode=a.mode==='graze'?'walk':'graze';a.turn=2.2+Math.sin(g.time+a.id)*.7;a.yaw+=1.1+Math.sin(g.time*.3+a.id)*1.5;if(distance(a,{x:a.homeX,z:a.homeZ})>7)a.yaw=Math.atan2(-(a.homeX-a.x),-(a.homeZ-a.z));}
  if(a.mode==='graze')continue;const speed=a.flee>0?spec.flee:spec.speed*.55,step=speed*dt,nx=a.x-Math.sin(a.yaw)*step,nz=a.z-Math.cos(a.yaw)*step;
  if(Math.abs(nx)<27&&Math.abs(nz)<27&&!blocked(nx,nz,g)){a.x=nx;a.z=nz;a.walk+=step;}else{a.yaw+=1.4;a.turn=.3;}
 }
}
function foodTick(g,dt){
 g.hunger=Math.max(0,g.hunger-dt*.075);
 if(g.hunger<25&&!g.foodWarned){g.foodWarned=true;notice(g,'Getting hungry! Eat a cooked meal with V or forage berries.',7);}
 if(g.hunger<=0){g.player.health=Math.max(0,g.player.health-dt*2);if(g.player.health<=0){g.phase='lost';g.deathCause='hunger';notice(g,'You ran out of food. Your diamonds and weapons are safe.',8);}}
 if(g.cooking>0&&g.fireFuel>0){g.cooking=Math.max(0,g.cooking-dt);if(g.cooking<=1e-7){g.cooking=0;g.meals++;notice(g,'Meal cooked! Press V to eat when hungry.',5);goalProgress(g,'cook',1);}}
}
export function tick(g,input={},seconds=0){
 if(!['day','night'].includes(g.phase)||!Number.isFinite(seconds)||seconds<=0)return;
 // Small substeps make phase boundaries, collision and damage independent of FPS.
 let remaining=Math.min(seconds,DAY_SECONDS+NIGHT_SECONDS);
 while(remaining>1e-8&&['day','night'].includes(g.phase)){
  const duration=g.phase==='day'?DAY_SECONDS:NIGHT_SECONDS,dt=Math.min(remaining,1/30,duration-g.elapsed);remaining-=dt;
  const p=g.player;g.time+=dt;g.elapsed+=dt;g.eventTime=Math.max(0,g.eventTime-dt);g.cooldown=Math.max(0,g.cooldown-dt);g.flash=Math.max(0,g.flash-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
  const wasLit=g.fireFuel>0;g.fireFuel=Math.max(0,g.fireFuel-dt);
  if(wasLit&&g.fireFuel<=0){
   if(p.hidden>=0){const c=CANS[p.hidden];p.hidden=-1;p.x=c.x;p.z=c.z;p.y=0;p.vy=0;}
   notice(g,'FIRE OUT! The hiding cans vanished. Add wood at camp!',9);
  }else if(g.fireFuel>0&&g.fireFuel<=45&&!g.fuelLowWarned){g.fuelLowWarned=true;notice(g,'LOW FIRE! Add wood before the hiding cans disappear.',7);}
  if(g.phase==='day'&&!g.hikeUnlocked&&g.elapsed>=HIKE_UNLOCK){g.hikeUnlocked=true;notice(g,'MOUNTAIN HIKES OPEN! Reach each summit for +10 diamonds today.',8);}
  if(g.shot){g.shot.life-=dt;if(g.shot.life<=0)g.shot=null;}
  if(Number.isFinite(input.yaw))p.yaw=input.yaw;if(Number.isFinite(input.pitch))p.pitch=clamp(input.pitch,-1.15,1.15);
  if(p.hidden<0){
   let x=clamp(finite(input.x),-1,1),z=clamp(finite(input.z),-1,1),n=Math.max(1,Math.hypot(x,z));x/=n;z/=n;
   const moving=Math.hypot(x,z)>.01,sprinting=moving&&input.sprint&&p.stamina>0,speed=sprinting?7.2:4.5;
   p.stamina=clamp(p.stamina+(sprinting?-23:15)*dt,0,100);
   const nx=clamp(p.x+x*speed*dt,-LIMIT+.5,LIMIT-.5),nz=clamp(p.z+z*speed*dt,-LIMIT+.5,LIMIT-.5);
   if(!blocked(nx,p.z,g))p.x=nx;if(!blocked(p.x,nz,g))p.z=nz;if(moving)p.walk+=speed*dt;
   if(input.jump&&p.y===0&&p.vy===0)p.vy=5.6;
   p.vy-=16*dt;p.y=Math.max(0,p.y+p.vy*dt);if(!p.y)p.vy=0;
  }else p.stamina=Math.min(100,p.stamina+20*dt);
  hikeReward(g);foodTick(g,dt);if(g.phase!=="lost"){moveWildlife(g,dt);moveBear(g,dt);}
  if(g.phase==='lost')break;
  if(g.elapsed>=duration-1e-7){if(g.phase==='day')nightfall(g);else dawn(g);}
 }
}
export function restart(g){const next=freshGame({diamonds:g.diamonds,owned:g.owned});next.best=Math.max(g.best,g.survived);next.wins=g.wins;next.equipped=g.equipped;next.coinTickets=[...g.coinTickets];next.chestReady=g.chestReady;next.chestsOpened=g.chestsOpened;next.pendingRoll=g.pendingRoll?{...g.pendingRoll}:null;return next;}
export function restoreGame(raw){
 if(raw?.version!==1)return freshGame();
 const g=freshGame({diamonds:raw.diamonds,owned:Array.isArray(raw.owned)?raw.owned:[]});
 if(typeof raw.runId==='string'&&/^[\w-]{1,48}$/.test(raw.runId))g.runId=raw.runId;
 g.survived=integer(raw.survived,0,100);g.best=integer(raw.best,g.survived,100);g.wins=integer(raw.wins,0,9999);
 g.peaks=Array.isArray(raw.peaks)?[...new Set(raw.peaks.filter(id=>MOUNTAINS.some(m=>m.id===id)))]:[];
 g.chestReady=integer(raw.chestReady,0,100000,Math.floor(g.survived/CHEST_DAYS));g.chestsOpened=integer(raw.chestsOpened,0,100000);
 if(raw.pendingRoll&&CHEST_LOOT.some(w=>w.id===raw.pendingRoll.id)&&g.owned.includes(raw.pendingRoll.id)){const r=raw.pendingRoll,entry=CHEST_LOOT.find(w=>w.id===r.id);g.pendingRoll={id:r.id,rarity:entry.rarity,duplicate:r.duplicate===true,diamonds:r.duplicate===true?10:0,number:integer(r.number,1,100000,1)};}
 g.phase=g.survived===100?'won':['day','night','lost'].includes(raw.phase)?raw.phase:'day';
 g.fireFuel=clamp(finite(raw.fireFuel,FIRE_START),0,FIRE_MAX);g.wood=integer(raw.wood,0,99999,2);g.fuelLowWarned=raw.fuelLowWarned===true;
 g.felled=Array.isArray(raw.felled)?[...new Set(raw.felled.filter(id=>Number.isInteger(id)&&id>=0&&id<TREES.length))]:[];
 if(raw.treeHits&&typeof raw.treeHits==='object')for(const [id,hits] of Object.entries(raw.treeHits))if(Number.isInteger(+id)&&+id>=0&&+id<TREES.length&&!g.felled.includes(+id))g.treeHits[id]=integer(hits,0,2);
 g.woodDrops=Array.isArray(raw.woodDrops)?raw.woodDrops.filter((d,i,a)=>Number.isInteger(d?.id)&&TREES[d.id]&&!a.slice(0,i).some(x=>x?.id===d.id)).slice(0,TREES.length).map(d=>({id:d.id,x:TREES[d.id].x,z:TREES[d.id].z,count:integer(d.count,1,99999,3)})):[];
 g.hunger=clamp(finite(raw.hunger,100),0,100);g.rawFood=integer(raw.rawFood,0,9999);g.meals=integer(raw.meals,0,9999,1);g.cooking=clamp(finite(raw.cooking),0,5);g.foodWarned=raw.foodWarned===true;g.deathCause=['bear','hunger'].includes(raw.deathCause)?raw.deathCause:null;
 g.berryPicked=Array.isArray(raw.berryPicked)?[...new Set(raw.berryPicked.filter(id=>BERRIES[id]))]:[];g.taskClaimed=Array.isArray(raw.taskClaimed)?[...new Set(raw.taskClaimed.filter(id=>CAMP_GOALS.some(c=>c.id===id)))]:[];for(const key of ['wood','hunt','cook'])g.taskCounts[key]=integer(raw.taskCounts?.[key],0,9999);
 if(Array.isArray(raw.wildlife))for(const a of g.wildlife){const r=raw.wildlife.find(r=>r?.id===a.id&&r.kind===a.kind);if(!r)continue;a.x=clamp(finite(r.x,a.x),-27,27);a.z=clamp(finite(r.z,a.z),-27,27);a.yaw=finite(r.yaw);a.health=clamp(finite(r.health,SPECIES[a.kind].health),0,SPECIES[a.kind].health);a.down=r.down===true||a.health<=0;a.harvested=a.down&&r.harvested===true;a.mode=a.down?'down':'graze';a.flee=clamp(finite(r.flee),0,8);a.walk=finite(r.walk);}
 g.elapsed=clamp(finite(raw.elapsed),0,(g.phase==='night'?NIGHT_SECONDS:DAY_SECONDS)-.001);g.time=clamp(finite(raw.time),0,36000);
 equip(g,raw.equipped);g.tool=raw.tool==='axe'?'axe':null;g.hikeUnlocked=g.phase==='day'&&g.elapsed>=HIKE_UNLOCK;
 if(raw.player){const p=g.player,r=raw.player;p.x=clamp(finite(r.x),-28.5,28.5);p.z=clamp(finite(r.z,15),-28.5,28.5);p.yaw=finite(r.yaw);p.pitch=clamp(finite(r.pitch),-1.15,1.15);p.health=clamp(finite(r.health,100),0,100);p.stamina=clamp(finite(r.stamina,100),0,100);p.hidden=integer(r.hidden,-1,CANS.length-1,-1);if(p.hidden>=0){p.x=CANS[p.hidden].x;p.z=CANS[p.hidden].z;if(g.fireFuel<=0)p.hidden=-1;}else if(blocked(p.x,p.z,g)){p.x=0;p.z=15;}if(!p.health)g.phase='lost';}
 if(raw.bear){const b=g.bear,r=raw.bear;b.x=clamp(finite(r.x,-21),-28,28);b.z=clamp(finite(r.z,-23),-28,28);b.health=clamp(finite(r.health,100),1,100);b.yaw=finite(r.yaw);b.stun=clamp(finite(r.stun),0,7);b.retreat=clamp(finite(r.retreat),0,18);b.lastX=clamp(finite(r.lastX),-29,29);b.lastZ=clamp(finite(r.lastZ,10),-29,29);b.search=clamp(finite(r.search),0,8);b.mode=g.phase==='night'?'prowl':'away';b.patrol=integer(r.patrol,0,10000);}
 g.coinTickets=Array.isArray(raw.coinTickets)?[...new Set(raw.coinTickets.filter(s=>typeof s==='string'&&/^[\w-]{1,60}$/.test(s)))].slice(-100):[];
 return g;
}
