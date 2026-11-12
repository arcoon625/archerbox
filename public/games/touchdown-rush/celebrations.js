export const CELEBRATIONS = [
 {id:'spike',name:'Spike the Ball',icon:'↓',detail:'Raise it high. Slam it down.'},
 {id:'griddy',name:'Griddy',icon:'♫',detail:'Heel steps, arm swings, victory vibes.'},
 {id:'dance',name:'Touchdown Dance',icon:'★',detail:'Side steps and a spinning finish.'},
 {id:'pose',name:'Victory Pose',icon:'✦',detail:'Flex, point to the sky, take a bow.'},
 {id:'backflip',name:'Backflip',icon:'↶',detail:'One big flip. Stick the landing.'}
];
export const CELEBRATION_DURATION=6;
export const celebrationById=id=>CELEBRATIONS.find(c=>c.id===id)||CELEBRATIONS[0];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t)};
// Local player coordinates: feet at zero, front faces -Z. Ball can follow a hand or fly freely.
export function celebrationPose(id,seconds){
 const t=clamp(seconds,0,CELEBRATION_DURATION),fade=1-smooth((t-5.3)/.7);
 const p={x:0,y:0,z:0,rx:0,ry:0,rz:0,arms:[[0,0,0],[0,0,0]],legs:[[0,0,0],[0,0,0]],ball:{hand:true,x:.4,y:1.1,z:-.2,rx:.25,ry:0,rz:Math.PI/3}};
 switch(celebrationById(id).id){
 case 'spike':{
  const lift=smooth(t/.65),slam=smooth((t-.8)/.22);
  p.arms[1]=[-2.9*lift+3.5*slam,0,-.15];p.arms[0]=[-.35*lift,0,-.5*lift];p.rx=.17*slam;p.legs[0][0]=-.2*slam;
  if(t<.8){p.ball={...p.ball,x:.56,y:1.43-.51*Math.cos(-2.9*lift),z:.51*Math.sin(-2.9*lift)}}
  else {const flight=t-.8,fall=clamp(flight/.23),bounce=flight<.23?0:Math.abs(Math.sin((flight-.23)*7))*Math.exp(-(flight-.23)*2.4);p.ball={hand:false,x:.6,y:1.93*(1-fall)+.24+bounce*.9,z:-.4-Math.min(flight,2)*.5,rx:flight*10,ry:flight*3,rz:1.3};}
  if(t>1.5){p.rx=0;p.arms[0]=[-2.3,0,-.6];p.arms[1]=[-2.3,0,.6];p.y=Math.max(0,Math.sin((t-1.5)*5))*.12;}
  break;
 }
 case 'griddy':{
  const beat=t*9,step=Math.sin(beat);p.x=Math.sin(t*2)*.48;p.z=-Math.sin(t*1.3)*.4;p.y=Math.abs(step)*.12;p.rx=.14;p.rz=Math.sin(beat)*.06;
  p.legs[0]=[step*.62,0,-.08];p.legs[1]=[-step*.62,0,.08];p.arms[0]=[-.5-step*.65,0,-.22];p.arms[1]=[-.5+step*.65,0,.22];
  if(t>2.1&&t<3){p.arms=[[-2.5,-.35,-.15],[-2.5,.35,.15]];}
  p.ball={...p.ball,hand:false,x:-1.15,y:.24,z:.3,rx:0,rz:Math.PI/2};break;
 }
 case 'dance':{
  const beat=t*7;p.x=Math.sin(beat/2)*.65;p.y=Math.abs(Math.sin(beat))*.2;p.rz=Math.sin(beat/2)*.14;p.ry=t>2?Math.PI*2*smooth((t-2)/1.8):0;
  p.arms=[[-1.4+Math.sin(beat)*.6,0,-.9],[-1.4-Math.sin(beat)*.6,0,.9]];p.legs=[[Math.sin(beat)*.4,0,-.12],[-Math.sin(beat)*.4,0,.12]];
  p.ball={...p.ball,hand:false,x:-1.25,y:.24,z:.3,rz:Math.PI/2};break;
 }
 case 'pose':{
  const rise=smooth(t/.6);p.legs=[[0,0,-.16],[0,0,.16]];p.arms=[[-1.8*rise,0,-1.0*rise],[-1.8*rise,0,1.0*rise]];
  if(t>1.7){p.arms=[[-.3,0,-.3],[-Math.PI,0,.12]];p.ry=-.18;}
  if(t>3.5){p.rx=.45*Math.sin(clamp((t-3.5)/1.5)*Math.PI);p.arms=[[-.25,0,-.3],[-.25,0,.3]];}
  p.ball={...p.ball,hand:false,x:1.15,y:.24,z:.4,rz:Math.PI/2};break;
 }
 case 'backflip':{
  if(t<.7){const crouch=Math.sin(t/.7*Math.PI/2);p.y=-.22*crouch;p.rx=.2*crouch;p.legs=[[.48*crouch,0,0],[.48*crouch,0,0]];p.arms=[[.8*crouch,0,-.1],[.8*crouch,0,.1]];}
  else if(t<2.3){const u=(t-.7)/1.6,angle=2*Math.PI*smooth(u);p.rx=angle;p.y=3.0*Math.sin(Math.PI*u)+.95*(1-Math.cos(angle));p.z=.95*Math.sin(angle);p.legs=[[-.7*Math.sin(Math.PI*u),0,0],[-.7*Math.sin(Math.PI*u),0,0]];p.arms=[[-2.7,0,-.15],[-2.7,0,.15]];}
  else {p.y=-.15*Math.max(0,1-(t-2.3)/.3);p.arms=[[-2.5,0,-.6],[-2.5,0,.6]];}
  p.ball={...p.ball,hand:false,x:1.2,y:.24,z:.3,rz:Math.PI/2};break;
 }
 }
 for(const k of ['x','y','z','rx','ry','rz'])p[k]*=fade;
 p.arms=p.arms.map(r=>r.map(n=>n*fade));p.legs=p.legs.map(r=>r.map(n=>n*fade));
 return p;
}
