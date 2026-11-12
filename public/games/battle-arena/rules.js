export const WEAPONS=[
 {id:'sword',name:'Knight Sword',short:'SWORD',damage:21,heavy:42,reach:2.65,arc:1.05,wind:.23,duration:.62,cost:10,speed:4,tag:'Balanced & reliable'},
 {id:'axe',name:'Battle Axe',short:'AXE',damage:28,heavy:51,reach:2.65,arc:1.18,wind:.38,duration:.91,cost:14,speed:2,tag:'Wide, powerful swings'},
 {id:'hammer',name:'War Hammer',short:'HAMMER',damage:32,heavy:58,reach:2.35,arc:.94,wind:.48,duration:1.12,cost:17,speed:1,tag:'Slow. Hits like thunder.'},
 {id:'spear',name:'Guardian Spear',short:'SPEAR',damage:19,heavy:39,reach:3.55,arc:.50,wind:.29,duration:.76,cost:12,speed:3,tag:'Keep your distance'},
 {id:'katana',name:'Moon Katana',short:'KATANA',damage:18,heavy:37,reach:2.85,arc:1.06,wind:.18,duration:.51,cost:9,speed:5,tag:'Quick, clean strikes'},
 {id:'dual',name:'Twin Blades',short:'BLADES',damage:14,heavy:33,reach:2.1,arc:1.2,wind:.13,duration:.41,cost:8,speed:5,tag:'Get close. Stay quick.'}
];
export const ARENAS=[
 {id:'sunstone',name:'Sunstone Coliseum',tag:'GOLDEN HOUR',color:'#e8bb76',sky:0xc7b6a2,ground:0xc3b298,stone:0xb7ab91,accent:0xe9b967,radius:14,obstacles:[{x:-6,z:0,r:1.25},{x:6,z:0,r:1.25}]},
 {id:'frostkeep',name:'Frostkeep Courtyard',tag:'WINTER KEEP',color:'#afdbe5',sky:0x9dbacb,ground:0x8dabb5,stone:0x768b9b,accent:0x9ee7f7,radius:14,obstacles:[{x:-5.5,z:-2,r:1.15},{x:5.5,z:2,r:1.15}]},
 {id:'emberforge',name:'Emberforge Ring',tag:'FIRE & IRON',color:'#f4a27b',sky:0x433d48,ground:0x6a6061,stone:0x534e56,accent:0xffa764,radius:14,obstacles:[{x:-6,z:0,r:1.2},{x:6,z:0,r:1.2}]}
];
export const MODES=[{id:'duel',name:'1v1 Duel',tag:'YOU VS. ONE RIVAL',description:'First to win two rounds.'},{id:'teams',name:'3v3 Teams',tag:'BLUE VS. ORANGE',description:'Two CPU allies have your back.'},{id:'survival',name:'Survival',tag:'FIVE WAVES',description:'Survive five waves of rivals.'}];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const angle=(x,z)=>Math.atan2(x,-z);
export const turn=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const weaponOf=a=>WEAPONS.find(w=>w.id===(typeof a==='string'?a:a.weapon))||WEAPONS[0];
export function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
function actor(id,name,team,x,z,weapon,player=false){return {id,name,team,x,z,yaw:team===0?0:Math.PI,weapon,player,hp:100,stamina:100,alive:true,attack:null,cooldown:0,stun:0,flash:0,block:false,blockAge:0,dash:0,dashCooldown:0,dx:0,dz:0,vx:0,vz:0,recover:0,aiThink:0,aiGuard:false,aiHeavy:false,walk:0}}
export function createGame({mode='duel',arena=0,weapon='sword',difficulty='rookie',name='YOU',seed=32}={}){
 const g={mode:MODES.some(m=>m.id===mode)?mode:'duel',arena:clamp(arena|0,0,2),weapon:weaponOf(weapon).id,difficulty:difficulty==='pro'?'pro':'rookie',name:String(name).slice(0,16),random:rng(seed),phase:'countdown',countdown:3,round:1,wave:1,time:90,score:[0,0],actors:[],stats:{kos:0,blocks:0,parries:0,dodges:0,roundWins:0},events:[],serial:0,result:null,lastHeavy:false,lastDodge:false};
 setupRound(g);return g;
}
function setupRound(g){
 g.actors=[actor(0,g.name,0,0,7,g.weapon,true)];
 const names=['VOLT','BLAZE','AXEL','NOVA','ECHO','ONYX'];
 if(g.mode==='teams'){for(let i=0;i<2;i++)g.actors.push(actor(i+1,['NOVA','ECHO'][i],0,(i?1:-1)*3.6,7.8,WEAPONS[(i+3)%6].id));for(let i=0;i<3;i++)g.actors.push(actor(i+3,names[i],1,(i-1)*3.6,-7.5,WEAPONS[(i+g.round-1)%6].id))}
 else{const count=g.mode==='survival'?Math.min(4,1+Math.floor(g.wave/2)):1;for(let i=0;i<count;i++)g.actors.push(actor(i+1,names[(i+g.wave-1)%names.length],1,(i-(count-1)/2)*3.5,-6.5-i*.7,WEAPONS[(i+g.round-1)%6].id))}
 g.phase='countdown';g.countdown=g.round===1?3:2;g.time=g.mode==='survival'?100:90;g.result=null;g.lastHeavy=g.lastDodge=false;g.events=[];
}
export function nearestEnemy(g,a=g.actors[0]){let nearest=null,best=Infinity;for(const target of g.actors)if(target.alive&&target.team!==a.team){const d=distance(a,target);if(d<best){best=d;nearest=target}}return nearest}
function emit(g,type,data={}){g.events.push({id:++g.serial,type,...data});if(g.events.length>18)g.events.shift()}
export function clearLine(g,a,b){for(const o of ARENAS[g.arena].obstacles){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?clamp(((o.x-a.x)*dx+(o.z-a.z)*dz)/l,0,1):0;if(Math.hypot(a.x+dx*t-o.x,a.z+dz*t-o.z)<o.r+.08)return false}return true}
export function moveActor(g,a,dx,dz){
 a.x+=dx;a.z+=dz;const radius=ARENAS[g.arena].radius-.6,d=Math.hypot(a.x,a.z);if(d>radius){a.x*=radius/d;a.z*=radius/d}
 for(const o of ARENAS[g.arena].obstacles){const x=a.x-o.x,z=a.z-o.z,l=Math.hypot(x,z),r=o.r+.48;if(l<r){a.x=o.x+(l?x/l:1)*r;a.z=o.z+(l?z/l:0)*r}}
}
export function beginAttack(g,a,heavy=false){
 if(g.phase!=='combat'||!a.alive||a.stun>0||a.dash>0||a.attack||a.cooldown>0)return false;
 const w=weaponOf(a),cost=heavy?w.cost+15:w.cost;if(a.stamina<cost)return false;
 a.stamina-=cost;a.recover=.7;a.block=false;a.blockAge=0;const factor=a.player?1:g.difficulty==='rookie'?1.22:1;
 a.attack={heavy,t:0,wind:(w.wind+(heavy?.28:0))*factor,duration:(w.duration+(heavy?.35:0))*factor,hit:[]};emit(g,'swing',{actor:a.id,heavy});return true;
}
export function dodge(g,a,x,z){
 if(g.phase!=='combat'||!a.alive||a.stun>0||a.attack||a.dashCooldown>0||a.stamina<24)return false;
 const length=Math.hypot(x,z);a.dx=length?x/length:Math.sin(a.yaw);a.dz=length?z/length:-Math.cos(a.yaw);a.dash=.29;a.dashCooldown=.85;a.stamina-=24;a.recover=.8;a.block=false;if(a.player)g.stats.dodges++;emit(g,'dodge',{actor:a.id});return true;
}
export function hit(g,attacker,target){
 const swing=attacker.attack;if(!swing||swing.hit.includes(target.id)||!target.alive||attacker.team===target.team)return false;
 const w=weaponOf(attacker),facing=angle(target.x-attacker.x,target.z-attacker.z);
 if(distance(attacker,target)>w.reach+.38||Math.abs(turn(facing,attacker.yaw))>w.arc||!clearLine(g,attacker,target))return false;
 swing.hit.push(target.id);if(target.dash>.065){emit(g,'evade',{actor:target.id});return false}
 let damage=(swing.heavy?w.heavy:w.damage)*(attacker.player||attacker.team===0?1:g.difficulty==='rookie'?.70:.96),blocked=target.block&&Math.abs(turn(angle(attacker.x-target.x,attacker.z-target.z),target.yaw))<1.35;
 if(blocked){
  const parry=target.blockAge<.20&&target.stamina>=5;
  if(parry){target.stamina-=5;attacker.stun=.55;attacker.attack=null;if(target.player){g.stats.parries++;g.stats.blocks++}emit(g,'parry',{actor:target.id,target:attacker.id});return true}
  const drain=swing.heavy?31:16;
  if(target.stamina>=drain){target.stamina-=drain;damage*=swing.heavy?.36:.08;if(target.player)g.stats.blocks++;emit(g,'block',{actor:target.id,target:attacker.id})}
  else{target.stamina=0;target.block=false;target.stun=.65;emit(g,'guard-break',{actor:target.id})}
 }
 target.hp=Math.max(0,target.hp-damage);target.flash=.18;target.recover=.9;target.stun=Math.max(target.stun,blocked?.04:swing.heavy?.32:.13);
 const push=blocked?.12:swing.heavy?.95:.36;moveActor(g,target,Math.sin(attacker.yaw)*push,-Math.cos(attacker.yaw)*push);emit(g,'hit',{actor:attacker.id,target:target.id,damage:Math.round(damage),heavy:swing.heavy});
 if(target.hp<=0){target.alive=false;target.attack=null;target.block=false;target.dash=0;if(attacker.player)g.stats.kos++;emit(g,'knockout',{actor:attacker.id,target:target.id})}return true;
}
function cpuInput(g,a,dt){
 const target=nearestEnemy(g,a);if(!target)return {};
 const d=distance(a,target),toward=angle(target.x-a.x,target.z-a.z);a.yaw=toward;a.aiThink-=dt;
 if(a.aiThink<=0){a.aiThink=.22+g.random()*.27;a.aiGuard=!!target.attack&&g.random()<(g.difficulty==='pro'?.7:.32);a.aiHeavy=g.random()<.24;}
 const guarding=a.aiGuard&&d<weaponOf(target).reach+.8&&!!target.attack;
 const w=weaponOf(a),inRange=d<w.reach*.83&&clearLine(g,a,target),move=inRange?0:1;
 let x=Math.sin(toward)*move,z=-Math.cos(toward)*move;
 // Take a tangent around a nearby pillar instead of pushing into it forever.
 if(move){for(const o of ARENAS[g.arena].obstacles){const ax=a.x-o.x,az=a.z-o.z,away=Math.hypot(ax,az),gx=target.x-a.x,gz=target.z-a.z,length=gx*gx+gz*gz,t=length?clamp(((o.x-a.x)*gx+(o.z-a.z)*gz)/length,0,1):0,clearance=Math.hypot(a.x+gx*t-o.x,a.z+gz*t-o.z);if(t>0&&t<1&&clearance<o.r+.75&&away<o.r+3.3){const nx=away?ax/away:1,nz=away?az/away:0,tx=-nz,tz=nx,side=tx*gx+tz*gz>=0?1:-1;x=tx*side*.9+nx*.25+Math.sin(toward)*.35;z=tz*side*.9+nz*.25-Math.cos(toward)*.35;break}}}
 if(inRange&&!a.attack&&!guarding){x+=Math.cos(toward)*Math.sin(g.elapsed*1.9+a.id)*.30;z+=Math.sin(toward)*Math.sin(g.elapsed*1.9+a.id)*.30}
 if(d<w.reach+.5&&target.attack&&a.dashCooldown<=0&&g.random()<dt*(g.difficulty==='pro'?.7:.14))dodge(g,a,-Math.sin(toward),Math.cos(toward));
 return {x,z,block:guarding,light:inRange&&!guarding&&!a.aiHeavy,heavy:inRange&&!guarding&&a.aiHeavy};
}
export function finishRound(g,winner,reason='knockout'){
 if(g.phase!=='combat')return false;
 if(winner===0){g.score[0]++;g.stats.roundWins++}else if(winner===1)g.score[1]++;
 const won=winner===0,complete=g.mode==='survival'?!won||g.wave>=5:g.score.some(n=>n>=2);
 g.result={winner,won,draw:winner===null,reason,complete};g.phase=complete?'finished':'round-end';emit(g,'round-end',{winner,complete});return true;
}
export function nextRound(g){if(g.phase!=='round-end')return false;g.round++;if(g.mode==='survival')g.wave++;setupRound(g);return true}
export function tick(g,input={},dt=1/60){
 if(!['countdown','combat'].includes(g.phase))return;dt=clamp(Number.isFinite(dt)?dt:0,0,.05);g.elapsed=(g.elapsed||0)+dt;
 if(g.phase==='countdown'){g.countdown-=dt;if(g.countdown<=0){g.phase='combat';emit(g,'begin')}return}
 g.time=Math.max(0,g.time-dt);
 const user=g.actors[0],heavy=!!input.heavy&&!g.lastHeavy,dash=!!input.dodge&&!g.lastDodge;g.lastHeavy=!!input.heavy;g.lastDodge=!!input.dodge;
 for(const a of g.actors){
  if(!a.alive)continue;const c=a.player?input:cpuInput(g,a,dt);a.cooldown=Math.max(0,a.cooldown-dt);a.stun=Math.max(0,a.stun-dt);a.flash=Math.max(0,a.flash-dt);a.recover=Math.max(0,a.recover-dt);a.dashCooldown=Math.max(0,a.dashCooldown-dt);
  if(a.player&&Number.isFinite(c.yaw))a.yaw=c.yaw;
  const canBlock=!a.attack&&a.stun<=0&&a.dash<=0&&a.stamina>3;if(c.block&&canBlock){a.blockAge=a.block?a.blockAge+dt:0;a.block=true}else{a.block=false;a.blockAge=0}
  if(!a.block&&!a.attack&&a.dash<=0&&a.recover<=0)a.stamina=Math.min(100,a.stamina+25*dt);
  const ix=clamp(Number(c.x)||0,-1,1),iz=clamp(Number(c.z)||0,-1,1),norm=Math.max(1,Math.hypot(ix,iz));
  if(a.player&&dash)dodge(g,a,ix,iz);
  if(!a.block&&a.stun<=0){if(a.player?heavy:c.heavy)beginAttack(g,a,true);else if(c.light)beginAttack(g,a,false)}
  let vx=0,vz=0;if(a.dash>0){a.dash=Math.max(0,a.dash-dt);vx=a.dx*12;vz=a.dz*12}else if(a.stun<=0){const speed=(a.player?5.15:a.team===0?4.2:g.difficulty==='rookie'?3.35:4.05)*(a.block?.44:a.attack?.35:1);vx=ix/norm*speed;vz=iz/norm*speed}
  moveActor(g,a,vx*dt,vz*dt);a.vx=vx;a.vz=vz;a.walk+=Math.hypot(vx,vz)*dt;
  if(a.attack){const attack=a.attack;attack.t+=dt;if(attack.t>=attack.wind&&attack.t<attack.wind+.18){for(const target of g.actors){if(!a.attack)break;hit(g,a,target)}}if(a.attack&&attack.t>=attack.duration){a.attack=null;a.cooldown=a.player?.06:.32+g.random()*.4}}
 }
 // Solid bodies: neither side can walk straight through the other.
 for(let i=0;i<g.actors.length;i++)for(let j=i+1;j<g.actors.length;j++){const a=g.actors[i],b=g.actors[j];if(!a.alive||!b.alive)continue;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),r=.98;if(d<r){const x=d?dx/d:1,z=d?dz/d:0,p=(r-d)/2;moveActor(g,a,-x*p,-z*p);moveActor(g,b,x*p,z*p)}}
 const blue=g.actors.some(a=>a.alive&&a.team===0),orange=g.actors.some(a=>a.alive&&a.team===1);
 if(!blue||!orange)finishRound(g,blue?0:orange?1:null);
 else if(g.time<=0){if(g.mode==='survival')finishRound(g,1,'time');else{const hp=[0,0];for(const a of g.actors)hp[a.team]+=a.hp;finishRound(g,Math.abs(hp[0]-hp[1])<.01?null:hp[0]>hp[1]?0:1,'time')}}
 // Keep a stable input object; no timers or movement advance once results appear.
 return user;
}
