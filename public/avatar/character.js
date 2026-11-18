import * as T from '../vendor/three.module.js';
import {roundedBox} from './surfaces.js?v=scan2';

function mesh(parent,geometry,material,x,y,z,name){
 const part=new T.Mesh(geometry,material);part.position.set(x,y,z);part.name=name;part.castShadow=true;part.receiveShadow=true;parent.add(part);return part;
}
function stroke(parent,points,radius,material,name){
 return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),18,radius,6,false),material,0,0,0,name);
}
export function buildCharacterHead(look,skin){
 const head=new T.Group();head.name='Rounded character head';
 mesh(head,roundedBox(.51,.52,.44,.105),skin,0,1.94,0,'Smooth character face');
 const ink=new T.MeshStandardMaterial({color:'#25322e',roughness:.8}),white=new T.MeshStandardMaterial({color:'#fff8e4',roughness:.65}),eyes=[];
 for(const side of [-1,1]){
  const x=side*.096;
  if(look.expression==='sleepy'||look.expression==='wink'&&side===1){stroke(head,[[x-.03,1.995,.226],[x,1.981,.23],[x+.03,1.995,.226]],.009,ink,'Closed eye');continue;}
  const eye=mesh(head,new T.SphereGeometry(1,16,12),ink,x,2,.226,'Simple oval eye');eye.scale.set(.024,.039,.009);eyes.push(eye);
  const glint=mesh(eye,new T.SphereGeometry(1,10,8),white,-.22,.32,.8,'Eye sparkle');glint.scale.set(.17,.16,.2);
 }
 if(look.expression==='surprised'){
  const mouth=mesh(head,new T.TorusGeometry(.033,.008,8,24),ink,0,1.845,.228,'Surprised mouth');mouth.scale.y=1.2;
 }else if(look.expression==='grin'){
  mesh(head,roundedBox(.19,.075,.012,.025),ink,0,1.857,.225,'Grin outline');mesh(head,roundedBox(.155,.04,.009,.012),white,0,1.866,.234,'Grin');
 }else if(look.expression==='cool'){
  stroke(head,[[-.07,1.86,.228],[0,1.851,.231],[.075,1.877,.225]],.009,ink,'Confident smile');
 }else{
  stroke(head,[[-.085,1.875,.225],[-.045,1.843,.23],[0,1.833,.231],[.045,1.843,.23],[.085,1.875,.225]],.009,ink,'Friendly smile');
 }
 head.userData={eyes,expression:look.expression,animate(time){const phase=time%4.6,blink=phase>4.36?Math.max(.06,Math.abs((phase-4.48)/.12)):1;for(const eye of eyes)eye.scale.y=.039*blink;}};
 return head;
}

export function buildCharacterHair(headKind){
 const hair=new T.Group();hair.name='Sculpted character hair';
 const covered=['cap','propeller','sharkcap','visorcap','beanie','earflap','helmet','hardhat','firehat','pith','spacehelmet','rockethelmet','knight','viking','racinghelmet','sunhat','cowboy','bucket','fedora','beret','pirate','chef','graduation','wizard','nightcap','hood','dragonhood','raccoonhood','mushroom','pizza'];
 if(covered.includes(headKind))return hair;
 const material=new T.MeshStandardMaterial({color:'#49352b',roughness:.8});
 const dome=mesh(hair,new T.SphereGeometry(.275,24,14,0,Math.PI*2,0,Math.PI*.58),material,0,2.035,-.012,'Smooth hair cap');dome.scale.set(1,.67,.85);
 for(const [x,y,width,angle] of [[-.14,2.135,.17,-.3],[0,2.13,.2,-.18],[.14,2.15,.15,.2]]){
  const lock=mesh(hair,roundedBox(width,.105,.065,.025),material,x,y,.185,'Sculpted hair lock');lock.rotation.z=angle;
 }
 return hair;
}
