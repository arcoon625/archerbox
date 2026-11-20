import * as THREE from '../../vendor/three.module.js';
import {hoop,arc} from './court.js';

const units = 32;
export const courtX = x => (x-450)/units;
export const courtZ = y => (y-250)/units;
export const rimHeight = 3.05;

export function box(parent,width,height,depth,color,x,y,z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width,height,depth),
    new THREE.MeshStandardMaterial({color})
  );
  mesh.position.set(x,y,z);
  parent.add(mesh);
  return mesh;
}

function woodTexture() {
  const image = document.createElement('canvas');
  image.width=1800;
  image.height=1000;
  const ctx=image.getContext('2d');
  ctx.scale(2,2);
  const colors=['#c98e55','#d09860','#c48a53','#d3965b','#c28a52'];
  for(let y=0;y<500;y+=7) {
    const shift=(y*13)%91;
    for(let x=shift-94;x<900;x+=94) {
      const index=Math.abs(Math.floor(x/94)*23+y*7)%colors.length;
      ctx.fillStyle=colors[index];
      ctx.fillRect(x,y,94,7);
      ctx.fillStyle='#7d4c352e';
      ctx.fillRect(x,y,1,7);
      ctx.fillRect(x,y+6.5,94,.5);
      ctx.fillStyle='#ffe9b62b';
      ctx.fillRect(x+5,y+2+(index%3),76,.35);
    }
  }
  ctx.fillStyle='#1d454a';
  ctx.fillRect(0,0,900,59);
  ctx.fillRect(0,460,900,40);
  ctx.fillRect(0,59,55,401);
  ctx.fillRect(845,59,55,401);
  ctx.fillStyle='#27716c';
  ctx.fillRect(367,59,166,170);
  ctx.lineWidth=2.6;
  ctx.strokeStyle='#ffecd3';
  ctx.strokeRect(55,59,790,401);
  ctx.strokeRect(367,59,166,170);
  ctx.beginPath();
  ctx.arc(450,229,55,0,Math.PI);
  const angle=Math.asin((59-hoop.y)/arc);
  ctx.moveTo(hoop.x+arc*Math.cos(angle),59);
  ctx.arc(hoop.x,hoop.y,arc,angle,Math.PI-angle);
  ctx.moveTo(395,460);
  ctx.arc(450,460,55,Math.PI,Math.PI*2);
  ctx.stroke();
  ctx.fillStyle='#d7eee7';
  ctx.font='800 19px system-ui';
  ctx.textAlign='center';
  ctx.fillText('A R C H E R B O X',450,486);
  const texture=new THREE.CanvasTexture(image);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
}

function addHoop(scene) {
  const z=courtZ(hoop.y);
  const base='#263d49';
  box(scene,1.12,.30,.9,base,0,.15,z-2);
  box(scene,.37,1.62,.42,'#285654',0,.92,z-2);
  box(scene,.18,3.17,.22,'#64747f',0,1.95,z-2);
  box(scene,.19,.16,1.52,'#64747f',0,3.52,z-1.25);
  box(scene,1.89,1.10,.095,'#344e5b',0,3.40,z-.56);
  box(scene,1.80,1.01,.048,'#e3e9df',0,3.40,z-.49);
  box(scene,1.70,.91,.05,'#adc2c7',0,3.40,z-.46);
  const squareZ=z-.425;
  for (const x of [-.29,.29]) box(scene,.033,.44,.018,'#f5f9f2',x,3.30,squareZ);
  for (const y of [3.09,3.51]) box(scene,.58,.033,.018,'#f5f9f2',0,y,squareZ);
  box(scene,.20,.09,.21,'#fc7438',0,rimHeight,z-.32);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.245,.022,10,40),new THREE.MeshStandardMaterial({color:'#ff6930',roughness:.36}));
  rim.rotation.x=-Math.PI/2;
  rim.position.set(0,rimHeight,z);
  scene.add(rim);

  const lines=[];
  const count=12;
  for(let i=0;i<count;i++) {
    const point=(row,offset)=>{
      const a=(i+offset+row*.5)*Math.PI*2/count;
      const radius=.24-row*.032;
      return [Math.cos(a)*radius,rimHeight-row*.126,z+Math.sin(a)*radius];
    };
    for(let row=0;row<3;row++) {
      lines.push(...point(row,0),...point(row+1,0));
      lines.push(...point(row,0),...point(row+1,-1));
    }
    lines.push(...point(3,0),...point(3,1));
  }
  const net=new THREE.BufferGeometry();
  net.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  scene.add(new THREE.LineSegments(net,new THREE.LineBasicMaterial({color:'#fff5de',transparent:true,opacity:.9})));
}

