import * as THREE from '../vendor/three.module.js';

function drawIcon(ctx,sport,x,y){
 ctx.save();
 ctx.translate(x,y);
 ctx.strokeStyle='#69411e';
 ctx.lineWidth=5;
 ctx.lineJoin='round';
 ctx.lineCap='round';
 const path=points=>{
  ctx.beginPath();ctx.moveTo(...points[0]);
  for(const p of points.slice(1))ctx.lineTo(...p);
  ctx.stroke();
 };
 const ball=color=>{
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,31,0,Math.PI*2);ctx.fill();ctx.stroke();
 };
 if(sport==='basketball'){
  ball('#e8994b');
  path([[-30,0],[30,0]]);path([[0,-30],[0,30]]);
  ctx.beginPath();ctx.moveTo(-25,-17);ctx.quadraticCurveTo(0,-3,-25,17);ctx.moveTo(25,-17);ctx.quadraticCurveTo(0,3,25,17);ctx.stroke();
 }else if(sport==='football'){
  ctx.rotate(-Math.PI*.23);
  ctx.fillStyle='#a05832';ctx.beginPath();ctx.moveTo(-37,0);ctx.quadraticCurveTo(0,-47,37,0);ctx.quadraticCurveTo(0,47,-37,0);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#fff0c6';path([[-14,0],[14,0]]);
  for(const tick of [-9,0,9])path([[tick,-6],[tick,6]]);
 }else if(sport==='baseball'){
  ball('#fff4df');ctx.strokeStyle='#a64738';
  ctx.beginPath();ctx.moveTo(-20,-23);ctx.quadraticCurveTo(-5,0,-20,23);ctx.moveTo(20,-23);ctx.quadraticCurveTo(5,0,20,23);ctx.stroke();
  for(const side of [-1,1])for(const row of [-10,0,10])path([[side*11,row+3],[side*17,row-2]]);
 }else{
  ctx.strokeStyle='#256078';ctx.lineWidth=8;
  path([[-23,30],[18,-25],[20,-33]]);path([[-8,30],[29,-19],[35,-24]]);
  ctx.strokeStyle='#fff0c6';ctx.lineWidth=3;
  path([[-21,-21],[17,14]]);path([[-24,-15],[-16,-23]]);
 }
 ctx.restore();
}

export function medalFace(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#e8b857';ctx.fillRect(0,0,512,512);
 ctx.strokeStyle='#a77231';ctx.lineWidth=8;
 ctx.beginPath();ctx.arc(256,256,228,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='#fff0b3';ctx.lineWidth=4;
 ctx.beginPath();ctx.arc(256,256,213,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#63401f';ctx.textAlign='center';ctx.font='900 29px system-ui';
 ctx.fillText('ARCHERBOX',256,120);ctx.font='900 26px system-ui';
 ctx.fillText('CHAMPION',256,410);
 drawIcon(ctx,'basketball',187,206);
 drawIcon(ctx,'football',325,206);
 drawIcon(ctx,'baseball',187,308);
 drawIcon(ctx,'skiing',325,308);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
