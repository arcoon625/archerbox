const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const TURN_SPEED=2.35;
// Steering turns the view, while forward/backward movement follows that heading.
// Keep the turn rate tied to simulation time, so holding a direction cannot
// feed the changing camera angle back into the steering speed.
export function steer(yaw,turn,forward,dt){
 const heading=Number.isFinite(yaw)?yaw:0,amount=Number.isFinite(turn)?clamp(turn,-1,1):0,step=Number.isFinite(dt)?clamp(dt,0,.05):0;
 const next=heading-amount*TURN_SPEED*step;
 return {x:0,z:Number.isFinite(forward)?clamp(forward,-1,1):0,yaw:Math.atan2(Math.sin(next),Math.cos(next))};
}
export const stickTurn=value=>Number.isFinite(value)&&Math.abs(value)>.12?Math.sign(value)*(Math.min(1,Math.abs(value))-.12)/.88:0;