function stadiumSign(scene) {
  const image=document.createElement('canvas');
  image.width=768;image.height=144;
  const ctx=image.getContext('2d');
  ctx.fillStyle='#192b36';
  ctx.fillRect(0,0,768,144);
  ctx.strokeStyle='#5ce3d3';
  ctx.lineWidth=5;
  ctx.strokeRect(3,3,762,138);
  ctx.textAlign='center';
  ctx.fillStyle='#fff3df';
  ctx.font='900 62px system-ui';
  ctx.fillText('ARCHERBOX ARENA',384,89);
  const texture=new THREE.CanvasTexture(image);
  texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(8.3,1.56),new THREE.MeshBasicMaterial({map:texture}));
  sign.position.set(0,6.05,-13.8);
  scene.add(sign);
}

function bleachers(scene) {
  const rows=4;
  const columns=34;
  const seats=new THREE.InstancedMesh(new THREE.BoxGeometry(.55,.54,.25),new THREE.MeshStandardMaterial(),rows*columns);
  const matrix=new THREE.Matrix4();
  let index=0;
  for(let row=0;row<rows;row++) {
    const z=-8.5-row*1.12;
    const y=row*.55+.34;
    box(scene,27,y,1.13,'#3b4c54',0,y*.5,z);
    for(let column=0;column<columns;column++) {
      const x=(column-(columns-1)/2)*.74;
      matrix.makeTranslation(x,y+.32,z);
      seats.setMatrixAt(index,matrix);
      seats.setColorAt(index,new THREE.Color(column%6<3?'#285c69':'#3a7480'));
      index++;
    }
  }
  scene.add(seats);
}

export function buildGym(scene) {
  scene.background=new THREE.Color('#17232d');
  scene.fog=new THREE.Fog('#17232d',32,66);
  scene.add(new THREE.HemisphereLight('#edf9ff','#967a5b',2.1));
  const key=new THREE.DirectionalLight('#fff0d7',1.9);
  key.position.set(-5,14,7);
  scene.add(key);
  const fill=new THREE.DirectionalLight('#a4e8ff',.65);
  fill.position.set(11,8,-11);
  scene.add(fill);

  box(scene,42,.35,34,'#243540',0,-.20,2);
  box(scene,42,11,.4,'#263744',0,4.7,-14.2);
  for(const side of [-1,1]) {
    box(scene,.42,11,34,'#263744',side*17,4.7,2);
    box(scene,.32,.35,33,'#36817a',side*16.77,3,1);
    for(let i=0;i<5;i++) {
      const x=side*(5.8+i*2.2);
      box(scene,.20,9.5,.4,'#41535d',x,4.75,-13.84);
      const light=box(scene,1.5,.22,.25,'#f1f4df',x,7.7,-13.55);
      light.material.emissive.set('#a7faff');
      light.material.emissiveIntensity=.9;
    }
  }
  bleachers(scene);
  stadiumSign(scene);
  const floor=new THREE.Mesh(
    new THREE.PlaneGeometry(900/units,500/units),
    new THREE.MeshStandardMaterial({map:woodTexture(),roughness:.63})
  );
  floor.rotation.x=-Math.PI/2;
  scene.add(floor);
  addHoop(scene);
}
