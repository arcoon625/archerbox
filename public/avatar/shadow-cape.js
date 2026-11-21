import * as THREE from '../vendor/three.module.js';
import {roundedBox,surface} from './surfaces.js?v=scan2';

function capeTexture(item){
 const canvas=document.createElement('canvas');
 canvas.width=256;
 canvas.height=384;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle=item.color;
 ctx.fillRect(0,0,256,384);
 ctx.strokeStyle=item.accent;
 ctx.globalAlpha=.28;
 ctx.setLineDash([3,4]);
 ctx.lineWidth=1.7;
 ctx.strokeRect(8,7,240,361);
 ctx.setLineDash([]);
 ctx.globalAlpha=1;
 ctx.save();
 ctx.translate(128,157);
 ctx.fillStyle=item.accent;
 ctx.beginPath();
 if(item.pattern==='moon'){
  ctx.moveTo(22,-52);
  ctx.bezierCurveTo(-70,-56,-76,55,-3,57);
  ctx.bezierCurveTo(34,58,54,40,57,17);
  ctx.bezierCurveTo(6,41,-32,-11,22,-52);
 }else if(item.pattern==='bolt'){
  ctx.moveTo(11,-57);
  ctx.lineTo(-42,5);ctx.lineTo(-7,5);ctx.lineTo(-23,58);
  ctx.lineTo(43,-13);ctx.lineTo(8,-13);
 }else{
  ctx.moveTo(-47,-3);
  ctx.bezierCurveTo(-47,-58,47,-58,47,-3);
  ctx.lineTo(47,44);ctx.lineTo(24,28);ctx.lineTo(0,44);ctx.lineTo(-24,28);ctx.lineTo(-47,44);
 }
 ctx.closePath();
 ctx.fill();
 ctx.globalAlpha=.44;
 ctx.lineWidth=2;
 ctx.strokeStyle='#faf0f3';
 ctx.setLineDash([2,3]);
 ctx.stroke();
 ctx.globalAlpha=1;
 if(item.pattern==='ghost'){
  ctx.fillStyle=item.color;
  for(const x of [-17,17])ctx.fillRect(x-5,-14,10,16);
 }
 ctx.restore();
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}

function mistTexture(){
 const size=32,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4;
  const distance=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1);
  pixels[i]=pixels[i+1]=pixels[i+2]=255;
  pixels[i+3]=Math.round(255*Math.max(0,1-distance)**1.45);
 }
 const texture=new THREE.DataTexture(pixels,size,size);
 texture.minFilter=texture.magFilter=THREE.LinearFilter;
 texture.needsUpdate=true;
 return texture;
}

const columns=18;
const tornHem=[.02,.07,.018,.10,.024,.16,.02,.14,.03,.072,.035,.135,.021,.17,.04,.10,.017,.092,.033];

export function attachShadowCape(root,item){
 const geometry=new THREE.PlaneGeometry(1,1,columns,16);
 const cloth=surface('#ffffff','cotton',{map:capeTexture(item),side:THREE.DoubleSide,roughness:.93});
 const cape=new THREE.Mesh(geometry,cloth);
 cape.name='Torn cape cloth';
 cape.castShadow=true;
 cape.frustumCulled=false;
 root.add(cape);
 const claspMat=surface(item.accent,'metal',{metalness:.45,roughness:.52});
 for(const side of [-1,1]){
  const clasp=new THREE.Mesh(roundedBox(.1,.052,.16),claspMat);
  clasp.name='Cape shoulder clasp';
  clasp.position.set(side*.239,1.511,-.182);
  clasp.rotation.z=side*.18;
  root.add(clasp);
 }
 const texture=mistTexture();
 const wisps=Array.from({length:7},()=>{
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#594568',opacity:0,depthWrite:false}));
  sprite.name='Cape smoke';
  sprite.scale.setScalar(.16);
  sprite.position.set(0,.45,-.40);
  sprite.visible=false;
  root.add(sprite);
  return sprite;
 });
 const positions=geometry.getAttribute('position');
 const uv=geometry.getAttribute('uv');
 root.userData.animate=(time,moving=false)=>{
  for(let index=0;index<positions.count;index++){
   const u=uv.getX(index),fall=1-uv.getY(index),width=u-.5;
   const airflow=fall*fall*(moving?.32:0);
   const sway=Math.sin(time*(moving?6:2.4)-fall*4+u*2.1)*fall*(moving?.071:.022);
   const fold=(Math.cos(u*23)*.014+Math.abs(width)*.075)*fall;
   const rip=tornHem[index%(columns+1)]*fall**5;
   positions.setXYZ(index,width*(.55+.30*fall)+sway*.43,1.51-fall*1.16+rip+airflow*.32,-.232-fold-fall*.063-airflow+sway);
  }
  positions.needsUpdate=true;
  geometry.computeVertexNormals();
  for(const [index,wisp] of wisps.entries()){
   wisp.visible=moving;
   if(!moving)continue;
   const phase=(time*.77+index/wisps.length)%1;
   const side=(index/6-.5)*.66;
   wisp.position.set(side+Math.sin(index*3+phase*3)*phase*.12,.43+phase*.20,-.55-phase*.56);
   wisp.scale.setScalar(.13+phase*.22);
   wisp.material.opacity=.53*(1-phase);
  }
 };
 root.userData.animate(0);
}
