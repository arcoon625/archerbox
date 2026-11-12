export const LAPS=2;
export const TRACKS=[
 {id:'coral-cove',name:'Coral Cove',tag:'SUNLIT REEFS',description:'Pink coral, clear water, wide turns.',water:0x258d9c,sand:0xe4ca96,rx:104,rz:133,wave:7,color:'#73ead7'},
 {id:'shipwreck-run',name:'Shipwreck Run',tag:'LOST SHIPS',description:'Race past a sunken ship and rock arches.',water:0x226476,sand:0x948d72,rx:113,rz:139,wave:10,color:'#ffd095'},
 {id:'glow-trench',name:'Glow Trench',tag:'DEEP-SEA LIGHTS',description:'Glowing coral and bright blue race rings.',water:0x092b4c,sand:0x253c51,rx:108,rz:137,wave:13,color:'#bba2ff'}
];
export const SHARKS=[
 {id:'great-white',name:'Great White',tag:'BALANCED RACER',color:0x657e89,belly:0xe2e9e2,speed:23,turn:7.7,boost:1.42},
 {id:'hammerhead',name:'Hammerhead',tag:'QUICK TURNS',color:0x648d93,belly:0xe1e8d7,speed:22.5,turn:10,boost:1.42},
 {id:'tiger',name:'Tiger Shark',tag:'POWERFUL BOOST',color:0x9f9b78,belly:0xeee0b5,speed:22.7,turn:7.9,boost:1.5},
 {id:'whale',name:'Whale Shark',tag:'SMOOTH CRUISER',color:0x3e7187,belly:0xd4e6dd,speed:23.5,turn:7,boost:1.39}
];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function point(track,u){const a=u*Math.PI*2,r=1+.10*Math.sin(a*3);return{x:Math.sin(a)*track.rx*r,y:24+track.wave*Math.sin(a*2+.4),z:Math.cos(a)*track.rz*r}}
export function makeCourse(index=0){const config=TRACKS[index]||TRACKS[0];let length=0,last=point(config,0);for(let i=1;i<=1000;i++){const p=point(config,i/1000);length+=Math.hypot(p.x-last.x,p.y-last.y,p.z-last.z);last=p}const gates=Array.from({length:12},(_,i)=>({s:(i+1)*length/13,lane:[0,-4,4,0][i%4],depth:[0,3,-3,0][i%4]}));const rocks=[.20,.40,.65,.84].map((u,i)=>({s:u*length,lane:i%2?-6:6,depth:i%2?-3:3}));return{config,length,gates,rocks}}
export function sample(course,s,lane=0,depth=0){const u=((s/course.length)%1+1)%1,p=point(course.config,u),next=point(course.config,u+.0001),l=Math.hypot(next.x-p.x,next.y-p.y,next.z-p.z),t={x:(next.x-p.x)/l,y:(next.y-p.y)/l,z:(next.z-p.z)/l},h=Math.hypot(t.x,t.z),right={x:-t.z/h,y:0,z:t.x/h};return{p:{x:p.x+right.x*lane,y:p.y+depth,z:p.z+right.z*lane},t,right,u,yaw:Math.atan2(-t.x,-t.z),pitch:Math.asin(t.y)}}
export function createRace(track=0,shark=0,difficulty='easy'){const course=makeCourse(track),names=['YOU','VOLT','NOVA','ECHO','BLAZE','AXEL'];return{course,shark,difficulty:difficulty==='pro'?'pro':'easy',phase:'countdown',countdown:3,elapsed:0,rings:0,event:'GET READY',eventTime:0,racers:names.map((name,i)=>({id:i,name,shark:i===0?shark:(i+1)%4,s:-i*4.8,lane:i===0?0:(i%2?-3.4:3.4),depth:i===0?0:(i%3-1)*2,speed:0,energy:100,boosting:false,stream:0,bump:0,finished:false,time:null})),place:1}}
export function order(racers){return [...racers].sort((a,b)=>a.finished&&b.finished?a.time-b.time:a.finished?-1:b.finished?1:b.s-a.s)}
export function lap(r,course){return clamp(Math.floor(Math.max(0,r.s)/course.length)+1,1,LAPS)}
export function nextGate(r,course){const start=Math.max(0,Math.floor(r.s/course.length))*course.length;return course.gates.map(g=>({...g,s:g.s+start})).find(g=>g.s>r.s)||{...course.gates[0],s:start+course.length+course.gates[0].s}}
export function tick(g,input={},dt){if(g.phase==='finished')return;dt=clamp(dt,0,.05);if(g.phase==='countdown'){g.countdown-=dt;if(g.countdown<=0){g.phase='racing';g.event='GO!';g.eventTime=1.6}return}g.elapsed+=dt;g.eventTime=Math.max(0,g.eventTime-dt);
 for(const r of g.racers){if(r.finished)continue;const controls=typeof input==='function'?input(r):input;const stats=SHARKS[r.shark],old=r.s,cpu=g.multiplayer?!r.human:r.id>0,steer=cpu?clamp((Math.sin(g.elapsed*.5+r.id)*4-r.lane)*.6,-1,1):clamp(controls.steer||0,-1,1),vertical=cpu?clamp((Math.sin(g.elapsed*.3+r.id)*2-r.depth)*.5,-1,1):clamp(controls.vertical||0,-1,1);
  r.stream=Math.max(0,r.stream-dt);r.bump=Math.max(0,r.bump-dt);r.boosting=!cpu&&!!controls.boost&&r.energy>1;r.energy=clamp(r.energy+(r.boosting?-30:17)*dt,0,100);r.lane=clamp(r.lane+steer*stats.turn*dt,-8,8);r.depth=clamp(r.depth+vertical*6*dt,-5,5);
  const pace=cpu?(g.difficulty==='easy'?.79+r.id*.018:.94+r.id*.007):(controls.brake?.42:controls.throttle?1: .88),target=stats.speed*pace*(r.boosting?stats.boost:1)*(r.stream>0?1.18:1)*(r.bump>0?.52:1);r.speed+=(target-r.speed)*Math.min(1,dt*2.6);r.s+=r.speed*dt;
  const crossed=marker=>Math.floor((r.s-marker)/g.course.length)>Math.floor((old-marker)/g.course.length);
  for(const gate of g.course.gates)if(crossed(gate.s)&&Math.abs(r.lane-gate.lane)<3.0&&Math.abs(r.depth-gate.depth)<3.0){r.energy=clamp(r.energy+24,0,100);r.stream=1.2;if(!cpu){g.rings++;r.rings=(r.rings||0)+1;g.event='RING BOOST!';g.eventTime=1.4}}
  for(const rock of g.course.rocks)if(crossed(rock.s)&&Math.abs(r.lane-rock.lane)<2.4&&Math.abs(r.depth-rock.depth)<2.5){r.bump=1.2;if(!cpu){g.event='BUMPS HAPPEN! KEEP SWIMMING';g.eventTime=1.4}}
  if(r.s>=g.course.length*LAPS){r.s=g.course.length*LAPS;r.finished=true;r.time=g.elapsed}
 }
 g.place=order(g.racers).findIndex(r=>r.id===0)+1;if(g.multiplayer?(g.racers.every(r=>r.finished)||g.elapsed>240):g.racers[0].finished){g.phase='finished';g.event=g.place===1?'OCEAN CHAMPION!':'RACE COMPLETE!'}
}
export function recover(g){const r=g.racers[0];r.lane=r.depth=0;r.bump=0;g.event='BACK ON COURSE';g.eventTime=1.2}
