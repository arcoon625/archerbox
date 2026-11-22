import * as THREE from '../../vendor/three.module.js';
import {WIDTH,HEIGHT,PLACES} from './town.js?v=eyeview1';

const scale=.055;
const unitCube=new THREE.BoxGeometry();
const unitDisk=new THREE.CylinderGeometry(1,1,1,24);
const leafGeometry=new THREE.IcosahedronGeometry(1,1);
const materials=new Map();
function paint(color){
 if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));
 return materials.get(color);
}
function cube(parent,color,x,y,z,w,h,d){
 const shape=new THREE.Mesh(unitCube,typeof color==='string'?paint(color):color);
 shape.position.set(x,y,z);shape.scale.set(w,h,d);parent.add(shape);return shape;
}
function disk(parent,color,x,y,z,radius,height){
 const shape=new THREE.Mesh(unitDisk,paint(color));
 shape.position.set(x,y,z);shape.scale.set(radius,height,radius);parent.add(shape);return shape;
}
function leaves(parent,color,x,y,z,w,h,d){
 const shape=new THREE.Mesh(leafGeometry,paint(color));
 shape.position.set(x,y,z);shape.scale.set(w,h,d);parent.add(shape);
}
function sign(parent,text,x,y,z,w,h,bg,ink,size=76){
 const canvas=document.createElement('canvas');
 canvas.height=128;canvas.width=Math.round(canvas.height*w/h);
 const ctx=canvas.getContext('2d');
 ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.strokeStyle='#ffffff38';ctx.lineWidth=4;ctx.strokeRect(10,10,canvas.width-20,108);
 ctx.font=`850 ${size}px system-ui, sans-serif`;
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=ink;
 ctx.fillText(text,canvas.width/2,64,canvas.width-36);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=4;
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));
 panel.position.set(x,y,z);
 parent.add(panel);
 return panel;
}

function planter(parent,x,z,seed){
 const colors=['#69956d','#4f8268','#7da56f'];
 disk(parent,'#b48b6c',x,.18,z,.40,.35);
 disk(parent,'#e8ba91',x,.34,z,.44,.08);
 for(let i=0;i<3;i++){
  const angle=seed+i*2.1;
  leaves(parent,colors[i],x+Math.sin(angle)*.19,.53+i*.07,z+Math.cos(angle)*.18,.30,.25,.27);
 }
}
function streetTree(parent,x,z,seed){
 disk(parent,'#bcaf8b',x,.025,z,.76,.05);
 disk(parent,'#8f7359',x,.88,z,.12,1.7);
 leaves(parent,'#5b8969',x-.32,2.02,z,1.03,1.12,.95);
 leaves(parent,'#739f72',x+.42,2.25,z-.14,.98,1.18,.94);
 leaves(parent,'#88aa6d',x+.02,2.64+seed*.13,z+.13,.90,.95,.85);
}
function patioTable(parent,x,z,color){
 disk(parent,'#6c6e63',x,.35,z,.055,.68);
 disk(parent,color,x,.70,z,.51,.10);
 for(const side of [-1,1]){
  disk(parent,'#8f7766',x+side*.69,.23,z,.23,.42);
  disk(parent,'#e5c6a0',x+side*.69,.46,z,.24,.08);
 }
}
function shop(scene,place,index){
 const group=new THREE.Group();
 const w=place.bounds.w*scale,d=place.bounds.h*scale,front=d/2,height=3.50+(index%3)*.13;
 group.position.set(place.x*scale,0,(place.bounds.y+place.bounds.h/2)*scale);
 group.rotation.y=place.top?0:Math.PI;
 scene.add(group);
 const walls=cube(group,'#ead8b9',0,height/2,0,w,height,d);
 cube(group,place.color,0,.45,0,w+.04,.90,d+.045);
 cube(group,'#eee5cf',0,1.0,0,w+.07,.19,d+.065);
 cube(group,'#324952',0,height+.06,0,w+.25,.26,d+.24);
 cube(group,place.color,0,height+.23,front-.06,w+.15,.27,.27);
 cube(group,'#f0e1bd',0,height+.38,front-.06,w+.19,.08,.31);
 for(const end of [-1,1]){
  cube(group,place.color,end*(w/2-.06),height/2,front+.03,.25,height,.10);
  cube(group,'#767d69',end*(w/2+.08),height+.22,0,.25,.33,d+.12);
 }
 const frame='#2a444f',glass='#527f84',shine='#92b7b1';
 for(const x of [-3.65,-2.13,2.13,3.65]){
  cube(group,frame,x,1.75,front+.025,1.48,1.39,.11);
  cube(group,glass,x,1.77,front+.09,1.32,1.18,.025);
  cube(group,shine,x-.25,2.13,front+.108,.76,.07,.021);
  cube(group,frame,x,1.72,front+.115,.052,1.15,.027);
  cube(group,'#f4e7c9',x,1.02,front+.15,1.52,.13,.29);
 }
 cube(group,frame,0,1.12,front+.055,1.65,2.24,.13);
 for(const side of [-1,1]){
  cube(group,'#668e8b',side*.39,1.18,front+.13,.70,1.89,.028);
  cube(group,'#f8dab0',side*.14,.99,front+.17,.07,.25,.045);
 }
 cube(group,place.trim,0,.081,front+.50,1.65,.025,.50);
 for(let i=0;i<14;i++){
  const canopy=cube(group,i%2?place.trim:place.color,(i-6.5)*.65,2.55,front+.32,.65,.13,.71);
  canopy.rotation.x=.16;
  cube(group,i%2?place.trim:place.color,(i-6.5)*.65,2.42,front+.63,.65,.16,.08);
 }
 cube(group,'#233c45',0,3.10,front+.08,6.01,.77,.21);
 const shopSign=sign(group,place.name,0,3.10,front+.197,5.82,.72,'#27434c','#fff5de',76);
 const badgeColor=place.color;
 cube(group,'#426065',0,height+.68,front-.63,.13,.54,.13);
 cube(group,badgeColor,0,height+.98,front-.63,1.24,1.12,.14);
 const badge=sign(group,place.icon,0,height+.98,front-.55,1.21,1.10,badgeColor,'#fff5de',92);
 return {place,targets:[walls,shopSign,badge]};
}

