import * as THREE from '../../vendor/three.module.js';
import {INGREDIENTS} from './menus.js';
import {STATIONS} from './space.js';

const cubeGeometry=new THREE.BoxGeometry();
const cylinderGeometry=new THREE.CylinderGeometry(1,1,1,24);
const ballGeometry=new THREE.SphereGeometry(1,22,13);
const materials=new Map();
function material(color){
 if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.76}));
 return materials.get(color);
}
function mesh(parent,geometry,paint,x,y,z,w,h,d){
 const model=new THREE.Mesh(geometry,typeof paint==='string'?material(paint):paint);
 model.position.set(x,y,z);model.scale.set(w,h,d);parent.add(model);
 return model;
}
const box=(parent,color,x,y,z,w,h,d)=>mesh(parent,cubeGeometry,color,x,y,z,w,h,d);
const drum=(parent,color,x,y,z,r,h)=>mesh(parent,cylinderGeometry,color,x,y,z,r,h,r);
const ball=(parent,color,x,y,z,w,h,d)=>mesh(parent,ballGeometry,color,x,y,z,w,h,d);

function sign(scene,x,y,z,w,h,facing=0){
 const canvas=document.createElement('canvas');
 canvas.height=128;canvas.width=Math.round(128*w/h);
 const ctx=canvas.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=4;
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));
 panel.position.set(x,y,z);panel.rotation.y=facing;scene.add(panel);
 return {panel,update(text,background,ink,size=68){
  ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#ffffff35';ctx.lineWidth=4;ctx.strokeRect(10,10,canvas.width-20,108);
  ctx.fillStyle=ink;ctx.font=`800 ${size}px system-ui,sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,65,canvas.width-32);
  texture.needsUpdate=true;
 }};
}
function makeFloor(scene){
 const colors=['#eae5d2','#bdcbb7'];
 const matrix=new THREE.Matrix4();
 for(let shade=0;shade<colors.length;shade++){
  const floor=new THREE.InstancedMesh(cubeGeometry,material(colors[shade]),119);
  let index=0;
  for(let x=0;x<17;x++)for(let z=0;z<14;z++){
   if((x+z)%2!==shade)continue;
   matrix.makeScale(.998,.075,.998).setPosition(x-8,-.055,z-6.5);
   floor.setMatrixAt(index++,matrix);
  }
  scene.add(floor);
 }
}
function windows(scene){
 const white='#efead6',frame='#44646a',outside='#c6e1e3';
 box(scene,white,0,2.0,6.7,16.4,4.0,.25);
 for(const center of [-5.5,5.5]){
  box(scene,frame,center,2.07,6.54,4.18,2.68,.12);
  box(scene,outside,center,2.07,6.46,3.96,2.45,.04);
  box(scene,'#b7cc9f',center,1.30,6.43,3.95,.85,.018);
  box(scene,frame,center,2.08,6.40,.07,2.48,.08);
  box(scene,frame,center,1.78,6.40,3.98,.067,.08);
  box(scene,'#fff5db',center,.76,6.44,4.24,.11,.23);
 }
 box(scene,'#39595e',0,1.52,6.50,1.85,3.04,.22);
 box(scene,'#91b7b4',0,1.79,6.37,1.64,2.20,.04);
 box(scene,'#dce9dd',0,2.22,6.34,1.45,.095,.04);
 box(scene,'#e8d3a9',-.55,1.28,6.34,.05,.37,.12);
 box(scene,'#e8d3a9',.55,1.28,6.34,.05,.37,.12);
}
function furniture(scene,color){
 const wood='#b28765',cream='#eed4a8';
 for(const x of [-5.55,5.55]){
  for(const z of [3.55,5.10]){
   box(scene,'#60716b',x,.15,z,2.28,.29,.74);
   box(scene,color,x,.43,z,2.31,.27,.83);
   box(scene,color,x,.84,z+.30,2.30,.68,.28);
  }
  drum(scene,'#405858',x,.45,4.39,.085,.86);
  box(scene,wood,x,.91,4.39,1.94,.13,.88);
  box(scene,cream,x,.992,4.39,.21,.04,.18);
 }
 for(const x of [-5.2,0,5.2]){
  drum(scene,'#617574',x,3.63,3.26,.035,.91);
  drum(scene,'#59726c',x,3.13,3.26,.39,.16);
  drum(scene,'#fff0cc',x,3.04,3.26,.32,.054);
 }
}
function prepRail(scene){
 const metal='#77908b';
 box(scene,metal,3.8,1.06,.25,3.2,.18,.82);
 const colors=['#96b366','#da7257','#f6cf76','#be986c','#edcfac'];
 colors.forEach((color,i)=>{
  const x=2.56+i*.61;
  box(scene,'#344a4c',x,1.185,.29,.54,.124,.50);
  box(scene,color,x,1.252,.29,.46,.055,.42);
 });
}
function cookLine(scene){
 box(scene,'#809194',-3.8,.61,.32,3.43,1.17,.79);
 box(scene,'#243d42',-4.45,1.25,.25,1.77,.13,.68);
 for(let i=0;i<5;i++)box(scene,'#657b79',-4.45,1.33,.01+i*.11,1.69,.027,.026);
 box(scene,'#aaaca2',-2.80,1.20,.29,1.23,.20,.68);
 box(scene,'#4d6568',-2.82,1.315,.29,.91,.05,.45);
 for(const x of [-3.88,-4.37,-4.72]){
  drum(scene,'#eac08a',x,1.19,-.11,.065,.055).rotation.x=Math.PI/2;
 }
 box(scene,'#394e50',-3.65,.62,-.12,2.41,.57,.03);
 box(scene,'#d0b48a',-3.65,.86,-.17,1.61,.054,.07);
}
function register(scene){
 const desk=new THREE.Group();
 desk.position.x=-1.02;
 scene.add(desk);
 box(desk,'#3b5557',0,1.13,-.06,.91,.14,.51);
 const terminal=box(desk,'#263b40',0,1.41,-.04,.76,.48,.10);
 terminal.rotation.x=-.19;
 box(desk,'#9ec5b4',0,1.42,-.104,.62,.35,.035).rotation.x=-.19;
 box(desk,'#f5dfae',0,1.43,-.128,.34,.04,.016);
 box(desk,'#e6cba0',-.58,1.06,.06,.48,.034,.38);
}
function diningRoom(scene,shopColor){
 makeFloor(scene);
 const cream='#f1e5ca';
 box(scene,cream,-8.1,2.02,.15,.24,4.1,13.6);
 box(scene,cream,8.1,2.02,.15,.24,4.1,13.6);
 box(scene,cream,0,2.02,-6.47,16.2,4.1,.25);
 for(const x of [-7.97,7.97])box(scene,shopColor,x,.52,.11,.08,1.0,13.1);
 windows(scene);
 furniture(scene,shopColor);
 // Repeated seams make the wood counter and tiled kitchen easy to read from eye height.
 box(scene,'#d5ae7e',0,1.015,.22,13.1,.16,.83);
 box(scene,shopColor,0,.51,.20,13.04,.98,.68);
 box(scene,'#b68a64',0,.19,-.15,13.06,.16,.055);
 for(let x=-6.2;x<=6.2;x+=.40)box(scene,'#fff0d6',x,.62,-.133,.016,.48,.015);
 prepRail(scene);cookLine(scene);register(scene);
 for(const x of [-6.50,6.52]){
  drum(scene,'#b38b64',x,.21,1.40,.27,.41);
  for(let n=0;n<4;n++)ball(scene,'#719774',x+Math.sin(n*2)*.164,.62+n*.055,1.42+Math.cos(n*2)*.20,.15,.27,.16);
 }
 const shopSign=sign(scene,0,3.30,6.33,5.2,.80,Math.PI);
 const boards=STATIONS.map(station=>{
  const placard=sign(scene,station.x,.68,-.16,1.76,.34,Math.PI);
  placard.update(station.label,'#26464b','#fff4d7',67);
  const hit=box(scene,new THREE.MeshBasicMaterial({visible:false}),station.x,1.03,.20,2.35,1.8,.85);
  hit.userData.station=placard.panel.userData.station=station.id;
  return {hit,panel:placard.panel};
 });
 return {shopSign,targets:boards.flatMap(board=>[board.panel,board.hit])};
}

const skin=['#a67856','#e7b388','#79513d','#b88764','#d4956b','#edba96'];
const tops=['#587e8f','#ae715c','#5c8c73','#83759d','#c29252','#be6568','#4d8290','#8a835e','#547b6b','#b9665d'];
function patron(scene,style){
 const root=new THREE.Group();scene.add(root);
 const shade=skin[style%skin.length],top=tops[style],hair=style%3===0?'#322b2c':style%3===1?'#4e352d':'#724b36';
 drum(root,'#cad4bf',0,.006,0,.36,.012);
 const legs=[],arms=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.126,.69,0);root.add(leg);legs.push(leg);
  box(leg,'#445867',0,-.28,0,.22,.58,.22);
  ball(leg,'#ece5cf',0,-.57,.064,.124,.08,.19);
  const arm=new THREE.Group();arm.position.set(side*.327,1.26,0);root.add(arm);arms.push(arm);
  ball(arm,top,0,-.13,0,.115,.20,.12);
  ball(arm,shade,0,-.33,.006,.077,.148,.08);
  ball(arm,shade,0,-.45,.027,.078,.074,.082);
 }
 ball(root,top,0,1.025,0,.328,.397,.201);
 box(root,'#dbe0cd',.11,1.12,.184,.14,.11,.028);
 drum(root,shade,0,1.40,0,.089,.18);
 ball(root,shade,0,1.62,0,.215,.238,.193);
 ball(root,hair,0,1.745,-.042,.22,.143,.192);
 for(const side of [-1,1]){
  ball(root,shade,side*.210,1.61,0,.052,.071,.055);
  ball(root,'#243638',side*.067,1.644,.179,.023,.036,.018);
  ball(root,'#ffefcb',side*.067-.006,1.656,.193,.005,.008,.004);
 }
 ball(root,shade,0,1.583,.192,.035,.029,.034);
 ball(root,'#674238',0,1.535,.174,.060,.018,.028);
 if(style%4===0){
  ball(root,top,0,1.773,-.01,.237,.104,.214);
  box(root,top,0,1.73,.138,.31,.027,.24);
 }
 return {root,legs,arms};
}

function preparedFood(root,meal,draft){
 root.clear();
 if(!meal||!draft?.parts.length)return;
 drum(root,'#f6dfb6',0,.02,0,.35,.033);
 if(meal.shape==='fries'||meal.shape==='pieces'){
  for(let i=0;i<9;i++){
   const x=((i*7)%11-5)*.046,z=((i*13)%9-4)*.045;
   if(meal.shape==='fries')box(root,'#edb855',x,.09+(i%3)*.02,z,.09,.06,.21).rotation.y=i*.9;
   else ball(root,'#c88847',x,.10+(i%3)*.013,z,.09,.053,.074);
  }
  return;
 }
 if(meal.shape==='pizza'){
  drum(root,'#d5a45e',0,.08,0,.29,.075);
  if(draft.parts.includes('marinara'))drum(root,'#b85c43',0,.126,0,.265,.033);
  if(draft.parts.some(part=>part==='mozz'||part==='cheese'))drum(root,'#f7d992',0,.153,0,.249,.035);
  if(draft.parts.includes('pepperoni'))for(let i=0;i<6;i++)drum(root,'#b85645',Math.sin(i*1.06)*.157,.178,Math.cos(i*1.06)*.157,.048,.019);
  return;
 }
 draft.parts.forEach((part,index)=>{
  const color=INGREDIENTS[part].color,h=.042+index*.025;
  const wide=['sub','wrap','taco'].includes(meal.shape);
  if(wide)box(root,color,0,h,0,.52,.061,.21);
  else drum(root,color,0,h,0,.255-index*.004,.043);
 });
}

export function kitchen(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.04;
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#e8e3d2');
 scene.add(new THREE.HemisphereLight('#fff5dd','#8ca7a3',1.95));
 const sun=new THREE.DirectionalLight('#fff1d8',2.1);
 sun.position.set(-6,7,4);scene.add(sun);
 const interior=new THREE.DirectionalLight('#e7f4e9',.72);
 interior.position.set(4,4,-6);scene.add(interior);
 const camera=new THREE.PerspectiveCamera(60,1,.05,39);
 const shopColor=new THREE.MeshStandardMaterial({color:'#699985',roughness:.74});
 const {targets,shopSign}=diningRoom(scene,shopColor);
 const display=new THREE.Group();
 display.position.set(3.80,1.20,-.10);scene.add(display);
 const bag=new THREE.Group();
 bag.position.set(.82,1.09,.19);
 box(bag,'#c79c61',0,.18,0,.39,.36,.25);
 box(bag,'#dbb580',0,.355,0,.389,.03,.14);
 scene.add(bag);
 const ray=new THREE.Raycaster(),cursor=new THREE.Vector2(),target=new THREE.Vector3();
 const guests=new Map();
 let current=null,lastFood=null;
 return {
  shop(restaurant){
   shopColor.color.set(restaurant.color);
   shopSign.update(restaurant.name,restaurant.color,'#fff8e4',80);
  },
  food(meal,draft){
   const key=JSON.stringify([meal?.name,draft?.parts,draft?.heat]);
   if(key===lastFood)return;
   lastFood=key;preparedFood(display,meal,draft);
  },
  resize(){
   const {clientWidth:w,clientHeight:h}=canvas;
   if(!w||!h)return;
   renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  },
  draw(position,yaw,pitch,guest,seconds,phase,packed){
   camera.position.set(position.x,1.67,position.z);
   target.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).add(camera.position);
   camera.lookAt(target);
   if(current?.style!==guest.style){
    if(current)current.model.root.visible=false;
    if(!guests.has(guest.style))guests.set(guest.style,patron(scene,guest.style));
    current={style:guest.style,model:guests.get(guest.style)};
   }
   const {root,legs,arms}=current.model;
   const walk=Math.min(1,seconds/1.7);
   root.visible=phase!=='finished';
   root.position.set(Math.sin(guest.style)*.18+.64*walk,0,5.60-walk*4.10);
   root.rotation.y=Math.PI+.18;
   const pace=(walk<1?Math.sin(seconds*16):0)*.48;
   legs.forEach((leg,i)=>leg.rotation.x=pace*(i?-1:1));
   arms.forEach((arm,i)=>arm.rotation.x=-pace*(i?-1:1));
   if(phase==='feedback')arms[1].rotation.x=-.48+Math.sin(seconds*4)*.12;
   bag.visible=packed||phase==='feedback';
   renderer.render(scene,camera);
  },
  pick(clientX,clientY){
   const rect=canvas.getBoundingClientRect();
   cursor.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);
   ray.setFromCamera(cursor,camera);
   return ray.intersectObjects(targets,false)[0]?.object.userData.station;
  }
 };
}
