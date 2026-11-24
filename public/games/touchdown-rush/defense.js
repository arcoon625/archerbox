export const DEFENSIVE_PLAYS=[
 {id:'man',name:'Man',key:'1',code:'Digit1',detail:'Stick with receivers. Two safeties help deep.'},
 {id:'blitz',name:'Blitz',key:'2',code:'Digit2',detail:'Send seven after the QB. Watch for quick passes.'},
 {id:'zone',name:'Zone',key:'3',code:'Digit3',detail:'Guard areas of the field and break on the throw.'}
];
export const CPU_DEFENSE_CALL_SECONDS=5;
export const defenseForKey=code=>DEFENSIVE_PLAYS.find(play=>play.code===code);

const FRONTS=[[-6,-2,2,6],[-7.2,-3.7,3.7,7.2],[-5.2,-1.1,1.1,5.2],[-6.8,-3.3,3.3,6.8]];
const STANDARD=[[10,6],[0,7],[-10,6],[-19,3.8],[19,3.8],[-8,16],[8,16]];
const BLITZ=[[8.6,2.8],[0,3.3],[-8.6,2.8],[-19,4.4],[19,4.4],[-8,15],[8,15]];
const ZONE=[[10,5],[0,5.8],[-10,5],[-19,6.5],[19,6.5],[-9,13],[9,13]];
const ZONE_DROPS=[[10,8],[0,10],[-10,8],[-20,9],[20,9],[-11,20],[11,20]];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function defensiveAlignment(call,front,slot){
 if(slot<4)return [FRONTS[front][slot],1.8];
 return (call==='blitz'?BLITZ:call==='zone'?ZONE:STANDARD)[slot-4];
}

export function zoneTarget(slot,line,dir,ball){
 const [x,depth]=ZONE_DROPS[slot-4],z=clamp(line+dir*depth,-49,49);
 // Only defenders near the ball's landing point leave their zones.
 if(ball&&Math.abs(ball.x-x)<=10&&Math.abs(ball.z-z)<=9)return ball;
 return {x,z};
}
