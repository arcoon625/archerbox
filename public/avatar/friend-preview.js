import * as THREE from '../vendor/three.module.js';
import {buildAvatar,disposeAvatar} from './models.js?v=glitchdrop1';
import {studioEnvironment} from './surfaces.js?v=scan2';

export function showFriendPreview(canvas,look){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
 let model,environment,observer;
 function dispose(){
  observer?.disconnect();
  if(model)disposeAvatar(model);
  environment?.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
 }
 try{
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.96;
  const scene=new THREE.Scene();
  environment=studioEnvironment(renderer);
  scene.environment=environment.texture;
  scene.environmentIntensity=.45;
  scene.add(new THREE.HemisphereLight(0xeaf0ff,0x82705e,.65));
  const key=new THREE.DirectionalLight(0xfff2e5,2.2);
  key.position.set(-3,4,4);
  const fill=new THREE.DirectionalLight(0xdde9ff,1.25);
  fill.position.set(3,3,-3);
  scene.add(key,fill);

  model=buildAvatar(look);
  scene.add(model);
  const bounds=new THREE.Box3().setFromObject(model);
  const center=bounds.getCenter(new THREE.Vector3());
  const size=bounds.getSize(new THREE.Vector3());
  const camera=new THREE.PerspectiveCamera(34,1,.04,50);
  let angle=.18;
  function draw(){
   const {clientWidth:width,clientHeight:height}=canvas;
   if(!width||!height)return;
   renderer.setSize(width,height,false);
   camera.aspect=width/height;
   camera.updateProjectionMatrix();
   const radius=Math.hypot(size.x,size.z)/2;
   const halfFrame=Math.max(size.y*.54,radius/camera.aspect);
   const distance=halfFrame/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))+radius*.66;
   camera.position.set(center.x+distance*Math.sin(angle),center.y+.23,center.z+distance*Math.cos(angle));
   camera.lookAt(center);
   renderer.render(scene,camera);
  }
  observer=new ResizeObserver(draw);
  observer.observe(canvas);
  draw();
  return {
   setBack(back){angle=back?Math.PI+.18:.18;draw();},
   dispose
  };
 }catch(error){
  dispose();
  throw error;
 }
}
