import * as T from '../../vendor/three.module.js';
import {roundedBox} from '../../avatar/surfaces.js?v=scan2';
import {INGREDIENTS} from './menus.js';

const sphere=new T.SphereGeometry(1,18,12);
const disk=new T.CylinderGeometry(1,1,1,32);
const block=roundedBox(1,1,1,.12);
const meshes=new Map(),materials=new Map();
const hotParts=new Set(['patty','double','chicken','spicy','steak','nuggets','tenders','chickenfries','fries','waffle','bites','dough']);
function lathe(points){return new T.LatheGeometry(points.map(([x,y])=>new T.Vector2(x,y)),38);}
const bunTop=lathe([[0,.008],[.213,.008],[.247,.022],[.255,.044],[.241,.089],[.204,.125],[.145,.151],[.075,.166],[0,.170]]);
const bunBottom=lathe([[0,0],[.205,0],[.24,.013],[.248,.040],[.238,.061],[.207,.073],[0,.073]]);
const bowl=lathe([[0,.006],[.157,.006],[.204,.023],[.240,.076],[.267,.14],[.268,.15],[.251,.15],[.233,.101],[.191,.046],[0,.034]]);

// A shared grain map adds bread pores and a crisp crust without per-item image loads.
const grain=(()=>{
 const size=64,data=new Uint8Array(size*size*4);
 let seed=73;
 for(let i=0;i<data.length;i+=4){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const shade=138+(seed>>>26)-(seed%11===0?68:0);
  data[i]=data[i+1]=data[i+2]=shade;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size);
 texture.wrapS=texture.wrapT=T.RepeatWrapping;
 texture.magFilter=T.LinearFilter;
 texture.needsUpdate=true;
 return texture;
})();
function mat(color,finish){
 const key=color+finish;
 if(!materials.has(key)){
  const roughness=finish==='wet'?.42:finish==='metal'?.29:.78;
  const options={color,roughness,side:T.DoubleSide};
  if(finish==='metal')options.metalness=.57;
  if(finish==='grain'){options.bumpMap=grain;options.bumpScale=.019;}
  materials.set(key,new T.MeshStandardMaterial(options));
 }
 return materials.get(key);
}
function put(root,geometry,color,x,y,z,w,h,d,finish='matte'){
 const mesh=new T.Mesh(geometry,mat(color,finish));
 mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);
 return mesh;
}
const oval=(root,c,x,y,z,w,h,d,f)=>put(root,sphere,c,x,y,z,w,h,d,f);
const box=(root,c,x,y,z,w,h,d,f)=>put(root,block,c,x,y,z,w,h,d,f);
const coin=(root,c,x,y,z,r,h,f)=>put(root,disk,c,x,y,z,r,h,r,f);
const jitter=(i,salt=0)=>Math.sin((i+1)*31.791+salt*17.3)*.5+.5;

function leafGeometry(){
 const shape=new T.PlaneGeometry(1,1,14,14);
 shape.rotateX(-Math.PI/2);
 const p=shape.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),edge=Math.hypot(x,z);
  const a=Math.atan2(z,x),ruffle=1+.11*Math.cos(11*a)+.059*Math.sin(19*a);
  p.setXYZ(i,x*ruffle*Math.sqrt(1-z*z*1.7),.12*edge*edge+Math.sin(a*13+edge*22)*edge*.115,z*ruffle);
 }
 shape.computeVertexNormals();
 return shape;
}
const leaf=leafGeometry();
const ring=new T.TorusGeometry(1,.11,10,34).rotateX(-Math.PI/2);
const tacoArc=new T.CylinderGeometry(.154,.154,.44,32,1,true,Math.PI,Math.PI).rotateZ(Math.PI/2);

