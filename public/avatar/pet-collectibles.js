import {THREE,mesh,oval,casing,sweep,silhouette,eye,sides,surface,glass,enamel,lamp} from './pet-forms.js';
import {crab} from './pet-water.js';

function cylinder(group,material,position,top,bottom,height,segments=24){
 return mesh(group,new THREE.CylinderGeometry(top,bottom,height,segments),material,position);
}
function torus(group,material,position,radius,thickness,horizontal=false){
 const ring=mesh(group,new THREE.TorusGeometry(radius,thickness,10,32),material,position);
 if(horizontal)ring.rotation.x=Math.PI/2;
 return ring;
}

export function machine(group,item){
 const steel=surface(item.color,'metal',{metalness:.48}),trim=enamel(item.accent);
 const rubber=surface('#253138','rubber'),screw=surface('#b7c0bc','metal'),signal=lamp('#7bdacb');
 const rotors=[];
 switch(item.kind){
  case 'robotcrab':crab(group,steel,trim,true);break;
  case 'robotdog':{
   casing(group,steel,[0,.285,-.085],[.24,.20,.39]);
   casing(group,trim,[0,.351,-.08],[.18,.088,.295]);
   casing(group,steel,[0,.405,.171],[.228,.178,.196]);
   casing(group,rubber,[0,.418,.270],[.191,.082,.034]);
   for(const side of sides){
    casing(group,signal,[side*.047,.427,.291],[.039,.024,.007]);
    casing(group,trim,[side*.115,.473,.148],[.045,.088,.085]).rotation.z=side*-.25;
    for(const z of [.053,-.205]){
     sweep(group,steel,[[side*.123,.283,z,.045],[side*.147,.165,z-.038,.038],[side*.130,.066,z+.004,.025]]);
     oval(group,screw,[side*.154,.157,z-.039],[.024,.035,.035]);
     casing(group,rubber,[side*.129,.036,z+.029],[.082,.063,.103]);
    }
   }
   sweep(group,trim,[[0,.316,-.265,.028],[0,.37,-.337,.023],[0,.424,-.369,.012]]);
   break;
  }
  case 'drone':{
   oval(group,steel,[0,.320,0],[.154,.075,.163]);
   oval(group,rubber,[0,.286,.097],[.078,.046,.054]);
   oval(group,glass('#699da9',.92),[0,.286,.145],[.038,.031,.021]);
   for(const side of sides)for(const depth of sides){
    const x=side*.24,z=depth*.192;
    sweep(group,steel,[[side*.073,.32,depth*.04,.039],[side*.16,.34,depth*.112,.028],[x,.358,z,.034]]);
    cylinder(group,rubber,[x,.362,z],.052,.052,.065);
    torus(group,trim,[x,.40,z],.104,.013,true);
    const rotor=new THREE.Group();rotor.position.set(x,.404,z);group.add(rotor);rotors.push(rotor);
    for(const blade of sides)oval(rotor,steel,[blade*.044,0,0],[.049,.008,.018],blade*.07);
    oval(group,depth===1?signal:lamp('#ed9672'),[x,.335,z],[.022,.009,.026]);
   }
   break;
  }
  case 'ufo':{
   oval(group,steel,[0,.367,0],[.268,.069,.268]);
   torus(group,trim,[0,.367,0],.244,.016,true);
   oval(group,glass('#8fbcc9',.67),[0,.422,0],[.148,.113,.148]);
   casing(group,steel,[0,.429,-.024],[.064,.070,.067]);
   cylinder(group,rubber,[0,.311,0],.132,.086,.069);
   torus(group,signal,[0,.283,0],.078,.012,true);
   for(let i=0;i<10;i++){
    const a=i*Math.PI/5;
    oval(group,i%2===0?signal:screw,[Math.sin(a)*.220,.382,Math.cos(a)*.220],[.018,.016,.018]);
   }
   break;
  }
  case 'rocket':{
   cylinder(group,steel,[0,.345,0],.095,.116,.373);
   sweep(group,trim,[[0,.527,0,.095],[0,.601,0,.08],[0,.663,0,.046],[0,.702,0,.003]]);
   cylinder(group,rubber,[0,.134,0],.072,.095,.095);
   torus(group,trim,[0,.187,0],.108,.010,true);
   torus(group,screw,[0,.418,.100],.050,.010);
   oval(group,glass('#80bdcf',.85),[0,.418,.107],[.047,.047,.019]);
   for(let i=0;i<3;i++){
    const fin=new THREE.Group();fin.rotation.y=i*Math.PI*2/3;group.add(fin);
    silhouette(fin,trim,[[.081,.317],[.178,.185],[.180,.117],[.083,.153]],[0,0,-.013],.026);
   }
   oval(group,lamp('#e5a15c'),[0,.067,0],[.050,.075,.050]);
   break;
  }
  case 'arcade':
  case 'robot':{
   const cabinet=item.kind==='arcade';
   casing(group,steel,[0,.296,0],[.34,.42,.246]);
   casing(group,trim,[0,.493,.019],[.322,.125,.275]);
   casing(group,rubber,[0,.363,.138],[.266,.169,.029]);
   casing(group,cabinet?enamel('#356261'):glass('#608a95',.69),[0,.363,.15],[.233,.138,.025]);
   for(const side of sides){
    oval(group,screw,[side*.125,.463,.151],[.012,.012,.008]);
    for(let i=0;i<3;i++)casing(group,rubber,[side*.173,.275+i*.022,-.026],[.009,.012,.093]);
    casing(group,steel,[side*.117,.091,0],[.100,.116,.12]);
    casing(group,rubber,[side*.117,.042,.032],[.117,.050,.19]);
   }
   if(cabinet){
    casing(group,trim,[0,.244,.154],[.308,.050,.145]);
    for(let i=0;i<4;i++)casing(group,signal,[-.073+i*.044,.330+(i%3)*.026,.166],[.031,.016,.005]);
    cylinder(group,rubber,[-.082,.288,.173],.013,.012,.051);
    oval(group,trim,[-.082,.313,.174],[.021,.021,.022]);
    for(const x of [.042,.094])cylinder(group,signal,[x,.277,.171],.019,.020,.013);
   }else{
    for(const side of sides){
     casing(group,signal,[side*.050,.374,.165],[.046,.029,.008]);
     sweep(group,steel,[[side*.171,.329,0,.033],[side*.211,.259,.015,.027],[side*.217,.192,.048,.024]]);
    }
    casing(group,trim,[0,.232,.130],[.105,.042,.028]);
   }
   break;
  }
 }
 if(rotors.length)group.userData.petAnimate=time=>rotors.forEach(rotor=>{rotor.rotation.y=time*24;});
}

