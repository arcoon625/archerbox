import * as T from '../../vendor/three.module.js';
import {TREES,ROCKS,CANS,BERRIES,bearDanger,SHOP,CHEST,MOUNTAINS,groundHeight,chestCount,canHike,seeded,wallsUp} from './rules.js?v=wildlife1';
import {surface,needleTexture,organicPineGeometry,grassGeometry,makeAnimal,animateAnimal} from './nature.js?v=wildlife1';
const mat=(color,roughness=1,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
const wood=mat(0x705039),bark=mat(0x473c2b),dark=mat(0x1c2928),metal=mat(0x375849,.65,{metalness:.5}),steel=mat(0x9ca7a3,.4,{metalness:.75}),cream=mat(0xe4d9b9);
function mesh(parent,geo,material,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
const box=(p,m,w,h,d,x=0,y=0,z=0)=>mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
function ellipsoid(p,m,s,x,y,z){const o=mesh(p,new T.SphereGeometry(1,20,14),m,x,y,z);o.scale.set(...s);return o;}
function cylinder(p,m,r1,r2,h,x,y,z,sides=12){return mesh(p,new T.CylinderGeometry(r1,r2,h,sides),m,x,y,z);}
function line(p,a,b,r,m){const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),o=cylinder(p,m,r,r,delta.length(),...(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5).toArray()));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
function label(text,width=512,height=128,bg='#263c30',fg='#f5ebcb'){
 const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,width,height);x.strokeStyle='#cab88b';x.lineWidth=5;x.strokeRect(7,7,width-14,height-14);x.fillStyle=fg;x.font='bold '+Math.round(height*.38)+'px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,width/2,height/2,width-35);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
function sign(parent,text,w,h,x,y,z){const material=new T.MeshStandardMaterial({map:label(text),roughness:.9});return mesh(parent,new T.PlaneGeometry(w,h),material,x,y,z);}
function batch(parent,geometry,material,items){const m=new T.InstancedMesh(geometry,material,items.length),o=new T.Object3D();items.forEach((a,i)=>{o.position.set(a.x||0,a.y||0,a.z||0);o.scale.set(a.sx||1,a.sy||1,a.sz||1);o.rotation.set(a.rx||0,a.ry||0,a.rz||0);o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function makeBear(){
 const root=new T.Group(),fur=mat(0x513929),shoulder=mat(0x604431),muzzle=mat(0x947454),nose=mat(0x161715,.42),black=mat(0x151714,.6),claw=mat(0xc4b397);
 const furMap=surface('fur',441);if(furMap){furMap.repeat.set(3,2);for(const m of [fur,shoulder,muzzle]){m.map=furMap;m.bumpMap=furMap;m.bumpScale=.045;m.roughness=1;}}
 const body=new T.Group();root.add(body);
 ellipsoid(body,fur,[.77,.85,1.25],0,1.25,.2);ellipsoid(body,shoulder,[.86,1.04,.82],0,1.45,-.55);ellipsoid(body,fur,[.75,.73,.78],0,1.22,1.03);
 const head=new T.Group();head.position.set(0,1.63,-1.23);body.add(head);
 ellipsoid(head,fur,[.53,.47,.65],0,0,0);ellipsoid(head,muzzle,[.30,.23,.53],0,-.17,-.48);ellipsoid(head,nose,[.17,.115,.11],0,-.11,-.98);
 line(head,[-.24,-.29,-.72],[.24,-.29,-.72],.018,black);
 const eyes=[];
 for(const side of [-1,1]){
  ellipsoid(head,fur,[.17,.19,.12],side*.38,.37,.04);ellipsoid(head,muzzle,[.09,.12,.04],side*.38,.39,-.067);
  const eye=ellipsoid(head,mat(0x50351e,.3,{emissive:0xba7628,emissiveIntensity:.08}),[.047,.044,.028],side*.38,.045,-.48);eyes.push(eye);
  ellipsoid(head,nose,[.025,.029,.012],side*.38,.045,-.508);ellipsoid(head,cream,[.009,.008,.007],side*.367,.064,-.519);
 }
 const legs=[];
 for(const front of [true,false])for(const side of [-1,1]){
  const joint=new T.Group();joint.position.set(side*.56,1.23,front?-.65:1);body.add(joint);
  ellipsoid(joint,fur,[.29,.62,.31],0,-.33,0);ellipsoid(joint,fur,[.25,.41,.27],0,-.8,-.03);ellipsoid(joint,fur,[.31,.19,.42],0,-1.05,-.17);
  for(let toe=0;toe<5;toe++){const x=(toe-2)*.105;ellipsoid(joint,fur,[.078,.105,.16],x,-1.09,-.43);const c=mesh(joint,new T.ConeGeometry(.032,.16,6),claw,x,-1.08,-.61);c.rotation.x=-Math.PI/2-.15;}
  legs.push({root:joint,phase:(front?0:Math.PI)+(side===1?Math.PI:0)});
 }
 ellipsoid(body,fur,[.2,.21,.27],0,1.35,1.87);
 const random=seeded(441),tufts=[];
 for(let i=0;i<500;i++){const a=random()*Math.PI*2,v=(random()-.5)*1.7,rr=Math.sqrt(1-v*v*.25);tufts.push({x:Math.cos(a)*.77*rr,y:1.25+v*.7,z:.2+Math.sin(a)*1.34*rr,sx:.025+random()*.025,sy:.07+random()*.09,sz:.025,rx:Math.sin(a)*.5,rz:-Math.cos(a)*.65});}
 batch(body,new T.ConeGeometry(1,1,4),mat(0x624733),tufts);
 root.userData={body,head,legs,eyes};return root;
}
export function animateBear(root,b,time){
 root.position.set(b.x,groundHeight(b.x,b.z),b.z);root.rotation.y=b.yaw;const data=root.userData,moving=['chase','search','prowl'].includes(b.mode),phase=b.walk*4.1;
 data.body.position.y=moving?Math.cos(phase*2)*.035:Math.sin(time*2)*.018;
 data.legs.forEach(l=>l.root.rotation.x=moving?Math.sin(phase+l.phase)*.48:0);
 data.head.rotation.y=b.mode==='search'?Math.sin(time*1.5)*.23:0;data.head.rotation.z=b.mode==='stunned'?Math.sin(time*7)*.08:0;
 data.eyes.forEach(e=>e.material.emissiveIntensity=b.mode==='chase'?.12:.02);
}
export function makeWeapon(id){
 const root=new T.Group(),grip=mat(0x29322c),orange=mat(0xdc6f34,.6),string=mat(0xb3a783),rubber=mat(0x181c1a),lightWood=mat(0xb18b55);
 if(id==='hunting-rifle'){
  const walnut=mat(0x64442d,.75),gunmetal=mat(0x303532,.45,{metalness:.8});box(root,walnut,.13,.16,.85,0,-.03,.05);box(root,gunmetal,.11,.12,.46,0,.08,-.23);const barrel=cylinder(root,gunmetal,.026,.033,.85,0,.09,-.76);barrel.rotation.x=Math.PI/2;box(root,walnut,.13,.29,.12,0,-.2,.2);box(root,walnut,.13,.24,.39,0,-.08,.56);box(root,dark,.14,.28,.04,0,-.08,.77);const scope=cylinder(root,dark,.055,.055,.35,0,.23,-.22);scope.rotation.x=Math.PI/2;for(const z of [-.32,-.12])box(root,gunmetal,.09,.08,.025,0,.16,z);ellipsoid(root,steel,[.028,.028,.028],.14,.1,-.05);line(root,[.05,.12,-.05],[.14,.1,-.05],.015,steel);
 }else if(id==='axe'){
  cylinder(root,lightWood,.045,.065,1.12,0,-.04,0);for(let i=0;i<7;i++)cylinder(root,grip,.065,.065,.035,0,-.49+i*.04,0);
  box(root,steel,.18,.23,.17,0,.42,0);const blade=mesh(root,new T.CylinderGeometry(.29,.29,.065,3),steel,-.22,.43,0);blade.rotation.set(Math.PI/2,0,Math.PI/2);box(root,dark,.11,.2,.15,.13,.42,0);
 }else if(id==='stick'||id==='bat'){
  const shaft=cylinder(root,id==='stick'?wood:lightWood,id==='stick'?.035:.075,id==='stick'?.06:.12,1.1,0,0,0);shaft.rotation.z=-.15;
  for(let i=0;i<9;i++)cylinder(root,grip,.066,.066,.025,.055,-.38+i*.026,0);
  if(id==='stick')line(root,[0,.1,0],[.23,.4,-.02],.035,wood);
 }else if(id==='slingshot'){
  line(root,[0,-.38,0],[0,.03,0],.06,lightWood);line(root,[0,0,0],[-.2,.36,0],.045,lightWood);line(root,[0,0,0],[.2,.36,0],.045,lightWood);line(root,[-.2,.36,0],[0,.18,.18],.012,rubber);line(root,[.2,.36,0],[0,.18,.18],.012,rubber);ellipsoid(root,steel,[.05,.05,.05],0,.18,.18);
 }else if(id==='crossbow'){
  box(root,wood,.16,.17,.85,0,0,0);box(root,grip,.14,.35,.16,0,-.2,.21);line(root,[-.6,.03,-.32],[-.25,.07,-.5],.045,dark);line(root,[.6,.03,-.32],[.25,.07,-.5],.045,dark);line(root,[-.25,.07,-.5],[.25,.07,-.5],.04,dark);line(root,[-.6,.03,-.32],[0,.06,.18],.008,string);line(root,[.6,.03,-.32],[0,.06,.18],.008,string);line(root,[0,.12,.28],[0,.12,-.64],.014,steel);box(root,orange,.08,.025,.12,0,.14,.24);
 }else if(['trail-pistol','carbine','gold-rifle'].includes(id)){
  const gold=id==='gold-rifle',rifle=id!=='trail-pistol',body=gold?mat(0xd5af43,.32,{metalness:.75}):mat(0x3f5149,.5,{metalness:.5});
  box(root,body,.2,.22,rifle?.65:.4,0,0,-.12);box(root,grip,.15,.35,.17,0,-.23,.02);
  const barrel=cylinder(root,steel,.045,.045,rifle?.5:.25,0,.025,rifle?-.65:-.4);barrel.rotation.x=Math.PI/2;
  if(rifle){box(root,grip,.11,.27,.14,0,-.22,-.23);box(root,body,.15,.13,.4,0,0,.38);box(root,grip,.17,.3,.1,0,-.07,.61);box(root,grip,.18,.15,.29,0,.01,-.4);for(let i=0;i<5;i++)box(root,steel,.21,.025,.025,0,.12,-.36+i*.065);}
  box(root,orange,.05,.045,.03,0,.16,rifle?-.57:-.3);box(root,steel,.1,.04,.1,0,.14,.1);
 }else{
  box(root,id==='flare'?orange:dark,.22,.23,.55);box(root,grip,.16,.37,.19,0,-.25,.11);const tube=cylinder(root,steel,.085,.085,.37,0,0,-.4);tube.rotation.x=Math.PI/2;
  const tip=cylinder(root,id==='flare'?orange:mat(0x82c5bd),.095,.095,.09,0,0,-.62);tip.rotation.x=Math.PI/2;box(root,steel,.035,.08,.06,0,.16,-.17);box(root,orange,.15,.05,.21,0,.15,.06);
 }
 return root;
}
export function makeMountain(m){
 const geometry=new T.PlaneGeometry(m.radius*2,m.radius*2,40,40);geometry.rotateX(-Math.PI/2);const pos=geometry.attributes.position,colors=[];
 const base=new T.Color(m.color),snow=new T.Color(0xd9e3d9),low=new T.Color(0x7c8965);
 for(let i=0;i<pos.count;i++){const x=pos.getX(i)+m.x,z=pos.getZ(i)+m.z,y=groundHeight(x,z);pos.setY(i,y+.012);const c=(y>m.height*.73?base.clone().lerp(snow,(y/m.height-.73)/.27):low.clone().lerp(base,y/m.height));colors.push(c.r,c.g,c.b);}
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();const result=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));result.position.set(m.x,0,m.z);result.receiveShadow=result.castShadow=true;return result;
}
export function makeWorld(scene,camera){
 const root=new T.Group();scene.add(root);const grass=mat(0x748064);
 const barkMap=surface('bark'),stoneMap=surface('stone'),earthMap=surface('dirt');bark.map=bark.bumpMap=barkMap;bark.bumpScale=.09;wood.map=wood.bumpMap=barkMap;wood.bumpScale=.025;
 const rng=seeded(214);grass.map=surface('ground');grass.map.repeat.set(34,34);grass.bumpMap=grass.map;grass.bumpScale=.055;
 const ground=mesh(root,new T.PlaneGeometry(200,200),grass,0,-.03,0);ground.rotation.x=-Math.PI/2;
 const dirt=mat(0xb4a38a,1,{map:earthMap,bumpMap:earthMap,bumpScale:.035});const clearing=mesh(root,new T.CircleGeometry(12.7,64),dirt,0,.002,11);clearing.rotation.x=-Math.PI/2;const trail=box(root,dirt,4,.015,43,0,.005,-9);
 for(const o of [clearing,trail]){o.updateMatrixWorld(true);const pos=o.geometry.attributes.position,uv=o.geometry.attributes.uv,v=new T.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);uv.setXY(i,v.x*.65,v.z*.65);}uv.needsUpdate=true;}
 const peakModels=MOUNTAINS.map((m,index)=>{
  root.add(makeMountain(m));const trailPositions=[],trailIndices=[],segments=100;
  for(let i=0;i<=segments;i++){const t=i/segments,a=(1-t)*Math.PI*3+index*1.6,r=1+(1-t)*(m.radius-.9),x=m.x+Math.cos(a)*r,z=m.z+Math.sin(a)*r,side=new T.Vector2(Math.cos(a),Math.sin(a));for(const sign of [-1,1]){const px=x+side.x*sign*.3,pz=z+side.y*sign*.3;trailPositions.push(px,groundHeight(px,pz)+.035,pz);}if(i<segments){const n=i*2;trailIndices.push(n,n+2,n+1,n+1,n+2,n+3);}}
  const route=new T.BufferGeometry();route.setAttribute('position',new T.Float32BufferAttribute(trailPositions,3));route.setIndex(trailIndices);route.computeVertexNormals();const path=mesh(root,route,mat(0xc0ae86,1,{side:T.DoubleSide}));path.castShadow=false;
  const summit=new T.Group();summit.position.set(m.x,m.height,m.z);root.add(summit);cylinder(summit,wood,.045,.06,2.2,.5,1.1,0);const flag=box(summit,mat(0xddd2a1),.8,.43,.025,.91,1.9,0);
  const gem=mesh(summit,new T.OctahedronGeometry(.35),mat(0x8de2d5,.22,{metalness:.25,emissive:0x2ba49a,emissiveIntensity:.65}),0,.9,0);
  const text=sign(summit,m.name.toUpperCase(),2.1,.5,0,2.8,0);text.material.side=T.DoubleSide;
  const ring=mesh(summit,new T.RingGeometry(.87,1.02,32),new T.MeshBasicMaterial({color:0xd3e4b2,side:T.DoubleSide,transparent:true,opacity:.65}),0,.04,0);ring.rotation.x=-Math.PI/2;
  return {m,gem,flag,text,ring};
 });
 const trunkItems=[],leaves=[[],[],[]];
 for(const t of TREES){trunkItems.push({x:t.x,y:t.size*1.2,z:t.z,sx:t.size*.16,sy:t.size*2.5,sz:t.size*.16});for(let k=0;k<3;k++)leaves[k].push({x:t.x,y:t.size*(1.8+k*.8),z:t.z,sx:t.size*(1.2-k*.18),sy:t.size*2.1,sz:t.size*(1.2-k*.18)});}
 const needles=needleTexture();
 const treeBatches=[batch(root,new T.CylinderGeometry(.7,1,1,7),bark,trunkItems)];for(let k=0;k<3;k++)treeBatches.push(batch(root,organicPineGeometry(),mat([0xa8b79b,0xb4c0a6,0xbcc5ae][k],1,{map:needles,alphaTest:.35,side:T.DoubleSide}),leaves[k]));
 const treeDummy=new T.Object3D();let treeKey='';
 const logModels=TREES.map(t=>{const group=new T.Group();group.position.set(t.x,0,t.z);root.add(group);for(let i=0;i<3;i++){const log=cylinder(group,wood,.14,.14,1.1,(i-1)*.27,.18+i*.04,0);log.rotation.set(Math.PI/2,.4*(i-1),0);const end=cylinder(group,cream,.12,.12,.018,(i-1)*.27,.18+i*.04,-.55);end.rotation.x=Math.PI/2;}const ring=mesh(group,new T.RingGeometry(.8,.87,16),new T.MeshBasicMaterial({color:0xe2bd83,side:T.DoubleSide,transparent:true,opacity:.6}),0,.04,0);ring.rotation.x=-Math.PI/2;group.visible=false;return group;});
 const grassItems=[];for(let i=0;i<650;i++){const x=(rng()-.5)*66,z=(rng()-.5)*66;if(Math.abs(x)<9&&z>1&&z<21||Math.abs(x)<2)continue;grassItems.push({x,y:groundHeight(x,z)+.005,z,sx:.35+rng()*.2,sy:.18+rng()*.24,sz:.35,ry:rng()*6});}batch(root,grassGeometry(),mat(0x7a8756,1,{side:T.DoubleSide}),grassItems);
 for(const r of ROCKS){const m=mesh(root,new T.DodecahedronGeometry(r.r,2),mat(0x82857a,1,{map:stoneMap,bumpMap:stoneMap,bumpScale:.13}),r.x,r.r*.4,r.z);m.scale.y=.65;m.rotation.y=rng()*6;}
 for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=65+rng()*18,m=mesh(root,new T.ConeGeometry(13+rng()*7,19+rng()*20,6),mat(0x627467),Math.cos(a)*r,5,Math.sin(a)*r);m.rotation.y=rng()*6;}
 const walls=new T.Group();root.add(walls);const logs=[],rails=[];
 for(const x of [-8,8]){for(let z=3;z<=19;z+=.48)logs.push({x,y:1.35,z,sx:.22,sy:2.7,sz:.22});for(const y of [.55,1.8])rails.push({x,y,z:11,sx:.19,sy:.16,sz:16.3});}
 for(const z of [3,19]){for(let x=-8;x<=8;x+=.48){if(z===3&&Math.abs(x)<2)continue;logs.push({x,y:1.35,z,sx:.22,sy:2.7,sz:.22});}for(const y of [.55,1.8]){if(z===19)rails.push({x:0,y,z,sx:16.4,sy:.16,sz:.19});else for(const x of [-5,5])rails.push({x,y,z,sx:6,sy:.16,sz:.19});}}
 batch(walls,new T.CylinderGeometry(.85,1,1,7),wood,logs);batch(walls,new T.BoxGeometry(1,1,1),mat(0x4e3928),rails);
 for(const x of [-2,2])cylinder(root,bark,.22,.24,3.7,x,1.85,3);box(root,wood,5,.8,.22,0,3.5,3);sign(root,'PINE HOLLOW',4.4,.55,0,3.51,3.13);const outsideSign=sign(root,'PINE HOLLOW',4.4,.55,0,3.51,2.87);outsideSign.rotation.y=Math.PI;
 const shop=new T.Group();shop.position.set(SHOP.x,0,SHOP.z+1.5);root.add(shop);
 box(shop,wood,4.4,2.5,.24,0,1.25,.6);box(shop,wood,.2,2.5,2.5,-2.1,1.25,-.4);box(shop,wood,.2,2.5,2.5,2.1,1.25,-.4);box(shop,mat(0x626c45),5,.2,3.9,0,2.8,-.45);for(const x of [-2.1,2.1])cylinder(shop,bark,.09,.12,2.8,x,1.4,-2);box(shop,wood,4.4,1,.5,0,.5,-1.3);box(shop,mat(0xa28761),4.7,.12,.9,0,1.07,-1.3);sign(shop,'RANGER SUPPLY',3.5,.56,0,2.36,-1.59);
 for(let i=0;i<9;i++)box(shop,mat(i%2?0x785b40:0x6b5038),.42,2.3,.015,-1.8+i*.45,1.15,.455);
 for(const [i,id] of ['bat','slingshot','crossbow'].entries()){const item=makeWeapon(id);item.scale.setScalar(.66);item.position.set(-1.25+i*1.2,1.7,-.02);item.rotation.z=i===0?.4:0;shop.add(item);}
 const lampMaterial=mat(0xffcc77,.5,{emissive:0xffac40,emissiveIntensity:2});for(const x of [-1.85,1.85])ellipsoid(shop,lampMaterial,[.1,.16,.1],x,2.4,-1.9);
 const fire=new T.Group();fire.position.set(0,0,11);root.add(fire);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ellipsoid(fire,mat(0x6b6d60),[.24,.17,.22],Math.cos(a)*.85,.12,Math.sin(a)*.85);}
 for(const a of [-.8,.8]){const l=cylinder(fire,bark,.12,.15,1.25,0,.18,0);l.rotation.set(Math.PI/2,a,0);}
 const flames=[];for(let i=0;i<5;i++){const f=mesh(fire,new T.ConeGeometry(.19,.7+i*.04,7),new T.MeshBasicMaterial({color:i%2?0xfcbf59:0xf47a35,transparent:true,opacity:.88}),Math.sin(i*2)*.22,.65,Math.cos(i*2)*.22);flames.push(f);}
 const fireLight=new T.PointLight(0xffb55e,20,14,2);fireLight.position.set(0,1.25,11);root.add(fireLight);
 for(const x of [-2.6,2.6]){const bench=new T.Group();bench.position.set(x,0,12);root.add(bench);box(bench,wood,.7,.15,2.1,0,.55,0);for(const z of [-.75,.75])box(bench,bark,.4,.5,.2,0,.25,z);}
 const canModels=CANS.map(c=>{
  const group=new T.Group();group.position.set(c.x,0,c.z);root.add(group);
  cylinder(group,metal,.64,.52,1.36,0,.69,0,24);cylinder(group,dark,.64,.64,.055,0,1.38,0,24);
  const lid=new T.Group();lid.position.set(0,1.42,.55);group.add(lid);cylinder(lid,steel,.69,.69,.09,0,.01,-.55,24);box(lid,dark,.3,.07,.14,0,.09,-.55);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;line(group,[Math.sin(a)*.55,.1,Math.cos(a)*.55],[Math.sin(a)*.63,1.33,Math.cos(a)*.63],.012,steel);}
  for(const side of [-1,1])box(group,steel,.08,.1,.27,side*.67,1.16,0);
  const badge=sign(group,'HIDE',.58,.24,0,.84,.63);badge.material.emissive=new T.Color(0x386842);badge.material.emissiveIntensity=.35;
  const ring=mesh(root,new T.RingGeometry(.87,.94,32),new T.MeshBasicMaterial({color:0xaee1a2,transparent:true,opacity:.55,side:T.DoubleSide}),c.x,.025,c.z);ring.rotation.x=-Math.PI/2;
  return {root:group,lid,ring};
 });
 const animalModels=Array.from({length:9},(_,id)=>{const kind=id<3?'deer':id<6?'rabbit':'sheep',model=makeAnimal(kind);root.add(model);const bag=new T.Group();root.add(bag);const sack=ellipsoid(bag,mat(0xad8d58),[.28,.32,.22],0,.32,0);cylinder(bag,wood,.035,.035,.2,0,.6,0);const tag=sign(bag,'FOOD',.4,.16,0,.38,.215);bag.visible=false;return {model,bag};});
 const berryModels=BERRIES.map(b=>{const group=new T.Group();group.position.set(b.x,groundHeight(b.x,b.z),b.z);root.add(group);const berries=[];for(let i=0;i<5;i++){const a=i*2.4;ellipsoid(group,mat(0x435536),[.4,.42,.35],Math.cos(a)*.25,.37,Math.sin(a)*.25);}for(let i=0;i<15;i++){const a=i*2.4;berries.push(ellipsoid(group,mat(0x82434e,.6),[.045,.045,.045],Math.cos(a)*.55,.35+Math.sin(i*1.4)*.2,Math.sin(a)*.5));}return {group,berries};});
 const grill=new T.Group();grill.position.set(0,0,11);root.add(grill);for(const x of [-.58,.58])line(grill,[x,.1,-.3],[x,1,-.3],.035,steel);line(grill,[-.58,1,-.3],[.58,1,-.3],.035,steel);const pot=cylinder(grill,dark,.35,.28,.24,0,.82,-.3);for(const side of [-1,1])line(grill,[side*.31,.9,-.3],[side*.42,.95,-.3],.025,steel);const meal=ellipsoid(grill,mat(0x9c6337),[.22,.06,.18],0,.96,-.3);
 const bear=makeBear();root.add(bear);
 const scareBear=makeBear();camera.add(scareBear);scareBear.visible=false;scareBear.rotation.y=Math.PI;const scareLight=new T.PointLight(0xffddb0,8,7);scareLight.position.set(0,.5,-.3);camera.add(scareLight);scareLight.visible=false;
 const chest=new T.Group();chest.position.set(CHEST.x,0,CHEST.z);root.add(chest);const gold=mat(0xd5b34f,.3,{metalness:.7}),chestWood=mat(0x65472c),chestLid=new T.Group();
 box(chest,chestWood,1.55,.78,1.05,0,.45,0);for(const x of [-.63,.63])box(chest,gold,.14,.84,1.1,x,.45,0);box(chest,gold,1.6,.12,1.12,0,.1,0);chestLid.position.set(0,.87,-.52);chest.add(chestLid);box(chestLid,chestWood,1.58,.25,1.08,0,.1,.52);for(const x of [-.63,.63])box(chestLid,gold,.15,.29,1.12,x,.1,.52);box(chest,gold,.25,.32,.12,0,.72,.6);ellipsoid(chest,dark,[.035,.07,.018],0,.75,.67);
 const chestBeam=mesh(chest,new T.CylinderGeometry(.25,.9,9,24,1,true),new T.MeshBasicMaterial({color:0xffda75,transparent:true,opacity:.1,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}),0,4.8,0);
 const chestGem=mesh(chest,new T.OctahedronGeometry(.24),new T.MeshBasicMaterial({color:0xffdf88}),0,1.9,0);const chestRing=mesh(chest,new T.RingGeometry(1.2,1.34,40),new T.MeshBasicMaterial({color:0xffdb7d,side:T.DoubleSide,transparent:true,opacity:.7}),0,.035,0);chestRing.rotation.x=-Math.PI/2;sign(chest,'GOLDEN CHEST',1.7,.32,0,1.5,.6);
 const hemi=new T.HemisphereLight(0xddebd9,0x565d39,2.8);scene.add(hemi);
 const sun=new T.DirectionalLight(0xffebc4,3);sun.position.set(-25,46,13);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.045;Object.assign(sun.shadow.camera,{left:-36,right:36,top:36,bottom:-36,far:100});scene.add(sun);
 const moon=mesh(root,new T.SphereGeometry(2.3,24,16),new T.MeshBasicMaterial({color:0xd5e6df}),-27,32,-46);
 const stars=[];for(let i=0;i<130;i++){const a=rng()*Math.PI*2,h=.18+rng()*.9,r=90;stars.push(Math.cos(a)*Math.cos(h)*r,Math.sin(h)*r,Math.sin(a)*Math.cos(h)*r);}const points=new T.BufferGeometry();points.setAttribute('position',new T.Float32BufferAttribute(stars,3));const starField=new T.Points(points,new T.PointsMaterial({color:0xf2f0d3,size:.12}));root.add(starField);
 const torch=new T.SpotLight(0xfff1cd,18,27,Math.PI/6,.65,1.3);camera.add(torch);torch.position.set(.12,-.12,-.08);camera.add(torch.target);torch.target.position.set(0,0,-8);
 const held=new T.Group();camera.add(held);let heldId='',heldModel=null,light=1;
 const armSkin=mat(0xb98864,.95),sleeve=mat(0x657754);const arm=cylinder(held,sleeve,.065,.095,.44,.09,-.54,.19);arm.rotation.x=-.7;ellipsoid(held,armSkin,[.072,.1,.08],.02,-.32,.035);
 const dayColor=new T.Color(0xb5c6d0),nightColor=new T.Color(0x111d30);scene.background=dayColor.clone();scene.fog=new T.Fog(dayColor,21,90);
 function update(g,time,{flashlight=true,menu=false,scare=null,reducedMotion=false}={}){
  const target=['night','lost'].includes(g.phase)?0:1;light+=(target-light)*.065;scene.background.copy(nightColor).lerp(dayColor,light);scene.fog.color.copy(scene.background);scene.fog.far=53+light*37;hemi.intensity=.35+light*1.35;hemi.color.set(light>.5?0xddebd9:0x9fb8d1);sun.intensity=.45+light*2.3;sun.color.set(light>.5?0xffebc4:0x9fb8e3);moon.visible=starField.visible=light<.75;
  walls.visible=wallsUp(g);bear.visible=bearDanger(g)&&g.bear.retreat<=0||menu;torch.visible=flashlight&&!menu&&g.player.hidden<0;torch.intensity=target?3:20;
  const daylight=g.phase==='day'?g.elapsed/240:.5;sun.position.set(-25+daylight*45,18+Math.sin(daylight*Math.PI)*28,13);if(g.phase==='day'&&daylight>.78)sun.color.set(0xffc38a);
  for(const [id,visual] of animalModels.entries()){const a=g.wildlife[id];visual.model.visible=!a.down;visual.bag.visible=a.down&&!a.harvested;if(!a.down)animateAnimal(visual.model,a,groundHeight(a.x,a.z),time);visual.bag.position.set(a.x,groundHeight(a.x,a.z),a.z);}
  berryModels.forEach((b,id)=>b.berries.forEach(m=>m.visible=!g.berryPicked.includes(id)));meal.visible=g.cooking>0;pot.material.color.set(g.cooking>0?0x413b2d:0x202923);
  if(menu){animateBear(bear,{x:-10,z:-5,yaw:-2.4,mode:'prowl',walk:time*.55},time);}else animateBear(bear,g.bear,time);
  for(const [i,c] of canModels.entries()){c.root.visible=g.fireFuel>0&&g.player.hidden!==i;c.ring.visible=g.fireFuel>0&&g.player.hidden!==i;c.lid.rotation.x=g.player.hidden===i?-.06:0;c.ring.material.opacity=.38+Math.sin(time*2+i)*.12;}
  for(const p of peakModels){const claimed=g.peaks.includes(p.m.id);p.gem.visible=!claimed&&canHike(g);p.gem.material.emissiveIntensity=canHike(g)?.65:0;p.gem.rotation.y=time;p.gem.position.y=.9+Math.sin(time*2)*.1;p.flag.material.color.set(claimed?0x779379:0xddd2a1);p.ring.material.opacity=claimed?.17:.65;p.text.quaternion.copy(camera.quaternion);}
  const ready=chestCount(g)>0;chest.visible=ready;chestBeam.visible=chestGem.visible=chestRing.visible=ready;chestGem.rotation.y=time;chestGem.position.y=1.9+Math.sin(time*2)*.12;chestLid.rotation.x=g.pendingRoll?-.95:0;
  for(const [i,f] of flames.entries()){f.visible=g.fireFuel>0;f.scale.y=.8+Math.sin(time*8+i*2)*.2;f.rotation.y=time+i;}
  fireLight.intensity=g.fireFuel>0?(12+Math.min(1,g.fireFuel/90)*7+Math.sin(time*8)*2):0;
  const nextTreeKey=g.felled.join(',')+'/'+JSON.stringify(g.treeHits);if(treeKey!==nextTreeKey){treeKey=nextTreeKey;for(let k=0;k<4;k++){const items=k?leaves[k-1]:trunkItems;items.forEach((a,i)=>{const cut=g.felled.includes(i);treeDummy.position.set(a.x,cut&&k===0?.14:a.y,a.z);treeDummy.rotation.set(0,0,cut?0:(g.treeHits[i]||0)*.015);treeDummy.scale.set(cut&&k>0?0:a.sx,cut?(k?0:.28):a.sy,cut&&k>0?0:a.sz);treeDummy.updateMatrix();treeBatches[k].setMatrixAt(i,treeDummy.matrix);});treeBatches[k].instanceMatrix.needsUpdate=true;}}
  const drops=new Set(g.woodDrops.map(d=>d.id));logModels.forEach((model,id)=>model.visible=drops.has(id));
  scareBear.visible=scareLight.visible=scare!==null;if(scare!==null){scareBear.position.set(0,-1.65,reducedMotion?-3.2:-4+Math.min(1,scare*4));scareBear.userData.head.rotation.z=reducedMotion?0:Math.sin(scare*5)*.045;scareBear.userData.head.rotation.x=-.07;}

  held.visible=!menu&&scare===null&&g.player.hidden<0;
  const activeId=g.tool==='axe'?'axe':g.equipped;
  if(heldId!==activeId){if(heldModel){held.remove(heldModel);dispose(heldModel);}heldModel=makeWeapon(activeId);held.add(heldModel);heldId=activeId;}
  held.position.set(.34,-.38,-.85);held.scale.setScalar(.85);held.rotation.set(-.12,0,-.1);
  if(heldId==='stick'||heldId==='bat'||heldId==='axe'){held.rotation.x=-.6;held.rotation.z=-.3;held.position.y=-.27;}
  const swing=g.flash/.18;if(swing>0){const ranged=!['axe','stick','bat'].includes(heldId);held.rotation.z-=Math.sin(swing*Math.PI)*(ranged?.04:.8);held.rotation.x+=ranged?Math.sin(swing*Math.PI)*.08:0;held.position.z+=Math.sin(swing*Math.PI)*(ranged?.07:-.22);}
  held.position.y+=Math.sin(g.player.walk*5)*.012;
 }
 return {root,bear,walls,animalModels,berryModels,canModels,chest,peakModels,logModels,treeBatches,scareBear,update,dispose:()=>{dispose(root);dispose(held);dispose(scareBear);sun.dispose();torch.dispose();}};
}
export function dispose(root){const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ts.forEach(t=>t.dispose());ms.forEach(m=>m.dispose());}
