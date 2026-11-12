import * as THREE from '../vendor/three.module.js';
import {buildScannedHead} from './scan-head.js?v=scan2';
import {surface} from './surfaces.js?v=scan2';

function mesh(parent,geometry,material,x=0,y=0,z=0,name=''){
 const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function ellipsoid(parent,material,x,y,z,rx,ry,rz,name=''){
 const m=mesh(parent,new THREE.SphereGeometry(1,28,20),material,x,y,z,name);m.scale.set(rx,ry,rz);return m;
}
function strand(parent,points,radius,material,name=''){
 return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,radius,5,false),material,0,0,0,name);
}
function irisTexture(){
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(x+.5-size/2)/(size/2),dy=(y+.5-size/2)/(size/2),r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
  const fibers=(Math.sin(a*73+Math.sin(a*17)*3+r*13)+Math.sin(a*129-r*31))*.5;
  const ring=1-Math.exp(-(((r-.88)/.10)**2))*.65,light=(.68+fibers*.17+Math.sin(r*60)*.06)*ring;
  const i=(y*size+x)*4;data[i]=Math.max(0,76*light+(1-r)*25);data[i+1]=Math.max(0,83*light+(1-r)*19);data[i+2]=Math.max(0,54*light);data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}
function eyeOpening(){
 const shape=new THREE.Shape();shape.moveTo(-.037,0);shape.bezierCurveTo(-.021,.019,.019,.021,.037,0);shape.bezierCurveTo(.019,-.014,-.021,-.013,-.037,0);
 return new THREE.ShapeGeometry(shape,20);
}
export function buildHumanHead(look,skin){return buildScannedHead(look,skin,{mesh,ellipsoid,strand,irisTexture,eyeOpening});}

export function buildHumanHair(headKind){
 const group=new THREE.Group();group.name='Layered hair';const hair=surface('#392b22','fur',{roughness:.72});
 const scalp=new THREE.Group();scalp.name='Swept hair';group.add(scalp);
 const positions=[],uv=[],indices=[],around=48,rows=16;
 function point(phi,t){const max=1.85-.7*(Math.cos(phi)+1)/2,theta=t*max;return new THREE.Vector3(Math.sin(phi)*Math.sin(theta)*.265,2.008+Math.cos(theta)*.263,-.016+Math.cos(phi)*Math.sin(theta)*.244);}
 for(let i=0;i<=rows;i++)for(let j=0;j<=around;j++){const p=point(j/around*Math.PI*2,i/rows);positions.push(p.x,p.y,p.z);uv.push(j/around,i/rows);if(i<rows&&j<around){const n=i*(around+1)+j;indices.push(n,n+around+1,n+1,n+1,n+around+1,n+around+2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();mesh(scalp,g,hair,0,0,0,'Fitted hair cap');
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.009,.004,0),new THREE.Vector3(.021,.005,0),new THREE.Vector3(.033,.001,0)]);
 const locks=new THREE.InstancedMesh(new THREE.TubeGeometry(curve,5,.0011,3,false),hair,1000),basis=new THREE.Matrix4();locks.name='1000 fine swept strands';
 for(let i=0;i<1000;i++){
  const phi=i*2.39996323,t=Math.sqrt((i+.5)/1000),p=point(phi,t),normal=new THREE.Vector3(p.x/.265,(p.y-2.008)/.263,(p.z+.016)/.244).normalize();
  const tangent=point(phi+.1,Math.min(.999,t+.035)).sub(p).normalize(),bitangent=new THREE.Vector3().crossVectors(tangent,normal).normalize();tangent.crossVectors(normal,bitangent).normalize();
  basis.makeBasis(tangent,normal,bitangent);basis.setPosition(p);locks.setMatrixAt(i,basis);
 }locks.castShadow=true;scalp.add(locks);
 for(const side of [-1,1])ellipsoid(group,hair,side*.226,1.988,-.004,.009,.042,.026,'Sideburn');
 if(['cap','propeller','sharkcap','visorcap','beanie','earflap','helmet','hardhat','firehat','pith','spacehelmet','rockethelmet','knight','viking','racinghelmet','sunhat','cowboy','bucket','fedora','beret','pirate','chef','graduation','wizard','nightcap','hood','dragonhood','raccoonhood','mushroom','pizza'].includes(headKind))scalp.visible=false;
 return group;
}

// Remap the existing wardrobe and rig together, so all 300 items keep fitting.
// Longer legs and a smaller head produce a six-head-tall youthful human silhouette.
export function humanPoint(v){
 const y=v.y,scale=y<=1.5?1:1-.22*Math.min(1,(y-1.5)/.3);
 const mapped=y<=.84?y/ .84:y<=1.5?1+(y-.84)*1.12:y<=1.715?1.7392+(y-1.5)*.82:1.9155+(y-1.715)*.74;
 return new THREE.Vector3(v.x*scale,mapped,v.z*scale);
}
export function fitHumanProportions(rig){
 rig.updateMatrixWorld(true);const entries=[];rig.traverse(o=>entries.push({object:o,world:o.matrixWorld.clone()}));
 const v=new THREE.Vector3(),oldGeometries=new Set();
 for(const {object,world} of entries){
  if(object===rig)continue;
  const origin=humanPoint(new THREE.Vector3().setFromMatrixPosition(world));object.parent.updateWorldMatrix(true,false);object.position.copy(object.parent.worldToLocal(origin));object.updateWorldMatrix(false,false);
  const inverse=object.matrixWorld.clone().invert();
  if(object.isInstancedMesh){
   const instance=new THREE.Matrix4();
   for(let i=0;i<object.count;i++){
    object.getMatrixAt(i,instance);const old=world.clone().multiply(instance),center=new THREE.Vector3().setFromMatrixPosition(old),mapped=humanPoint(center),columns=[];
    for(let axis=0;axis<3;axis++){const p=center.clone().add(new THREE.Vector3().setFromMatrixColumn(old,axis).multiplyScalar(.01));columns.push(humanPoint(p).sub(mapped).multiplyScalar(100));}
    instance.makeBasis(...columns).setPosition(mapped).premultiply(inverse);object.setMatrixAt(i,instance);
   }
   object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere();continue;
  }
  if(!object.geometry)continue;
  const old=object.geometry,geometry=old.clone(),positions=geometry.attributes.position;oldGeometries.add(old);
  for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(world);v.copy(humanPoint(v)).applyMatrix4(inverse);positions.setXYZ(i,v.x,v.y,v.z);}
  positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();object.geometry=geometry;
 }
 oldGeometries.forEach(g=>g.dispose());rig.updateMatrixWorld(true);
 return rig;
}