function bread(root,sesame,bottom=false,heat=null){
 const toast=heat==='burnt'?'#87502c':bottom?'#d79b50':'#d99b46';
 put(root,bottom?bunBottom:bunTop,toast,0,0,0,1,1,1,'grain');
 if(!sesame||bottom)return;
 for(let i=0;i<21;i++){
  const a=i*2.399,r=.188*Math.sqrt((i+.6)/21);
  const y=.167-.113*(r/.25)**1.7;
  const seed=oval(root,'#fff1c7',Math.cos(a)*r,y,Math.sin(a)*r,.010,.0035,.019);
  seed.rotation.y=a+1.1;
 }
}
function tomatoSlice(root,x,y,z,size,id){
 const tomato=id==='tomato';
 const rind=tomato?'#cc422c':id==='pickle'?'#697940':'#477c48';
 const flesh=tomato?'#ef7550':id==='pickle'?'#b6b966':'#d3df9a';
 coin(root,rind,x,y,z,size,.034,'wet');
 coin(root,flesh,x,y+.017,z,size*.91,.006,'wet');
 for(let i=0;i<5;i++){
  const a=i*1.256;
  const seed=oval(root,tomato?'#ffe4aa':'#eef0bc',x+Math.cos(a)*size*.42,y+.022,z+Math.sin(a)*size*.42,size*.058,.004,size*.13,'wet');
  seed.rotation.y=-a+.6;
 }
 if(tomato)coin(root,'#ff9875',x,y+.021,z,size*.12,.005,'wet');
}
function patty(root,y,heat){
 const color=heat==='burnt'?'#3c281f':heat==='early'?'#a86a4e':'#79503a';
 coin(root,color,0,y+.038,0,.229,.068,'grain');
 for(let i=0;i<15;i++){
  const a=i*2.399;
  oval(root,i%3?color:'#563624',Math.cos(a)*.214,y+.042+jitter(i)*.01,Math.sin(a)*.214,.032,.036,.033,'grain');
 }
 for(let i=-2;i<=2;i++){
  const mark=box(root,heat==='burnt'?'#252324':'#513222',i*.062,y+.073,0,.014,.007,.35-Math.abs(i)*.045);
  mark.rotation.y=.24;
 }
}
function crisp(root,id,heat){
 const color=heat==='burnt'?'#684124':heat==='early'?'#e9b777':id==='spicy'?'#bd6129':'#cb852e';
 const bite=['nuggets','tenders','chickenfries','bites'].includes(id);
 const cores=bite?Array.from({length:5},(_,i)=>[(i%3-1)*.135,.055+Math.floor(i/3)*.018,(i<3?-.063:.094)]):[[0,.059,0]];
 const strip=id==='tenders'||id==='chickenfries';
 for(const [i,[x,y,z]] of cores.entries()){
  const w=bite?strip?.058:.094:.235,d=strip?.136:bite?.084:.183;
  oval(root,color,x,y,z,w,.052,d,'grain');
  for(let j=0;j<(bite?7:17);j++){
   const a=j*2.399,r=.7*Math.sqrt((j+.8)/(bite?7:17));
   oval(root,(j+i)%3===0?'#efb75d':color,x+Math.sin(a)*w*r,y+.034+jitter(j,i)*.017,z+Math.cos(a)*d*r,.026,.023,.027,'grain');
  }
 }
}
function fries(root,id,heat){
 const color=heat==='burnt'?'#92532e':heat==='early'?'#efcd8f':'#edb544';
 if(id==='waffle'){
  for(let layer=0;layer<3;layer++){
   const piece=new T.Group();piece.position.set((layer-1)*.113,.018+layer*.029,(layer-1)*.073);piece.rotation.y=.4*layer;
   for(let i=-2;i<=2;i++){
    box(piece,color,i*.040,0,0,.022,.024,.193-Math.abs(i)*.020,'grain');
    box(piece,'#d59b39',0,.011,i*.040,.189-Math.abs(i)*.020,.016,.020,'grain');
   }
   root.add(piece);
  }
  return;
 }
 for(let i=0;i<12;i++){
  const fry=box(root,i%3?color:'#f9d581',(jitter(i)-.5)*.33,.037+jitter(i,1)*.064,(jitter(i,2)-.5)*.31,.038,.034,.16+jitter(i,3)*.126,'grain');
  fry.rotation.set(.12*jitter(i,4),i*.72,.16*jitter(i,5));
 }
}
function scatter(root,id){
 const color=INGREDIENTS[id].color;
 for(let i=0;i<23;i++){
  const a=i*2.399,r=.20*Math.sqrt((i+.3)/23);
  const x=Math.sin(a)*r,z=Math.cos(a)*r,y=.020+jitter(i)*.026;
  if(id==='salsa'||id==='pepper'){
   box(root,i%3===0?'#569351':color,x,y,z,.048,.032,.039,'wet').rotation.y=a;
  }else{
   const small=['parmesan','salt','cajun'].includes(id);
   const w=small?.012:id==='rice'?.014:.035;
   oval(root,i%4===0&&!small?'#a17152':color,x,y,z,w,small?.007:.017,id==='rice'?.031:w*.78,small?'matte':'wet').rotation.y=a;
  }
 }
}
function form(root,id,heat){
 const color=INGREDIENTS[id].color;
 switch(id){
  case 'sesame': case 'bun':
   bread(root,false,true);breadAt(root,id==='sesame',.068,heat);break;
  case 'subroll':
   oval(root,'#ca9252',0,.074,0,.280,.080,.127,'grain');
   for(let i=-1;i<=1;i++)box(root,'#e5b879',i*.114,.140,0,.036,.010,.124,'grain').rotation.y=.42;
   break;
  case 'tortilla': case 'dough':
   coin(root,id==='dough'&&heat==='perfect'?'#d7a864':color,0,.023,0,.255,id==='dough'?.043:.016,'grain');
   for(let i=0;i<11;i++)oval(root,'#c99d6b',(jitter(i)-.5)*.35,id==='dough'?.045:.032,(jitter(i,2)-.5)*.35,.008+jitter(i,3)*.012,.002,.013);
   break;
  case 'shell':
   put(root,tacoArc,'#dba64b',0,.153,0,1,1,1,'grain');
   put(root,tacoArc,'#edc36a',0,.155,0,.99,.944,.95,'grain');
   break;
  case 'patty':case 'double':
   patty(root,0,heat);if(id==='double')patty(root,.073,heat);break;
  case 'chicken':case 'spicy':case 'nuggets':case 'tenders':case 'chickenfries':case 'bites':
   crisp(root,id,heat);break;
  case 'steak':case 'turkey':case 'bacon':
   for(let i=0;i<4;i++){
    const strip=oval(root,i%2?color:'#a36548',(i-1.5)*.103,.035+i*.009,0,.069,id==='bacon'?.020:.029,.154,'grain');
    strip.rotation.y=(i-1)*.42;
    if(id==='bacon')oval(root,'#e3ad80',strip.position.x,.065+i*.009,0,.021,.008,.125).rotation.y=strip.rotation.y;
   }
   break;
  case 'lettuce':
   for(let i=0;i<4;i++)put(root,leaf,i%2?'#89ae52':'#559746',0,.020+i*.013,0,.43-i*.036,.43,.42-i*.039,'wet').rotation.y=i*.96;
   break;
  case 'tomato':case 'pickle':case 'cucumber':
   tomatoSlice(root,-.069,.035,.019,id==='tomato'?.158:.096,id);
   tomatoSlice(root,.067,.048,-.032,id==='tomato'?.142:.09,id);
   break;
  case 'onion':
   for(let i=0;i<5;i++)put(root,ring,i%2?'#e6bcd1':'#c793c1',.025*i-.05,.021+i*.006,.014*i,.077+i*.020,.066,.077+i*.020,'wet');
   break;
  case 'cheese':
   box(root,'#eaae32',0,.026,0,.368,.028,.367,'wet').rotation.y=.23;
   box(root,'#f6cd60',.012,.054,0,.36,.024,.36,'wet').rotation.y=-.42;
   break;
  case 'mozz':
   for(let i=0;i<15;i++)box(root,color,(jitter(i)-.5)*.34,.024+jitter(i,2)*.046,(jitter(i,3)-.5)*.32,.032,.027,.12).rotation.y=i*.72;
   break;
  case 'pepperoni':
   for(let i=0;i<6;i++){
    const a=i*1.90,x=Math.sin(a)*.123,z=Math.cos(a)*.128,y=.024+i*.009;
    coin(root,'#bb4b39',x,y,z,.066,.016,'wet');
    for(let j=0;j<3;j++)oval(root,'#efb088',x+(j-1)*.022,y+.01,z+(j%2-.5)*.023,.005,.002,.005);
   }
   break;
  case 'marinara':case 'mac':case 'mayo':case 'sauce':case 'spread':case 'guac':
   for(let i=0;i<8;i++){
    const a=i*2.4,r=.115*Math.sqrt(i/8);
    oval(root,color,Math.sin(a)*r,.034+jitter(i)*.020,Math.cos(a)*r,.09,.050,.080,'wet');
   }
   break;
  case 'meatballs':
   for(let i=0;i<5;i++)oval(root,i%2?'#845537':'#a16849',Math.sin(i*2.4)*.139,.075,Math.cos(i*2.4)*.129,.075,.069,.071,'grain');
   break;
  case 'fries':case 'waffle':fries(root,id,heat);break;
  default:scatter(root,id);
 }
}
function breadAt(root,sesame,y,heat){
 const top=new T.Group();top.position.y=y;
 bread(top,sesame,false,heat);root.add(top);return top;
}
export function ingredientModel(id,heat=null){
 if(!Object.hasOwn(INGREDIENTS,id))return new T.Group();
 const cooked=hotParts.has(id)?heat:null;
 const key=id+'/'+(cooked||'prep');
 if(!meshes.has(key)){
  const root=new T.Group();root.name=INGREDIENTS[id].name;form(root,id,cooked);meshes.set(key,root);
 }
 return meshes.get(key).clone();
}

