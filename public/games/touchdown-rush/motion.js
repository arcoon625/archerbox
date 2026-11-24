const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const line=new Set(['LT','LG','C','RG','RT','DT','DE']);
const defensiveStance=new Set(['LB','CB','S']);

function poseCurve(keys,time){
 const next=keys.findIndex(key=>key[0]>time);
 if(next<0)return keys.at(-1).slice(1);
 if(next===0)return keys[0].slice(1);
 const [start,...from]=keys[next-1],[end,...to]=keys[next],t=smooth((time-start)/(end-start));
 return from.map((value,i)=>mix(value,to[i],t));
}

function plantLeg(rig,i,ankleY,ankleZ,footAngle){
 const thigh=.43,shin=.40,dy=ankleY-rig.legs[i].position.y,dz=ankleZ;
 const reach=clamp(Math.hypot(dy,dz),.10,thigh+shin-.0001);
 const bend=Math.acos(clamp((reach**2-thigh**2-shin**2)/(2*thigh*shin),-1,1));
 const hip=Math.atan2(-dz,-dy)+Math.acos(clamp((thigh**2+reach**2-shin**2)/(2*thigh*reach),-1,1));
 rig.legs[i].rotation.set(hip,0,0);
 rig.knees[i].rotation.set(-bend,0,0);
 rig.ankles[i].rotation.set(footAngle-hip+bend,0,0);
}

const releasePose=[
 // Time, throwing shoulder pitch and spread, elbow bend, trunk turn and lean.
 [0,.30,-.32,1.43,-.08,-.06],
 [.085,-2.26,.64,.58,.36,.025],
 [.145,-3.22,.60,.81,.19,.005],
 [.205,-4.41,.29,.18,-.22,-.12],
 [.33,-4.83,-.48,.48,-.43,-.24],
 [.57,-6.09,.13,.44,0,-.04]
];

function throwPass(rig,time,run){
 const [shoulder,spread,elbow,twist,lean]=poseCurve(releasePose,time);
 const blend=1-smooth((time-.45)/.15),armPitch=time>.35?shoulder+2*Math.PI:shoulder;
 rig.arms[1].rotation.set(mix(rig.arms[1].rotation.x,armPitch,blend),-.18*blend,mix(rig.arms[1].rotation.z,spread,blend));
 rig.elbows[1].rotation.x=mix(rig.elbows[1].rotation.x,elbow,blend);
 rig.upperBody.rotation.y+=twist*blend;
 rig.upperBody.rotation.x=mix(rig.upperBody.rotation.x,lean,blend);
 rig.arms[0].rotation.x+=.54*blend;
 rig.elbows[0].rotation.x+=.32*blend;
 if(run<.28){
  plantLeg(rig,0,.16,-.21*smooth(time/.18)*blend,0);
  plantLeg(rig,1,.16,.17*smooth(time/.18)*blend,-.12*blend);
 }
}

function receivePass(rig,reach,height,tuck){
 for(let i=0;i<2;i++){
  const side=i===0?-1:1,shoulder=mix(1.38+height*.73,i===1?.31:.56,tuck);
  const elbow=mix(.22+Math.max(0,height)*.22,i===1?1.64:1.14,tuck);
  rig.arms[i].rotation.set(mix(rig.arms[i].rotation.x,shoulder,reach),0,mix(rig.arms[i].rotation.z,-side*(.21+tuck*.20),reach));
  rig.elbows[i].rotation.set(mix(rig.elbows[i].rotation.x,elbow,reach),side*.12,0);
  rig.hands[i].rotation.x=-.18*reach*(1-tuck);
 }
 rig.head.rotation.x+=height*.19*reach*(1-tuck);
}

function takeContact(root,rig,contact){
 const {time,side=1,role}=contact,wrap=smooth(time/.19),fall=smooth((time-.11)/.47),attacker=role==='tackler';
 const hip=mix(rig.upperBody.position.y,.82-.25*fall,wrap);
 rig.upperBody.position.y=hip;
 rig.upperBody.rotation.x=mix(rig.upperBody.rotation.x,-.29,wrap);
 rig.upperBody.rotation.y=mix(rig.upperBody.rotation.y,side*.30,wrap);rig.upperBody.rotation.z=side*.13*fall;
 rig.head.rotation.set(.17*wrap,-side*.11*wrap,0);
 for(let i=0;i<2;i++){
  rig.legs[i].position.y=hip-.015;
  plantLeg(rig,i,.16+.11*fall,i===0?-.23:.26,.30*fall);
  rig.arms[i].rotation.x=mix(rig.arms[i].rotation.x,attacker?1.29:i===1?.29:.81,wrap);
  rig.arms[i].rotation.z=mix(rig.arms[i].rotation.z,(i===0?-1:1)*(attacker?-.25:.32),wrap);
  rig.elbows[i].rotation.x=mix(rig.elbows[i].rotation.x,attacker?.91:i===1?1.65:.67,wrap);
 }
 root.rotation.x=-1.38*fall;
 root.rotation.z=side*.27*fall;
 root.position.y=root.scale.y*.21*fall;
}

