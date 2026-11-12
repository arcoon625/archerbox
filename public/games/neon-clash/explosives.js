import * as THREE from '../../vendor/three.module.js';
export const explosives=[
 {name:'Frag Grenade',description:'Bounces • one-hit blast',fuse:2.2,radius:6,damage:95,color:0xffbc64},
 {name:'Pulse Grenade',description:'Wide • one-hit energy blast',fuse:1.8,radius:7.5,damage:65,color:0x67e7ff},
 {name:'Sticky Bomb',description:'Sticks • one-hit blast',fuse:2.6,radius:5.5,damage:105,color:0xa7ff71,sticky:true},
 {name:'Cluster Grenade',description:'Four mini one-hit blasts',fuse:1.6,radius:4,damage:35,color:0xffd38a,cluster:true},
 {name:'Shock Grenade',description:'One-hit electric blast',fuse:1.8,radius:6,damage:35,color:0xb897ff,shock:true},
 {name:'Incendiary Grenade',description:'Deadly blast • burning area',fuse:1.5,radius:4,damage:25,color:0xff753e,fire:true}
];
export function buildGrenade(index){
 const root=new THREE.Group(),pulse=index===1;
 function piece(geo,color,x=0,y=0,z=0,metalness=.35){const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,metalness,roughness:.5}));mesh.position.set(x,y,z);root.add(mesh);return mesh}
 if(index>=2){
  const color=explosives[index].color;
  if(index===2){
   piece(new THREE.BoxGeometry(.19,.08,.22),0x353f36);piece(new THREE.BoxGeometry(.14,.025,.15),0x79876b,0,.054);
   for(const x of [-.075,.075])for(const z of [-.09,.09])piece(new THREE.CylinderGeometry(.025,.025,.035,10),0x23292a,x,-.055,z);
   piece(new THREE.BoxGeometry(.08,.008,.035),0x111c19,0,.07,.035);
  }else if(index===3){
   piece(new THREE.CylinderGeometry(.06,.06,.24,12),0x383b40);
   for(let i=0;i<6;i++){const a=i*Math.PI/3;piece(new THREE.CylinderGeometry(.038,.038,.17,10),i%2?0x9d7844:0xc59953,Math.cos(a)*.065,0,Math.sin(a)*.065)}
   for(const y of [-.09,.09])piece(new THREE.CylinderGeometry(.115,.115,.018,16),0x5b6168,0,y);
  }else if(index===4){
   piece(new THREE.SphereGeometry(.105,16,12),0x394154,0,0,0,.8);
   for(const angle of [0,Math.PI/2]){const ring=piece(new THREE.TorusGeometry(.12,.012,8,24),0xa5a4bd);ring.rotation.x=angle}
   for(const y of [-.075,.075])piece(new THREE.CylinderGeometry(.045,.045,.035,12),0x727787,0,y);
  }else{
   piece(new THREE.CylinderGeometry(.075,.075,.23,16),0x5e6267,0,0,0,.75);
   piece(new THREE.CylinderGeometry(.079,.079,.09,16),0xdb683d);
   for(const y of [-.12,.12])piece(new THREE.CylinderGeometry(.082,.082,.022,16),0x292f34,0,y);
   for(const x of [-.033,.033])piece(new THREE.BoxGeometry(.012,.055,.007),0xffbd63,x,0,.078);
  }
  piece(new THREE.CylinderGeometry(.025,.032,.035,10),0x9da5a9,0,index===2?.09:.145);
  const light=piece(new THREE.SphereGeometry(.014,8,6),color,0,index===2?.075:.13,.055);light.material.emissive.setHex(color);light.material.emissiveIntensity=2;root.userData.blink=light;return root;
 }
 const body=piece(new THREE.SphereGeometry(.115,16,12),pulse?0x253e53:0x536044);body.scale.y=1.25;
 for(const y of [-.07,0,.07]){const ring=piece(new THREE.TorusGeometry(Math.sqrt(.115**2-(y*.8)**2),.007,6,20),pulse?0x5eeaff:0x273327,0,y);ring.rotation.x=Math.PI/2;if(pulse){ring.material.emissive.setHex(0x31bdee);ring.material.emissiveIntensity=1.5}}
 piece(new THREE.CylinderGeometry(.037,.04,.06,12),0x7c8790,0,.15);const lever=piece(new THREE.BoxGeometry(.03,.12,.025),0xb0b8bf,.05,.14);lever.rotation.z=.3;
 const pin=piece(new THREE.TorusGeometry(.026,.004,6,16),0xc1c6c9,-.05,.19);pin.rotation.y=Math.PI/2;
 const light=piece(new THREE.SphereGeometry(.015,8,6),pulse?0x66eaff:0xff7042,0,.185,.03);light.material.emissive.setHex(pulse?0x36ceff:0xff4825);light.material.emissiveIntensity=2;root.userData.blink=light;return root;
}
// Collision response and lethal grenade hits use game units.
export function reflectVelocity(velocity,normal,restitution=.48){return velocity.clone().addScaledVector(normal,-(1+restitution)*velocity.dot(normal));}
export function blastDamage(distance,radius,health){return distance>=radius?0:Math.max(1,health);}
