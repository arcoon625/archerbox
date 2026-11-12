// Shared by the rules, aiming preview, and stadium so the visible posts
// and the scoring plane always agree. Distances use the game's yard units.
export const GOALPOST={z:60,halfWidth:3.083,crossbar:3.333,uprightHeight:7,barRadius:.075,ballRadius:.13};
export const KICK_DROP=8;
export const KICK_CLEARANCE=GOALPOST.barRadius+GOALPOST.ballRadius;
export const POINTS_TO_WIN=21;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function kickVelocity(direction,aim,power){
 const p=clamp(Number.isFinite(power)?power:.8,0,1),a=clamp(Number.isFinite(aim)?aim:0,-1,1)*.23,angle=.55,speed=Math.sqrt((12+p*70)*9.8/Math.sin(2*angle)),horizontal=speed*Math.cos(angle);
 return {vx:-direction*Math.sin(a)*horizontal,vy:Math.sin(angle)*speed,vz:direction*Math.cos(a)*horizontal};
}
export function kickPosition(ball,time){const t=Math.max(0,time);return {x:ball.from.x+ball.vx*t,y:.28+ball.vy*t-4.9*t*t,z:ball.from.z+ball.vz*t};}
export function goalCrossing(ball){const t=(ball.goalZ-ball.from.z)/ball.vz;return {...kickPosition(ball,t),time:t};}
export function kickIsGood(ball){const p=goalCrossing(ball);return p.time>0&&p.y>GOALPOST.crossbar+KICK_CLEARANCE+1e-6&&Math.abs(p.x)<GOALPOST.halfWidth-KICK_CLEARANCE-1e-6;}
export function kickDistance(line,direction){return Math.round(GOALPOST.z-line*direction+KICK_DROP);}
