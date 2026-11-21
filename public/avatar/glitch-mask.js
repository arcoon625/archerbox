import * as THREE from '../vendor/three.module.js';
import {roundedBox,surface} from './surfaces.js?v=scan2';

const eyes=[
 '..##.....##..',
 '..##.....##..',
 '..##.....##..',
 '.............',
 '.....###.....',
 '....#...#....',
];
const grin=[
 '...#.....#...',
 '..#.#...#.#..',
 '.............',
 '..#########..',
 '..#.#.#.#.#..',
 '...#######...',
];
const error=[
 '#.#.###.#.#',
 '#.#.#.#.#.#',
 '###.#.#.###',
 '..#.#.#...#',
 '..#.###...#',
];

function panel(root,size,position,material){
 const mesh=new THREE.Mesh(roundedBox(...size),material);
 mesh.position.set(...position);
 mesh.castShadow=true;
 root.add(mesh);
 return mesh;
}

export function makeGlitchMask(item){
 const root=new THREE.Group();
 root.name=item.name;
 const casing=surface(item.color,'polymer',{roughness:.39,metalness:.27});
 const glass=new THREE.MeshPhysicalMaterial({color:'#091520',roughness:.23,metalness:.3,clearcoat:.7});
 const pad=surface('#24212d','rubber');
 panel(root,[.51,.385,.088],[0,1.907,.244],casing);
 panel(root,[.451,.316,.052],[0,1.913,.289],glass);
 const signal=new THREE.MeshBasicMaterial({color:item.accent,toneMapped:false});
 for(const side of [-1,1]){
  const band=panel(root,[.039,.073,.352],[side*.239,1.927,.016],pad);
  band.rotation.y=side*.09;
  const hinge=panel(root,[.069,.138,.117],[side*.241,1.92,.211],casing);
  hinge.rotation.y=side*.22;
  panel(root,[.013,.049,.01],[side*.237,1.938,.278],signal);
 }
 panel(root,[.368,.076,.032],[0,1.928,-.183],pad);

 const pixel=new THREE.PlaneGeometry(.020,.020);
 const point=new THREE.Matrix4();
 const displays=[[eyes,item.accent],[grin,'#b9a0ff'],[error,'#ff8ca8']].map(([rows,color],mode)=>{
  const led=new THREE.MeshBasicMaterial({color,toneMapped:false});
  const face=new THREE.InstancedMesh(pixel,led,rows.join('').split('#').length-1);
  face.name='Glitch display '+['eyes','grin','404'][mode];
  let slot=0;
  for(const [y,row] of rows.entries())for(const [x,cell] of [...row].entries()){
   if(cell!== '#')continue;
   point.makeTranslation((x-(row.length-1)/2)*.026,1.923+((rows.length-1)/2-y)*.028,.317);
   face.setMatrixAt(slot++,point);
  }
  face.visible=mode===0;
  root.add(face);
  return face;
 });
 let active=0;
 root.userData={item:item.id,animate(time){
  const next=Math.floor(time/2.4)%displays.length;
  if(next===active)return;
  displays[active].visible=false;
  active=next;
  displays[active].visible=true;
 }};
 return root;
}
