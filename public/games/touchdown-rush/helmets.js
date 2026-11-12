import * as THREE from '../../vendor/three.module.js';
import {teamLogoImage,drawTeamLogo} from './team-branding.js?v=creators1';

// Cache only unrendered templates; each player owns disposable geometry clones.
const geometryTemplates=new Map();let shellTemplate;
function cachedGeometry(key,create){if(!geometryTemplates.has(key))geometryTemplates.set(key,create());return geometryTemplates.get(key).clone();}

// Original football helmet geometry. Front is -Z; all details move with the head.
function shellPoint(theta,phi){
 return new THREE.Vector3(Math.sin(theta)*Math.cos(phi)*.268,Math.cos(theta)*.292+.015,Math.sin(theta)*Math.sin(phi)*(Math.sin(phi)>0?.347:.330));
}
const vents=[-1,1].flatMap(side=>[{x:side*.115,z:-.125,rx:.020,rz:.048},{x:side*.132,z:.125,rx:.018,rz:.044}]);
function cutout(p){
 if(Math.abs(p.x)>.23&&((p.y+.065)/.046)**2+((p.z-.014)/.052)**2<1)return true;
 if(p.y<.17)return false;
 return vents.some(v=>((p.x-v.x)/v.rx)**2+((p.z-v.z)/v.rz)**2<1);
}
function shellGeometry(){
 const rows=32,columns=80,positions=[],uv=[],triangles=[],edges=new Map();
 for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
  const phi=col/columns*Math.PI*2,front=Math.max(0,-Math.sin(phi)),side=Math.abs(Math.cos(phi)),limit=2.17-front**2.6+.10*side**8,p=shellPoint(.006+row/rows*(limit-.006),phi);
  positions.push(...p);uv.push(col/columns,row/rows);
 }
 const vertex=id=>new THREE.Vector3().fromArray(positions,id*3);
 const triangle=(a,b,c)=>{
  const center=vertex(a).add(vertex(b)).add(vertex(c)).multiplyScalar(1/3);if(cutout(center))return;
  triangles.push(a,b,c);for(const [x,y] of [[a,b],[b,c],[c,a]]){const key=Math.min(x,y)+':'+Math.max(x,y);if(edges.has(key))edges.delete(key);else edges.set(key,[x,y]);}
 };
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const a=row*(columns+1)+col,b=a+columns+1;triangle(a,a+1,b);triangle(b,a+1,b+1);}
 // Snap each aperture's boundary onto its ellipse, eliminating grid-shaped
 // jagged cutouts while keeping the surrounding shell smoothly curved.
 const boundary=new Set([...edges.values()].flat());
 for(const id of boundary){const p=vertex(id);let changed=false;
  if(Math.abs(p.x)>.23){const dy=(p.y+.065)/.046,dz=(p.z-.014)/.052,r=Math.hypot(dy,dz);if(r>.1&&r<1.9){p.y=-.065+.046*dy/r;p.z=.014+.052*dz/r;p.x=Math.sign(p.x)*.268*Math.sqrt(Math.max(0,1-((p.y-.015)/.292)**2-(p.z/(p.z>0?.347:.330))**2));changed=true;}}
  if(!changed&&p.y>.17)for(const v of vents){const dx=(p.x-v.x)/v.rx,dz=(p.z-v.z)/v.rz,r=Math.hypot(dx,dz);if(r>.1&&r<1.9){p.x=v.x+v.rx*dx/r;p.z=v.z+v.rz*dz/r;p.y=.015+.292*Math.sqrt(Math.max(0,1-(p.x/.268)**2-(p.z/(p.z>0?.347:.330))**2));changed=true;break;}}
  if(changed)p.toArray(positions,id*3);
 }
 const geometry=(p,index,tex=uv)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));g.setIndex(index);g.computeVertexNormals();return g;};
 const inside=positions.map((n,i)=>i%3===1?(n-.015)*.953+.015:n*.953),reversed=[];for(let i=0;i<triangles.length;i+=3)reversed.push(triangles[i],triangles[i+2],triangles[i+1]);
 const rim=[],rimUV=[],rimIndex=[];
 for(const [a,b] of edges.values()){const n=rim.length/3;rim.push(...positions.slice(a*3,a*3+3),...positions.slice(b*3,b*3+3),...inside.slice(a*3,a*3+3),...inside.slice(b*3,b*3+3));rimUV.push(0,0,1,0,0,1,1,1);rimIndex.push(n,n+1,n+2,n+2,n+1,n+3);}
 return {shell:geometry(positions,triangles),lining:geometry(inside,reversed),rim:geometry(rim,rimIndex,rimUV)};
}
function paintStripe(center,width){
 const positions=[],uv=[],indices=[],steps=38;
 for(let i=0;i<=steps;i++)for(const side of [-1,1]){const a=-1.16+i/steps*3.31,x=center+side*width/2,cross=Math.sqrt(1-(x/.268)**2);positions.push(x*1.008,(Math.cos(a)*.292*cross)*1.008+.015,Math.sin(a)*(a>0?.347:.330)*cross*1.008);uv.push((side+1)/2,i/steps);}
 for(let i=0;i<steps;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function sideDecal(side){
 const positions=[],uv=[],indices=[],n=8;
 for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const u=x/n,v=y/n,p=shellPoint(1.19+(.5-v)*.38,(side>0?0:Math.PI)+(.5-u)*.72);p.x*=1.008;p.y=(p.y-.015)*1.008+.015;p.z*=1.008;positions.push(...p);uv.push(u*.5,v);}
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=y*(n+1)+x,b=a+n+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function backPanel(w,h,y,u0=0,v0=0,u1=1,v1=1,lift=.004){
 const positions=[],uv=[],indices=[],n=10;
 for(let row=0;row<=n;row++)for(let col=0;col<=n;col++){const u=col/n,v=row/n,x=(u-.5)*w,py=y+(v-.5)*h,z=.347*Math.sqrt(Math.max(0,1-(x/.268)**2-((py-.015)/.292)**2))+lift;positions.push(x,py,z);uv.push(u0+u*(u1-u0),v0+v*(v1-v0));}
 for(let row=0;row<n;row++)for(let col=0;col<n;col++){const a=row*(n+1)+col,b=a+n+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function addHelmet(head,options,materials,canvasTexture){
 const {helmet,rubber,white,skin,cage}=materials,mark=options.mark||'AB',shellColor=options.helmetColor??options.teamColor;
 const maskColors={DAL:0x7f8992,KC:0xe5e7e2,BUF:0xe5e7e2,IND:0x68747c,LV:0x626a70,NYJ:0x125740,LAC:0xffc20e,NO:0x20262b};
 const mask=new THREE.MeshStandardMaterial({color:maskColors[mark]??0x343e47,roughness:.40,metalness:.23});
 const stripe=new THREE.MeshStandardMaterial({color:mark==='DAL'?options.teamColor:mark==='KC'?0xf2f1e9:options.accent??0xf2f1e9,roughness:.32,metalness:.10});
 const pad=new THREE.MeshStandardMaterial({color:0x293036,roughness:.96});
 const add=(geometry,material,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;head.add(m);return m;};
 const oval=(material,x,y,z,sx,sy,sz)=>{const m=add(cachedGeometry('sphere',()=>new THREE.SphereGeometry(1,18,12)),material,x,y,z);m.scale.set(sx,sy,sz);return m;};
 const tube=(points,radius,material)=>add(cachedGeometry('tube:'+radius+':'+JSON.stringify(points),()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length>20?points.length:points.length*4),radius,8,false)),material);
 const strap=(points,material)=>{for(let i=1;i<points.length;i++){const a=new THREE.Vector3(...points[i-1]),b=new THREE.Vector3(...points[i]),delta=b.clone().sub(a),m=add(new THREE.BoxGeometry(.024,delta.length(),.007),material);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}};
 shellTemplate??=shellGeometry();const shell=add(shellTemplate.shell.clone(),helmet);shell.name='Molded helmet shell with open ear ports and crown vents';add(shellTemplate.lining.clone(),pad);add(shellTemplate.rim.clone(),rubber);
 add(cachedGeometry('stripe:center',()=>paintStripe(0,.026)),stripe);for(const side of [-1,1])add(cachedGeometry('stripe:'+side,()=>paintStripe(side*.022,.005)),white);
 for(const side of [-1,1]){const edge=[];for(let i=0;i<=36;i++){const a=i/36*Math.PI*2,y=-.065+Math.cos(a)*.046,z=.014+Math.sin(a)*.052,x=side*(.268*Math.sqrt(1-((y-.015)/.292)**2-(z/(z>0?.347:.330))**2)+.0015);edge.push([x,y,z]);}tube(edge,.0035,rubber);}
 for(const vent of vents){const edge=[];for(let i=0;i<=28;i++){const a=i/28*Math.PI*2,x=vent.x+Math.cos(a)*vent.rx,z=vent.z+Math.sin(a)*vent.rz,y=.015+.292*Math.sqrt(1-(x/.268)**2-(z/(z>0?.347:.330))**2)+.0015;edge.push([x,y,z]);}tube(edge,.0025,rubber);}
 // Fitted interior padding sits behind the cutouts, not on top of the paint.
 for(const side of [-1,1]){
  oval(pad,side*.225,-.055,.018,.026,.083,.080);oval(skin,side*.228,-.058,.012,.009,.032,.028);
  oval(pad,side*.172,-.126,-.12,.043,.064,.078);
  for(const z of [-.125,.125])oval(rubber,side*.115,.205,z,.04,.025,.065);
 }
 tube([[-.19,.105,-.233],[-.12,.125,-.283],[0,.13,-.306],[.12,.125,-.283],[.19,.105,-.233]],.014,rubber);
 tube([[-.14,.137,-.275],[0,.144,-.305],[.14,.137,-.275]],.014,white);
 // Powder-coated cage: a large clear eye opening, curved cheek and chin rails.
 tube([[-.245,.065,-.125],[-.235,.108,-.25],[-.13,.115,-.337],[0,.118,-.352],[.13,.115,-.337],[.235,.108,-.25],[.245,.065,-.125]],.012,mask);
 for(const [y,z] of [[-.085,-.371],[-.19,-.356]])tube([[-.243,.025,-.14],[-.255,y+.025,-.26],[-.14,y,z],[0,y-.005,z-.012],[.14,y,z],[.255,y+.025,-.26],[.243,.025,-.14]],.012,mask);
 for(const side of [-1,1]){
  tube([[side*.175,.113,-.318],[side*.185,-.032,-.35],[side*.175,-.19,-.35]],.011,mask);
  tube([[side*.25,.035,-.155],[side*.267,-.082,-.19],[side*.225,-.177,-.275]],.011,mask);
  if(['LT','LG','C','RG','RT','DT','DE','LB'].includes(options.role))tube([[side*.075,-.088,-.381],[side*.08,-.195,-.369]],.010,mask);
  // Mask clips, slotted screws and four flat chin straps with snap fasteners.
  for(const y of [.063,-.075]){oval(rubber,side*.252,y,-.125,.018,.023,.031);oval(cage,side*.268,y,-.125,.006,.011,.013);const slot=add(new THREE.BoxGeometry(.003,.003,.014),rubber,side*.274,y,-.125);slot.rotation.x=.4;}
  for(const anchor of [[side*.242,.075,-.055],[side*.232,-.125,.075]]){
   strap([anchor,[side*.134,-.161,-.174],[side*.048,-.202,-.244]],white);oval(cage,...anchor,.012,.012,.012);
  }
 }
 oval(pad,0,-.193,-.202,.091,.058,.057);oval(white,0,-.198,-.238,.081,.050,.043);
 for(const side of [-1,1]){const slot=add(new THREE.BoxGeometry(.017,.004,.003),rubber,side*.034,-.198,-.278);slot.rotation.z=side*.18;}
 add(cachedGeometry('bumper',()=>backPanel(.23,.036,-.128)),white);
 const atlas=canvasTexture(512,256,(c)=>{
  const dark=new THREE.Color(shellColor??0x101820).getHSL({}).l>.48;c.fillStyle=dark?'#12263b':'#f4f4ed';c.textAlign='center';c.textBaseline='middle';c.font='900 82px Arial';c.fillText(mark,128,128,224);
  c.fillStyle='#18262e';c.font='900 35px Arial';c.fillText(mark,384,64,224);
 });
 if(atlas&&options.custom)teamLogoImage(options).then(image=>{if(image&&!atlas.userData.disposed){const c=atlas.image.getContext('2d');c.clearRect(0,0,256,256);drawTeamLogo(c,image,12,12,232,232);atlas.needsUpdate=true;}});
 if(atlas){const decal=new THREE.MeshStandardMaterial({map:atlas,transparent:true,depthWrite:false,roughness:.42,polygonOffset:true,polygonOffsetFactor:-1});for(const side of [-1,1])add(cachedGeometry('decal:'+side,()=>sideDecal(side)),decal);add(cachedGeometry('bumper:decal',()=>backPanel(.21,.028,-.128,.5,.5,1,1,.005)),decal);}
 return {shell,mask};
}
