export const COURSES=[
 {id:'sunset-district',name:'Sunset District',tag:'LEARN THE ROOFTOPS',sky:0xe9bb9b,fog:0xdbac96,wall:0x526c77,roof:0xdbcbb0,accent:0xf6b756,description:'Warm rooftops, a wall climb, and your first big swing.',gold:85,silver:145},
 {id:'neon-heights',name:'Neon Heights',tag:'LIGHT UP THE NIGHT',sky:0x142d48,fog:0x243d57,wall:0x33485d,roof:0x7d96a4,accent:0x5ce1d5,description:'Glowing signs, moving sky platforms, and sweeping lasers.',gold:80,silver:140},
 {id:'cloud-temple',name:'Cloud Temple',tag:'ABOVE THE CITY',sky:0xc5c3dc,fog:0xb8b7d0,wall:0x686580,roof:0xd8d0c8,accent:0xc9a4f2,description:'Temple roofs, lanterns, and a finish high above the clouds.',gold:90,silver:150}
];
export const OUTFITS=[{name:'Midnight',color:0x284d66,hex:'#284d66'},{name:'Crimson',color:0xa34351,hex:'#a34351'},{name:'Jade',color:0x338f85,hex:'#338f85'},{name:'Violet',color:0x736396,hex:'#736396'}];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const RADIUS=.34,HEIGHT=1.65,GRAVITY=24;
export function makeCourse(index=0,difficulty='easy'){
 const config=COURSES[index]||COURSES[0],sign=index===1?-1:1,pad=difficulty==='pro'?0:1.2;
 const spec=[[0,0,20,13,14,'FIRST LEAP'],[-3,-17,20.7,11,11,'KEEP YOUR MOMENTUM'],[4,-33,21.4,12,12,'JUMP THE SWEEPER'],[0,-49,21.4,14,12,'CHECKPOINT'],[0,-63,25.5,12,11,'WALL JUMP'],[0,-96,25,15,15,'CHECKPOINT'],[3,-117,25.7,12,12,'SKY BRIDGE'],[-4,-134,26.2,8,9,'MOVING PLATFORM'],[1,-150,26.8,14,13,'CHECKPOINT'],[0,-169,27.4,15,15,'FINISH']];
 const roofs=spec.map(([x,z,y,w,d,label],id)=>({id,x:x*sign,z,y,w:w+pad,d:d+pad,h:id===7?1.2:y+12,kind:id===7?'moving':'roof',amplitude:id===7?(index===1?2.4:1.8):0,phase:index*.8,label,checkpoint:[0,3,5,8].includes(id),finish:id===9}));
 const anchors=[{id:0,x:0,y:35,z:-80,from:4,to:5}];
 const lasers=[{id:0,roof:2,speed:index===1?.9:.6,phase:0},{id:1,roof:6,speed:index===1?1.05:.7,phase:1.8}];
 const stars=roofs.flatMap(r=>[0,1].map(i=>({id:r.id*2+i,roof:r.id,x:r.x+(i?1.5:-1.5),y:r.y+.9,z:r.z+(i?-1.8:1.8)})));
 return {index,config,roofs,anchors,lasers,stars,difficulty:difficulty==='pro'?'pro':'easy'};
}
export const roofX=(roof,t)=>roof.x+Math.sin(t*.8+roof.phase)*roof.amplitude;
export function laserZ(laser,course,t){const roof=course.roofs[laser.roof];return roof.z+(laser.roof===6?1.7:0)+Math.sin(t*laser.speed+laser.phase)*(laser.roof===6?1.4:roof.d*.29);}
export function spawn(roof,t=0){return {x:roofX(roof,t),y:roof.y,z:roof.z+Math.min(2.5,roof.d/2-1.2),vx:0,vy:0,vz:0,onGround:true,ground:roof.id,coyote:.13,jumpBuffer:0,wallGrace:0,wallNormal:{x:0,z:0},wallLock:0,grapple:null,grappleCooldown:0,jumpHeld:false,yaw:0};}
export function createGame(index=0,outfit=0,difficulty='easy'){
 const course=makeCourse(index,difficulty);return {course,outfit:clamp(Math.floor(outfit)||0,0,3),phase:'playing',elapsed:0,time:0,falls:0,checkpoint:0,furthest:0,collected:[],wallJumps:0,swings:0,event:'FOLLOW THE ORANGE ARROWS',eventTime:3,player:spawn(course.roofs[0])};
}
export function grappleTarget(g,yaw=0){const p=g.player;return g.course.anchors.filter(a=>{const dx=a.x-p.x,dz=a.z-p.z,d=Math.hypot(dx,a.y-p.y-1,dz);return d<=24&&d>2&&g.furthest<a.to&&(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)>-2;}).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]||null;}
function notify(g,text){g.event=text;g.eventTime=1.9;}
export function respawn(g,manual=false){if(g.phase!=='playing')return;g.falls++;g.furthest=g.checkpoint;g.player=spawn(g.course.roofs[g.checkpoint],g.time);notify(g,manual?'BACK AT YOUR CHECKPOINT':'NICE TRY! YOUR CHECKPOINT IS SAFE');}
export function medal(g){return g.elapsed<=g.course.config.gold&&g.falls<=1?'GOLD':g.elapsed<=g.course.config.silver&&g.falls<=5?'SILVER':'BRONZE';}
export function tick(g,input={},dt){
 if(g.phase!=='playing')return;dt=clamp(Number(dt)||0,0,.025);const oldTime=g.time;g.time+=dt;g.elapsed+=dt;g.eventTime=Math.max(0,g.eventTime-dt);
 const p=g.player,roofs=g.course.roofs;
 if(p.onGround){const roof=roofs[p.ground];if(roof)p.x+=roofX(roof,g.time)-roofX(roof,oldTime);}
 p.coyote=p.onGround?.13:Math.max(0,p.coyote-dt);p.wallGrace=Math.max(0,p.wallGrace-dt);p.wallLock=Math.max(0,p.wallLock-dt);p.grappleCooldown=Math.max(0,p.grappleCooldown-dt);
 const yaw=Number.isFinite(input.yaw)?input.yaw:0;let mx=clamp(Number(input.x)||0,-1,1),mz=clamp(Number(input.z)||0,-1,1),len=Math.max(1,Math.hypot(mx,mz));mx/=len;mz/=len;
 const dx=mx*Math.cos(yaw)+mz*Math.sin(yaw),dz=-mx*Math.sin(yaw)+mz*Math.cos(yaw),speed=input.sprint?10.6:7.8;
 if(input.jump&&!p.jumpHeld)p.jumpBuffer=.15;else p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);p.jumpHeld=!!input.jump;
 if(input.grapple&&!p.grapple&&p.grappleCooldown<=0){const a=grappleTarget(g,yaw);if(a){p.grapple={anchor:a.id,length:Math.hypot(p.x-a.x,p.y+1-a.y,p.z-a.z)};p.onGround=false;p.ground=null;g.swings++;notify(g,'SWING! SPACE TO LEAP OFF');}}
 if(!input.grapple&&p.grapple){p.grapple=null;p.grappleCooldown=.18;notify(g,'RELEASED! AIM FOR THE ROOF');}
 if(p.jumpBuffer>0){
  if(p.grapple){p.grapple=null;p.grappleCooldown=.4;p.vy=Math.max(9,p.vy+5);p.vx+=-Math.sin(yaw)*5;p.vz+=-Math.cos(yaw)*5;p.jumpBuffer=0;p.coyote=0;notify(g,'GRAPPLE LEAP!');}
  else if(p.onGround||p.coyote>0){p.vy=11.5;p.onGround=false;p.ground=null;p.coyote=0;p.jumpBuffer=0;}
  else if(p.wallGrace>0){p.vy=12.5;p.vx=p.wallNormal.x*7.2+dx*3;p.vz=p.wallNormal.z*7.2+dz*3;p.wallLock=.14;p.wallGrace=0;p.jumpBuffer=0;g.wallJumps++;notify(g,'WALL JUMP!');}
 }
 const moving=Math.hypot(mx,mz)>.05,acc=(p.onGround?35:22)*(p.wallLock>0?.25:1),adjust=(n,target)=>n+clamp(target-n,-acc*dt,acc*dt);
 if(p.grapple){p.vx+=dx*15*dt;p.vz+=dz*15*dt;const h=Math.hypot(p.vx,p.vz);if(h>17){p.vx*=17/h;p.vz*=17/h;}}
 else if(moving||p.onGround){p.vx=adjust(p.vx,dx*speed);p.vz=adjust(p.vz,dz*speed);}
 const oldY=p.y;p.vy-=GRAVITY*dt;let nx=p.x+p.vx*dt,nz=p.z+p.vz*dt,ny=p.y+p.vy*dt;
 if(p.grapple){const a=g.course.anchors[p.grapple.anchor];p.grapple.length=Math.max(10.5,p.grapple.length-dt*3.7);const x=nx-a.x,y=ny+1-a.y,z=nz-a.z,d=Math.hypot(x,y,z),l=p.grapple.length;
  if(d>l){const ux=x/d,uy=y/d,uz=z/d;nx=a.x+ux*l;ny=a.y+uy*l-1;nz=a.z+uz*l;const radial=p.vx*ux+p.vy*uy+p.vz*uz;if(radial>0){p.vx-=radial*ux;p.vy-=radial*uy;p.vz-=radial*uz;}}
 }
 const touches=(r,x,z)=>Math.abs(x-roofX(r,g.time))<r.w/2+RADIUS&&Math.abs(z-r.z)<r.d/2+RADIUS;
 const solid=r=>Math.min(oldY,ny)<r.y-.035&&Math.max(oldY,ny)+HEIGHT>r.y-r.h+.05;
 for(const r of roofs)if(solid(r)&&touches(r,nx,p.z)){
  if(p.vx>0&&p.x<=roofX(r,g.time)-r.w/2+.05){nx=roofX(r,g.time)-r.w/2-RADIUS;p.wallNormal={x:-1,z:0};p.vx=0;p.wallGrace=.15;}
  else if(p.vx<0&&p.x>=roofX(r,g.time)+r.w/2-.05){nx=roofX(r,g.time)+r.w/2+RADIUS;p.wallNormal={x:1,z:0};p.vx=0;p.wallGrace=.15;}
 }
 for(const r of roofs)if(solid(r)&&touches(r,nx,nz)){
  if(p.vz>0&&p.z<=r.z-r.d/2+.05){nz=r.z-r.d/2-RADIUS;p.wallNormal={x:0,z:-1};p.vz=0;p.wallGrace=.15;}
  else if(p.vz<0&&p.z>=r.z+r.d/2-.05){nz=r.z+r.d/2+RADIUS;p.wallNormal={x:0,z:1};p.vz=0;p.wallGrace=.15;}
 }
 p.x=nx;p.z=nz;p.y=ny;p.onGround=false;p.ground=null;
 if(p.vy<=0){const landed=roofs.filter(r=>Math.abs(nx-roofX(r,g.time))<=r.w/2+.04&&Math.abs(nz-r.z)<=r.d/2+.04&&oldY>=r.y-.045&&ny<=r.y).sort((a,b)=>b.y-a.y)[0];
  if(landed){p.y=landed.y;p.vy=0;p.onGround=true;p.ground=landed.id;p.coyote=.13;p.wallGrace=0;if(p.grapple){p.grapple=null;p.grappleCooldown=.4;}g.furthest=Math.max(g.furthest,landed.id);if(landed.checkpoint&&landed.id>g.checkpoint){g.checkpoint=landed.id;notify(g,'CHECKPOINT SAVED!');}
   if(landed.finish&&g.checkpoint>=8&&Math.hypot(nx-landed.x,nz-(landed.z-2))<3){g.phase='finished';p.vx=p.vz=0;notify(g,'ROOFTOP MASTER!');}
  }
 }
 for(const star of g.course.stars)if(!g.collected.includes(star.id)){const roof=roofs[star.roof],sx=star.x+roofX(roof,g.time)-roof.x;if(Math.hypot(p.x-sx,p.y+.9-star.y,p.z-star.z)<1.25)g.collected.push(star.id);}
 if(g.phase==='playing')for(const laser of g.course.lasers){const roof=roofs[laser.roof];if(Math.abs(p.x-roofX(roof,g.time))<roof.w/2&&Math.abs(p.z-laserZ(laser,g.course,g.time))<.43&&p.y<roof.y+1&&p.y+HEIGHT>roof.y+.6){respawn(g);return;}}
 if(p.y<7||Math.abs(p.x)>75||p.z>26||p.z< -200){respawn(g);return;}
 if(moving)p.yaw=Math.atan2(-dx,-dz);
}
