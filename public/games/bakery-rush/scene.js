import * as THREE from '../../vendor/three.module.js';
import {CUSTOMERS,RECIPES,order} from './rules.js?v=quantities1';
import {roundedBox} from '../../avatar/surfaces.js';
const mat=(color,roughness=.78,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
function mesh(parent,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const box=(p,w,h,d,m,x=0,y=0,z=0)=>mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const ball=(p,r,m,x=0,y=0,z=0)=>mesh(p,new THREE.SphereGeometry(r,16,12),m,x,y,z);
const cylinder=(p,a,b,h,m,x=0,y=0,z=0)=>mesh(p,new THREE.CylinderGeometry(a,b,h,32),m,x,y,z);
function sign(p,words,w,h,x,y,z,fg='#f6dfb5',bg='#315c59'){
 const c=document.createElement('canvas');c.width=768;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,768,256);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 64px Georgia';ctx.fillText(words,384,132,710);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return mesh(p,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}),x,y,z);
}
function spiral(p,r,h,y,m,turns=3){const points=[];for(let i=0;i<=90;i++){const t=i/90,a=t*Math.PI*2*turns;points.push(new THREE.Vector3(Math.cos(a)*r*(1-t*.88),y+t*h,Math.sin(a)*r*(1-t*.88)));}return mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),90,.055,7,false),m);}
export function pastry(id='cupcakes',topping=null,burnt=false){
 const recipe=RECIPES.find(r=>r.id===id),root=new THREE.Group(),bread=mat(burnt?0x493326:recipe?.color||0xd6a05c),dark=mat(0x52352b),white=mat(topping==='strawberry'?0xe99baa:0xffeed3),berry=mat(0xd85f68),blue=mat(0x676b9b),green=mat(0x607c4b),cream=mat(0xffe4a9);
 const positions=recipe?.quantity===1?[[0,0]]:recipe?.quantity===4?[[-.48,-.4],[.48,-.4],[-.48,.4],[.48,.4]]:[[-.54,-.35],[.54,-.35],[0,.55]];
 const ring=(p,r,tube,m,y)=>{const geo=new THREE.TorusGeometry(r,tube,12,40);geo.rotateX(Math.PI/2);return mesh(p,geo,m,0,y,0)};
 for(const [x,z] of positions){const item=new THREE.Group();item.position.set(x,0,z);root.add(item);let top=.22,pretzelCurve=null;
  if(id==='cookies'){const b=ball(item,.47,bread,0,.12,0);b.scale.y=.28;for(let i=0;i<11;i++){const a=i*2.4,r=.12+(i%3)*.105;const chip=box(item,.075,.045,.08,dark,Math.cos(a)*r,.235,Math.sin(a)*r);chip.rotation.y=a;}top=.25;}
  else if(id==='brownies'){box(item,.83,.35,.68,bread,0,.18,0);for(let i=0;i<5;i++)box(item,.09,.06,.09,dark,Math.sin(i*7)*.28,.39,Math.cos(i*5)*.21);top=.4;}
  else if(id==='cake'){cylinder(item,.9,.9,.30,bread,0,.17,0);cylinder(item,.91,.91,.13,white,0,.38,0);cylinder(item,.9,.9,.3,bread,0,.60,0);cylinder(item,.91,.91,.09,white,0,.80,0);top=.85;for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const b=ball(item,.11,berry,Math.cos(a)*.65,.95,Math.sin(a)*.65);b.scale.y=1.3;ball(item,.05,green,Math.cos(a)*.65,1.09,Math.sin(a)*.65);} }
  else if(id==='rolls'){cylinder(item,.42,.45,.35,bread,0,.2,0);spiral(item,.35,.02,.4,dark,3.2);top=.44;}
  else if(id==='doughnuts'){ring(item,.30,.135,bread,.16);top=.28;}
  else if(id==='apple-pie'){
   cylinder(item,.85,.78,.28,bread,0,.15,0);cylinder(item,.76,.76,.10,mat(burnt?0x503628:0xbd8b4d),0,.31,0);ring(item,.80,.065,bread,.34);
   for(let i=-2;i<=2;i++){const offset=i*.25,length=Math.sqrt(.75*.75-offset*offset)*2;box(item,.105,.05,length,bread,offset,.38,0);box(item,length,.05,.105,bread,0,.405,offset)}
   for(let i=0;i<24;i++){const angle=i/24*Math.PI*2;ball(item,.045,bread,Math.cos(angle)*.82,.36,Math.sin(angle)*.82)}top=.44;
  }
  else if(id==='lemon-bars'){box(item,.79,.13,.65,bread,0,.07,0);box(item,.79,.18,.65,mat(burnt?0x674331:0xf1ce57),0,.225,0);top=.32;}
  else if(id==='banana-bread'){
   mesh(item,roundedBox(1.55,.52,.85,.12),bread,0,.28,0);const dome=ball(item,1,bread,0,.53,0);dome.scale.set(.76,.23,.42);
   for(let i=-1;i<=1;i++){const slit=box(item,.075,.02,.54,dark,i*.38,.746,0);slit.rotation.y=-.35}top=.76;
  }
  else if(id==='pretzels'){
   const points=[[-.36,-.27],[-.49,-.1],[-.43,.27],[-.16,.40],[0,.27],[.23,-.15],[.40,-.30],[.50,-.10],[.42,.27],[.16,.40],[0,.27],[-.22,-.15],[-.36,-.27]].map(([px,pz],i)=>new THREE.Vector3(px,.13+Math.sin(i*.5)*.025,pz));
   pretzelCurve=new THREE.CatmullRomCurve3(points);mesh(item,new THREE.TubeGeometry(pretzelCurve,96,.085,10,false),bread);for(let i=0;i<18;i++){const point=pretzelCurve.getPoint(i/18);box(item,.025,.022,.027,white,point.x,point.y+.08,point.z)}top=.25;
  }
  else if(id==='eclairs'){
   const geo=new THREE.CapsuleGeometry(.16,.62,6,18);geo.rotateZ(Math.PI/2);const base=mesh(item,geo,bread,0,.12,0);base.scale.y=.65;
   const fill=mesh(item,geo.clone(),cream,0,.23,0);fill.scale.set(.98,.28,.9);const lid=mesh(item,geo.clone(),bread,0,.32,0);lid.scale.y=.65;top=.43;
  }
  else {const liner=mat(id==='muffins'?0xc79768:0xb9d0cb);cylinder(item,.38,.27,.4,liner,0,.2,0);for(let i=0;i<14;i++){const a=i/14*Math.PI*2;box(item,.018,.32,.04,bread,Math.cos(a)*.315,.2,Math.sin(a)*.315).rotation.y=-a;}const dome=ball(item,.39,bread,0,.42,0);dome.scale.y=.68;top=.68;if(id==='muffins')for(let i=0;i<7;i++)ball(item,.053,blue,Math.sin(i*8)*.27,.62+(i%2)*.04,Math.cos(i*5)*.25);}
  if(id==='doughnuts'&&topping&&topping!=='sugar'){
   const glaze=ring(item,.30,.115,topping==='chocolate'?dark:white,top);glaze.scale.y=.28;
   for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=.30;const sprinkle=box(item,.055,.022,.02,i%2?cream:berry,Math.cos(a)*r,top+.035,Math.sin(a)*r);sprinkle.rotation.y=a*2}
  }
  else if(id==='eclairs'&&topping&&topping!=='sugar'){
   const geo=new THREE.CapsuleGeometry(.13,.60,6,18);geo.rotateZ(Math.PI/2);const glaze=mesh(item,geo,topping==='chocolate'?dark:white,0,top,0);glaze.scale.y=.20;
  }
  else {
   if(topping==='vanilla'||topping==='strawberry'){if(id!=='cake'){cylinder(item,.32,.35,.07,white,0,top,0);spiral(item,.29,id==='cupcakes'?.43:.12,top+.04,white,3.1);}}
   if(topping==='chocolate'){const pts=[];for(let i=0;i<36;i++){const t=i/35;pts.push(new THREE.Vector3(Math.sin(t*Math.PI*6)*.3,top+.035,(t-.5)*.64));}mesh(item,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.027,6,false),dark);}
  }
  if(topping==='sugar')for(let i=0;i<28;i++){if(pretzelCurve){const point=pretzelCurve.getPoint(i/28);ball(item,.018,white,point.x,point.y+.09,point.z)}else{const a=i*2.4,r=id==='doughnuts'?.30:Math.sqrt((i+.5)/28)*.31;ball(item,.018,white,Math.cos(a)*r,top+.015,Math.sin(a)*r)}}
 }
 return root;
}
function customer(config){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);const skin=mat(config.skin),shirt=mat(config.shirt),hair=mat(config.hair),pants=mat(0x3d4d56),shoe=mat(0x343c3a),eyes=mat(0x303a34);
 const torso=ball(body,.34,shirt,0,1.25,0);torso.scale.set(1.1,1.35,.75);cylinder(body,.105,.12,.14,skin,0,1.7,0);const head=ball(body,.245,skin,0,1.94,0);head.scale.y=1.14;
 mesh(body,new THREE.SphereGeometry(.252,20,12,0,Math.PI*2,0,Math.PI*.55),hair,0,2.04,-.015);
 if(config.style===0){const pony=ball(body,.16,hair,0,1.95,-.24);pony.scale.y=1.9;}if(config.style===2){for(let i=0;i<8;i++)ball(body,.105,hair,Math.cos(i)*.17,2.19,Math.sin(i)*.13);}
 for(const side of [-1,1]){ball(body,.022,eyes,side*.085,1.97,.226);ball(body,.045,skin,side*.24,1.93,0);cylinder(body,.12,.10,.65,pants,side*.16,.63,0);box(body,.23,.17,.36,shoe,side*.16,.23,.06);}
 const smile=new THREE.Mesh(new THREE.TorusGeometry(.065,.012,4,16,Math.PI),eyes);smile.position.set(0,1.88,.23);smile.rotation.z=Math.PI;body.add(smile);
 const arms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.35,1.52,0);body.add(arm);arms.push(arm);cylinder(arm,.095,.08,.38,shirt,0,-.18,0);cylinder(arm,.073,.06,.28,skin,0,-.5,0);ball(arm,.08,skin,0,-.66,0);}
 root.userData.animate=(t,happy)=>{body.position.y=Math.sin(t*2)*.016;arms.forEach((a,i)=>a.rotation.z=happy?(i?-1:1)*(1.9+Math.sin(t*7)*.2):Math.sin(t*2+i)*.04);};return root;
}
function dispose(root){const geos=new Set(),mats=new Set(),maps=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){mats.add(m);if(m.map)maps.add(m.map);}});geos.forEach(x=>x.dispose());mats.forEach(x=>x.dispose());maps.forEach(x=>x.dispose());}
export function makeBakery(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe7c9a0);scene.fog=new THREE.Fog(0xe7c9a0,27,65);const camera=new THREE.PerspectiveCamera(43,1,.1,100),cream=mat(0xf4e5c8),teal=mat(0x547c72),wood=mat(0xa97b53),brass=mat(0xc69b58,.35,.5),dark=mat(0x344e48),white=mat(0xfff3d9),pink=mat(0xd38b88);
 scene.add(new THREE.HemisphereLight(0xffefd1,0x6d7565,2.8));const sun=new THREE.DirectionalLight(0xffe0ad,3.0);sun.position.set(-5,9,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:10,bottom:-10});sun.shadow.normalBias=.04;scene.add(sun);
 const room=new THREE.Group();scene.add(room);box(room,22,.25,20,cream,0,-.2,-1);
 for(let x=-10;x<11;x++)for(let z=-9;z<8;z++)if((x+z)%2===0)box(room,.99,.012,.99,mat(0xb0b9a1),x,.001,z);
 box(room,22,7,.25,cream,0,3.3,-7);box(room,.25,7,18,cream,-10.5,3.3,0);box(room,22,1.1,.2,teal,0,.5,-6.8);
 // Tall storefront windows and a striped awning give the bakery a street view.
 const sky=mat(0xb8d4cb);for(let x=-7.3;x<8;x+=3.6){box(room,3.2,3.7,.08,sky,x,3.0,-6.7);for(const side of [-1,1])box(room,.11,3.9,.14,white,x+side*1.63,3,-6.58);box(room,3.4,.1,.14,white,x,2.5,-6.55);box(room,.1,3.8,.14,white,x,3,-6.55);}
 for(let i=0;i<18;i++)box(room,1.16,.25,1.5,i%2?pink:cream,-9.9+i*1.16,5.25,-6.3).rotation.x=-.10;
 sign(room,'SUGAR & SUNSHINE',8.5,.95,0,5.85,-6.35);sign(room,'BAKED WITH A LITTLE JOY',5,.45,0,4.7,-6.4,'#5e7867','#f3e2ba');
 for(let x=-8;x<=8;x+=8){box(room,2.7,1.3,1.1,teal,x,.7,-3.6);box(room,3,.16,1.3,wood,x,1.45,-3.6);for(let j=0;j<3;j++){box(room,2.5,.1,.7,wood,x,2.0+j*.65,-5.8);const tray=pastry(j===0?'rolls':j===1?'cookies':'muffins',j===1?'chocolate':null);tray.scale.setScalar(.55);tray.position.set(x,2.07+j*.65,-5.65);room.add(tray);}}
 // Customer counter, pastry display, and the player's marble preparation island.
 box(room,9,1.35,1.2,teal,0,.65,-1.5);box(room,9.3,.16,1.5,cream,0,1.4,-1.5);for(let x=-3.8;x<4;x+=1.9){box(room,1.7,.85,.035,wood,x,.75,-.88);box(room,1.55,.7,.035,teal,x,.76,-.85);}
 const glass=new THREE.MeshStandardMaterial({color:0xc4e3da,transparent:true,opacity:.16,roughness:.12,depthWrite:false});box(room,2.1,1.05,.9,glass,-3.1,2.0,-1.55);for(const side of [-1,1])box(room,.045,1.12,.95,brass,-3.1+side*1.07,2,-1.55);const display=pastry('cupcakes','strawberry');display.scale.setScalar(.47);display.position.set(-3.1,1.53,-1.55);room.add(display);
 box(room,7.4,1.05,2.3,teal,0,.5,2.0);box(room,7.7,.16,2.5,cream,0,1.1,2.0);for(let x=-2.8;x<3;x+=1.4){box(room,1.18,.7,.06,wood,x,.56,3.18);box(room,1.05,.57,.07,teal,x,.57,3.22);box(room,.29,.035,.08,brass,x,.8,3.28);}
 const board=box(room,2.25,.07,1.65,wood,1.15,1.23,2.0);box(room,2.05,.02,1.46,mat(0xe8c99a),1.15,1.28,2);
 const bowl=new THREE.Group();bowl.position.set(-1.6,1.3,2);room.add(bowl);mesh(bowl,new THREE.SphereGeometry(.65,32,18,0,Math.PI*2,Math.PI/2,Math.PI/2),mat(0xd8aa73,.42,.15),0,.35,0);const rim=mesh(bowl,new THREE.TorusGeometry(.65,.035,8,48),brass,0,.35,0);rim.rotation.x=Math.PI/2;const batter=cylinder(bowl,.56,.5,.07,mat(0xe8d2a2),0,.22,0);const whisk=new THREE.Group();whisk.position.set(0,.48,0);bowl.add(whisk);whisk.rotation.z=-.3;cylinder(whisk,.045,.045,.75,wood,0,.54,0);for(let i=0;i<5;i++){const ring=mesh(whisk,new THREE.TorusGeometry(.17,.012,6,24),brass,0,.03,0);ring.scale.y=1.7;ring.rotation.y=i*Math.PI/5;}
 const oven=new THREE.Group();oven.position.set(5.2,0,1.1);room.add(oven);box(oven,2.3,2.1,2.0,teal,0,1.0,0);box(oven,2.4,.15,2.1,cream,0,2.1,0);box(oven,1.95,1.25,.1,dark,0,1.0,1.04);const glow=mat(0x694732);glow.emissive=new THREE.Color(0xf08d34);const pane=box(oven,1.6,.85,.05,glow,0,.98,1.12);box(oven,1.7,.06,.09,brass,0,1.59,1.2);for(const x of [-.7,.7])cylinder(oven,.11,.11,.07,brass,x,1.88,1.1).rotation.x=Math.PI/2;sign(oven,'THE GOLDEN OVEN',1.7,.25,0,.25,1.14,'#f9ddb1','#344e48');
 const jars=new THREE.Group();jars.position.set(-5,0,2);room.add(jars);box(jars,2.0,1.1,2,teal,0,.5,0);box(jars,2.2,.1,2.2,wood,0,1.15,0);for(let i=0;i<3;i++){cylinder(jars,.26,.26,.65,mat(i===0?0xe9d5af:i===1?0xffedd0:0x8d6651),-.6+i*.6,1.52,0);cylinder(jars,.28,.28,.08,brass,-.6+i*.6,1.87,0);}sign(jars,'PANTRY',1.5,.35,0,.8,1.02,'#f4e0b9','#547c72');
 for(const x of [-4,4]){box(room,.06,1.0,.06,dark,x,5.8,-.2);const shade=mesh(room,new THREE.ConeGeometry(.65,.38,32,1,true),brass,x,5.15,-.2);ball(room,.17,white,x,5.04,-.2);}
 // A little potted herb, plates, rolling pin, and flour dust on the worktop.
 cylinder(room,.2,.15,.35,wood,-3.05,1.42,1.45);for(let i=0;i<6;i++){const leaf=ball(room,.13,mat(0x769169),-3.05+Math.sin(i)*.12,1.7+i*.04,1.45+Math.cos(i)*.11);leaf.scale.y=1.8;}
 const pin=cylinder(room,.09,.09,1.0,wood,-.3,1.31,2.8);pin.rotation.z=Math.PI/2;for(let i=0;i<18;i++)ball(room,.02,white,-.6+Math.sin(i*4)*.5,1.20,1.6+Math.cos(i*7)*.45);
 let people=[],food=null,lastKey='',personKey='';const foodRoot=new THREE.Group();room.add(foodRoot);
 function update(g,t,menu=false,cover=false){
  const o=order(g),key=[o.recipe.id,g.phase,g.topping,menu].join('/');if(key!==lastKey){if(food){foodRoot.remove(food);dispose(food);}food=pastry(menu?'cupcakes':o.recipe.id,menu?'strawberry':g.topping,g.phase==='burnt');foodRoot.add(food);lastKey=key;}
  const pk=g.day+'/'+g.orderIndex;if(personKey!==pk){people.forEach(p=>{room.remove(p);dispose(p);});people=[0,1,2].map((v)=>{const p=customer(CUSTOMERS[(g.orderIndex+g.day*2+v)%CUSTOMERS.length]);p.position.set(v===0?0:v===1?2.4:3.8,0,-3.0-v*.8);room.add(p);return p;});personKey=pk;}
  people.forEach((p,i)=>p.userData.animate(t+i,g.phase==='served'&&i===0));people[0].position.x=0;
  const baked=['decorate','served','complete'].includes(g.phase);foodRoot.visible=menu||baked||g.phase==='burnt'||g.phase==='baking'||g.phase==='undercooked';
  foodRoot.position.set(1.15,1.3,2);foodRoot.scale.setScalar(.83);if(g.phase==='baking'||g.phase==='undercooked'){foodRoot.position.set(5.2,.72,2.15);foodRoot.scale.setScalar(.50);}
  batter.visible=g.selected.length>0||g.phase==='mixing'||g.phase==='ready';batter.scale.y=.3+g.selected.length*.14;batter.material.color.setHex(o.recipe.id==='brownies'?0x80533c:o.recipe.id==='cake'?0xe7b6a2:0xe5c98d);
  whisk.rotation.y=g.phase==='mixing'?t*9:0;whisk.position.x=g.phase==='mixing'?Math.sin(t*9)*.13:0;whisk.rotation.z=g.phase==='mixing'?Math.sin(t*9)*.15:-.3;
  pane.material.emissiveIntensity=g.phase==='baking'?.7+Math.sin(t*5)*.1:.08;
  const portrait=innerWidth<760,wide=innerWidth/innerHeight>1.9;
  const desired=cover?new THREE.Vector3(8,5.8,10):portrait?new THREE.Vector3(7,5.8,12):new THREE.Vector3(8,5.7,10);
  const ovenView=!menu&&['baking','undercooked','burnt'].includes(g.phase);if(ovenView&&!portrait)desired.set(10.6,5.5,10.5);camera.position.lerp(desired,.10);camera.lookAt(cover?new THREE.Vector3(0,1.6,-1):portrait?new THREE.Vector3(0,1.4,-.4):ovenView?new THREE.Vector3(3.2,1.5,.4):new THREE.Vector3(.2,1.8,-1));camera.fov=portrait?48:wide?41:43;camera.updateProjectionMatrix();renderer.render(scene,camera);
 }
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}resize();
 return {update,resize};
}
