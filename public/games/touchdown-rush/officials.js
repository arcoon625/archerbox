import * as THREE from '../../vendor/three.module.js';
import {animatePlayer} from './motion.js?v=athletes2';
import {FIELD} from './field.js?v=athletes2';
import {kickIsGood} from './kicking.js?v=seasons1';

const clamp=THREE.MathUtils.clamp,smooth=THREE.MathUtils.smoothstep;
const half=FIELD.width/2;
const crewSlots=[
 {name:'Referee',x:9,depth:-12,trail:-10,pace:6.2},
 {name:'Umpire',x:-8,depth:-10,trail:-8,pace:6.4},
 {name:'Down judge',x:-half-.65,depth:0,trail:-1,pace:7.3},
 {name:'Line judge',x:half+.65,depth:0,trail:-1,pace:7.3},
 {name:'Side judge',x:-half+.45,depth:20,trail:9,pace:7.2},
 {name:'Field judge',x:half-.45,depth:20,trail:9,pace:7.2},
 {name:'Back judge',x:1,depth:26,trail:12,pace:7}
];
function yardDirection(game){
 if(game.placeKick)return game.placeKick.direction;
 if(game.viewDirection)return game.phase==='kick'?-game.viewDirection:game.viewDirection;
 return game.offense===0?-1:1;
}

function stripedFabric(){
 const pixels=new Uint8Array(112*4*4);
 for(let y=0;y<4;y++)for(let x=0;x<112;x++){
  const i=(y*112+x)*4,white=x%14<7;
  pixels.set(white?[235,237,228,255]:[19,23,25,255],i);
 }
 const map=new THREE.DataTexture(pixels,112,4);
 map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;
 map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;
 map.generateMipmaps=true;map.anisotropy=4;map.needsUpdate=true;
 return map;
}

function makeReferee(slot,index,kit){
 const mesh=new THREE.Group(),upperBody=new THREE.Group(),head=new THREE.Group();
 mesh.name=slot.name;mesh.scale.setScalar(.93+index%3*.025);
 mesh.add(upperBody);upperBody.add(head);upperBody.position.y=1.04;head.position.y=.83;
 const arms=[],elbows=[],hands=[],legs=[],knees=[],ankles=[];
 const {oval,box,pants,white,black,shirt,torso,sleeve,metal,flag}=kit,skin=kit.skin[index%kit.skin.length];
 const cap=index===0?white:black;
 const add=(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1)=>{
  const part=new THREE.Mesh(geometry,material);part.position.set(x,y,z);part.scale.set(sx,sy,sz);
  part.castShadow=part.receiveShadow=true;parent.add(part);return part;
 };
 add(upperBody,torso,shirt,0,.30,0,1,1,.62);
 add(upperBody,oval,pants,0,.012,0,.26,.126,.163);
 add(upperBody,oval,black,0,.054,0,.26,.040,.164);
 add(upperBody,box,flag,index%2===0?-.21:.21,.079,-.092,.073,.083,.029);
 add(upperBody,oval,skin,0,.632,0,.083,.109,.078);
 add(upperBody,box,metal,0,.53,-.191,.046,.031,.027);
 add(head,oval,skin,0,-.002,-.005,.146,.187,.139);
 add(head,oval,skin,0,-.025,-.135,.028,.032,.030);
 add(head,oval,cap,0,.126,.003,.153,.100,.149);
 add(head,oval,cap,0,.082,-.113,.129,.018,.141);
 for(const side of [-1,1]){
  add(head,oval,skin,side*.141,-.010,.007,.020,.038,.024);
  add(head,oval,black,side*.049,.021,-.128,.017,.008,.006);
  const arm=new THREE.Group(),elbow=new THREE.Group(),hand=new THREE.Group();
  upperBody.add(arm);arm.add(elbow);elbow.add(hand);
  arm.position.set(side*.239,.517,0);elbow.position.y=-.29;hand.position.y=-.257;
  add(arm,sleeve,shirt,0,-.067,0,1,1,1);
  add(arm,oval,skin,0,-.202,0,.062,.111,.066);
  add(elbow,oval,skin,0,-.100,0,.052,.158,.055);
  add(hand,oval,skin,0,-.009,-.012,.044,.071,.036);
  arms.push(arm);elbows.push(elbow);hands.push(hand);
  const leg=new THREE.Group(),knee=new THREE.Group(),ankle=new THREE.Group();
  mesh.add(leg);leg.add(knee);knee.add(ankle);
  leg.position.set(side*.12,1.025,0);knee.position.y=-.43;ankle.position.y=-.40;
  add(leg,oval,pants,0,-.175,0,.122,.272,.123);
  add(knee,oval,pants,0,-.162,0,.092,.247,.092);
  add(ankle,oval,black,0,-.074,-.067,.079,.068,.151);
  add(ankle,oval,white,0,-.123,-.066,.080,.028,.149);
  legs.push(leg);knees.push(knee);ankles.push(ankle);
 }
 mesh.userData={arms,elbows,hands,legs,knees,ankles,upperBody,head};
 return mesh;
}

