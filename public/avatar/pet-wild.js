import {THREE,oval,sweep,silhouette,eye,sides,surface,glass} from './pet-forms.js';

const birds={
 penguin:{coat:'#495460',breast:'#e7e7dc',bill:'#c99464',y:.38,head:.59,wing:.28},
 owl:{coat:'#896d51',breast:'#d6bd92',bill:'#ae8e55',y:.35,head:.61,wing:.25},
 parrot:{coat:'#588e58',breast:'#d7ac61',bill:'#554a3c',y:.38,head:.63,wing:.26},
 duck:{coat:'#d8b756',breast:'#e9d399',bill:'#bb7c48',y:.25,head:.43,wing:.16}
};
export function bird(group,item){
 const kind=item.kind,b=birds[kind],coat=surface(b.coat,'fur'),breast=surface(b.breast,'fur'),beak=surface(b.bill,'skin');
 const dark=surface(kind==='parrot'?'#49649b':b.coat,'fur');
 const duck=kind==='duck',z=duck?.142:.075;
 oval(group,coat,[0,b.y,-.04],[.15,duck?.12:.235,duck?.244:.141]);
 oval(group,breast,[0,b.y-.009,duck?.084:.071],[.116,duck?.089:.190,.060]);
 oval(group,coat,[0,b.head,z],[.113,.110,.104]);
 for(const side of sides){
  const wing=oval(group,coat,[side*.132,b.y-.014,-.036],[.055,b.wing*.70,.117],side*(kind==='penguin'?.31:.13));
  wing.rotation.x=duck?1.04:.24;
  for(let i=0;i<5;i++){
   const feather=oval(group,dark,[side*(.146-.003*i),b.y-.029-i*.025,-.057-i*.013],[.028,.077-i*.004,.051],side*.24);
   feather.rotation.x=duck?.83:.45;
  }
  if(kind==='owl') oval(group,breast,[side*.056,b.head+.006,z+.085],[.064,.068,.019],side*-.10);
  if(kind==='parrot') oval(group,breast,[side*.072,b.head+.006,z+.075],[.042,.038,.022]);
  eye(group,[side*(kind==='owl'?.056:.079),b.head+.016,z+.104],kind==='owl'?.036:.024,kind==='owl'?'#d3a146':'#8e6947',side*(kind==='owl'?.16:.56));
  if(duck||kind==='penguin'){
   oval(group,beak,[side*.078,.032,.074],[.064,.026,.077]);
   for(let i=-1;i<=1;i++)oval(group,beak,[side*.076+i*.029,.028,.122],[.017,.018,.04],-i*.20);
  } else {
   sweep(group,beak,[[side*.077,.128,.03,.024],[side*.077,.058,.042,.018],[side*.077,.038,.055,.012]]);
   for(const offset of [-.025,0,.024])sweep(group,beak,[[side*.076,.043,.044,.010],[side*.076+offset,.026,.088,.009],[side*.076+offset,.021,.116,.003]]);
  }
 }
 if(duck) {
  oval(group,beak,[0,b.head-.035,z+.112],[.078,.024,.096]);
  oval(group,beak,[0,b.head-.055,z+.109],[.068,.015,.085]);
 } else {
  const hooked=kind==='parrot'||kind==='owl';
  sweep(group,beak,[[0,b.head-.022,z+.084,.044],[0,b.head-.03,z+.142,.030],[0,b.head-(hooked?.076:.037),z+(hooked?.163:.192),.001]],{depth:.65});
 }
 for(let i=0;i<5;i++){
  const plume=oval(group,dark,[(i-2)*.025,b.y+(duck?.025:-.052),-.20],[.035,.115,.027],(i-2)*.16);
  plume.rotation.x=duck?-.94:-.58;
 }
 if(kind==='owl'){
  for(let i=0;i<15;i++)oval(group,coat,[(i%5-2)*.035,.229+Math.floor(i/5)*.05,.121],[.018,.015,.005],i%2?.5:-.5);
 }
}

