import * as THREE from '../vendor/three.module.js';
import {roundedBox,surface} from './surfaces.js?v=scan2';
import {attachShadowCape} from './shadow-cape.js?v=glitchdrop1';

function piece(group,geometry,material,x,y,z) {
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.castShadow=true;
  group.add(mesh);
  return mesh;
}

function casePanel(group,material,[w,h,d],[x,y,z]) {
  return piece(group,roundedBox(w,h,d),material,x,y,z);
}

function plate(group,shape,material,depth,x=0,y=0,z=0) {
  return piece(group,new THREE.ExtrudeGeometry(shape,{
    depth,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2,curveSegments:9
  }),material,x,y,z);
}

function rib(group,material,points,radius=.018) {
  const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
  piece(group,new THREE.TubeGeometry(curve,10,radius,6,false),material,0,0,0);
}

function feather(length,width) {
  const shape=new THREE.Shape();
  shape.moveTo(0,0);
  shape.quadraticCurveTo(length*.38,width*.75,length*.82,width*.36);
  shape.quadraticCurveTo(length*.95,width*.21,length,0);
  shape.quadraticCurveTo(length*.52,-width*.57,.10,-width*.37);
  shape.quadraticCurveTo(.01,-width*.20,0,0);
  return shape;
}

function featherWing(group,base,trim) {
  for(let i=0;i<7;i++) {
    const length=1.03-i*.085;
    const x=.08+i*.019;
    const y=.20-i*.058;
    const blade=plate(group,feather(length,.19),i%3===1?trim:base,.021,x,y,.005+i*.012);
    blade.rotation.z=.52-i*.177;
  }
  for(let i=0;i<4;i++) {
    const blade=plate(group,feather(.56-i*.055,.16),trim,.022,.055,.11-i*.057,-.055);
    blade.rotation.z=.48-i*.23;
  }
  rib(group,trim,[[0,0,-.034],[.29,.21,-.04],[.59,.38,-.037]],.031);
}

function dragonWing(group,base,trim) {
  const shape=new THREE.Shape();
  shape.moveTo(0,0);
  shape.quadraticCurveTo(.27,.47,1.10,.63);
  shape.quadraticCurveTo(.84,.19,1.08,-.21);
  shape.quadraticCurveTo(.77,.025,.72,-.27);
  shape.quadraticCurveTo(.49,-.12,.38,-.38);
  shape.quadraticCurveTo(.25,-.17,0,0);
  plate(group,shape,base,.026);
  for(const [tipX,tipY] of [[1.1,.63],[1.08,-.21],[.72,-.27],[.38,-.38]]) {
    rib(group,trim,[[0,0,-.025],[tipX*.5,tipY*.54+.13,-.024],[tipX,tipY,-.015]]);
  }
  rib(group,trim,[[0,0,-.026],[.34,.39,-.03],[.77,.57,-.024],[1.1,.63,-.015]],.025);
}

function crystalWing(group,item,base) {
  const colors=[item.color,item.accent,'#b9f8ff'];
  for(let i=0;i<5;i++) {
    const length=1-i*.105;
    const shape=new THREE.Shape();
    shape.moveTo(0,0);
    shape.lineTo(.26,.16);
    shape.lineTo(length,.09);
    shape.lineTo(length+.085,0);
    shape.lineTo(.22,-.135);
    shape.closePath();
    const panel=plate(group,shape,base,.057,.04+i*.027,.19-i*.095,.055+i*.008);
    panel.rotation.z=.58-i*.214;
    const jewel=piece(panel,new THREE.OctahedronGeometry(.22,0),new THREE.MeshPhysicalMaterial({
      color:colors[i%3],roughness:.23,metalness:.26,clearcoat:.7
    }),length*.61,.01,-.047);
    jewel.scale.set(1.7,.35,.24);
  }
}

function makeWings(root,item) {
  const type=item.kind==='crystal'?'metal':'polymer';
  const base=surface(item.color,type);
  const trim=surface(item.accent,item.kind==='feather'?'polymer':'metal');
  const hinges=[];
  for(const side of [-1,1]) {
    const wing=new THREE.Group();
    wing.position.set(side*.13,1.39,-.27);
    wing.scale.x=side;
    root.add(wing);
    hinges.push({wing,side});
    if(item.kind==='feather') featherWing(wing,base,trim);
    else if(item.kind==='dragon') dragonWing(wing,base,trim);
    else crystalWing(wing,item,base);
  }
  casePanel(root,trim,[.33,.35,.13],[0,1.37,-.235]);
  root.userData.animate=time=>{
    for(const {wing,side} of hinges) wing.rotation.y=side*(.11+Math.sin(time*1.9)*.08);
  };
}

function makeJetpack(root,item) {
  const metal=surface(item.color,'metal',{metalness:.47,roughness:.36});
  const trim=surface(item.accent,'metal',{metalness:.29});
  const dark=surface('#23323b','rubber');
  const light=new THREE.MeshStandardMaterial({
    color:item.accent,emissive:item.accent,emissiveIntensity:.76,roughness:.28
  });
  const retro=item.pattern==='retro';
  const turbo=item.pattern==='turbo';
  casePanel(root,dark,[.51,.61,.19],[0,1.24,-.242]);
  casePanel(root,metal,[.34,.52,.21],[0,1.26,-.37]);
  casePanel(root,trim,[.16,.26,.06],[0,1.3,-.494]);
  for(const y of [1.24,1.31,1.38]) casePanel(root,light,[.092,.022,.014],[0,y,-.53]);
  for(const side of [-1,1]) {
    const x=side*(turbo?.32:.26);
    const z=-.408;
    const radius=turbo?.115:.102;
    piece(root,new THREE.CapsuleGeometry(radius,retro?.36:.28,5,16),metal,x,1.31,z);
    for(const y of [1.2,1.44]) piece(root,new THREE.CylinderGeometry(radius+.014,radius+.014,.042,18),trim,x,y,z);
    piece(root,new THREE.CylinderGeometry(.073,radius+.018,.11,18),dark,x,.999,z);
    piece(root,new THREE.CylinderGeometry(.062,.062,.023,18),light,x,.933,z);
    if(turbo) {
      const fin=casePanel(root,trim,[.082,.22,.19],[x+side*.10,1.24,z-.04]);
      fin.rotation.z=-side*.25;
    } else if(retro) {
      casePanel(root,trim,[.059,.19,.045],[x,1.29,z-.10]);
    }
    rib(root,dark,[[side*.17,1.36,-.37],[side*.13,1.55,-.31],[side*.25,1.56,-.24]],.024);
  }
  root.userData.animate=time=>{light.emissiveIntensity=.72+Math.sin(time*4)*.23;};
}

export function makeBackGear(item) {
  const root=new THREE.Group();
  root.name=item.name;
  root.userData.item=item.id;
  if(item.kind==='jetpack') makeJetpack(root,item);
  else if(item.kind==='shadowcape') attachShadowCape(root,item);
  else makeWings(root,item);
  return root;
}
