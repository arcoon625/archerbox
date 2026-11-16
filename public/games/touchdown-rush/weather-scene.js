import * as T from '../../vendor/three.module.js';
export function makeWeatherScene(scene,renderer,ambient,sun) {
 const root=new T.Group();scene.add(root);
 const count=420,rainPositions=new Float32Array(count*6),snowPositions=new Float32Array(count*3);
 const rainGeometry=new T.BufferGeometry(),snowGeometry=new T.BufferGeometry();
 rainGeometry.setAttribute('position',new T.BufferAttribute(rainPositions,3));snowGeometry.setAttribute('position',new T.BufferAttribute(snowPositions,3));
 const rain=new T.LineSegments(rainGeometry,new T.LineBasicMaterial({color:0xcbdde8,transparent:true,opacity:.5,depthWrite:false}));
 const snow=new T.Points(snowGeometry,new T.PointsMaterial({color:0xffffff,size:.15,transparent:true,opacity:.88,depthWrite:false}));
 rain.frustumCulled=snow.frustumCulled=false;root.add(rain,snow);
 const dust=new T.Mesh(new T.PlaneGeometry(53.3,120),new T.MeshBasicMaterial({color:0xe4edf1,transparent:true,opacity:.2,depthWrite:false}));dust.rotation.x=-Math.PI/2;dust.position.y=.065;scene.add(dust);
 let lastKey='';
 function update(weather,time,camera,park,{active=true,reducedMotion=false}={}) {
  const kind=active?weather?.kind||'clear':'clear',key=kind+'/'+park;
  if(key!==lastKey){
   lastKey=key;const night=park===1,sky=kind==='snow'?(night?0x687a8c:0xbac8d0):kind==='rain'?(night?0x26394c:0x6e8492):[0xb6d4e3,0x111c32,0xb7dce5][park];
   renderer.setClearColor(sky);scene.fog=new T.Fog(sky,kind==='snow'?10:kind==='rain'?55:125,kind==='snow'?66:kind==='rain'?190:310);
   ambient.intensity=night?1.1:kind==='clear'||kind==='wind'?1.15:1.5;sun.intensity=night?2:kind==='rain'?1.1:kind==='snow'?1.5:2.4;
  }
  rain.visible=kind==='rain';snow.visible=dust.visible=kind==='snow';root.position.set(camera.position.x,0,camera.position.z);
  if(!rain.visible&&!snow.visible)return;
  const phase=reducedMotion?0:time;
  for(let i=0;i<count;i++){
   const x=((i*17.311)%72)-36,z=((i*29.731)%86)-43;
   if(rain.visible){const y=34-((i*3.73+phase*27)%34),o=i*6;rainPositions.set([x,y,z,x-.25,y-1.15,z+.12],o);}
   else{const y=32-((i*3.73+phase*2.8)%32),o=i*3;snowPositions.set([x+Math.sin(phase*.7+i)*.7,y,z+Math.cos(phase*.5+i)*.6],o);}
  }
  (rain.visible?rainGeometry:snowGeometry).attributes.position.needsUpdate=true;
 }
 return {update};
}