export function crawler(group,item){
 const kind=item.kind;
 const skin=surface(item.color,'skin'),accent=surface(item.accent,'skin'),dark=surface('#6a7650','scale');
 if(kind==='turtle'){
  oval(group,skin,[0,.153,-.023],[.177,.094,.244]);
  oval(group,dark,[0,.225,-.028],[.197,.159,.260]);
  const shell=surface('#a09666','scale',{roughness:.68});
  for(let i=0;i<3;i++){
   const z=-.182+i*.128;
   oval(group,shell,[0,.364-Math.abs(z+.05)*.24,z],[.064,.015,.064]);
   for(const side of sides)oval(group,shell,[side*.099,.336-Math.abs(z+.05)*.28,z+.025],[.047,.024,.059],-side*.26);
  }
  sweep(group,skin,[[0,.14,.14,.082],[0,.194,.225,.067],[0,.218,.275,.059]]);
  oval(group,skin,[0,.228,.306],[.086,.062,.092]);
  oval(group,accent,[0,.199,.33],[.076,.035,.066]);
  for(const side of sides){
   eye(group,[side*.071,.242,.345],.022,'#af8a49',side*.9);
   for(const z of [-.154,.108]){
    oval(group,skin,[side*.19,.063,z],[.088,.049,.066],side*.18);
    for(let i=-1;i<=1;i++)oval(group,accent,[side*.209+i*.018,.033,z+.048],[.010,.009,.018]);
   }
  }
  sweep(group,skin,[[0,.113,-.22,.033],[0,.093,-.286,.025],[.024,.073,-.35,.005]]);
 } else if(kind==='frog'){
  oval(group,skin,[0,.162,-.043],[.163,.132,.207]);
  oval(group,accent,[0,.114,.041],[.13,.084,.139]);
  oval(group,skin,[0,.22,.099],[.163,.106,.139]);
  sweep(group,dark,[[-.132,.179,.168,.001],[-.067,.165,.212,.003],[0,.167,.225,.003],[.067,.165,.212,.003],[.132,.179,.168,.001]]);
  for(const side of sides){
   oval(group,skin,[side*.101,.293,.105],[.072,.061,.073]);
   eye(group,[side*.112,.312,.156],.034,'#c9b270',side*.57);
   oval(group,skin,[side*.145,.128,-.145],[.072,.095,.123],side*.23);
   for(const z of [.075,-.18]){
    sweep(group,skin,[[side*.101,.166,z,.045],[side*.198,.08,z-.048,.031],[side*.181,.037,z+.032,.025]]);
    for(let i=-1;i<=1;i++){
     const x=side*.178+i*.024;
     sweep(group,accent,[[side*.181,.037,z+.027,.011],[x,.030,z+.082,.008],[x+i*.013,.033,z+.108,.0045]]);
    }
   }
  }
 } else {
  oval(group,skin,[0,.119,-.052],[.116,.095,.224]);
  oval(group,skin,[0,.15,.147],[.144,.078,.139]);
  oval(group,accent,[0,.125,.205],[.133,.048,.096]);
  sweep(group,skin,[[0,.107,-.16,.09],[0,.108,-.28,.064],[.023,.119,-.40,.038],[.078,.147,-.51,.004]],{depth:1.21});
  const gill=surface('#ac547b','skin');
  for(const side of sides){
   eye(group,[side*.095,.175,.231],.021,'#7b584d',side*.53);
   for(let i=0;i<3;i++){
    const y=.183-i*.035,z=.104-i*.029;
    sweep(group,gill,[[side*.103,y,z,.025],[side*.16,y+.019,z-.032,.020],[side*.222,y+.088-i*.024,z-.081,.005]]);
    for(let j=0;j<5;j++){
     const t=j/5;
     sweep(group,gill,[[side*(.15+t*.058),y+t*.05,z-.041-t*.035,.006],[side*(.18+t*.058),y+t*.043-.024,z-.07-t*.037,.002]]);
    }
   }
   for(const z of [.028,-.179]){
    sweep(group,skin,[[side*.081,.114,z,.031],[side*.144,.053,z-.034,.022],[side*.168,.026,z+.024,.013]]);
    for(let i=-1;i<=1;i++)sweep(group,accent,[[side*.164,.028,z+.021,.007],[side*.174+i*.014,.023,z+.054,.004],[side*.185+i*.021,.024,z+.067,.002]]);
   }
  }
 }
}

