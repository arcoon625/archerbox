export const GOAL=10;
export const OBSTACLES=[{x:-8,z:3,w:4,d:1.6,h:1.2},{x:8,z:3,w:4,d:1.6,h:1.2},{x:0,z:-12,w:5,d:2,h:2.1},{x:-12,z:-5,w:1.5,d:4,h:2},{x:12,z:-5,w:1.5,d:4,h:2}];
export const NAMES=['Volt','Blaze','Axel','Echo','Nova','Jett','Kai','Pixel','Ace','Ziggy'];
const SPAWNS=[[0,-6],[-6,-4],[7,-8],[-4,-9],[5,-3],[-7,-9],[8,-2],[-5,-6],[4,-8],[0,-4]];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function rng(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const emit=(g,type,data={})=>{g.events.push({id:++g.serial,type,...data});if(g.events.length>50)g.events.shift()};
export function blocked(x,z,r=.35,y=0){return Math.abs(x)>15.5-r||Math.abs(z)>15.5-r||OBSTACLES.some(b=>y<b.h-.02&&Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r)}
export function clearLine(a,b,y=1.1){const count=Math.ceil(distance(a,b)/.25);for(let i=1;i<count;i++){const t=i/count;if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,.05,y))return false}return true}
function opponent(g){const i=g.stats.kos,[x,z]=SPAWNS[i%SPAWNS.length];return {id:i+1,name:NAMES[i%10],x,z,y:0,vx:0,vz:0,yaw:0,walk:0,alive:true,onGround:true,flash:0,homeX:x,homeZ:z,windup:0,cooldown:g.difficulty==='rookie'?3.8:2.5,aimYaw:0,aimPitch:0}}
export function createGame({difficulty='rookie',seed=1,name='YOU'}={}){const g={difficulty:difficulty==='pro'?'pro':'rookie',random:rng(seed),phase:'countdown',countdown:3,time:0,player:{name,x:0,y:0,z:11,vx:0,vz:0,vy:0,yaw:Math.PI,pitch:0,walk:0,alive:true,onGround:true,flash:0,cooldown:0,throwPose:0,dodge:0,dodgeCooldown:0,dodgeX:0,dodgeZ:0},enemy:null,balls:[],splats:[],ballId:0,serial:0,events:[],respawn:0,stats:{throws:0,kos:0,dodges:0},result:null};g.enemy=opponent(g);return g}
export function aimAt(from,to,speed=25){const flight=distance(from,to)/speed,dx=to.x+(to.vx||0)*flight*.75-from.x,dz=to.z+(to.vz||0)*flight*.75-from.z;return {yaw:Math.atan2(-dx,-dz),pitch:Math.atan2((to.y||0)+1.03-((from.y||0)+1.24)+2.4*flight*flight,Math.max(.1,Math.hypot(dx,dz)))}}
export function aimTarget(g,yaw,pitch){const e=g.enemy;if(!e?.alive||!clearLine(g.player,e))return null;const aim=aimAt(g.player,e),error=Math.abs(Math.atan2(Math.sin(aim.yaw-yaw),Math.cos(aim.yaw-yaw)));return error<.19&&Math.abs(aim.pitch-pitch)<.30?e:null}
export function launch(g,yaw=0,pitch=0){const p=g.player;if(g.phase!=='active'||!p.alive||!g.enemy.alive||p.cooldown>0||g.balls.some(b=>b.owner===0))return false;
 if(g.difficulty==='rookie'&&aimTarget(g,yaw,pitch)){const aim=aimAt(p,g.enemy);yaw=aim.yaw;pitch=aim.pitch}
 p.cooldown=.6;p.throwPose=.30;g.stats.throws++;g.balls.push(ball(g,0,p,yaw,pitch,25));emit(g,'launch',{owner:0});return true}
function ball(g,owner,p,yaw,pitch,speed){const flat=Math.cos(pitch),dx=-Math.sin(yaw)*flat,dz=-Math.cos(yaw)*flat;return {id:++g.ballId,owner,x:p.x+dx*.58,y:p.y+1.24,z:p.z+dz*.58,vx:dx*speed,vy:Math.sin(pitch)*speed,vz:dz*speed,life:2.4}}
function end(g,reason){if(g.phase!=='active')return;g.phase=reason==='win'?'won':'lost';g.player.alive=reason==='win';g.result={reason,kos:g.stats.kos,time:g.time};emit(g,reason==='win'?'win':'lose',{reason});}
function splat(g,b){g.splats.push({x:b.x,y:Math.max(.03,b.y),z:b.z,born:g.time,owner:b.owner});if(g.splats.length>20)g.splats.shift();emit(g,'splat',{x:b.x,y:b.y,z:b.z})}
function segmentDistance(a,b,p){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,den=dx*dx+dy*dy+dz*dz,t=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/den,0,1):0;return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y,a.z+dz*t-p.z)}
export function updateBalls(g,dt){for(let i=g.balls.length-1;i>=0&&g.phase==='active';i--){const b=g.balls[i];let finished=false;const steps=Math.max(1,Math.ceil(dt*100));for(let s=0;s<steps&&!finished&&g.phase==='active';s++){const step=dt/steps,old={x:b.x,y:b.y,z:b.z};b.vy-=4.8*step;b.x+=b.vx*step;b.y+=b.vy*step;b.z+=b.vz*step;b.life-=step;
  const target=b.owner===0?g.enemy:g.player,hit=target.alive&&segmentDistance(old,b,{x:target.x,y:clamp(b.y,target.y+.45,target.y+1.45),z:target.z})<.60;
  if(hit){finished=true;splat(g,b);if(b.owner===0){target.alive=false;target.flash=.4;g.stats.kos++;g.respawn=.85;emit(g,'ko',{name:target.name,count:g.stats.kos});if(g.stats.kos===GOAL)end(g,'win')}else end(g,'hit');}
  else if(b.life<=0||b.y<.07||blocked(b.x,b.z,.12,b.y)){finished=true;splat(g,b);if(b.owner===0)end(g,'miss');}
 }if(finished)g.balls.splice(i,1)}}
