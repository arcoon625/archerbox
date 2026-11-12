import * as THREE from '../../vendor/three.module.js';
import {weaponOf} from './rules.js?v=battle2';
import {surface,roundedBox} from '../../avatar/surfaces.js';
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t;
const LOOKS=[{skin:0xc18b67,hair:0x3b2924,bulk:1,beard:1},{skin:0x704834,hair:0x211e1d,bulk:1.035,beard:0},{skin:0xe0b18b,hair:0x664735,bulk:.96,beard:0},{skin:0x9b674a,hair:0x242020,bulk:1.02,beard:2},{skin:0xd4a079,hair:0x47342c,bulk:.98,beard:1},{skin:0x553b30,hair:0x1d1b1a,bulk:1.04,beard:2}];
function add(p,g,m,x=0,y=0,z=0,name=''){const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;mesh.name=name;p.add(mesh);return mesh}
function oval(p,m,x,y,z,sx,sy,sz,name=''){const mesh=add(p,new THREE.SphereGeometry(1,20,14),m,x,y,z,name);mesh.scale.set(sx,sy,sz);return mesh}
const box=(p,m,w,h,d,x=0,y=0,z=0,r)=>add(p,roundedBox(w,h,d,r),m,x,y,z);
const tube=(p,m,points,r=.006,segments=6)=>add(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),Math.max(5,points.length*3),r,segments,false),m);
function joint(p,name,x,y,z){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);p.add(g);return g}
// Ring sections form continuous anatomy and fitted armor instead of stacked balls.
function loft(rings,n=24,arc=TAU,start=0){const positions=[],uv=[],indices=[],up=rings.at(-1)[0]>rings[0][0];for(const [y,rx,rz,cx=0,cz=0] of rings)for(let j=0;j<=n;j++){const a=start+j/n*arc;positions.push(cx+Math.cos(a)*rx,y,cz+Math.sin(a)*rz);uv.push(j/n,y*2)}for(let i=0;i<rings.length-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;if(up)indices.push(a,b,a+1,b,b+1,a+1);else indices.push(a,a+1,b,b,a+1,b+1)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g}
function chainMaterial(){const size=96,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const ox=(Math.floor(y/12)%2)*6,dx=((x+ox)%12-6)/4.6,dy=(y%12-6)/4,r=Math.hypot(dx,dy),value=r>.68&&r<1?190:r<.55?65:112,i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255}const bump=new THREE.DataTexture(data,size,size);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(3,3);bump.needsUpdate=true;return new THREE.MeshStandardMaterial({color:0x666b68,roughness:.62,metalness:.62,bumpMap:bump,bumpScale:.0023})}
function palette(team,look){const plate=surface(0x9ba5a7,'metal',{roughness:.33,metalness:.9}),edge=surface(0xc3c8c4,'metal',{roughness:.26,metalness:.88}),dark=surface(0x343c3d,'metal',{roughness:.53,metalness:.75}),gold=surface(0xa58b57,'metal',{roughness:.44,metalness:.78}),cloth=surface(team===0?0x315c71:0x914f3b,'cotton',{roughness:.96}),leather=surface(0x3c302a,'leather',{roughness:.72}),skin=surface(look.skin,'skin',{roughness:.71,clearcoat:.02,specularIntensity:.35}),hair=surface(look.hair,'fur',{bumpScale:.0017}),chain=chainMaterial(),eye=new THREE.MeshStandardMaterial({color:0x252a26,roughness:.42}),white=new THREE.MeshStandardMaterial({color:0xbdb8a5,roughness:.66}),lips=new THREE.MeshStandardMaterial({color:new THREE.Color(look.skin).multiply(new THREE.Color(.79,.61,.57)),roughness:.8});return {plate,edge,dark,gold,cloth,leather,skin,hair,chain,eye,white,lips}}
function rivets(p,m,points,r=.009){for(const [x,y,z] of points)oval(p,m,x,y,z,r,r,r*.55)}
function face(head,m,look){
 const skin=add(head,loft([[-.125,.035,.046,0,-.005],[-.108,.064,.066,0,-.012],[-.071,.083,.078,0,-.005],[-.020,.092,.087],[.025,.096,.09],[.075,.09,.086],[.118,.065,.065],[.138,.019,.025]],32),m.skin,0,0,0,'Sculpted human face');
 oval(head,m.skin,0,-.064,-.079,.054,.033,.017);oval(head,m.skin,0,-.105,-.058,.039,.022,.025);
 for(const side of [-1,1]){
  oval(head,m.skin,side*.092,-.005,.002,.019,.038,.023);oval(head,m.lips,side*.105,-.006,-.007,.006,.021,.010);
  oval(head,m.skin,side*.052,-.019,-.074,.030,.021,.018);oval(head,m.skin,side*.038,.030,-.075,.030,.015,.018);
  oval(head,m.white,side*.037,.020,-.089,.020,.007,.007);oval(head,m.eye,side*.036,.020,-.095,.0062,.0062,.003);oval(head,m.white,side*.033,.023,-.099,.0018,.0018,.001);
  tube(head,m.skin,[[side*.016,.023,-.091],[side*.034,.029,-.098],[side*.055,.023,-.088]],.0027);
  tube(head,m.hair,[[side*.014,.044,-.086],[side*.036,.049,-.088],[side*.060,.043,-.073]],.0032);
  oval(head,m.skin,side*.016,-.027,-.096,.014,.010,.011);oval(head,m.lips,side*.013,-.031,-.104,.006,.0025,.002);
 }
 // A modeled nose has a bridge, tip, alar wings and shaded nostrils.
 add(head,loft([[-.030,.014,.011,0,-.099],[-.016,.019,.018,0,-.100],[.007,.012,.015,0,-.087],[.044,.009,.008,0,-.079]],16),m.skin);oval(head,m.skin,0,-.021,-.113,.016,.012,.014);
 tube(head,m.lips,[[-.032,-.065,-.095],[-.014,-.063,-.105],[0,-.066,-.107],[.014,-.063,-.105],[.032,-.065,-.095]],.0022);
 tube(head,m.skin,[[-.027,-.071,-.095],[0,-.075,-.105],[.027,-.071,-.095]],.0030);
 if(look.beard){const beard=add(head,loft([[-.111,.04,.053,0,-.021],[-.095,.063,.073,0,-.015],[-.079,.074,.081,0,-.007]],24,Math.PI*1.05,Math.PI*.97),m.hair);beard.name='Short facial hair';for(const side of [-1,1])tube(head,m.hair,[[side*.073,-.018,-.055],[side*.069,-.056,-.073],[side*.05,-.090,-.076]],look.beard===2?.010:.006);tube(head,m.hair,[[-.029,-.052,-.095],[0,-.050,-.110],[.029,-.052,-.095]],.0032)}
 return skin;
}
function helmet(head,m,variant){
 const dome=add(head,new THREE.SphereGeometry(1,32,18,0,TAU,0,Math.PI*.51),m.plate,0,.032,.009,'Forged helmet dome');dome.scale.set(.123,.154,.128);
 add(head,loft([[-.090,.117,.121,0,.014],[-.04,.125,.129,0,.011],[.035,.122,.128,0,.009]],32,Math.PI*1.24,-Math.PI*.12),m.plate,0,0,0,'Open helmet sides and neck protection');
 tube(head,m.edge,[[-.119,.027,-.029],[-.099,.042,-.088],[-.055,.052,-.120],[0,.056,-.125],[.055,.052,-.120],[.099,.042,-.088],[.119,.027,-.029]],.0085);
 tube(head,m.dark,[[-.111,-.09,-.016],[-.09,-.103,.086],[0,-.107,.134],[.09,-.103,.086],[.111,-.09,-.016]],.0075);
 tube(head,m.edge,[[0,.057,-.126],[0,.153,-.078],[0,.187,.009],[0,.145,.09],[0,.043,.136]],.005);
 for(const side of [-1,1]){const cheek=oval(head,m.plate,side*.108,-.055,-.040,.022,.058,.045);cheek.rotation.z=-side*.19;box(head,m.leather,.011,.10,.014,side*.079,-.087,-.024,.004);oval(head,m.gold,side*.11,-.026,-.079,.012,.012,.008);for(let y=-.08;y<-.02;y+=.018)box(head,m.dark,.017,.003,.004,side*.111,y,-.079,.001)}
 rivets(head,m.gold,[[-.083,.05,-.098],[-.043,.062,-.118],[.043,.062,-.118],[.083,.05,-.098]],.006);
 const plume=add(head,new THREE.CapsuleGeometry(.012,.115,3,9),m.cloth,0,.195,.03);plume.rotation.x=Math.PI/2;plume.scale.y=.8;
}
function hand(p,m,side){
 const h=joint(p,side<0?'Left gauntlet':'Right gauntlet',0,0,0);oval(h,m.leather,0,0,0,.046,.058,.026);oval(h,m.plate,0,.005,.022,.043,.047,.012);
 for(let f=0;f<4;f++){const x=(f-1.5)*.021,len=f===3?.050:f===0?.059:.067;const points=[[x,-.028,-.007],[x,-.057,-.016],[x,-.033-len,-.041],[x,-.024-len,-.064]];tube(h,m.leather,points,.010,7);oval(h,m.edge,x,-.035,.005,.009,.014,.009);oval(h,m.plate,x,-.061,-.018,.009,.012,.010)}
 const thumb=tube(h,m.leather,[[side*.044,.008,-.006],[side*.058,-.016,-.024],[side*.036,-.038,-.054]],.013,8);oval(h,m.plate,side*.044,-.005,.004,.016,.025,.009);
 box(h,m.dark,.085,.026,.060,0,.056,0,.008);for(let i=0;i<3;i++)box(h,m.edge,.080,.015,.010,0,.031+i*.010,.026,.003);return h;
}
function shield(p,m){
 const root=joint(p,'Curved kite shield',-.025,-.06,-.12),s=new THREE.Shape();s.moveTo(-.255,.27);s.quadraticCurveTo(0,.34,.255,.27);s.lineTo(.235,-.07);s.quadraticCurveTo(.20,-.29,0,-.48);s.quadraticCurveTo(-.20,-.29,-.235,-.07);s.closePath();
 const geo=new THREE.ExtrudeGeometry(s,{depth:.042,bevelEnabled:true,bevelSize:.014,bevelThickness:.012,bevelSegments:2,steps:1});const a=geo.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i);a.setZ(i,a.getZ(i)-.060*(1-x*x/.070))}geo.computeVertexNormals();add(root,geo,m.leather,0,0,.018);
 const painted=geo.clone();painted.scale(.95,.955,.45);add(root,painted,m.cloth,0,0,-.026);tube(root,m.edge,[[-.257,.27,-.025],[0,.325,-.08],[.257,.27,-.025],[.23,-.09,-.04],[.14,-.31,-.058],[0,-.48,-.07],[-.14,-.31,-.058],[-.23,-.09,-.04],[-.257,.27,-.025]],.012);
 tube(root,m.gold,[[-.12,.06,-.10],[0,.17,-.12],[.12,.06,-.10]],.015);tube(root,m.gold,[[-.11,-.04,-.11],[0,.07,-.12],[.11,-.04,-.11]],.010);
 rivets(root,m.gold,[[-.20,.23,-.050],[.20,.23,-.050],[-.19,-.08,-.066],[.19,-.08,-.066],[0,-.40,-.078]],.008);return root;
}
// Merge static parts on each bone, keeping the skeleton free to bend.
function releaseUnusedPalette(root,palette){const used=new Set();root.traverse(o=>{if(o.material)used.add(o.material)});for(const material of Object.values(palette))if(!used.has(material)){material.bumpMap?.dispose();material.dispose()}}
function batchParts(group){for(const child of [...group.children])if(child.isGroup)batchParts(child);const batches=new Map();for(const mesh of group.children)if(mesh.isMesh&&!Array.isArray(mesh.material)){if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(mesh)}for(const [material,parts] of batches){if(parts.length<2)continue;const position=[],normal=[],uv=[];for(const part of parts){part.updateMatrix();const g=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();g.applyMatrix4(part.matrix);const a=g.attributes.position,n=g.attributes.normal,t=g.attributes.uv;for(let i=0;i<a.count;i++){position.push(a.getX(i),a.getY(i),a.getZ(i));normal.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(t?.getX(i)||0,t?.getY(i)||0)}g.dispose();group.remove(part);part.geometry.dispose()}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeBoundingSphere();add(group,geometry,material)}}
export function createFighter(team,weapon='sword',variant=0,makeWeapon){
 const look=LOOKS[Math.abs(variant|0)%LOOKS.length],m=palette(team,look),root=new THREE.Group(),body=joint(root,'Torso and shoulders',0,1.025,0),arms=[],elbows=[],hands=[],legs=[],knees=[],ankles=[],bulk=look.bulk;
 root.name='Human armored fighter';
 add(body,loft([[.01,.195,.135],[.08,.205,.14],[.22,.235,.155],[.36,.272,.166],[.44,.277,.150],[.49,.233,.125],[.53,.12,.10]],32),m.plate,0,0,0,'Anatomical breastplate');
 add(body,loft([[-.12,.22,.14],[-.05,.22,.144],[.035,.202,.139]],28),m.chain);
 for(let i=0;i<3;i++){const y=.005-i*.047;add(body,loft([[y,.206+i*.012,.145+i*.008],[y-.055,.216+i*.012,.155+i*.008]],28),m.plate);tube(body,m.edge,[[ -.19-i*.01,y-.043,-.06],[0,y-.05,-.158-i*.008],[.19+i*.01,y-.043,-.06]],.005)}
 const panel=new THREE.PlaneGeometry(.19,.50,8,14),pos=panel.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,-.015-Math.cos(x*27)*.007+Math.sin(y*22+x*13)*.003)}panel.computeVertexNormals();panel.rotateY(Math.PI);add(body,panel,m.cloth,0,.20,-.197);tube(body,m.gold,[[-.056,.30,-.198],[0,.36,-.199],[.056,.30,-.198]],.008);
 // Leather belt, fitted shoulder straps, buckles and a stitched cloth skirt.
 add(body,loft([[.008,.216,.155],[.050,.212,.152]],28),m.leather);box(body,m.gold,.060,.045,.014,0,.030,-.166,.005);box(body,m.dark,.036,.023,.016,0,.03,-.175,.003);
 for(const side of [-1,1]){tube(body,m.leather,[[side*.16,.07,.137],[side*.205,.28,.15],[side*.19,.48,.08],[side*.16,.51,-.07],[side*.13,.39,-.15]],.016);box(body,m.gold,.039,.051,.010,side*.142,.415,-.16,.004);rivets(body,m.gold,[[side*.213,.31,-.110],[side*.219,.23,-.118],[side*.20,.12,-.127]],.006)}
 const skirt=add(body,loft([[-.06,.206,.142],[-.19,.226,.16],[-.28,.240,.168]],28),m.cloth);tube(body,m.gold,[[-.18,-.27,-.10],[0,-.28,-.172],[.18,-.27,-.10]],.004);for(const side of [-1,1]){const tasset=add(body,loft([[-.05,.084,.050],[-.18,.078,.049],[-.25,.06,.038]],14,Math.PI,Math.PI),m.plate,side*.145,0,-.124);tasset.rotation.z=side*.09}
 add(body,loft([[.53,.068,.065],[.62,.065,.064],[.66,.060,.060]],24),m.skin);
 add(body,loft([[.50,.105,.085],[.57,.099,.081]],24),m.chain);add(body,loft([[.50,.135,.112],[.55,.115,.094]],26),m.plate);
 const head=joint(body,'Head and helmet',0,.72,0);face(head,m,look);helmet(head,m,variant);
 for(const side of [-1,1]){
  const arm=joint(body,side<0?'Left shoulder':'Right shoulder',side*.286,.449,0);arms.push(arm);
  const shoulder=add(arm,new THREE.SphereGeometry(1,24,12,0,TAU,0,Math.PI*.65),m.plate,side*.008,-.015,0);shoulder.scale.set(.132,.117,.142);for(let i=0;i<2;i++)add(arm,loft([[-.07-i*.045,.110,.117],[-.11-i*.045,.10,.108]],20),m.plate,side*.016,0,0);
  add(arm,loft([[0,.080,.089],[-.14,.090,.092],[-.26,.067,.071],[-.31,.060,.063]],24),m.chain);tube(arm,m.edge,[[-.105,-.072,-.05],[0,-.10,-.12],[.105,-.072,-.05]],.005);
  const elbow=joint(arm,side<0?'Left elbow':'Right elbow',0,-.313,0);elbows.push(elbow);oval(elbow,m.chain,0,0,0,.062,.065,.066);oval(elbow,m.plate,0,.012,.044,.077,.068,.04);
  add(elbow,loft([[-.016,.066,.069],[-.08,.074,.077],[-.18,.061,.060],[-.265,.043,.045]],24),m.plate);add(elbow,loft([[-.23,.046,.049],[-.27,.048,.05]],20),m.edge);box(elbow,m.leather,.018,.035,.155,0,-.104,0,.005);rivets(elbow,m.gold,[[-.025,-.08,-.073],[.025,-.08,-.073]],.005);
  const h=hand(elbow,m,side);h.position.set(0,-.292,-.005);hands.push(h);
  const leg=joint(root,side<0?'Left hip':'Right hip',side*.142,.997,0);legs.push(leg);add(leg,loft([[0,.116,.131],[-.09,.121,.135],[-.24,.106,.116],[-.38,.079,.086],[-.43,.071,.074]],26),m.chain);add(leg,loft([[-.07,.122,.132],[-.21,.111,.120],[-.36,.086,.094]],26,Math.PI*1.45,Math.PI*.78),m.plate);tube(leg,m.edge,[[-.079,-.35,-.027],[0,-.365,-.099],[.079,-.35,-.027]],.005);
  const knee=joint(leg,side<0?'Left knee':'Right knee',0,-.437,-.003);knees.push(knee);oval(knee,m.chain,0,0,0,.071,.075,.079);oval(knee,m.plate,0,-.002,-.059,.084,.078,.043);const wing=oval(knee,m.plate,side*.071,.005,.008,.048,.073,.025);wing.rotation.z=-side*.28;
  add(knee,loft([[-.028,.071,.077],[-.12,.079,.091,0,.01],[-.22,.065,.078,0,.013],[-.34,.046,.053],[-.40,.043,.047]],26),m.plate);add(knee,loft([[-.35,.050,.056],[-.39,.048,.054]],22),m.edge);tube(knee,m.edge,[[0,-.06,-.08],[0,-.17,-.087],[0,-.34,-.051]],.0045);
  const ankle=joint(knee,side<0?'Left ankle':'Right ankle',0,-.411,0);ankles.push(ankle);oval(ankle,m.leather,0,-.026,-.065,.075,.091,.145);oval(ankle,m.dark,0,-.114,-.057,.079,.019,.158);oval(ankle,m.plate,0,-.05,-.143,.080,.046,.098);for(let i=0;i<3;i++)tube(ankle,m.edge,[[-.067,-.015-i*.007,-.08-i*.032],[0,-.010-i*.007,-.1-i*.032],[.067,-.015-i*.007,-.08-i*.032]],.0048);
 }
 const weaponRoot=makeWeapon(weapon);weaponRoot.name='Equipped '+weapon;weaponRoot.position.set(0,-.046,-.056);weaponRoot.scale.setScalar(weapon==='spear'?.92:.84);weaponRoot.rotation.z=-.06;hands[1].add(weaponRoot);if(weapon==='dual'){const left=makeWeapon('dual');left.position.set(0,-.046,-.056);left.scale.setScalar(.84);hands[0].add(left)}else shield(elbows[0],m);
 root.scale.set(bulk,1+(variant%3-1)*.014,1);
 batchParts(root);
 const shadow=add(root,new THREE.CircleGeometry(.51,28),new THREE.MeshBasicMaterial({color:team===0?0x68d7dd:0xf8ac75,transparent:true,opacity:.16,depthWrite:false}),0,.025,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
 const warning=add(root,new THREE.RingGeometry(.96,1,40,1,0,Math.PI*.82),new THREE.MeshBasicMaterial({color:0xffb05d,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}),0,.05,0);warning.rotation.x=-Math.PI/2;warning.rotation.z=Math.PI*.09;warning.castShadow=false;warning.visible=false;
 const trail=add(root,new THREE.TorusGeometry(1.35,.022,5,28,Math.PI*.8),new THREE.MeshBasicMaterial({color:team===0?0xaef8ff:0xffc289,transparent:true,opacity:.50,depthWrite:false}),0,1.25,-.4);trail.rotation.set(.35,0,.3);trail.castShadow=false;trail.visible=false;
 const materials=Object.values(m),rig={body,head,arms,elbows,hands,legs,knees,ankles,weaponRoot};root.userData.rig=rig;root.userData.skinTone=look.skin;root.userData.height=1.94;root.userData.pose=(a,time)=>pose(root,rig,materials,shadow,warning,trail,a,time,weapon);
 root.userData.pose({x:0,z:0,yaw:0,walk:0,vx:0,vz:0,alive:true,hp:100,weapon},0);return root;
}
function pose(root,r,mats,shadow,warning,trail,a,time,weapon){
 root.position.set(a.x,0,a.z);root.rotation.y=-a.yaw;const speed=clamp(Math.hypot(a.vx||0,a.vz||0)/4.6,0,1),cycle=(a.walk||0)*4.4,breath=Math.sin(time*2.4+(a.id||0)*.7),attack=a.attack;
 r.body.position.y=1.025+Math.cos(cycle*2)*.010*speed+breath*.002;r.body.rotation.set(a.alive===false?.85:a.dash>0?-.20:-.055*speed,0,a.dash>0?-.12:Math.sin(cycle)*.028*speed);r.head.rotation.set(-r.body.rotation.x*.45,Math.sin(cycle)*.04*speed,0);
 for(let i=0;i<2;i++){const phase=cycle+i*Math.PI,stride=Math.sin(phase),lift=Math.max(0,-stride);r.legs[i].rotation.set(stride*.52*speed,0,i===0?.025:-.025);r.knees[i].rotation.x=.09+lift*.72*speed;r.ankles[i].rotation.x=-lift*.31*speed;r.arms[i].rotation.set(-.12-Math.sin(phase)*.35*speed,0,i===0?.10:-.10);r.elbows[i].rotation.set(-.32-Math.max(0,Math.sin(phase))*.35*speed,0,0);r.hands[i].rotation.set(0,0,i===0?-.04:.04)}
 // Keep a relaxed sword guard, with a bent wrist and elbow rather than a rigid arm.
 r.arms[1].rotation.x=-.14;r.elbows[1].rotation.x=-.70;r.hands[1].rotation.x=.15;
 if(a.block){r.arms[0].rotation.set(-.78,.23,-.16);r.elbows[0].rotation.x=-.98;r.body.rotation.y=-.16;r.arms[1].rotation.x=-.32;r.elbows[1].rotation.x=-.85;if(weapon==='dual'){r.arms[1].rotation.x=-.82;r.elbows[1].rotation.x=-.88}}
 if(attack){const wind=clamp(attack.t/Math.max(.01,attack.wind),0,1),strike=clamp((attack.t-attack.wind)/.19,0,1),recovery=clamp((attack.t-attack.wind-.19)/Math.max(.10,attack.duration-attack.wind-.19),0,1),power=attack.heavy?1.15:1;
  if(attack.t<attack.wind){r.body.rotation.y=-.35*wind;r.arms[1].rotation.set(-.14+wind*.42,-.1,-.10-wind*.70*power);r.elbows[1].rotation.x=-.70-wind*.65;r.hands[1].rotation.z=-wind*.18;r.head.rotation.y=.15*wind}
  else{const ease=1-recovery;r.body.rotation.y=mix(-.35,.42,strike)*ease;r.arms[1].rotation.set(mix(-.1,-1.05,strike)*ease,-.25+strike*.7*ease,(-.8+strike*1.15)*ease-.1);r.elbows[1].rotation.x=mix(-1.3,-.23,strike)*ease-.30*recovery;r.hands[1].rotation.set(-.12*strike,0,.18*strike*ease);r.arms[0].rotation.x=-.25;r.elbows[0].rotation.x=-.80}
  if(weapon==='spear'){r.arms[1].rotation.set(-.75-strike*.25,0,-.16);r.elbows[1].rotation.x=mix(-1.25,-.18,strike)*(1-recovery)-.5*recovery;r.hands[1].rotation.x=-.9}
 }
 if(a.dash>0){r.legs[0].rotation.x=-.48;r.legs[1].rotation.x=.45;r.knees[0].rotation.x=.70;r.knees[1].rotation.x=.35}
 if(a.alive===false){r.body.position.y=.70;r.body.rotation.z=.43;r.legs[0].rotation.x=-.62;r.legs[1].rotation.x=.20;r.knees.forEach(k=>k.rotation.x=.85);r.arms.forEach(arm=>arm.rotation.x=-.35)}
 warning.visible=!!attack&&attack.t<attack.wind;warning.scale.setScalar(weaponOf(a).reach/root.scale.x);warning.material.color.setHex(attack?.heavy?0xff754a:0xffc270);trail.visible=!!attack&&attack.t>=attack.wind&&attack.t<attack.wind+.15;trail.rotation.y=attack?(attack.t-attack.wind)*9:0;shadow.visible=a.alive!==false;
 for(const material of mats)if(material.emissive){material.emissive.setHex(a.flash>0?0xffcfa3:0);material.emissiveIntensity=a.flash>0?.30:0}
}
export function createViewLoadout(weapon,makeWeapon){
 const m=palette(0,LOOKS[0]),root=new THREE.Group();root.name='First-person armored hands';
 for(const side of [-1,1]){const arm=joint(root,side<0?'Left view arm':'Right view arm',side*.30,-.48,-.34);arm.rotation.x=2.25;add(arm,loft([[0,.067,.073],[-.13,.065,.066],[-.26,.045,.047]],24),m.plate);add(arm,loft([[-.22,.049,.052],[-.27,.051,.054]],20),m.edge);const h=hand(root,m,side);h.position.set(side*.30,-.34,-.59);h.rotation.x=-.08;const equipped=makeWeapon(weapon);equipped.scale.setScalar(weapon==='spear'?.85:.78);equipped.position.set(0,-.042,-.055);equipped.rotation.set(-.20,0,side===1?-.10:.10);if(side===1||weapon==='dual')h.add(equipped);else{disposeUnused(equipped);const s=shield(h,m);s.position.set(-.04,.08,-.16);s.scale.setScalar(.83)}}
 batchParts(root);releaseUnusedPalette(root,m);return root;
}
function disposeUnused(root){root.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}
