export const TRAILS=[
 {id:'sunny-summit',name:'Sunny Summit',tag:'WIDE & WELCOMING',length:1050,width:24,bend:17,period:122,drop:.23,sky:0xb8d7e8,trees:1,description:'Sunshine, sweeping turns, and gentle jumps.',color:'#ff7752'},
 {id:'pine-valley',name:'Pine Valley',tag:'THE FOREST RUN',length:1320,width:22,bend:26,period:108,drop:.25,sky:0xa6cad9,trees:1.7,description:'Carve through pines, rock outcrops, and big air.',color:'#4ba89b'},
 {id:'frost-peak',name:'Frost Peak',tag:'HIGH-ALTITUDE ADVENTURE',length:1500,width:23,bend:31,period:93,drop:.28,sky:0xc7d5e5,trees:.55,description:'Icy-blue peaks, fast bends, and longer jumps.',color:'#8e89d0'}
];
export const OUTFITS=[{name:'Glacier',color:0x248bb8,hex:'#248bb8'},{name:'Sunset',color:0xeb6844,hex:'#eb6844'},{name:'Evergreen',color:0x3f9981,hex:'#3f9981'},{name:'Aurora',color:0x8271b6,hex:'#8271b6'}];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function course(index=0){
 const config=TRAILS[index]||TRAILS[0],gates=[],ramps=[],rocks=[];
 for(let s=92,i=0;s<config.length-60;s+=86,i++)gates.push({id:i,s,lane:[0,-5,4,-3,5,0][i%6],width:5.8});
 for(let s=190,i=0;s<config.length-80;s+=245,i++)ramps.push({id:i,s,lane:[0,4,-4,0][i%4],width:5.8,height:index===2?1.65:1.25});
 for(let s=330,i=0;s<config.length-90;s+=300,i++)rocks.push({id:i,s,lane:i%2?7.3:-7.3,radius:1.65});
 return {index,config,gates,ramps,rocks};
}
export function center(c,s){const t=c.config;return {x:Math.sin(s/t.period)*t.bend+Math.sin(s/51)*t.bend*.17,y:320-s*t.drop+Math.sin(s/48)*1.1,z:-s};}
export function sample(c,s,lane=0){
 const p=center(c,s),n=center(c,s+.1),dx=n.x-p.x,dy=n.y-p.y,dz=n.z-p.z,length=Math.hypot(dx,dy,dz),horizontal=Math.hypot(dx,dz),t={x:dx/length,y:dy/length,z:dz/length},right={x:-dz/horizontal,y:0,z:dx/horizontal};
 return {p:{x:p.x+right.x*lane,y:p.y+Math.max(0,Math.abs(lane)-c.config.width/2)**2*.0025,z:p.z+right.z*lane},t,right,yaw:Math.atan2(-t.x,-t.z),pitch:Math.asin(t.y)};
}
export function rampLift(c,s,lane){const a=c.ramps.find(a=>s>=a.s-8&&s<a.s&&Math.abs(lane-a.lane)<a.width/2);return a?a.height*((s-(a.s-8))/8)**1.7:0;}
export function createRace(trail=0,outfit=0,difficulty='easy',name='YOU'){
 const c=course(trail);return {course:c,outfit:clamp(Math.floor(outfit)||0,0,3),difficulty:difficulty==='pro'?'pro':'easy',phase:'countdown',countdown:3,elapsed:0,event:'READY FOR THE MOUNTAIN?',eventTime:0,place:1,
 racers:[name.slice(0,16)||'YOU','VOLT','NOVA','ECHO','BLAZE','AXEL'].map((name,id)=>({id,name,outfit:id===0?clamp(Math.floor(outfit)||0,0,3):(id+1)%4,s:-id*3,lane:id===0?0:(id%2?-3.5:3.5),speed:0,steer:0,height:0,vy:0,spin:0,spinInput:false,jumpHeld:false,airTime:0,tricks:0,gates:0,boost:0,bump:0,crashes:0,finished:false,time:null,rawTime:null}))};
}
export function order(racers){return [...racers].sort((a,b)=>a.finished&&b.finished?a.time-b.time||a.id-b.id:a.finished?-1:b.finished?1:b.s-a.s||a.id-b.id);}
export function nextGate(g,r=g.racers[0]){return g.course.gates.find(gate=>gate.s>r.s)||null;}
export function recover(g){if(g.phase!=='racing')return;const r=g.racers[0];r.lane=0;r.height=0;r.vy=0;r.spin=0;r.bump=.35;r.speed=Math.max(r.speed,8);g.event='BACK ON THE TRAIL';g.eventTime=1.2;}
function notify(g,r,text){if(r.id===0){g.event=text;g.eventTime=1.35;}}
export function tick(g,input={},dt){
 if(g.phase==='finished')return;dt=clamp(Number(dt)||0,0,.05);if(g.phase==='countdown'){g.countdown-=dt;if(g.countdown<=0){g.phase='racing';g.countdown=0;g.event='GO!';g.eventTime=1.6;}return;}
 g.elapsed+=dt;g.eventTime=Math.max(0,g.eventTime-dt);
 for(const r of g.racers){
  if(r.finished)continue;
  const cpu=r.id>0,gate=nextGate(g,r),ramp=g.course.ramps.find(a=>a.s>r.s&&a.s-r.s<50);
  let aim=gate&&gate.s-r.s<85?gate.lane:Math.sin(r.s*.017+r.id)*2;
  if(ramp&&(!gate||gate.s-r.s>45))aim=ramp.lane;
  const controls=cpu?{steer:clamp((aim-r.lane)*.7,-1,1),tuck:true,spin:r.height>.8&&(r.id%2?1:-1)}:input;
  const steer=clamp(Number(controls.steer)||0,-1,1),brake=!!controls.brake,tuck=!!controls.tuck&&!brake;
  r.steer+=(steer-r.steer)*Math.min(1,dt*8);r.boost=Math.max(0,r.boost-dt);r.bump=Math.max(0,r.bump-dt);
  const pace=cpu?(g.difficulty==='easy'?.67+r.id*.014:.96+r.id*.012):1;
  const target=(tuck?26:21)*pace*(brake?.35:1)*(r.bump>0?.45:1)*(r.boost>0?1.23:1);
  r.speed+=(target-r.speed)*Math.min(1,dt*1.35);
  const old=r.s,edge=g.course.config.width/2-1.3;
  r.lane+=steer*(6.6+r.speed*.12)*dt;
  if(Math.abs(r.lane)>edge){r.lane=clamp(r.lane,-edge,edge);r.speed=Math.max(6,r.speed-dt*14);}
  if(!steer&&g.difficulty==='easy')r.lane*=Math.max(0,1-dt*.06);
  r.s+=r.speed*dt;
  if(controls.jump&&!r.jumpHeld&&r.height<=0&&r.bump===0){r.vy=5.2;r.height=rampLift(g.course,r.s,r.lane)+.01;r.airTime=0;r.spin=0;notify(g,r,'CATCH SOME AIR!');}
  r.jumpHeld=!!controls.jump;
  for(const a of g.course.ramps)if(old<a.s&&r.s>=a.s&&Math.abs(r.lane-a.lane)<a.width/2&&r.height<.2){r.vy=7.8+(g.course.index===2?1.7:0)+r.speed*.05;r.height=a.height+.03;r.airTime=0;r.spin=0;notify(g,r,'BIG AIR · Q / E TO SPIN');}
  if(r.height>0){
   r.airTime+=dt;r.vy-=12*dt;r.height+=r.vy*dt;r.spin+=clamp(Number(controls.spin)||0,-1,1)*5.9*dt;
   if(r.height<=rampLift(g.course,r.s,r.lane)){r.height=0;r.vy=0;const turns=Math.floor((Math.abs(r.spin)+.15)/Math.PI);
    if(turns>0){const score=turns*150;r.tricks+=score;r.boost=1.2;notify(g,r,turns*180+'° SPIN! +'+score);}
    r.spin=0;
   }
  }
  for(const a of g.course.gates)if(old<a.s&&r.s>=a.s){if(Math.abs(r.lane-a.lane)<a.width/2&&r.height<3.2){r.gates++;r.boost=1.6;notify(g,r,'CLEAN GATE! SPEED BOOST');}else notify(g,r,'MISSED GATE · KEEP GOING!');}
  for(const a of g.course.rocks)if(old<a.s&&r.s>=a.s&&Math.abs(r.lane-a.lane)<a.radius+.5&&r.height<1.5){r.bump=1.3;r.crashes++;r.speed*=.45;notify(g,r,'SNOW BUMP! YOU’VE GOT THIS');}
  if(r.s>=g.course.config.length){const fraction=(g.course.config.length-old)/Math.max(.001,r.s-old);r.s=g.course.config.length;r.finished=true;r.rawTime=g.elapsed-dt+dt*clamp(fraction,0,1);r.time=r.rawTime;r.height=0;r.spin=0;r.speed=0;}
 }
 g.place=order(g.racers).findIndex(r=>r.id===0)+1;
 if(g.racers[0].finished){g.phase='finished';g.event=g.place===1?'MOUNTAIN CHAMPION!':'FINISH LINE!';}
}
