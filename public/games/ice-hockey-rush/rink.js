import * as T from '../../vendor/three.module.js';
import {RINK, TEAMS, ARENAS} from './rules.js';

const dimensions = { x: RINK.width / 2, z: RINK.length / 2 };
const looks = [
  { sky: '#253449', fog: '#2c3d57', seats: ['#324d69','#466886','#263c55'], ground: '#233146', light: '#d8e8ff', accent: '#4ca8d2' },
  { sky: '#de979c', fog: '#e0a7a7', seats: ['#824964','#693c58','#b2646a'], ground: '#525371', light: '#ffe1cc', accent: '#f6a16d' },
  { sky: '#88bad8', fog: '#b3cbe6', seats: ['#355674','#466d8d','#507f9d'], ground: '#91b7d0', light: '#eef5ff', accent: '#70bed1' },
];

const wave = i => {
  const n = Math.sin(i * 57.62 + 85.5) * 24634.67;
  return n - Math.floor(n);
};
const point = (x, y, z) => new T.Vector3(x, y, z);
function boundary(inset = 0) {
  const points = [];
  const radius = RINK.corner - inset;
  const cx = dimensions.x - RINK.corner, cz = dimensions.z - RINK.corner;
  for (let corner = 0; corner < 4; corner++) {
    const start = corner * Math.PI / 2;
    const x = corner === 0 || corner === 3 ? cx : -cx;
    const z = corner < 2 ? cz : -cz;
    for (let i = 0; i <= 7; i++) {
      const angle = start + i / 7 * Math.PI / 2;
      points.push([x + Math.cos(angle) * radius, z + Math.sin(angle) * radius]);
    }
  }
  return points;
}

function iceMap(arena) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 1316;
  const ctx = canvas.getContext('2d');
  const sx = canvas.width / RINK.width, sz = canvas.height / RINK.length;
  const px = x => canvas.width / 2 + x * sx, pz = z => canvas.height / 2 + z * sz;
  const gradient = ctx.createLinearGradient(0, 0, 768, 1316);
  gradient.addColorStop(0, '#e1f2fb'); gradient.addColorStop(.45, '#f5faff'); gradient.addColorStop(1, '#d2e5f0');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 768, 1316);
  for (let i = 0; i < 1650; i++) {
    const x = wave(i) * 768, z = wave(i + .12) * 1316;
    ctx.strokeStyle = i % 3 ? '#779fb721' : '#ffffff90'; ctx.lineWidth = i % 4 ? .65 : 1.3;
    ctx.beginPath(); ctx.moveTo(x, z);
    ctx.quadraticCurveTo(x + 7, z + 5, x + 11 + wave(i + 76) * 22, z + (i % 2 ? -5 : 8));
    ctx.stroke();
  }
  function line(z, color, width) {
    ctx.fillStyle = color; ctx.fillRect(0, pz(z) - width / 2, canvas.width, width);
  }
  function circle(x,z,r,color,width,fill = null) {
    ctx.beginPath(); ctx.arc(px(x), pz(z), r * sx, 0, 2 * Math.PI);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (width) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
  }
  for (const end of [-1, 1]) {
    line(end * 6.3, '#3b72bf', 10);
    line(end * RINK.goalLine, '#c85b69', 3);
    ctx.beginPath();
    ctx.arc(px(0), pz(end * RINK.goalLine), 1.82 * sx, end > 0 ? Math.PI : 0, end > 0 ? 2 * Math.PI : Math.PI);
    ctx.fillStyle = '#9cd1e9b8'; ctx.fill();
    ctx.strokeStyle = '#ba6c7c'; ctx.lineWidth = 3.7; ctx.stroke();
    for (const x of [-5.25, 5.25]) {
      circle(x, end * 10.5, 2.3, '#b95b6c', 3.8);
      circle(x, end * 10.5, .14, null, 0, '#bd5362');
      circle(x, end * 4.1, .12, null, 0, '#bd5362');
    }
  }
  ctx.globalAlpha = .47;
  circle(0, 0, 1.32, null, 0, ['#1e799d','#b35c81','#345e88'][arena]);
  ctx.font = '900 53px system-ui';
  ctx.fillStyle = '#f6fdff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✦', px(0), pz(0) + 1);
  ctx.globalAlpha = 1;
  line(0, '#c8545f88', 4);
  circle(0, 0, 2.9, '#417bb5', 5);
  circle(0, 0, .085, null, 0, '#3274ab');
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function lettering(value, color, size = 70) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = `850 ${size}px system-ui`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  ctx.fillText(value, 256, 64, 486);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

