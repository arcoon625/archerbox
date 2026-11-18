import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {buildAvatar,itemPreview,disposeAvatar} from '../public/avatar/models.js';
import {DEFAULT_LOOK,SKIN_TONES,EXPRESSIONS,itemById} from '../public/avatar/catalog.js';
const ctx=new Proxy({}, {get(t,p){return t[p]??(()=>{});},set(t,p,v){t[p]=v;return true;}});
globalThis.document={createElement(){return {width:256,height:256,getContext:()=>ctx};}};
let released=0;
for(const skin of SKIN_TONES)for(const expression of EXPRESSIONS){
 const input={...DEFAULT_LOOK,head:null,face:null,pet:null,skin,expression},before=JSON.stringify(input),avatar=buildAvatar(input),{rig,head,handMounts}=avatar.userData;
 assert.equal(JSON.stringify(input),before,'building does not change a saved outfit');
 avatar.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(rig).getSize(new THREE.Vector3()),headSize=new THREE.Box3().setFromObject(head).getSize(new THREE.Vector3());
 assert(size.y>2&&size.y<2.4);assert(size.y/headSize.y>3.5&&size.y/headSize.y<5,'friendly game-character proportions');
 const face=head.getObjectByName('Smooth character face');assert(face);assert.equal(face.material.color.getHexString(),new THREE.Color(skin).getHexString());assert(!face.material.bumpMap&&!face.material.normalMap,'character skin stays smooth');
 assert(!avatar.getObjectByName('Scan face'));assert(!avatar.getObjectByName('Fingernail'));
 assert.equal(handMounts.length,2);for(let i=0;i<2;i++){const world=avatar.userData.arms[i].localToWorld(handMounts[i].clone());assert(Math.abs(world.y-.89)<.001,'equipment attaches to the new hand');for(const n of world.toArray())assert(Number.isFinite(n));}
 const eyes=head.userData.eyes;assert.equal(eyes.length,expression==='sleepy'?0:expression==='wink'?1:2);
 avatar.userData.animate(4.48,false);for(const eye of eyes)assert(eye.scale.y<.01,'simple eyes blink');
 avatar.userData.animate(1,true);for(const eye of eyes)assert.equal(eye.scale.y,.039);assert(avatar.userData.legs.some(l=>l.rotation.x!==0));
 let meshes=0,triangles=0;avatar.traverse(o=>{if(!o.geometry)return;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;for(const n of o.geometry.attributes.position.array)assert(Number.isFinite(n));o.geometry.addEventListener('dispose',()=>released++);});
 assert(meshes<150&&triangles<170000,'the character remains practical to render in games');disposeAvatar(avatar);
}
assert(released>1000);
for(const id of ['head-01','head-02','face-01','shirt-01','bottom-01','shoes-01']){
 const preview=itemPreview(itemById(id));let detailed=0;preview.traverse(o=>{if(o.material?.isMeshPhysicalMaterial&&o.material.bumpMap&&o.material.bumpScale>0)detailed++;});assert(detailed>0,id+' keeps detailed item materials');disposeAvatar(preview);
}
const hair=itemPreview(itemById('head-03'));assert(hair.getObjectByName('Sculpted hair lock'));assert(!hair.getObjectByName('1000 fine swept strands'));disposeAvatar(hair);
console.log('Avatar style passed: all skin tones and expressions, rounded proportions, smooth faces, blink/run rig, hand equipment mounts, detailed wearable materials, finite geometry, render budget and disposal.');
