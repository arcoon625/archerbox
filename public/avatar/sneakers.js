import * as THREE from '../vendor/three.module.js';
import {surface} from './surfaces.js?v=scan2';

export const isSneaker=item=>['sneakers','hightops','runners','skate','ledsneakers','retrohigh'].includes(item.kind);

function mesh(parent,geometry,material){
 const part=new THREE.Mesh(geometry,material);
 parent.add(part);
 return part;
}

function cord(parent,material,points,radius=.004){
 return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),9,radius,5,false),material);
}

// Cross sections follow the heel, narrow at the arch, then widen over the toes.
const outline=[
 [-.153,.022],[-.143,.092],[-.112,.135],[-.058,.145],[.030,.120],[.094,.121],
 [.176,.139],[.252,.144],[.314,.130],[.358,.099],[.386,.050],[.394,.009]
];
const upperProfile=[[0,.0],[.047,.14],[.13,.215],[.25,.222],[.38,.194],[.5,.174],[.68,.129],[.85,.101],[.94,.072],[1,0]];
function interpolate(values,t){
 for(let i=1;i<values.length;i++){
  const [b,y]=values[i], [a,x]=values[i-1];
  if(t<=b)return THREE.MathUtils.lerp(x,y,THREE.MathUtils.clamp((t-a)/(b-a),0,1));
 }
 return values.at(-1)[1];
}

