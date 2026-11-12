import * as THREE from '../../vendor/three.module.js';
import {PLAYER_PROFILES,PROFILE_SEASON,PROFILE_CHECKED} from './player-profiles.js?v=realism2026';
export {PROFILE_SEASON,PROFILE_CHECKED};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const defaults={QB:[75,225],WR:[73,200],TE:[77,250],RB:[71,215],LT:[77,315],LG:[76,315],C:[75,305],RG:[76,315],RT:[77,315],DT:[75,305],DE:[76,270],LB:[74,240],CB:[72,195],S:[73,205],PK:[73,200],K:[73,200],P:[75,215],LS:[75,240]};
export function athleteProfile(id,role='WR'){
 const record=PLAYER_PROFILES[String(id)],base=defaults[role]||defaults.WR,[height,weight]=record?[record.height,record.weight]:base;
 return {id:String(id??''),height,weight,face:record?.face||null,measured:!!record,mass:clamp(Math.pow(weight/base[1],.42),.86,1.18),heightYards:(height+3)/36};
}

// A shaped front surface over the sculpted head. Source UVs retain the athlete's
// actual eyes, facial hair and mouth; this is projection, not a 3D face scan.
export function portraitFaceGeometry(bounds){
 bounds=[bounds[0],Math.max(0,bounds[1]-bounds[3]*.16),bounds[2],bounds[3]*1.16];
 const positions=[],uv=[],local=[],indices=[],nx=28,ny=28;
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,v=j/ny,y=-.172+v*.345;
  const jaw=1-.12*Math.max(0,(-y-.055)/.12),x=(u-.5)*.30*jaw;
  const nose=.032*Math.exp(-((x/.031)**2+((y+.028)/.038)**2)),cheeks=.007*Math.exp(-(((Math.abs(x)-.075)/.04)**2+((y+.035)/.065)**2));
  const z=-.039-Math.sqrt(Math.max(.05,1-(x/.178)**2))*.188-nose-cheeks;
  positions.push(x,y,z);uv.push(bounds[0]+(1-u)*bounds[2],1-(bounds[1]+(1-v)*bounds[3]));local.push(u,v);
 }
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('faceUV',new THREE.Float32BufferAttribute(local,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function addPortraitFace(head,profile,root,fallback){
 if(!profile.face)return null;
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.84,metalness:0,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 material.name='Athlete portrait';
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec2 faceUV; varying vec2 vFaceUV;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvFaceUV=faceUV;');
  shader.fragmentShader='varying vec2 vFaceUV;\n'+shader.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a *= smoothstep(0.0,0.11,vFaceUV.x)*smoothstep(0.0,0.11,1.0-vFaceUV.x)*smoothstep(0.0,0.06,vFaceUV.y)*smoothstep(0.0,0.04,1.0-vFaceUV.y);\n#include <alphatest_fragment>');
 };
 material.customProgramCacheKey=()=> 'athlete-portrait-2026';
 const mesh=new THREE.Mesh(portraitFaceGeometry(profile.face),material);mesh.name='Portrait-projected face';mesh.visible=false;mesh.receiveShadow=true;head.add(mesh);
 if(typeof document!=='undefined'){
  const texture=new THREE.TextureLoader().load(new URL('faces/'+profile.id+'.webp',import.meta.url).href,()=>{if(root.userData.disposed){texture.dispose();return;}mesh.visible=true;if(fallback)fallback.visible=false;},undefined,()=>{texture.dispose();material.map=null;material.needsUpdate=true;});
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;material.map=texture;
 }
 return mesh;
}