function littleFace(group,y,z,spread=.054) {
 for(const side of sides)eye(group,[side*spread,y,z],.017,'#705241',side*.18);
}

export function collectible(group,item){
 const material=surface(item.color,'skin',{roughness:.62}),accent=surface(item.accent,'polymer');
 const baked=surface('#bd834f','cotton'),icing=enamel(item.color),dark=surface('#543523','polymer');
 switch(item.kind){
  case 'pizza':{
   const outline=[[-.222,.414],[0,.472,.222,.414],[.01,.084],[-.008,.084]];
   silhouette(group,baked,outline,[0,0,-.045],.091);
   silhouette(group,surface('#af4d38','skin'),[[-.195,.397],[0,.431,.195,.397],[0,.111]],[0,0,.047],.011);
   silhouette(group,surface('#f1c876','skin'),[[-.181,.395],[0,.423,.181,.395],[0,.122]],[0,0,.058],.012);
   sweep(group,baked,[[-.219,.418,.048,.025],[0,.452,.049,.034],[.219,.418,.048,.025]]);
   for(const [x,y] of [[-.086,.351],[.078,.302],[.003,.232],[.064,.377]])oval(group,surface('#a84f40','skin'),[x,y,.075],[.038,.039,.008]);
   littleFace(group,.309,.077,.059);
   break;
  }
  case 'donut':{
   torus(group,baked,[0,.302,0],.161,.071);
   torus(group,icing,[0,.302,.046],.161,.057);
   for(let i=0;i<21;i++){
    const theta=i*(Math.PI*2/21),rad=.143+(i%4)*.014;
    const sprinkle=oval(group,surface(['#e7c867','#f1e0cc','#769aab','#c47177'][i%4],'polymer'),[Math.cos(theta)*rad,.302+Math.sin(theta)*rad,.099],[.014,.004,.004],theta+i%3);
    sprinkle.rotation.y=.10;
   }
   littleFace(group,.458,.102,.049);
   break;
  }
  case 'cupcake':{
   cylinder(group,baked,[0,.154,0],.154,.111,.215);
   for(let i=0;i<21;i++){
    const a=i*Math.PI*2/21;
    const pleat=oval(group,accent,[Math.sin(a)*.135,.154,Math.cos(a)*.135],[.014,.115,.014]);
    pleat.rotation.set(Math.cos(a)*.17,0,-Math.sin(a)*.17);
   }
   const nodes=Array.from({length:18},(_,i)=>{
    const t=i/17,a=t*Math.PI*4.8,r=.131*(1-t)+.012;
    return [Math.sin(a)*r,.255+t*.249,Math.cos(a)*r,.065*(1-t)+.009];
   });
   sweep(group,icing,nodes);
   oval(group,icing,[0,.289,0],[.157,.065,.156]);
   oval(group,enamel('#bd5061'),[.011,.532,.006],[.034,.031,.034]);
   sweep(group,dark,[[.012,.55,.006,.006],[.036,.58,.009,.004],[.022,.604,.014,.002]]);
   littleFace(group,.169,.146,.045);
   break;
  }
  case 'boba':{
   cylinder(group,glass('#e8e9e0',.54),[0,.243,0],.157,.117,.372);
   cylinder(group,surface('#bb8f6e','skin'),[0,.253,0],.145,.113,.320);
   torus(group,glass('#f1e9d9',.9),[0,.429,0],.153,.014,true);
   cylinder(group,enamel('#cab6a9'),[0,.435,0],.150,.151,.019);
   const straw=cylinder(group,enamel(item.accent),[.037,.507,.018],.021,.021,.214);
   straw.rotation.z=-.21;
   for(let i=0;i<13;i++){
    const x=Math.sin(i*2.4)*.108,z=Math.cos(i*2.4)*.108;
    oval(group,dark,[x,.092+(i%3)*.027,z],[.024,.024,.024]);
   }
   littleFace(group,.272,.155,.043);
   break;
  }
  case 'mushroom':{
   sweep(group,surface('#ded0b9','skin'),[[0,.03,0,.082],[-.016,.14,-.002,.076],[.013,.285,0,.054],[0,.383,-.012,.086]]);
   oval(group,surface('#a85b64','skin',{roughness:.51}),[0,.365,0],[.184,.113,.174]);
   oval(group,accent,[0,.327,0],[.171,.044,.161]);
   for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12;
    sweep(group,material,[[Math.sin(a)*.05,.303,Math.cos(a)*.05,.003],[Math.sin(a)*.105,.298,Math.cos(a)*.105,.003],[Math.sin(a)*.154,.322,Math.cos(a)*.154,.001]]);
    const r=.067+(i%4)*.020;
    oval(group,accent,[Math.sin(a)*r,.471-r*r*2.4,Math.cos(a)*r],[.016,.005,.011]);
   }
   littleFace(group,.194,.063,.033);
   break;
  }
  case 'golem':{
   const rock=surface('#80918d','scale',{roughness:.85}),gem=surface('#a9dad8','metal',{roughness:.26,metalness:.25});
   const crystal=(x,y,z,w,h,d)=>{
    const shard=mesh(group,new THREE.OctahedronGeometry(1,0),gem,[x,y,z]);shard.scale.set(w,h,d);shard.rotation.z=x*.92;
   };
   casing(group,rock,[0,.268,0],[.276,.34,.229]);
   casing(group,rock,[0,.499,.027],[.224,.171,.175]);
   for(const side of sides){
    casing(group,rock,[side*.162,.256,0],[.103,.265,.142]).rotation.z=side*.23;
    casing(group,rock,[side*.088,.079,.034],[.129,.13,.195]);
    crystal(side*.141,.432,-.042,.060,.121,.066);
    crystal(side*.185,.342,.022,.046,.091,.045);
    oval(group,lamp('#b7e9d7'),[side*.046,.511,.119],[.022,.012,.008]);
   }
   crystal(0,.319,.133,.066,.093,.056);
   crystal(-.03,.61,-.016,.035,.081,.04);
   break;
  }
  case 'sprite':{
   oval(group,surface('#8bac70','skin'),[0,.30,0],[.093,.154,.083]);
   for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9;
    const leaf=silhouette(group,i%2===0?accent:material,[[0,0],[.14,-.044,.233,.11],[.124,.163,0,0]],[Math.sin(a)*.06,.294+(i%3)*.045,Math.cos(a)*.06],.006);
    leaf.rotation.y=a;
    sweep(leaf,surface('#6f8852','skin'),[[.005,.006,.01,.002],[.106,.053,.012,.003],[.216,.103,.007,.001]]);
   }
   littleFace(group,.322,.092,.040);
   break;
  }
  case 'comet':{
   const stone=mesh(group,new THREE.IcosahedronGeometry(.138,2),surface('#837c74','scale'),[0,.341,0]);
   stone.scale.set(1,.82,.9);
   for(let i=0;i<12;i++){
    const a=i*2.4;
    const hot=i%2===0?lamp('#d3a35b'):lamp('#e77947');
    oval(group,hot,[Math.cos(a)*.109,.348+Math.sin(a)*.084,.065+(i%3)*.021],[.017,.013,.014],a);
   }
   for(let i=0;i<6;i++)sweep(group,glass(i%2?'#d6ad70':'#9ec8d6',.60),[[0,.343,-.066,.048],[.084+i*.012,.381,-.141,.030],[.211+i*.017,.47+i*.010,-.223,.015],[.328+i*.024,.527+i*.009,-.265,.0015]]);
   littleFace(group,.35,.128,.051);
   break;
  }
  case 'cloud':{
   const mist=surface('#e6e5dd','polymer',{roughness:.95,metalness:0});
   for(let i=0;i<13;i++){
    const x=(i%5-2)*.060,y=.288+Math.sin(i*1.8)*.062+(i>8?.057:0),z=Math.sin(i*2.4)*.074;
    oval(group,i%4===0?glass('#e1e5e4',.74):mist,[x,y,z],[.096+(i%3)*.016,.081+(i%4)*.014,.101]);
   }
   littleFace(group,.323,.144,.049);
   break;
  }
  case 'ghost':{
   const fabric=new THREE.SphereGeometry(1,36,26);
   const position=fabric.getAttribute('position');
   for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    const a=Math.atan2(x,z),fold=Math.max(0,.36-y);
    const radius=1+Math.sin(a*7)*fold*.10;
    position.setXYZ(i,x*.174*radius,.344+y*.202+Math.sin(a*7)*fold*.020,z*.128*radius);
   }
   fabric.computeVertexNormals();
   mesh(group,fabric,glass('#e6eee9',.86));
   for(const side of sides){
    oval(group,dark,[side*.051,.410,.119],[.023,.037,.010],side*.13);
    sweep(group,glass('#e6eee9',.69),[[side*.101,.33,0,.047],[side*.175,.289,.014,.031],[side*.221,.309,.020,.002]]);
   }
   oval(group,dark,[0,.351,.127],[.022,.017,.009]);
   break;
  }
 }
}
