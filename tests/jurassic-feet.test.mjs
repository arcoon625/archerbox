import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {makeDinosaur} from '../public/games/jurassic-island/dinosaurs.js';
import {SPECIES} from '../public/games/jurassic-island/rules.js';

for(const species of SPECIES){
 const model=makeDinosaur(species.id),biped=['trex','raptor'].includes(species.id),feet=[];
 model.traverse(o=>{if(o.userData.dinosaurFoot)feet.push(o)});
 assert.equal(feet.length,biped?2:4,species.name+' has its full set of feet');
 for(const pair of biped?['hind']:['front','hind']){
  const row=feet.filter(f=>f.userData.pair===pair);
  assert.deepEqual(row.map(f=>f.userData.side).sort(),['left','right'],species.name+' has a left and right '+pair+' foot');
 }
 for(let frame=0;frame<=24;frame++){
  const walk=frame/6;
  model.userData.pose({id:0,x:5,z:-3,yaw:.8,walk,speed:frame?3:0,state:'roam',roar:0},frame/8);
  model.updateMatrixWorld(true);
  const positions=feet.map(f=>model.worldToLocal(f.getWorldPosition(new THREE.Vector3())));
  for(let i=0;i<feet.length;i++){
   assert(feet[i].children.some(o=>o.isMesh&&o.geometry.attributes.position.count>0),'each foot contains rendered geometry');
   const p=positions[i];assert(feet[i].userData.side==='left'?p.x<-.1:p.x>.1,species.name+' feet stay on opposite sides throughout a walking cycle');
   assert(p.y>=0&&p.y<.7,'each foot stays on or close to the ground');
   for(let j=i+1;j<feet.length;j++)assert(p.distanceTo(positions[j])>.2,species.name+' feet never occupy the same place');
  }
 }
 console.log(species.name+': '+feet.length+' separate feet, correct left/right pairs, standing and 24 walking poses.');
}
