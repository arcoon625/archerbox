import {THREE,mesh,oval,sweep,silhouette,eye,sides,surface,lamp} from './pet-forms.js';

const mammals={
 raccoon:{fur:'#817e72',mark:'#37343a',light:'#d6cfc0',length:.30,leg:.18,head:.135,muzzle:.085},
 cat:{fur:'#a19aa5',mark:'#5e575e',light:'#ded3cd',length:.32,leg:.23,head:.117,muzzle:.052},
 fox:{fur:'#ba6536',mark:'#423733',light:'#f1e4ce',length:.33,leg:.24,head:.115,muzzle:.128},
 dog:{fur:'#c89151',mark:'#81542d',light:'#ead1a3',length:.30,leg:.21,head:.133,muzzle:.095},
 rabbit:{fur:'#e4ded6',mark:'#9f8e8d',light:'#f6ede0',length:.24,leg:.12,head:.106,muzzle:.060},
 unicorn:{fur:'#d9d1de',mark:'#aa799e',light:'#ece6e3',length:.33,leg:.36,head:.102,muzzle:.114}
};

function limb(group,fur,paw,x,h,z,{rear=false,hoof=false,bunny=false}={}) {
 const bend=rear?-.048:.027;
 sweep(group,fur,[[x,h,z,.066],[x,h*.67,z+bend,.056],[x,h*.30,z-.019,.033],[x,.048,z,.031],[x,.018,z,.002]]);
 if(rear) oval(group,fur,[x*.94,h*.94,z-.027],[.066,bunny?.123:.093,bunny?.12:.088],.08);
 oval(group,paw,[x,.033,z+.031],[hoof ? .037 : .043,.027,bunny ? .090 : .052]);
 if(!hoof)for(const toe of [-1,0,1])oval(group,fur,[x+toe*.022,.027,z+.067],[.014,.015,.018]);
}

function ears(group,kind,fur,trim,position) {
 const [y,z]=position;
 for(const side of sides){
  if(kind==='dog'){
   const flap=oval(group,trim,[side*.119,y-.01,z-.025],[.047,.103,.077],-side*.27);
   flap.rotation.x=.18;
  } else if(kind==='raccoon') {
   oval(group,fur,[side*.089,y+.035,z],[.055,.059,.028],-side*.33);
   oval(group,trim,[side*.089,y+.039,z+.023],[.033,.038,.012],-side*.33);
  } else if(kind==='rabbit') {
   oval(group,fur,[side*.065,y+.116,z-.025],[.034,.145,.025],-side*.19);
   oval(group,trim,[side*.065,y+.118,z-.005],[.021,.116,.009],-side*.19);
  } else {
   const earGroup=new THREE.Group();
   earGroup.position.set(side*.076,y-.008,z-.022);
   earGroup.rotation.z=-side*.29;
   earGroup.scale.y=kind==='fox'?1.13:.84;
   group.add(earGroup);
   silhouette(earGroup,fur,[[-.051,-.015],[-.05,.066,-.012,.123],[.008,.125,.016,.109],[.048,.049,.047,-.013]],[0,0,0],.043);
   silhouette(earGroup,trim,[[-.030,.002],[-.037,.033,-.009,.091],[.019,.064,.031,.005],[0,-.007]],[0,0,.044],.007);
  }
 }
}

function fineCoat(group,color,regions) {
 const count=regions.reduce((total,region)=>total+region[2],0);
 const fibers=new THREE.InstancedMesh(new THREE.ConeGeometry(.003,.019,3),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.91}),count);
 const base=new THREE.Color(color),frame=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
 const tuftColor=new THREE.Color();
 let slot=0;
 for(const [[x,y,z],[rx,ry,rz],amount] of regions){
  for(let i=0;i<amount;i++){
   const ny=1-(i+.5)/amount;
   const angle=i*2.399963;
   const round=Math.sqrt(1-ny*ny);
   const nx=Math.cos(angle)*round,nz=Math.sin(angle)*round;
   if(z>0&&nz>.42)continue;
   const direction=new THREE.Vector3(nx*.7,ny*.41-.34,nz*.84-.48).normalize();
   frame.position.set(x+nx*rx*.997,y+ny*ry*.997,z+nz*rz*.997).addScaledVector(direction,.004);
   frame.quaternion.setFromUnitVectors(up,direction);
   const length=.61+((i*47)%53)/100;
   frame.scale.set(.76,length,.76);
   frame.updateMatrix();
   fibers.setMatrixAt(slot,frame.matrix);
   fibers.setColorAt(slot,tuftColor.copy(base).multiplyScalar(.84+((i*29)%53)/100));
   slot++;
  }
 }
 fibers.count=slot;
 group.add(fibers);
}

