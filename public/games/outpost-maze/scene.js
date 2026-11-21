import * as THREE from '../../vendor/three.module.js';
import {TILE} from './levels.js';
import {GEAR,hazardPhase,CREDIT_PICKUP} from './rules.js';

const standard=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...options});
const glow=(color,amount=.8)=>standard(color,{emissive:color,emissiveIntensity:amount,roughness:.4});
const blocks=new THREE.BoxGeometry(1,1,1);
const sphere=new THREE.SphereGeometry(1,18,14);
function part(parent,geometry,material,position,size=null){
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(...position);
 if(size)mesh.scale.set(...size);
 parent.add(mesh);
 return mesh;
}
const box=(parent,material,position,size)=>part(parent,blocks,material,position,size);
function marker(parent,text,color,width=2.7){
 const canvas=document.createElement('canvas');
 canvas.width=384;
 canvas.height=100;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#14222d';
 ctx.fillRect(0,0,384,100);
 ctx.strokeStyle=color;
 ctx.lineWidth=7;
 ctx.strokeRect(4,4,376,92);
 ctx.font='800 47px system-ui';
 ctx.fillStyle='#edf9ef';
 ctx.textAlign='center';
 ctx.textBaseline='middle';
 ctx.fillText(text,192,51);
 const map=new THREE.CanvasTexture(canvas);
 map.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Sprite(new THREE.SpriteMaterial({map}));
 sign.scale.set(width,width*100/384,1);
 parent.add(sign);
 return sign;
}

