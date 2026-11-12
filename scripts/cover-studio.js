// Mounted temporarily at dist/_cover.js. These covers use the playable games'
// own models, maps, materials and lights, with a camera chosen for a thumbnail.
import * as THREE from './vendor/three.module.js';
const canvas=document.getElementById('cover');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(52,16/9,.08,500);
function lighting(sky,ground,ambient,power,pos,extent=70){
 renderer.setClearColor(sky);scene.fog=new THREE.Fog(sky,extent*2,extent*5);
 scene.add(new THREE.HemisphereLight(0xe6f2ff,ground,ambient));
 const sun=new THREE.DirectionalLight(0xffeed1,power);sun.position.fromArray(pos);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.03;
 Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:extent*4});scene.add(sun);
}
const game=new URLSearchParams(location.search).get('game')||'turbo';
try{
 if(game==='hide'){
  const [{MAPS},{makeWorld,makeAvatar}]=await Promise.all([import('./games/hide-and-seek/maps.js'),import('./games/hide-and-seek/scene.js')]);scene.add(makeWorld(MAPS[0]).root);lighting(MAPS[0].sky,0x466549,2.4,3,[-22,38,18],28);scene.fog=new THREE.Fog(MAPS[0].sky,40,110);renderer.toneMappingExposure=1.18;
  const seeker=makeAvatar('#ed745b',true);seeker.position.set(-1,0,16);seeker.rotation.y=1.1;scene.add(seeker);const hider=makeAvatar('#e2b85d');hider.position.set(3,0,18);hider.rotation.y=1.1;scene.add(hider);const other=makeAvatar('#7dbec6');other.position.set(-12,0,18);scene.add(other);
  camera.fov=49;camera.position.set(12,14,29);camera.lookAt(-4,1,4);
 }else if(game==='shark'){

  const [{makeCourse,sample},{makeOcean,makeShark}]=await Promise.all([import('./games/shark-racing/rules.js?v=1'),import('./games/shark-racing/scene.js?v=real1')]);const course=makeCourse(0);scene.add(makeOcean(course).root);lighting(0x258d9c,0x26495d,2.8,2.1,[-50,120,40],35);scene.fog=new THREE.Fog(0x258d9c,35,155);renderer.toneMappingExposure=1.3;
  for(const [i,s,lane,depth] of [[0,0,0,0],[1,-8,-4,1],[2,-13,4,-1],[3,-19,0,2]]){const a=sample(course,s,lane,depth),m=makeShark(i);m.position.set(a.p.x,a.p.y,a.p.z);m.rotation.set(a.pitch,a.yaw,0,'YXZ');scene.add(m)}
  const a=sample(course,0);camera.fov=53;camera.position.set(a.p.x+a.t.x*13+a.right.x*10,a.p.y+3,a.p.z+a.t.z*13+a.right.z*10);camera.lookAt(a.p.x-a.t.x*6,a.p.y-1,a.p.z-a.t.z*6);
 }else if(game==='turbo'){
  const [{makeTrack},{buildWorld,makeEnvironment},{buildKart}]=await Promise.all([import('./games/turbo-kart-racing/race.js'),import('./games/turbo-kart-racing/world.js'),import('./games/turbo-kart-racing/models.js')]);
  const track=makeTrack(0);scene.add(buildWorld(track,0));scene.environment=makeEnvironment(0);
  lighting(track.config.sky,0x566270,1.4,2.1,[-20,40,15]);renderer.toneMappingExposure=1.15;
  for(const [i,s,lane] of [[0,0,-2.1],[2,-4,2.6],[1,-8,-2.8],[3,-11,2.5]]){
   const a=track.sample(s),kart=buildKart(i);kart.position.copy(a.p).addScaledVector(a.right,lane);kart.rotation.y=a.yaw;scene.add(kart);
  }
  const a=track.sample(0),p=a.p.clone();camera.fov=49;
  camera.position.copy(p).addScaledVector(a.t,7.5).addScaledVector(a.right,5.6).add(new THREE.Vector3(0,3.0,0));
  camera.lookAt(p.clone().addScaledVector(a.t,-3.2).add(new THREE.Vector3(0,.55,0)));
 }else if(game==='neon'){
  const [{buildMap,maps},{buildGun}]=await Promise.all([import('./games/neon-clash/maps.js'),import('./games/neon-clash/weapons.js')]);
  scene.add(buildMap(1).root);lighting(maps[1].sky,0x4d5c70,2.0,3,[-18,35,20],40);
  camera.fov=64;camera.position.set(-17,2.25,19);camera.lookAt(-4,2,-9);
  // The original first-person gun, including the player's gloved hands.
  camera.add(buildGun(12));scene.add(camera);
  const bot=new THREE.Group();const part=(x,y,z,w,h,d,c)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.4,metalness:.25}));m.position.set(x,y,z);m.castShadow=true;bot.add(m)};
  part(0,1.1,0,.7,.75,.4,0xff8854);part(0,1.72,0,.48,.48,.45,0xd3e0ee);part(0,1.76,-.232,.36,.13,.03,0x172b44);part(-.2,.4,0,.24,.65,.3,0x293750);part(.2,.4,0,.24,.65,.3,0x293750);part(-.47,1.08,-.1,.22,.6,.25,0xff8854);part(.47,1.08,-.1,.22,.6,.25,0xff8854);part(0,2.13,0,.55,.065,.05,0xff8854);
  const gun=buildGun(9,{world:true});gun.position.set(.29,1.26,-.26);gun.scale.setScalar(.8);bot.add(gun);bot.position.set(-16,0,6);bot.rotation.y=Math.PI;scene.add(bot);
 }else if(game==='lava'){
  const {buildScene}=await import('./games/floor-is-lava/scene.js');const world=buildScene(0);world.update(3,-.55);scene.add(world.root);
  lighting(0x221a24,0xa4401c,2.3,3.3,[12,25,8],35);renderer.toneMapping=THREE.NoToneMapping;scene.fog=new THREE.Fog(0x221a24,35,115);
  camera.fov=64;camera.position.set(7,7.4,5);camera.lookAt(0,2.2,-17);
 }else if(game==='color'){
  const [{makeArena,makeAvatar,makeTileMaterials,ARENAS},{createGame}]=await Promise.all([import('./games/color-rush/scene.js'),import('./games/color-rush/rules.js')]);
  const mats=makeTileMaterials(),world=makeArena(0,mats),g=createGame('chill',42);scene.add(world);
  world.userData.tiles.forEach((t,i)=>{t.userData.base.material=mats[g.board[i]].side;t.userData.top.material=mats[g.board[i]].top});
  const colors=['#48cfad','#57a5ef','#ff8a75','#b995f0','#ffd05c','#63d5ba','#f38eb0','#8ba9ec'];
  g.actors.forEach((a,i)=>{const m=makeAvatar(colors[i]);m.position.set(a.x,a.y,a.z);m.rotation.y=.3-i*.2;m.userData.arms[0].rotation.x=-.4;m.userData.legs[1].rotation.x=.35;scene.add(m)});
  lighting(ARENAS[0].sky,0x7d8c92,2.4,3.2,[-12,25,10],21);renderer.toneMappingExposure=1.18;camera.fov=52;
  camera.position.set(13,14,18);camera.lookAt(0,.1,0);
 }else if(game==='baseball'){
  const {makeStadium,makePlayer,makeBall,STADIUMS}=await import('./games/baseball-blast/scene.js');scene.add(makeStadium(0));
  lighting(STADIUMS[0].sky,0x718456,2.2,3.1,[-35,75,30],95);renderer.toneMappingExposure=1.05;
  const batter=makePlayer(0x427eab,'batter');batter.position.set(-.98,0,.12);batter.rotation.y=-.25;scene.add(batter);
  const pitcher=makePlayer(0xde7851,'pitcher');pitcher.position.set(0,.3,-18.44);pitcher.rotation.y=Math.PI;pitcher.userData.arms[1].rotation.x=-1.3;scene.add(pitcher);
  for(const [x,z] of [[19.4,-19.4],[12,-35],[-13,-35],[-19.4,-19.4],[-39,-71],[0,-86],[39,-71]]){const f=makePlayer(0xde7851);f.position.set(x,0,z);f.rotation.y=Math.PI;scene.add(f)}
  const ball=makeBall();ball.position.set(-.12,1.3,-2.6);scene.add(ball);camera.fov=54;camera.position.set(3.5,3.0,5.2);camera.lookAt(-2,.9,-4.4);
 }else if(game==='football'){
  const [{makeStadium,makePlayer,makeBall,STADIUMS},{createGame,JERSEYS},{teamById}]=await Promise.all([import('./games/touchdown-rush/scene.js?v=players1'),import('./games/touchdown-rush/rules.js?v=players1'),import('./games/touchdown-rush/teams.js?v=players1')]);const teams=[teamById('dallas-cowboys'),teamById('kansas-city-chiefs')];scene.add(makeStadium(0,teams));
  lighting(STADIUMS[0].sky,0x536b46,2.2,3.1,[-28,65,35],65);renderer.toneMappingExposure=1.12;
  for(const p of createGame().actors){const team=teams[p.team],a=makePlayer(team.color,p.jerseyNumber,team);a.position.set(p.x,0,p.z);a.rotation.y=p.yaw;scene.add(a);if(p.id===0){a.userData.arms[1].rotation.x=-.8;const ball=makeBall();ball.position.set(.4,1.1,-.2);ball.rotation.z=Math.PI/3;a.add(ball)}}
  camera.fov=52;camera.position.set(16,17,55);camera.lookAt(0,1,23);
 }else throw Error('Unknown cover scene');
 function render(){const rect=canvas.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderer.render(scene,camera);document.getElementById('status').textContent='Ready: '+game+' · real game assets';}
 render();window.addEventListener('resize',render);
}catch(e){document.getElementById('status').textContent=e.message;console.error(e)}