export function mammal(group,item) {
 const kind=item.kind,design=mammals[kind];
 const fur=surface(design.fur,'fur'),mark=surface(design.mark,'fur'),light=surface(design.light,'fur');
 const nose=surface(kind==='rabbit'?'#ac797b':'#312727','skin',{roughness:.31});
 const earTone=surface(kind==='rabbit'||kind==='cat'?'#cda3a4':design.mark,'skin');
 const h=design.leg, y=h+.155, headY=h+(kind==='unicorn'?.32:.225), z=design.length*.74;
 oval(group,fur,[0,y,-.07],[.147,.138,design.length]);
 oval(group,light,[0,y-.073,-.024],[.12,.081,design.length*.78]);
 oval(group,fur,[0,y+.025,.135],[.133,.143,.15]);
 const chest=oval(group,light,[0,y+.015,.227],[.111,.112,.056]);chest.rotation.x=-.25;
 const neck=oval(group,fur,[0,(y+headY)*.5,z-.034],[.103,(kind==='unicorn'?.19:.12),.104]);neck.rotation.x=.24;
 for(const side of sides){
  limb(group,fur,kind==='fox'||kind==='unicorn'?mark:fur,side*.107,h+.034,.145,{hoof:kind==='unicorn'});
  limb(group,fur,kind==='fox'||kind==='unicorn'?mark:fur,side*.113,h+.035,-design.length*.71,{rear:true,hoof:kind==='unicorn',bunny:kind==='rabbit'});
 }
 oval(group,fur,[0,headY,z],[design.head,design.head*.92,design.head*.88]);
 ears(group,kind,fur,earTone,[headY+design.head*.63,z-.037]);
 const muzzleZ=z+design.head*.69+design.muzzle*.43;
 const muzzle=oval(group,light,[0,headY-.038,muzzleZ],[design.head*.66,.060,design.muzzle*.83]);
 muzzle.rotation.x=.15;
 for(const side of sides){
  const eyeX=side*design.head*.69,eyeZ=z+design.head*.67;
  if(kind==='raccoon'){
   oval(group,light,[eyeX,headY+.017,eyeZ-.008],[.070,.052,.018],side*.21);
   oval(group,mark,[eyeX,headY+.014,eyeZ+.005],[.060,.036,.019],side*.19);
  }
  eye(group,[eyeX,headY+.020,eyeZ+.018],kind==='rabbit'?.024:.022,kind==='cat'?'#b9b46b':'#77513a',side*.47);
  if(kind==='raccoon'||kind==='cat'||kind==='fox'){
   for(let i=0;i<3;i++){
    const wy=headY-.048+i*.015;
    sweep(group,light,[[side*.044,wy,muzzleZ+.023,.0017],[side*.103,wy+.003,muzzleZ+.044,.0014],[side*.156,wy+(i-1)*.017,muzzleZ+.055,.0002]]);
   }
  }
 }
 oval(group,nose,[0,headY-.018,muzzleZ+design.muzzle*.79],[design.head*.36,.024,.026]);
 sweep(group,nose,[[-.039,headY-.063,muzzleZ+design.muzzle*.62,.001],[0,headY-.07,muzzleZ+design.muzzle*.74,.003],[.039,headY-.063,muzzleZ+design.muzzle*.62,.001]]);

 const tail=new THREE.Group();
 tail.position.set(0,y+.025,-design.length*.77);
 group.add(tail);
 if(kind==='raccoon')sweep(tail,[fur,mark],[[0,0,0,.054],[0,.019,-.105,.078],[.029,.014,-.22,.084],[.075,.039,-.33,.064],[.103,.09,-.41,.006]],{bands:t=>Math.floor(t*7)%2});
 else if(kind==='fox')sweep(tail,[fur,light],[[0,0,0,.067],[0,-.025,-.14,.095],[.018,-.057,-.29,.105],[.065,-.013,-.42,.067],[.103,.029,-.49,.003]],{bands:t=>Number(t>.69)});
 else if(kind==='rabbit')oval(tail,light,[0,0,-.06],[.062,.067,.064]);
 else sweep(tail,kind==='unicorn'?mark:fur,[[0,0,0,.042],[0,.07,-.12,.046],[.043,.13,-.22,.039],[.074,.18,-.26,.029],[.117,.16,-.33,.003]]);
 if(kind!=='unicorn')fineCoat(group,design.fur,[
  [[0,y,-.07],[.147,.138,design.length],375],
  [[0,headY,z],[design.head,design.head*.92,design.head*.88],170]
 ]);
 if(kind==='unicorn'){
  const horn=surface('#e9bd80','metal',{metalness:.36});
  sweep(group,horn,[[0,headY+.075,z+.056,.033],[0,headY+.14,z+.083,.024],[0,headY+.211,z+.115,.001]]);
  for(let i=0;i<6;i++)oval(group,surface(new THREE.Color().setHSL(.74+i*.05,.32,.57),'fur'),[.036,headY+.101-i*.038,z-.078-i*.016],[.064,.055,.06],.29);
 }
 group.userData.petAnimate=time=>{tail.rotation.y=Math.sin(time*(kind==='dog'?7:2))*.22;};
}