const burgerLayers=['patty','double','chicken','spicy','cheese','bacon','lettuce','tomato','pickle','onion','mac','spread','mayo'];
const bunIds=['sesame','bun'];
export function foodTray(meal,draft){
 const root=new T.Group();
 box(root,'#6b827f',0,.025,0,.82,.049,.64,'metal');
 box(root,'#eee1c9',0,.050,0,.73,.012,.553);
 if(!meal||!draft?.parts.length)return root;
 const {parts,heat}=draft;
 const onTray=(id,x,y,z,sx=1,sy=1,sz=1)=>{
  const item=ingredientModel(id,heat);
  item.position.set(x,y,z);item.scale.set(sx,sy,sz);root.add(item);
 };
 const sorted=meal.shape==='burger'?[...parts].sort((a,b)=>burgerLayers.indexOf(a)-burgerLayers.indexOf(b)):parts;
 if(meal.shape==='burger'){
  let y=.060;
  const bun=parts.find(id=>bunIds.includes(id));
  if(bun){const base=new T.Group();base.position.y=y;bread(base,false,true);root.add(base);y+=.057;}
  for(const id of sorted){
   if(id===bun)continue;
   onTray(id,0,y,0,1,.65,1);
   y+=['double','nuggets','chicken','spicy','patty'].includes(id)?.062:.029;
  }
  if(bun)breadAt(root,bun==='sesame',y-.009,heat);
  return root;
 }
 const layer=parts.find(id=>['dough','tortilla','shell','subroll'].includes(id));
 if(meal.shape==='bowl')put(root,bowl,'#bc925e',0,.051,0,1,1,1,'matte');
 if(layer)onTray(layer,0,.057,0);
 let index=0;
 for(const id of parts){
  if(id===layer)continue;
  if(meal.shape==='pizza'){
   if(id==='marinara')coin(root,'#ba4b37',0,.106,0,.231,.019,'wet');
   else if(id==='mozz'||id==='cheese')coin(root,heat==='perfect'?'#ebbe68':'#f7e5ad',0,.122,0,.225,.018,'wet');
   else onTray(id,0,.136,0,1.06,.55,1.06);
  }else if(meal.shape==='bowl'||layer){
   const rows=meal.shape==='sub'?[-.156,0,.156]:[-.12,.12,0];
   onTray(id,rows[index%3],meal.shape==='bowl'?.15:.148,(index%2-.5)*.087,.55,.53,.46);
  }else if(id==='fries'||id==='waffle'||id==='nuggets'||id==='tenders'||id==='chickenfries'||id==='bites'){
   onTray(id,0,.057,0,1.14,1,1.03);
  }else{
   onTray(id,index%2?.11:-.11,.067+index*.059,0,.69,.82,.70);
  }
  index++;
 }
 return root;
}
