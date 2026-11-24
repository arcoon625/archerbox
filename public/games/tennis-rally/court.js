import * as T from '../../vendor/three.module.js';
import {COURT, SURFACES} from './rules.js';

const palettes=[
  {sky:'#89c5df',fog:'#afcfdf',ground:'#628c72',fence:'#486861',accent:'#1b627a',sun:'#fff1d1'},
  {sky:'#edb095',fog:'#eec6ab',ground:'#9c825d',fence:'#6e5142',accent:'#9c4d3d',sun:'#ffdbc2'},
  {sky:'#93bbc9',fog:'#b3cbbd',ground:'#537b47',fence:'#4b6546',accent:'#2e604e',sun:'#eff1d6'},
];
const seed=i=>{const n=Math.sin(i*51.78+17.6)*49741.117;return n-Math.floor(n);};
const vec=(x,y,z)=>new T.Vector3(x,y,z);
const hillCenters=[-31,-16,6,25,44];

function texture(surface){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=768;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=SURFACES[surface].color;ctx.fillRect(0,0,384,768);
  if(surface===2){
    for(let y=0;y<768;y+=64){
      ctx.fillStyle=y%128?'#ffffff13':'#203b222b';ctx.fillRect(0,y,384,64);
    }
  }
  for(let i=0;i<9200;i++){
    ctx.fillStyle=i%4?'#2020230e':'#ffffff26';
    ctx.fillRect(seed(i)*384,seed(i+.31)*768,surface===1?2.2:.85,1.5+seed(i+.64)*3);
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  return map;
}

function letters(label){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.font='850 55px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fcf5e1';
  ctx.fillText(label,384,64,727);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  return map;
}

export function makeCourt(surface){
  const look=palettes[surface],court=SURFACES[surface],scene=new T.Scene();
  scene.background=new T.Color(look.sky);scene.fog=new T.Fog(look.fog,35,100);
  const materials=new Map();
  const geometries={
    box:new T.BoxGeometry(),ball:new T.SphereGeometry(1,17,11),
    tube:new T.CylinderGeometry(1,1,1,18),cone:new T.ConeGeometry(1,1,7),
  };
  function material(color){
    if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.76}));
    return materials.get(color);
  }
  function shape(parent,key,color,x,y,z,w,h,d,shade=false){
    const mesh=new T.Mesh(geometries[key],material(color));
    mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
    mesh.castShadow=shade;mesh.receiveShadow=shade;
    parent.add(mesh);
    return mesh;
  }
  const box=(parent,color,x,y,z,w,h,d,s)=>shape(parent,'box',color,x,y,z,w,h,d,s);
  const sphere=(parent,color,x,y,z,w,h,d,s)=>shape(parent,'ball',color,x,y,z,w,h,d,s);
  const cylinder=(parent,color,x,y,z,r,h,s)=>shape(parent,'tube',color,x,y,z,r,h,r,s);
  function rod(parent,color,from,to,radius,shadow=false){
    const v=new T.Vector3().subVectors(to,from),c=from.clone().lerp(to,.5);
    const mesh=cylinder(parent,color,c.x,c.y,c.z,radius,v.length(),shadow);
    mesh.quaternion.setFromUnitVectors(vec(0,1,0),v.normalize());
    return mesh;
  }
  function sign(label,x,y,z,width){
    const mesh=new T.Mesh(new T.PlaneGeometry(width,width/6),new T.MeshBasicMaterial({
      map:letters(label),transparent:true,depthWrite:false,
    }));
    mesh.position.set(x,y,z);scene.add(mesh);
  }
  function lines(points,color,opacity=1){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
    const mesh=new T.LineSegments(geometry,new T.LineBasicMaterial({color,transparent:opacity<1,opacity}));
    scene.add(mesh);
  }

  const dome=new T.HemisphereLight('#e4f1ff','#8d9470',2.16);
  const sun=new T.DirectionalLight(look.sun,2.35);
  sun.position.set(-12,23,10);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-17,right:17,top:19,bottom:-19,far:63});
  sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.022;
  scene.add(dome,sun);

  box(scene,look.ground,0,-.36,0,133,.28,104);
  box(scene,'#667468',0,-.19,0,16.4,.27,34.3);
  box(scene,court.outside,0,-.052,0,16,.105,33.85).receiveShadow=true;
  const green=new T.Mesh(new T.PlaneGeometry(COURT.doubles*2,COURT.baseline*2),
    new T.MeshStandardMaterial({map:texture(surface),roughness:.9}));
  green.position.y=.011;green.rotation.x=-Math.PI/2;green.receiveShadow=true;scene.add(green);
  const white='#f5f4e6';
  for(const x of [-COURT.doubles,-COURT.singles,COURT.singles,COURT.doubles]){
    box(scene,white,x,.021,0,.052,.012,COURT.baseline*2+.05);
  }
  for(const end of [-1,1]){
    box(scene,white,0,.021,end*COURT.baseline,COURT.doubles*2,.012,.064);
    box(scene,white,0,.021,end*COURT.service,COURT.singles*2,.012,.052);
    box(scene,white,0,.021,end*(COURT.baseline-.135),.052,.012,.29);
  }
  box(scene,white,0,.022,0,.052,.012,COURT.service*2);

  const half=5.8,netHeight=x=>COURT.net+.14*(x/half)**2;
  const net=[];
  for(let i=0;i<=112;i++){
    const x=(i/112*2-1)*half;
    net.push(x,.035,0,x,netHeight(x),0);
  }
  for(let j=1;j<12;j++)for(let i=0;i<26;i++){
    const a=(i/26*2-1)*half,b=((i+1)/26*2-1)*half;
    net.push(a,.035+(netHeight(a)-.035)*j/12,0,b,.035+(netHeight(b)-.035)*j/12,0);
  }
  lines(net,'#21363c',.8);
  for(let i=0;i<16;i++){
    const a=(i/16*2-1)*half,b=((i+1)/16*2-1)*half;
    rod(scene,'#fffae6',vec(a,netHeight(a),0),vec(b,netHeight(b),0),.031);
  }
  for(const x of [-half,half]){
    cylinder(scene,'#325568',x,.57,0,.071,1.14,true);
    cylinder(scene,'#d8ded4',x,1.13,0,.084,.07);
    cylinder(scene,'#71827d',x,.033,0,.138,.062);
  }
  rod(scene,white,vec(0,.014,0),vec(0,COURT.net,0),.014);

  const fence=[]
  for(const x of [-8,8]){
    for(let j=0;j<=16;j++){
      const z=-16.8+j*1.04;
      fence.push(x,.16,z,x,2.27,z);
    }
    for(let y=.24;y<2.26;y+=.22)fence.push(x,y,-16.85,x,y,0);
    for(const z of [-16.85,-11.5,-6,0]){
      cylinder(scene,look.fence,x,1.15,z,.052,2.3);
    }
    rod(scene,look.fence,vec(x,2.29,-16.85),vec(x,2.29,0),.024);
  }
  for(let i=0;i<=51;i++){
    const x=-8+i*16/51;
    fence.push(x,.15,-16.85,x,2.28,-16.85);
  }
  for(let y=.21;y<2.3;y+=.22)fence.push(-8,y,-16.85,8,y,-16.85);
  for(const x of [-8,-4,0,4,8])cylinder(scene,look.fence,x,1.16,-16.87,.056,2.32);
  rod(scene,look.fence,vec(-8,2.29,-16.85),vec(8,2.29,-16.85),.025);
  lines(fence,look.fence,.40);
  box(scene,look.accent,0,1.34,-16.79,9.4,1.16,.10);
  sign(court.name.toUpperCase(),0,1.34,-16.73,8.45);

  for(const x of [-7.27,7.27]){
    box(scene,'#b7bdaf',x,.45,2.8,.53,.14,2.25,true);
    box(scene,'#b7bdaf',x,.8,2.8,.13,.27,2.25,true);
    for(const z of [2,3.6])box(scene,'#445654',x,.21,z,.32,.42,.11);
    box(scene,look.accent,x,.28,5.1,.62,.52,.71,true);
  }
  const umpireX=-6.75;
  box(scene,'#d9dcd1',umpireX,1.9,-.5,.7,.13,.8,true);
  box(scene,'#dbdfd2',umpireX,2.22,-.85,.69,.54,.115,true);
  for(const x of [umpireX-.31,umpireX+.31]){
    rod(scene,'#536369',vec(x,0,.21),vec(x,1.91,-.67),.04);
    rod(scene,'#536369',vec(x,0,-1.19),vec(x,1.91,-.67),.04);
  }
  for(let i=1;i<=5;i++)box(scene,'#637278',umpireX,.32*i,.21-.88*i/6,.61,.06,.14);
  if(surface===0){
    box(scene,'#589bae',0,-.23,-43,112,.13,48);
    box(scene,'#849681',0,-.105,-20.1,41,.15,5.2);
    box(scene,'#729167',0,-.07,-52.2,117,.28,24);
    for(const x of hillCenters){
      sphere(scene,'#73976f',x,-.37,-53,15.5,2.6,10.2);
    }
    for(let i=0;i<34;i++){
      const x=(i-17)*2.5,z=-34-seed(i)*15;
      box(scene,i%3?'#75b4c4':'#d8ddc6',x,-.155,z,1.7+seed(i+.1)*8,.013,.036);
    }
    for(let row=0;row<3;row++){
      const z=-18.7-row*.89, y=.42+row*.43;
      box(scene,['#58787f','#526d83','#648085'][row],0,y-.25,z,18.2,.53,.83);
      for(let i=0;i<19;i++){
        if(seed(i+row*.72)<.29||i===9)continue;
        const x=(i-9)*.91;
        sphere(scene,['#72a5cb','#ecce88','#d1786c','#8aa08b'][i%4],x,y+.26,z,.19,.31,.155);
        sphere(scene,['#e8ad85','#a57154','#c18562'][i%3],x,y+.59,z,.115,.126,.107);
      }
    }
  }else{
    const clay=surface===1;
    box(scene,clay?'#ecc6a6':'#d1dfcb',0,1.48,-22.2,16,3.2,3.8);
    const roof=box(scene,clay?'#a05b48':'#3e6759',0,3.28,-22.08,16.6,1.06,4.1);
    roof.rotation.x=.17;
    for(const x of [-6.4,-3.2,0,3.2,6.4]){
      box(scene,clay?'#ae7d68':'#487784',x,1.63,-20.27,1.38,1.8,.14);
      box(scene,'#e7e1c7',x,1.64,-20.16,.08,1.84,.08);
      box(scene,'#e7e1c7',x,1.4,-20.16,1.45,.085,.08);
    }
  }
  for(let i=0;i<19;i++){
    const x=(i-9)*2.69,z=(surface===0?-42:-25.8)-seed(i+25)*11,h=1.5+seed(i)*3.7;
    const base=surface===0?Math.max(.07,...hillCenters.map(center=>
      -.37+2.6*Math.sqrt(Math.max(0,1-((x-center)/15.5)**2-((z+53)/10.2)**2)))):0;
    cylinder(scene,'#6c6953',x,base+.63,z,.13,1.7);
    if(surface===1)shape(scene,'cone',i%2?'#59805a':'#4d7659',x,h*.61,z,h*.21,h,.72);
    else for(const off of [-.42,.42])sphere(scene,i%3?'#5e9869':'#73a270',x+off,base+h*.72,z,h*.37,h*.51,h*.37);
  }
  for(const x of [-9.1,9.1]){
    for(const z of [-12.2,-7.9,8.5,12.3]){
      box(scene,surface===1?'#b46e55':'#7c8f77',x,.12,z,1.02,.39,2.1,true);
      for(const offset of [-.55,0,.52])sphere(scene,z<0?'#5a855d':'#729568',x,.48,z+offset,.51,.36,.49,true);
    }
  }

  const racketGeo=new T.TorusGeometry(.178,.018,8,36);
  function avatar(shirt, trim, skin, hair){
    const root=new T.Group();scene.add(root);
    const body=new T.Group();body.position.y=.96;root.add(body);
    sphere(body,shirt,0,.31,0,.304,.391,.188,true);
    sphere(body,'#e9e0d3',0,.05,0,.272,.162,.169,true);
    sphere(body,trim,0,.595,0,.147,.052,.12);
    cylinder(body,skin,0,.667,0,.078,.13,true);
    sphere(body,skin,0,.818,.03,.149,.198,.143,true);
    sphere(body,hair,0,.896,.018,.155,.138,.145,true);
    box(body,trim,0,.874,.165,.269,.051,.155);
    const legs=[-1,1].map(side=>{
      const group=new T.Group();group.position.set(side*.135,.95,0);root.add(group);
      sphere(group,'#e5dfd4',0,-.132,0,.123,.193,.133,true);
      rod(group,skin,vec(0,-.20,.012),vec(0,-.690,-.015),.076,true);
      cylinder(group,'#f3efdc',0,-.732,-.014,.082,.155);
      sphere(group,trim,0,-.84,.074,.102,.072,.181,true);
      return group;
    });
    const arms=[-1,1].map(side=>{
      const group=new T.Group();group.position.set(side*.269,.50,.013);body.add(group);
      sphere(group,shirt,0,-.02,0,.129,.131,.118,true);
      rod(group,skin,vec(0,-.085,0),vec(side*.075,-.25,.053),.061,true);
      rod(group,skin,vec(side*.075,-.25,.053),vec(side*.099,-.41,.14),.049,true);
      sphere(group,skin,side*.099,-.416,.14,.065,.065,.066,true);
      return group;
    });
    const grip=arms[1],racket=new T.Group();
    racket.position.set(.098,-.414,.151);racket.rotation.set(-.18,.06,-.77);grip.add(racket);
    rod(racket,'#20343e',vec(0,-.073,0),vec(0,.325,0),.031,true);
    const frame=new T.Mesh(racketGeo,material(trim));
    frame.position.y=.49;frame.scale.set(1,1.27,.87);frame.castShadow=true;racket.add(frame);
    for(let i=-3;i<=3;i++){
      const n=i*.043,k=Math.sqrt(1-(n/.171)**2);
      rod(racket,'#dae0d6',vec(n,.49-.21*k,0),vec(n,.49+.21*k,0),.0038);
      rod(racket,'#dae0d6',vec(-.164*k,.49+n*1.15,0),vec(.164*k,.49+n*1.15,0),.0038);
    }
    return {root,body,legs,arms};
  }
  const players=[avatar('#216ea2','#dbfa8c','#b78561','#332b2a'),avatar('#cc5145','#faf4d8','#e2ac87','#4a2f22')];
  const ball=sphere(scene,'#ddef54',0,0,0,.105,.105,.105,true);
  const ballShadow=cylinder(scene,'#55744a',0,.023,0,.126,.009);
  const mark=new T.Mesh(new T.TorusGeometry(.265,.024,7,32).rotateX(-Math.PI/2),
    new T.MeshBasicMaterial({color:'#fce77f',opacity:.72,transparent:true}));
  scene.add(mark);
  const trail=Array.from({length:4},(_,i)=>sphere(scene,'#e7ee8f',0,0,0,.056-i*.01,.056-i*.01,.056-i*.01));

  function update(game, target, marks){
    for(const [i,state] of game.players.entries()){
      const model=players[i], speed=Math.hypot(state.vx,state.vz);
      model.root.position.set(state.x,.006,state.z);
      model.root.rotation.y=i===0?Math.PI:0;
      const stride=Math.sin(game.time*11+i*1.8)*Math.min(.52,speed*.086);
      model.legs[0].rotation.x=stride;model.legs[1].rotation.x=-stride;
      model.body.rotation.z=state.vx*.016*(i?1:-1);
      model.body.rotation.x=-.045-speed*.017;
      model.arms[0].rotation.x=-.24+stride*.31;
      model.arms[1].rotation.x=state.swing>0?-1.05-state.swing*2:-.48-stride*.29;
      model.arms[1].rotation.z=state.swing>0?(state.lob?.83:.98)*Math.sin(state.swing*5):.16;
    }
    const live=game.ball;
    const ready=game.phase==='serve'?game.players[game.server]:null;
    ball.visible=Boolean(live||ready);
    if(live)ball.position.set(live.x,live.y,live.z);
    else if(ready)ball.position.set(ready.x-.26,.82,ready.z+(game.server===0?-.13:.13));
    ballShadow.visible=Boolean(live);
    if(live)ballShadow.position.set(live.x,.023,live.z);
    for(const [i,item] of trail.entries()){
      const dt=(i+1)*.022;
      item.visible=Boolean(live&&live.age>dt);
      if(live)item.position.set(live.x-live.vx*dt,Math.max(.11,live.y-live.vy*dt),live.z-live.vz*dt);
    }
    const spot=live&&!live.bounces&&live.hitter===1?{x:live.targetX,z:live.targetZ}:target;
    mark.visible=Boolean(marks&&spot&&(game.phase==='serve'||live&&!live.bounces));
    if(spot)mark.position.set(spot.x,.029,spot.z);
  }

  function dispose(){
    const done=new Set();
    scene.traverse(item=>{
      for(const asset of [item.geometry,item.material?.map,item.material,item.shadow]){
        if(asset?.dispose&&!done.has(asset)){done.add(asset);asset.dispose();}
      }
    });
  }
  return {scene,update,dispose};
}
