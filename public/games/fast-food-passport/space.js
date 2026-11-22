export const START={x:0,z:-4.6};
export const LIMITS={left:-6.9,right:6.9,back:-5.6,front:-.98};
export const STATIONS=[
 {id:'prep',label:'Prep Station',short:'Prep',x:3.8,z:-1.10,y:1.92,color:'#729e8d'},
 {id:'counter',label:'Order & Pickup',short:'Counter',x:0,z:-1.10,y:1.92,color:'#d7ac5d'},
 {id:'cook',label:'Cooking Station',short:'Cook',x:-3.8,z:-1.10,y:1.92,color:'#bd765f'},
];
export const nearStation=({x,z})=>STATIONS.find(station=>Math.hypot(x-station.x,z-station.z)<1.24);

export function move(position,x,z,dt,speed=3.70){
 const length=Math.hypot(x,z);
 if(length<.001)return;
 position.x=Math.max(LIMITS.left,Math.min(LIMITS.right,position.x+x/length*speed*dt));
 position.z=Math.max(LIMITS.back,Math.min(LIMITS.front,position.z+z/length*speed*dt));
}
export function relative(heading,side,forward){
 return {x:Math.sin(heading)*forward-Math.cos(heading)*side,z:Math.cos(heading)*forward+Math.sin(heading)*side};
}
export function turnToward(current,goal,dt){
 const difference=goal-current;
 return current+Math.atan2(Math.sin(difference),Math.cos(difference))*(1-Math.exp(-dt*13));
}
