import * as THREE from '../public/vendor/three.module.js';
import {buildMap} from '../public/games/neon-clash/maps.js';
import {guns,melees} from '../public/games/neon-clash/loadout.js';
import {explosives,blastDamage} from '../public/games/neon-clash/explosives.js';
import {jump,advanceVertical} from '../public/games/neon-clash/physics.js';
import {findPath} from '../public/games/neon-clash/navigation.js';
const cache=new Map(),V=p=>new THREE.Vector3(p.x,p.y,p.z),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function collisionArena(index){if(cache.has(index))return cache.get(index);const built=buildMap(index),data={solids:built.solids.map(({mesh,...s})=>s),surfaces:built.surfaces,platforms:built.platforms,ceilings:built.ceilings,pads:built.pads};built.dispose();built.root.clear();
 const floor=(x,z,max=Infinity)=>{let best=null;for(const s of data.surfaces)if(Math.abs(x-s.x)<=s.w/2+.001&&Math.abs(z-s.z)<=s.d/2+.001){const y=s.ramp?s.y*(s.reverse?1-(z-s.z+s.d/2)/s.d:(z-s.z+s.d/2)/s.d):s.y;if(y<=max+.001&&(best===null||y>best))best=y}return best};
 const support=(x,z,max=Infinity)=>{let best=floor(x,z,max);for(const p of data.platforms)if(Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2&&p.y<=max+.001&&(best===null||p.y>best))best=p.y;return best};
 const ceiling=(x,z,from,to)=>{let best=null;for(const p of data.ceilings)if(Math.abs(x-p.x)<p.w/2+.35&&Math.abs(z-p.z)<p.d/2+.35&&p.y>=from-.001&&p.y<=to+.001&&(best===null||p.y<best))best=p.y;return best};
 const arena={...data,floor,support,ceiling,spawn(team,i){return new THREE.Vector3(team===0?-20:20,1.7,[-10,-5,5,10][i%4])}};cache.set(index,arena);return arena;
}
export function rayBox(o,d,b,limit){let lo=0,hi=limit;for(const axis of ['x','y','z']){const half=(axis==='x'?b.w:axis==='y'?b.h:b.d)/2,min=b[axis]-half,max=b[axis]+half;if(Math.abs(d[axis])<1e-9){if(o[axis]<min||o[axis]>max)return null;}else{let a=(min-o[axis])/d[axis],c=(max-o[axis])/d[axis];if(a>c)[a,c]=[c,a];lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>hi)return null;}}return lo;}
function wallDistance(arena,o,d,limit){let nearest=limit;for(const b of arena.solids)if(!b.collisionOnly){const t=rayBox(o,d,b,nearest);if(t!==null)nearest=t;}return nearest;}
function clear(arena,a,b){const delta=V(b).sub(V(a)),distance=delta.length();return wallDistance(arena,a,delta.normalize(),distance)>=distance-.1;}
function blocked(arena,x,z,feet,r=.48){return Math.abs(x)>23.35-r||Math.abs(z)>23.35-r||arena.solids.some(s=>feet<s.y+s.h/2-.01&&feet+1.9>s.y-s.h/2&&Math.abs(x-s.x)<s.w/2+r&&Math.abs(z-s.z)<s.d/2+r);}
function move(arena,a,dx,dz){const feet=a.pos.y-1.7;for(const axis of ['x','z']){const x=a.pos.x+(axis==='x'?dx:0),z=a.pos.z+(axis==='z'?dz:0);const ground=arena.support(x,z,feet+.55);if(!blocked(arena,x,z,feet)&&!(ground!==null&&ground>feet+(a.onGround?.55:.01))){a.pos.x=x;a.pos.z=z;if(a.onGround&&ground!==null&&Math.abs(ground-feet)<.55)a.pos.y=ground+1.7;}}}
function actor(id,name,team,seat,config,arena,grid){return {id,name,team,seat,human:seat!==null,pos:arena.spawn(team,grid),yaw:team===0?-Math.PI/2:Math.PI/2,pitch:0,hp:100,alive:true,vy:0,onGround:true,weapon:config.gun||0,melee:config.melee||0,explosive:config.explosive||0,gunSkin:config.gunSkin||'original',meleeSkin:config.meleeSkin||'original',slot:0,ammo:guns[config.gun||0][4],grenades:2,cooldown:.5,reload:0,shield:2,respawn:0,kills:0,deaths:0,path:[],repath:0,stun:0};}
export function createRivals(room){const arena=collisionArena(room.track),n=room.variant==='coop'?Math.max(2,room.players[0].config.teamSize):room.players[0].config.teamSize,g={actors:[],scores:[0,0],time:180,elapsed:0,phase:'playing',events:[],eventId:0,projectiles:[],fires:[],nextProjectile:0};
 for(let seat=0;seat<2;seat++){const p=room.players[seat];g.actors.push(actor(seat,p.name,room.variant==='coop'?0:seat,seat,p.config,arena,seat));}
 for(const team of [0,1]){const count=g.actors.filter(a=>a.team===team).length;for(let i=count;i<n;i++)g.actors.push(actor(g.actors.length,['VOLT','BLAZE','ECHO','NOVA','AXEL','FLUX'][g.actors.length%6],team,null,{gun:[7,9,12,4][i%4]},arena,i));}return g;
}
const direction=a=>new THREE.Vector3(-Math.sin(a.yaw)*Math.cos(a.pitch),Math.sin(a.pitch),-Math.cos(a.yaw)*Math.cos(a.pitch));
function event(g,e){g.events.push({...e,id:++g.eventId});if(g.events.length>24)g.events.shift();}
function damage(g,a,amount,source){if(!a.alive||a.shield>0||a.team===source.team)return;a.hp-=amount;if(a.hp<=0){a.hp=0;a.alive=false;a.respawn=2.5;a.deaths++;source.kills++;g.scores[source.team]++;event(g,{type:'elimination',text:source.name+' eliminated '+a.name,team:source.team,pos:{...a.pos}});}}
function hit(g,arena,source,origin,dir,range){let nearest=wallDistance(arena,origin,dir,range),target=null;for(const a of g.actors)if(a!==source&&a.alive&&a.team!==source.team){const t=rayBox(origin,dir,{x:a.pos.x,y:a.pos.y-.7,z:a.pos.z,w:.96,h:1.9,d:.96},nearest);if(t!==null&&t<nearest){nearest=t;target=a;}}return {target,point:V(origin).addScaledVector(dir,nearest),distance:nearest};}
function blast(g,arena,p,radius,source,lethal=false){event(g,{type:'blast',pos:{...p},color:0xffba68});for(const a of g.actors)if(a.alive&&a.team!==source.team){const center=V(a.pos).add(new THREE.Vector3(0,-.5,0)),d=center.distanceTo(V(p));if(d<radius&&clear(arena,p,center))damage(g,a,lethal?blastDamage(d,radius,a.hp):Math.max(15,90*(1-d/radius)),source);}}
function fire(g,arena,a){if(!a.alive||a.cooldown>0||a.reload>0||a.stun>0)return;const w=a.slot?melees[a.melee]:guns[a.weapon];if(!a.slot&&a.ammo<=0){a.reload=w[5];return;}a.cooldown=w[3];if(!a.slot)a.ammo--;const dir=direction(a);
 if(!a.slot&&(a.weapon===2||a.weapon===5)){g.projectiles.push({id:++g.nextProjectile,kind:'rocket',pos:{...a.pos},velocity:dir.multiplyScalar(26),life:4,source:a.id});return;}
 const pellets=a.slot?1:a.weapon===6?8:a.weapon===13?7:a.weapon===7?3:1;
 for(let i=0;i<pellets;i++){const d=dir.clone();if(pellets>1){d.x+=Math.sin(g.eventId*3+i*7)*.055;d.y+=Math.cos(g.eventId+i*4)*.055;d.normalize();}const h=hit(g,arena,a,a.pos,d,w[6]);if(h.target){damage(g,h.target,a.human?w[2]:Math.min(25,Math.max(7,w[2]*.28)),a);if(a.slot&&a.melee===15)h.target.stun=1.2;}event(g,{type:'shot',from:{...a.pos},to:{...h.point},actor:a.id,color:a.team===0?0x55c7ff:0xff9854});}
}
export function rivalAction(room,seat,type){const g=room.match;if(!g||g.phase!=='playing')return;const a=g.actors.find(a=>a.seat===seat),arena=collisionArena(room.track);if(!a?.alive)return;
 if(type==='jump')jump(a);
 if(type==='reload'&&a.slot===0&&a.reload<=0&&a.ammo<guns[a.weapon][4])a.reload=guns[a.weapon][5];
 if(type==='grenade'&&a.grenades>0&&(!a.lastGrenade||g.elapsed-a.lastGrenade>.65)){const velocity=direction(a).multiplyScalar(16);velocity.y+=5;a.grenades--;a.lastGrenade=g.elapsed;g.projectiles.push({id:++g.nextProjectile,kind:'grenade',index:a.explosive,pos:{...a.pos},velocity,life:explosives[a.explosive].fuse,source:a.id});}
}
export function tickRivals(room,dt,inputs){const g=room.match,arena=collisionArena(room.track);if(g.phase!=='playing')return;g.time=Math.max(0,g.time-dt);g.elapsed+=dt;
 for(const a of g.actors){a.pos=V(a.pos);a.cooldown=Math.max(0,a.cooldown-dt);a.shield=Math.max(0,a.shield-dt);a.stun=Math.max(0,a.stun-dt);if(a.reload>0){a.reload-=dt;if(a.reload<=0)a.ammo=guns[a.weapon][4];}
  if(!a.alive){a.respawn-=dt;if(a.respawn<=0){Object.assign(a,{pos:arena.spawn(a.team,a.id%4),hp:100,alive:true,ammo:guns[a.weapon][4],grenades:2,vy:0,onGround:true,shield:2,reload:0});}continue;}
  if(a.human){const input=inputs(a.seat);a.yaw=input.yaw??a.yaw;a.pitch=input.pitch??a.pitch;const slot=input.slot===1?1:0;if(slot!==a.slot){a.slot=slot;a.cooldown=.2;}const magnitude=Math.max(1,Math.hypot(input.x||0,input.z||0)),x=(input.x||0)/magnitude,z=(input.z||0)/magnitude,speed=(input.sprint?10:6.3)*(input.aim?.6:1);if(!a.stun)move(arena,a,(x*Math.cos(a.yaw)+z*Math.sin(a.yaw))*speed*dt,(-x*Math.sin(a.yaw)+z*Math.cos(a.yaw))*speed*dt);if(input.fire)fire(g,arena,a);
  }else if(!a.stun){const target=g.actors.filter(b=>b.alive&&b.team!==a.team).sort((b,c)=>a.pos.distanceTo(V(b.pos))-a.pos.distanceTo(V(c.pos)))[0];if(target){const delta=V(target.pos).sub(a.pos),dist=delta.length(),sight=clear(arena,a.pos,target.pos);a.yaw=Math.atan2(-delta.x,-delta.z);a.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));a.repath-=dt;
    let goal=target.pos;if(!sight){if(a.repath<=0){a.path=findPath(a.pos,target.pos,(x,z)=>{const floor=arena.floor(x,z);return floor===null||blocked(arena,x,z,floor,.5)},(x,z,nx,nz)=>{const f=arena.floor(x,z),n=arena.floor(nx,nz);return f!==null&&n!==null&&Math.abs(f-n)<.65});a.repath=1;}while(a.path?.length&&Math.hypot(a.path[0].x-a.pos.x,a.path[0].z-a.pos.z)<.5)a.path.shift();goal=a.path?.[0]||a.pos;}
    if(!sight||dist>10){const dx=goal.x-a.pos.x,dz=goal.z-a.pos.z,n=Math.max(.01,Math.hypot(dx,dz));move(arena,a,dx/n*3.8*dt,dz/n*3.8*dt);}else move(arena,a,Math.cos(g.elapsed+a.id)*dt,Math.sin(g.elapsed+a.id)*dt);
    if(sight&&dist<38)fire(g,arena,a);
  }}
  advanceVertical(arena,a,dt);if(a.pos.y<-12){a.shield=0;const enemy=g.actors.find(b=>b.team!==a.team);if(enemy)damage(g,a,1000,enemy);}if(a.onGround&&arena.pads.some(p=>Math.hypot(a.pos.x-p.x,a.pos.z-p.z)<p.r&&Math.abs(a.pos.y-1.7-p.y)<.3))jump(a,13);
 }
 for(let i=g.projectiles.length-1;i>=0;i--){const p=g.projectiles[i],source=g.actors.find(a=>a.id===p.source),velocity=V(p.velocity);p.pos=V(p.pos);p.life-=dt;if(p.kind==='grenade'&&!p.stuck)velocity.y-=16*dt;const travel=velocity.length()*dt,dir=velocity.clone().normalize(),wall=wallDistance(arena,p.pos,dir,travel+.15);
  if(p.kind==='rocket'){const h=hit(g,arena,source,p.pos,dir,travel+.2);if(h.distance<travel+.19||p.life<=0){blast(g,arena,h.point,5,source);g.projectiles.splice(i,1);continue;}}
  if(!p.stuck){if(wall<travel+.14){if(p.kind==='grenade'&&explosives[p.index].sticky){p.stuck=true;velocity.set(0,0,0)}else velocity.multiplyScalar(-.45);}else p.pos.addScaledVector(velocity,dt);const floor=arena.support(p.pos.x,p.pos.z,p.pos.y+.25);if(floor!==null&&p.pos.y<floor+.15){p.pos.y=floor+.15;if(p.kind==='grenade'&&explosives[p.index].sticky){p.stuck=true;velocity.set(0,0,0)}else{velocity.y=Math.abs(velocity.y)*.45;velocity.x*=.7;velocity.z*=.7;}}}p.velocity=velocity;
  if(p.life<=0){const settings=explosives[p.index]||explosives[0];blast(g,arena,p.pos,p.fragment?3.2:settings.radius,source,true);if(settings.fire)g.fires.push({pos:{...p.pos},life:4,source:source.id,tick:0});if(settings.cluster&&!p.fragment)for(let j=0;j<4;j++)g.projectiles.push({id:++g.nextProjectile,kind:'grenade',index:0,fragment:true,pos:{...p.pos},velocity:{x:Math.cos(j*Math.PI/2)*4,y:4,z:Math.sin(j*Math.PI/2)*4},life:.55+j*.12,source:source.id});g.projectiles.splice(i,1);}
 }
 for(const f of g.fires){f.life-=dt;f.tick-=dt;if(f.tick<=0){f.tick=.35;const source=g.actors.find(a=>a.id===f.source);for(const a of g.actors)if(a.alive&&a.team!==source.team&&V(a.pos).distanceTo(V(f.pos))<3.8&&clear(arena,f.pos,a.pos))damage(g,a,a.hp,source);}}g.fires=g.fires.filter(f=>f.life>0);
 if(g.time<=0||g.scores.some(s=>s>=15))g.phase='finished';
}
