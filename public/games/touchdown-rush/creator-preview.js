import * as THREE from '../../vendor/three.module.js';
import {makePlayer,animatePlayer} from './players.js?v=creators1';
import {dispose} from './scene.js?v=creators1';
import {playerProfile} from './creator-data.js?v=accuracy1';

// Keep one renderer for this canvas. Tabs pause it instead of destroying its
// graphics context and immediately asking Three.js to reuse that lost context.
export function createPreview(canvas,{onStatus=()=>{},createRenderer=options=>new THREE.WebGLRenderer(options)}={}){
 let renderer=null,model=null,active=false,closed=false,lost=false,failed=false;
 let yaw=Math.PI+.25,raf=0,resizeFrame=0,drag=null,lastWidth=0,lastHeight=0;
 const start=performance.now(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,30);
 scene.add(new THREE.HemisphereLight(0xe5f8ff,0x263746,3));
 const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,5,5);scene.add(key);
 const rim=new THREE.DirectionalLight(0x67dacc,3);rim.position.set(3,3,-3);scene.add(rim);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.8,.9,.08,48),new THREE.MeshStandardMaterial({color:0x172c40,metalness:.55,roughness:.35}));base.position.y=-.04;scene.add(base);
 function cancelFrames(){cancelAnimationFrame(raf);cancelAnimationFrame(resizeFrame);raf=resizeFrame=0;}
 function fail(error){failed=true;cancelFrames();onStatus('unavailable');console.warn('Player preview unavailable:',error.message);}
 try{renderer=createRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;}catch(error){fail(error);}
 function resize(){
  if(!active||lost||failed||closed)return;
  const box=canvas.getBoundingClientRect(),w=Math.round(box.width),h=Math.round(box.height);
  if(!w||!h||w===lastWidth&&h===lastHeight)return;
  try{renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();lastWidth=w;lastHeight=h;}catch(error){fail(error);}
 }
 const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);if(active&&!lost&&!failed)resizeFrame=requestAnimationFrame(resize);});
 const down=e=>{drag=e.clientX;try{canvas.setPointerCapture(e.pointerId);}catch{}};
 const move=e=>{if(drag===null)return;yaw+=(e.clientX-drag)*.01;drag=e.clientX;},up=()=>drag=null;
 function queueFrame(){if(!raf&&active&&!lost&&!failed&&!closed)raf=requestAnimationFrame(frame);}
 function frame(now){
  raf=0;if(!active||lost||failed||closed)return;
  try{
   if(model){const t=(now-start)/1000;animatePlayer(model,{id:0,role:model.userData.role,moving:0},t,{ready:true});model.rotation.y=yaw;const height=model.userData.profile.heightYards,fit=Math.max(1,.7/camera.aspect);camera.position.set(0,height*.58,4.7*fit);camera.lookAt(0,height*.5,0);}
   renderer.render(scene,camera);window.dispatchEvent(new Event('archerbox:frame-ok'));queueFrame();
  }catch(error){fail(error);}
 }
 function contextLost(event){event.preventDefault();lost=true;cancelFrames();if(active)onStatus('restoring');}
 function contextRestored(){lost=false;failed=false;lastWidth=lastHeight=0;if(active){onStatus('ready');resize();queueFrame();}}
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['webglcontextlost',contextLost],['webglcontextrestored',contextRestored]];
 for(const [type,fn] of listeners)canvas.addEventListener(type,fn);
 function clearModel(){if(model){scene.remove(model);dispose(model);model=null;}}
 function suspend(){active=false;drag=null;cancelFrames();observer.disconnect();clearModel();renderer?.renderLists?.dispose();}
 return {
  update(player,team){
   if(closed)return;active=true;
   if(failed||!renderer){onStatus('unavailable');return;}
   try{clearModel();model=makePlayer(team.color,player.number,{...team,playerId:player.id,playerName:player.name,role:player.position,customProfile:playerProfile(player)});scene.add(model);observer.observe(canvas);onStatus(lost?'restoring':'ready');resize();queueFrame();}catch(error){fail(error);}
  },
  suspend,
  close(){if(closed)return;suspend();closed=true;for(const [type,fn] of listeners)canvas.removeEventListener(type,fn);dispose(base);renderer?.dispose();}
 };
}
