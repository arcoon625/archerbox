import * as THREE from '../vendor/three.module.js';
import {roundedBox,surface} from './surfaces.js?v=scan2';

export {THREE,surface};
export const sides=[-1,1];
export const point=values=>new THREE.Vector3(...values);

export function mesh(group,geometry,material,position=[0,0,0]) {
 const part=new THREE.Mesh(geometry,material);
 part.position.fromArray(position);
 group.add(part);
 return part;
}

export function oval(group,material,position,size,tilt=0) {
 const part=mesh(group,new THREE.SphereGeometry(1,20,14),material,position);
 part.scale.fromArray(size);
 part.rotation.z=tilt;
 return part;
}

export function casing(group,material,position,size) {
 return mesh(group,roundedBox(...size),material,position);
}

// Smooth tapered anatomy. A fixed cross-section axis keeps markings aligned along the tail or limb.
export function sweep(group,material,nodes,{bands=null,depth=1}={}) {
 const curve=new THREE.CatmullRomCurve3(nodes.map(node=>point(node.slice(0,3))));
 const segments=(nodes.length-1)*5, sides=12, vertices=[],uvs=[],indices=[];
 const axis=new THREE.Vector3();
 const up=new THREE.Vector3(0,1,0);
 for(let i=0;i<=segments;i++) {
  const t=i/segments;
  const pos=curve.getPoint(t);
  const tangent=curve.getTangent(t);
  // Transport the previous ring along the curve to avoid flipping between vertical and horizontal sections.
  axis.addScaledVector(tangent,-axis.dot(tangent));
  if(axis.lengthSq()<.0001)axis.crossVectors(tangent,Math.abs(tangent.y)>.96?new THREE.Vector3(0,0,1):up);
  axis.normalize();
  const second=new THREE.Vector3().crossVectors(tangent,axis).normalize();
  const section=Math.min(nodes.length-2,Math.floor(i/5));
  const radius=THREE.MathUtils.lerp(nodes[section][3],nodes[section+1][3],i/5-section);
  for(let j=0;j<=sides;j++) {
   const angle=j/sides*Math.PI*2;
   const vertex=pos.clone().addScaledVector(axis,radius*Math.cos(angle)).addScaledVector(second,radius*depth*Math.sin(angle));
   vertices.push(...vertex.toArray());
   uvs.push(j/sides,t);
   if(i<segments&&j<sides){
    const a=i*(sides+1)+j,b=a+sides+1;
    indices.push(a,a+1,b,b,a+1,b+1);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 if(bands) for(let i=0;i<segments;i++) geometry.addGroup(i*sides*6,sides*6,bands(i/segments));
 return mesh(group,geometry,material);
}

export function silhouette(group,material,outline,position,depth=.012) {
 const shape=new THREE.Shape();
 shape.moveTo(...outline[0]);
 for(const control of outline.slice(1)){
  if(control.length===2) shape.lineTo(...control);
  else shape.quadraticCurveTo(...control);
 }
 shape.closePath();
 return mesh(group,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,curveSegments:10}),material,position);
}

export function eye(group,position,radius,iris,yaw=0) {
 const socket=new THREE.Group();
 socket.position.fromArray(position);
 socket.rotation.y=yaw;
 group.add(socket);
 const dark=new THREE.MeshStandardMaterial({color:'#171514',roughness:.17});
 const irisMaterial=new THREE.MeshStandardMaterial({color:iris,roughness:.22});
 oval(socket,dark,[0,0,0],[radius,radius*.84,radius*.47]);
 oval(socket,irisMaterial,[0,0,radius*.31],[radius*.70,radius*.70,radius*.30]);
 oval(socket,dark,[0,0,radius*.53],[radius*.37,radius*.50,radius*.19]);
 oval(socket,new THREE.MeshBasicMaterial({color:'#fcf1df'}),[-radius*.20,radius*.25,radius*.65],[radius*.15,radius*.13,radius*.07]);
}

export const enamel=color=>new THREE.MeshPhysicalMaterial({color,roughness:.27,metalness:.13,clearcoat:.8});
export const lamp=color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,roughness:.22});
export const glass=(color,opacity=.5)=>new THREE.MeshPhysicalMaterial({color,roughness:.18,transparent:true,opacity,metalness:.08,clearcoat:1,depthWrite:false,side:THREE.DoubleSide});