function playSpot(game){
 if(game.placeKick)return {x:0,z:game.placeKick.goalZ};
 if(game.phase==='flight'&&game.ball)return game.ball.to;
 if(game.phase==='kick'&&game.ball)return game.ball.to;
 if(game.phase==='dead'&&game.passResult?.kind==='incomplete')return game.passResult;
 return game.actors[game.carrier];
}

function station(game,slot,index,spot){
 const dir=yardDirection(game);
 if(game.placeKick&&(index===5||index===6)){
  return {x:index===5?3.65:-3.65,z:game.placeKick.goalZ+dir*1.2};
 }
 if(game.phase==='ready'||game.placeKick){
  const depth=game.line+dir*slot.depth;
  return {x:slot.x,z:clamp(depth,-57,57)};
 }
 const z=spot.z;
 let x=slot.x;
 if(index<2)x=clamp(x+spot.x*.24,-21,21);
 if(index===6)x=clamp(spot.x*.55,-15,15);
 const depth=index===2||index===3?Math.max(game.line*dir,z*dir)+slot.trail:z*dir+slot.trail;
 return {x,z:clamp(depth*dir,-58,58)};
}

function refereeCall(game){
 if(game.placeKick&&game.ball?.finished){
  if(game.event.includes('GOOD!'))return 'score';
  if(game.event.startsWith('NO GOOD'))return 'wave';
  // The final-score banner can replace the kick result on a game winner.
  return game.phase==='finished'&&(game.ball.z-game.placeKick.goalZ)*game.placeKick.direction>=0&&kickIsGood(game.ball)?'score':null;
 }
 if(game.phase!=='dead')return game.event==='TOUCHBACK'?'dead':null;
 if(game.pendingTry||game.event.includes('TOUCHDOWN'))return 'score';
 if(game.passResult?.kind==='incomplete'||game.event.startsWith('INCOMPLETE'))return 'wave';
 if(game.event==='FIRST DOWN!'||game.event==='INTERCEPTED!')return 'first';
 return 'dead';
}

function callGesture(mesh,call,elapsed){
 const i=mesh.userData;
 const weight=smooth(elapsed,0,.21)*(1-smooth(elapsed,1.35,1.75));
 for(const [side,arm] of i.arms.entries()){
  const sign=side===0?-1:1;
  if(call==='dead'&&side===0)continue;
  const open=smooth(elapsed%0.56,.05,.29);
  const lift=call==='score'||call==='dead'?3.10:call==='wave'?1.17:1.57;
  const spread=call==='wave'?sign*(-.23+open*1.57):call==='first'?-sign*.29:sign*.12;
  const elbow=call==='wave'?.75-.57*open:call==='dead'?.14:.06;
  arm.rotation.x=THREE.MathUtils.lerp(arm.rotation.x,lift,weight);
  arm.rotation.z=THREE.MathUtils.lerp(arm.rotation.z,spread,weight);
  i.elbows[side].rotation.x=THREE.MathUtils.lerp(i.elbows[side].rotation.x,elbow,weight);
 }
}

