import * as THREE from '../../vendor/three.module.js';
import {ROAD_WIDTH} from './race.js?v=easy1';
function banner(text,color='#ecf0ee',background='#24313a'){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle=background;c.fillRect(0,0,1024,256);c.strokeStyle=color;c.lineWidth=5;c.strokeRect(12,12,1000,232);c.font='bold 90px Arial';c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(text,512,132,960);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide})}
function grainTexture(kind){
 const n=256,d=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,seed=Math.sin(x*127.1+y*311.7)*43758.5453,noise=seed-Math.floor(seed);let v=kind==='asphalt'?130+noise*80:155+noise*75;if(kind==='asphalt'&&noise>.96)v+=30;d[i]=v;d[i+1]=v;d[i+2]=v;d[i+3]=255}
 const t=new THREE.DataTexture(d,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='asphalt'?7:14,kind==='asphalt'?135:120);t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;return t;
}
export function buildWorld(track,index){
 const root=new THREE.Group(),config=track.config,asphalt=grainTexture('asphalt'),grain=grainTexture('gravel');
 const material=(color,roughness=.85,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const roadMat=new THREE.MeshStandardMaterial({color:index===2?0x46505b:0x35383c,roughness:.88,map:asphalt,bumpMap:asphalt,bumpScale:.028});
 const metal=material(0x8a949b,.42,.8),dark=material(0x20272c,.5,.6),red=material(index===2?0x416eab:0xb64133),white=material(0xdadbd3),concrete=new THREE.MeshStandardMaterial({color:0x8b8b83,map:grain,bumpMap:grain,bumpScale:.04,roughness:.96}),groundMat=new THREE.MeshStandardMaterial({color:config.ground,map:grain,bumpMap:grain,bumpScale:.08,roughness:1}),gravel=new THREE.MeshStandardMaterial({color:index===2?0xb8c7cd:index===1?0xae9476:0x777b73,map:grain,roughness:1});
 const accent=new THREE.MeshStandardMaterial({color:config.color,emissive:config.color,emissiveIntensity:.7});
 const windowMat=[new THREE.MeshStandardMaterial({color:0x344857,metalness:.75,roughness:.24}),new THREE.MeshStandardMaterial({color:0x89a5ad,emissive:0x68878e,emissiveIntensity:.45}),new THREE.MeshStandardMaterial({color:0xcac4a6,emissive:0xada077,emissiveIntensity:.55})];
 const add=(geo,mat,x=0,y=0,z=0,parent=root)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
 const box=(x,y,z,w,h,d,mat,parent=root)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
 const at=(s,lane=0,height=0)=>{const a=track.sample(s);return {a,p:a.p.clone().addScaledVector(a.right,lane).add(new THREE.Vector3(0,height,0))}};
 const place=(s,lane=0)=>{const {a,p}=at(s,lane);const g=new THREE.Group();g.position.copy(p);g.rotation.y=a.yaw;root.add(g);return g};
 // Continuous ribbons follow the same road surface used by the driving physics.
 function ribbon(left,right,mat,height=.015,drop=false){const positions=[],uv=[],indices=[],segments=600;for(let i=0;i<=segments;i++){const a=track.sample(i/segments*track.length);for(const lane of [left,right]){const p=a.p.clone().addScaledVector(a.right,lane);p.y=drop&&Math.abs(lane)>15?-3:p.y+height;positions.push(p.x,p.y,p.z);uv.push((lane-left)/(right-left),i/segments)}}for(let i=0;i<segments;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return add(geo,mat)}
 ribbon(-ROAD_WIDTH/2,ROAD_WIDTH/2,roadMat,0);
 function guardrail(side){
  const profile=[[.22,0],[.3,.08],[.43,-.04],[.55,.08],[.68,-.04],[.77,0]],pos=[],uv=[],ids=[],n=profile.length,segments=360;
  for(let i=0;i<=segments;i++){const a=track.sample(i/segments*track.length);for(const [height,out]of profile){const p=a.p.clone().addScaledVector(a.right,side*(11.9+out));pos.push(p.x,p.y+height,p.z);uv.push(i/segments,height)}}
  for(let i=0;i<segments;i++)for(let j=0;j<n-1;j++){const a=i*n+j;ids.push(a,a+n,a+1,a+1,a+n,a+n+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();const mat=metal.clone();mat.side=THREE.DoubleSide;add(g,mat);
 }
 for(const side of [-1,1]){
  const range=(a,b)=>[Math.min(side*a,side*b),Math.max(side*a,side*b)];
  ribbon(...range(9,9.65),white,.02);ribbon(...range(9.65,13.5),gravel,-.1);ribbon(...range(13.5,22),groundMat,-.15,true);
  // Corrugated galvanized barriers with a double ridge, plus vertical support posts.
  guardrail(side);
  for(let s=0;s<track.length;s+=6){const {a,p}=at(s,side*11.9,.36);const post=box(p.x,p.y,p.z,.12,.88,.13,metal);post.rotation.y=a.yaw}
  for(let s=0;s<track.length;s+=2){const {a,p}=at(s,side*9.35,.04);const kerb=box(p.x,p.y,p.z,.55,.09,2.05,Math.floor(s/2)%2?white:red);kerb.rotation.y=a.yaw}
  ribbon(...range(8.56,8.68),white,.026);
 }
 // Worn lane markings, start boxes and rubber deposited along the racing line.
 const tireMark=new THREE.MeshStandardMaterial({color:0x141719,transparent:true,opacity:.22,depthWrite:false,roughness:1});
 for(let s=0;s<track.length;s+=7){const {a,p}=at(s,0,.025),line=box(p.x,p.y,p.z,.12,.008,2.7,white);line.rotation.y=a.yaw}
 for(let s=0;s<track.length;s+=1.4){const a=track.sample(s),b=track.sample(s+8),bend=Math.abs(Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw)));if(bend>.16){for(const lane of [-3.2,-2.8]){const {a,p}=at(s,lane,.028),m=box(p.x,p.y,p.z,.16,.004,1.5,tireMark);m.rotation.y=a.yaw}}}
 const terrain=add(new THREE.PlaneGeometry(650,650),groundMat,0,-3.02,0);terrain.rotation.x=-Math.PI/2;
 for(const marker of track.pads){for(let j=-2;j<=2;j++){const {a,p}=at(marker+j*.75,0,.055),strip=box(p.x,p.y,p.z,12.8,.035,.24,accent);strip.rotation.y=a.yaw}const {a,p}=at(marker,0,.077),label=add(new THREE.PlaneGeometry(4,1),banner('BOOST',config.color,'#243444'),p.x,p.y,p.z);label.rotation.set(-Math.PI/2,0,-a.yaw)}
 // Segmented ramps match the curved launch profile rather than a floating flat plank.
 for(const marker of track.ramps){const vertices=[],uv=[],ids=[];for(let j=0;j<=16;j++){const s=marker-8+j*.5,{a,p}=at(s,0,1.8*(j/16)**2+.035);for(const side of [-1,1]){const q=p.clone().addScaledVector(a.right,side*6.3);vertices.push(q.x,q.y,q.z);uv.push((side+1)/2,j/16)}}for(let j=0;j<16;j++){const a=j*2;ids.push(a,a+1,a+2,a+1,a+3,a+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();add(g,concrete);for(const side of [-1,1])for(let j=0;j<16;j++){const {a,p}=at(marker-8+j*.5,side*6.12,1.8*(j/16)**2+.09);const m=box(p.x,p.y,p.z,.12,.1,.55,j%2?dark:accent);m.rotation.y=a.yaw}}
 const line=at(0);for(let across=-8;across<=8;across+=1.6)for(let row=0;row<2;row++){const {a,p}=at(row*.8,across,.03),square=box(p.x,p.y,p.z,1.6,.018,.8,(Math.round(across/1.6)+row)%2?white:dark);square.rotation.y=a.yaw}
 for(let grid=0;grid<6;grid++){const group=place(-grid*4.4,grid%2===0?-3:3);for(const side of [-1,1])box(side*1.1,.03,.05,.08,.01,2.7,white,group);box(0,.03,-1.3,2.2,.01,.08,white,group)}
 // Steel start gantry, braces, signal lamps and the overhead race banner.
 const arch=place(0);for(const side of [-1,1]){box(side*10.5,3.6,0,.45,7.2,.45,metal,arch);box(side*10.5,.12,0,1,.25,1,concrete,arch)}box(0,7.3,0,21.5,.3,.6,metal,arch);box(0,6.6,0,21,1.1,.4,dark,arch);const sign=add(new THREE.PlaneGeometry(17,.95),banner('TURBO KART CIRCUIT',config.color,'#202c33'),0,6.6,.23,arch);for(let x=-1.2;x<=1.2;x+=.6){const lamp=add(new THREE.CylinderGeometry(.16,.16,.1,12),accent,x,5.73,.2,arch);lamp.rotation.x=Math.PI/2}
 // Track lamps and marker boards sit outside the driving corridor.
 for(let s=12;s<track.length;s+=29){const g=place(s,-14.2);box(0,4.4,0,.12,8.8,.12,metal,g);box(1.15,8.73,0,2.4,.12,.14,metal,g);box(2.25,8.65,0,.8,.16,.55,dark,g);box(2.25,8.55,0,.65,.018,.45,new THREE.MeshBasicMaterial({color:0xffe5b6}),g)}
 for(let i=0;i<8;i++){const s=(i+.6)/8*track.length,g=place(s,-13.6);box(0,1.1,0,.065,2.2,.065,metal,g);const sign=add(new THREE.PlaneGeometry(2.1,.85),banner(i%2?'>>>':'TURBO',i%2?'#e8d9a6':'#eef2ef','#273138'),0,1.85,0,g)}
 // Pit garages and covered grandstand give every arena a real circuit paddock.
 const pit=place(track.length*.045,23);box(0,-.65,0,11,1.3,28,concrete,pit);box(0,1.9,0,9,3.8,27,concrete,pit);box(0,4.7,0,9,1.8,27,dark,pit);box(-4.52,4.65,0,.04,1.35,25,windowMat[0],pit);box(0,5.7,0,10,.25,28,metal,pit);
 for(let z=-10;z<=10;z+=5){box(-4.57,1.55,z,.055,2.65,3.8,dark,pit);for(let y=.4;y<2.9;y+=.25)box(-4.61,y,z,.026,.035,3.8,metal,pit);box(-4.65,3.18,z,.07,.13,3.9,accent,pit)}
 const pitSign=add(new THREE.PlaneGeometry(16,1.25),banner('PIT LANE / TURBO MOTORSPORT'),-4.58,4.8,0,pit);pitSign.rotation.y=-Math.PI/2;
 const stand=place(track.length*.13,-25);box(0,-1,0,12,2,26,concrete,stand);for(let row=0;row<5;row++){box(4-row*1.7,row*.65,0,1.75,.7,25,concrete,stand);for(let z=-11;z<=11;z+=1.2){box(4-row*1.7,row*.65+.47,z,.63,.15,.78,row%2?red:white,stand);box(4-row*1.7-.28,row*.65+.77,z,.13,.5,.78,row%2?red:white,stand)}}for(const z of [-12,12])for(const x of [-5,5])box(x,3.15,z,.14,6.3,.14,metal,stand);box(0,6.3,0,13,.2,28,metal,stand);
 // Irregular rock surfaces replace simple cylinders and cones.
 const stoneTexture=grainTexture('stone');stoneTexture.repeat.set(3,3);
 const stoneMat=new THREE.MeshStandardMaterial({vertexColors:true,map:stoneTexture,bumpMap:stoneTexture,bumpScale:.055,roughness:1});
 function rock(x,y,z,sx,sy,sz,seed,snow=false){
  let g;
  if(index===1){
   const vertices=[],uv=[],ids=[],sides=48,rings=18;
   for(let j=0;j<=rings+1;j++){const t=Math.min(j/rings,1),height=t*2-1;for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,ledge=Math.sin(Math.floor(t*8)*2+seed)*.035,rough=Math.sin(a*5+seed)*.08+Math.sin(a*9-seed)*.035;const radius=j>rings?0:(1-t*.43+ledge)*(1+rough);vertices.push(Math.cos(a)*radius,height+Math.sin(a*4+seed)*.02,Math.sin(a)*radius);uv.push(k/sides,t)}}
   for(let j=0;j<=rings;j++)for(let k=0;k<sides;k++){const a=j*(sides+1)+k,b=a+sides+1;ids.push(a,b,a+1,a+1,b,b+1)}g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();
  }else if(snow){g=new THREE.ConeGeometry(1,2,48,20);const p=g.attributes.position;for(let i=0;i<p.count;i++){const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i),a=Math.atan2(vz,vx),n=Math.sin(a*7+seed)*.12+Math.sin(a*13+vy*5)*.045;p.setXYZ(i,vx*(1+n),vy+Math.sin(a*4+seed)*.12*(1-vy)/2,vz*(1+n))}g.computeVertexNormals();}
  else{g=new THREE.IcosahedronGeometry(1,4);const p=g.attributes.position;for(let i=0;i<p.count;i++){const vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i),n=Math.sin(vx*9+seed)*Math.cos(vz*7-seed)*.1+Math.sin(vy*13+seed)*.04;p.setXYZ(i,vx*(1+n),vy*(1+n),vz*(1+n))}}
  const pos=g.attributes.position,colors=[],base=new THREE.Color(index===1?0xa88059:index===2?0x657a86:0x473e3b),snowColor=new THREE.Color(0xe7eff0);
  for(let i=0;i<pos.count;i++){const vx=pos.getX(i),vy=pos.getY(i),vz=pos.getZ(i),n=Math.sin(vy*39+seed)*.055+Math.sin(vx*11+vz*8)*.025;const c=base.clone().multiplyScalar(.95+n);if(snow&&vy>.05+Math.sin(vx*8+vz*3)*.12)c.copy(snowColor).multiplyScalar(.98+n);colors.push(c.r,c.g,c.b)}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const m=add(g,stoneMat,x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=seed*.37;return m;
 }
 const buildingMat=[material(0x34424c),material(0x535b5f),material(0x28333d)];
 for(let i=0;i<32;i++){const s=(i+.37)/32*track.length,{p}=at(s,-(30+(i%3)*9));
  if(index===0){const g=place(s,-(32+(i%3)*9)),h=14+(i%6)*6;box(0,h/2-3,0,9,h,10,buildingMat[i%3],g);box(0,h-2.7,0,9.5,.6,10.5,concrete,g);box(1,h-1.5,1,3,2,2.5,metal,g);for(let y=1;y<h-4;y+=2.8){box(0,y,5.03,9,.1,.04,metal,g);for(let x=-3.2;x<=3.2;x+=1.6)box(x,y+1.1,5.04,1.1,1.8,.04,windowMat[(i+Math.round(y)+Math.round(x))%3<0?0:Math.abs(i+Math.round(y)+Math.round(x))%3],g)}for(let y=2;y<h-3;y+=5.6)box(-4.53,y,0,.03,1.8,8,windowMat[0],g)}
  if(index===1){rock(p.x,p.y+2,p.z,7+i%4,8+i%5,5+i%3,i);const dune=add(new THREE.SphereGeometry(18,24,12),groundMat,p.x*1.23,-2,p.z*1.23);dune.scale.y=.14}
  if(index===2)rock(p.x,p.y+5,p.z,14+i%4,17+i%7*2,13+i%3,i,true);
  if(index===3)rock(p.x,p.y,p.z,7+i%4,8+i%6,6+i%3,i);
 }
 if(index===3){
  // A rough crater with an actual recessed glowing lava basin and lava seams.
  const g=new THREE.CylinderGeometry(13,29,22,64,14,true),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),n=Math.sin(a*11)*.6+Math.cos(a*7+y*.8)*.4;p.setXYZ(i,x*(1+n*.07),y+n*.6,z*(1+n*.07))}g.computeVertexNormals();add(g,new THREE.MeshStandardMaterial({color:0x403a36,map:grain,bumpMap:grain,bumpScale:.18,roughness:1}),0,5,0);
  const lava=new THREE.MeshStandardMaterial({color:0xff7c24,emissive:0xff4810,emissiveIntensity:1.1,map:grain});const molten=add(new THREE.CircleGeometry(12.7,64),lava,0,15.85,0);molten.rotation.x=-Math.PI/2;
  for(let i=0;i<15;i++){const angle=i/15*Math.PI*2;rock(Math.cos(angle)*12.6,16,Math.sin(angle)*12.6,2.1,1.2,1.7,i)}
  const embers=[];for(let i=0;i<90;i++)embers.push((Math.random()-.5)*18,18+Math.random()*15,(Math.random()-.5)*18);root.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(embers,3)),new THREE.PointsMaterial({color:0xffbd78,size:.13})));
 }
 // Shared-material box details are instanced, including child buildings and pit seating.
 root.updateMatrixWorld(true);const batches=new Map();root.traverse(o=>{if(o.isMesh&&o.geometry.type==='BoxGeometry'){const key=o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o)}});for(const group of batches.values())if(group.length>=5){const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),group[0].material,group.length);batch.castShadow=true;batch.receiveShadow=true;group.forEach((o,i)=>{const p=o.geometry.parameters;batch.setMatrixAt(i,o.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(p.width,p.height,p.depth)));o.parent.remove(o);o.geometry.dispose()});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();root.add(batch)}
 return root;
}
// A simple studio sky provides reflections on metal and glossy kart paint without external assets.
export function makeEnvironment(index){const faces=[];for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,64);g.addColorStop(0,index===0?'#7388a4':index===3?'#9c7c77':'#a3c7df');g.addColorStop(.48,index===0?'#b8bdc0':'#ece9dc');g.addColorStop(.55,'#55595a');g.addColorStop(1,'#34393c');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);faces.push(c)}const t=new THREE.CubeTexture(faces);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t}
