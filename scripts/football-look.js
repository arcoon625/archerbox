// Copy this and football-look.html to public/_football-look.* only while recapturing.
import * as THREE from './vendor/three.module.js';
import {makePlayer,animatePlayer,playerEnvironment} from './games/touchdown-rush/players.js?v=helmets1';
import {makeStadium,makeBall} from './games/touchdown-rush/scene.js?v=helmets1';
import {teamById} from './games/touchdown-rush/teams.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setSize(960,600,false);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xb6d4e3);scene.fog=new THREE.Fog(0xb6d4e3,26,120);scene.environment=playerEnvironment(0xb6d4e3);scene.add(new THREE.HemisphereLight(0xe5f1ff,0x536b46,1.65));
const sun=new THREE.DirectionalLight(0xffeed1,2.6);sun.position.set(-6,14,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,far:40});sun.shadow.normalBias=.025;scene.add(sun);
const teams=[teamById('dallas-cowboys'),teamById('kansas-city-chiefs')];scene.add(makeStadium(0,teams));
const home=makePlayer(teams[0].color,4,{...teams[0],playerName:'Dak Prescott',role:'QB'});home.position.set(-.70,0,.35);home.rotation.y=Math.PI+.18;animatePlayer(home,{role:'QB'},0,{carrier:true,quarterback:true});scene.add(home);
const away=makePlayer(teams[1].color,32,{...teams[1],playerName:'Nick Bolton',role:'LB',away:true});away.position.set(.95,0,-.20);away.rotation.y=Math.PI-.35;animatePlayer(away,{role:'LB'},0,{ready:true});scene.add(away);
const ball=makeBall();home.updateMatrixWorld(true);home.userData.ballGrip.getWorldPosition(ball.position);ball.rotation.set(.25,Math.PI/2,Math.PI/3);scene.add(ball);
const camera=new THREE.PerspectiveCamera(37,960/600,.1,180);camera.position.set(2.3,2.3,5.6);camera.lookAt(.1,1.24,.05);renderer.render(scene,camera);
