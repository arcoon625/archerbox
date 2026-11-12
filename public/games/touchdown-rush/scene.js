import * as THREE from '../../vendor/three.module.js';
import {GOALPOST} from './kicking.js?v=placekicks1';
import {makeStadiumBowl,updateStadiumBowl} from './stadium.js?v=creators1';
import {makeField} from './field.js?v=creators1';
export const STADIUMS=[{name:'Sunday Field',tag:'SUNSHINE & GRASS',sky:0xb6d4e3,grass:0x3c8247,accent:0x284e74},{name:'Friday Lights',tag:'NIGHT GAME',sky:0x111c32,grass:0x286b49,accent:0x7c86b8},{name:'Harbor Stadium',tag:'BY THE WATER',sky:0xb7dce5,grass:0x41816d,accent:0x2c7789}];
export const UNIFORMS=[{name:'Royal Blue',color:0x3a80c2,css:'#3a80c2'},{name:'Crimson',color:0xc94f56,css:'#c94f56'},{name:'Gold',color:0xd3a244,css:'#d3a244'}];
function print(text,color='#f4f0de',bg=null,w=512,h=128){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,w,h)}x.fillStyle=color;x.font='900 '+Math.round(h*.7)+'px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,h*.54,w*.95);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map,transparent:!bg,side:THREE.DoubleSide,depthWrite:!!bg})}
export function makeStadium(index,teams=[{name:'Cowboys',color:0x003594},{name:'Chiefs',color:0xe31837}],homeIndex=0){
 const cfg=STADIUMS[index],root=new THREE.Group(),home=teams[homeIndex===1?1:0];
 const mat=(color,metalness=0,roughness=.85)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const white=mat(0xf2f0d9),metal=mat(0xaab5bc,.7,.35),concrete=mat(0x667578),dark=mat(cfg.accent),yellow=mat(0xf4c551,.3,.35);
 const add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.receiveShadow=true;root.add(o);return o};
 const box=(x,y,z,w,h,d,m)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const ground=add(new THREE.PlaneGeometry(230,250),mat(index===2?0x46777a:0x63715e),0,-.08,0);ground.rotation.x=-Math.PI/2;
 const field=makeField(cfg,home);root.add(field);
 for(const side of [-1,1]){const z=side*GOALPOST.z,h=GOALPOST.crossbar,w=GOALPOST.halfWidth;box(0,.03,z,53.3,.04,.2,white);const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,z+side*2),new THREE.Vector3(0,h*.65,z+side*2),new THREE.Vector3(0,h,z+side),new THREE.Vector3(0,h,z)]);add(new THREE.TubeGeometry(curve,24,.105,10,false),yellow,0,0,0);const bar=add(new THREE.CylinderGeometry(.075,.075,w*2,10),yellow,0,h,z);bar.rotation.z=Math.PI/2;for(const x of [-w,w])add(new THREE.CylinderGeometry(.075,.075,GOALPOST.uprightHeight,10),yellow,x,h+GOALPOST.uprightHeight/2,z);box(0,1,z+side*2,.6,2,.6,mat(cfg.accent));}
 const bowl=makeStadiumBowl(index,cfg,teams,homeIndex);root.add(bowl);
 // Low sideline yard placards, instead of traffic cones on every ten yards.
 for(const side of [-1,1])for(let z=-40;z<=40;z+=10){
  box(side*28.5,.28,z,.35,.55,1.05,mat(0xf07821));
  const label=add(new THREE.PlaneGeometry(.95,.48),print(z===0?'50':String(50-Math.abs(z)),'#171b19','#f28225',128,64),side*28.3,.32,z);label.rotation.y=side<0?Math.PI/2:-Math.PI/2;
 }
 const downMarker=new THREE.Group();downMarker.name='Live down marker';root.add(downMarker);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.3,8),mat(0xff7429));pole.position.y=1.15;downMarker.add(pole);
 const downFace=new THREE.Mesh(new THREE.BoxGeometry(.13,.65,.65),mat(0x17211d));downFace.position.y=2.25;downMarker.add(downFace);
 const downText=new THREE.Mesh(new THREE.PlaneGeometry(.52,.52),print('1','#ff8a3a','#111c17',128,128));downText.position.set(-.076,2.25,0);downText.rotation.y=-Math.PI/2;downMarker.add(downText);downMarker.position.set(28.1,0,30);
 if(index===1){for(let i=0;i<28;i++){const a=i/28*Math.PI*2,r=105+i%4*9,x=Math.cos(a)*r,z=Math.sin(a)*r,h=16+i%6*7;box(x,h/2,z,7,h,8,mat(0x2b3d53));for(let y=4;y<h;y+=5)box(x,y,z+4.02,4,1.3,.03,new THREE.MeshBasicMaterial({color:0x91b4ca}))}}
 else if(index===2){const water=add(new THREE.PlaneGeometry(280,120),new THREE.MeshStandardMaterial({color:0x64b3c4,roughness:.25,metalness:.4}),0,-.1,-134);water.rotation.x=-Math.PI/2;for(let i=0;i<6;i++){box(-60+i*24,.4,-105,14,1,4,white);box(-60+i*24,3,-107,4,5,3,dark)}add(new THREE.CylinderGeometry(2.2,4,22,20),white,-88,11,-92);add(new THREE.ConeGeometry(3,3,20),dark,-88,23,-92)}
 else{for(let i=0;i<20;i++){const a=i/20*Math.PI*2,r=92+i%3*10;box(Math.cos(a)*r,2.5,Math.sin(a)*r,9,5,8,mat(0xcbd0b9));const t=add(new THREE.ConeGeometry(6,3,4),mat(0x67726a),Math.cos(a)*r,6.5,Math.sin(a)*r);t.rotation.y=Math.PI/4}}
 root.userData={bowl,field,downMarker,downText,downValue:1,homeIndex};updateStadiumBowl(bowl,0);return root;
}
export function animateStadium(root,time,game,reducedMotion=false){
 updateStadiumBowl(root?.userData.bowl,time,game,reducedMotion);if(!root||!game)return;const d=root.userData;d.downMarker.position.z=Math.max(-50,Math.min(50,game.line));
 if(d.downValue!==game.down){d.downText.material.map.dispose();d.downText.material.dispose();d.downText.material=print(String(game.down),'#ff8a3a','#111c17',128,128);d.downValue=game.down;}
}
export {makePlayer,animatePlayer,celebrationJoints,playerEnvironment} from './players.js?v=creators1';
export function makeBall(){
 const g=new THREE.Group(),leather=new THREE.MeshStandardMaterial({color:0x814323,roughness:.88}),white=new THREE.MeshStandardMaterial({color:0xf3ecdc,roughness:.8}),dark=new THREE.MeshStandardMaterial({color:0x422416,roughness:.95});
 if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#888888';ctx.fillRect(0,0,128,128);for(let y=0;y<128;y+=4)for(let x=0;x<128;x+=4){ctx.fillStyle='#bbbbbb';ctx.beginPath();ctx.arc(x+(y%8?2:0),y,1.4,0,Math.PI*2);ctx.fill();}const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.NoColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(3,3);leather.bumpMap=map;leather.bumpScale=.006;}
 const ball=new THREE.Mesh(new THREE.SphereGeometry(.22,32,20),leather);ball.scale.set(1,1,1.75);g.add(ball);
 for(const phi of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const points=[];for(let i=0;i<=32;i++){const a=.06+i/32*(Math.PI-.12);points.push(new THREE.Vector3(Math.cos(phi)*Math.sin(a)*.221,Math.sin(phi)*Math.sin(a)*.221,Math.cos(a)*.386));}g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.0025,5,false),dark));}
 for(let i=0;i<8;i++){const lace=new THREE.Mesh(new THREE.BoxGeometry(.11,.013,.013),white);lace.position.set(0,.223,(i-3.5)*.031);g.add(lace);}const seam=new THREE.Mesh(new THREE.BoxGeometry(.016,.014,.27),white);seam.position.y=.224;g.add(seam);g.scale.setScalar(.41);g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g;
}
export function dispose(root){root.userData.disposed=true;const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{o.userData.disposed=true;if(o.isInstancedMesh)o.dispose();if(o.geometry)gs.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){ms.add(m);for(const key of ['map','bumpMap','normalMap','roughnessMap'])if(m[key])ts.add(m[key])}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>{t.userData.disposed=true;t.dispose()})}
