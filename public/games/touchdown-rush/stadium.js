import * as THREE from '../../vendor/three.module.js';
import {fanLogoTexture} from './team-branding.js?v=creators1';
import {makeScoreboard,drawScoreboard} from './scoreboard.js?v=creators1';

// The stands and crowd are cosmetic. Instancing keeps thousands of spectators
// inexpensive, and the crowd's motion stays on the GPU rather than game actors.
const skinColors=[0x684531,0x8b5c3e,0xb17c55,0xcd9c78,0xe7bda0,0x794b34];
const hairColors=[0x211d1a,0x493121,0x735036,0xb59b63,0x8c8d89];
const material=(color,metalness=0,roughness=.85)=>new THREE.MeshStandardMaterial({color,metalness,roughness});

function merged(parts){
 const positions=[],normals=[],uvs=[],waves=[];
 for(const {geometry,matrix,wave=0} of parts){
  const g=(geometry.index?geometry.toNonIndexed():geometry.clone());g.applyMatrix4(matrix);
  positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);
  uvs.push(...g.attributes.uv.array);waves.push(...Array(g.attributes.position.count).fill(wave));g.dispose();
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('crowdWave',new THREE.Float32BufferAttribute(waves,1));g.computeBoundingSphere();return g;
}

function fanGeometry(pose){
 const groups={shirt:[],skin:[],pants:[],shoes:[],hair:[],cap:[],logo:[]},geometries=[];
 const sphere=new THREE.SphereGeometry(1,6,4),detail=new THREE.SphereGeometry(1,5,3),hair=new THREE.SphereGeometry(1,6,3,0,Math.PI*2,0,Math.PI/2),tube=new THREE.CylinderGeometry(1,1,1,4,1,true),torso=new THREE.CylinderGeometry(1,.78,1,8,1,true),cube=new THREE.BoxGeometry(1,1,1);geometries.push(sphere,detail,hair,tube,torso,cube);
 const transform=new THREE.Object3D();
 const part=(kind,geometry,x,y,z,sx,sy,sz,wave=0,rx=0)=>{transform.position.set(x,y,z);transform.rotation.set(rx,0,0);transform.scale.set(sx,sy,sz);transform.updateMatrix();groups[kind].push({geometry,matrix:transform.matrix.clone(),wave});};
 const limb=(kind,a,b,radius,wave=0)=>{const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);transform.position.copy(from.add(to).multiplyScalar(.5));transform.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());transform.scale.set(radius,delta.length(),radius);transform.updateMatrix();groups[kind].push({geometry:tube,matrix:transform.matrix.clone(),wave});};
 part('shirt',torso,0,1.02,0,.245,.56,.155);
 const badge=new THREE.PlaneGeometry(.26,.21,4,1);geometries.push(badge);part('logo',badge,0,1.12,.164,1,1,1);
 part('skin',tube,0,1.36,0,.074,.13,.074);
 part('skin',sphere,0,1.53,0,.133,.177,.137);
 part('skin',detail,0,1.51,.13,.038,.04,.035);
 part('hair',hair,0,1.58,-.022,.139,.14,.128);
 for(const side of [-1,1])part('hair',cube,side*.047,1.56,.126,.018,.012,.012);
 // A few seats have baseball caps, alternating with uncovered hairstyles.
 part('cap',hair,0,1.64,0,.147,.10,.15);
 part('cap',cube,0,1.67,.15,.23,.025,.19);
 part('pants',cube,0,.695,0,.37,.15,.25);
 for(const side of [-1,1]){
  limb('pants',[side*.115,.72,.02],[side*.135,.67,.34],.102);
  limb('pants',[side*.135,.67,.34],[side*.14,.19,.36],.073);
  part('shoes',detail,side*.14,.115,.45,.095,.09,.175);
  const shoulder=[side*.205,1.24,.01],elbow=pose===2?[side*.34,1.62,.02]:pose===1?[side*.36,1.22,.23]:[side*.31,.94,.16];
  const hand=pose===2?[side*.29,1.94,.09]:pose===1?[side*.11,1.37,.36]:[side*.17,.77,.36],wave=pose?1:0;
  limb('shirt',shoulder,elbow,.09,wave);limb('skin',elbow,hand,.057,wave);part('skin',detail,...hand,.069,.08,.061,wave);
 }
 const result=Object.fromEntries(Object.entries(groups).map(([name,parts])=>[name,merged(parts)]));geometries.forEach(g=>g.dispose());return result;
}

