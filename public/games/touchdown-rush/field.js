import * as THREE from '../../vendor/three.module.js';
import {teamLogoImage,drawTeamLogo} from './team-branding.js?v=creators1';

// Yards, matching the game's existing coordinates. Field markings follow
// https://operations.nfl.com/rules-officiating/2026-nfl-rulebook .
export const FIELD={width:160/3,length:120,goalLine:50,endLine:60,hashInner:37/12,hashLength:2/3,lineWidth:1/9,numberOuter:160/6-12};
export function makeField(cfg,home){
 const root=new THREE.Group();root.name='Home team regulation field';root.userData={homeTeam:home.id,dimensions:{...FIELD}};
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=2048;const c=canvas.getContext('2d'),sx=canvas.width/64,sz=canvas.height/132;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 function paint(logo){
  c.setTransform(1,0,0,1,0,0);c.fillStyle='#456548';c.fillRect(0,0,1024,2048);c.save();c.translate(512,1024);c.scale(sx,sz);
  const half=FIELD.width/2,rect=(x,z,w,d,color)=>{c.fillStyle=color;c.fillRect(x-w/2,z-d/2,w,d);};
  // Six-foot white safety border, with the playing surface inset inside it.
  rect(0,0,FIELD.width+4,124,'#eeeede');
  for(let z=-47.5;z<50;z+=5)rect(0,z,FIELD.width,5,((z+47.5)/5)%2?'#3c7840':'#458547');
  for(const z of [-55,55]){
   rect(0,z,FIELD.width,10,'#'+new THREE.Color(home.color).getHexString());
   c.save();c.translate(0,z);if(z>0)c.rotate(Math.PI);c.scale(1,.96);c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.font='900 5.3px Arial';c.lineWidth=.16;c.strokeStyle='#'+new THREE.Color(home.accent??0xffffff).getHexString();c.fillStyle='#f6f3e6';
   const name=(home.shortName||home.name).toUpperCase();c.strokeText(name,0,.15,43);c.fillText(name,0,.15,43);c.restore();
  }
  // Painted center-field crest, not a raised object that players run into.
  if(logo){c.save();c.globalAlpha=.96;drawTeamLogo(c,logo,-6,-6,12,12);c.restore();}
  for(let z=-50;z<=50;z+=5)rect(0,z,FIELD.width,Math.abs(z)===50?2/9:FIELD.lineWidth,'#f1f0e2');
  for(let z=-49;z<50;z++){
   if(z%5===0)continue;
   for(const side of [-1,1]){
    rect(side*(FIELD.hashInner+FIELD.hashLength/2),z,FIELD.hashLength,FIELD.lineWidth,'#eeeede');
    rect(side*(half-1/3),z,2/3,FIELD.lineWidth,'#eeeede');
   }
  }
  for(let z=-40;z<=40;z+=10)for(const side of [-1,1]){
   c.save();c.translate(side*(FIELD.numberOuter-1),z);c.rotate(side<0?Math.PI/2:-Math.PI/2);c.fillStyle='#f4f2e5';c.textAlign='center';c.textBaseline='middle';c.font='bold 2.75px Arial';c.scale(.85,1);c.fillText(z===0?'50':String(50-Math.abs(z)),0,0);c.restore();
   if(z!==0){const toward=Math.sign(z);c.fillStyle='#eeeede';c.beginPath();c.moveTo(side*(FIELD.numberOuter-1),z+toward*2.2);c.lineTo(side*(FIELD.numberOuter-1)-.25,z+toward*1.35);c.lineTo(side*(FIELD.numberOuter-1)+.25,z+toward*1.35);c.closePath();c.fill();}
  }
  // Dashed coaching/restricted-area lines sit outside the white playing border.
  c.strokeStyle='#e2c255';c.lineWidth=2/9;c.setLineDash([2/3,1/3]);for(const side of [-1,1]){c.beginPath();c.moveTo(side*30.5,-62);c.lineTo(side*30.5,62);c.stroke();}c.setLineDash([]);
  c.restore();
  // Fine fibers, mowing variation and a little worn paint all live in one draw.
  let seed=749;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<85000;i++){const x=rnd()*1024,y=rnd()*2048;c.fillStyle=i%3?'rgba(8,32,14,.065)':'rgba(227,239,189,.09)';c.fillRect(x,y,.55+rnd()*.7,1+rnd()*2);}
  texture.needsUpdate=true;
 }
 paint(null);teamLogoImage(home).then(image=>{if(image&&!root.userData.disposed)paint(image);});
 const turf=new THREE.Mesh(new THREE.PlaneGeometry(64,132),new THREE.MeshStandardMaterial({map:texture,roughness:1}));turf.rotation.x=-Math.PI/2;turf.position.y=.014;turf.receiveShadow=true;turf.name='Striped grass, painted home end zones and regulation markings';root.add(turf);
 // A tiny repeating height map keeps the surface from reading as glossy paint.
 const fibers=document.createElement('canvas');fibers.width=fibers.height=128;const f=fibers.getContext('2d');f.fillStyle='#888';f.fillRect(0,0,128,128);
 for(let i=0;i<2500;i++){const x=(i*73)%128,y=(i*47)%128;f.fillStyle=i%2?'#b1b1b1':'#5d5d5d';f.fillRect(x,y,1,2);}
 const bump=new THREE.CanvasTexture(fibers);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(32,66);turf.material.bumpMap=bump;turf.material.bumpScale=.012;
 const orange=new THREE.MeshStandardMaterial({color:0xf16c18,roughness:.92});
 for(const x of [-FIELD.width/2,FIELD.width/2])for(const z of [-60,-50,50,60]){const pylon=new THREE.Mesh(new THREE.BoxGeometry(1/6,.5,1/6),orange);pylon.position.set(x,.25,z);pylon.name='Foam end-zone pylon';root.add(pylon);}
 return root;
}