export function reptile(group,item) {
 const kind=item.kind;
 const scales=surface(item.color,'scale'),belly=surface(item.accent,'scale'),horn=surface('#ede0c4','ceramic',{roughness:.66});
 const dragon=kind==='dragon', adult=dragon||kind==='triceratops',headY=adult?.48:.43;
 oval(group,scales,[0,.27,-.10],[.161,.164,.295]);
 oval(group,belly,[0,.202,-.055],[.141,.11,.231]);
 sweep(group,scales,[[0,.29,.1,.131],[0,.36,.182,.111],[0,headY,.25,.077]]);
 const jawZ=kind==='triceratops'?.33:.39;
 oval(group,scales,[0,headY,.27],[.12,.116,.14]);
 oval(group,scales,[0,headY-.018,jawZ],[.103,.067,.13]);
 oval(group,belly,[0,headY-.073,jawZ-.021],[.087,.036,.118]);
 for(const side of sides){
  eye(group,[side*.099,headY+.022,.327],.024,'#c9a456',side*.78);
  oval(group,belly,[side*.041,headY+.011,jawZ+.104],[.016,.008,.005],side*.15);
  oval(group,scales,[side*.086,headY+.047,.327],[.048,.017,.046],-side*.2);
  if(kind==='dino') limb(group,scales,scales,side*.11,.30,-.088,{rear:true});
  else {
   limb(group,scales,scales,side*.10,.19,.121);
   limb(group,scales,scales,side*.121,.21,-.235,{rear:true});
  }
  if(kind==='dino')sweep(group,scales,[[side*.093,.31,.154,.031],[side*.132,.22,.21,.019],[side*.124,.193,.279,.009]]);
 }
 const tail=new THREE.Group();
 tail.position.set(0,.263,-.29);
 group.add(tail);
 sweep(tail,scales,[[0,0,0,.10],[0,-.021,-.12,.078],[.024,-.024,-.25,.053],[.086,.02,-.43,.019],[.129,.05,-.52,.002]]);
 if(kind==='triceratops'){
  oval(group,belly,[0,.516,.201],[.214,.161,.045]);
  oval(group,scales,[0,.521,.221],[.187,.136,.037]);
  for(const side of sides){
   sweep(group,horn,[[side*.079,.565,.314,.038],[side*.092,.637,.354,.026],[side*.104,.663,.429,.0015]]);
   for(let i=0;i<4;i++)oval(group,horn,[side*(.197-i*.035),.53+i*.034,.213],[.021,.02,.016]);
  }
  sweep(group,horn,[[0,.485,.417,.027],[0,.552,.451,.001]]);
 } else if(kind==='stego'){
  for(let i=0;i<8;i++){
   const height=.12+Math.sin((i+1)*Math.PI/10)*.09;
   const plate=silhouette(group,belly,[[-.06,0],[.035,height],[.092,.006]],[-.034+(i%2)*.04,.385-Math.max(0,i-4)*.033,.158-i*.081],.022);
   plate.rotation.y=Math.PI/2;
  }
  for(const side of sides)sweep(tail,horn,[[0,.009,-.28,.024],[side*.09,.058,-.315,.018],[side*.123,.075,-.35,.001]]);
 } else if(dragon){
  const wings=[];
  const membrane=new THREE.MeshPhysicalMaterial({color:item.accent,roughness:.70,side:THREE.DoubleSide,clearcoat:.22});
  for(const side of sides){
   const wing=new THREE.Group();wing.position.set(side*.105,.36,-.03);wing.scale.x=side;group.add(wing);wings.push({wing,side});
   silhouette(wing,membrane,[[0,0],[.32,.44],[.655,.31],[.523,.154,.584,-.035],[.376,.072,.397,-.087],[.216,.024,.213,-.114]],[0,0,0]);
   for(const [x,y] of [[.655,.31],[.584,-.035],[.397,-.087],[.213,-.114]])sweep(wing,scales,[[0,0,.011,.025],[.31,.36,.011,.018],[x,y,.013,.003]]);
   sweep(group,horn,[[side*.079,.552,.21,.032],[side*.109,.622,.15,.027],[side*.131,.653,.105,.002]]);
  }
  for(let i=0;i<5;i++){
   const z=.15-i*.093;
   const y=.404-Math.abs(z+.1)*.18;
   if(item.pattern==='ice'){
    const shard=mesh(group,new THREE.OctahedronGeometry(.06,0),belly,[0,y+.025,z]);
    shard.scale.set(.62,1.3,.65);
    shard.rotation.x=-.26;
   }else if(item.pattern==='lava'){
    sweep(group,lamp('#d18442'),[[-.054,y-.027,z,.004],[-.013,y,z-.018,.005],[.025,y-.002,z+.004,.004],[.056,y-.021,z-.011,.002]]);
   }else if(item.pattern==='stars'){
    for(const side of sides)oval(group,belly,[side*.132,.301+i%2*.04,z-.045],[.008,.009,.012]);
   }else{
    sweep(group,horn,[[0,y-.014,z,.027],[0,y+.035,z-.02,.017],[0,y+.044,z-.043,.002]]);
   }
  }
  group.userData.petAnimate=time=>{tail.rotation.y=Math.sin(time*2)*.14;for(const {wing,side} of wings)wing.rotation.y=side*Math.sin(time*2.8)*.19;};
  return;
 }
 group.userData.petAnimate=time=>{tail.rotation.y=Math.sin(time*2)*.13;};
}
