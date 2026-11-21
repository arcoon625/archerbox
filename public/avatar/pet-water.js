import {THREE,oval,sweep,silhouette,eye,sides,surface,glass} from './pet-forms.js';

function octopus(group,body,accent){
 oval(group,body,[0,.374,-.047],[.135,.183,.144]);
 oval(group,accent,[0,.311,.056],[.112,.081,.096]);
 const tentacles=[];
 for(let i=0;i<8;i++){
  const theta=i*Math.PI/4,x=Math.sin(theta),z=Math.cos(theta);
  const limb=new THREE.Group();group.add(limb);tentacles.push(limb);
  const nodes=[[x*.075,.282,z*.074,.049],[x*.143,.17,z*.14,.038],[x*.228,.073,z*.232,.026],[x*.299+.045*z,.09,z*.30-.044*x,.016],[x*.318+.065*z,.158,z*.32-.063*x,.002]];
  sweep(limb,body,nodes);
  for(let j=0;j<5;j++){
   const r=.152+j*.031, y=.131-j*.013;
   oval(limb,accent,[x*r,y,z*r],[.013-j*.0015,.008,.012-j*.0015]);
  }
 }
 for(const side of sides)eye(group,[side*.079,.377,.081],.025,'#ac8b68',side*.49);
 group.userData.petAnimate=time=>tentacles.forEach((limb,i)=>{limb.rotation.y=Math.sin(time*2+i*.8)*.075;});
}

function jellyfish(group,item){
 const tissue=glass(item.color,.58),edge=glass('#d6ebee',.77),arms=glass(item.accent,.82);
 const bell=new THREE.Mesh(new THREE.SphereGeometry(1,32,18,0,Math.PI*2,0,Math.PI*.56),tissue);
 bell.scale.set(.206,.142,.206);bell.position.y=.49;group.add(bell);
 oval(group,edge,[0,.466,0],[.206,.022,.206]);
 const organs=surface('#d5b8e5','skin',{roughness:.38});
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2;
  oval(group,organs,[Math.sin(a)*.056,.516,Math.cos(a)*.056],[.040,.013,.040]);
 }
 const ribbons=[];
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;
  const x=Math.sin(a),z=Math.cos(a),r=i%3===0?.073:.16,k=i%3===0?.023:.007;
  const strip=sweep(group,arms,[[x*r,.456,z*r,k],[x*(r+.01)+.023,.329,z*r,k*.75],[x*r-.019,.229,z*(r+.033),k*.53],[x*r+.031,.12+i%3*.041,z*(r+.039),.0018]]);
  ribbons.push(strip);
 }
 group.userData.petAnimate=time=>{
  const pulse=Math.sin(time*2.8);
  bell.scale.x=bell.scale.z=.206+pulse*.012;
  bell.scale.y=.142-pulse*.01;
  ribbons.forEach((ribbon,i)=>{ribbon.rotation.z=Math.sin(time*2+i*.38)*.05;});
 };
}

function seahorse(group,body,accent){
 sweep(group,body,[[0,.27,-.007,.085],[0,.378,-.016,.094],[0,.516,.024,.077],[0,.562,.036,.053]],{depth:.72});
 oval(group,accent,[0,.352,.04],[.066,.114,.054]);
 oval(group,body,[0,.54,.065],[.083,.079,.093]);
 sweep(group,body,[[0,.535,.092,.049],[0,.506,.173,.034],[0,.489,.23,.026]],{depth:.80});
 const tail=[[0,.291,-.024,.059],[0,.204,-.061,.047],[0,.112,-.058,.037],[0,.071,.007,.028],[0,.102,.065,.020],[0,.147,.046,.013],[0,.149,.013,.003]];
 sweep(group,body,tail,{depth:.8});
 for(const side of sides){
  eye(group,[side*.067,.565,.112],.020,'#968561',side*.8);
  for(let i=0;i<5;i++)oval(group,accent,[side*.069,.275+i*.038,-.012],[.009,.009,.074]);
 }
 silhouette(group,accent,[[0,0],[-.12,.029],[-.108,.095],[0,.123]],[0,.333,-.070]).rotation.y=Math.PI/2;
}

function manta(group,body,accent){
 oval(group,body,[0,.354,0],[.165,.058,.242]);
 oval(group,accent,[0,.332,.024],[.154,.037,.205]);
 const wings=[],finOutline=[[0,.109],[.25,.091,.50,-.084],[.48,-.147,.383,-.141],[.135,-.226,0,-.147]];
 for(const side of sides){
  const wing=new THREE.Group();wing.position.set(side*.034,.342,.006);wing.scale.x=side;group.add(wing);wings.push({wing,side});
  silhouette(wing,body,finOutline,[0,0,0],.030).rotation.x=-Math.PI/2;
  silhouette(wing,accent,[[.026,.088],[.22,.05,.425,-.094],[.18,-.172,.026,-.12]],[0,-.011,0],.012).rotation.x=-Math.PI/2;
  sweep(group,body,[[side*.119,.347,.145,.037],[side*.133,.325,.224,.023],[side*.111,.341,.275,.004]]);
  eye(group,[side*.14,.362,.147],.017,'#85735f',side*.92);
  for(let i=0;i<4;i++)oval(group,accent,[side*(.065+i*.019),.326,.195-i*.042],[.013,.003,.018],side*.30);
 }
 sweep(group,body,[[0,.342,-.159,.038],[0,.335,-.287,.019],[.045,.354,-.414,.012],[.063,.366,-.585,.003]]);
 group.userData.petAnimate=time=>{for(const {wing,side} of wings)wing.rotation.z=side*Math.sin(time*2.6)*.22;};
}

export function crab(group,body,accent,mechanical=false){
 const dark=surface('#57443e',mechanical?'rubber':'skin');
 oval(group,body,[0,.184,-.022],[.195,.091,.132]);
 oval(group,accent,[0,.154,.007],[.164,.057,.112]);
 for(const side of sides){
  for(let i=0;i<4;i++){
   const z=.081-i*.062;
   sweep(group,body,[[side*.134,.16,z,.027],[side*(.213+i*.012),.165,z-.019,.025],[side*(.267+i*.012),.079,z+.002,.022],[side*(.324+i*.012),.02,z+.028,.008]]);
   if(mechanical)oval(group,accent,[side*(.213+i*.012),.165,z-.019],[.037,.037,.035]);
  }
  sweep(group,body,[[side*.132,.167,.072,.047],[side*.207,.208,.149,.038],[side*.261,.24,.219,.049]]);
  oval(group,body,[side*.265,.242,.24],[.076,.049,.063]);
  for(const sign of sides)sweep(group,sign===1?body:accent,[[side*(.258+sign*.027),.242,.248,.043],[side*(.271+sign*.035),.254,.309,.03],[side*(.268+sign*.007),.254,.36,.003]]);
  sweep(group,body,[[side*.071,.222,.071,.017],[side*.087,.269,.102,.011]]);
  eye(group,[side*.09,.274,.115],.021,mechanical?'#6bd9df':'#8b6951',side*.45);
  oval(group,dark,[side*.125,.23,.074],[.027,.012,.03]);
 }
}

export function waterPet(group,item){
 const body=surface(item.color,'skin'),accent=surface(item.accent,'skin');
 switch(item.kind){
  case 'octopus':octopus(group,body,accent);break;
  case 'jellyfish':jellyfish(group,item);break;
  case 'seahorse':seahorse(group,body,accent);break;
  case 'manta':manta(group,body,accent);break;
  case 'crab':crab(group,body,accent);break;
 }
}
