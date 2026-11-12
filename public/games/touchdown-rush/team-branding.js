import * as THREE from '../../vendor/three.module.js';

// Local copies of the public team marks supplied by ESPN's roster feeds.
// Images are cached, while each stadium owns and disposes its own GPU textures.
const images=new Map();
export function teamLogoUrl(team){
 if(team?.custom)return new URL('./creator-logos/'+(['thunder','shark','dragon','knight'].includes(team.crest)?team.crest:'thunder')+'.png',import.meta.url).href;
 const mark=team?.mark?.toLowerCase();
 return mark?new URL('./logos/'+(mark==='was'?'wsh':mark)+'.png',import.meta.url).href:null;
}
export function teamLogoImage(team){
 const url=teamLogoUrl(team);if(!url||typeof Image==='undefined')return Promise.resolve(null);
 if(!images.has(url))images.set(url,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=url;}));
 return images.get(url);
}
export function drawTeamLogo(c,image,x,y,w,h){
 if(!image)return;const scale=Math.min(w/image.width,h/image.height),iw=image.width*scale,ih=image.height*scale;
 c.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
}
export function fanLogoTexture(team,isDisposed=()=>false){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 function paint(image){
  c.clearRect(0,0,128,128);c.fillStyle='#f8f7f0';c.beginPath();c.ellipse(64,64,61,53,0,0,Math.PI*2);c.fill();
  if(image)drawTeamLogo(c,image,10,11,108,106);else{c.fillStyle='#'+new THREE.Color(team.color).getHexString();c.textAlign='center';c.textBaseline='middle';c.font='bold 40px Arial';c.fillText(team.mark||'HOME',64,66,108);}
  texture.needsUpdate=true;
 }
 paint(null);teamLogoImage(team).then(image=>{if(image&&!isDisposed())paint(image);});return texture;
}