function person(parent,teal){
 const root=new THREE.Group();
 parent.add(root);
 const body=new THREE.Group();
 root.add(body);
 const finish=standard(teal?'#318c88':'#8c664c',{metalness:.13});
 const accent=standard(teal?'#70eee0':'#dba478',{metalness:.25});
 const soft=standard('#243039'),plate=standard('#364954');
 const visor=glow(teal?'#8affdf':'#f5b767',.75);
 box(body,finish,[0,.878,0],[.64,.59,.36]);
 box(body,plate,[0,.91,.218],[.48,.36,.11]);
 box(body,accent,[0,.947,.282],[.26,.045,.021]);
 box(body,soft,[0,.92,-.22],[.43,.41,.14]);
 const head=part(body,sphere,finish,[0,1.382,0],[.29,.279,.28]);
 head.rotation.y=Math.PI/2;
 box(body,soft,[0,1.345,.218],[.437,.184,.124]);
 box(body,visor,[0,1.35,.29],[.366,.073,.022]);
 box(body,plate,[0,1.575,.013],[.33,.064,.28]);
 const legs=[];
 const arms=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();
  leg.position.set(side*.165,.58,0);
  body.add(leg);
  legs.push(leg);
  box(leg,finish,[0,-.218,.002],[.227,.45,.254]);
  box(leg,soft,[0,-.49,.066],[.254,.164,.380]);
  box(leg,accent,[0,-.23,.143],[.17,.103,.028]);
  const arm=new THREE.Group();
  arm.position.set(side*.411,1.03,0);
  body.add(arm);
  arms.push(arm);
  box(arm,finish,[0,-.166,.015],[.206,.365,.222]);
  box(arm,soft,[0,-.334,.036],[.184,.167,.195]);
  box(arm,accent,[0,-.067,.037],[.230,.141,.253]);
 }
 const blaster=box(arms[1],accent,[.004,-.301,.16],[.194,.172,.342]);
 box(arms[1],soft,[.004,-.297,.321],[.146,.118,.086]);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.58,24),new THREE.MeshBasicMaterial({color:'#0e181f',transparent:true,opacity:.35,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;
 shadow.position.y=.017;
 root.add(shadow);
 const halo=part(root,new THREE.RingGeometry(.56,.60,36),new THREE.MeshBasicMaterial({color:teal?'#6effd2':'#ffc066',side:THREE.DoubleSide}),[0,.034,0]);
 halo.rotation.x=-Math.PI/2;
 return {root,body,legs,arms,halo,blaster};
}

function updatePerson(rig,entity,walk,air=0,stance='walk'){
 rig.root.position.set(entity.x,0,entity.z);
 rig.body.rotation.y=entity.angle;
 rig.body.position.y=air;
 const stunned=stance==='stun';
 const alert=stance==='alert';
 rig.halo.material.color.set(stunned?'#7cdeff':alert?'#ff885a':'#f8c479');
 if(stunned)rig.body.rotation.z=.12;
 else rig.body.rotation.z=0;
 rig.legs.forEach((leg,i)=>{leg.rotation.x=stunned?0:Math.sin(walk+i*Math.PI)*.36;});
 rig.arms.forEach((arm,i)=>{arm.rotation.x=stunned?.31:i===1?-.94:Math.sin(walk+i*Math.PI+.4)*.30;});
}

function instanced(parent,material,values){
 const mesh=new THREE.InstancedMesh(blocks,material,values.length);
 const object=new THREE.Object3D();
 for(let i=0;i<values.length;i++){
  const {position,size,color}=values[i];
  object.position.set(...position);
  object.scale.set(...size);
  object.updateMatrix();
  mesh.setMatrixAt(i,object.matrix);
  if(color)mesh.setColorAt(i,new THREE.Color(color));
 }
 parent.add(mesh);
 return mesh;
}

function course(scene,game){
 const shapes={floor:[],wall:[],cap:[],band:[]};
 const {map,accent}=game.level;
 for(let z=0;z<map.length;z++)for(let x=0;x<map[z].length;x++){
  const wx=x*TILE,wz=z*TILE,tile=map[z][x];
  const color=(x+z)%2===0?'#485b66':'#42535f';
  shapes.floor.push({position:[wx,-.085,wz],size:[TILE-.025,.17,TILE-.025],color});
  if(tile!=='#')continue;
  const steel=z%2===0?'#4f6575':'#546879';
  shapes.wall.push({position:[wx,.717,wz],size:[TILE,1.43,TILE],color:steel});
  shapes.cap.push({position:[wx,1.475,wz],size:[TILE-.07,.10,TILE-.07],color:'#859eaa'});
  shapes.band.push({position:[wx,.41,wz],size:[TILE+.025,.07,TILE+.025],color:'#31434e'});
 }
 instanced(scene,standard('#fff'),shapes.floor);
 instanced(scene,standard('#fff',{metalness:.12}),shapes.wall);
 instanced(scene,standard('#fff',{metalness:.25}),shapes.cap);
 instanced(scene,standard('#fff'),shapes.band);

 const stripe=standard(accent,{metalness:.12});
 const barricade=standard('#524735');
 const cap=standard('#a78655',{metalness:.25});
 for(const {x,z,halfX,halfZ} of game.barriers){
  box(scene,barricade,[x,.303,z],[halfX*2,.606,halfZ*2]);
  box(scene,cap,[x,.63,z],[halfX*2+.02,.064,halfZ*2+.02]);
  for(const side of [-1,1]){
   const acrossX=halfX>halfZ;
   const pos=[x+(acrossX?.66*side:0),.652,z+(acrossX?0:.66*side)];
   box(scene,stripe,pos,acrossX?[.16,.051,halfZ*2+.049]:[halfX*2+.049,.051,.16]);
  }
 }
 for(const [point,color,text] of [[game.start,'#6dece1','SUPPLY'],[game.checkpoint,'#b89bff','CHECKPOINT'],[game.exit,'#b8f28d','EXIT']]){
  box(scene,glow(color,.28),[point.x,.024,point.z],[1.92,.042,1.92]);
  box(scene,standard('#253745'),[point.x,.05,point.z],[1.67,.042,1.67]);
  if(text!=='EXIT')marker(scene,text,color).position.set(point.x,.58,point.z);
 }
 const exitGlow=glow('#ff996a',.8);
 for(const side of [-1,1]){
  box(scene,standard('#344956'),[game.exit.x+side*.93,.94,game.exit.z],[.23,1.87,.28]);
  box(scene,exitGlow,[game.exit.x+side*.93,1.19,game.exit.z+.153],[.096,1.18,.043]);
 }
 box(scene,exitGlow,[game.exit.x,1.89,game.exit.z],[2.1,.14,.30]);
 box(scene,exitGlow,[game.exit.x,.082,game.exit.z],[1.71,.041,.14]);
 marker(scene,'EXIT','#a9f5a6',2.0).position.set(game.exit.x,2.37,game.exit.z);
 return exitGlow;
}

export function createScene(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.65));
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.27;
 const camera=new THREE.PerspectiveCamera(48,1,.1,86);
 const target=new THREE.Vector3();
 const next=new THREE.Vector3();
 const lineGeometry=new THREE.BufferGeometry();
 lineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3));
 const beam=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:'#6ff5df',transparent:true}));
 beam.frustumCulled=false;
 let scene=null,player,guards,tokens,chip,hazards,exitGlow;
 const shared=new Set([blocks,sphere,lineGeometry]);
 function clear(){
  if(!scene)return;
  scene.remove(beam);
  const geometries=new Set(),materials=new Set();
  scene.traverse(object=>{
   if(object.isInstancedMesh)object.dispose();
   if(object.geometry&&!shared.has(object.geometry))geometries.add(object.geometry);
   if(object.material)materials.add(object.material);
  });
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials){material.map?.dispose();material.dispose();}
 }
 function load(game){
  clear();
  scene=new THREE.Scene();
  scene.background=new THREE.Color('#162633');
  scene.fog=new THREE.Fog('#182936',19,50);
  scene.add(new THREE.HemisphereLight('#d6e5fb','#655046',2.25));
  const sun=new THREE.DirectionalLight('#ffe1b5',2.1);
  sun.position.set(-7,11,-4);
  scene.add(sun);
  exitGlow=course(scene,game);
  player=person(scene,true);
  guards=game.guards.map(()=>person(scene,false));
  const tokenShape=new THREE.CylinderGeometry(.39,.39,.13,6);
  tokenShape.rotateX(Math.PI/2);
  const gold=glow('#ffc85f',.4);
  tokens=game.tokens.map(({x,z})=>{
   const token=new THREE.Group();
   part(token,tokenShape,gold,[0,0,0]);
   marker(token,'$'+CREDIT_PICKUP,'#ffcc71',.52).position.y=.035;
   token.position.set(x,.49,z);
   scene.add(token);
   return token;
  });
  chip=new THREE.Group();
  scene.add(chip);
  box(chip,glow('#65d4ff'),[0,0,0],[.69,.43,.12]);
  box(chip,standard('#275473'),[0,.015,.074],[.37,.24,.036]);
  for(let i=0;i<4;i++)box(chip,glow('#91f7ff'),[-.216+i*.14,-.193,.037],[.041,.072,.043]);
  chip.position.set(game.chip.x,.56,game.chip.z);
  hazards=game.hazards.map(({x,z})=>{
   const signal=glow('#547e88',.2);
   box(scene,standard('#2c414e'),[x,.041,z],[2.58,.08,2.58]);
   for(let i=-2;i<=2;i++)box(scene,signal,[x+i*.46,.093,z],[.13,.027,2.26]);
   return signal;
  });
  scene.add(beam);
  snapCamera(game);
 }
 function snapCamera(game){
  target.set(game.player.x,.25,game.player.z-.9);
  camera.position.set(target.x,10.2,target.z+8.3);
  camera.lookAt(target);
 }
 function resize(){
  const {clientWidth:w,clientHeight:h}=canvas;
  if(!w||!h)return;
  renderer.setSize(w,h,false);
  camera.aspect=w/h;
  camera.fov=camera.aspect<.82?53:48;
  camera.updateProjectionMatrix();
 }
 function draw(game,walk,dt){
  const now=game.run.time;
  updatePerson(player,game.player,walk,game.player.y);
  const gear=GEAR.find(item=>item.id===game.profile.equipped);
  player.halo.material.color.set(game.player.immune>0?'#a5faff':'#69edcb');
  player.blaster.material.color.set(gear.color);
  game.guards.forEach((guard,i)=>updatePerson(guards[i],guard,guard.walk*9,0,guard.stun?'stun':guard.alert>.23?'alert':'walk'));
  tokens.forEach((token,i)=>{
   token.visible=!game.run.collected.includes(i);
   token.rotation.y=now*2+i*.52;
   token.position.y=.49+Math.sin(now*3+i)*.09;
  });
  chip.visible=!game.run.chip;
  chip.rotation.y=now*2;
  chip.position.y=.57+Math.sin(now*3)*.10;
  exitGlow.color.set(game.run.chip?'#a7f681':'#f8a368');
  exitGlow.emissive.copy(exitGlow.color);
  hazards.forEach((material,i)=>{
   const phase=hazardPhase(game,game.hazards[i]);
   material.color.set(phase==='active'?'#ff805e':phase==='warning'?'#ecc363':'#426a7a');
   material.emissive.copy(material.color);
   material.emissiveIntensity=phase==='active'?1.5:phase==='warning'?.8:.1;
  });
  beam.visible=!!game.beam;
  if(game.beam){
   const {from,to,color,ttl}=game.beam;
   const positions=lineGeometry.getAttribute('position');
   positions.setXYZ(0,from.x,from.y,from.z);
   positions.setXYZ(1,to.x,to.y,to.z);
   positions.needsUpdate=true;
   beam.material.color.set(color);
   beam.material.opacity=.5+ttl*3;
  }
  next.set(game.player.x,.25,game.player.z-.9);
  target.lerp(next,1-Math.exp(-dt*7.5));
  camera.position.set(target.x,10.2,target.z+8.3);
  camera.lookAt(target);
  renderer.render(scene,camera);
 }
 return {load,resize,draw,snapCamera};
}
