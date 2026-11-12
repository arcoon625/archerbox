import * as THREE from '../../vendor/three.module.js';
import {karts} from './race.js?v=easy1';

// Rounded panels, tubular chassis and working wheel assemblies, all original geometry.
function roundedPanel(w,h,d,r=.08){
 const shape=new THREE.Shape(),x=-w/2,z=-d/2;r=Math.min(r,w/2,d/2);
 shape.moveTo(x+r,z);shape.lineTo(x+w-r,z);shape.quadraticCurveTo(x+w,z,x+w,z+r);shape.lineTo(x+w,z+d-r);shape.quadraticCurveTo(x+w,z+d,x+w-r,z+d);shape.lineTo(x+r,z+d);shape.quadraticCurveTo(x,z+d,x,z+d-r);shape.lineTo(x,z+r);shape.quadraticCurveTo(x,z,x+r,z);
 const g=new THREE.ExtrudeGeometry(shape,{depth:h*.55,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:Math.min(.045,h*.2),bevelThickness:h*.22,curveSegments:5});g.rotateX(Math.PI/2);g.computeBoundingBox();g.translate(0,-(g.boundingBox.min.y+g.boundingBox.max.y)/2,0);return g;
}
export function buildKart(index,colorOverride){
 const config=karts[index],root=new THREE.Group(),wheels=[],front=[],color=colorOverride??config.color;
 const paint=new THREE.MeshPhysicalMaterial({color,metalness:.4,roughness:.26,clearcoat:1,clearcoatRoughness:.15}),dark=new THREE.MeshStandardMaterial({color:0x171c23,metalness:.72,roughness:.32}),rubber=new THREE.MeshStandardMaterial({color:0x101114,roughness:.96}),metal=new THREE.MeshStandardMaterial({color:0xaab6c3,metalness:.92,roughness:.24}),seat=new THREE.MeshStandardMaterial({color:0x20272f,roughness:.92}),accent=new THREE.MeshStandardMaterial({color:0xf1f0e9,metalness:.25,roughness:.35}),engineMat=new THREE.MeshStandardMaterial({color:0x555d64,metalness:.8,roughness:.5});
 const mesh=(geo,x,y,z,mat=paint,parent=root)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
 const box=(x,y,z,w,h,d,mat=paint,parent=root)=>mesh(new THREE.BoxGeometry(w,h,d),x,y,z,mat,parent);
 const panel=(x,y,z,w,h,d,mat=paint)=>mesh(roundedPanel(w,h,d),x,y,z,mat);
 const tube=(a,b,r=.035,mat=metal,parent=root)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=mesh(new THREE.CylinderGeometry(r,r,delta.length(),10),0,0,0,mat,parent);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m};
 const width=config.style==='wide'?1.6:config.style==='compact'?1.15:1.35,length=config.style==='arrow'?2.5:2.1;
 const axle=width*.66;
 // Exposed welded frame and front steering linkages.
 panel(0,.3,0,width*.75,.09,length,dark);
 for(const side of [-1,1]){const x=side*width*.43;tube([x,.32,-1.03],[x,.32,1.08],.055,dark);tube([x,.32,-1.03],[side*width*.56,.32,-1.25],.045,dark);tube([side*width*.56,.32,-1.25],[-side*width*.56,.32,-1.25],.045,dark);tube([x,.32,.8],[side*axle,.37,.78],.04,metal);tube([x,.32,-.7],[side*axle,.37,-.76],.04,metal);tube([x,.42,-.28],[side*axle,.37,-.76],.025,metal)}
 tube([-axle,.37,.78],[axle,.37,.78],.045,metal);
 panel(0,.48,-length/2-.04,width*1.3,.22,.43);panel(0,.61,-.54,width*.58,.19,1.03);panel(0,.72,-.84,width*.5,.1,.64);
 for(const side of [-1,1]){panel(side*width*.57,.48,.13,.34,.29,1.12);panel(side*width*.58,.49,.09,.345,.035,.66,accent);tube([side*width*.73,.27,-.58],[side*width*.73,.27,.69],.055,dark)}
 // Twin contrasting paint stripes and hardware on the nose.
 for(const x of [-width*.12,width*.12])panel(x,.777,-.79,.08,.009,.63,accent);
 for(const x of [-width*.43,width*.43])for(const z of [-length/2-.18,-length/2+.12])mesh(new THREE.SphereGeometry(.022,8,6),x,.602,z,metal);
 const splitter=panel(0,.32,-length/2-.09,width*1.38,.07,.48,dark);
 // Bucket seat with curved side bolsters, upholstery seams and a harness.
 panel(0,.57,.24,.59,.14,.65,seat);const back=panel(0,.84,.58,.63,.57,.13,seat);back.rotation.x=.15;
 for(const side of [-1,1]){panel(side*.27,.71,.26,.1,.25,.51,seat);box(side*.11,.92,.49,.055,.35,.023,dark);box(side*.2,.645,.16,.023,.008,.36,accent)}
 // Compact rear engine: fins, intake, hoses, starter and exhaust.
 box(.4,.58,.8,.4,.34,.42,engineMat);for(let i=0;i<7;i++)box(.4,.43+i*.048,.8,.47,.018,.47,dark);
 mesh(new THREE.SphereGeometry(.115,12,8),.46,.93,.86,dark).scale.set(1,.65,1.6);tube([.38,.74,.9],[.38,.92,.85],.055,metal);
 const starter=mesh(new THREE.CylinderGeometry(.16,.16,.13,20),.68,.6,.82,dark);starter.rotation.z=Math.PI/2;
 const tank=panel(-.37,.59,.76,.34,.27,.42,accent);mesh(new THREE.CylinderGeometry(.048,.048,.025,12),-.37,.745,.76,dark);
 tube([.41,.52,1.0],[.41,.5,1.23],.07,metal);tube([.41,.5,1.23],[.0,.5,1.23],.07,metal);const muffler=mesh(new THREE.CylinderGeometry(.11,.11,.54,20),-.16,.5,1.23,engineMat);muffler.rotation.z=Math.PI/2;
 for(const x of [-.42,.42]){tube([x,.4,.84],[x,.5,1.22],.035,dark);const exhaust=mesh(new THREE.CylinderGeometry(.074,.074,.26,16),x,.5,1.24,metal);exhaust.rotation.x=Math.PI/2;mesh(new THREE.CylinderGeometry(.052,.052,.008,16),x,.5,1.376,dark).rotation.x=Math.PI/2}
 // Driver with a helmet shell, front visor, gloves, bent legs and shoulder pads.
 const suit=new THREE.MeshStandardMaterial({color,roughness:.82}),gloves=new THREE.MeshStandardMaterial({color:0x252d33,roughness:.82});
 mesh(new THREE.SphereGeometry(.285,24,18),0,1.5,.19,new THREE.MeshPhysicalMaterial({color:0xe9edf0,metalness:.12,roughness:.28,clearcoat:1}));
 const visor=mesh(new THREE.SphereGeometry(.289,24,12,Math.PI*1.2,Math.PI*.6,Math.PI*.35,Math.PI*.3),0,1.5,.19,new THREE.MeshPhysicalMaterial({color:0x152f43,metalness:.6,roughness:.1,clearcoat:1}));
 for(const side of [-1,1])mesh(new THREE.CylinderGeometry(.055,.055,.012,12),side*.267,1.48,.09,dark).rotation.z=Math.PI/2;
 panel(0,1.1,.25,.46,.39,.33,suit);for(const side of [-1,1]){mesh(new THREE.SphereGeometry(.13,12,10),side*.23,1.22,.23,suit);tube([side*.24,1.2,.19],[side*.28,1.08,-.04],.075,suit);tube([side*.28,1.08,-.04],[side*.18,1.02,-.24],.07,suit);mesh(new THREE.SphereGeometry(.09,12,8),side*.18,1.02,-.24,gloves);tube([side*.14,.7,.18],[side*.23,.67,-.23],.09,suit);tube([side*.23,.67,-.23],[side*.22,.4,-.68],.07,suit);panel(side*.22,.37,-.69,.17,.12,.3,gloves)}
 tube([0,.45,-.53],[0,.95,-.23],.025,metal);const steering=mesh(new THREE.TorusGeometry(.215,.025,10,28),0,1.0,-.25,gloves);steering.rotation.x=-.65;
 for(const side of [-1,1])tube([0,.97,-.24],[side*.19,1.0,-.25],.016,metal);
 // Slick racing tires with rounded shoulders, sidewall rings, machined rims and drilled discs.
 const tireGeo=new THREE.LatheGeometry([new THREE.Vector2(.18,-.165),new THREE.Vector2(.3,-.165),new THREE.Vector2(.35,-.145),new THREE.Vector2(.37,-.11),new THREE.Vector2(.37,.11),new THREE.Vector2(.35,.145),new THREE.Vector2(.3,.165),new THREE.Vector2(.18,.165)],32);tireGeo.rotateZ(Math.PI/2);
 const discGeo=new THREE.CylinderGeometry(.175,.175,.016,24);discGeo.rotateZ(Math.PI/2);
 for(const x of [-axle,axle])for(const z of [-.76,.78]){
  const hub=new THREE.Group();hub.position.set(x,.37,z);root.add(hub);mesh(tireGeo,0,0,0,rubber,hub);
  for(const side of [-1,1]){const rim=mesh(new THREE.TorusGeometry(.2,.035,8,24),side*.16,0,0,metal,hub);rim.rotation.y=Math.PI/2;const sidewall=mesh(new THREE.TorusGeometry(.315,.008,6,32),side*.163,0,0,dark,hub);sidewall.rotation.y=Math.PI/2;const bead=mesh(new THREE.TorusGeometry(.355,.005,5,32),side*.13,0,0,rubber,hub);bead.rotation.y=Math.PI/2;mesh(discGeo,side*.126,0,0,engineMat,hub);const cap=mesh(new THREE.CylinderGeometry(.07,.07,.02,12),side*.18,0,0,metal,hub);cap.rotation.z=Math.PI/2;
   for(let a=0;a<Math.PI*2;a+=Math.PI/3){const spoke=box(side*.16,Math.sin(a)*.118,Math.cos(a)*.118,.035,.05,.14,metal,hub);spoke.rotation.x=-a;mesh(new THREE.SphereGeometry(.014,8,6),side*.19,Math.sin(a)*.045,Math.cos(a)*.045,dark,hub)}
   for(let a=0;a<Math.PI*2;a+=Math.PI/8)mesh(new THREE.SphereGeometry(.014,6,5),side*.137,Math.sin(a)*.14,Math.cos(a)*.14,dark,hub);
  }
  wheels.push(hub);if(z<0)front.push(hub);
 }
 if(config.style==='arrow'||config.style==='sport'){for(const x of [-.43,.43])tube([x,.38,1.02],[x,.95,1.05],.025,dark);const wing=panel(0,.97,1.07,width+.18,.08,.3);wing.rotation.x=.09;for(const side of [-1,1])panel(side*(width/2+.08),1.015,1.07,.045,.15,.37,dark)}
 if(config.style==='wide'){panel(0,.4,1.26,width*1.2,.15,.15,dark);for(const x of [-.55,.55])panel(x,.63,-1.29,.22,.06,.16,accent)}
 const glow=new THREE.MeshBasicMaterial({color:0x76f3ff,transparent:true,opacity:.75}),flames=[];for(const x of [-.42,.42]){const flame=mesh(new THREE.ConeGeometry(.1,.6,12),x,.5,1.65,glow);flame.rotation.x=Math.PI/2;flame.visible=false;flames.push(flame)}
 // Merge static surfaces by material while keeping wheel and boost animation separate.
 const oldGeometry=new Set();
 for(const parent of [root,...wheels]){
  const batches=new Map();for(const o of [...parent.children])if(o.isMesh&&!flames.includes(o)){o.updateMatrix();const key=o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o)}
  for(const group of batches.values()){
   const parts=group.map(o=>{oldGeometry.add(o.geometry);const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);return g}),merged=new THREE.BufferGeometry();
   for(const [name,size]of [['position',3],['normal',3],['uv',2]]){const length=parts.reduce((n,g)=>n+g.attributes[name].array.length,0),data=new Float32Array(length);let offset=0;for(const g of parts){data.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length}merged.setAttribute(name,new THREE.BufferAttribute(data,size))}
   parts.forEach(g=>g.dispose());group.forEach(o=>parent.remove(o));mesh(merged,0,0,0,group[0].material,parent);
  }
 }
 oldGeometry.forEach(g=>g.dispose());
 root.userData={wheels,front,flames};return root;
}
export function dispose(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap)}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose())}
