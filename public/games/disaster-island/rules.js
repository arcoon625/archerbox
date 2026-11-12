export const ISLANDS=[
 {id:'palm-bay',name:'Palm Bay',tag:'PARADISE WITH A TWIST',hill:{x:14,z:-7},tower:{x:-14,z:-6},bunker:{x:0,z:-8},sand:0xdac18d,grass:0x6c9b65,water:0x368f9b,description:'Beach cabins, a lookout tower, and a stone ridge above the tide.'},
 {id:'harbor-point',name:'Harbor Point',tag:'WEATHER THE WATERFRONT',hill:{x:-14,z:-8},tower:{x:14,z:-7},bunker:{x:0,z:-7},sand:0xcbbda1,grass:0x7a9770,water:0x497f96,description:'A working harbor with a concrete depot and a tall watchtower.'},
 {id:'summit-camp',name:'Summit Camp',tag:'HIGH GROUND. BIG TROUBLE.',hill:{x:0,z:-16},tower:{x:-16,z:-5},bunker:{x:1,z:3},sand:0xcdbb99,grass:0x789775,water:0x438f9c,description:'Timber cabins, pine-covered slopes, and a mountain lookout.'}
];
export const DISASTERS=[
 {id:'flood',name:'Flash Flood',short:'FLOOD',icon:'≈',color:'#80d8e4',hint:'Climb the stone ridge or the lookout. Get above the rising water.'},
 {id:'tornado',name:'Tornado',short:'TORNADO',icon:'↻',color:'#c0ccd2',hint:'Stay away from the funnel. The concrete shelter helps block the wind.'},
 {id:'meteors',name:'Meteor Shower',short:'METEORS',icon:'✦',color:'#ffbc78',hint:'Find a sturdy roof. Red circles show where the next meteors will hit.'},
 {id:'quake',name:'Earthquake',short:'QUAKE',icon:'ϟ',color:'#e7c88a',hint:'Move to open ground. Stay away from buildings that flash amber.'}
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function terrainHeight(map,x,z){const r=Math.hypot(x,z);if(r>31)return -1.4;if(r>27)return .2+(31-r)*.1375;const d=Math.hypot(x-map.config.hill.x,z-map.config.hill.z),bump=Math.max(0,1-d*d/81);return .75+7.15*bump*bump}
const box=(id,x,z,w,d,base,top)=>({id,x,z,w,d,base,top});
export function makeIsland(index=0){
 const config=ISLANDS[clamp(index|0,0,2)],map={config,index:index|0,buildings:[],colliders:[],start:{x:0,z:21}};
 const cabin=(id,x,z,w=6,d=6,kind='cabin')=>{const base=terrainHeight(map,x,z),roof=base+(kind==='bunker'?3.1:3.7),walls=[box(id,x-w/2,z,.3,d,base,roof),box(id,x+w/2,z,.3,d,base,roof),box(id,x,z-d/2,w,.3,base,roof),box(id,x-w*.34,z+d/2,w*.31,.3,base,roof),box(id,x+w*.34,z+d/2,w*.31,.3,base,roof),box(id,x,z,w+.4,d+.4,roof,roof+.22)];map.colliders.push(...walls);map.buildings.push({id,kind,x,z,w,d,base,roof:roof+.22,hp:kind==='bunker'?3:1,broken:false,brokenAt:-1,warning:false,collapseAt:0})};
 cabin('bunker',config.bunker.x,config.bunker.z,9,8,'bunker');cabin('blue-cabin',-11,12);cabin('orange-cabin',11,12);
 const t=config.tower,base=terrainHeight(map,t.x,t.z),top=base+7.0;map.colliders.push(box('tower',t.x,t.z,6.5,6.5,top-.25,top));
 for(let i=0;i<14;i++){const height=base+(i+1)*.5,z=t.z+3.1+(13-i)*.75;map.colliders.push(box('tower',t.x,z,2.7,.78,base,height))}
 map.buildings.push({id:'tower',kind:'tower',x:t.x,z:t.z,w:6.5,d:6.5,base,roof:top,hp:1,broken:false,brokenAt:-1,warning:false,collapseAt:0});return map;
}
function rand(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296}
const aliveBoxes=g=>g.map.colliders.filter(c=>!g.map.buildings.find(b=>b.id===c.id)?.broken);
export function canOccupy(g,p,x,z,boxes=aliveBoxes(g)){for(const b of boxes){if(b.top<=p.y+.61&&p.onGround)continue;if(p.y>=b.top-.04||p.y+1.66<=b.base+.02)continue;const px=clamp(x,b.x-b.w/2,b.x+b.w/2),pz=clamp(z,b.z-b.d/2,b.z+b.d/2);if(Math.hypot(x-px,z-pz)<.30)return false}return true}
export function shelter(g,p){return g.map.buildings.find(b=>b.kind!=='tower'&&!b.broken&&Math.abs(p.x-b.x)<b.w/2-.15&&Math.abs(p.z-b.z)<b.d/2-.15&&p.y+1.4<b.roof)}
export function tornadoPosition(g,t=g.activeTime){const radius=24-Math.min(1,t/8)*10;return {x:Math.cos(t*.20)*radius,z:Math.sin(t*.25-.7)*radius*.9}}
export function goalFor(g){const d=g.disaster;if(d==='flood')return {...g.map.config.hill,label:'STONE RIDGE / HIGH GROUND'};if(d==='tornado'||d==='meteors')return {...g.map.config.bunker,label:'CONCRETE SHELTER'};return {x:0,z:22,label:'OPEN GROUND'}}
function actor(id,name,x,z,g){return {id,name,x,z,y:terrainHeight(g.map,x,z),vy:0,vx:0,vz:0,yaw:Math.PI,hp:100,air:100,alive:true,onGround:true,jumpHeld:false,walk:0,flash:0,stuck:0,waypoint:0,think:0,target:null,fallFrom:0}}
export function createGame({island=0,difficulty='easy',disaster='surprise',seed=714,name='YOU'}={}){
 const g={map:makeIsland(island),difficulty,seed:seed>>>0,selection:disaster,round:1,totalRounds:disaster==='surprise'?4:1,phase:'prepare',elapsed:0,activeTime:0,prep:10,duration:difficulty==='storm'?42:36,water:-.85,actors:[],meteors:[],impacts:[],events:[],serial:0,nextMeteor:1,stats:{survived:0},medkits:[],result:null};
 g.schedule=DISASTERS.map(d=>d.id);for(let i=g.schedule.length-1;i>0;i--){const j=Math.floor(rand(g)*(i+1));[g.schedule[i],g.schedule[j]]=[g.schedule[j],g.schedule[i]]}if(disaster!=='surprise')g.schedule=[DISASTERS.some(d=>d.id===disaster)?disaster:'flood'];resetRound(g,name);return g;
}
function resetRound(g,name){g.disaster=g.schedule[g.round-1];g.phase='prepare';g.elapsed=0;g.activeTime=0;g.water=-.85;g.nextMeteor=1;g.meteors=[];g.impacts=[];g.result=null;g.events=[];g.map.buildings.forEach((b,i)=>{b.hp=b.kind==='bunker'?3:1;b.broken=false;b.brokenAt=-1;b.warning=false;b.collapseAt=6+([2,0,1,3][i])*8});g.actors=[actor(0,name,0,21,g),...['VOLT','BLAZE','AXEL','ECHO','NOVA','LUNA','JAX'].map((n,i)=>actor(i+1,n,(i-3)*2.4,18,g))];g.medkits=[{id:0,x:-4,z:15,used:false},{id:1,x:7,z:-17,used:false},{id:2,x:-19,z:2,used:false}]}
export function nextRound(g){if(g.phase!=='result')return false;g.round++;resetRound(g,g.actors[0].name);return true}
function event(g,type,data={}){g.events.push({id:++g.serial,type,...data});if(g.events.length>30)g.events.shift()}
function damage(g,p,amount,reason){if(!p.alive)return;p.hp=Math.max(0,p.hp-amount);p.flash=.20;if(p.hp===0){p.alive=false;event(g,'out',{actor:p.id,reason})}}
function breakBuilding(g,b){if(b.broken)return;b.broken=true;b.warning=false;b.brokenAt=g.activeTime;event(g,'collapse',{building:b.id});for(const p of g.actors)if(p.alive&&Math.abs(p.x-b.x)<b.w/2+1&&Math.abs(p.z-b.z)<b.d/2+1&&p.y<b.roof+1)damage(g,p,g.difficulty==='storm'?62:42,'falling debris')}
function move(g,p,input,dt,boxes){
 p.flash=Math.max(0,p.flash-dt);if(!p.alive)return;let x=Number(input.x)||0,z=Number(input.z)||0;const length=Math.max(1,Math.hypot(x,z));x/=length;z/=length;const speed=input.sprint?6.7:p.id?4.7:4.8;let vx=x*speed,vz=z*speed;
 if(g.phase==='active'&&g.disaster==='tornado'){const t=tornadoPosition(g),dx=t.x-p.x,dz=t.z-p.z,d=Math.hypot(dx,dz),covered=shelter(g,p)?.kind==='bunker',pull=Math.max(0,1-d/10)*(covered?.12:1);vx+=dx/Math.max(.5,d)*pull*8;vz+=dz/Math.max(.5,d)*pull*8;if(d<3.3&&!covered){p.vy=Math.max(p.vy,3.8);p.onGround=false}}
 const oldX=p.x,oldZ=p.z,oldY=p.y;if(canOccupy(g,p,p.x+vx*dt,p.z,boxes))p.x+=vx*dt;if(canOccupy(g,p,p.x,p.z+vz*dt,boxes))p.z+=vz*dt;p.vx=(p.x-oldX)/dt;p.vz=(p.z-oldZ)/dt;p.walk+=Math.hypot(p.vx,p.vz)*dt;if(Math.hypot(x,z)>.1)p.yaw=Math.atan2(x,z);
 const jump=!!input.jump;if(jump&&!p.jumpHeld&&p.onGround){p.vy=6.5;p.onGround=false;p.fallFrom=p.y}p.jumpHeld=jump;
 let floor=terrainHeight(g.map,p.x,p.z);for(const b of boxes)if(Math.abs(p.x-b.x)<=b.w/2+.04&&Math.abs(p.z-b.z)<=b.d/2+.04&&(b.top<=oldY+.61&&p.onGround||p.vy<=0&&oldY>=b.top-.05))floor=Math.max(floor,b.top);
 if(p.onGround&&floor-oldY<=.61&&floor-oldY>=-.65){p.y=floor;p.vy=0}else{if(p.onGround){p.onGround=false;p.fallFrom=p.y}p.vy-=19*dt;p.y+=p.vy*dt;for(const b of boxes)if(p.vy>0&&Math.abs(p.x-b.x)<b.w/2+.28&&Math.abs(p.z-b.z)<b.d/2+.28&&oldY+1.68<=b.base+.02&&p.y+1.68>b.base){p.y=b.base-1.68;p.vy=0}if(p.y<=floor&&p.vy<=0){const fall=(p.fallFrom||oldY)-floor;p.y=floor;p.vy=0;p.onGround=true;if(fall>4.3)damage(g,p,Math.min(45,(fall-4.3)*8),'a long fall')}}
 if(Math.hypot(p.x,p.z)>39||p.y<-5)damage(g,p,100,'swept off the island');
 if(p.id&&Math.hypot(p.vx,p.vz)<.6&&Math.hypot(x,z)>.3)p.stuck+=dt;else p.stuck=Math.max(0,p.stuck-dt*2);
}
function cpuInput(g,p,dt,boxes){
 const t=g.activeTime,goal=goalFor(g);let target;
 if(g.disaster==='flood'){const high={x:goal.x+Math.sin(p.id*2)*1.4,z:goal.z+Math.cos(p.id*2)*1.4};if(g.map.index===2){const route=[{x:16,z:17},{x:16,z:-7},high];if(p.waypoint<2&&Math.hypot(p.x-route[p.waypoint].x,p.z-route[p.waypoint].z)<1.1)p.waypoint++;target=route[Math.min(2,p.waypoint)]}else target=high}
 else if(g.disaster==='quake'){const choices=[{x:0,z:22},{x:21,z:0},{x:-21,z:0},{x:0,z:-23}];target=choices[p.id%4]}
 else{const b=g.map.buildings.find(b=>b.id==='bunker');if(!b.broken){const entry={x:b.x,z:b.z+b.d/2+1.1};if(p.waypoint===0&&Math.hypot(p.x-entry.x,p.z-entry.z)<1.1)p.waypoint=1;target=p.waypoint?{x:b.x+Math.sin(p.id*2)*2.1,z:b.z+Math.cos(p.id*2)*1.5}:entry}else target={x:Math.sin(p.id*2)*20,z:Math.cos(p.id*2)*20}}
 if(g.disaster==='tornado'&&g.phase==='active'){const tw=tornadoPosition(g),d=Math.hypot(p.x-tw.x,p.z-tw.z);if(d<8&&!shelter(g,p)){const dx=p.x-tw.x,dz=p.z-tw.z;target={x:clamp(p.x+dx*3,-24,24),z:clamp(p.z+dz*3,-24,24)}}}
 if(g.disaster==='meteors'){const danger=g.meteors.find(m=>m.impactAt>t&&Math.hypot(p.x-m.x,p.z-m.z)<m.r+1.5);if(danger&&!shelter(g,p)){let dx=p.x-danger.x,dz=p.z-danger.z;if(Math.hypot(dx,dz)<.3){dx=Math.cos(p.id);dz=Math.sin(p.id)}target={x:p.x+dx*4,z:p.z+dz*4}}}
 let dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.65)return {};dx/=d;dz/=d;
 if(!canOccupy(g,p,p.x+dx*.8,p.z+dz*.8,boxes)){const a=Math.atan2(dx,dz),angles=[.75,-.75,1.4,-1.4,2,-2];for(const turn of angles){const x=Math.sin(a+turn),z=Math.cos(a+turn);if(canOccupy(g,p,p.x+x*.8,p.z+z*.8,boxes)){dx=x;dz=z;break}}}
 return {x:dx,z:dz,sprint:g.phase==='active',jump:p.stuck>.65&&Math.sin(g.elapsed*3+p.id)>.6};
}
function makeMeteor(g){const exposed=g.actors.filter(p=>p.alive&&!shelter(g,p)),aim=rand(g)<.48&&exposed.length?exposed[Math.floor(rand(g)*exposed.length)]:null,angle=rand(g)*Math.PI*2,radius=Math.sqrt(rand(g))*25,x=aim?aim.x+(rand(g)-.5)*5:Math.cos(angle)*radius,z=aim?aim.z+(rand(g)-.5)*5:Math.sin(angle)*radius;g.meteors.push({id:++g.serial,x,z,r:g.difficulty==='storm'?3.5:3.1,born:g.activeTime,impactAt:g.activeTime+(g.difficulty==='storm'?1.8:2.35),done:false})}
function weather(g,dt){
 const hard=g.difficulty==='storm',t=g.activeTime;
 if(g.disaster==='flood')g.water=-.85+Math.min(1,t/(g.duration-4))*(hard?7.5:6.45);
 if(g.disaster==='meteors'){if(t>=g.nextMeteor){makeMeteor(g);g.nextMeteor=t+(hard?1.65:2.5)}for(const m of g.meteors)if(!m.done&&t>=m.impactAt){m.done=true;const protectedActors=new Set(g.actors.filter(p=>shelter(g,p)).map(p=>p.id));for(const b of g.map.buildings)if(!b.broken&&Math.abs(m.x-b.x)<b.w/2+1&&Math.abs(m.z-b.z)<b.d/2+1){b.hp--;if(b.hp<=0)breakBuilding(g,b)}for(const p of g.actors)if(p.alive&&!protectedActors.has(p.id)){const d=Math.hypot(p.x-m.x,p.z-m.z);if(d<m.r)damage(g,p,(hard?67:48)*(1-d/m.r*.45),'a meteor impact')}g.impacts.push({x:m.x,z:m.z,born:t,r:m.r});event(g,'impact',{x:m.x,z:m.z})}g.meteors=g.meteors.filter(m=>t<m.impactAt+.45)}
 if(g.disaster==='quake')for(const b of g.map.buildings){b.warning=!b.broken&&t>=b.collapseAt-3;if(t>=b.collapseAt&&!b.broken)breakBuilding(g,b)}
 if(g.disaster==='tornado'){const tw=tornadoPosition(g);for(const b of g.map.buildings)if(b.kind!=='bunker'&&!b.broken&&Math.hypot(b.x-tw.x,b.z-tw.z)<4.8)breakBuilding(g,b)}
 for(const p of g.actors)if(p.alive){const water=g.disaster==='flood'?g.water:-.85;if(p.y+1.35<water){p.air=Math.max(0,p.air-dt*24);if(p.air===0)damage(g,p,dt*(hard?23:17),'the rising water')}else p.air=Math.min(100,p.air+dt*45);if(g.disaster==='tornado'){const tw=tornadoPosition(g),d=Math.hypot(p.x-tw.x,p.z-tw.z);if(d<4.6){const protectedByConcrete=shelter(g,p)?.kind==='bunker';damage(g,p,dt*(hard?30:22)*(protectedByConcrete?.10:1),'the tornado')}}}
 g.impacts=g.impacts.filter(m=>t-m.born<4);
}
function endRound(g){const p=g.actors[0],won=p.alive;if(won)g.stats.survived++;g.result={won,standing:g.actors.filter(a=>a.alive).length,health:Math.ceil(p.hp),survived:g.stats.survived};g.phase=g.round===g.totalRounds?'finished':'result';event(g,won?'survived':'round-out')}
export function tick(g,input={},dt=1/60){if(!['prepare','active'].includes(g.phase)||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.04);g.elapsed+=dt;if(g.phase==='prepare'&&g.elapsed>=g.prep){g.phase='active';event(g,'disaster',{disaster:g.disaster})}g.activeTime=Math.max(0,g.elapsed-g.prep);const boxes=aliveBoxes(g),yaw=Number.isFinite(input.yaw)?input.yaw:0,x=clamp(Number(input.x)||0,-1,1),z=clamp(Number(input.z)||0,-1,1);move(g,g.actors[0],{...input,x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw)},dt,boxes);for(const p of g.actors.slice(1))move(g,p,cpuInput(g,p,dt,boxes),dt,boxes);if(g.phase==='active')weather(g,dt);for(const kit of g.medkits)if(!kit.used&&g.actors[0].alive&&g.actors[0].hp<99&&Math.hypot(kit.x-g.actors[0].x,kit.z-g.actors[0].z)<1.2&&Math.abs(g.actors[0].y-terrainHeight(g.map,kit.x,kit.z))<1){kit.used=true;g.actors[0].hp=Math.min(100,g.actors[0].hp+28);event(g,'medkit')}
 if(!g.actors[0].alive||g.activeTime>=g.duration)endRound(g);
}
