import {OFFENSE_FORMATION,ROUTES,RUN_PLAYS} from './playbook.js?v=playdiagram1';
import {KICK_DROP} from './kicking.js?v=placekicks1';

const point=({x,depth})=>[x,depth];
const fieldGoalUnit=OFFENSE_FORMATION.map((_,slot)=>{
 if(slot===0)return {role:'K',x:-2,depth:-KICK_DROP-2.6};
 if(slot===5)return {role:'H',x:.65,depth:-KICK_DROP-.25};
 if(slot===8)return {role:'LS',x:0,depth:-.5};
 return {role:'B',x:(slot-5)*1.5,depth:-.5};
});
const puntUnit=OFFENSE_FORMATION.map((player,slot)=>({
 ...player,role:slot===0?'P':slot===8?'LS':slot===1||slot===2?'G':'B'
}));
const standardPassEnds={
 deep:[[-21,43],[21,43],[-10,43],[10,30],[-6,14]],
 slant:[[7,27],[-7,27],[13,27],[-4,27],[6,27]]
};

export function playDiagram(play){
 const placeKick=play.id==='fieldGoal',punt=play.id==='punt';
 const players=placeKick?fieldGoalUnit:punt?puntUnit:OFFENSE_FORMATION;
 const actions=[];
 const add=(slot,kind,...stops)=>actions.push({slot,kind,points:[point(players[slot]),...stops]});
 const block=slot=>add(slot,'block',[players[slot].x,3]);
 const run=RUN_PLAYS[play.id];

 if(placeKick){
  players.forEach(({role},slot)=>{if(role==='B')block(slot);});
  add(8,'exchange',point(players[5]));
  add(0,'kick',[0,-KICK_DROP],[0,39]);
 }else if(punt){
  players.forEach(({x,role},slot)=>{if(slot!==0)add(slot,'coverage',[x,role==='G'?22:12]);});
  add(8,'exchange',point(players[0]));
  add(0,'ball',[0,45]);
 }else if(run){
  if(run.runner===5)add(0,'exchange',point(players[5]));
  const openingLane=run.startLane??run.lane;
  add(run.runner,'ball',[openingLane*.55,-(run.startDepth??(run.runner===0?5:3.8))],[run.lane,2],[run.lane,14]);
  players.forEach((_,slot)=>{if(slot!==0&&slot!==run.runner)block(slot);});
 }else{
  players.forEach((_,slot)=>{if(slot>=6)block(slot);});
  for(let slot=1;slot<=5;slot++){
   const route=ROUTES[play.id]?.[slot];
   add(slot,slot===(play.target||1)?'ball':'route',...(route?.slice(1)||[standardPassEnds[play.id][slot-1]]));
  }
 }
 return {players,actions};
}

const fieldColor='#203d34';
const routeColors={route:'#a9d7be',coverage:'#a9d7be',ball:'#ffd376',kick:'#ffd376',block:'#8bc8f0',exchange:'#ffd376'};
const width=228,height=126,lineY=81;
export function drawPlayDiagram(canvas,play){
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 const {players,actions}=playDiagram(play),placeKick=play.id==='fieldGoal';
 const maxDepth=Math.max(14,...actions.flatMap(action=>action.points.map(p=>p[1])));
 const x=yards=>width/2+(placeKick?yards*12:Math.sign(yards)*(5.85*Math.min(11,Math.abs(yards))+2.1*Math.max(0,Math.abs(yards)-11)));
 const y=depth=>depth<0
  ?lineY+(placeKick?-depth*3.42:-depth*4+Math.max(0,-depth-5)*3)
  :lineY-2.9*Math.min(depth,7)-Math.max(0,depth-7)*(lineY-30.3)/(maxDepth-7);

 ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
 ctx.fillStyle=fieldColor;ctx.fillRect(0,0,width,height);
 for(const depth of [5,10,20,30,40])if(depth<maxDepth){
  ctx.strokeStyle='#a7c9b526';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(7,y(depth));ctx.lineTo(width-7,y(depth));ctx.stroke();
 }
 ctx.strokeStyle='#b7d5c183';ctx.setLineDash([4,4]);ctx.lineWidth=1.2;
 ctx.beginPath();ctx.moveTo(7,lineY);ctx.lineTo(width-7,lineY);ctx.stroke();
 ctx.lineCap=ctx.lineJoin='round';

 // Draw blocks and secondary routes beneath the highlighted first read or runner.
 for(const {kind,points} of [...actions].sort((a,b)=>Number(a.kind==='ball'||a.kind==='kick')-Number(b.kind==='ball'||b.kind==='kick'))){
  const path=points.map(([px,py])=>[x(px),y(py)]);
  const bent=kind==='kick'?[path[1],path[2]]:path;
  if(kind==='kick'){
   ctx.strokeStyle=routeColors.exchange;ctx.lineWidth=1.65;ctx.setLineDash([3,3]);
   ctx.beginPath();ctx.moveTo(...path[0]);ctx.lineTo(...path[1]);ctx.stroke();
  }
  ctx.strokeStyle=ctx.fillStyle=routeColors[kind];
  ctx.lineWidth=kind==='ball'||kind==='kick'?2.45:1.65;
  ctx.setLineDash(kind==='exchange'?[3,3]:[]);
  ctx.beginPath();
  bent.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));
  ctx.stroke();
  ctx.setLineDash([]);
  if(kind==='exchange')continue;
  const [tx,ty]=bent.at(-1),[px,py]=bent.at(-2),angle=Math.atan2(ty-py,tx-px);
  ctx.beginPath();
  if(kind==='block'){
   ctx.moveTo(tx-4*Math.sin(angle),ty+4*Math.cos(angle));
   ctx.lineTo(tx+4*Math.sin(angle),ty-4*Math.cos(angle));ctx.stroke();
  }else{
   ctx.moveTo(tx,ty);
   for(const turn of [-.5,.5])ctx.lineTo(tx-5.8*Math.cos(angle+turn),ty-5.8*Math.sin(angle+turn));
   ctx.closePath();ctx.fill();
  }
 }

 const featured=play.kind==='kick'?0:RUN_PLAYS[play.id]?.runner??(play.target||1);
 players.forEach(({role,x:across,depth},slot)=>{
  const cx=x(across),cy=y(depth),highlight=slot===featured,lineman=slot>=6&&!placeKick&&play.id!=='punt';
  ctx.font=`700 ${lineman?10:11}px system-ui,sans-serif`;
  const w=ctx.measureText(role).width+(lineman?2:4);
  ctx.fillStyle=highlight?'#805628':lineman?'#244658':'#2c5446';
  ctx.strokeStyle=highlight?'#ffd376':lineman?'#8bc8f0':'#a9d7be';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(cx-w/2,cy-6.4,w,12.8,3);ctx.fill();ctx.stroke();
  ctx.fillStyle=highlight?'#fff3cc':'#f2faf5';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(role,cx,cy+.1);
 });
}
