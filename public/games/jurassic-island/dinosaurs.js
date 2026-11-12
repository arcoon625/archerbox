import * as THREE from '../../vendor/three.module.js';
import {SPECIES,clamp} from './rules.js';

// Original, locally generated sculpted meshes and physically shaded textures.
// There are no remote model/texture requests and no per-frame mesh creation.
const TAU=Math.PI*2,UP=new THREE.Vector3(0,1,0),DOWN=new THREE.Vector3(0,-1,0),X=new THREE.Vector3(1,0,0),Z=new THREE.Vector3(0,0,1);
const noise=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v)};
const textureCache=new Map();
function skinMaps(large=false){
 const key=large?'hide':'scales';if(textureCache.has(key))return textureCache.get(key);
 const size=512,cells=large?38:56,color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4),points=[];
 for(let y=-1;y<=cells;y++)for(let x=-1;x<=cells;x++)points.push({x:x+.5+(noise((x+cells)%cells,(y+cells)%cells)-.5)*.56,y:y+.5+(noise((y+cells)%cells,(x+cells)%cells+13)-.5)*.56,seed:noise((x+cells)%cells+3,(y+cells)%cells+7)});
 const side=cells+2;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*cells,v=y/size*cells,ix=Math.floor(u),iy=Math.floor(v);let nearest=1e9,second=1e9,seed=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const p=points[(iy+dy+1)*side+ix+dx+1],d=(u-p.x)**2+(v-p.y)**2;if(d<nearest){second=nearest;nearest=d;seed=p.seed}else if(d<second)second=d}
  const seam=clamp((second-nearest)*7,0,1),pores=noise(x,y),fold=Math.sin(u*.73+Math.sin(v*.31)*2.8)*Math.sin(v*.57+Math.sin(u*.36)),mottle=Math.sin(u*.19+Math.cos(v*.23))*Math.cos(v*.13),i=(y*size+x)*4;
  const shade=clamp(187+seam*32+seed*18+mottle*13+pores*10+fold*7,0,255),bump=clamp(60+seam*102+seed*23+pores*22+fold*(large?24:9),0,255);
  color.set([shade,shade,shade,255],i);height.set([bump,bump,bump,255],i);const r=clamp(167+pores*32-seam*16+seed*25,0,255);rough.set([r,r,r,255],i);
 }
 const make=(data,srgb=false)=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t};
 const result={map:make(color,true),bumpMap:make(height),roughnessMap:make(rough)};textureCache.set(key,result);return result;
}
let photographicSkin;
function photoMaps(fallback){
 if(typeof window==='undefined')return fallback;
 if(!photographicSkin){const height=new THREE.Texture(),color=new THREE.TextureLoader().load(new URL('./assets/dinosaur-hide.png',import.meta.url).href,loaded=>{height.image=loaded.image;height.needsUpdate=true;});
  for(const t of [color,height]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.minFilter=THREE.LinearMipmapLinearFilter;}color.colorSpace=THREE.SRGBColorSpace;height.colorSpace=THREE.NoColorSpace;photographicSkin={map:color,bumpMap:height};
 }return {...fallback,...photographicSkin};
}
function shadePhotographicSkin(material){if(typeof window==='undefined')return;
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec4 sampledDiffuseColor=texture2D(map,vMapUv);
 sampledDiffuseColor.rgb=mix(vec3(0.78),sampledDiffuseColor.rgb*2.9,0.80);
 diffuseColor*=sampledDiffuseColor;
 #endif`)};material.customProgramCacheKey=()=> 'jurassic-photohide-v1';
}
const PALETTES={
 trex:{back:0x3c4533,flank:0x788064,belly:0xc0b394,stripe:0x343a2a,frequency:2.9},
 raptor:{back:0x484335,flank:0xa38c62,belly:0xd1bea0,stripe:0x292f2a,frequency:5.4},
 brachio:{back:0x525d51,flank:0x939c85,belly:0xc3b99e,stripe:0x555e50,frequency:1.5},
 trike:{back:0x4e5142,flank:0x8b8c70,belly:0xb4aa8f,stripe:0x515344,frequency:2.1},
 stego:{back:0x505c49,flank:0x8e9577,belly:0xbeb799,stripe:0x424f3e,frequency:2.6},
 anky:{back:0x555343,flank:0x948973,belly:0xb9ae92,stripe:0x555141,frequency:3.2}
};
function materials(id){const p=PALETTES[id],make=(color,options={})=>new THREE.MeshPhysicalMaterial({color,roughness:.72,...options});const result={
 skin:make(0xffffff,{...photoMaps(skinMaps(id==='brachio')),vertexColors:true,bumpScale:id==='brachio'?.042:.032,roughness:.84,clearcoat:.025,clearcoatRoughness:.7}),
 horn:make(0xc5b596,{...skinMaps(true),roughness:.76,bumpScale:.011,vertexColors:true,name:'keratin-bone'}),
 plate:make(id==='stego'?0x9e6d50:0x8a8268,{...skinMaps(true),roughness:.83,bumpScale:.022,vertexColors:true,side:THREE.DoubleSide}),
 mouth:make(0x392826,{roughness:.53}),gum:make(0x645047,{roughness:.49}),tongue:make(0x745651,{roughness:.43,clearcoat:.10}),claw:make(0x484036,{roughness:.63,vertexColors:true,name:'keratin-claw'}),eye:make(0x332b1d,{roughness:.14,clearcoat:1,clearcoatRoughness:.05}),iris:make(0xb49a4d,{roughness:.23,clearcoat:.5}),pupil:make(0x090c08,{roughness:.12}),p
 };shadePhotographicSkin(result.skin);return result;}
