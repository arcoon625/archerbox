import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {RECIPES} from '../public/games/bakery-rush/rules.js';
import {pastry} from '../public/games/bakery-rush/scene.js';
const appearances=new Set();
for(const recipe of RECIPES){
 for(const topping of [null,...recipe.toppings])for(const burnt of [false,true]){
  const model=pastry(recipe.id,topping,burnt);assert.equal(model.children.length,recipe.quantity,'the displayed quantity matches the actual batch of '+recipe.id);model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());assert(!bounds.isEmpty());assert(size.x>0&&size.x<3);assert(size.y>0&&size.y<2);assert(size.z>0&&size.z<3);const signature=[];
  model.traverse(o=>{for(const n of o.matrixWorld.elements)assert(Number.isFinite(n));for(const n of o.geometry?.attributes.position?.array||[])assert(Number.isFinite(n));for(const n of o.geometry?.attributes.normal?.array||[])assert(Number.isFinite(n));if(o.geometry)signature.push(o.geometry.type+':'+o.geometry.attributes.position.count);});
  if(!topping&&!burnt)appearances.add(signature.join(','));const geometries=new Set(),materials=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 }
}
assert(appearances.size>=11,'new treats have distinct three-dimensional shapes');
console.log('Bakery pastry models: all 12 treats, available toppings and burned variants have finite, correctly sized 3D geometry.');
