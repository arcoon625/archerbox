// Copy this and football-helmets.html to public/_football-helmets.* to preview.
import * as THREE from './vendor/three.module.js';
import {makePlayer,playerEnvironment} from './games/touchdown-rush/players.js?v=helmets1';
import {teamById} from './games/touchdown-rush/teams.js';
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(1200,480,false);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x6b817b);scene.environment=playerEnvironment(0xb6d4e3);scene.add(new THREE.HemisphereLight(0xe5f1ff,0x536b46,1.35));
const sun=new THREE.DirectionalLight(0xffeed1,2.3);sun.position.set(-2,6,5);scene.add(sun);const fill=new THREE.DirectionalLight(0xe7f1ff,.9);fill.position.set(4,2,-3);scene.add(fill);
for(const [i,id] of ['dallas-cowboys','buffalo-bills','kansas-city-chiefs'].entries()){const t=teamById(id),model=makePlayer(t.color,[4,17,32][i],{...t,playerName:['Dak Prescott','Josh Allen','Nick Bolton'][i],role:i===2?'LB':'QB'});model.position.x=(i-1)*.91;model.rotation.y=[Math.PI+.36,Math.PI*.55,.10][i];scene.add(model);}
const camera=new THREE.OrthographicCamera(-1.53,1.53,.612,-.612,.1,100);camera.position.set(0,2.42,5);camera.lookAt(0,2.03,0);renderer.render(scene,camera);