function tint(geometry,p,pattern=1){
 const positions=geometry.attributes.position,normals=geometry.attributes.normal,colors=new Float32Array(positions.count*3),back=new THREE.Color(p.back),flank=new THREE.Color(p.flank),belly=new THREE.Color(p.belly),stripe=new THREE.Color(p.stripe),c=new THREE.Color();
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),ny=normals.getY(i),n=Math.sin(x*4.6+Math.sin(z*2.3))*Math.cos(y*3.4-z*.9),bar=Math.pow(Math.max(0,Math.sin(z*p.frequency+Math.sin(y*2.7)*.65+Math.sin(x*2)*.36)),8)*pattern;
  c.copy(flank);if(ny>.05)c.lerp(back,clamp(ny*.65,0,.72));if(ny<-.25)c.lerp(belly,clamp((-ny-.25)*1.18,0,.75));c.lerp(stripe,bar*.53*clamp((ny+.8),0,1));c.multiplyScalar(1+n*.055);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
 }geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;
}
function add(parent,geometry,material){const m=new THREE.Mesh(geometry,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
function ellipsoid(parent,material,p,center,scale,pattern=.3){const geo=new THREE.SphereGeometry(1,28,20);geo.scale(...scale);geo.translate(...center);if(material.vertexColors)tint(geo,p,pattern);return add(parent,geo,material)}
// Smooth Catmull-Rom cross sections sculpt a continuous silhouette; sections are
// [x,y,z,horizontal radius,vertical radius] in meters, not overlapping blocks.
function loft(parent,material,p,sections,{segments=48,sides=24,pattern=1,folds=0}={}){
 const path=new THREE.CatmullRomCurve3(sections.map(s=>new THREE.Vector3(s[0],s[1],s[2])),false,'catmullrom',.45),radii=new THREE.CatmullRomCurve3(sections.map(s=>new THREE.Vector3(s[3],s[4],0)),false,'catmullrom',.4),positions=[],uv=[],indices=[];let length=0,last;
 for(let i=0;i<=segments;i++){const t=i/segments,c=path.getPoint(t),tangent=path.getTangent(t).normalize(),axis=X.clone().addScaledVector(tangent,-tangent.x),r=radii.getPoint(t);if(axis.lengthSq()<.01)axis.copy(UP);axis.normalize();const normal=new THREE.Vector3().crossVectors(tangent,axis).normalize();if(last)length+=last.distanceTo(c);last=c.clone();
  for(let j=0;j<=sides;j++){const a=j/sides*TAU,wrinkle=1+folds*Math.sin(t*80+Math.cos(a)*2)*Math.pow(Math.abs(Math.cos(a)),.7),rx=Math.max(.002,r.x)*wrinkle,ry=Math.max(.002,r.y)*wrinkle;positions.push(c.x+axis.x*Math.cos(a)*rx+normal.x*Math.sin(a)*ry,c.y+axis.y*Math.cos(a)*rx+normal.y*Math.sin(a)*ry,c.z+axis.z*Math.cos(a)*rx+normal.z*Math.sin(a)*ry);uv.push(j/sides*2.2,length*.65);if(i<segments&&j<sides){const n=i*(sides+1)+j;indices.push(n,n+1,n+sides+1,n+1,n+sides+2,n+sides+1)}}
 }
 const start=path.getPoint(0),end=path.getPoint(1),startIndex=positions.length/3;positions.push(start.x,start.y,start.z,end.x,end.y,end.z);uv.push(.5,0,.5,length*.65);for(let j=0;j<sides;j++){indices.push(startIndex,j+1,j);const n=segments*(sides+1)+j;indices.push(startIndex+1,n,n+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();if(material.vertexColors)tint(geo,material.name==='keratin-bone'?{back:0x95846a,flank:0xe4d4b5,belly:0xcdba94,stripe:0x9b8866,frequency:17}:material.name==='keratin-claw'?{back:0x625c50,flank:0xa29a85,belly:0x827967,stripe:0x4a4439,frequency:18}:p,pattern);geo.computeBoundingSphere();return add(parent,geo,material);
}
function horn(parent,m,p,points,radius){const sections=points.map((v,i)=>[...v,Math.max(.002,radius*(1-i/(points.length-1))**.8),Math.max(.002,radius*(1-i/(points.length-1))**.8)]);return loft(parent,m,p,sections,{segments:20,sides:12,pattern:0,folds:.025})}
function eyes(parent,m,x,y,z,size,rig){
 for(const sign of [-1,1]){const eye=new THREE.Group();eye.position.set(x*sign,y,z);eye.quaternion.setFromUnitVectors(Z,new THREE.Vector3(sign,.03,.30).normalize());parent.add(eye);ellipsoid(eye,m.eye,m.p,[0,0,0],[size,size*.77,size*.65]);const iris=ellipsoid(eye,m.iris,m.p,[0,0,size*.55],[size*.62,size*.62,size*.17]);ellipsoid(eye,m.pupil,m.p,[0,0,size*.704],[size*.275,size*.32,size*.06]);
  for(let i=0;i<16;i++){const a=i/16*TAU,vein=horn(eye,m.eye,m.p,[[Math.cos(a)*size*.35,Math.sin(a)*size*.35,size*.715],[Math.cos(a)*size*.58,Math.sin(a)*size*.58,size*.67]],size*.018);vein.castShadow=false}
  for(const top of [-1,1]){const points=[];for(let i=0;i<9;i++){const a=i/8*Math.PI;points.push([-Math.cos(a)*size*1.08,top*Math.sin(a)*size*.71,size*.30+Math.sin(a)*size*.15,size*.12,size*.12])}loft(eye,m.skin,m.p,points,{segments:24,sides:8,pattern:0});}
  rig.eyes.push(eye);ellipsoid(parent,m.skin,m.p,[sign*(x+.015),y+size*.80,z-.04],[size*1.7,size*.43,size*1.45],.1);
 }
}
function nostrils(parent,m,x,y,z,size){for(const sign of [-1,1]){ellipsoid(parent,m.mouth,m.p,[sign*x,y,z],[size,size*.55,size*.30]);}}
function jointLeg(parent,m,rig,{x,y,z,upper,lower,width=.3,fore=false,raptor=false,biped=false,phase=0}){
 const hip=new THREE.Group(),shin=new THREE.Group(),foot=new THREE.Group();
 const side=x<0?'left':'right',pair=fore?'front':'hind';foot.name=pair+'-'+side+'-foot';foot.userData.dinosaurFoot=true;foot.userData.side=side;foot.userData.pair=pair;parent.add(hip,shin,foot);
 loft(hip,m.skin,m.p,[[0,.12,0,width*.85,width*.80],[0,-upper*.18,.08,width,width*.9],[0,-upper*.58,.06,width*.76,width*.70],[0,-upper,0,width*.48,width*.5]],{segments:24,sides:18,folds:.012});
 loft(shin,m.skin,m.p,[[0,.08,0,width*.48,width*.48],[0,-lower*.28,-.025,width*.56,width*.48],[0,-lower*.78,.02,width*.30,width*.33],[0,-lower,0,width*.33,width*.37]],{segments:24,sides:18,folds:.016});
 ellipsoid(shin,m.skin,m.p,[0,0,0],[width*.53,width*.53,width*.53],.15);
 const toes=biped?3:3,footLength=biped?width*2.1:width*1.35;ellipsoid(foot,m.skin,m.p,[0,.10,footLength*.17],[width*.64,.18,footLength*.65]);
 for(let i=0;i<toes;i++){const dx=(i-1)*width*.42,l=footLength*(i===1?1:.8);loft(foot,m.skin,m.p,[[dx,.09,.05,width*.23,width*.20],[dx*1.15,.055,l*.62,width*.16,width*.15],[dx*1.2,.04,l,width*.11,width*.11]],{segments:16,sides:10,pattern:.2});horn(foot,m.claw,m.p,[[dx*1.2,.06,l*.85],[dx*1.23,.09,l*1.1],[dx*1.2,.04,l*1.25]],width*.135);}
 if(raptor)horn(foot,m.claw,m.p,[[-width*.67,.12,.15],[-width*.70,.40,.31],[-width*.66,.36,.62],[-width*.60,.12,.66]],width*.17);
 const leg={hip,shin,foot,x,y,z,upper,lower,width,fore,phase,biped};rig.legs.push(leg);return leg;
}
function tail(parent,m,rig,sections,options={}){const mesh=loft(parent,m.skin,m.p,sections,{segments:64,sides:20,folds:.012,...options});mesh.userData.dynamic=true;mesh.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);const source=mesh.geometry.attributes.position.array.slice(),zStart=sections[0][2],end=sections.at(-1)[2];mesh.geometry.boundingSphere.radius+=.5;rig.tails.push({mesh,source,zStart,end});return mesh}
function arm(parent,m,side,{x,y,z,length=.6,raptor=false}){
 const arm=new THREE.Group();arm.position.set(side*x,y,z);parent.add(arm);
 loft(arm,m.skin,m.p,[[0,.06,0,.12,.14],[side*.12,-length*.45,.13,.11,.10],[side*.1,-length*.65,.40,.07,.07]],{segments:22,sides:14});
 for(let j=0;j<(raptor?3:2);j++)horn(arm,m.claw,m.p,[[side*.10+(j-1)*.08,-length*.64,.38],[side*.11+(j-1)*.10,-length*.72,.61],[side*.10+(j-1)*.09,-length*.80,.62]],.038);
 if(raptor){const featherMat=m.skin;for(let j=0;j<7;j++)loft(arm,featherMat,m.p,[[side*.12,-length*.38,.12+j*.045,.025,.018],[side*(.25+j*.018),-length*.52-.18,.03+j*.06,.035,.014],[side*(.27+j*.018),-length*.62-.24,-.03+j*.06,.002,.002]],{segments:8,sides:6,pattern:0})}
 return arm;
}
function predator(id,body,m,rig){
 const raptor=id==='raptor',scale=raptor?.38:1,core=new THREE.Group();core.scale.setScalar(scale);body.add(core);rig.scaled=core;
 const torso=loft(core,m.skin,m.p,[[0,2.65,-1.85,.025,.025],[0,2.75,-1.40,.83,.88],[0,2.85,-.45,raptor?.72:1.02,raptor?.81:1.12],[0,2.93,.65,raptor?.57:.83,.89],[0,3.31,1.45,.47,.67],[0,3.75,1.90,.42,.46],[0,3.79,2.13,.17,.19]],{segments:64,sides:32,folds:.01});torso.userData.dynamic=true;rig.breath.push(torso);
 tail(core,m,rig,[[0,2.72,-1.2,.78,.83],[0,2.70,-2.3,.59,.60],[0,2.62,-3.9,.34,.35],[.10,2.61,-5.3,.16,.18],[.28,2.70,raptor?-7.3:-6.45,.008,.008]],{pattern:1.2});
 const head=new THREE.Group();head.position.set(0,3.79,1.84);core.add(head);rig.head=head;
 const skull=loft(head,m.skin,m.p,[[0,.03,-.48,.025,.025],[0,.16,-.16,raptor?.40:.63,raptor?.34:.64],[0,.17,.40,raptor?.34:.61,.49],[0,.13,1.02,raptor?.29:.50,.38],[0,.11,raptor?2.02:1.77,raptor?.22:.44,raptor?.22:.32],[0,.12,raptor?2.18:1.97,.10,.12]],{segments:52,sides:32,folds:.014});
 const jaw=new THREE.Group();jaw.position.set(0,-.25,-.05);head.add(jaw);rig.jaw=jaw;
 loft(jaw,m.skin,m.p,[[0,-.02,-.21,.03,.03],[0,-.08,.02,raptor?.36:.55,.23],[0,-.10,.73,raptor?.29:.46,.20],[0,-.04,raptor?2.02:1.77,raptor?.19:.39,.16],[0,.03,raptor?2.10:1.86,.06,.04]],{segments:42,sides:24,folds:.01});
 ellipsoid(head,m.mouth,m.p,[0,-.215,.84],[raptor?.29:.45,.035,raptor?1.07:.93]);ellipsoid(jaw,m.gum,m.p,[0,.055,.84],[raptor?.28:.45,.026,raptor?1.03:.87]);ellipsoid(jaw,m.tongue,m.p,[0,.074,.78],[raptor?.16:.27,.055,.69]);
 const count=raptor?14:12;for(const side of [-1,1])for(let i=0;i<count;i++){const t=i/(count-1),z=.12+t*(raptor?1.83:1.60),width=(raptor?.26:.43)-(raptor?.08:.08)*t,len=(raptor?.15:.22)*(1+.30*Math.sin(t*Math.PI));horn(head,m.horn,m.p,[[side*width,-.23,z],[side*width*.99,-.23-len*.65,z+.025],[side*width*.94,-.23-len,z+.065]],raptor?.026:.045);horn(jaw,m.horn,m.p,[[side*width*.88,.06,z],[side*width*.86,.06+len*.62,z+.025],[side*width*.84,.06+len*.78,z+.06]],raptor?.023:.035)}
 eyes(head,m,raptor?.375:.615,.29,.24,raptor?.067:.075,rig);nostrils(head,m,raptor?.22:.36,.16,raptor?2.12:1.89,raptor?.048:.061);
 // Jaw muscles and brow ridges flow into the skull rather than floating eyes.
 for(const side of [-1,1]){ellipsoid(head,m.skin,m.p,[side*(raptor?.31:.45),-.04,-.11],[raptor?.13:.19,.29,.31],.35);horn(head,m.skin,m.p,[[side*.49,.49,-.05],[side*.54,.60,.12],[side*.50,.48,.48]],.065);arm(core,m,side,{x:raptor?.57:.70,y:3.0,z:1.11,length:raptor?1.10:.67,raptor});jointLeg(core,m,rig,{x:side*(raptor?.58:.72),y:2.40,z:-.65,upper:1.32,lower:1.18,width:raptor?.37:.53,biped:true,raptor,phase:side===-1?0:Math.PI});}
 if(raptor){for(let i=0;i<24;i++){const a=i/24*TAU,x=Math.cos(a)*.57,y=3.35+Math.sin(a)*.48;loft(core,m.skin,m.p,[[x,y,.85,.025,.015],[x*1.05,y+.12,.39,.03,.016],[x*1.02,y+.06,.06,.002,.002]],{segments:10,sides:6,pattern:.2})}}
 rig.stride=raptor?2.5:1.45;rig.step=raptor?.40:.42;rig.groundScale=scale;
}
function frill(parent,m){
 const shape=new THREE.Shape();shape.moveTo(-.65,-.35);shape.bezierCurveTo(-1.4,.05,-1.45,1.19,-.84,1.61);shape.bezierCurveTo(-.28,1.98,.28,1.98,.84,1.61);shape.bezierCurveTo(1.45,1.19,1.4,.05,.65,-.35);shape.quadraticCurveTo(0,-.7,-.65,-.35);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.06,curveSegments:20});geo.translate(0,0,-.42);tint(geo,m.p,.4);const mesh=add(parent,geo,m.skin);mesh.rotation.x=-.16;
 for(let i=0;i<19;i++){const a=.10+i/18*(Math.PI-.20),x=Math.cos(a)*1.32,y=.28+Math.sin(a)*1.50;horn(parent,m.horn,m.p,[[x*.95,y*.98,-.35],[x*1.06,y+.10,-.30],[x*1.13,y+.13,-.24]],.12)}
 for(const side of [-1,1])for(let i=0;i<5;i++)loft(parent,m.skin,m.p,[[side*.20,.18,-.20,.016,.015],[side*(.42+i*.14),.58+i*.20,-.21,.020,.014],[side*(.72+i*.095),.80+i*.18,-.25,.006,.005]],{segments:18,sides:6,pattern:0});
}
function plate(parent,m,z,height,width,side){
 const shape=new THREE.Shape();shape.moveTo(-width*.50,0);shape.bezierCurveTo(-width*.64,height*.28,-width*.45,height*.68,-width*.10,height*.95);shape.quadraticCurveTo(width*.08,height*1.10,width*.26,height*.88);shape.bezierCurveTo(width*.58,height*.42,width*.56,height*.15,width*.38,0);shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.085,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.045,bevelThickness:.03,curveSegments:10});geo.rotateY(Math.PI/2);const p={back:0x70452f,flank:0xd29b68,belly:0xc6a478,stripe:0x6b4836,frequency:3};tint(geo,p,.55);const o=add(parent,geo,m.plate);o.position.set(side*.16,2.12+Math.cos(z*.7)*.25,z);o.rotation.z=side*.10;
}
function quadruped(id,body,m,rig){
 const brachio=id==='brachio',trike=id==='trike',stego=id==='stego',anky=id==='anky';let torso;
 if(brachio){
  torso=loft(body,m.skin,m.p,[[0,2.65,-2.15,.06,.06],[0,2.70,-1.62,1.08,1.22],[0,3.05,-.10,1.40,1.54],[0,3.38,1.25,1.07,1.35],[0,3.70,1.72,.63,.85],[0,3.80,1.90,.16,.20]],{segments:56,sides:32,folds:.012});
  loft(body,m.skin,m.p,[[0,3.40,1.30,.79,.87],[0,4.38,1.92,.64,.68],[0,5.90,2.34,.45,.48],[0,7.37,2.86,.30,.35],[0,8.35,3.40,.27,.28]],{segments:72,sides:28,folds:.019});
  rig.head=new THREE.Group();rig.head.position.set(0,8.20,3.38);body.add(rig.head);loft(rig.head,m.skin,m.p,[[0,.14,-.35,.02,.02],[0,.24,-.08,.36,.43],[0,.09,.49,.30,.30],[0,-.03,.94,.27,.18],[0,-.05,1.02,.07,.06]],{segments:32,sides:24,folds:.013});eyes(rig.head,m,.305,.27,.20,.073,rig);nostrils(rig.head,m,.18,.20,.83,.041);loft(rig.head,m.mouth,m.p,[[-.26,-.10,.36,.012,.012],[0,-.16,.98,.012,.012],[.26,-.10,.36,.012,.012]],{segments:24,sides:6});
  tail(body,m,rig,[[0,2.60,-1.6,.68,.66],[0,2.33,-3.3,.40,.43],[.2,1.95,-5.1,.20,.25],[.55,1.75,-7.5,.009,.009]],{pattern:.35});
 }else{
  const y=anky?1.18:1.80,wide=anky?1.35:trike?1.20:1.11;
  torso=loft(body,m.skin,m.p,[[0,y,-2.15,.03,.03],[0,y+.02,-1.58,wide*.84,anky?.65:.86],[0,y+.10,-.45,wide,anky?.77:1.07],[0,y+.02,.85,wide*.9,anky?.61:.82],[0,y-.10,1.55,.57,.53],[0,y-.15,1.86,.15,.17]],{segments:56,sides:30,folds:.012});
  rig.head=new THREE.Group();rig.head.position.set(0,anky?1.04:trike?1.55:1.02,stego?2.60:1.85);body.add(rig.head);
  if(trike){frill(rig.head,m);loft(rig.head,m.skin,m.p,[[0,.09,-.33,.07,.07],[0,.04,.01,.68,.66],[0,-.04,.61,.52,.45],[0,-.19,1.20,.27,.26],[0,-.19,1.42,.07,.09]],{segments:40,sides:28,folds:.014});
   loft(rig.head,m.claw,m.p,[[0,-.25,1.08,.27,.24],[0,-.25,1.40,.20,.17],[0,-.30,1.54,.03,.02]],{segments:20,sides:16,pattern:0});eyes(rig.head,m,.57,.29,.31,.088,rig);nostrils(rig.head,m,.26,-.035,1.19,.052);
   for(const side of [-1,1])horn(rig.head,m.horn,m.p,[[side*.43,.43,.27],[side*.49,.89,.57],[side*.54,1.37,1.03],[side*.50,1.55,1.36]],.17);horn(rig.head,m.horn,m.p,[[0,.17,1.02],[0,.52,1.36],[0,.62,1.55]],.15);
  }else if(stego){
   loft(body,m.skin,m.p,[[0,1.72,1.18,.46,.44],[0,1.25,2.09,.34,.35],[0,1.00,2.70,.24,.23]],{segments:30,sides:20,folds:.014});loft(rig.head,m.skin,m.p,[[0,.06,-.19,.04,.04],[0,.04,.12,.31,.29],[0,-.07,.57,.22,.19],[0,-.09,.79,.11,.12],[0,-.10,.86,.01,.01]],{segments:30,sides:20});eyes(rig.head,m,.26,.17,.23,.060,rig);nostrils(rig.head,m,.13,.02,.75,.033);
   for(let i=0;i<17;i++){const t=i/16,z=-2.07+t*4.20;plate(body,m,z,(.48+Math.sin(t*Math.PI)*1.13),.54+Math.sin(t*Math.PI)*.38,i%2?-1:1)}
  }else{
   loft(rig.head,m.skin,m.p,[[0,.04,-.24,.03,.03],[0,.07,.15,.60,.39],[0,-.03,.71,.40,.27],[0,-.13,1.00,.24,.17],[0,-.13,1.10,.03,.03]],{segments:32,sides:22,folds:.014});eyes(rig.head,m,.49,.13,.36,.070,rig);nostrils(rig.head,m,.25,-.02,.95,.039);for(const side of [-1,1]){horn(rig.head,m.horn,m.p,[[side*.50,.23,-.08],[side*.76,.43,-.37],[side*.79,.43,-.57]],.16);horn(rig.head,m.horn,m.p,[[side*.46,-.16,.13],[side*.72,-.22,-.12],[side*.77,-.17,-.29]],.13)}
   for(let row=0;row<7;row++)for(let col=-3;col<=3;col++){const z=-1.57+row*.47,x=col*.34+(row%2?.10:0),d=Math.max(0,1-(x/1.4)**2),y=1.30+Math.sqrt(d)*.71,geo=new THREE.IcosahedronGeometry(1,1);geo.scale(.27,.12+noise(row,col)*.12,.30);geo.translate(x,y,z);tint(geo,m.p,.2);add(body,geo,m.skin)}
   for(const side of [-1,1])for(let i=0;i<8;i++)horn(body,m.horn,m.p,[[side*1.13,1.35,-1.65+i*.43],[side*1.50,1.56,-1.79+i*.43],[side*1.66,1.61,-1.90+i*.43]],.16);
  }
  const tailZ=anky?-5.0:stego?-5.40:-4.70;tail(body,m,rig,[[0,y-.03,-1.55,anky?.49:.50,anky?.42:.49],[0,y-.14,-2.7,.35,.32],[.12,y-.35,-3.9,.18,.18],[.31,y-.32,tailZ,.015,.015]],{pattern:.8});
  if(stego)for(const side of [-1,1])for(let j=0;j<2;j++)horn(body,m.horn,m.p,[[.18,y-.34,-4.05-j*.57],[side*.52,y-.01,-4.47-j*.57],[side*.86,y+.20,-4.82-j*.57]],.13);
  if(anky){ellipsoid(body,m.skin,m.p,[.23,y-.27,-4.70],[.62,.32,.49],.4);ellipsoid(body,m.skin,m.p,[-.18,y-.27,-4.77],[.48,.28,.44],.4)}
 }
 torso.userData.dynamic=true;rig.breath.push(torso);
 for(const side of [-1,1])for(const front of [-1,1]){const y=brachio?(front>0?3.20:2.64):anky?1.18:stego?(front>0?1.43:1.96):1.64,width=brachio?.43:anky?.31:.36;const reach=y-.12;
  jointLeg(body,m,rig,{x:side*(brachio?.98:anky?1.04:.88),y,z:front*(brachio?1.38:1.19),upper:reach*.51+.08,lower:reach*.51+.06,width,fore:front>0,phase:(side===-1?0:Math.PI)+(front>0?Math.PI:0)});
 }rig.stride=brachio?.68:anky?1.8:1.15;rig.step=brachio?.17:.20;
}
function mergeStaticSiblings(group){
 for(const child of [...group.children])if(child.isGroup)mergeStaticSiblings(child);
 const buckets=new Map();for(const o of group.children){if(!o.isMesh||o.userData.dynamic||!o.geometry.attributes.uv||!o.geometry.attributes.normal)continue;const key=o.material.uuid;const bucket=buckets.get(key)||[];bucket.push(o);buckets.set(key,bucket)}
 for(const meshes of buckets.values()){if(meshes.length<2)continue;const arrays={position:[],normal:[],uv:[],color:[]},hasColor=!!meshes[0].geometry.attributes.color;let total=0;
  for(const o of meshes){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);for(const name of ['position','normal','uv',...(hasColor?['color']:[])])arrays[name].push(g.attributes[name].array);total+=g.attributes.position.count;g.dispose();group.remove(o);o.geometry.dispose();}
  const geometry=new THREE.BufferGeometry();for(const [name,size] of [['position',3],['normal',3],['uv',2],...(hasColor?[['color',3]]:[])]){const data=new Float32Array(total*size);let offset=0;for(const a of arrays[name]){data.set(a,offset);offset+=a.length}geometry.setAttribute(name,new THREE.BufferAttribute(data,size))}add(group,geometry,meshes[0].material);
 }
}
function poseLeg(leg,phase,speed,step){
 const {x,y,z,upper:L1,lower:L2}=leg,a=phase+leg.phase,stride=leg.amplitude*speed*(leg.fore?.9:1),footY=.10+Math.max(0,Math.sin(a))*step*speed,footZ=z+Math.cos(a)*stride,dz=footZ-z,dy=footY-y,d=Math.min(Math.hypot(dz,dy),L1+L2-.01),uz=dz/Math.max(.01,Math.hypot(dz,dy)),uy=dy/Math.max(.01,Math.hypot(dz,dy)),along=(L1*L1-L2*L2+d*d)/(2*d),height=Math.sqrt(Math.max(0,L1*L1-along*along)),bend=leg.fore?-1:1,kz=z+uz*along-uy*height*bend,ky=y+uy*along+uz*height*bend;
 leg.hip.position.set(x,y,z);leg.hip.quaternion.setFromUnitVectors(DOWN,new THREE.Vector3(0,ky-y,kz-z).normalize());leg.shin.position.set(x,ky,kz);leg.shin.quaternion.setFromUnitVectors(DOWN,new THREE.Vector3(0,footY-ky,footZ-kz).normalize());leg.foot.position.set(x,footY,footZ);leg.foot.rotation.x=-Math.max(0,Math.sin(a))*speed*.14;
}
export function makeDinosaur(id){
 const species=SPECIES.find(s=>s.id===id)||SPECIES[0],root=new THREE.Group(),body=new THREE.Group(),m=materials(species.id),rig={legs:[],eyes:[],breath:[],tails:[],head:null,jaw:null,stride:1,step:.2,groundScale:1};root.name=species.name;root.add(body);
 if(['trex','raptor'].includes(species.id))predator(species.id,body,m,rig);else quadruped(species.id,body,m,rig);
 rig.stride={trex:3.0,raptor:4.8,brachio:2.35,trike:3.7,stego:4.4,anky:6.2}[species.id];for(const leg of rig.legs)leg.amplitude={trex:.52,raptor:.85,brachio:.66,trike:.42,stego:.35,anky:.25}[species.id];
 mergeStaticSiblings(body);
 root.userData.details={species:species.id,sculpted:true,textured:true,articulated:true};
 root.userData.pose=(d,time)=>{
  root.position.set(d.x,0,d.z);root.rotation.y=d.yaw;const speed=clamp(d.speed/.8,0,1),phase=d.walk*rig.stride;
  for(const leg of rig.legs)poseLeg(leg,phase,speed,rig.step);
  for(const torso of rig.breath)torso.scale.x=1+Math.sin(time*1.55+d.id)*.008;
  if(rig.head){rig.head.rotation.y=Math.sin(time*.47+d.id*1.7)*.045;rig.head.rotation.x=Math.sin(time*.82+d.id)*.020+Math.sin(phase)*speed*.018;}
  if(rig.jaw)rig.jaw.rotation.x=d.roar>0?.35+Math.sin(time*12)*.045:.055+Math.sin(time*.9+d.id)*.015;
  const cycle=(time+d.id*1.73)%5.6,blink=cycle<.16?.12+.88*Math.abs(cycle-.08)/.08:1;for(const eye of rig.eyes)eye.scale.y=blink;
  for(const tail of rig.tails){const p=tail.mesh.geometry.attributes.position,source=tail.source;for(let i=0;i<p.count;i++){const z=source[i*3+2],t=clamp((z-tail.zStart)/(tail.end-tail.zStart),0,1);p.setXYZ(i,source[i*3]+Math.sin(time*1.25-t*3+d.id)*t*t*(.10+speed*.15),source[i*3+1]+Math.sin(phase*.8-t*2)*t*.035*speed,z)}p.needsUpdate=true;}
 };
 root.userData.pose({x:0,z:0,yaw:0,speed:0,walk:0,id:0,roar:0,state:'roam'},0);return root;
}
