import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../public/vendor/three.module.js';
import {buildAvatar,itemPreview,disposeAvatar} from '../public/avatar/models.js';
import {DEFAULT_LOOK,SKIN_TONES,EXPRESSIONS,itemById} from '../public/avatar/catalog.js';
for(const file of ['Map-COL.jpg','Infinite-Level_02_Tangent_SmoothUV.jpg'])assert(fs.statSync(new URL('../public/avatar/assets/'+file,import.meta.url)).size>100000);assert.match(fs.readFileSync(new URL('../public/avatar/assets/LeePerrySmith_License.txt',import.meta.url),'utf8'),/Attribution 3.0/);
const ctx=new Proxy({}, {get(t,p){return t[p]??(()=>{});},set(t,p,v){t[p]=v;return true;}});
globalThis.document={createElement(){return {width:256,height:256,getContext:()=>ctx};}};
let geometryCount=0,instanceCount=0;
for(const skin of SKIN_TONES)for(const expression of EXPRESSIONS){
 const input={...DEFAULT_LOOK,head:null,face:null,pet:null,skin,expression},before=JSON.stringify(input),avatar=buildAvatar(input),{rig,humanHead,handMounts}=avatar.userData;
 assert.equal(JSON.stringify(input),before,'building does not change the saved outfit');
 avatar.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(rig),head=new THREE.Box3().setFromObject(humanHead),size=bounds.getSize(new THREE.Vector3()),headSize=head.getSize(new THREE.Vector3());
 assert(size.y>2.2&&size.y<2.5);assert(size.y/headSize.y>5,'body uses natural human proportions');
 assert.equal(handMounts.length,2);for(let i=0;i<2;i++){
  const world=avatar.userData.arms[i].localToWorld(handMounts[i].clone());assert(world.y>.95&&world.y<1.15,'weapon grip follows the remapped hand');for(const n of world.toArray())assert(Number.isFinite(n));
 }
 const scanned=humanHead.getObjectByName('Scan face');assert(scanned&&scanned.geometry.attributes.position.count>4000,'face uses fitted scan geometry');const eyes=humanHead.userData.eyes;assert.equal(eyes.length,expression==='sleepy'?0:expression==='wink'?1:2);
 avatar.userData.animate(4.48,false);for(const eye of eyes)assert(eye.scale.y<.2,'eyes blink around their own centers');
 avatar.userData.animate(1,true);for(const eye of eyes)assert.equal(eye.scale.y,1);
 assert(avatar.userData.legs.some(l=>l.rotation.x!==0));assert.equal(avatar.userData.arms.length,2);
 const irises=[];let triangles=0,meshes=0;
 avatar.traverse(o=>{if(o.name==='Radial iris')irises.push(o);if(!o.geometry)return;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);if(o.isInstancedMesh){for(const n of o.instanceMatrix.array)assert(Number.isFinite(n));o.addEventListener('dispose',()=>instanceCount++);}o.geometry.addEventListener('dispose',()=>geometryCount++);});
 assert.equal(irises.length,eyes.length);for(const iris of irises)assert.equal(iris.material.map.image.width,128,'iris uses radial color detail');
 assert(meshes<200&&triangles<250000,'full-detail model stays within a browser rendering budget');
 disposeAvatar(avatar);
}
assert(instanceCount>=8*6,'instanced hair releases its GPU buffers');assert(geometryCount>1000);
const preview=itemPreview(itemById('head-03')),hair=preview.getObjectByName('1000 fine swept strands');
assert(hair&&hair.visible,'head thumbnails keep their instanced hair');disposeAvatar(preview);
console.log('Avatar realism passed: every skin tone and expression, human proportions, detailed irises, blink/run rig, hand equipment mounts, finite instances, rendering budget, GPU disposal and hair in portraits.');
