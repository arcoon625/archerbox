export const CELL=3.6;
export const MISSIONS=[
 {id:'training-vault',name:'Training Vault',tag:'LEARN THE BEAMS',size:[9,11],seed:83,beams:8,color:0x62ebcd,hex:'#62ebcd',par:105,description:'A little patience. A well-timed jump. Your first secret mission.'},
 {id:'prism-lab',name:'Prism Lab',tag:'TIMING IS EVERYTHING',size:[11,11],seed:316,beams:12,color:0xa99bff,hex:'#a99bff',par:155,description:'Moving scanners, pulse gates, and a lab full of sharp turns.'},
 {id:'reactor-core',name:'Reactor Core',tag:'THE FINAL PROTOCOL',size:[11,13],seed:908,beams:16,color:0xffb574,hex:'#ffb574',par:200,description:'Crisscrossing beams guard the reactor. Bring your best moves.'}
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dirs=[[0,-1],[1,0],[0,1],[-1,0]],key=(x,z)=>x+','+z;
export const world=(x,z)=>({x:x*CELL,z:z*CELL});
export function cellAt(p){return {x:Math.round(p.x/CELL),z:Math.round(p.z/CELL)}}
export function neighbors(map,x,z){return dirs.map(([dx,dz])=>({x:x+dx,z:z+dz})).filter(p=>map.grid[p.z]?.[p.x]===0)}
export function pathTo(map,from,to){const a=cellAt(from),b=cellAt(to),q=[a],prev=new Map([[key(a.x,a.z),null]]);for(let i=0;i<q.length;i++){const p=q[i];if(p.x===b.x&&p.z===b.z){const path=[];let at=p;while(at){path.unshift(world(at.x,at.z));at=prev.get(key(at.x,at.z))}return path}for(const n of neighbors(map,p.x,p.z)){const k=key(n.x,n.z);if(!prev.has(k)){prev.set(k,p);q.push(n)}}}return []}
export function makeMaze(index=0,difficulty='easy'){
 index=clamp(index|0,0,2);const config=MISSIONS[index],[w,h]=config.size,grid=Array.from({length:h},()=>Array(w).fill(1));let seed=config.seed;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const stack=[{x:1,z:h-2}];grid[h-2][1]=0;while(stack.length){const p=stack.at(-1),choices=dirs.map(([dx,dz])=>({x:p.x+dx*2,z:p.z+dz*2,dx,dz})).filter(n=>n.x>0&&n.z>0&&n.x<w-1&&n.z<h-1&&grid[n.z][n.x]===1);if(!choices.length){stack.pop();continue}const n=choices[Math.floor(random()*choices.length)];grid[p.z+n.dz][p.x+n.dx]=0;grid[n.z][n.x]=0;stack.push(n)}
 const map={index,config,w,h,grid,difficulty,start:world(1,h-2),exit:world(w-2,1),cards:[],lasers:[],switches:[],checkpoints:[]},floor=[];
 for(let z=1;z<h-1;z++)for(let x=1;x<w-1;x++)if(grid[z][x]===0)floor.push({x,z,...world(x,z),cx:x,cz:z});
 const ends=floor.filter(p=>neighbors(map,p.cx,p.cz).length===1&&Math.hypot(p.x-map.start.x,p.z-map.start.z)>CELL*2&&Math.hypot(p.x-map.exit.x,p.z-map.exit.z)>CELL*1.1);
 // Pick distant dead ends, so collecting both cards involves exploring the maze.
 const candidates=ends.length>=2?ends:floor.filter(p=>p.cx%2&&p.cz%2);
 candidates.sort((a,b)=>pathTo(map,map.start,b).length-pathTo(map,map.start,a).length);
 const first=candidates[0],second=[...candidates.slice(1)].sort((a,b)=>pathTo(map,first,b).length-pathTo(map,first,a).length)[0];
 map.cards=[first,second].map((p,i)=>({id:i,x:p.x,z:p.z,name:i?'AMBER':'CYAN'}));
 const ordered=[...map.cards].sort((a,b)=>pathTo(map,map.start,a).length-pathTo(map,map.start,b).length),route=[...pathTo(map,map.start,ordered[0]),...pathTo(map,ordered[0],ordered[1]).slice(1),...pathTo(map,ordered[1],map.exit).slice(1)],unique=new Map();route.forEach(p=>unique.set(key(p.x,p.z),p));
 const safe=new Set([key(map.start.x,map.start.z),key(map.exit.x,map.exit.z),...map.cards.map(p=>key(p.x,p.z))]);
 const checkpointSpots=[...map.cards,...[.28,.62].map(f=>route[Math.floor(route.length*f)])],checkpointKeys=new Set();for(const p of checkpointSpots.sort((a,b)=>route.findIndex(n=>n.x===a.x&&n.z===a.z)-route.findIndex(n=>n.x===b.x&&n.z===b.z))){const k=key(p.x,p.z);if(!checkpointKeys.has(k)&&k!==key(map.start.x,map.start.z)&&k!==key(map.exit.x,map.exit.z)){checkpointKeys.add(k);map.checkpoints.push({x:p.x,z:p.z,id:map.checkpoints.length+1});safe.add(k)}}
 const spots=[...unique.values()].filter(p=>{const c=cellAt(p),n=neighbors(map,c.x,c.z);return n.length===2&&(n[0].x===n[1].x||n[0].z===n[1].z)&&!safe.has(key(p.x,p.z))&&Math.hypot(p.x-map.start.x,p.z-map.start.z)>CELL*1.5});
 const selected=[];const count=Math.min(config.beams,spots.length);for(let i=0;i<count;i++){const p=spots[Math.floor(i*spots.length/count)],c=cellAt(p),n=neighbors(map,c.x,c.z),axis=n[0].x===n[1].x?'x':'z',pattern=index===0?['low','high','pulse','low','sweep','high','pulse','low'][i%8]:['low','high','pulse','sweep','pulse','rotate'][i%6];selected.push({...p,id:i,axis,pattern,phase:i*.73,group:Math.floor(i/3)})}map.lasers=selected;
 const switchSpots=[map.start,...map.checkpoints];map.switches=switchSpots.map((p,i)=>({...p,id:i}));
 map.routeLength=route.length;return map;
}
export function createGame(index=0,difficulty='easy'){
 const map=makeMaze(index,difficulty);return {map,difficulty,phase:'playing',time:0,elapsed:0,zaps:0,collected:[],activated:[],checkpoint:{...map.start,id:0},player:{...map.start,y:0,vy:0,height:1.72,onGround:true,crouch:false,yaw:0,walk:0,vx:0,vz:0},disabledUntil:0,pulseCooldown:0,invulnerable:1,flash:0,event:'FIND BOTH KEYCARDS',eventTime:3,jumpHeld:false,interactHeld:false,visited:[]};
}
export function laserSegments(laser,g){
 const speed=g.difficulty==='expert'?1.24:.82,t=g.time*speed,disabled=g.time<g.disabledUntil,half=CELL*.50,active=!disabled&&(laser.pattern!=='pulse'||(t+laser.phase)%4.2<2.05),height=laser.pattern==='high'?1.23:laser.pattern==='sweep'?1.04+Math.sin(t*1.25+laser.phase)*.73:.48;
 const heights=laser.pattern==='pulse'?[.32,.89,1.48,2.12]:[height],angle=laser.pattern==='rotate'?Math.sin(t*.8+laser.phase)*.58:0;
 return heights.map(y=>{let dx=laser.axis==='x'?half:0,dz=laser.axis==='z'?half:0;const x=dx*Math.cos(angle)-dz*Math.sin(angle),z=dx*Math.sin(angle)+dz*Math.cos(angle);return {a:{x:laser.x-x,y,z:laser.z-z},b:{x:laser.x+x,y,z:laser.z+z},active}});
}
export function distanceToSegment(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)}
export function canOccupy(map,x,z,r=.25){const cx=Math.round(x/CELL),cz=Math.round(z/CELL);for(let gz=cz-1;gz<=cz+1;gz++)for(let gx=cx-1;gx<=cx+1;gx++)if(map.grid[gz]?.[gx]!==0){const nearX=clamp(x,gx*CELL-CELL/2,gx*CELL+CELL/2),nearZ=clamp(z,gz*CELL-CELL/2,gz*CELL+CELL/2);if(Math.hypot(x-nearX,z-nearZ)<r)return false}return true}
function say(g,text){g.event=text;g.eventTime=2.6}
export function respawn(g,zapped=false){if(g.phase!=='playing')return;Object.assign(g.player,{x:g.checkpoint.x,z:g.checkpoint.z,y:0,vy:0,onGround:true,vx:0,vz:0});g.invulnerable=1.1;if(zapped){g.zaps++;g.elapsed+=3;g.flash=.7;say(g,'ZAPPED! CHECKPOINT RESTORED')}else say(g,'BACK AT YOUR CHECKPOINT')}
export function nearbySwitch(g){return g.map.switches.find(s=>Math.hypot(s.x-g.player.x,s.z-g.player.z)<2.1)}
export function objective(g){const remaining=g.map.cards.filter(c=>!g.collected.includes(c.id));if(!remaining.length)return {...g.map.exit,name:'EXIT'};return [...remaining].sort((a,b)=>pathTo(g.map,g.player,a).length-pathTo(g.map,g.player,b).length)[0]}
export function medal(g){return g.elapsed<g.map.config.par&&g.zaps<=1?'GOLD':g.elapsed<g.map.config.par*1.65?'SILVER':'BRONZE'}
export function tick(g,input={},dt=1/60){
 if(g.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);g.time+=dt;g.elapsed+=dt;g.flash=Math.max(0,g.flash-dt);g.invulnerable=Math.max(0,g.invulnerable-dt);g.eventTime=Math.max(0,g.eventTime-dt);g.pulseCooldown=Math.max(0,g.pulseCooldown-dt);
 const p=g.player;p.yaw=Number.isFinite(input.yaw)?input.yaw:p.yaw;p.crouch=!!input.crouch&&p.onGround;p.height=p.crouch?.85:1.72;
 const jump=!!input.jump;if(jump&&!g.jumpHeld&&p.onGround&&!p.crouch){p.vy=6.8;p.onGround=false}g.jumpHeld=jump;
 if(input.interact&&!g.interactHeld){const s=nearbySwitch(g);if(s){g.disabledUntil=g.time+7;say(g,'RELAY ACTIVE: LASERS OFF FOR 7 SECONDS')}}g.interactHeld=!!input.interact;
 if(input.pulse&&g.pulseCooldown===0){g.disabledUntil=g.time+(g.difficulty==='expert'?3:4.5);g.pulseCooldown=g.difficulty==='expert'?24:18;say(g,'EMP PULSE: KEEP MOVING!')}
 let x=clamp(Number(input.x)||0,-1,1),z=clamp(Number(input.z)||0,-1,1),n=Math.max(1,Math.hypot(x,z)),speed=p.crouch?2.6:input.sprint?5.5:4.4;x/=n;z/=n;const dx=(x*Math.cos(p.yaw)+z*Math.sin(p.yaw))*speed*dt,dz=(-x*Math.sin(p.yaw)+z*Math.cos(p.yaw))*speed*dt;
 const oldX=p.x,oldZ=p.z;if(canOccupy(g.map,p.x+dx,p.z))p.x+=dx;if(canOccupy(g.map,p.x,p.z+dz))p.z+=dz;p.vx=(p.x-oldX)/dt;p.vz=(p.z-oldZ)/dt;p.walk+=Math.hypot(p.vx,p.vz)*dt;
 if(!p.onGround){p.vy-=18*dt;p.y+=p.vy*dt;if(p.y<=0){p.y=0;p.vy=0;p.onGround=true}}
 const c=cellAt(p),visit=key(c.x,c.z);if(!g.visited.includes(visit))g.visited.push(visit);
 if(g.invulnerable<=0)for(const laser of g.map.lasers)for(const beam of laserSegments(laser,g))if(beam.active&&beam.a.y>=p.y+.07&&beam.a.y<=p.y+p.height&&distanceToSegment(p,beam.a,beam.b)<.30){respawn(g,true);return}
 const cardsBefore=g.collected.length;
 for(const card of g.map.cards)if(!g.collected.includes(card.id)&&Math.hypot(p.x-card.x,p.z-card.z)<.88){g.collected.push(card.id);say(g,card.name+' KEYCARD FOUND'+(g.collected.length===2?' - EXIT UNLOCKED!':''))}
 for(const cp of g.map.checkpoints)if(!g.activated.includes(cp.id)&&Math.hypot(p.x-cp.x,p.z-cp.z)<.85){g.activated.push(cp.id);g.checkpoint={...cp};if(g.collected.length===cardsBefore)say(g,'CHECKPOINT SAVED')}
 if(Math.hypot(p.x-g.map.exit.x,p.z-g.map.exit.z)<.95){if(g.collected.length===2){g.phase='finished';say(g,'MISSION COMPLETE')}else if(g.eventTime===0)say(g,'EXIT LOCKED - FIND BOTH KEYCARDS')}
}
