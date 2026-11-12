import * as THREE from '../../vendor/three.module.js';
import {course,levels,platformX} from './levels.js';
function label(text,color='#ecf5f3',bg='#263441'){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(8,8,496,112);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 52px Arial';ctx.fillText(text,256,65,480);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t});
}
function grain(){const n=128,data=new Uint8Array(n*n*4);for(let i=0;i<n*n;i++){const v=190+Math.random()*65;data[i*4]=data[i*4+1]=data[i*4+2]=v;data[i*4+3]=255}const t=new THREE.DataTexture(data,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.generateMipmaps=true;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.needsUpdate=true;return t}
export function buildScene(index){
 const config=levels[index],root=new THREE.Group(),platforms=course(index),models=[],stone=grain();
 const material=(c,metal=false)=>new THREE.MeshStandardMaterial({color:c,roughness:metal?.48:.92,metalness:metal?.55:.05,map:stone,bumpMap:stone,bumpScale:.025});
 const bodyMat=material(config.color,index===1||index===3),topMat=material(index===1?0x75858e:index===3?0x435866:0x786963,index===1||index===3),darkMat=material(0x273340,true),checkpointMat=new THREE.MeshStandardMaterial({color:0x77ffc0,emissive:0x3ad59b,emissiveIntensity:1.4}),amberMat=new THREE.MeshStandardMaterial({color:0xffa561,emissive:0xff6b2c,emissiveIntensity:1.2});
 const box=(parent,x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
 for(const p of platforms){const g=new THREE.Group();g.position.set(p.x,p.y,p.z);root.add(g);models.push(g);const special=p.checkpoint||p.finish;
  box(g,0,-p.h/2,0,p.w,p.h,p.d,bodyMat);box(g,0,.02,0,p.w+.08,.08,p.d+.08,special?material(0x366f62,true):topMat);
  const trim=special?checkpointMat:p.amplitude?new THREE.MeshStandardMaterial({color:0x71c9e6,emissive:0x1689b6,emissiveIntensity:1.2}):amberMat;
  for(const s of [-1,1]){box(g,s*(p.w/2-.13),.072,0,.075,.035,p.d-.18,trim);box(g,0,.072,s*(p.d/2-.13),p.w-.18,.035,.075,trim)}
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2.6,p.w*.75),.6),label(p.id===0?'START':p.finish?'ESCAPE':p.checkpoint?'CHECKPOINT':String(p.id).padStart(2,'0'),special?'#a8ffe0':'#ffe4ce',special?'#285449':'#36414b'));sign.rotation.x=-Math.PI/2;sign.position.set(0,.085,.15);g.add(sign);
  if(!p.amplitude){const column=new THREE.Mesh(new THREE.CylinderGeometry(p.w*.29,p.w*.39,p.y+5,config.theme==='factory'?8:6),bodyMat);column.position.set(0,-(p.y+5)/2-p.h/2,0);g.add(column)}else{box(g,0,-.65,0,p.w+.22,.12,.5,darkMat);box(g,0,-.4,0,.6,.8,p.d+.22,darkMat)}
  if(p.checkpoint){const flag=box(g,p.w/2-.35,1.3,-p.d/2+.35,.04,2.6,.04,darkMat);box(g,p.w/2-.05,2.25,-p.d/2+.35,.64,.44,.025,checkpointMat);const lamp=new THREE.PointLight(0x6affb8,8,7);lamp.position.set(0,1,0);g.add(lamp)}
  if(index===1||index===3){for(const s of [-1,1])for(const t of [-1,1])box(g,s*(p.w/2-.22),-.18,t*(p.d/2-.22),.11,.08,.11,darkMat);for(let z=-p.d/2+.4;z<p.d/2;z+=.35)box(g,0,.071,z,p.w-.6,.015,.03,darkMat)}
 }
 const end=platforms.at(-1),gate=new THREE.Group();gate.position.set(end.x,end.y+.08,end.z-1.2);root.add(gate);for(const x of [-1.25,1.25]){box(gate,x,2,0,.36,4,.5,darkMat);box(gate,x,2,.27,.09,3.6,.035,checkpointMat)}box(gate,0,4,0,2.85,.36,.5,darkMat);box(gate,0,4,.27,2.55,.09,.035,checkpointMat);
 const portal=new THREE.Mesh(new THREE.PlaneGeometry(2.25,3.75),new THREE.MeshBasicMaterial({color:0x70ffd0,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false}));portal.position.set(0,1.95,0);gate.add(portal);const exit=new THREE.Mesh(new THREE.PlaneGeometry(2.3,.55),label('EXIT','#c2ffe8','#1c574a'));exit.position.set(0,4.4,.1);gate.add(exit);
 const lavaMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}',fragmentShader:`
 varying vec2 vUv;varying vec3 vWorld;uniform float uTime;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec2 uv=vUv*vec2(28.,45.);uv+=vec2(sin(uv.y*.6+uTime*.18),cos(uv.x*.65+uTime*.14))*.25;vec2 id=floor(uv),f=fract(uv);float a=10.,b=10.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 p=o+vec2(hash(id+o),hash(id+o+23.))-f;float d=dot(p,p);if(d<a){b=a;a=d;}else b=min(b,d);}float crack=1.-smoothstep(.012,.12,b-a);float hot=.5+.5*sin(uv.x*1.7+uv.y*2.+uTime*.6);vec3 crust=mix(vec3(.07,.025,.021),vec3(.24,.054,.022),hot);vec3 fire=mix(vec3(1.,.14,.015),vec3(1.,.72,.14),crack);vec3 c=mix(crust,fire,crack);c=mix(c,vec3(.13,.065,.075),smoothstep(65.,150.,distance(cameraPosition,vWorld)));gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }`});
 const lava=new THREE.Mesh(new THREE.PlaneGeometry(110,180),lavaMat);lava.rotation.x=-Math.PI/2;lava.position.set(0,-.55,-55);root.add(lava);
 // Scenery stays outside the playable route.
 const length=Math.abs(end.z)+30,sceneryMat=material(index===2?0x6f4e40:0x33303a,index===1||index===3);
 for(const side of [-1,1])for(let z=10;z>-length;z-=10){const x=side*(15+(index===2?Math.sin(z)*2:0)),h=8+Math.abs(Math.sin(z*1.7))*12;
  if(index===1||index===3){box(root,x,h/2-4,z,5,h,7,sceneryMat);box(root,x,h-3.8,z,5.5,.35,7.5,darkMat);for(let y=0;y<h-4;y+=3){box(root,x-side*2.52,y,z,.04,1,4,index===3?checkpointMat:amberMat)}const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,7,12),darkMat);pipe.position.set(x-side*3,3,z);root.add(pipe)}
  else{const rock=new THREE.Mesh(new THREE.CylinderGeometry(2.5,5,h,6),sceneryMat);rock.position.set(x,h/2-6,z);rock.rotation.y=z;root.add(rock);if(index===4){box(root,x,Math.max(1,h-5),z,.14,4,.14,amberMat)}}
 }
 const motes=[];for(let i=0;i<200;i++)motes.push((Math.random()-.5)*38,Math.random()*13,-Math.random()*length);const sparks=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(motes,3)),new THREE.PointsMaterial({color:0xffbb73,size:.045,transparent:true,opacity:.65}));root.add(sparks);
 root.updateMatrixWorld(true);
 return {root,platforms,end,lava,update(time,lavaHeight){lava.position.y=lavaHeight;lavaMat.uniforms.uTime.value=time;portal.material.opacity=.16+Math.sin(time*2)*.05;platforms.forEach((p,i)=>{const x=platformX(p,time);models[i].position.x=x;p.currentX=x});sparks.position.y=Math.sin(time*.25)*.7},dispose(){const geo=new Set(),mats=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){mats.add(m);if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap)}});geo.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose())}};
}