function crowdMaterial(uniforms){
 const m=material(0xffffff);
 m.onBeforeCompile=shader=>{
  shader.uniforms.crowdTime=uniforms.time;shader.uniforms.crowdEnergy=uniforms.energy;
  shader.vertexShader='attribute float crowdWave; uniform float crowdTime; uniform float crowdEnergy;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float phase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
   float wave = sin(crowdTime * 3.8 + phase);
   transformed.x += crowdWave * sign(position.x) * wave * (0.025 + crowdEnergy * 0.07);
   transformed.y += crowdWave * cos(crowdTime * 4.4 + phase) * (0.04 + crowdEnergy * 0.12);
   transformed.y += max(0.0, position.y - 0.65) * sin(crowdTime * 1.7 + phase) * 0.009;
  `);
 };
 m.customProgramCacheKey=()=> 'archerbox-stadium-crowd-v1';return m;
}

export function makeStadiumBowl(index,cfg,teams,homeIndex=0){
 homeIndex=homeIndex===1?1:0;const home=teams[homeIndex];
 const root=new THREE.Group();root.name='Stadium seating and fans';
 const uniform={time:{value:0},energy:{value:0}},crowdMat=crowdMaterial(uniform);
 const concrete=material(index===2?0xa9b0aa:0xadb1ad),edge=material(0xd3d4cc),steel=material(0x7d8b90,.65,.35),dark=material(0x24323b),roof=material(index===1?0x65717e:0xc5cec9,.3,.55),seat=material(home.color),glass=material(0x5d8795,.6,.22),light=new THREE.MeshBasicMaterial({color:0xffedc7,toneMapped:false}),led=new THREE.MeshBasicMaterial({color:home.color});
 const boxGeometry=new THREE.BoxGeometry(1,1,1),cylinderGeometry=new THREE.CylinderGeometry(1,1,1,8),items=new Map(),dummy=new THREE.Object3D();
 const place=(geo,m,x,y,z,w,h,d,rotation=0)=>{let byMaterial=items.get(geo);if(!byMaterial){byMaterial=new Map();items.set(geo,byMaterial)}let group=byMaterial.get(m);if(!group){group=[];byMaterial.set(m,group)}dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(w,h,d);dummy.updateMatrix();group.push(dummy.matrix.clone());};
 const box=(m,x,y,z,w,h,d,rotation=0)=>place(boxGeometry,m,x,y,z,w,h,d,rotation);
 const post=(x,y,z,h,r=.045)=>place(cylinderGeometry,steel,x,y,z,r,h,r);
 const seats=[],spectators=[[],[],[]];let seed=103+index;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const addFan=(p,yaw)=>{
  if(random()<.065)return;
  const pose=random()<.16?2:random()<.27?1:0;
  const height=.88+random()*.17,build=.82+random()*.28;
  dummy.position.copy(p);dummy.rotation.set(0,yaw+(random()-.5)*.12,0);dummy.scale.set(build,height,build);dummy.updateMatrix();
  spectators[pose].push({matrix:dummy.matrix.clone(),shade:.86+random()*.26,variant:random(),skin:skinColors[Math.floor(random()*skinColors.length)],hair:hairColors[Math.floor(random()*hairColors.length)],hat:random()<.28});
 };
 const stands=[{x:-34,z:0,yaw:Math.PI/2,length:138,end:false},{x:34,z:0,yaw:-Math.PI/2,length:138,end:false},{x:0,z:-69,yaw:0,length:68,end:true},{x:0,z:69,yaw:Math.PI,length:68,end:true}];
 for(const s of stands){
  const orient=new THREE.Matrix4().makeRotationY(s.yaw);orient.setPosition(s.x,0,s.z);
  const world=(x,y,z)=>new THREE.Vector3(x,y,z).applyMatrix4(orient);
  const block=(m,x,y,z,w,h,d)=>{const p=world(x,y,z);box(m,p.x,p.y,p.z,w,h,d,s.yaw);};
  const pole=(x,y,z,h)=>{const p=world(x,y,z);post(p.x,p.y,p.z,h);};
  block(dark,0,1.1,1.8,s.length,2.2,.55);
  // Lower bowl, open concourse, and a steeper upper deck.
  for(let tier=0;tier<2;tier++){
   const rows=tier?9:10,baseY=tier?11.8:1.1,baseZ=tier?-19:0,rise=tier?.89:.72;
   for(let row=0;row<rows;row++){
    const y=baseY+row*rise,z=baseZ-row*1.25;
    block(concrete,0,y/2,z-.3,s.length,y,1.25);
    block(edge,0,y+.025,z+.27,s.length,.05,.1);
    const columns=Math.floor(s.length/.84);
    for(let col=0;col<columns;col++){
     const x=(col-(columns-1)/2)*.84,isAisle=col%24<3;
     if(isAisle){
      if(col%24===1){block(edge,x,y-rise*.28,z+.4,.83,.10,.5);if(row%2===0)pole(x,y+.5,z,1);}
      continue;
     }
     dummy.position.set(x,y+.47,z-.04);dummy.rotation.set(0,0,0);dummy.scale.set(.66,.09,.58);dummy.updateMatrix();seats.push(new THREE.Matrix4().multiplyMatrices(orient,dummy.matrix));
     dummy.position.set(x,y+.76,z-.30);dummy.scale.set(.66,.55,.095);dummy.updateMatrix();seats.push(new THREE.Matrix4().multiplyMatrices(orient,dummy.matrix));
     addFan(world(x+(random()-.5)*.07,y,z+.03),s.yaw);
    }
   }
   // Safety rails line the first row, with openings at each aisle.
   for(let x=-s.length/2+.8;x<s.length/2;x+=3.4)pole(x,baseY+.59,baseZ+.48,1.18);
   block(steel,0,baseY+1.16,baseZ+.48,s.length,.045,.045);
  }
  block(edge,0,9.05,-15.3,s.length,.7,5.8);block(dark,0,8.45,-12.4,s.length,1.05,.18);
  block(led,0,8.53,-12.29,s.length,.28,.035);
  block(dark,0,20.45,-30.4,s.length,1.3,.4);
  for(let x=-s.length/2+7;x<s.length/2;x+=18){
   // Dark vomitory openings and warm concourse lights behind the lower bowl.
   block(dark,x,9.7,-18.2,4,2.7,.15);block(light,x,10.78,-18.05,3.6,.12,.1);
   block(concrete,x,14.7,-30,1.1,11,1.1);
  }
  if(!s.end){
   // A light canopy, exposed rafters, and glass-fronted press/suite boxes.
   block(roof,0,24.2,-24,s.length+3,.3,18);
   for(let x=-s.length/2+2;x<s.length/2;x+=8.5){block(steel,x,23.64,-24,.15,.8,17);pole(x,20.8,-31,6.6);}
   block(dark,0,21,-31.4,s.length-8,4,3.7);block(glass,0,21.3,-29.48,s.length-9,2.2,.07);
   for(let x=-s.length/2+5;x<s.length/2-4;x+=4.4)block(steel,x,21.3,-29.35,.07,2.35,.15);
   block(light,0,23.75,-16,s.length-6,.08,.13);
  }
 }
 // Curved corner sections connect the four stands into one continuous bowl.
 const cornerParts=[];
 for(const sx of [-1,1])for(const sz of [-1,1])for(let tier=0;tier<2;tier++)for(let row=0;row<(tier?9:10);row++){
  const radius=(tier?19.3:.4)+row*1.25,y=(tier?11.8:1.1)+row*(tier?.89:.72),inner=Math.max(.04,radius-.625),outer=radius+.625;
  const shape=new THREE.Shape();shape.moveTo(outer,0);shape.absarc(0,0,outer,0,Math.PI/2,false);shape.lineTo(0,inner);shape.absarc(0,0,inner,Math.PI/2,0,true);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:y,bevelEnabled:false,curveSegments:10});geometry.rotateX(-Math.PI/2);
  const yaw=sx===1?(sz===-1?0:-Math.PI/2):(sz===1?Math.PI:Math.PI/2);
  dummy.position.set(sx*34,0,sz*69);dummy.rotation.set(0,yaw,0);dummy.scale.setScalar(1);dummy.updateMatrix();cornerParts.push({geometry,matrix:dummy.matrix.clone()});
  const columns=Math.max(1,Math.floor(radius*Math.PI/2/.84));
  for(let c=0;c<columns;c++){
   if(c%23<2)continue;const a=(c+.5)/columns*Math.PI/2,px=sx*(34+Math.cos(a)*radius),pz=sz*(69+Math.sin(a)*radius),facing=Math.atan2(-sx*Math.cos(a),-sz*Math.sin(a));
   dummy.rotation.set(0,facing,0);dummy.position.set(px,y+.47,pz);dummy.scale.set(.66,.09,.58);dummy.updateMatrix();seats.push(dummy.matrix.clone());
   dummy.position.set(px-Math.sin(facing)*.28,y+.76,pz-Math.cos(facing)*.28);dummy.scale.set(.66,.55,.095);dummy.updateMatrix();seats.push(dummy.matrix.clone());
   addFan(new THREE.Vector3(px,y,pz),facing);
  }
 }
 const corners=new THREE.Mesh(merged(cornerParts),concrete);corners.name='Curved corner terraces';root.add(corners);cornerParts.forEach(p=>p.geometry.dispose());
 const seatMesh=new THREE.InstancedMesh(boxGeometry,seat,seats.length);seatMesh.name='Individual molded seats';seats.forEach((m,i)=>seatMesh.setMatrixAt(i,m));seatMesh.computeBoundingSphere();root.add(seatMesh);
 // Assign an exact occupied-seat quota after generating the stands. Shuffling
 // spreads the small away section through the bowl, without changing skin tones.
 const allFans=spectators.flat(),homeFanCount=Math.round(allFans.length*.95),shuffled=allFans.slice();
 for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 shuffled.forEach((fan,i)=>{fan.team=i<homeFanCount?homeIndex:1-homeIndex;const t=teams[fan.team];fan.tint=new THREE.Color(fan.variant<.84?t.color:fan.variant<.94?(t.accent??t.color):0xe9e7df).multiplyScalar(fan.shade);});
 const logoMaterials=teams.map(t=>{const m=crowdMaterial(uniform);m.map=fanLogoTexture(t,()=>root.userData.disposed);m.transparent=true;m.alphaTest=.25;m.depthWrite=false;m.polygonOffset=true;m.polygonOffsetFactor=-1;return m;});
 for(const [pose,fans] of spectators.entries()){
  const geometry=fanGeometry(pose);
  for(const [part,geo] of Object.entries(geometry)){
   if(part==='logo'){
    for(const team of [0,1]){const list=fans.filter(f=>f.team===team),mesh=new THREE.InstancedMesh(geo,logoMaterials[team],list.length);mesh.name='Crowd '+['seated','clapping','waving'][pose]+' shirt logos '+team;mesh.userData.teamIndex=team;list.forEach((fan,i)=>mesh.setMatrixAt(i,fan.matrix));mesh.computeBoundingSphere();root.add(mesh);}continue;
   }
   const list=part==='cap'?fans.filter(f=>f.hat):fans,mesh=new THREE.InstancedMesh(geo,crowdMat,list.length);mesh.name='Crowd '+['seated','clapping','waving'][pose]+' '+part;
   list.forEach((fan,i)=>{mesh.setMatrixAt(i,fan.matrix);mesh.setColorAt(i,new THREE.Color(part==='skin'?fan.skin:part==='hair'?fan.hair:part==='pants'?0x394653:part==='shoes'?0x20272a:fan.tint));});
   mesh.computeBoundingSphere();root.add(mesh);
  }
 }
 // Padded perimeter, entry tunnels and sideline equipment are outside play.
 for(const side of [-1,1]){
  box(material(home.color),side*32.3,.78,0,.35,1.55,126);
  for(const z of [-56,56]){box(dark,side*32.4,1.4,z,.9,2.8,5);box(edge,side*32.1,2.9,z,.65,.25,5.6);}
  for(const z of [-14,14]){box(edge,side*29.8,.62,z,1,.12,7);for(const dz of [-2.8,2.8])box(steel,side*29.8,.31,z+dz,.11,.6,.12);}
  box(material(0xf3ede1),side*30,.66,-3,1.1,1.2,1.6);box(material(0xe98331),side*30,1.34,-3,.75,.18,1.15);
  for(const z of [-37,37]){
   post(side*46,20,z,40,.2);box(steel,side*46,39.6,z,8,.3,.8);
   for(let n=0;n<6;n++)for(let row=0;row<2;row++)box(light,side*46-3.3+n*1.3,39+row*.9,z,.85,.65,.45);
  }
 }
 const board=makeScoreboard(teams,homeIndex,()=>root.userData.disposed),screenMaterial=new THREE.MeshBasicMaterial({map:board.texture,color:board.texture?0xffffff:0x172d39,toneMapped:false});
 for(const side of [-1,1]){
  box(steel,0,28,side*94,41,17.2,1.2);box(dark,0,28,side*93.3,39.6,16.4,.32);
  for(const x of [-15,15]){post(x,13,side*94,26,.42);box(dark,x,7,side*94,1.6,14,1.7);}
  for(const y of [22,30])box(steel,0,y,side*94.6,31,.35,.4);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(38.4,16),screenMaterial);mesh.name='Live stadium scoreboard';mesh.position.set(0,28,side*92.99);mesh.rotation.y=side>0?Math.PI:0;root.add(mesh);
 }
 // Add collected architecture in a handful of instanced draws per material.
 for(const [geo,byMaterial] of items)for(const [m,matrices] of byMaterial){const mesh=new THREE.InstancedMesh(geo,m,matrices.length);matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();root.add(mesh);}
 root.userData={uniform,scoreboard:board,teams,index,cfg,homeIndex,homeTeamId:home.id,homeFanCount,awayFanCount:allFans.length-homeFanCount,fanCount:spectators.reduce((n,a)=>n+a.length,0),lastBoard:'',lastScores:null,cheerUntil:0,lastUpdate:-Infinity};
 return root;
}

export function updateStadiumBowl(bowl,time,game,reducedMotion=false){
 if(!bowl)return;const d=bowl.userData;d.uniform.time.value=reducedMotion?0:time;
 if(time<d.lastTime)d.cheerUntil=0;d.lastTime=time;
 const scores=game?.scores||[0,0];if(d.lastScores&&scores.some((s,i)=>s>d.lastScores[i]))d.cheerUntil=time+7;
 d.lastScores=[...scores];d.uniform.energy.value=reducedMotion?0:Math.max(0,Math.min(1,(d.cheerUntil-time)/3));
 if(time-d.lastUpdate>.25||time<d.lastUpdate){drawScoreboard(bowl,game);d.lastUpdate=time;}
}
