import * as THREE from '../../vendor/three.module.js';
import {addHelmet} from './helmets.js?v=creators1';
import {teamLogoImage,drawTeamLogo} from './team-branding.js?v=creators1';
import {playerAppearance} from './appearance.js?v=appearance1';
import {athleteProfile,addPortraitFace} from './athlete-detail.js?v=realism2026';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lines=new Set(['LT','LG','C','RG','RT','DT','DE']);
const pantsColors={DAL:0xb3bdc2,SF:0xc6ad77,LV:0xb2b9be,TB:0x777065,PIT:0xe8b82c,NO:0xc6ae79,GB:0xeec12b,SEA:0x1d3042,NE:0x1b3044,JAX:0x192329};
const rgb=c=>'#'+new THREE.Color(c).getHexString();

function canvasTexture(width,height,draw){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 draw(canvas.getContext('2d'),width,height);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function fabric(color,number,options){
 const texture=canvasTexture(512,512,(c,w,h)=>{
  c.fillStyle=rgb(color);c.fillRect(0,0,w,h);
  // Woven mesh and sewn panels stay attached to the curved jersey surface.
  for(let y=0;y<h;y+=4){c.fillStyle=y%8?'#ffffff0b':'#00000016';c.fillRect(0,y,w,1);}
  for(let y=1;y<h;y+=7)for(let x=(y%2)*3;x<w;x+=6){c.fillStyle='#00000019';c.fillRect(x,y,1,2);}
  // Directional fabric creases follow the waist and the shoulder pad seams.
  for(let i=0;i<13;i++){const y=365+i*10;c.strokeStyle=i%2?'#00000012':'#ffffff0e';c.lineWidth=2;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(100,y-13,175,y+12,256,y-3);c.bezierCurveTo(350,y-14,430,y+10,512,y);c.stroke();}
  c.strokeStyle='#00000030';c.lineWidth=2;
  for(const x of [0,256]){c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+28,100,x+25,210,x,512);c.stroke();}
  c.fillStyle=options.away?rgb(options.teamColor):options.numberColor||'#ffffff';
  c.strokeStyle=options.away?'#ffffff':rgb(options.accent??0x101820);c.lineWidth=5;c.lineJoin='round';
  c.font='900 116px Arial';c.textAlign='center';c.textBaseline='middle';
  for(const x of [128,384]){c.strokeText(String(number),x,286,142);c.fillText(String(number),x,286,142);}
  const words=(options.playerName||options.mark||'ARCHERBOX').toUpperCase().split(' ').filter(p=>!['JR.','JR','II','III','IV'].includes(p));
  c.font='700 21px Arial';c.fillText(words.at(-1)||'ARCHERBOX',384,108,148);
  c.font='700 14px Arial';c.fillText(options.mark||'ARCHERBOX',128,96,108);
  c.fillStyle=rgb(options.accent??0xffffff);for(const y of [25,34])c.fillRect(0,y,w,3);
  c.fillStyle='#00000022';c.fillRect(0,h-18,w,18);
 });
 if(texture&&options.custom)teamLogoImage(options).then(image=>{if(image&&!texture.userData.disposed){const c=texture.image.getContext('2d');drawTeamLogo(c,image,101,130,54,54);texture.needsUpdate=true;}});
 return texture;
}
function knit(){return canvasTexture(64,64,(c,w,h)=>{c.fillStyle='#9d9d9d';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){c.fillStyle=(x+y)%8?'#bebebe':'#777777';c.fillRect(x,y,2,3);}});}
function pores(){return canvasTexture(64,64,(c,w,h)=>{c.fillStyle='#888888';c.fillRect(0,0,w,h);let seed=37;for(let i=0;i<2000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%w;seed=(Math.imul(seed,1664525)+1013904223)>>>0;c.fillStyle=i%2?'#a0a0a0':'#707070';c.fillRect(x,seed%h,1,1);}});}

// Continuous tapered cross-sections replace the stacked ball-shaped limbs.
function shapedLimb(rings,segments=20){
 const p=[],uv=[],index=[],ascending=rings.at(-1)[0]>rings[0][0];
 for(const [y,rx,rz,cx=0,cz=0] of rings)for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;p.push(cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz);uv.push(j/segments,y);}
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;if(ascending)index.push(a,b,a+1,b,b+1,a+1);else index.push(a,a+1,b,b,a+1,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
}

