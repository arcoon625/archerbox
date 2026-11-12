import * as THREE from '../../vendor/three.module.js';
export const maps=[
 {id:'classic',name:'Original Arena',detail:'Stepped platforms • jump pads',code:'00',color:'#ceff59',sky:0x91c5ee,fog:110},
 {id:'rooftops',name:'Skyline Rooftops',detail:'Rooftop bridges • vent platforms',code:'01',color:'#ffba75',sky:0xb2c5d3,fog:155},
 {id:'orbital',name:'Orbital Station',detail:'Reactor room • cargo platforms',code:'02',color:'#85e3ff',sky:0x060b19,fog:145},
 {id:'construction',name:'Construction Clash',detail:'Scaffold ramps • stacked platforms',code:'03',color:'#f6d265',sky:0xb6cbd7,fog:145},
 {id:'desert',name:'Desert Outpost',detail:'Sandstone buildings • supply crates',code:'04',color:'#ffc486',sky:0xe5caa2,fog:130},
 {id:'frost',name:'Frost Fortress',detail:'Snowy battlements • raised lookout',code:'05',color:'#b2edff',sky:0xc5dce8,fog:110},
 {id:'subway',name:'Metro Mayhem',detail:'Train cars • station platforms',code:'06',color:'#ffdb66',sky:0x17242c,fog:95,indoor:true}
];
// Original playable geometry. Heights use arena units, with each map's main deck at zero.
export function buildMap(index){
 const root=new THREE.Group(),solids=[],surfaces=[],platforms=[],jumpRoutes=[],ceilings=[],groundMeshes=[],pads=[],textures=[],materials=new Map();
 let seed=907+index*97;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 function grain(kind){const n=128,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){let v=kind==='metal'?224+rand()*25:190+rand()*60;if(kind==='concrete'&&rand()<.04)v-=65;if(kind==='wood')v=180+Math.sin(x*.85+Math.sin(y*.09))*25+rand()*35;if(kind==='metal'&&y%16===0)v-=24;let p=(y*n+x)*4;data[p]=data[p+1]=data[p+2]=v;data[p+3]=255}const t=new THREE.DataTexture(data,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(10,10);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;textures.push(t);return t}
 const grains={concrete:grain('concrete'),metal:grain('metal'),wood:grain('wood')};
 function mat(color,kind='plain'){const key=color+':'+kind;if(materials.has(key))return materials.get(key);const m=new THREE.MeshStandardMaterial({color,roughness:kind==='metal'?.48:kind==='glass'?.18:.87,metalness:kind==='metal'?.45:.05,...(grains[kind]?{map:grains[kind],bumpMap:grains[kind],bumpScale:kind==='concrete'?.035:.007}:{}),...(kind==='glow'?{emissive:color,emissiveIntensity:1.9}:{}),...(kind==='glass'?{transparent:true,opacity:.16,metalness:.15,depthWrite:false}:{})});materials.set(key,m);return m}
 function add(geometry,color,x,y,z,kind='plain'){const m=new THREE.Mesh(geometry,mat(color,kind));m.position.set(x,y,z);m.castShadow=kind!=='glow'&&kind!=='glass';m.receiveShadow=true;root.add(m);return m}
 function box(x,y,z,w,h,d,color,solid=false,kind='plain'){const m=add(new THREE.BoxGeometry(w,h,d),color,x,y,z,kind);if(solid)solids.push({x,y,z,w,h,d,mesh:m});const top=y+h/2;if(w>=1&&d>=1&&top>.1&&top<6&&(solid||h<=.5)){platforms.push({x,z,w,d,y:top});ceilings.push({x,z,w,d,y:y-h/2});if(!solid)groundMeshes.push(m)}else if(solid)ceilings.push({x,z,w,d,y:y-h/2});return m}
 function cyl(x,y,z,r,h,color,kind='metal',r2=r){return add(new THREE.CylinderGeometry(r2,r,h,16),color,x,y,z,kind)}
 function beam(a,b,r=.045,color=0x77818b){const d=b.clone().sub(a),m=cyl(0,0,0,r,d.length(),color);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
 function deck(x,z,w,d,y=0,color=0x777e83,kind='concrete'){const m=box(x,y-.25,z,w,.5,d,color,false,kind);surfaces.push({x,z,w,d,y});ceilings.push({x,z,w,d,y:y-.5});groundMeshes.push(m);return m}
 function ramp(x,z,w,d,top,color=0x69737c,reverse=false){const vertices=new Float32Array([-w/2,0,-d/2,w/2,0,-d/2,w/2,top,d/2,-w/2,top,d/2,-w/2,-.2,-d/2,w/2,-.2,-d/2,w/2,-.2,d/2,-w/2,-.2,d/2]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(vertices,3));geo.setIndex([0,3,2,0,2,1,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);geo.computeVertexNormals();const m=add(geo,color,x,0,z,'metal');if(reverse)m.rotation.y=Math.PI;groundMeshes.push(m);surfaces.push({x,z,w,d,y:top,ramp:true,reverse});for(let i=0;i<12;i++){let t=(i+.5)/12;box(x,top*(reverse?1-t:t)+.025,z-d/2+t*d,w,.04,.06,0x9a9e9f)}return m}
 function rail(x,z,w,d,y=0,color=0x64747d){if(w>d){for(let t=-w/2;t<=w/2;t+=2.5)cyl(x+t,y+.55,z,.035,1.1,color);box(x,y+1.1,z,w,.07,.07,color);box(x,y+.5,z,w,.04,.04,color)}else{for(let t=-d/2;t<=d/2;t+=2.5)cyl(x,y+.55,z+t,.035,1.1,color);box(x,y+1.1,z,.07,.07,d,color);box(x,y+.5,z,.04,.04,d,color)}box(x,y+.6,z,w,1.2,d,color,true,'metal').visible=false;solids[solids.length-1].collisionOnly=true}
 function label(text,x,y,z,w=3,color='#eef4f6',bg='#27343f',ry=(z<0?Math.PI:0)){if(typeof document==='undefined')return;const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(8,8,496,112);ctx.fillStyle=color;ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66,470);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;root.add(m)}
 function crate(x,z,y=0,w=2){box(x,y+w/2,z,w,w,w,0x777762,true,'wood');for(const s of [-1,1]){box(x+s*(w/2+.01),y+w/2,z,.09,w,w,0x474d4e);box(x,y+w/2,z+s*(w/2+.01),w,w,.09,0x6e7056);for(const t of [-1,1])box(x+t*w*.32,y+w/2,z+s*(w/2+.065),.09,w,.05,0x4f564e)}box(x,y+w+.035,z,w,.07,w,0x999379)}
 function pad(x,z,y=0){box(x,y+.04,z,2.6,.08,2.6,0x253442,false,'metal');box(x,y+.09,z,2.1,.025,2.1,0x89e4f5,false,'glow');for(let j=-1;j<=1;j++)box(x,y+.11,z+j*.42,1.3,.02,.11,0x20363d);pads.push({x,z,y,r:1.3});}
 function hvac(x,z){box(x,1.05,z,3.2,2.1,2.4,0x7c8489,true,'metal');box(x,2.14,z,3.35,.1,2.55,0xabb2b6,false,'metal');for(const dx of [-.8,.8]){cyl(x+dx,2.21,z,.61,.055,0x252d31);for(let i=0;i<8;i++){const a=i*Math.PI/4;beam(new THREE.Vector3(x+dx+Math.cos(a)*.15,2.25,z+Math.sin(a)*.15),new THREE.Vector3(x+dx+Math.cos(a+.7)*.52,2.25,z+Math.sin(a+.7)*.52),.033,0x969b9d)}}for(let i=0;i<8;i++)box(x, .35+i*.2,z-1.215,2.8,.04,.04,0x26363a);for(let i=0;i<4;i++)cyl(x-1.3+i*.86,2.22,z-1,.03,.05,0x343e42)}
 function city(){for(let i=0;i<44;i++){const a=i/44*Math.PI*2,r=47+rand()*45,w=5+rand()*8,d=7+rand()*6,h=18+rand()*43,x=Math.cos(a)*r,z=Math.sin(a)*r;box(x,-35+h/2,z,w,h,d,0x657786,false,'concrete');for(let row=0;row<h/2.6;row++)for(let col=0;col<3;col++){box(x+(col-1)*w*.26,-35+row*2.6+2,z-d/2-.04,w*.14,1.3,.06,rand()>.3?0xabc6d5:0x354957,false,rand()>.75?'glow':'plain')}box(x,-35+h+.2,z,w+.3,.35,d+.3,0x455967)}}
 if(index===0){
  deck(0,0,48,48,0,0xe1e5ed);box(0,-2,0,49,2,49,0x4d5b79);
  for(const [x,z,w,d]of[[0,-24,48,1],[0,24,48,1],[-24,0,1,48],[24,0,1,48]]){box(x,2,z,w,4,d,0x687791,true);box(x,4.1,z,w,.2,d,0xcaff64)}
  for(const s of [-1,1]){box(s*15,2,0,7,4,10,s<0?0x449de9:0xf59057,true);box(s*15,4.2,0,7.4,.4,10.4,0xeaf1f8);box(s*6,1.5,s*8,4,3,5,0x8292ae,true);box(s*6,3.1,s*8,4.2,.2,5.2,0xcaff64);box(s*17,1.2,s*15,5,2.4,3,0x9aa9bf,true);box(s*17,2.5,s*15,5.2,.2,3.2,0xf0f4f8);box(s*8,1,-s*17,4,2,4,0x798da9,true)}
  box(0,1.1,0,5,2.2,5,0x697d9a,true);box(0,2.3,0,5.3,.2,5.3,0xceff59);for(let i=-20;i<=20;i+=4){box(i,.012,0,.045,.02,46,0xc5cdd9);box(0,.012,i,46,.02,.045,0xc5cdd9)}for(const z of [-19,19])pad(0,z);city();
 }else if(index===1){
  // Three continuous rooftops joined by two grated bridges across visible building gaps.
  for(const x of [-14,14]){deck(x,0,20,48,0,0x696d70);box(x,-15,0,20,29.5,48,0x687a87,false,'concrete');for(const z of [-24,24]){box(x,.65,z,20,1.3,.5,0x9a9b98,true,'concrete');box(x,1.34,z,20,.12,.65,0xb8b9b5)}box(x+(x<0?-10:10),.65,0,.5,1.3,48,0x9a9b98,true,'concrete')}
  deck(0,0,8,10,0,0x727a80,'metal');for(const z of [-14,14]){deck(0,z,8,4,0,0x66747c,'metal');rail(0,z-2,8,.1);rail(0,z+2,8,.1);for(let x=-3.5;x<=3.5;x+=.5)box(x,.03,z,.025,.02,3.8,0xa2b0b8)}
  for(const x of [-4,4])for(const z of [-8.5,8.5,-20,20])rail(x,z,.12,7);
  for(const [x,z]of[[-12,-7],[-12,9],[12,-9],[12,7]])hvac(x,z);
  for(const x of [-10,10]){box(x,1.6,0,3,3.2,4.8,0xb4aaa0,true,'concrete');box(x,3.25,0,3.3,.12,5.1,0x565e63,false,'metal');box(x,1.15,-2.42,1.1,2.3,.035,0x54636b);label('ROOF ACCESS',x,2.7,-2.45,2);for(const z of [-1.8,1.8])box(x+1.52,1.6,z,.06,2.5,.4,0x78898f)}
  for(const x of [-17,17]){cyl(x,.28,13,.4,.56,0x798891);const elbow=cyl(x,.65,13,.18,.55,0x9da8ac);elbow.rotation.z=Math.PI/2;box(x,.16,6,.25,.2,12,0x858f95,false,'metal');for(let z=-20;z<20;z+=5)box(x,.02,z,5,.025,.04,0x42494b)}
  for(const x of [-21,21])for(const z of [-19,19]){cyl(x,.35,z,.12,.7,0x9c9790);cyl(x,.75,z,.26,.09,0xd7d0c3);box(x,.48,z,.025,.15,.025,0xffd292,false,'glow')}
  for(const z of [-14,14])pad(0,z);city();label('SKYLINE / 38F',-22.72,1.8,0,4,'#ffe5c2','#445159',Math.PI/2);
 }else if(index===2){
  deck(0,0,48,48,0,0x4e5a64,'metal');box(0,7.3,0,48,.35,48,0x263541,true,'metal');box(0,-2,0,49,3,49,0x202d3b,false,'metal');
  for(let x=-22;x<=22;x+=4)for(let z=-22;z<=22;z+=4){box(x,.012,z,3.95,.018,3.95,(Math.round(x+z)%8===0)?0x55616c:0x616d76,false,'metal');box(x,.03,z,3.5,.008,.025,0x27353f)}
  for(const z of [-24,24]){box(0,1,z,48,2,.45,0x263541,true,'metal');box(0,6.4,z,48,1.3,.6,0x263541,true,'metal');box(0,4,z,48,4,.12,0x80cfff,true,'glass');for(let x=-24;x<=24;x+=6){box(x,3.5,z,.22,7,.55,0x647785,true,'metal');box(x,6,z-.28,.06,.07,.06,0x81dfff,false,'glow')}}
  for(const x of [-24,24]){box(x,3.5,0,.55,7,48,0x263541,true,'metal');for(let z=-21;z<24;z+=6){box(x-(x>0?.3:-.3),3,z,.06,4,4.8,0x627482,false,'metal');box(x-(x>0?.36:-.36),5.5,z,.06,.11,4.6,0x6ae0f7,false,'glow')}}
  // Central reactor forms cover, with openings on all four sides.
  box(0,1.6,0,5.5,3.2,5.5,0x293e4d,true,'metal');cyl(0,4,0,1.5,4.8,0x498291,'glass');cyl(0,4,0,.62,4.1,0x63e5ff,'glow');for(const y of [2,3.5,5,6.3]){const ring=add(new THREE.TorusGeometry(1.68,.13,8,32),0x889ba4,0,y,0,'metal');ring.rotation.x=Math.PI/2}for(const x of [-2,2])for(const z of [-2,2])box(x,4,z,.22,4,.22,0x687f8b,false,'metal');label('REACTOR 07',0,2.2,-2.77,3.8,'#92efff');
  for(const x of [-9,9])for(const z of [-7,7]){box(x,1.7,z,6,3.4,.6,0x344754,true,'metal');box(x,3.48,z,6,.08,.65,0x8be3f4,false,'glow');for(let j=-2;j<=2;j++)box(x+j,1.7,z-.32,.06,2.8,.03,0x687d89)}
  for(const [x,z]of[[-15,-13],[-15,13],[15,-13],[15,13]]){box(x,1,z,3.3,2,3.3,0x6c7e88,true,'metal');for(const y of [.2,1.8])box(x,y,z,3.5,.1,3.5,0x273a47);box(x,1.15,z-1.67,2,.8,.03,0x344653);label('CARGO',x,1.15,z-1.7,1.6,'#cae9f1')}
  for(const x of [-12,12]){box(x,6.8,0,1.1,.35,48,0x3c5362,false,'metal');for(const z of [-16,0,16])box(x,6.59,z,.48,.08,7,0xc7f0ff,false,'glow')}
  for(const z of [-21,21]){box(0,.026,z,36,.02,.15,0x6dcddd);label('OBSERVATION',0,6.1,z<0?-23.7:23.7,6,'#8ee8ff','#27343f',z<0?0:Math.PI);}
  const stars=[];for(let i=0;i<600;i++){const a=rand()*Math.PI*2,y=(rand()-.3)*100,r=75+rand()*50;stars.push(Math.cos(a)*r,y,Math.sin(a)*r)}const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));root.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd7eaff,size:.25})));const planet=add(new THREE.SphereGeometry(19,40,24),0x376884,18,12,-78);planet.material= new THREE.MeshStandardMaterial({color:0x567da1,roughness:1});const clouds=add(new THREE.SphereGeometry(19.2,40,24),0xa9c1cc,18,12,-78,'glass');clouds.scale.set(1,1,.99);
  for(const x of [-7,7]){const light=new THREE.PointLight(0x59c9ff,38,24,2);light.position.set(x,4,0);root.add(light)}
  const fill=new THREE.DirectionalLight(0xc8e6f2,2.2);fill.position.set(0,12,4);root.add(fill);
 }else if(index===3){
  deck(0,0,48,48,0,0x999386);box(0,-1.5,0,49,2,49,0x77796e,false,'concrete');
  for(const z of [-24,24]){box(0,.7,z,48,1.4,.55,0x969993,true,'concrete');for(let x=-22;x<=22;x+=2.5){box(x,1.46,z,1.2,.08,.6,0xd6b44b);cyl(x,2.4,z,.035,2,0x707873)}box(0,2.2,z,48,.025,.025,0x748087);box(0,3.2,z,48,.025,.025,0x748087)}for(const x of [-24,24])box(x,.7,0,.55,1.4,48,0x969993,true,'concrete');
  function container(x,z,color){box(x,1.5,z,4.2,3,8,color,true,'metal');for(let dz=-3.8;dz<4;dz+=.4)for(const s of [-1,1])box(x+s*2.12,1.5,z+dz,.06,2.85,.08,color,false,'metal');for(const y of [.12,2.88])box(x,y,z,4.3,.12,8.1,0x454e4d,false,'metal');for(const s of [-1,1]){box(x+s*1.03,1.5,z-4.02,2.02,2.75,.05,color);for(const dx of [-.5,.5])cyl(x+s*1.03+dx,1.5,z-4.07,.025,2.6,0xa9b1ad);box(x+s*1.03,1.4,z-4.11,.6,.1,.08,0xa9b1ad)}label('NC FREIGHT',x,2.5,z-4.1,2.6,'#e4e2cf','#464c4c')}
  container(-12,-5,0x747d69);container(12,5,0xb57348);container(-11,14,0x637e8a);container(11,-14,0x8c8262);
  for(const x of [-5,5])for(const z of [-5,5]){box(x,1.8,z,1.3,3.6,1.3,0xaaa79c,true,'concrete');for(const dx of [-.35,.35])cyl(x+dx,4,z,.025,.8,0x555c5d)}
  deck(0,0,8,10,2.2,0x948269,'wood');ramp(0,-9,5,8,2.2);ramp(0,9,5,8,2.2,0x69737c,true);
  for(const x of [-4,4])rail(x,0,.1,10,2.2,0xb39c56);
  for(const x of [-4,4])for(const z of [-5,0,5]){cyl(x,1.1,z,.06,2.2,0x878f8c);beam(new THREE.Vector3(x,0,z-2),new THREE.Vector3(x,2.15,z+2),.035,0x989b87)}
  // A fixed tower crane beyond the fence, with a lattice boom and suspended hook.
  const cx=31,cz=4;for(const dx of [-.8,.8])for(const dz of [-.8,.8])box(cx+dx,10,cz+dz,.16,28,.16,0xd2ad42,false,'metal');for(let y=-4;y<24;y+=2){for(const dz of [-.8,.8])beam(new THREE.Vector3(cx-.8,y,cz+dz),new THREE.Vector3(cx+.8,y+2,cz+dz),.06,0xb89336);box(cx,y,cz,1.8,.13,1.8,0xc9a442)}box(20,23,4,30,.4,1.6,0xd1ae44,false,'metal');for(let x=5;x<34;x+=2){beam(new THREE.Vector3(x,23,3.2),new THREE.Vector3(x+2,25,3.2),.07,0xc7a139);beam(new THREE.Vector3(x,23,4.8),new THREE.Vector3(x+2,25,4.8),.07,0xc7a139);box(x,25,4,2,.13,1.6,0xc7a139)}box(31,23.9,4,3,2.1,2.6,0x596a73,false,'metal');beam(new THREE.Vector3(7,23,4),new THREE.Vector3(7,7,4),.014,0x363c3d);const hook=add(new THREE.TorusGeometry(.3,.075,8,16,Math.PI*1.55),0x525a59,7,6.9,4,'metal');hook.rotation.z=-Math.PI/2;
  for(const [x,z]of[[-18,4],[18,-4],[-4,17],[4,-17]])crate(x,z);for(const [x,z]of[[-8,-16],[8,16]]){box(x,.5,z,4,1,2,0x9c9d96,true,'concrete');for(let i=0;i<6;i++)box(x-1.6+i*.65,1.03,z,.3,.025,2.05,i%2?0x393e3d:0xdfba48)}
  for(const x of [-21,21])for(const z of [-12,12]){cyl(x,.38,z,.2,.76,0xc06a35,'plain',.02);box(x,.04,z,.5,.08,.5,0x333c3e);cyl(x,.32,z,.115,.1,0xe5dac6,'plain')}
  for(let i=0;i<6;i++)box(-3+i*.5,.08,19,.35,.13,3,0x94794d,false,'wood');label('HARD HAT AREA',0,2.5,-23.6,5,'#f9db6a','#27343f',0);city();
 }else if(index===4){
  deck(0,0,48,48,0,0xd2b181);box(0,-1.5,0,49,2,49,0xa78760);
  for(const [x,z,w,d]of[[0,-24,48,.7],[0,24,48,.7],[-24,0,.7,48],[24,0,.7,48]]){box(x,1.3,z,w,2.6,d,0xb5966f,true,'concrete');box(x,2.66,z,w+.12,.12,d+.12,0xe5c89d)}
  for(const side of [-1,1]){
   const x=side*11,z=side*5;box(x,1.8,z,5,3.6,7,0xc1a077,true,'concrete');box(x,3.67,z,5.4,.14,7.4,0xe4c99f);
   for(const dz of [-1.9,1.9]){box(x-side*2.515,2.25,z+dz,.03,1.1,1.25,0x403f37);for(const n of [-.35,0,.35])box(x-side*2.54,2.25,z+dz+n,.035,1.1,.045,0x858274,false,'metal')}
   box(x,1.15,z-3.52,1.3,2.3,.04,0x615f50,false,'wood');box(x+.44,1.15,z-3.56,.09,.09,.04,0xc0b084,false,'metal');label('SUPPLY '+(side<0?'A':'B'),x,2.9,z-3.54,2.8,'#ffdfab','#675b46',Math.PI);
   crate(side*7,side*8,0,1.8);crate(side*15,-side*8,0,2.2);
   // Low segmented sandbag cover has a broad, jumpable top.
   box(side*5,.8,-side*12,5,1.6,1.5,0xb4a078,true,'concrete');for(let row=0;row<3;row++)for(let n=0;n<5;n++)box(side*5-2+n,.27+row*.52,-side*12, .95,.48,1.6,row%2?0xbfae8d:0xa89978);
   box(side*16,.7,side*2,3,1.4,3,0x767b60,true,'metal');for(const y of [.1,1.3])box(side*16,y,side*2,3.12,.1,3.12,0x4c5346);
  }
  box(0,1.2,0,5,2.4,5,0xb99a71,true,'concrete');box(0,2.48,0,5.2,.16,5.2,0xe7cda5);label('OUTPOST 04',0,1.55,-2.54,3,'#ffe2ad','#786043',Math.PI);
  for(const x of [-29,29]){box(x,4,8,5,8,5,0xb49a75,false,'concrete');box(x,8.15,8,6,.3,6,0x6e7465,false,'metal');for(const dx of [-2.8,2.8])box(x+dx,9,8,.12,1.7,6,0x5e665b,false,'metal');cyl(x,11,8,.04,5,0x5c6157);box(x+1,12,8,2,.9,.035,0xcbb785)}
  for(let n=0;n<18;n++){const a=n*Math.PI/9,r=55+rand()*30,m=add(new THREE.SphereGeometry(9+rand()*8,16,8),0xc4a06c,Math.cos(a)*r,-4,Math.sin(a)*r,'concrete');m.scale.y=.4}
  for(const z of [-14,14])pad(0,z);
 }else if(index===5){
  deck(0,0,48,48,0,0xe2edf0);box(0,-1.5,0,49,2,49,0x8b9da5,false,'concrete');
  for(const [x,z,w,d]of[[0,-24,48,1],[0,24,48,1],[-24,0,1,48],[24,0,1,48]]){box(x,1.8,z,w,3.6,d,0x728795,true,'concrete');box(x,3.7,z,w+.2,.2,d+.2,0xf1f8fa);for(let t=-22;t<=22;t+=4){box(w>d?t:x,4.25,w>d?z:t,w>d?1.8:1.1,1.1,w>d?1.1:1.8,0x899ca6);box(w>d?t:x,4.84,w>d?z:t,w>d?2:1.3,.08,w>d?1.3:2,0xf6fafb)}}
  // Central lookout can be reached by both teams through shallow ramps.
  deck(0,0,8,10,2.2,0x8a9eaa);ramp(0,-9,5,8,2.2,0x9cb0ba);ramp(0,9,5,8,2.2,0x9cb0ba,true);
  for(const x of [-4,4]){box(x,2.8,0,.6,1.2,10,0x6f8794,true,'concrete');box(x,3.46,0,.8,.12,10.2,0xf0f7f9)}
  for(const side of [-1,1]){for(const z of [-8,8]){box(side*12,1.15,z,4,2.3,4,0x7994a3,true,'concrete');box(side*12,2.4,z,4.25,.2,4.25,0xeff9fc);for(let y=.6;y<2;y+=.65)box(side*12,y,z-2.015,4,.035,.025,0x536e7d)}crate(side*6,side*15,0,1.6);box(side*17,.65,0,3,1.3,5,0x9bb6c4,true,'concrete');box(side*17,1.4,0,3.2,.2,5.2,0xe9f6fc)}
  for(const x of [-28,28])for(const z of [-28,28]){box(x,5,z,6,10,6,0x6c8594,false,'concrete');box(x,10.15,z,6.4,.3,6.4,0xf2f8fa);for(const dx of [-2,2])for(const dz of [-2,2])box(x+dx,10.8,z+dz,1.3,1.3,1.3,0xa4bdc8);label('FROST',x,7,z-3.03,4,'#d7f6ff','#435d72',Math.PI)}
  for(let n=0;n<18;n++){const a=n*Math.PI/9,r=65+rand()*22,h=20+rand()*30;const m=add(new THREE.ConeGeometry(12+rand()*7,h,5),0xd4e4eb,Math.cos(a)*r,h/2-8,Math.sin(a)*r,'concrete');m.rotation.y=rand()*Math.PI}
  const snow=[];for(let n=0;n<350;n++)snow.push((rand()-.5)*65,3+rand()*28,(rand()-.5)*65);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(snow,3));root.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xffffff,size:.08,transparent:true,opacity:.7})));
  for(const z of [-16,16])pad(0,z);
 }else if(index===6){
  deck(0,0,48,48,0,0x909997,'concrete');box(0,9,0,48,.4,48,0x35444b,true,'concrete');
  for(const [x,z,w,d]of[[0,-24,48,.7],[0,24,48,.7],[-24,0,.7,48],[24,0,.7,48]]){box(x,4.4,z,w,8.8,d,0xaebbb7,true,'concrete');box(x,1.05,z,w+.035,.25,d+.035,0x237e83);box(x,4.6,z,w+.04,.22,d+.04,0x237e83)}
  for(let x=-22;x<=22;x+=2)for(let z=-22;z<=22;z+=2){box(x,.008,z,1.95,.016,1.95,(x+z)%4?0x86938f:0xa8b3ad);}
  for(const side of [-1,1]){const x=side*10;
   // Parked cars form solid cover; rails and sleepers sit flush with the station floor.
   for(const dx of [-1.2,1.2])box(x+dx,.055,0,.12,.1,32,0x54666d,false,'metal');for(let z=-15;z<=15;z+=1.5)box(x,.026,z,3.2,.04,.2,0x555d58);
   box(x,1.5,0,4.2,3,14,0x919f9e,true,'metal');box(x,3.07,0,4.4,.14,14.2,0xc4ceca,false,'metal');
   for(const edge of [-1,1]){box(x+edge*2.12,.8,0,.05,.4,14,0x227e83);for(const z of [-5,-2.5,2.5,5]){box(x+edge*2.135,2.1,z,.035,1.1,1.65,0x233c47);box(x+edge*2.16,2.1,z,.025,1.14,.06,0x9ebbbf)}box(x+edge*2.16,1.7,0,.025,2.45,1.55,0x657b7c);for(const dz of [-.37,.37])box(x+edge*2.18,2.05,dz,.02,.9,.6,0x213944);box(x+edge*2.2,1.7,0,.02,2.45,.035,0xb8c5c0)}
   for(const z of [-7.04,7.04]){box(x,2.1,z,3.6,1.1,.025,0x263c46);box(x,1.05,z,3.6,.15,.05,0x1e7a80);for(const dx of [-1.5,1.5])box(x+dx,1.3,z,.22,.2,.05,0xffebac,false,'glow')}
   crate(side*6,side*4,0,1.5);for(const z of [-10,10]){box(side*17,4.3,z,1.1,8.6,1.1,0x677f80,true,'concrete');box(side*17,1.8,z,1.14,.4,1.14,0xe2b851);label(side<0?'BLUE LINE':'GOLD LINE',side*17,3.8,z-.575,2,'#e7f1eb','#246e74',Math.PI)}
   box(side*16,.65,-side*14,4,1.3,1.5,0x657d7c,true,'metal');box(side*16,1.36,-side*14,4.2,.12,1.65,0xa8b8b1);
  }
  box(0,1.1,0,4.5,2.2,4.5,0x557577,true,'metal');box(0,2.26,0,4.7,.12,4.7,0xa9bab4);label('TICKETS',0,1.5,-2.28,3,'#ffe5a0','#25474e',Math.PI);
  for(const x of [-16,0,16])for(const z of [-16,0,16]){box(x,8.75,z,.7,.08,5,0xd3f2eb,false,'glow');const light=new THREE.PointLight(0xe5fff1,28,22,2);light.position.set(x,7,z);root.add(light)}
  for(const z of [-23.55,23.55]){label('NEON CENTRAL',0,5.8,z,9,'#f6e5a4','#245860',z<0?0:Math.PI);label('PLATFORM 06',0,3.8,z,5,'#eff4f0','#37494d',z<0?0:Math.PI)}
  const fill=new THREE.DirectionalLight(0xd4e5df,2);fill.position.set(0,7,-5);root.add(fill);
 }
 // Two mirrored routes give both teams the same six additional jump platforms.
 const themes=[{body:0x687d98,top:0xdce6ed,trim:0xceff59,kind:'concrete'},{body:0x65747c,top:0x9ca7ac,trim:0xd6b182,kind:'metal'},{body:0x405764,top:0x84959e,trim:0x79dff2,kind:'metal'},{body:0x888b82,top:0x9f865e,trim:0xe3bd58,kind:'concrete'},{body:0xb59b73,top:0xdfc397,trim:0x6c7458,kind:'concrete'},{body:0x7796a7,top:0xedfaff,trim:0x4f829c,kind:'concrete'},{body:0x557577,top:0xa9bab4,trim:0xf0ca60,kind:'metal'}],theme=themes[index];
 for(const side of [-1,1]){const route=[];for(let step=0;step<3;step++){
  const x=side*(16-step*4),z=side*19,y=[1.1,2.2,3.3][step],w=2.8,d=2.8;
  box(x,(y-.12)/2,z,w,y-.12,d,theme.body,true,theme.kind);box(x,y-.06,z,w+.12,.12,d+.12,theme.top,false,index===3?'wood':'metal');
  for(const edge of [-1,1])box(x+edge*(w/2-.12),y+.012,z,.075,.02,d-.15,theme.trim,false,index===2?'glow':'plain');
  if(index===1){for(let n=0;n<4;n++)box(x,y*.3+n*.13,z-d/2-.012,w-.4,.035,.025,0x303e44)}
  if(index===2){for(const dx of [-.9,.9])box(x+dx,y/2,z-d/2-.025,.065,y-.25,.03,0x8eafb9)}
  if(index===3){for(const dx of [-1.2,1.2])box(x+dx,y/2,z-d/2-.03,.08,y,.04,0x5a6260);for(let n=1;n<step+2;n++)box(x,n*.75,z,w,.05,d,0x636963)}
  label('JUMP '+(step+1),x,y-.35,z-d/2-.035,1.7,index===2?'#9bedff':'#eef0da');route.push({x,z,y,w:w+.12,d:d+.12});
 }jumpRoutes.push(route)}
 const spawnZ=[-10,-5,5,10];
 const spawn=(team,i=0)=>new THREE.Vector3(team===0?-20:20,0,spawnZ[i%4]);
 const floor=(x,z,maxHeight=Infinity)=>{let best=null;for(const s of surfaces){if(Math.abs(x-s.x)>s.w/2+.001||Math.abs(z-s.z)>s.d/2+.001)continue;const y=s.ramp?s.y*(s.reverse?1-(z-s.z+s.d/2)/s.d:(z-s.z+s.d/2)/s.d):s.y;if(y<=maxHeight+.001&&(best===null||y>best))best=y}return best};
 const support=(x,z,maxHeight=Infinity)=>{let best=floor(x,z,maxHeight);for(const p of platforms)if(Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2&&p.y<=maxHeight+.001&&(best===null||p.y>best))best=p.y;return best};
 const ceiling=(x,z,from,to)=>{let best=null;for(const p of ceilings)if(Math.abs(x-p.x)<p.w/2+.35&&Math.abs(z-p.z)<p.d/2+.35&&p.y>=from-.001&&p.y<=to+.001&&(best===null||p.y<best))best=p.y;return best};
 root.updateMatrixWorld(true);
 // Batch repeated scenery pieces while leaving collision and terrain geometry independent.
 const protectedMeshes=new Set([...solids.map(s=>s.mesh),...groundMeshes]);const batches=new Map();for(const m of root.children){if(!m.isMesh||m.geometry.type!=='BoxGeometry'||protectedMeshes.has(m)||!m.visible)continue;const key=m.material.uuid+':'+m.castShadow;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m)}for(const pieces of batches.values()){if(pieces.length<5)continue;const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),pieces[0].material,pieces.length);batch.castShadow=pieces[0].castShadow;batch.receiveShadow=true;pieces.forEach((m,i)=>{const p=m.geometry.parameters,matrix=m.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(p.width,p.height,p.depth));batch.setMatrixAt(i,matrix);root.remove(m);m.geometry.dispose()});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();root.add(batch)}root.updateMatrixWorld(true);
 return {root,solids,surfaces,platforms,ceilings,jumpRoutes,groundMeshes,pads,spawn,floor,support,ceiling,preview:index===2||index===6?{position:[-19,5,19],target:[0,3,0]}:null,dispose(){root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()}});textures.forEach(t=>t.dispose())}};
}
