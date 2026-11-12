import * as T from '../../vendor/three.module.js';
const surfaceCache=new Map();
// Small repeatable surfaces keep the forest detailed without remote textures.
export function surface(kind,seed=37){
 if(typeof document==='undefined')return null;
 const key=kind+':'+seed;if(surfaceCache.has(key))return surfaceCache.get(key);
 let n=seed;const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
 x.fillStyle={fur:'#9d866e',bark:'#827260',ground:'#8b8e70',stone:'#9d9d92',wool:'#ded7c3',dirt:'#ab987c'}[kind]||'#aaa';x.fillRect(0,0,256,256);
 for(let i=0;i<6500;i++){
  const a=rnd(),px=rnd()*256,py=rnd()*256;x.strokeStyle=kind==='wool'?'rgba(69,61,46,'+(a*.18)+')':a>.45?'rgba(31,27,20,'+(a*.27)+')':'rgba(246,236,198,'+(a*.38)+')';x.lineWidth=kind==='bark'?1+rnd()*3:kind==='fur'?.45+rnd()*.8:.5+rnd()*2;
  x.beginPath();if(kind==='wool')x.arc(px,py,1+rnd()*4,0,5.4);else{x.moveTo(px,py);x.lineTo(px+(kind==='fur'?(rnd()-.5)*6:kind==='bark'?(rnd()-.5)*2:rnd()*6),py+(kind==='fur'?8+rnd()*12:kind==='bark'?10+rnd()*35:2+rnd()*4));}x.stroke();
 }
 const map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;surfaceCache.set(key,map);return map;
}
export function needleTexture(){
 if(typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.clearRect(0,0,256,256);x.strokeStyle='#75836a';x.lineWidth=3;x.beginPath();x.moveTo(128,252);x.lineTo(128,6);x.stroke();
 for(let y=12;y<246;y+=4){const width=Math.sin((y+10)/270*Math.PI)*91;for(const side of [-1,1])for(let n=0;n<3;n++){x.strokeStyle=['#6b8057','#849265','#536e48'][n];x.lineWidth=1.5;x.beginPath();x.moveTo(128+side*n*.8,y+17);x.lineTo(128+side*(width-n*7),y-11+n*3);x.stroke();}}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return map;
}
export function organicPineGeometry(){
 const positions=[],uvs=[],indices=[];
 // Open fronds leave real gaps for light instead of a solid cone silhouette.
 for(let row=0;row<6;row++)for(let branch=0;branch<9;branch++){
  const t=row/6,a=branch/9*Math.PI*2+row*1.31,r=(1-t)*(.87+.12*Math.sin(branch*3.4+row)),y=-.45+t*.92,w=.19*(1-t)+.035;
  const dx=Math.cos(a),dz=Math.sin(a),sx=-dz*w,sz=dx*w,baseR=.035,tipY=y-.08;
  const n=positions.length/3;positions.push(dx*baseR+sx,y,dz*baseR+sz,dx*baseR-sx,y,dz*baseR-sz,dx*r+sx,tipY,dz*r+sz,dx*r-sx,tipY,dz*r-sz);uvs.push(0,0,1,0,0,1,1,1);indices.push(n,n+2,n+1,n+1,n+2,n+3);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function grassGeometry(){
 const vertices=[];for(let i=0;i<7;i++){const a=i*2.4,x=Math.cos(a)*.3,z=Math.sin(a)*.3,w=.035,h=.6+(i%3)*.17;vertices.push(x-w,0,z,x+w,0,z,x+Math.cos(a)*.12,h,z+Math.sin(a)*.12);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}
function furMaterial(color,wool=false){const map=surface(wool?'wool':'fur');return new T.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:wool?.055:.025,roughness:1});}
export function makeAnimal(kind){
 const root=new T.Group(),body=new T.Group();root.add(body);const deer=kind==='deer',rabbit=kind==='rabbit',coat=furMaterial(deer?0xa77e51:rabbit?0x8b8170:0xd3c9ae,!deer&&!rabbit),dark=new T.MeshStandardMaterial({color:0x302a24,roughness:.8}),pale=furMaterial(0xd8c9ac),hoof=new T.MeshStandardMaterial({color:0x25221c});
 const shape=(parent,material,scale,x,y,z)=>{const o=new T.Mesh(new T.SphereGeometry(1,16,12),material);o.scale.set(...scale);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const rod=(parent,a,b,r,material)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),o=new T.Mesh(new T.CylinderGeometry(r*.65,r,d.length(),7),material);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());o.castShadow=true;parent.add(o);return o;};
 const head=new T.Group(),legs=[];
 if(deer){
  shape(body,coat,[.34,.46,.78],0,1.16,.12);shape(body,coat,[.29,.36,.4],0,1.13,.65);shape(body,pale,[.24,.29,.51],0,1.02,.15);
  const neck=shape(body,coat,[.22,.6,.25],0,1.6,-.49);neck.rotation.x=.32;head.position.set(0,1.96,-.72);body.add(head);shape(head,coat,[.2,.27,.32],0,0,0);shape(head,coat,[.14,.15,.31],0,-.12,-.29);shape(head,dark,[.13,.085,.07],0,-.12,-.57);
  for(const side of [-1,1]){const ear=shape(head,coat,[.12,.26,.055],side*.25,.22,.02);ear.rotation.z=side*-.65;const inner=shape(head,pale,[.075,.18,.025],side*.26,.23,-.03);inner.rotation.z=side*-.65;
   rod(head,[side*.12,.21,.04],[side*.22,.73,.06],.025,pale);rod(head,[side*.2,.61,.06],[side*.42,.91,-.08],.019,pale);rod(head,[side*.22,.7,.06],[side*.18,.99,.22],.017,pale);rod(head,[side*.17,.43,.05],[side*.34,.61,-.21],.016,pale);
  }
  const tail=shape(body,pale,[.12,.19,.19],0,1.29,.91);tail.rotation.x=.65;
 }else if(rabbit){
  shape(body,coat,[.24,.27,.43],0,.32,.08);shape(body,coat,[.28,.32,.28],0,.33,.31);head.position.set(0,.52,-.28);body.add(head);shape(head,coat,[.22,.23,.24],0,0,0);shape(head,pale,[.15,.11,.12],0,-.07,-.18);shape(head,dark,[.045,.035,.035],0,-.035,-.29);
  for(const side of [-1,1]){const ear=shape(head,coat,[.075,.34,.055],side*.12,.35,.035);ear.rotation.z=side*-.18;shape(head,new T.MeshStandardMaterial({color:0xb59285}),[.04,.26,.026],side*.12,.35,-.015);}shape(body,pale,[.13,.13,.12],0,.39,.54);
 }else{
  shape(body,coat,[.48,.46,.75],0,.9,.08);head.position.set(0,1.02,-.68);body.add(head);shape(head,dark,[.23,.29,.27],0,0,-.01);shape(head,dark,[.16,.15,.2],0,-.12,-.25);shape(head,coat,[.26,.14,.2],0,.22,.01);
  for(const side of [-1,1])shape(head,dark,[.23,.075,.09],side*.28,.05,.02);shape(body,coat,[.11,.21,.12],0,.94,.81);
  // Instanced wool locks preserve volume and avoid hundreds of draw calls.
  const curls=new T.InstancedMesh(new T.IcosahedronGeometry(.1,1),coat,130),o=new T.Object3D();for(let i=0;i<130;i++){const a=i*2.39996,h=1-2*(i+.5)/130,r=Math.sqrt(1-h*h);o.position.set(Math.cos(a)*r*.46,.9+h*.42,.08+Math.sin(a)*r*.72);o.updateMatrix();curls.setMatrixAt(i,o.matrix);}curls.castShadow=true;body.add(curls);
 }
 for(const front of [true,false])for(const side of [-1,1]){
  const joint=new T.Group(),height=deer?.95:rabbit?.23:.58; joint.position.set(side*(deer?.23:rabbit?.16:.3),height,front?(deer?-.43:rabbit?-.2:-.4):(deer?.58:rabbit?.32:.53));body.add(joint);
  rod(joint,[0,0,0],[0,-height*.55,front?.02:.1],deer?.065:rabbit?.065:.085,rabbit?coat:dark);rod(joint,[0,-height*.55,front?.02:.1],[0,-height+.07,-.02],deer?.04:.06,rabbit?coat:dark);shape(joint,rabbit?coat:hoof,[rabbit?.09:.075,.065,rabbit?.18:.11],0,-height+.06,-.06);legs.push({root:joint,phase:(front?0:Math.PI)+(side===1?Math.PI:0)});
 }
 for(const side of [-1,1]){shape(head,dark,[deer?.045:rabbit?.045:.04,.052,.035],side*(deer?.17:rabbit?.18:.19),rabbit?.05:.035,deer?-.18:rabbit?-.14:-.13);shape(head,new T.MeshBasicMaterial({color:0xded3b6}),[.009,.012,.008],side*(deer?.185:rabbit?.195:.205),rabbit?.07:.055,deer?-.205:rabbit?-.166:-.151);}
 root.userData={kind,body,head,legs};return root;
}
export function animateAnimal(root,a,height,time){
 root.position.set(a.x,height,a.z);root.rotation.y=a.yaw;const d=root.userData,moving=a.mode==='walk'||a.mode==='flee',rabbit=d.kind==='rabbit',phase=a.walk*(rabbit?10:5);
 d.body.position.y=moving?(rabbit?Math.max(0,Math.sin(phase))*.18:Math.sin(phase*2)*.025):Math.sin(time*1.7+a.id)*.008;
 d.legs.forEach(l=>l.root.rotation.x=moving?Math.sin(phase+l.phase)*(a.mode==='flee'?.65:.3):0);d.head.rotation.x=a.mode==='graze'?(rabbit?.15:.42)+Math.sin(time+a.id)*.06:0;
}
