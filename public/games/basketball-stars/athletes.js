import * as THREE from '../../vendor/three.module.js';

const sphere = new THREE.SphereGeometry(1,16,12);
const cylinder = new THREE.CylinderGeometry(1,1,1,12);
const skins = ['#be7955','#8d5139','#e1aa7d'];

function material(color) {
  return new THREE.MeshStandardMaterial({color,roughness:.8});
}

function part(parent,geometry,finish,scale,position) {
  const mesh=new THREE.Mesh(geometry,finish);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function joint(parent,x,y,z) {
  const group=new THREE.Group();
  group.position.set(x,y,z);
  parent.add(group);
  return group;
}

function textTexture(text,foreground,background=null) {
  const image=document.createElement('canvas');
  image.width=256;
  image.height=80;
  const ctx=image.getContext('2d');
  if(background) {
    ctx.fillStyle=background;
    ctx.beginPath();
    ctx.roundRect(9,6,238,68,24);
    ctx.fill();
  }
  ctx.fillStyle=foreground;
  ctx.font='900 50px system-ui';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(text,128,42);
  const texture=new THREE.CanvasTexture(image);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

export function buildAthlete(player,scene) {
  const root=joint(scene,0,0,0);
  const body=joint(root,0,0,0);
  root.scale.setScalar(1.06);
  const jersey=material(player.team===0?'#19a899':'#e67433');
  const shorts=material(player.team===0?'#185550':'#823c26');
  const skin=material(skins[(player.index+player.team)%3]);
  const hair=material('#2b2224');
  const shoes=material('#eae8dc');
  part(body,sphere,jersey,[.265,.39,.161],[0,1.27,0]);
  part(body,sphere,shorts,[.229,.20,.149],[0,.98,0]);
  part(body,cylinder,skin,[.085,.19,.083],[0,1.6,0]);
  part(body,sphere,skin,[.147,.195,.148],[0,1.77,0]);
  part(body,sphere,hair,[.149,.10,.151],[0,1.88,.012]);
  for(const x of [-.057,.057]) part(body,sphere,hair,[.014,.014,.008],[x,1.79,-.141]);

  const number=textTexture(String(player.index+1+player.team*4),'#fff4dc');
  for(const side of [-1,1]) {
    const digit=new THREE.Mesh(new THREE.PlaneGeometry(.65,.22),new THREE.MeshBasicMaterial({map:number,transparent:true,depthWrite:false}));
    digit.position.set(0,1.32,side*.162);
    digit.rotation.y=side<0?Math.PI:0;
    body.add(digit);
  }

  const arms=[];
  const legs=[];
  for(const side of [-1,1]) {
    const shoulder=joint(body,side*.25,1.47,0);
    part(shoulder,sphere,jersey,[.115,.12,.104],[0,-.025,0]);
    part(shoulder,sphere,skin,[.074,.162,.071],[0,-.15,0]);
    const elbow=joint(shoulder,0,-.27,0);
    part(elbow,sphere,skin,[.062,.144,.062],[0,-.11,0]);
    const hand=part(elbow,sphere,skin,[.069,.076,.053],[0,-.235,0]);
    arms.push({shoulder,elbow,hand,side});

    const hip=joint(body,side*.127,.96,0);
    part(hip,sphere,shorts,[.12,.27,.123],[0,-.15,0]);
    part(hip,sphere,skin,[.085,.183,.085],[0,-.29,0]);
    const knee=joint(hip,0,-.47,0);
    part(knee,sphere,skin,[.074,.184,.077],[0,-.145,0]);
    part(knee,cylinder,shoes,[.077,.18,.078],[0,-.33,0]);
    part(knee,sphere,shoes,[.106,.09,.166],[0,-.40,-.06]);
    legs.push({hip,knee,side});
  }
  const label=new THREE.Sprite(new THREE.SpriteMaterial({
    map:textTexture(player.name,'#fff7e8',player.team===0?'#124c49':'#783a21'),transparent:true,depthWrite:false
  }));
  label.position.y=2.28;
  label.scale.set(1.37,.43,1);
  body.add(label);
  return {root,body,arms,legs,lastX:null,lastZ:null,heading:0,lastTime:null};
}

export function poseAthlete(rig,x,z,lookX,lookZ,time,{hasBall,charging,shotLift}) {
  const {root,body,arms,legs}=rig;
  const dt=rig.lastTime===null?0:time-rig.lastTime;
  const moved=rig.lastX===null?0:Math.hypot(x-rig.lastX,z-rig.lastZ);
  const stride=dt>0&&moved<.6?Math.min(1,moved/(dt*4)):0;
  if(dt>0 || rig.lastTime===null) {
    rig.lastX=x;
    rig.lastZ=z;
    rig.lastTime=time;
  }
  if(Math.hypot(lookX-x,lookZ-z)>.14) rig.heading=Math.atan2(x-lookX,z-lookZ);
  root.position.set(x,0,z);
  body.rotation.y=rig.heading;
  body.position.y=shotLift*.27+Math.sin(time*23)**2*.046*stride;
  for(const {hip,knee,side} of legs) {
    const step=Math.sin(time*14)*side*stride;
    hip.rotation.x=step*.51-shotLift*.13;
    knee.rotation.x=-Math.max(0,-step)*.59-shotLift*.16;
  }
  for(const {shoulder,elbow,side} of arms) {
    const swing=-Math.sin(time*14)*side*stride;
    const dribble=hasBall&&side===1;
    const raised=charging?1:shotLift;
    shoulder.rotation.z=side*(.16+raised*.15);
    shoulder.rotation.x=raised>0 ? 1.7*raised : dribble ? .32 : swing*.34;
    elbow.rotation.x=raised>0 ? 1.34*raised : dribble ? .19+Math.sin(time*12)*.29 : .16;
  }
}