export function buildRink(arena, teams, state) {
  const look = looks[arena], scene = new T.Scene();
  scene.background = new T.Color(look.sky);
  scene.fog = new T.Fog(look.fog, 40, 103);
  const mats = new Map(), geos = new Map();
  function material(color, gloss = false) {
    const key = color + gloss;
    if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial({
      color, roughness: gloss ? .48 : .83, metalness: gloss ? .21 : .02,
    }));
    return mats.get(key);
  }
  function add(parent, shape, color, x, y, z, w, h, d, cast = false, shiny = false) {
    if (!geos.has(shape)) {
      const factories = {
        box: () => new T.BoxGeometry(),
        ball: () => new T.SphereGeometry(1, 14, 10),
        pipe: () => new T.CylinderGeometry(1, 1, 1, 16),
        cone: () => new T.ConeGeometry(1, 1, 6),
      };
      geos.set(shape, factories[shape]());
    }
    const mesh = new T.Mesh(geos.get(shape), material(color, shiny));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = cast; mesh.receiveShadow = cast; parent.add(mesh);
    return mesh;
  }
  const box = (parent, x,y,z,w,h,d,color,cast) => add(parent,'box',color,x,y,z,w,h,d,cast);
  const oval = (parent, x,y,z,w,h,d,color,cast) => add(parent,'ball',color,x,y,z,w,h,d,cast);
  const pipe = (parent, x,y,z,r,h,color,cast) => add(parent,'pipe',color,x,y,z,r,h,r,cast);
  function rod(parent, from, to, radius, color, cast = false) {
    const size = new T.Vector3().subVectors(to, from), center = from.clone().lerp(to, .5);
    const mesh = pipe(parent, center.x, center.y, center.z, radius, size.length(), color, cast);
    mesh.quaternion.setFromUnitVectors(point(0,1,0), size.normalize());
    return mesh;
  }
  function sign(value, color, width, height, x, y, z, parent = scene) {
    const mesh = new T.Mesh(new T.PlaneGeometry(width,height), new T.MeshBasicMaterial({
      map: lettering(value, color), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    mesh.position.set(x,y,z); parent.add(mesh); return mesh;
  }

  const hemi = new T.HemisphereLight(look.light, '#8699af', 2.45);
  const key = new T.DirectionalLight(look.light, 2.2);
  key.position.set(-12, 26, 10);
  key.castShadow = true;
  Object.assign(key.shadow.camera,{left:-23,right:23,top:23,bottom:-23,far:68});
  key.shadow.mapSize.set(1024,1024);
  key.shadow.normalBias = .026;
  scene.add(hemi,key);
  const fill = new T.DirectionalLight('#c8e8ff', .65);
  fill.position.set(9,9,-15); scene.add(fill);
  box(scene,0,-.36,0,125,.34,103,look.ground);

  if (arena === 0) {
    box(scene,0,5,-26.4,53,10,.43,'#364e68');
    box(scene,0,5,-26,34,1.45,.60,'#263b55');
    sign('FROSTLINE ARENA','#bfeafc',16,1.65,0,5,-25.61);
    for (const x of [-20.3,20.3]) box(scene,x,6,0,.43,12,52,'#344860');
    for (const x of [-16,-8,0,8,16]) {
      box(scene,x,8.62,-25.9,5.9,.21,.58,'#243950');
      box(scene,x,8.46,-25.76,5.5,.10,.42,'#eef9ff');
    }
  } else if (arena === 1) {
    for (let i=0;i<23;i++) {
      const x=(i-11)*3.1, y=2+wave(i)*12, z=-31-wave(i+33)*15;
      box(scene,x,y/2-1,z,2.36,y,3.25,i%2?'#645e83':'#6f6184');
      for(let j=1;j<5;j++){
        if(j>y/2)continue;
        for(const dx of [-.55,.55])box(scene,x+dx,j*1.61-1,z+1.641,.34,.41,.04,'#ffc6a2');
      }
    }
    oval(scene,-21,11,-48,4.8,4.8,.82,'#ffd197');
  } else {
    for (let i=0;i<14;i++) {
      const x=(i-6)*7.4, z=-37-wave(i)*24, height=8+wave(i+22)*14;
      const mountain=add(scene,'cone',i%2?'#799eb8':'#6689ae',x,height*.37,z,7+wave(i+17)*7,height,8);
      mountain.rotation.y=wave(i+.2);
      add(scene,'cone','#ecf8ff',x,height*.65,z,3.2,height*.44,3.5).rotation.y=mountain.rotation.y;
    }
    for (let i=0;i<32;i++) {
      const x=(i-16)*2.45,z=-28-wave(i+4)*8,h=1.7+wave(i+301)*2.6;
      pipe(scene,x,.32,z,.11,.7,'#5d6672');
      for(const layer of [0,1,2])add(scene,'cone',layer===2?'#518a8a':'#416d80',x,.65+h*(.35+layer*.21),z,.91-layer*.18,h*.64,.88-layer*.18);
    }
  }

  function stands() {
    const crowd = [];
    for (const side of [-1,1]) {
      for (let row=0;row<5;row++) {
        const x=side*(12.6+row*.97), y=.5+row*.52;
        box(scene,x,y-.28,-.6,.94,.59,36,look.seats[row%3]);
        for (let i=0;i<31;i++) {
          if (i===9||i===20||wave(i+row*44+side)>.85) continue;
          crowd.push([x, y, (i-15)*1.08-.6, wave(i+row*67+side*111)]);
        }
      }
    }
    for (let row=0;row<4;row++) {
      const z=-20.35-row*.98,y=.66+row*.54;
      box(scene,0,y-.29,z,23.6,.61,.92,look.seats[row%3]);
      for(let i=0;i<24;i++) if(i!==8&&i!==16&&wave(i+row*56)<.85) crowd.push([(i-11.5)*.92,y,z,wave(i+row*42+.2)]);
    }
    const colors=['#e8e4db','#395f89','#76518a','#b56561','#5aa7bb','#dc9e53','#343a59','#e8a578'];
    const body=new T.InstancedMesh(new T.CapsuleGeometry(.18,.30,3,6),material('#ffffff'),crowd.length);
    const heads=new T.InstancedMesh(new T.SphereGeometry(.13,8,6),material('#ffffff'),crowd.length);
    const transform=new T.Matrix4();
    const palette=['#f1c09b','#b17a55','#7b5242','#dca781'];
    for(const [i,[x,y,z,n]] of crowd.entries()) {
      transform.makeTranslation(x,y+.27,z);
      body.setMatrixAt(i,transform); body.setColorAt(i,new T.Color(colors[Math.floor(n*colors.length)]));
      transform.makeTranslation(x,y+.63,z);
      heads.setMatrixAt(i,transform); heads.setColorAt(i,new T.Color(palette[i%4]));
    }
    scene.add(body,heads);
  }
  stands();

  const rim=boundary();
  const iceGeometry=new T.ShapeGeometry(new T.Shape(rim.map(([x,z])=>new T.Vector2(x,-z))));
  const positions=iceGeometry.getAttribute('position'),uv=iceGeometry.getAttribute('uv');
  for(let i=0;i<positions.count;i++)uv.setXY(i,positions.getX(i)/RINK.width+.5,positions.getY(i)/RINK.length+.5);
  iceGeometry.rotateX(-Math.PI/2);
  const ice=new T.Mesh(iceGeometry,new T.MeshStandardMaterial({map:iceMap(arena),roughness:.58,metalness:.04}));
  ice.receiveShadow=true; scene.add(ice);

  const glassMaterial=new T.MeshStandardMaterial({color:'#9adcfa',transparent:true,opacity:.12,depthWrite:false,roughness:.2});
  const glassGeometry=new T.BoxGeometry();
  for (const [i,a] of rim.entries()) {
    const b=rim[(i+1)%rim.length];
    const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
    const d=Math.hypot(a[0]-b[0],a[1]-b[1]);
    const count=Math.max(1,Math.ceil(d/2.35));
    const rot=-Math.atan2(b[1]-a[1],b[0]-a[0]);
    const near=z>11||x>8;
    // Low boards on the camera side keep the puck visible during a rush.
    box(scene,x,.25,z,d+.05,.50,.24,'#eef6f4',true).rotation.y=rot;
    box(scene,x,.052,z,d+.05,.104,.251,'#efbc49').rotation.y=rot;
    box(scene,x,.502,z,d+.05,.069,.25,look.accent).rotation.y=rot;
    if(near)continue;
    const glass=new T.Mesh(glassGeometry,glassMaterial);
    glass.position.set(x,1.06,z);glass.scale.set(d,1.03,.08);glass.rotation.y=rot;scene.add(glass);
    for(let j=0;j<count;j++) {
      const at=j/count;
      pipe(scene,a[0]+(b[0]-a[0])*at,1.05,a[1]+(b[1]-a[1])*at,.027,1.09,'#b7d0da');
    }
  }
  for(const z of [-12,0,12]) {
    const decal=sign(z===0?ARENAS[arena].name.toUpperCase():'ARCHERBOX ICE','#416b86',4.5,.37,-10.361,.29,z);
    decal.rotation.y=Math.PI/2;
  }

  function net(end) {
    const front=end*RINK.goalLine, back=front+end*1.25, half=RINK.goalHalf, height=1.38;
    const red='#d64048', cord='#d9e8ed';
    for(const x of [-half,half]){
      rod(scene,point(x,.03,front),point(x,height,front),.072,red,true);
      rod(scene,point(x,height,front),point(x*.84,.96,back),.058,red,true);
      rod(scene,point(x,.03,front),point(x*.84,.05,back),.046,red);
      rod(scene,point(x*.84,.05,back),point(x*.84,.96,back),.036,red);
      for(let i=1;i<6;i++){
        const y=i*.19;
        rod(scene,point(x,y,front),point(x*.84,y*.69,back),.009,cord);
      }
    }
    rod(scene,point(-half,height,front),point(half,height,front),.072,red,true);
    rod(scene,point(-half*.84,.96,back),point(half*.84,.96,back),.041,red);
    rod(scene,point(-half*.84,.05,back),point(half*.84,.05,back),.046,red);
    for(let i=0;i<=12;i++){
      const x=half*(i/6-1);
      rod(scene,point(x,height,front),point(x*.84,.96,back),.008,cord);
      rod(scene,point(x*.84,.96,back),point(x*.84,.045,back),.008,cord);
    }
    for(let i=1;i<6;i++)rod(scene,point(-half*.84,.16*i,back),point(half*.84,.16*i,back),.008,cord);
  }
  net(-1); net(1);

  function player(team, number, keeper) {
    const root=new T.Group(); scene.add(root);
    const jersey=team.main,trim=team.trim,black='#263045',iceColor='#e1ecf2';
    const chest=new T.Group(); chest.position.y=.97;root.add(chest);
    oval(chest,0,.36,0,.405,.452,.256,jersey,true);
    oval(chest,0,.08,0,.321,.19,.23,black,true);
    oval(chest,0,.219,0,.393,.079,.264,trim);
    oval(chest,0,.647,.015,.186,.084,.145,trim);
    oval(chest,0,.893,.024,.227,.235,.218,jersey,true);
    oval(chest,0,.795,.168,.161,.129,.138,keeper?iceColor:'#e5a77f');
    if(keeper) {
      for(const x of [-.096,-.032,.032,.096]) rod(chest,point(x,.716,.246),point(x,.888,.251),.007,'#3a4a58');
      for(const y of [.744,.80,.856]) rod(chest,point(-.115,y,.247),point(.115,y,.247),.007,'#3a4a58');
    } else box(chest,0,.824,.236,.287,.055,.048,'#c5e7f3');
    sign(String(number),'#ffffff',.69,.22,0,.374,.257,chest);
    const rear=sign(String(number),'#faf7ef',1.02,.32,0,.374,-.26,chest);
    rear.rotation.y=Math.PI;
    const legs=[-1,1].map(side=>{
      const leg=new T.Group();leg.position.set(side*.198,.94,0);root.add(leg);
      oval(leg,0,-.19,0,.17,.249,.177,black,true);
      oval(leg,0,-.48,.028,.117,.252,.129,jersey,true);
      box(leg,0,-.49,.028,.217,.108,.24,trim);
      if(keeper)box(leg,0,-.458,.139,.302,.555,.155,iceColor,true);
      box(leg,0,-.765,.075,.213,.203,.362,'#223141',true);
      box(leg,0,-.883,.067,.044,.027,.376,'#bfcfda');
      return leg;
    });
    for(const side of [-1,1]){
      oval(chest,side*.38,.49,.02,.196,.171,.187,jersey,true);
      rod(chest,point(side*.41,.47,.034),point(side*.48,.16,.14),.121,jersey,true);
      rod(chest,point(side*.48,.16,.14),point(side*.39,.029,.30),.092,trim,true);
      oval(chest,side*.397,.034,.308,.136,.108,.141,keeper?iceColor:black,true);
    }
    rod(chest,point(-.37,.24,.31),point(.43,-.846,.82),.032,keeper?'#d9e8f2':'#2a3444',true);
    box(chest,.52,-.85,.847,.27,.069,.114,'#242c34').rotation.y=-.26;
    return {root,chest,legs};
  }
  const skaters=state.skaters.map(p=>player(TEAMS[teams[p.side]],[9,18,27][p.index],false));
  const goalies=state.goalies.map(p=>player(TEAMS[teams[p.side]],31,true));
  const puck=pipe(scene,0,.071,0,.155,.105,'#15202b',true);
  const circleGeometry=new T.TorusGeometry(.62,.032,7,40).rotateX(-Math.PI/2);
  const ring=new T.Mesh(circleGeometry,new T.MeshBasicMaterial({color:'#43d3f3'}));scene.add(ring);
  const puckMark=new T.Mesh(circleGeometry,new T.MeshBasicMaterial({color:'#fabb4b',transparent:true,opacity:.77}));
  puckMark.scale.setScalar(.46); scene.add(puckMark);
  const marks=Array.from({length:10},()=>pipe(scene,0,.05,0,.045,.016,'#117dc1'));

  function update(game, aim, charging) {
    for(const [i,data] of game.skaters.entries()){
      const model=skaters[i], speed=Math.hypot(data.vx,data.vz);
      model.root.position.set(data.x,0,data.z);
      model.root.rotation.y=Math.atan2(data.fx,data.fz);
      const phase=game.time*(5+speed*.65)+i*1.29;
      const stride=Math.min(.32,speed*.046);
      model.chest.rotation.x=.025+Math.min(.18,speed*.019);
      model.chest.rotation.z=Math.sin(phase)*stride*.21;
      model.legs[0].rotation.x=Math.sin(phase)*stride;
      model.legs[1].rotation.x=-Math.sin(phase)*stride;
      model.legs[0].rotation.z=-.058;
      model.legs[1].rotation.z=.058;
    }
    for(const [i,data] of game.goalies.entries()){
      goalies[i].root.position.set(data.x,-.045,data.z);
      goalies[i].root.rotation.y=i===0?Math.PI:0;
      goalies[i].legs[0].rotation.z=-.16;
      goalies[i].legs[1].rotation.z=.16;
      goalies[i].chest.rotation.x=.16;
    }
    puck.position.set(game.puck.x,.075,game.puck.z);
    puckMark.position.set(game.puck.x,.022,game.puck.z);
    const human=game.skaters[game.controlled];
    ring.position.set(human.x,.018,human.z);
    for(const [i,mark] of marks.entries()){
      const length=Math.hypot(aim.x-human.x,aim.z-human.z)||1;
      const reach=Math.min(length,4.4)*((i+1)/marks.length);
      mark.position.set(human.x+(aim.x-human.x)*reach/length,.028,human.z+(aim.z-human.z)*reach/length);
      mark.visible=game.phase==='play'&&game.puck.owner===human.id&&(charging||i%2===0);
    }
  }

  function dispose() {
    const seen=new Set();
    scene.traverse(item=>{
      for(const asset of [item.geometry,item.material?.map,item.material,item.shadow,item.isInstancedMesh?item:null]){
        if(asset?.dispose&&!seen.has(asset)){seen.add(asset);asset.dispose();}
      }
    });
  }
  return {scene,update,dispose};
}