// Viewed from outside, U must increase toward the viewer's right on both sides.
// The seam stays at the right shoulder; chest/back text must never be mirrored.
function torsoGeometry(bulk){
 const rings=[[.025,.275,.175],[.10,.285,.182],[.24,.30,.195],[.36,.325,.21],[.52,.37,.225],[.64,.385,.224],[.70,.38,.21],[.80,.345,.18],[.86,.205,.135]],n=32,positions=[],uv=[],indices=[];
 for(const [y,rx,rz] of rings)for(let j=0;j<=n;j++){const a=j/n*Math.PI*2,wrinkle=y<.36?Math.sin(a*7+y*48)*.004:Math.sin(a*5)*.0015;positions.push(Math.cos(a)*(rx+wrinkle)*bulk,y,Math.sin(a)*(rz+wrinkle));uv.push(1-j/n,(y-.025)/.835);}
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
// Merge only siblings on the same bone. Joints remain independently animated.
function batchParts(group){
 for(const child of [...group.children])if(child.isGroup)batchParts(child);
 const batches=new Map();for(const m of group.children)if(m.isMesh&&!Array.isArray(m.material)){if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(m);}
 for(const [material,parts] of batches){
  if(parts.length<2)continue;const position=[],normal=[],uv=[];
  for(const part of parts){part.updateMatrix();const g=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();g.applyMatrix4(part.matrix);const a=g.getAttribute('position'),n=g.getAttribute('normal'),t=g.getAttribute('uv');for(let i=0;i<a.count;i++){position.push(a.getX(i),a.getY(i),a.getZ(i));normal.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(t?.getX(i)||0,t?.getY(i)||0);}g.dispose();group.remove(part);part.geometry.dispose();}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
}

export function makePlayer(teamColor,number,options={}){
 const appearance=options.customProfile?{playerId:options.playerId,skinTone:options.customProfile.skinTone,matched:true,custom:true}:playerAppearance(options.playerId),role=options.role||'WR',profile=options.customProfile||athleteProfile(options.playerId,role),bulk=(lines.has(role)?1.15:role==='LB'?1.07:role==='QB'?.97:.94)*profile.mass;
 const jerseyColor=options.away?0xf0f1eb:teamColor,root=new THREE.Group(),upperBody=new THREE.Group();upperBody.position.y=1.04;root.scale.x=.94;root.add(upperBody);
 const weave=knit();if(weave)weave.colorSpace=THREE.NoColorSpace;const jerseyMap=fabric(jerseyColor,number,{...options,teamColor});
 const uniform=new THREE.MeshStandardMaterial({color:jerseyMap?0xffffff:jerseyColor,map:jerseyMap,roughness:.91,bumpMap:weave,bumpScale:.018});
 const sleeve=new THREE.MeshStandardMaterial({color:jerseyColor,roughness:.9,bumpMap:weave,bumpScale:.015});
 const helmet=new THREE.MeshPhysicalMaterial({color:options.helmetColor??teamColor,roughness:.25,metalness:.10,clearcoat:1,clearcoatRoughness:.12});
 const shellTone=new THREE.Color(options.helmetColor??teamColor).getHSL({});if(shellTone.s<.18&&shellTone.l>.25&&shellTone.l<.72){helmet.metalness=.48;helmet.roughness=.32;}
 const pants=new THREE.MeshStandardMaterial({color:pantsColors[options.mark]??0xe7e9e2,roughness:.93,bumpMap:weave,bumpScale:.012});
 const micro=pores();if(micro){micro.colorSpace=THREE.NoColorSpace;micro.wrapS=micro.wrapT=THREE.RepeatWrapping;micro.repeat.set(3,3);}
 const skin=new THREE.MeshPhysicalMaterial({color:appearance.skinTone,roughness:.74,bumpMap:micro,bumpScale:.0025,clearcoat:.04,clearcoatRoughness:.72,specularIntensity:.3});skin.name='Player skin';
 const trim=new THREE.MeshStandardMaterial({color:options.accent??0xffffff,roughness:.68});
 const rubber=new THREE.MeshStandardMaterial({color:0x11181d,roughness:.78});
 const leather=new THREE.MeshPhysicalMaterial({color:0x1a2229,roughness:.44,clearcoat:.25});
 const white=new THREE.MeshStandardMaterial({color:0xe9eae4,roughness:.75});
 const cage=new THREE.MeshStandardMaterial({color:0x747c80,metalness:.75,roughness:.32});
 const eye=new THREE.MeshStandardMaterial({color:0x16130e,roughness:.35});
 const add=(geo,mat,x=0,y=0,z=0,parent=root)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const oval=(mat,x,y,z,sx,sy,sz,parent=root)=>{const m=add(new THREE.SphereGeometry(1,16,12),mat,x,y,z,parent);m.scale.set(sx,sy,sz);return m;};
 const tube=(points,radius,mat,parent=root)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(4,points.length*3),radius,6,false),mat,0,0,0,parent);
 const band=(mat,x,y,z,w,h,d,parent=root)=>{const m=add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);return m;};
 add(torsoGeometry(bulk),uniform,0,0,0,upperBody);
 oval(pants,0,.045,0,.31*bulk,.13,.20,upperBody);
 band(rubber,0,.12,.005,.62*bulk,.055,.40,upperBody);band(cage,0,.12,-.205,.075,.035,.014,upperBody);
 // Separate sleeve caps over shaped shoulder pads, with stitched sleeve stripes.
 for(const side of [-1,1]){
  oval(sleeve,side*.375*bulk,.71,0,.176,.14,.21,upperBody);
  oval(trim,side*.397*bulk,.70,-.003,.166,.019,.214,upperBody);
  oval(sleeve,side*.39*bulk,.76,0,.166,.063,.20,upperBody);
 }
 oval(skin,0,.90,0,.115,.15,.115,upperBody);
 const collar=tube([[-.18,.855,-.13],[-.13,.82,-.18],[0,.775,-.19],[.13,.82,-.18],[.18,.855,-.13]],.026,rubber,upperBody);
 collar.name='Sewn V collar';

 const head=new THREE.Group();head.position.set(0,1.065,0);head.scale.setScalar(.80);upperBody.add(head);
 add(shapedLimb([[-.19,.075,.090,0,-.025],[-.16,.122,.12,0,-.025],[-.11,.151,.15,0,-.025],[-.02,.176,.184,0,-.025],[.08,.171,.177,0,-.018],[.17,.145,.145],[.215,.055,.055]],28),skin,0,0,0,head);
 const facialFallback=new THREE.Group();head.add(facialFallback);
 oval(skin,0,-.036,-.212,.028,.046,.036,facialFallback);
 for(const side of [-1,1]){oval(white,side*.067,.034,-.19,.027,.010,.010,facialFallback);oval(eye,side*.067,.034,-.200,.009,.009,.005,facialFallback);oval(skin,side*.083,-.047,-.175,.062,.055,.035,facialFallback);tube([[side*.042,.06,-.195],[side*.067,.069,-.194],[side*.092,.059,-.181]],.005,rubber,facialFallback);}
 tube([[-.047,-.116,-.184],[0,-.119,-.201],[.047,-.116,-.184]],.0035,rubber,facialFallback);
 const portrait=addPortraitFace(head,profile,root,facialFallback);
 addHelmet(head,{...options,role,teamColor},{helmet,rubber,white,skin,cage},canvasTexture);

 const arms=[],elbows=[],hands=[],legs=[],knees=[],ankles=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.418*bulk,.735,0);upperBody.add(arm);arms.push(arm);
  const shoulder=add(new THREE.CylinderGeometry(.137,.115,.225,20),sleeve,0,-.10,0,arm);shoulder.rotation.z=side*.10;
  add(shapedLimb([[-.12,.100,.102],[-.18,.113*profile.mass,.12],[-.26,.103*profile.mass,.111,side*.01,-.012],[-.35,.078,.081,side*.019]],20),skin,0,0,0,arm);
  const elbow=new THREE.Group();elbow.position.set(side*.025,-.38,0);arm.add(elbow);elbow.rotation.order='YXZ';elbows.push(elbow);
  oval(skin,0,.005,0,.081,.087,.086,elbow);
  add(shapedLimb([[0,.082,.085],[-.055,.095,.097],[-.14,.086,.079],[-.23,.063,.057],[-.285,.058,.052]],20),skin,0,0,0,elbow);
  add(new THREE.CylinderGeometry(.064,.063,.045,18),white,0,-.282,0,elbow);
  const hand=new THREE.Group();hand.position.set(0,-.338,-.01);elbow.add(hand);hands.push(hand);
  oval(leather,0,0,-.008,.066,.076,.034,hand);oval(white,0,.012,.021,.052,.055,.012,hand);
  for(let f=0;f<4;f++){const x=(f-1.5)*.029,len=f===3?.055:f===0?.068:.076;tube([[x,-.045,-.007],[x,-.077,-.014],[x,-.045-len,-.039],[x,-.04-len,-.061]],.013,leather,hand);band(white,x,-.056,.011,.015,.027,.005,hand);}
  const thumb=oval(leather,side*.066,-.012,-.029,.022,.044,.023,hand);thumb.rotation.z=-side*.60;
  band(rubber,0,.068,0,.105,.026,.065,hand);

  const leg=new THREE.Group();leg.position.set(side*.19*bulk,1.025,0);root.add(leg);legs.push(leg);
  add(shapedLimb([[.06,.135*bulk,.157],[-.04,.155*bulk,.165],[-.18,.15*bulk,.16,0,.008],[-.31,.123*bulk,.13,0,-.015],[-.43,.10,.11,0,-.02]],24),pants,0,0,0,leg);
  const knee=new THREE.Group();knee.position.y=-.43;leg.add(knee);knees.push(knee);
  oval(pants,0,.018,-.035,.105,.095,.116,knee);
  add(shapedLimb([[0,.091,.093],[-.10,.094,.104,0,.018],[-.19,.083,.093,0,.025],[-.29,.060,.067,0,.012],[-.38,.054,.055]],20),skin,0,0,0,knee);
  add(new THREE.CylinderGeometry(.066,.055,.21,18),rubber,0,-.273,.01,knee);
  const ankle=new THREE.Group();ankle.position.set(0,-.40,0);knee.add(ankle);ankles.push(ankle);
  oval(leather,0,-.055,-.095,.094,.082,.188,ankle);
  oval(rubber,0,-.120,-.085,.099,.023,.204,ankle);
  oval(leather,0,.007,.025,.074,.091,.088,ankle);
  for(const x of [-.060,.060])for(const z of [-.21,-.10,.03])add(new THREE.ConeGeometry(.017,.030,6),rubber,x,-.145,z,ankle).rotation.x=Math.PI;
  for(let lace=0;lace<5;lace++)tube([[-.049,-.006,-.025-lace*.030],[0,.012,-.03-lace*.030],[.049,-.006,-.025-lace*.030]],.0045,white,ankle);
  tube([[-.072,-.056,.065],[-.082,-.06,-.14],[0,-.085,-.267],[.082,-.06,-.14],[.072,-.056,.065]],.006,white,ankle);
  tube([[side*.15*bulk,-.04,0],[side*.172*bulk,-.17,0],[side*.15*bulk,-.30,0],[side*.10*bulk,-.40,0]],.014,trim,leg);
 }
 const ballGrip=new THREE.Object3D();ballGrip.position.set(-.015,-.015,-.095);hands[1].add(ballGrip);
 root.userData={arms,legs,elbows,knees,ankles,hands,head,upperBody,ballGrip,uniform,helmet,skin,appearance,profile,portrait,jerseyNumber:number,role,bulk,modelVersion:'athlete-2026'};
 batchParts(root);root.updateMatrixWorld(true);const height=new THREE.Box3().setFromObject(root).max.y,scale=profile.heightYards/height;root.scale.set(scale*.90,scale,scale*.96);
 animatePlayer(root,{moving:0,role},0,{ready:true});return root;
}

