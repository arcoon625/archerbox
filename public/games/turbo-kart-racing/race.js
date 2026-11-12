import * as THREE from '../../vendor/three.module.js';
export const tracks=[
 {name:'Neon City',tag:'MIDNIGHT STREETS',color:'#66f5cf',sky:0x101c32,ground:0x283e45,road:0x37414f,points:[[0,0,65],[-48,1,54],[-76,0,14],[-59,1,-37],[-14,2,-64],[43,1,-54],[69,0,-9],[46,1,42]],hills:1.5},
 {name:'Desert Dash',tag:'CANYONS & SAND',color:'#ffc278',sky:0xe8c99f,ground:0xc6a473,road:0x665d54,points:[[0,0,62],[-43,1,66],[-79,3,25],[-64,2,-30],[-29,0,-58],[24,2,-65],[67,3,-25],[65,1,27],[33,0,55]],hills:2},
 {name:'Glacier Circuit',tag:'FROZEN MOUNTAIN PASS',color:'#9eeaff',sky:0xc0d8ed,ground:0xdeedf3,road:0x688490,points:[[0,0,65],[-54,2,46],[-68,4,0],[-39,2,-39],[-6,0,-64],[47,2,-59],[70,4,-14],[52,1,41]],hills:3},
 {name:'Volcano Valley',tag:'MOLTEN SPEEDWAY',color:'#ff8c75',sky:0x2b1c28,ground:0x3c303b,road:0x4f4249,points:[[0,0,68],[-49,3,58],[-79,5,12],[-55,3,-37],[-6,0,-65],[38,2,-45],[75,4,-17],[65,3,34],[31,0,57]],hills:2.5}
];
export const karts=[
 {name:'Bolt',tag:'ALL-ROUND RACER',color:0xffbf42,css:'#ffbf42',top:23,accel:12,steer:1.6,grip:1.0,style:'sport',stats:[4,4,4]},
 {name:'Comet',tag:'HIGH-SPEED MACHINE',color:0xff6978,css:'#ff6978',top:26,accel:9.5,steer:1.4,grip:.93,style:'arrow',stats:[5,3,3]},
 {name:'Drift',tag:'CORNERING SPECIALIST',color:0x62d6ff,css:'#62d6ff',top:21.5,accel:13,steer:1.95,grip:1.12,style:'compact',stats:[3,4,5]},
 {name:'Titan',tag:'QUICK OFF THE LINE',color:0xaa9bff,css:'#aa9bff',top:22,accel:15,steer:1.5,grip:1.04,style:'wide',stats:[3,5,4]}
];
export const ROAD_WIDTH=18,LAPS=3;
export function makeTrack(index){
 const config=tracks[index],points=config.points.map(([x,y,z])=>new THREE.Vector3(x,y+2,z));const curve=new THREE.CatmullRomCurve3(points,true,'centripetal');curve.arcLengthDivisions=1000;curve.updateArcLengths();const length=curve.getLength();
 function sample(s){const u=((s/length)%1+1)%1,p=curve.getPointAt(u),t=curve.getTangentAt(u);p.y+=Math.sin(u*Math.PI*4)*config.hills;const right=new THREE.Vector3(-t.z,0,t.x).normalize();return {p,t,right,yaw:Math.atan2(-t.x,-t.z),u}}
 return{config,length,sample,curve,rampHeight(s){let best=0;for(const u of [.31,.68]){const distance=((s-u*length)%length+length)%length-length;if(distance>=-8)best=Math.max(best,1.8*((distance+8)/8)**2)}return best},pads:[.16,.49,.8].map(u=>u*length),ramps:[.31,.68].map(u=>u*length)};
}
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function makeRacer(name,kartIndex,grid){return {name,kartIndex,s:-grid*4.4,lane:grid%2===0?-3:3,speed:0,heading:0,boost:100,padBoost:0,rampCooldown:0,air:0,vy:0,finished:false,time:null,drifting:false,steering:0}}
export function drive(racer,track,input,dt){
 if(racer.finished)return {pad:false,ramp:false};const stats=karts[racer.kartIndex],oldS=racer.s,old=track.sample(oldS),throttle=clamp(input.throttle||0,-1,1),steering=clamp(input.steer||0,-1,1),assisted=!!input.assist,edge=ROAD_WIDTH/2-1.35;
 racer.padBoost=Math.max(0,racer.padBoost-dt);racer.rampCooldown=Math.max(0,racer.rampCooldown-dt);racer.drifting=!!input.drift&&Math.abs(steering)>.12&&racer.speed>7;racer.steering=steering;
 const boosted=!!input.boost&&racer.boost>0&&throttle>0;if(boosted)racer.boost=Math.max(0,racer.boost-(assisted?28:42)*dt);else racer.boost=Math.min(100,racer.boost+(racer.drifting?(assisted?34:24):(assisted?18:10))*dt);
 const max=stats.top*clamp(input.pace??1,.5,1)*(boosted?1.34:1)*(racer.padBoost>0?1.25:1),turnRate=stats.steer*clamp(racer.speed/10,.12,1)*(racer.drifting?1.3:1);
 racer.speed=clamp(racer.speed+(throttle>0?stats.accel:throttle<0?-25:-4)*dt,0,max);
 if(assisted){
  // Follow the track's bends; steering chooses a gentle lane-change angle.
  let target=steering*(racer.drifting?.42:.28)*stats.steer/1.6;
  if(target*racer.lane>0)target*=clamp((edge-Math.abs(racer.lane))/2,0,1);
  if(Math.abs(racer.lane)>edge-1.2)target-=Math.sign(racer.lane)*.16*(Math.abs(racer.lane)-(edge-1.2))/1.2;
  racer.heading+=(target-racer.heading)*Math.min(1,dt*5);
 }else racer.heading=clamp(racer.heading+steering*turnRate*dt,-1.2,1.2);
 racer.s+=Math.cos(racer.heading)*racer.speed*dt;racer.lane+=Math.sin(racer.heading)*racer.speed*dt*(racer.drifting?1.16:1)/stats.grip;
 const next=track.sample(racer.s);if(!assisted)racer.heading=clamp(wrap(racer.heading+wrap(next.yaw-old.yaw)),-1.2,1.2);
 if(Math.abs(racer.lane)>edge){racer.lane=clamp(racer.lane,-edge,edge);racer.speed*=Math.max(.7,1-dt*(assisted?1.5:8));racer.heading*=Math.max(.8,1-dt*7)}
 const crossed=marker=>Math.floor((racer.s-marker)/track.length)>Math.floor((oldS-marker)/track.length);
 const pad=track.pads.some(crossed)&&Math.abs(racer.lane)<6.8;if(pad)racer.padBoost=1.25;
 const ramp=track.ramps.some(crossed)&&racer.speed>11&&racer.rampCooldown===0;if(ramp){racer.vy=7;racer.air=1.8;racer.rampCooldown=2}
 if(racer.air>0||racer.vy>0){racer.vy-=17*dt;racer.air+=racer.vy*dt;if(racer.air<0){racer.air=0;racer.vy=0}}
 return {pad,ramp,boosted};
}
export function cpuInput(racer,track,time,seed){
 const here=track.sample(racer.s),ahead=track.sample(racer.s+Math.max(3,racer.speed*.45)),curve=wrap(ahead.yaw-here.yaw)/.45,desiredLane=Math.sin(time*.4+seed)*2.8+Math.sin(seed*2)*1.5;
 const target=clamp((desiredLane-racer.lane)*.055,-.35,.35),rate=karts[racer.kartIndex].steer;
 return {throttle:1,pace:.6+seed*.012,steer:clamp(((target-racer.heading)*3-curve)/rate,-1,1),boost:false,drift:false};
}
export function order(racers){return [...racers].sort((a,b)=>a.finished&&b.finished?a.time-b.time:a.finished?-1:b.finished?1:b.s-a.s)}
export function progress(racer,track){return clamp(Math.floor(Math.max(0,racer.s)/track.length)+1,1,LAPS)}
export function checkFinish(racer,track,time){if(!racer.finished&&racer.s>=track.length*LAPS){racer.finished=true;racer.time=time;return true}return false}