function plaza(scene){
 const frontage=WIDTH*scale,depth=HEIGHT*scale;
 cube(scene,'#8cad80',frontage/2,-.14,depth/2,frontage+20,.26,depth+19);
 cube(scene,'#60808c',frontage/2,.006,346*scale,frontage+15,.021,94*scale);
 for(const edge of [291,401])cube(scene,'#ded3b4',frontage/2,.035,edge*scale,frontage+8,.068,16*scale);
 for(const center of [177,516]){
  cube(scene,'#e3d2b3',frontage/2,.021,center*scale,1010*scale,.072,185*scale);
  for(let x=55;x<=1040;x+=24)cube(scene,'#cbbd9e',x*scale,.061,(center<300?255:435)*scale,.045,.007,1.6);
 }
 for(let x=0;x<=WIDTH;x+=50)cube(scene,'#f4cc7a',x*scale,.022,346*scale,1.45,.008,.105);
 for(const crossing of [44,539,1038]){
  for(let z=302;z<392;z+=14)cube(scene,'#f4eee0',crossing*scale,.024,z*scale,1.61,.01,.30);
 }
 for(const [index,x] of [72,272,535,798,1003].entries()){
  streetTree(scene,x*scale,68*scale,index%3);
  streetTree(scene,(x+15)*scale,618*scale,index%2);
 }
 for(const x of [25,290,790,1050]){
  for(const z of [292,400]){
   const px=x*scale,pz=z*scale;
   disk(scene,'#53686a',px,1.39,pz,.052,2.68);
   cube(scene,'#53686a',px,2.74,pz+.17,.088,.10,.46);
   cube(scene,'#f1e8c4',px,2.70,pz+.35,.20,.08,.19);
  }
 }
 for(const place of PLACES){
  const z=place.door.y*scale;
  patioTable(scene,(place.x-62)*scale,z,place.trim);
  planter(scene,(place.x+68)*scale,z,place.x);
 }
 for(let i=0;i<15;i++){
  const position=i*4.8-6;
  const height=1.1+(i*7%8)*.54;
  for(const edge of [-4,40])cube(scene,i%2?'#91aead':'#aabbbb',position,height/2,edge,3.1,height,2.6);
 }
}

export function streetView(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.05;
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#b6dce6');
 scene.fog=new THREE.Fog('#b6dce6',26,76);
 scene.add(new THREE.HemisphereLight('#fff2dc','#82a4a2',2.05));
 const sun=new THREE.DirectionalLight('#fff1d1',2.5);
 sun.position.set(-12,15,6);
 scene.add(sun);
 const camera=new THREE.PerspectiveCamera(56,1,.06,92);
 plaza(scene);
 const shops=PLACES.map((place,index)=>shop(scene,place,index));
 const targets=shops.flatMap(({place,targets})=>targets.map(target=>{target.userData.place=place;return target;}));
 const ray=new THREE.Raycaster();
 const cursor=new THREE.Vector2();
 const crumbs=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.13,.036,10),new THREE.MeshBasicMaterial({color:'#ffd26c'}),120);
 const matrix=new THREE.Matrix4();
 crumbs.count=0;
 crumbs.frustumCulled=false;
 scene.add(crumbs);
 let drawn=null;
 return {
  resize(){
   const {clientWidth:w,clientHeight:h}=canvas;
   if(!w||!h)return;
   renderer.setSize(w,h,false);
   camera.aspect=w/h;camera.updateProjectionMatrix();
   drawn=null;
  },
  draw(position,yaw,pitch,steps){
   if(drawn&&drawn.x===position.x&&drawn.y===position.y&&drawn.yaw===yaw&&drawn.pitch===pitch&&drawn.steps===steps&&drawn.count===steps.length)return;
   drawn={x:position.x,y:position.y,yaw,pitch,steps,count:steps.length};
   const direction=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
   camera.position.set(position.x*scale,1.66,position.y*scale);
   camera.lookAt(camera.position.clone().add(direction));
   crumbs.count=Math.min(steps.length,120);
   for(let i=0;i<crumbs.count;i++)crumbs.setMatrixAt(i,matrix.makeTranslation(steps[i].x*scale,.087,steps[i].y*scale));
   crumbs.instanceMatrix.needsUpdate=true;
   renderer.render(scene,camera);
  },
  pick(clientX,clientY){
   const rect=canvas.getBoundingClientRect();
   cursor.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);
   ray.setFromCamera(cursor,camera);
   return ray.intersectObjects(targets,false)[0]?.object.userData.place;
  }
 };
}