export function animatePlayer(root,actor,time,context={}){
 const r=root.userData;if(!r.elbows)return;
 const speed=clamp(actor.moving||0,0,11),run=clamp(speed/7,0,1),cycle=time*(6+Math.min(9,speed)*1.35)+(actor.id||0)*.71,stance=context.ready&&(lines.has(actor.role)||['LB','CB','S'].includes(actor.role));
 r.upperBody.position.y=1.04+(Math.abs(Math.sin(cycle))*.022*run)-(stance?.07:0)+Math.sin(time*2.1+(actor.id||0))*.0025*(1-run);
 r.upperBody.rotation.set(-run*.16-(stance?.22:0),Math.sin(cycle)*.065*run,actor.juke>0?Math.sin(time*10)*.14:-Math.sin(cycle)*.025*run);
 r.head.rotation.set(run*.09,Math.sin(time*.65+(actor.id||0))*.025,0);
 for(let i=0;i<2;i++){
  const stride=Math.sin(cycle+i*Math.PI),arm=r.arms[i],leg=r.legs[i];
  arm.rotation.set(-stride*.65*run+(stance?.48:.08),-stride*.07*run,(i===0?-.045:.045));
  r.elbows[i].rotation.set(.32+run*(.75+.13*Math.max(0,stride))+(stance?.30:0),0,0);
  leg.rotation.set(stride*.71*run+(stance?.18:0),stride*.025*run,0);
  r.knees[i].rotation.set(-Math.max(0,-stride)*1.24*run-(stance?.35:0),0,0);
  r.ankles[i].rotation.set((-stride*.20+Math.max(0,-stride)*.26)*run,0,0);
 }
 if(context.blocking){r.upperBody.rotation.x=-.18;for(let i=0;i<2;i++){r.arms[i].rotation.set(1.1,0,i===0?-.12:.12);r.elbows[i].rotation.x=.45;r.legs[i].rotation.x=i===0?.18:-.18;r.knees[i].rotation.x=-.22;}}
 if(context.holdingKick){r.upperBody.position.y=.78;r.upperBody.rotation.x=-.15;for(let i=0;i<2;i++){r.arms[i].rotation.set(.1,0,i===0?-.12:.12);r.elbows[i].rotation.x=.2;r.legs[i].rotation.x=.9;r.knees[i].rotation.x=-1.8;r.ankles[i].rotation.x=.7;}}
 if(context.carrier){r.arms[1].rotation.set(.20,0,.08);r.elbows[1].rotation.x=1.62;r.upperBody.rotation.y-=.08;}
 if(context.quarterback){r.arms[0].rotation.set(.25,0,.65);r.arms[1].rotation.set(.28,0,-.35);r.elbows[0].rotation.set(1.5,-.55,0);r.elbows[1].rotation.set(1.5,.45,0);}
 if(context.catching){for(let i=0;i<2;i++){r.arms[i].rotation.set(1.65,0,i===0?-.13:.13);r.elbows[i].rotation.x=.25;}}
 if(context.throwTime!==undefined){const u=clamp(context.throwTime/.32,0,1);r.arms[1].rotation.x=-2.25+u*3.65;r.elbows[1].rotation.x=1.05*(1-u);r.upperBody.rotation.y=.28*(1-u);}
 if(context.kickTime!==undefined&&context.kickTime<.65){const kick=Math.sin(context.kickTime/.65*Math.PI);r.legs[1].rotation.x=kick*1.45;r.knees[1].rotation.x=-.15;r.upperBody.rotation.x=kick*.10;}
}

export function celebrationJoints(root,id,time){
 const r=root.userData;r.upperBody.position.y=1.04;r.upperBody.rotation.set(0,0,0);r.head.rotation.set(0,0,0);
 for(let i=0;i<2;i++){r.elbows[i].rotation.set(id==='griddy'?.95:.25,0,0);r.knees[i].rotation.set(id==='backflip'&&time<.7?-.7:id==='griddy'?-Math.max(0,Math.sin(time*9+i*Math.PI))*.45:0,0,0);r.ankles[i].rotation.set(0,0,0);}
}

export function playerEnvironment(sky){
 const texture=canvasTexture(256,128,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#f7f8f3');g.addColorStop(.47,rgb(sky));g.addColorStop(.51,'#b0b6a6');g.addColorStop(.66,'#64825a');g.addColorStop(1,'#243b27');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#ffffed';c.fillRect(33,27,32,11);c.fillStyle='#ffffff66';c.fillRect(165,31,37,13);});
 if(texture)texture.mapping=THREE.EquirectangularReflectionMapping;return texture;
}