function shell(parent,material,profile){
 const segments=28,ring=24,positions=[],indices=[],uv=[];
 for(let i=0;i<=segments;i++){
  const t=i/segments;
  const z=THREE.MathUtils.lerp(outline[0][0],outline.at(-1)[0],t);
  const width=interpolate(outline,z);
  for(let j=0;j<=ring;j++){
   const theta=j/ring*Math.PI*2;
   const [x,y]=profile(t,width,theta);
   positions.push(x,y,z);uv.push(j/ring,t);
   if(i<segments&&j<ring){
    const a=i*(ring+1)+j,b=a+ring+1;
    indices.push(a,a+1,b,b,a+1,b+1);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 return mesh(parent,geometry,material);
}

function sole(parent,material,y,thickness,widthFactor){
 return shell(parent,material,(t,width,theta)=>{
  const uphill=Math.max(0,t-.82)*.095;
  return [Math.cos(theta)*width*widthFactor,y+uphill+Math.sin(theta)*thickness];
 });
}

export function buildSneaker(leg,item){
 const retro=item.kind==='retrohigh';
 const tall=item.kind==='hightops'||retro;
 const running=item.kind==='runners'||item.kind==='ledsneakers';
 const primary=surface(retro?item.accent:item.color,running?'cotton':(tall?'leather':'cotton'));
 const trim=surface(retro?item.color:item.accent,'leather');
 const rubber=surface(running?'#353b42':'#544740','rubber');
 const foam=surface(item.pattern==='lava'?'#211d22':retro?'#efdfcf':'#e9e4d9','rubber');
 const laces=surface(retro?'#faf1e3':item.accent,'cotton');
 const height=t=>interpolate(upperProfile,t)+(tall?.149*Math.exp(-((t-.23)**2)/.026):0);
 const base=-.759;
 const shoe=shell(leg,primary,(t,w,theta)=>[Math.cos(theta)*w*.95,base+Math.sin(theta)*Math.max(.008,height(t))*(Math.sin(theta)>=0?1:.15)]);
 shoe.name='Shaped sneaker upper';
 sole(leg,rubber,-.796,.027,1.02).name='Rubber outsole';
 sole(leg,foam,-.765,running?.031:.023,1.035).name='Cushioned midsole';

 function onUpper(t,theta,offset=.003){
  const z=THREE.MathUtils.lerp(outline[0][0],outline.at(-1)[0],t);
  return [Math.cos(theta)*(interpolate(outline,z)*.95+offset),base+Math.sin(theta)*(Math.max(.008,height(t))+offset),z];
 }
 if(retro){
  // Stitch contrasting leather over the base upper, following the same last as the shoe.
  for(const [start,end,fromAngle,toAngle] of [
   [.064,.336,.04,Math.PI-.04],
   [.691,.962,.06,.53],
   [.691,.962,Math.PI-.53,Math.PI-.06]
  ]){
   const positions=[],indices=[],uv=[],steps=12;
   for(let i=0;i<=steps;i++)for(let j=0;j<=steps;j++){
    const angle=THREE.MathUtils.lerp(fromAngle,toAngle,j/steps);
    const t=THREE.MathUtils.lerp(start,end,i/steps);
    positions.push(...onUpper(t,angle,.0045));
    uv.push(j/steps,i/steps);
    if(i<steps&&j<steps){
     const a=i*(steps+1)+j,b=a+steps+1;
     indices.push(a,a+1,b,b,a+1,b+1);
    }
   }
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
   geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
   geometry.setIndex(indices);geometry.computeVertexNormals();
   mesh(leg,geometry,trim).name='Leather reinforcement';
  }
 }
 for(const sign of [-1,1]){
  const angle=deg=>sign===1?deg:Math.PI-deg;
  const stripe=Array.from({length:6},(_,i)=>onUpper(.22+i*.096,angle(.36+Math.sin(i*.8)*.18)));
  cord(leg,trim,stripe,running?.013:.010);
  cord(leg,laces,Array.from({length:6},(_,i)=>onUpper(.23+i*.095,angle(.24+Math.sin(i*.8)*.15))),.0018);
  cord(leg,trim,Array.from({length:6},(_,i)=>onUpper(.10+i*.063,angle(.78+i*.043))),tall?.011:.006);
  const graphics=['lava','wave','stars','circuit','candy','pixel','comet'];
  if(graphics.includes(item.pattern)){
   const ink=item.pattern==='circuit'?new THREE.MeshStandardMaterial({color:item.accent,emissive:item.accent,emissiveIntensity:.24}):trim;
   for(let i=0;i<4;i++){
    const t=.31+i*.102;
    if(['stars','candy','pixel'].includes(item.pattern)){
     const detail=mesh(leg,new THREE.SphereGeometry(.008,7,5),ink);
     detail.position.fromArray(onUpper(t,angle(.62+(i%2)*.15),.008));
    }else{
     const base=.64+(i%2)*.13;
     cord(leg,ink,[onUpper(t-.030,angle(base)),onUpper(t,angle(base+.10)),onUpper(t+.029,angle(base-.043))],.0038);
    }
   }
  }
  if(retro||running)for(let i=0;i<6;i++){
   const t=.41+i*.044;
   cord(leg,trim,[onUpper(t-.021,angle(.28)),onUpper(t,angle(.45)),onUpper(t+.01,angle(.61))],.0033);
  }
 }
 for(let i=0;i<6;i++){
  const t=.34+i*.066;
  const a=onUpper(t,1.04,.009),b=onUpper(t+.027,2.1,.009);
  for(const p of [a,b]){
   const eyelet=mesh(leg,new THREE.TorusGeometry(.0075,.0018,5,12),trim);
   eyelet.position.fromArray(p);eyelet.rotation.x=-Math.PI/2;
  }
  cord(leg,laces,[a,onUpper(t+.013,Math.PI/2,.011),b],.0044);
 }
 // The stitched toe overlay wraps across the whole toe box.
 cord(leg,trim,Array.from({length:13},(_,i)=>onUpper(.798+Math.sin(i/12*Math.PI)*.097,i/12*Math.PI)),.004);
 for(let i=0;i<6;i++){
  const z=-.09+i*.072;
  const w=interpolate(outline,z);
  for(const side of [-1,1])cord(leg,rubber,[[side*.016,-.812,z],[side*w*.49,-.814,z+.018],[side*w*.71,-.806,z+.025]],.008);
 }
 if(item.kind==='ledsneakers'){
  const lights=[];
  const colors=['#88dbff','#7054ff','#ff74d8','#74fabb'];
  for(const side of [-1,1]) for(let i=0;i<7;i++){
   const z=-.095+i*.061,color=colors[i%colors.length];
   const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.34,roughness:.26});
   lights.push(material);
   const diode=mesh(leg,new THREE.BoxGeometry(.012,.016,.039),material);
   diode.position.set(side*interpolate(outline,z)*1.05,-.768,z);
  }
  return (time,moving,phase)=>{
   const flash=moving ? Math.pow(Math.max(0,Math.sin(time*10+phase)),4) : 0;
   lights.forEach((light,i)=>{light.emissiveIntensity=.34+flash*(i%2===0?2.9:1.8);});
  };
 }
 return null;
}
