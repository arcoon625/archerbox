import * as THREE from '../../vendor/three.module.js';

// Read the existing transparent portrait at small resolution. The model uses
// its visible hairline, crown height and color. The back is reconstructed.
export function portraitHair(image,[u,v,w,h],skinTone){
 const canvas=document.createElement('canvas');canvas.width=120;canvas.height=90;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(image,0,0,120,90);
 const {data}=ctx.getImageData(0,0,120,90),skin=new THREE.Color(skinTone);
 const srgb=skin.getRGB({},THREE.SRGBColorSpace),skinLight=(srgb.r*.2126+srgb.g*.7152+srgb.b*.0722)*255;
 const front=[],colors=[],columns=13;
 for(let i=0;i<columns;i++){
  const x=Math.max(0,Math.min(119,Math.round((u+w*(.13+i*.74/(columns-1)))*120)));
  let top=null,edge=null;
  for(let py=Math.max(0,Math.floor((v-.75*h)*90));py<Math.min(90,(v+.32*h)*90);py++){
   const pixel=(py*120+x)*4;if(data[pixel+3]<210)continue;
   const [r,g,b]=data.subarray(pixel,pixel+3),y=(py/90-v)/h;
   const lum=.2126*r+.7152*g+.0722*b;
   if(top===null)top=y;
   const dark=lum<skinLight*.68-3&&lum<94&&(r-b<34||lum<36);
   const overCrown=y<-.32&&lum>15&&lum<186&&Math.max(r,g,b)-Math.min(r,g,b)<44;
   if((dark||overCrown)&&y<.20){edge=y;colors.push([r,g,b]);}
   else if(edge!==null&&y-edge>.07)break;
  }
  front.push(top===null||edge===null||edge-top<.045?null:{top,edge});
 }
 const usable=front.filter(Boolean);
 if(usable.length<5)return null;
 const average=(list,read)=>list.reduce((sum,item)=>sum+read(item),0)/list.length;
 const rise=THREE.MathUtils.clamp(-average(usable,item=>item.top),.03,.68);
 const tone=new THREE.Color().setRGB(...[0,1,2].map(i=>average(colors,color=>color[i])/255),THREE.SRGBColorSpace);
 const geometry=new THREE.BufferGeometry(),positions=[],indices=[],uv=[],rows=13,segments=40;
 for(let row=0;row<=rows;row++)for(let column=0;column<=segments;column++){
  const a=column/segments*Math.PI*2,frontWeight=Math.max(0,-Math.sin(a))**3;
  const sample=front[Math.round((Math.cos(a)+1)*.5*(columns-1))],hairline=sample?.edge??.04;
  const rim=1.68+(-.31+1.12*hairline)*frontWeight;
  const phi=.005+(rim-.005)*row/rows;
  const variation=(.0015+rise*.010)*(Math.sin(a*13+phi*23)*.55+Math.sin(a*23-phi*11)*.45)*Math.sin(phi);
  positions.push(Math.cos(a)*Math.sin(phi)*(.175+rise*.025+variation),
   .067+Math.cos(phi)*(.15+rise*.118+variation),
   -.012+Math.sin(a)*Math.sin(phi)*(.177+rise*.047+variation));
  uv.push(column/segments,row/rows);
 }
 for(let row=0;row<rows;row++)for(let column=0;column<segments;column++){
  const a=row*(segments+1)+column,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);
 }
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:tone,roughness:.86});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Portrait-derived crown and hairline';mesh.castShadow=mesh.receiveShadow=true;
 const hair=new THREE.Group();
 hair.add(mesh);
 // Long sides in the portrait can extend below the edge of the crown mesh.
 const target=[0,1,2].map(i=>average(colors,color=>color[i]));
 for(const side of [-1,1]){
  let depth=.19;
  for(let y=.20;y<.90;y+=.055){
   const x=u+w*(side<0?.045:.955),py=Math.min(89,Math.floor((v+y*h)*90));
   const pixel=(py*120+Math.round(x*119))*4;
   if(data[pixel+3]<215||target.some((channel,i)=>Math.abs(data[pixel+i]-channel)>37))break;
   depth=y;
  }
  if(depth<.40)continue;
  for(let i=0;i<4;i++){
   const z=.052+i*.038,length=(depth-.26)*.47+i*.014;
   const points=[new THREE.Vector3(side*(.150-i*.006),.15,z),new THREE.Vector3(side*.180,.03,z+.016),
    new THREE.Vector3(side*(.173+i*.003),-.044-length*.45,z+.032),new THREE.Vector3(side*(.166+i*.009),-.04-length,z+.052)];
   const lock=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),10,.020-i*.002,6,false),material);
   lock.castShadow=lock.receiveShadow=true;hair.add(lock);
  }
 }
 return hair;
}