function move(p,dx,dz,dt){const x=p.x+dx*dt,z=p.z+dz*dt;if(!blocked(x,p.z,.35,p.y))p.x=x;if(!blocked(p.x,z,.35,p.y))p.z=z}
export function dodge(g,x,z){const p=g.player;if(g.phase!=='active'||p.dodgeCooldown>0)return false;const n=Math.hypot(x,z)||1;p.dodgeX=x/n;p.dodgeZ=z/n;p.dodge=.24;p.dodgeCooldown=2.2;g.stats.dodges++;emit(g,'dodge');return true}
export function tick(g,input={},dt=1/60){if(!['countdown','active'].includes(g.phase))return;dt=clamp(Number(dt)||0,0,.05);if(g.phase==='countdown'){g.countdown-=dt;if(g.countdown<=0){g.phase='active';emit(g,'go')}return}g.time+=dt;const p=g.player,e=g.enemy;
 p.cooldown=Math.max(0,p.cooldown-dt);p.throwPose=Math.max(0,p.throwPose-dt);p.dodge=Math.max(0,p.dodge-dt);p.dodgeCooldown=Math.max(0,p.dodgeCooldown-dt);let x=Number(input.x)||0,z=Number(input.z)||0,n=Math.max(1,Math.hypot(x,z));x/=n;z/=n;p.pitch=clamp(Number(input.pitch)||0,-.65,.75);
 if(input.dodge)dodge(g,Math.hypot(x,z)>.1?x:Math.cos(input.yaw||0),Math.hypot(x,z)>.1?z:-Math.sin(input.yaw||0));const speed=input.sprint?6.4:4.7;p.vx=p.dodge>0?p.dodgeX*12:x*speed;p.vz=p.dodge>0?p.dodgeZ*12:z*speed;const oldY=p.y;if(input.jump&&p.onGround){p.vy=6.7;p.onGround=false}p.vy-=20*dt;p.y+=p.vy*dt;let floor=0;for(const b of OBSTACLES)if(Math.abs(p.x-b.x)<b.w/2+.23&&Math.abs(p.z-b.z)<b.d/2+.23&&oldY>=b.h-.04&&p.y<=b.h)floor=Math.max(floor,b.h);if(p.y<=floor){p.y=floor;p.vy=0;p.onGround=true}move(p,p.vx,p.vz,dt);p.walk+=Math.hypot(p.vx,p.vz)*dt;p.yaw=Number.isFinite(input.yaw)?input.yaw+Math.PI:p.yaw;if(input.launch)launch(g,Number(input.yaw)||0,p.pitch);
 if(!e.alive){g.respawn-=dt;if(g.respawn<=0)g.enemy=opponent(g)}else{
  const sway=g.difficulty==='rookie'?(e.id===1?0:.45):1.4,targetX=e.homeX+Math.sin(g.time*(g.difficulty==='rookie'?.65:1.3)+e.id)*sway,eDx=clamp((targetX-e.x)*3,-1.6,1.6);e.vx=eDx;e.vz=0;move(e,eDx,0,dt);e.walk+=Math.abs(eDx)*dt;const aim=aimAt(e,p,g.difficulty==='rookie'?13:18);e.yaw=aim.yaw+Math.PI;e.cooldown-=dt;
  if(e.windup>0){e.windup-=dt;if(e.windup<=0){g.balls.push(ball(g,e.id,e,e.aimYaw,e.aimPitch,g.difficulty==='rookie'?13:18));e.cooldown=g.difficulty==='rookie'?3.8:2.6;emit(g,'launch',{owner:e.id})}}
  else if(e.cooldown<=0&&clearLine(e,p)){e.windup=g.difficulty==='rookie'?1.25:.85;e.aimYaw=aim.yaw;e.aimPitch=aim.pitch;emit(g,'warning',{name:e.name})}
 }
 updateBalls(g,dt);g.splats=g.splats.filter(s=>g.time-s.born<8);
}
export function restoreRecord(raw){const r=raw&&typeof raw==='object'?raw:{};return {unlocked:r.unlocked===true,equipped:r.unlocked===true&&r.equipped===true,best:Number.isInteger(r.best)?clamp(r.best,0,GOAL):0,wins:Number.isInteger(r.wins)?clamp(r.wins,0,1e6):0,bestTime:Number.isFinite(r.bestTime)&&r.bestTime>0?r.bestTime:null}}
export function recordRun(raw,g){const r=restoreRecord(raw);if(!['won','lost'].includes(g.phase))return r;r.best=Math.max(r.best,g.stats.kos);if(g.phase==='won'&&g.stats.kos===GOAL){r.unlocked=true;r.equipped=true;r.wins++;r.bestTime=r.bestTime===null?g.time:Math.min(r.bestTime,g.time)}return r}