export function animatePlayer(root,actor,time,context={}){
 const rig=root.userData;if(!rig.elbows)return;
 const speed=clamp(actor.moving||0,0,11),run=clamp(speed/8.4,0,1),id=actor.id||0;
 const stride=rig.stride??={time,phase:(time*1.25+id*.189)%1};
 stride.phase=(stride.phase+clamp(time-stride.time,0,.09)*(1.12+speed*.173))%1;
 stride.time=time;
 const duty=.56-.23*run;
 const wave=Math.sin(stride.phase*2*Math.PI),stance=context.ready&&(line.has(actor.role)||defensiveStance.has(actor.role));
 const hip=1.04-run*.167-(stance?.11:0)+Math.abs(wave)*.032*run+Math.sin(time*2.1+id)*.002*(1-run);
 rig.upperBody.position.set(wave*.023*run,hip,0);
 rig.upperBody.rotation.set(-run*.20-(stance?.26:0),wave*.115*run,actor.juke>0?Math.sin(time*10)*.14:-wave*.041*run);
 rig.head.rotation.set(run*.115,Math.sin(time*.65+id)*.031-wave*.06*run,wave*.023*run);
 for(let i=0;i<2;i++){
  const side=i===0?-1:1,phase=(stride.phase+i*.5)%1,contact=phase<duty;
  const swing=clamp((phase-duty)/(1-duty),0,1),drive=contact?phase/duty:smooth(swing);
  const footZ=(contact?mix(-.46,.36,drive):mix(.36,-.46,drive))*run+(stance?side*.12:0);
  const lift=contact?0:Math.sin(swing*Math.PI)*(.19+.11*run)*run;
  const footPitch=contact?-.30*smooth((drive-.70)/.30)*run:mix(-.30,.12,smooth(swing))*run;
  rig.legs[i].position.y=hip-.015;
  plantLeg(rig,i,.16+lift,footZ,footPitch);
  rig.arms[i].rotation.set((-footZ*1.25)+(stance?.54:.08),side*.065*run,side*(.075+.06*run));
  rig.elbows[i].rotation.set(.30+run*(.84+.23*Math.max(0,footZ))+(stance?.29:0),0,0);
  rig.hands[i].rotation.set(0,0,0);
 }
 if(context.blocking){
  rig.upperBody.rotation.x=-.25;
  for(let i=0;i<2;i++){
   rig.arms[i].rotation.set(1.24+Math.sin(time*15+i)*.12,0,i===0?-.18:.18);
   rig.elbows[i].rotation.x=.63;
   plantLeg(rig,i,.16,i===0?-.19:.17,0);
  }
 }
 if(context.holdingKick){
  rig.upperBody.position.y=.71;rig.upperBody.rotation.x=-.23;
  for(let i=0;i<2;i++){
   const side=i===0?-1:1;
   rig.legs[i].position.y=.695;
   plantLeg(rig,i,.16,side*.35,side===1?.68:0);
   rig.arms[i].rotation.set(.32,0,side*.16);rig.elbows[i].rotation.x=.30;
  }
 }
 if(context.carrier){
  rig.arms[1].rotation.set(.31,-.10,-.13);rig.elbows[1].rotation.x=1.64;
  rig.hands[1].rotation.set(-.09,.14,0);rig.upperBody.rotation.y-=.09;
 }
 if(context.quarterback){
  rig.arms[0].rotation.set(.32,0,.44);rig.arms[1].rotation.set(.33,0,-.38);
  rig.elbows[0].rotation.set(1.36,-.37,0);rig.elbows[1].rotation.set(1.42,.32,0);
 }
 if(context.catching||context.catchReach>0){
  receivePass(rig,context.catchReach??1,clamp(context.catchHeight??.23,-.65,1.1),clamp(context.catchTuck??0,0,1));
 }
 if(context.throwTime!==undefined)throwPass(rig,context.throwTime,run);
 if(context.kickTime!==undefined&&context.kickTime<.65){
  const kick=Math.sin(context.kickTime/.65*Math.PI);
  rig.legs[1].rotation.x=kick*1.42;rig.knees[1].rotation.x=-.15-kick*.2;rig.upperBody.rotation.x=kick*.10;
 }
 if(context.tackle)takeContact(root,rig,context.tackle);
}