function moveOfficial(person,target,actors,dt){
 const {mesh,slot}=person,position=mesh.position;
 let x=target.x,z=target.z;
 // Officials yield away from players approaching their spot.
 if(Math.abs(x)<half-.4){
  for(const actor of actors){
   const horizon=.22,dx=position.x-actor.x-(actor.vx||0)*horizon,dz=position.z-actor.z-(actor.vz||0)*horizon;
   const gap=Math.hypot(dx,dz);
   if(gap<2.15){x+=(gap>.08?dx/gap:Math.sign(slot.x)||1)*(2.15-gap)*1.8;z+=(gap>.08?dz/gap:0)*(2.15-gap);}
  }
  x=clamp(x,-half+.3,half-.3);
 }
 const dx=x-position.x,dz=z-position.z,distance=Math.hypot(dx,dz);
 const speed=Math.min(slot.pace,Math.max(0,distance-.09)*3);
 if(distance>.09){
  const step=Math.min(speed*dt,distance)/distance;
  position.x+=dx*step;position.z+=dz*step;
 }
 return speed;
}

export function makeOfficials(){
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.87,...extra});
 const kit={
  oval:new THREE.SphereGeometry(1,9,7),box:new THREE.BoxGeometry(1,1,1),
  torso:new THREE.CylinderGeometry(.285,.242,.54,16),
  sleeve:new THREE.CylinderGeometry(.091,.074,.175,10),
  shirt:material(0xffffff,{map:stripedFabric()}),pants:material(0x191c22),white:material(0xe0e2db),
  black:material(0x15191c),metal:material(0x969c9a,{metalness:.44}),flag:material(0xf2c946),
  skin:[0xbe846a,0x865041,0xb37657,0xd09b83,0x79463a].map(color=>material(color))
 };
 const group=new THREE.Group(),people=crewSlots.map((slot,index)=>({slot,mesh:makeReferee(slot,index,kit)}));
 group.name='On-field officiating crew';group.add(...people.map(person=>person.mesh));
 const point=new THREE.Vector3();
 let lastCall=null,calledAt=0,signaling=[],lastKick=null;
 function update(game,time,dt,{visible=true,reset=false,reducedMotion=false}={}){
  group.visible=visible;if(!visible)return;
  const spot=playSpot(game),kickId=game.placeKick?.id??null,changedKick=kickId!==null&&kickId!==lastKick;
  const call=refereeCall(game);
  if(call!==lastCall||reset){
   calledAt=time;lastCall=call;
   point.set(spot.x,0,spot.z);
   if(!call)signaling=[];
   else if(game.placeKick)signaling=[people[5],people[6]];
   else if(call==='first')signaling=[people[0]];
   else signaling=[...people].sort((a,b)=>a.mesh.position.distanceToSquared(point)-b.mesh.position.distanceToSquared(point)).slice(0,call==='score'?2:1);
  }
  lastKick=kickId;
  const direction=yardDirection(game);
  people.forEach((person,index)=>{
   const {mesh}=person,target=station(game,person.slot,index,spot);
   const setPosition=reset||changedKick&&(index===5||index===6);
   if(setPosition)mesh.position.set(target.x,0,target.z);
   const speed=setPosition?0:moveOfficial(person,target,game.actors,dt);
   const signal=call&&signaling.includes(person)&&time-calledAt<1.75;
   const face=signal&&call==='first'?(game.event==='INTERCEPTED!'?-direction:direction):0;
   const x=face?0:speed>1.2&&!signal?target.x-mesh.position.x:spot.x-mesh.position.x;
   const z=face||(speed>1.2&&!signal?target.z-mesh.position.z:spot.z-mesh.position.z);
   const yaw=Math.atan2(-x,-z);
   mesh.rotation.y+=setPosition?yaw-mesh.rotation.y:Math.atan2(Math.sin(yaw-mesh.rotation.y),Math.cos(yaw-mesh.rotation.y))*Math.min(1,dt*7);
   animatePlayer(mesh,{id:index,role:'official',moving:reducedMotion?0:speed},time);
   if(signal)callGesture(mesh,call,reducedMotion?.45:time-calledAt);
  });
 }
 return {group,update};
}
