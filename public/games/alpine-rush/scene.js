import * as THREE from '../../vendor/three.module.js';
import {sample,center,OUTFITS} from './rules.js?v=ski8';
const v=p=>new THREE.Vector3(p.x,p.y,p.z);
const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
function mesh(parent,geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,w,h,d,material,x=0,y=0,z=0){return mesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);}
function rod(parent,a,b,r,material){const p=v(a),q=v(b),m=mesh(parent,new THREE.CylinderGeometry(r,r,p.distanceTo(q),8),material);m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return m;}
function sign(text,bg='#123d50',ink='#f3f7f4',width=4,height=1){const c=document.createElement('canvas');c.width=512;c.height=128;const a=c.getContext('2d');a.fillStyle=bg;a.fillRect(0,0,512,128);a.fillStyle=ink;a.font='800 46px Arial';a.textAlign='center';a.textBaseline='middle';a.fillText(text,256,66,490);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));}
// Batch static parts by material; moving limbs, flags and chairs retain their pivots.
function mergeParts(group,exclude=new Set()){
 group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),sets=new Map();
 function collect(o){if(exclude.has(o)||o.isInstancedMesh)return;if(o.isMesh&&!Array.isArray(o.material)&&!o.material.vertexColors){if(!sets.has(o.material))sets.set(o.material,[]);sets.get(o.material).push(o);}for(const child of o.children)collect(child);}
 collect(group);
 for(const [material,parts] of sets){if(parts.length<2)continue;const pos=[],normal=[],uv=[];
  for(const part of parts){const geo=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();geo.applyMatrix4(inverse.clone().multiply(part.matrixWorld));const p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv;
   for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));normal.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(u?u.getX(i):0,u?u.getY(i):0);}geo.dispose();part.parent.remove(part);part.geometry.dispose();}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));mesh(group,geo,material);
 }
}
export function makeSkier(index=0){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const outfit=mat(OUTFITS[index].color,.7),dark=mat(0x1c3040,.68),black=mat(0x16222d,.65),snow=mat(0xe6edf0,.5),skin=mat(0xcc9e7d,.88),visor=mat(0x164d62,.18,.72),chrome=mat(0x99aab3,.26,.8),accent=mat(index%2?0xf9cf6f:0xff7953,.4,.1);
 // Twin narrow skis have raised, curved tips, metal edges and fitted bindings.
 const skis=[];
 for(const side of [-1,1]){
  const ski=new THREE.Group();ski.position.x=side*.21;root.add(ski);skis.push(ski);
  box(ski,.17,.045,1.85,black,0,.045,.08);box(ski,.145,.035,1.8,accent,0,.08,.06);
  const tip=new THREE.Shape();tip.moveTo(-.083,0);tip.lineTo(-.083,-.14);tip.quadraticCurveTo(0,-.29,.083,-.14);tip.lineTo(.083,0);tip.closePath();
  const nose=mesh(ski,new THREE.ShapeGeometry(tip),accent,0,.105,-.83);nose.rotation.x=-Math.PI/2-.24;
  box(ski,.07,.035,1.13,snow,0,.105,.1);box(ski,.19,.095,.25,chrome,0,.13,-.04);box(ski,.16,.15,.29,black,0,.22,.03);
  box(ski,.12,.05,.2,accent,0,.16,.35);
 }
 const hips=mesh(body,new THREE.SphereGeometry(.3,12,10),dark,0,.93,.05);hips.scale.set(1,.6,.7);
 for(const side of [-1,1]){
  rod(body,{x:side*.2,y:.96,z:.07},{x:side*.24,y:.6,z:-.24},.13,dark);
  rod(body,{x:side*.24,y:.6,z:-.24},{x:side*.21,y:.25,z:.06},.105,dark);
  box(body,.18,.22,.35,black,side*.21,.26,.025);box(body,.19,.035,.24,chrome,side*.21,.26,-.09);
 }
 const torso=mesh(body,new THREE.CylinderGeometry(.275,.24,.6,12),outfit,0,1.24,-.02);torso.scale.z=.72;torso.rotation.x=-.13;
 mesh(body,new THREE.SphereGeometry(.27,14,10),outfit,0,1.48,-.07).scale.set(1.15,.42,.8);
 box(body,.025,.49,.012,snow,0,1.26,-.22);box(body,.07,.04,.02,accent,.17,1.37,-.215);
 box(body,.045,.31,.018,dark,-.16,1.21,-.213);box(body,.018,.06,.012,snow,-.16,1.32,-.23);
 const head=new THREE.Group();head.position.set(0,1.69,-.15);body.add(head);
 mesh(head,new THREE.SphereGeometry(.205,16,12),skin,0,-.01,0).scale.set(1,1.1,.92);
 const helmet=mesh(head,new THREE.SphereGeometry(.237,20,14,0,Math.PI*2,0,Math.PI*.72),snow,0,.065,0);helmet.scale.z=1.08;
 box(head,.07,.025,.37,accent,0,.279,-.015);box(head,.35,.018,.08,black,0,.055,-.18);
 const goggles=mesh(head,new THREE.SphereGeometry(.2,16,10),visor,0,.034,-.175);goggles.scale.set(1.02,.40,.72);
 rod(head,{x:-.17,y:.03,z:.08},{x:-.1,y:-.18,z:-.01},.017,black);rod(head,{x:.17,y:.03,z:.08},{x:.1,y:-.18,z:-.01},.017,black);
 const arms=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.285,1.44,-.05);body.add(arm);arms.push(arm);
  rod(arm,{x:0,y:0,z:0},{x:side*.17,y:-.25,z:-.18},.09,outfit);rod(arm,{x:side*.17,y:-.25,z:-.18},{x:side*.12,y:-.34,z:-.39},.075,outfit);
  mesh(arm,new THREE.SphereGeometry(.095,10,8),black,side*.12,-.34,-.39);
  rod(arm,{x:side*.12,y:-.31,z:-.39},{x:side*.2,y:-1.12,z:.42},.013,chrome);
  const basket=mesh(arm,new THREE.TorusGeometry(.065,.012,6,12),black,side*.195,-1.04,.35);basket.rotation.x=Math.PI/2;
 }
 for(const arm of arms)mergeParts(arm);for(const ski of skis)mergeParts(ski);mergeParts(body,new Set(arms));
 root.userData.pose=(r,time)=>{body.rotation.z=-r.steer*.16;body.rotation.x=r.speed>23?-.14:0;body.position.y=r.height>0?.06:Math.sin(time*9)*.01;body.position.z=r.speed>23?-.1:0;arms.forEach((a,i)=>{a.rotation.x=r.height>0?-.25:Math.sin(time*4+i)*.025;a.rotation.z=r.height>0?(i?-.35:.35):0;});skis.forEach((s,i)=>s.rotation.z=-r.steer*.1+(r.height>0?(i?.03:-.03):0));};
 return root;
}
export function makeWorld(c){
 const root=new THREE.Group(),snow=mat(0xf3f7f9,.96),rock=mat(0x758795,.96),wood=mat(0x6f675b,.95),ink=mat(0x173c50,.75),red=mat(0xe8694d,.72),blue=mat(0x3e8fab,.7),metal=mat(0x697e87,.5,.5),rng=(()=>{let s=19031+c.index*217;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};})(),flags=[];
 // Continuous, banked snow terrain follows the same mathematical surface as the skis.
 const positions=[],colors=[],uv=[],indices=[],rows=Math.ceil((c.config.length+300)/7),cols=40;
 for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
  const s=-110+i/rows*(c.config.length+300),lane=(j/cols-.5)*260,a=sample(c,s,lane),shade=.94+rng()*.06,edge=Math.abs(lane)>30;
  positions.push(a.p.x,a.p.y,a.p.z);colors.push(shade*(edge?.91:1),shade*(edge?.96:1),shade);uv.push(j/cols,i/rows);
  if(i<rows&&j<cols){const k=i*(cols+1)+j;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
 }
 const groundGeo=new THREE.BufferGeometry();groundGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));groundGeo.setIndex(indices);groundGeo.computeVertexNormals();
 const noise=new Uint8Array(128*128*4);for(let i=0;i<128*128;i++){const n=200+rng()*55;noise[i*4]=noise[i*4+1]=noise[i*4+2]=n;noise[i*4+3]=255;}const snowGrain=new THREE.DataTexture(noise,128,128);snowGrain.wrapS=snowGrain.wrapT=THREE.RepeatWrapping;snowGrain.repeat.set(75,230);snowGrain.generateMipmaps=true;snowGrain.magFilter=THREE.LinearFilter;snowGrain.minFilter=THREE.LinearMipmapLinearFilter;snowGrain.needsUpdate=true;
 const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,side:THREE.DoubleSide,bumpMap:snowGrain,bumpScale:.035}));ground.receiveShadow=true;root.add(ground);
 for(const gate of c.gates){const a=sample(c,gate.s,gate.lane),group=new THREE.Group();group.position.copy(v(a.p));group.rotation.y=a.yaw;root.add(group);const color=gate.id%2?blue:red;
  for(const side of [-1,1]){box(group,.055,2.4,.055,color,side*gate.width/2,1.2,0);box(group,.065,.4,.065,snow,side*gate.width/2,.2,0);const flag=box(group,.62,.44,.025,color,side*(gate.width/2-.28),1.87,0);flags.push(flag);}
  const trail=sign(String(gate.id+1).padStart(2,'0'),gate.id%2?'#337b96':'#cf6046','#ffffff',.63,.23);trail.position.set(-gate.width/2+.29,1.87,.025);group.add(trail);
 }
 for(const ramp of c.ramps){
  const verts=[],idx=[],a0=ramp.s-8;
  for(let i=0;i<=8;i++)for(let side=0;side<2;side++){const a=sample(c,a0+i,ramp.lane+(side-.5)*ramp.width);verts.push(a.p.x,a.p.y+ramp.height*(i/8)**1.7+.035,a.p.z);if(i<8){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();const jump=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xd0e9f0,roughness:.65,side:THREE.DoubleSide}));jump.receiveShadow=true;root.add(jump);
  for(const side of [-1,1]){const a=sample(c,ramp.s-4,ramp.lane+side*(ramp.width/2+.7)),post=new THREE.Group();post.position.copy(v(a.p));post.rotation.y=a.yaw;root.add(post);box(post,.06,2,.06,ink,0,1,0);const label=sign('JUMP','#ffcc63','#243e4b',1.25,.4);label.position.y=2;post.add(label);}
 }
 for(const a of c.rocks){const p=sample(c,a.s,a.lane).p;const m=mesh(root,new THREE.DodecahedronGeometry(a.radius,1),rock,p.x,p.y+.6,p.z);m.scale.set(1,.65,1);const cap=mesh(root,new THREE.SphereGeometry(a.radius*.9,12,6,0,Math.PI*2,0,Math.PI/2),snow,p.x,p.y+.9,p.z);cap.scale.y=.4;}
 // Boundary ropes, groomer ridges and the lodge make the course easy to read.
 const ropePoints=[[],[]];
 for(let s=-20;s<c.config.length+30;s+=15)for(const [i,side] of [-1,1].entries()){
  const a=sample(c,s,side*(c.config.width/2+1.5));box(root,.065,1.05,.065,red,a.p.x,a.p.y+.5,a.p.z);ropePoints[i].push(new THREE.Vector3(a.p.x,a.p.y+.9,a.p.z));
 }
 for(const pts of ropePoints)root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xb75d4d,transparent:true,opacity:.7})));
 for(const lane of [-9,-6,-3,0,3,6,9]){const pts=[];for(let s=-80;s<c.config.length+90;s+=7){const p=sample(c,s,lane).p;pts.push(new THREE.Vector3(p.x,p.y+.025,p.z));}root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xaac4d2,transparent:true,opacity:.2})));}
 const trees=[];
 for(let s=-65;s<c.config.length+140;s+=10/c.config.trees)for(const side of [-1,1]){const lane=side*(17+rng()*41),p=sample(c,s+rng()*7,lane).p;trees.push({p,scale:.7+rng()*.85,turn:rng()*6.28});}
 const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.23,3,7),wood,trees.length);root.add(trunk);
 const needles=mat(0x315a5d,.96),dummy=new THREE.Object3D();
 const layers=[];for(let layer=0;layer<3;layer++){const green=new THREE.InstancedMesh(new THREE.ConeGeometry(1.4-layer*.28,3.1-layer*.25,8),needles,trees.length),white=new THREE.InstancedMesh(new THREE.ConeGeometry(1.25-layer*.27,2.3-layer*.2,8),snow,trees.length);root.add(green,white);layers.push({green,white});}
 trees.forEach((t,i)=>{dummy.position.set(t.p.x,t.p.y+t.scale*1.5,t.p.z);dummy.rotation.set(0,t.turn,0);dummy.scale.setScalar(t.scale);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);layers.forEach(({green,white},k)=>{dummy.position.y=t.p.y+t.scale*(2.6+k*1.5);dummy.updateMatrix();green.setMatrixAt(i,dummy.matrix);dummy.position.y+=t.scale*.4;dummy.updateMatrix();white.setMatrixAt(i,dummy.matrix);});});
 for(let i=0;i<25;i++){const s=-220+i*(c.config.length+600)/24,side=i%2?1:-1,p=center(c,s),height=95+rng()*130,group=new THREE.Group();group.position.set(p.x+side*(175+rng()*130),p.y+20,-s);group.rotation.y=rng()*6;root.add(group);mesh(group,new THREE.ConeGeometry(85,height,7),rock,0,height*.27,0);mesh(group,new THREE.ConeGeometry(68,height*.72,7),snow,0,height*.51,0);}
 const start=sample(c,-7),finish=sample(c,c.config.length+3);
 for(const [a,text] of [[start,'ALPINE RUSH'],[finish,'FINISH']]){const gate=new THREE.Group();gate.position.copy(v(a.p));gate.rotation.y=a.yaw;root.add(gate);for(const side of [-1,1])box(gate,.3,5.3,.3,ink,side*8,2.6,0);box(gate,16.5,.55,.4,red,0,5,0);const name=sign(text,'#173e51','#ffffff',8.5,1.3);name.position.set(0,4.8,.3);gate.add(name);}
 // A checkered finish mat follows the slope rather than hovering over it.
 for(let x=-11;x<12;x+=1.2)for(let j=0;j<4;j++){const a=sample(c,c.config.length+j*1.2,x),tile=box(root,1.19,.035,1.19,(Math.round(x/1.2)+j)%2?snow:ink,a.p.x,a.p.y+.035,a.p.z);tile.rotation.set(a.pitch,a.yaw,0,'YXZ');}
 const lodge=new THREE.Group(),lp=sample(c,c.config.length+40,24);lodge.position.copy(v(lp.p));lodge.rotation.y=lp.yaw;root.add(lodge);box(lodge,11,4.5,9,wood,0,2,0);box(lodge,11.7,.3,10,snow,0,4.6,0);for(let x=-4;x<=4;x+=2){box(lodge,1.3,1.6,.05,blue,x,2.4,4.53);box(lodge,.09,1.6,.1,snow,x,2.4,4.6);}const ls=sign('SUMMIT LODGE','#173e51','#ffffff',7,.8);ls.position.set(0,4.05,4.58);lodge.add(ls);
 // An operating chairlift runs beside the trail.
 const chairs=[];for(let s=-20;s<c.config.length+50;s+=85){const a=sample(c,s,18),b=sample(c,s+85,18);rod(root,{x:a.p.x,y:a.p.y+8,z:a.p.z},{x:b.p.x,y:b.p.y+8,z:b.p.z},.025,metal);box(root,.2,8,.2,metal,a.p.x,a.p.y+4,a.p.z);box(root,3,.18,.25,metal,a.p.x,a.p.y+8,a.p.z);}
 for(let i=0;i<14;i++){const chair=new THREE.Group();box(chair,.06,2,.06,metal,0,1,0);box(chair,1.8,.14,.85,red,0,0,0);box(chair,1.8,.7,.1,ink,0,.4,.4);rod(chair,{x:-.85,y:0,z:0},{x:-.85,y:1,z:0},.035,metal);rod(chair,{x:.85,y:0,z:0},{x:.85,y:1,z:0},.035,metal);root.add(chair);chairs.push(chair);}
 const flakes=[];for(let i=0;i<150;i++)flakes.push((rng()-.5)*65,rng()*28,(rng()-.5)*90);const powder=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(flakes,3)),new THREE.PointsMaterial({color:0xffffff,size:.085,transparent:true,opacity:.7,depthWrite:false}));root.add(powder);
 const trackArray=new Float32Array(24000),trackGeo=new THREE.BufferGeometry();trackGeo.setAttribute('position',new THREE.BufferAttribute(trackArray,3));trackGeo.setDrawRange(0,0);root.add(new THREE.LineSegments(trackGeo,new THREE.LineBasicMaterial({color:0x85afc5,transparent:true,opacity:.38})));let trackCount=0,lastS=-99,lastLane=0;
 function resetTracks(){trackCount=0;lastS=-99;trackGeo.setDrawRange(0,0);}
 function update(time,r){
  flags.forEach((f,i)=>f.rotation.y=Math.sin(time*2+i)*.12);
  chairs.forEach((chair,i)=>{const a=sample(c,((i/14*c.config.length+time*3)%(c.config.length+100))-50,18);chair.position.set(a.p.x,a.p.y+6,a.p.z);chair.rotation.y=a.yaw;});
  if(r){const p=sample(c,r.s,r.lane).p;powder.position.set(p.x,p.y+2,p.z-12);powder.rotation.y=Math.sin(time*.2)*.1;
   if(r.height<.15&&r.s-lastS>1){if(lastS>=0&&r.s-lastS<8){for(const side of [-1,1])for(const [s,lane] of [[lastS,lastLane+side*.21],[r.s,r.lane+side*.21]]){const a=sample(c,s,lane).p;const off=(trackCount%8000)*3;trackArray[off]=a.x;trackArray[off+1]=a.y+.04;trackArray[off+2]=a.z;trackCount++;}trackGeo.attributes.position.needsUpdate=true;trackGeo.setDrawRange(0,Math.min(trackCount,8000));}lastS=r.s;lastLane=r.lane;}
  }
 }
 mergeParts(root,new Set([...flags,...chairs,ground]));for(const chair of chairs)mergeParts(chair);
 return {root,update,resetTracks,dispose(){const geo=new Set(),mats=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){mats.add(m);if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap);}});geo.forEach(x=>x.dispose());mats.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());}};
}