export function insect(group,item){
 const kind=item.kind,bug=surface(kind==='ladybug'?'#282321':item.color,'polymer',{roughness:.52});
 const dark=surface('#302b27','polymer',{roughness:.42});
 const flying=kind!=='ladybug', y=flying?.36:.19;
 oval(group,bug,[0,y,-.036],[kind==='ladybug'?.095:.074,.071,.126]);
 oval(group,dark,[0,y+.01,.069],[.054,.048,.059]);
 for(const side of sides){
  eye(group,[side*.038,y+.024,.102],.019,'#675047',side*.82);
  sweep(group,dark,[[side*.021,y+.039,.084,.009],[side*.046,y+.085,.129,.005],[side*.073,y+.102,.17,.003]]);
  for(let i=0;i<3;i++){
   const z=.048-i*.062;
   sweep(group,dark,[[side*.039,y-.018,z,.008],[side*.11,y-.052,z+.009,.007],[side*.121,y-.106,z-.026,.0045],[side*.15,y-.135,z-.018,.003]]);
  }
 }
 if(kind==='ladybug'){
  const red=surface('#b13f36','polymer',{roughness:.33,clearcoat:.65});
  for(const side of sides){
   oval(group,red,[side*.035,y+.025,-.027],[.062,.066,.114],side*.13);
   for(const [x,z] of [[.064,.012],[.061,-.076],[.017,-.062]])oval(group,dark,[side*x,y+.081,z],[.017,.006,.017]);
  }
  return;
 }
 if(kind==='bee')for(let i=0;i<3;i++)oval(group,dark,[0,y,-.071-i*.029],[.072-i*.008,.065-i*.009,.019]);
 if(kind==='firefly')oval(group,new THREE.MeshStandardMaterial({color:'#d5ef86',emissive:'#b8ec5e',emissiveIntensity:.6}),[0,y-.024,-.115],[.052,.043,.053]);
 const wings=[];
 for(const side of sides){
  const wing=new THREE.Group();wing.position.set(side*.025,y+.041,.006);wing.scale.x=side;group.add(wing);wings.push({wing,side});
  const butterfly=kind==='butterfly', pigment=butterfly?surface(item.color,'polymer'):glass('#e9e6ca',.63);
  const wingTip=butterfly?.285:.235;
  const first=silhouette(wing,pigment,[[0,0],[.12,.25,wingTip,.22],[wingTip+.04,.02,.145,-.016],[.059,-.02,0,0]],[0,0,0],.006);
  first.rotation.x=Math.PI/2;
  const lower=silhouette(wing,butterfly?surface(item.accent,'polymer'):pigment,[[0,0],[.17,.13,.22,.087],[.264,-.084,.095,-.13],[.044,-.105,0,0]],[.016,-.006,-.027],.004);
  lower.rotation.x=Math.PI/2;
  for(const [x,z] of [[wingTip,.215],[.20,.103],[.22,-.074]])sweep(wing,butterfly?dark:bug,[[0,.010,0,.002],[x*.54,.012,z*.39,.0017],[x,.010,z,.001]]);
 }
 group.userData.petAnimate=time=>{for(const {wing,side} of wings)wing.rotation.z=side*(.28+Math.sin(time*(kind==='butterfly'?7:18))*.25);};
}
