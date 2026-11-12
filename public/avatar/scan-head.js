import * as THREE from '../vendor/three.module.js';
import {positions,normals,uvs,indices} from './scan-data.js';

let assetImages=null,assetRequest=null;
function requestImages(){
 if(assetImages)return Promise.resolve(assetImages);
 if(!assetRequest)assetRequest=Promise.all(['Map-COL.jpg','Infinite-Level_02_Tangent_SmoothUV.jpg'].map(name=>new Promise((resolve,reject)=>new THREE.ImageLoader().load(new URL('./assets/'+name,import.meta.url).href,resolve,undefined,reject)))).then(images=>assetImages=images).catch(error=>{assetRequest=null;throw error;});
 return assetRequest;
}
export async function preloadAvatarSkin(){if(typeof window==='undefined')return;try{await requestImages();}catch(error){console.warn('Avatar skin textures could not load; using the shaded scan.',error);}}
function texture(image,color=false){const t=new THREE.Texture(image);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=4;t.needsUpdate=true;return t;}
function applySkinImages(material){
 if(typeof window==='undefined'||!document.createElementNS)return;
 let disposed=false;material.addEventListener('dispose',()=>disposed=true);
 const attach=images=>{if(disposed)return;const chosen=new THREE.Color(material.userData.skinTone),reference=new THREE.Color('#d6aa8e');material.color.setRGB(chosen.r/reference.r,chosen.g/reference.g,chosen.b/reference.b);material.map=texture(images[0],true);material.normalMap=texture(images[1]);material.normalScale.set(.65,.65);material.needsUpdate=true;};
 if(assetImages)attach(assetImages);else requestImages().then(attach).catch(()=>{});
}
function geometry(expression){
 const p=new Float32Array(positions.length),sourceNormals=new Float32Array(normals),kept=[];
 for(let i=0;i<positions.length;i+=3){
  let x=positions[i]*.133,y=positions[i+1]*.105+1.833,z=positions[i+2]*.105;if(y<1.76){const t=THREE.MathUtils.smoothstep(y,1.705,1.76),angle=Math.atan2(x,z);x=THREE.MathUtils.lerp(Math.sin(angle)*.09,x,t);z=THREE.MathUtils.lerp(Math.cos(angle)*.085,z,t);y=Math.max(1.705,y);}
  const mouth=Math.exp(-(((y-1.883)/.04)**2))*Math.exp(-(((z-.2)/.12)**2)),corner=Math.min(1,Math.abs(x)/.055);
  const smile=['smile','grin','wink'].includes(expression)?((expression==='grin'?.025:.012)*corner*corner*mouth):0;
  const opening=expression==='surprised'?.012:expression==='grin'?.005:0;
  p[i]=x;p[i+1]=y+smile+(y<1.883?-opening:opening*.3)*mouth;p[i+2]=z;
 }
 for(let i=0;i<indices.length;i+=3){const triangle=[indices[i],indices[i+1],indices[i+2]];if(triangle.every(id=>positions[id*3+1]>-1.45))kept.push(...triangle);}
 const remap=new Map(),compact=[],ns=[],tex=[],faces=[];for(const old of kept){if(!remap.has(old)){remap.set(old,remap.size);compact.push(...p.slice(old*3,old*3+3));ns.push(...sourceNormals.slice(old*3,old*3+3));tex.push(...uvs.slice(old*2,old*2+2));}faces.push(remap.get(old));}const points=new Float32Array(compact);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(points,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));g.setAttribute('scanPoint',new THREE.BufferAttribute(points.slice(),3));g.setIndex(faces);g.computeVertexNormals();g.computeBoundingBox();return g;
}
export function buildScannedHead(look,skin,helpers){
 const {mesh,ellipsoid,strand,irisTexture,eyeOpening}=helpers,head=new THREE.Group();head.name='Sculpted human head';
 const eyeOpen=new THREE.Vector2(look.expression==='sleepy'?0:1,['sleepy','wink'].includes(look.expression)?0:1);
 const mouthSize=look.expression==='surprised'?new THREE.Vector2(.023,.012):look.expression==='grin'?new THREE.Vector2(.04,.006):new THREE.Vector2(0,0);
 const material=new THREE.MeshPhysicalMaterial({color:look.skin,roughness:.64,metalness:0,clearcoat:.035,clearcoatRoughness:.5,normalScale:new THREE.Vector2(.65,.65)});
 // The reference map has its own skin color. Normalize its tint so every saved
 // tone still controls the face rather than multiplying two skin colors.
 material.userData.skinTone=look.skin;
 material.onBeforeCompile=shader=>{
  shader.uniforms.scanEyeOpen={value:eyeOpen};shader.uniforms.scanMouthSize={value:mouthSize};shader.uniforms.scanSkinTone={value:new THREE.Color(look.skin)};
  shader.vertexShader='attribute vec3 scanPoint; varying vec3 vScanPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvScanPoint = scanPoint;');
  shader.fragmentShader='varying vec3 vScanPoint; uniform vec2 scanEyeOpen; uniform vec2 scanMouthSize; uniform vec3 scanSkinTone;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   if(vScanPoint.z > .065){
    float eyeX=abs(vScanPoint.x+.015)-.083;
    float eyeY=vScanPoint.y-2.011;
    float openness=vScanPoint.x<-.015?scanEyeOpen.x:scanEyeOpen.y;
    float eyeWidth=.036;
    float halfHeight=(eyeY>0.0?.011:.008)*openness;
    if(openness>.02 && abs(eyeX)<eyeWidth && abs(eyeY)<halfHeight*pow(max(0.0,1.0-pow(eyeX/eyeWidth,2.0)),.62))discard;
    if(scanMouthSize.x>0.0 && pow(vScanPoint.x/scanMouthSize.x,2.0)+pow((vScanPoint.y-1.883)/scanMouthSize.y,2.0)<1.0)discard;
   }`);shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb,scanSkinTone,1.0-smoothstep(1.705,1.76,vScanPoint.y));');
 };
 material.customProgramCacheKey=()=> 'archerbox-scanned-face-v1';
 mesh(head,geometry(look.expression),material,0,0,0,'Scan face');applySkinImages(material);
 const white=new THREE.MeshPhysicalMaterial({color:'#dad9d2',roughness:.3,clearcoat:.55}),iris=new THREE.MeshPhysicalMaterial({map:irisTexture(),roughness:.2,clearcoat:.9}),pupil=new THREE.MeshStandardMaterial({color:'#101711',roughness:.18});
 const eyes=[];
 for(const side of [-1,1]){
  const closed=look.expression==='sleepy'||look.expression==='wink'&&side===1;if(closed)continue;
  const eye=new THREE.Group();eye.name=side<0?'Left eye':'Right eye';eye.position.set(-.015+side*.083,2.011,.185);head.add(eye);
  // The photographed lids remain on the scan. Whites and irises sit inside its
  // animated opening, with a reflective clear cornea above them.
  const sclera=mesh(eye,eyeOpening(),white,0,0,-.004,'Almond sclera');sclera.scale.set(1.15,.95,1);
  mesh(eye,new THREE.CircleGeometry(.014,40),iris,0,0,-.0025,'Radial iris');mesh(eye,new THREE.CircleGeometry(.0052,24),pupil,0,0,-.0018,'Pupil');
  ellipsoid(eye,new THREE.MeshPhysicalMaterial({color:'#fff',transparent:true,opacity:.08,roughness:.045,clearcoat:1,depthWrite:false}),0,0,-.002,.034,.014,.008,'Corneal highlight');
  ellipsoid(eye,new THREE.MeshBasicMaterial({color:'#fff9e8'}),-.003,.004,.002,.0014,.0012,.0005,'Eye catchlight');eyes.push(eye);
 }
 if(mouthSize.x){
  ellipsoid(head,new THREE.MeshStandardMaterial({color:'#382421',roughness:1}),0,1.883,.18,mouthSize.x*1.1,mouthSize.y*1.2,.015,'Mouth interior');
  if(look.expression==='grin')for(let i=0;i<8;i++)ellipsoid(head,white,(i-3.5)*.0085,1.886,.207,.004,.004,.002,'Tooth');
 }
 head.userData.eyes=eyes;head.userData.scanMaterial=material;
 head.userData.animate=time=>{const phase=time%4.6,blink=phase>4.36?Math.max(.015,Math.abs((phase-4.48)/.12)):1;eyeOpen.set(look.expression==='sleepy'?0:blink,['sleepy','wink'].includes(look.expression)?0:blink);for(const eye of eyes)eye.scale.y=blink;};
 return head;
}
