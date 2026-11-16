// Shared by the rules, aiming preview, and stadium so the visible posts
// and the scoring plane always agree. Distances use the game's yard units.
export const GOALPOST={z:60,halfWidth:3.083,crossbar:3.333,uprightHeight:7,barRadius:.075,ballRadius:.13};
export const KICK_DROP=8;
export const KICK_CLEARANCE=GOALPOST.barRadius+GOALPOST.ballRadius;
export const POINTS_TO_WIN=21;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function kickVelocity(direction,aim,power,weather){
 const p=clamp(Number.isFinite(power)?power:.8,0,1),a=clamp(Number.isFinite(aim)?aim:0,-1,1)*.23,angle=.55,speed=Math.sqrt((12+p*70)*9.8/Math.sin(2*angle)),horizontal=speed*Math.cos(angle);
 return {vx:-direction*Math.sin(a)*horizontal,vy:Math.sin(angle)*speed,vz:direction*Math.cos(a)*horizontal,ax:weather?.kind==='wind'?weather.windX||0:0,az:weather?.kind==='wind'?weather.windZ||0:0};
}
export function kickPosition(ball,time){const t=Math.max(0,time);return {x:ball.from.x+ball.vx*t+.5*(ball.ax||0)*t*t,y:.28+ball.vy*t-4.9*t*t,z:ball.from.z+ball.vz*t+.5*(ball.az||0)*t*t};}
export function goalCrossing(ball){
 const dz=ball.goalZ-ball.from.z,az=ball.az||0,discriminant=ball.vz*ball.vz+2*az*dz;
 const t=Math.abs(az)<1e-8?dz/ball.vz:discriminant<0?Infinity:Math.min(...[(-ball.vz+Math.sqrt(discriminant))/az,(-ball.vz-Math.sqrt(discriminant))/az].filter(t=>t>0));
 if(!Number.isFinite(t)||t<=0){const landing=(ball.vy+Math.sqrt(ball.vy*ball.vy+4*4.9*.28))/9.8;return {...kickPosition(ball,landing),time:landing,reachable:false};}
 return {...kickPosition(ball,t),time:t};
}
export function kickIsGood(ball){const p=goalCrossing(ball);return p.reachable!==false&&p.time>0&&p.y>GOALPOST.crossbar+KICK_CLEARANCE+1e-6&&Math.abs(p.x)<GOALPOST.halfWidth-KICK_CLEARANCE-1e-6;}
export function kickDistance(line,direction){return Math.round(GOALPOST.z-line*direction+KICK_DROP);}
