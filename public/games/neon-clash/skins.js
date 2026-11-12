import * as THREE from '../../vendor/three.module.js';

// Finishes affect rendering only. Combat stats stay in game.js.
export const skins=[
 {id:'original',name:'Original',color:'#abb5bd',detail:'Normal weapon finish'},
 {id:'lava',name:'Lava',color:'#ff731c',detail:'Glowing molten cracks'},
 {id:'ice',name:'Ice',color:'#9beeff',detail:'Frosted blue crystal'},
 {id:'galaxy',name:'Galaxy',color:'#c482ff',detail:'Nebulas and tiny stars'},
 {id:'gold',name:'Gold',color:'#ffd367',detail:'Polished golden metal'},
 {id:'neon',name:'Neon',color:'#50ffd8',detail:'Bright colorful stripes'},
 {id:'lightning',name:'Lightning',color:'#68baff',detail:'Yellow electric bolts'},
 {id:'emerald',name:'Emerald',color:'#52e795',detail:'Faceted green crystal'},
 {id:'chrome',name:'Chrome',color:'#e5efff',detail:'Brushed silver metal'},
 {id:'flame',name:'Flame',color:'#ff4e35',detail:'Red and orange flames'},
 {id:'shadow',name:'Shadow',color:'#ab6bff',detail:'Black with purple accents'}
];
const cache=new Map();
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*Math.max(0,Math.min(1,t))));
export function skinTextures(id){
 if(cache.has(id))return cache.get(id);
 const n=256,data=new Uint8Array(n*n*4),glow=new Uint8Array(n*n*4);
 let seed=3181;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const cells=Array.from({length:25},()=>[random(),random(),random()]);
 const stars=Array.from({length:55},()=>[random(),random(),.0015+random()*.003]);
 // Jagged bolt paths are repeated with the finish, rather than painted on the arena.
 const bolts=Array.from({length:2},(_,b)=>Array.from({length:12},(_,i)=>[(b+.35)/2+(random()-.5)*.18,i/11]));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x/n,v=y/n,noise=random(),wave=Math.sin(u*31+Math.sin(v*19)*2);let c=[40,44,49],e=[0,0,0];
  if(id==='lava'||id==='emerald'){
   let first=10,second=10,cell=0;
   for(const [a,b,k]of cells){const dx=Math.min(Math.abs(u-a),1-Math.abs(u-a)),dy=Math.min(Math.abs(v-b),1-Math.abs(v-b)),d=dx*dx+dy*dy;if(d<first){second=first;first=d;cell=k}else if(d<second)second=d}
   const edge=second-first;
   if(id==='lava'){c=mix([18,20,24],[54,44,39],noise*.6);if(edge<.0022){const hot=1-edge/.0022;c=mix([208,44,8],[255,214,71],hot);e=c}}
   else{c=mix([5,62,45],[55,218,123],cell*.8+noise*.13);if(edge<.0015){c=[102,246,171];e=[17,67,40]}}
  }else if(id==='ice'){const frost=Math.max(0,Math.sin(u*39+v*23)**20)+Math.max(0,Math.sin(u*17-v*41)**26);c=mix([55,140,186],[215,251,255],Math.min(1,frost+noise*.3));e=frost>.7?[30,68,75]:[0,0,0]}
  else if(id==='galaxy'){const nebula=(Math.sin(u*14+v*7)+Math.sin(v*18-u*8)+2)/4;c=mix([10,19,53],[140,52,188],nebula*.85);c=mix(c,[42,119,216],Math.max(0,wave)*.3);for(const [a,b,r]of stars)if(Math.hypot(u-a,v-b)<r){c=[231,238,255];e=[170,186,220];break}if(e[0]===0)e=c.map(k=>k*.25)}
  else if(id==='gold'){c=mix([166,101,24],[255,217,111],.6+Math.sin(v*35)*.14+noise*.09)}
  else if(id==='chrome'){c=mix([112,140,170],[238,245,255],.6+Math.sin(v*70)*.09+noise*.13)}
  else if(id==='neon'){const stripe=(u*3+v*2)%1;c=[15,23,34];if(stripe<.11){c=v<.33?[66,255,206]:v<.66?[242,77,255]:[78,159,255];e=c}}
  else if(id==='lightning'){c=mix([8,29,71],[22,93,176],v+noise*.15);let distance=1;for(const path of bolts)for(let j=1;j<path.length;j++){const [a,b]=path[j-1],[d,f]=path[j],t=Math.max(0,Math.min(1,((u-a)*(d-a)+(v-b)*(f-b))/((d-a)**2+(f-b)**2)));distance=Math.min(distance,Math.hypot(u-a-t*(d-a),v-b-t*(f-b)))}if(distance<.012){c=distance<.004?[255,248,180]:[255,200,44];e=c}}
  else if(id==='flame'){const heat=(v+.12*Math.sin(u*37)+.08*Math.sin(u*63))%1;c=mix([99,9,16],[231,38,12],noise*.35);if(heat>.3){c=mix([244,40,8],[255,216,58],(heat-.3)/.7);e=c.map(k=>k*.45)}}
  else if(id==='shadow'){c=mix([9,10,18],[29,24,40],noise*.5);if((u*2-v*3+10)%1<.065){c=[112,44,178];e=[90,25,150]}}
  const p=(y*n+x)*4;for(let k=0;k<3;k++){data[p+k]=c[k];glow[p+k]=e[k]}data[p+3]=glow[p+3]=255;
 }
 function texture(bytes){const t=new THREE.DataTexture(bytes,n,n);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t}
 const result={map:texture(data),emissiveMap:texture(glow)};cache.set(id,result);return result;
}
export function applySkin(model,id,{fists=false}={}){
 const skin=skins.find(s=>s.id===id);if(!skin||id==='original')return model;
 const textures=skinTextures(id);
 model.traverse(o=>{if(!o.isMesh||!o.material?.isMeshStandardMaterial)return;const old=o.material,role=old.name;
  if(role==='sleeve'||role==='glass'||(!fists&&role==='glove'))return;
  const m=old.clone();m.color.setHex(0xffffff);m.map=textures.map;m.emissiveMap=textures.emissiveMap;m.emissive.setHex(0xffffff);m.emissiveIntensity=id==='lava'?1.6:id==='neon'||id==='lightning'?1.2:.65;
  const grip=['rubber','wrap','leather','glove','black'].includes(role);
  m.metalness=id==='gold'?(grip?.25:.7):id==='chrome'?(grip?.35:.85):id==='ice'||id==='emerald'?.35:grip?.12:.5;
  m.roughness=id==='gold'||id==='chrome'?.22:id==='ice'||id==='emerald'?.26:grip?.68:.4;
  if(id==='gold'&&grip&&!fists){m.map=null;m.color.setHex(0x171b20);m.emissiveMap=null;m.emissive.setHex(0);m.metalness=.15;m.roughness=.7}
  if(role==='light'||role==='blue'){m.emissiveMap=null;m.emissive.set(skin.color);m.emissiveIntensity=1.5}
  m.needsUpdate=true;o.material=m;old.dispose();
 });model.userData.skin=id;return model;
}
export function createSkinPreview(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.01,20),turntable=new THREE.Group();scene.add(turntable);
 scene.add(new THREE.HemisphereLight(0xe7f2ff,0x63738b,3));
 for(const [x,y,z,color,intensity]of[[2,3,3,0xffffff,4],[-3,1,-2,0x86baff,3],[0,-2,2,0xffd1a1,2]]){const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light)}
 return {show(model){while(turntable.children.length){const old=turntable.children[0];turntable.remove(old);old.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}turntable.rotation.set(0,0,0);turntable.add(model);turntable.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());model.position.sub(center);const distance=Math.max(size.x,size.y,size.z)*1.8;camera.position.set(.9,.45,1.2).normalize().multiplyScalar(distance);camera.lookAt(0,0,0)},render(now){const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}turntable.rotation.y=Math.sin(now*.00035)*.7;renderer.render(scene,camera)}};
}
