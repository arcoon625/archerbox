export const COLORS=[{name:'RED',hex:'#f45c64',symbol:'▲'},{name:'BLUE',hex:'#4793f8',symbol:'●'},{name:'YELLOW',hex:'#ffd65c',symbol:'★'},{name:'GREEN',hex:'#4bd3a2',symbol:'◆'},{name:'PURPLE',hex:'#ab7bf0',symbol:'✦'},{name:'ORANGE',hex:'#ff9b4e',symbol:'■'}];
export const SIZE=7,TILE=2.4,EDGE=SIZE*TILE/2;
export const MODES={chill:{name:'CHILL',first:6.5,min:4.5,speed:6.8},normal:{name:'QUICK',first:5,min:3,speed:6.8},expert:{name:'TURBO',first:4,min:2.2,speed:7.3}};
export const NAMES=['VOLT','BLAZE','ECHO','NOVA','AXEL','PIXEL','DASH'];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function rng(seed){const random=()=>{random.state=(random.state+0x6D2B79F5)>>>0;let t=random.state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};random.state=seed>>>0;return random}
export function cellAt(x,z){const col=Math.floor((x+EDGE)/TILE),row=Math.floor((z+EDGE)/TILE);return col>=0&&col<SIZE&&row>=0&&row<SIZE?row*SIZE+col:-1}
export function cellCenter(i){return{x:(i%SIZE+.5)*TILE-EDGE,z:(Math.floor(i/SIZE)+.5)*TILE-EDGE}}
export function createGame(mode='chill',seed=Date.now()){
 const random=rng(seed),g={mode,random,round:0,maxRounds:10,phase:'intro',elapsed:0,duration:2,board:[],target:0,ended:false,result:null,safeRounds:0,totalTime:0,actors:[]};
 g.actors=[{name:'YOU',x:0,z:3,y:0,vy:0,alive:true,player:true,grounded:true,moving:0,yaw:0},...NAMES.map((name,i)=>({name,x:(i%4-1.5)*3,z:(Math.floor(i/4)-.5)*5,y:0,vy:0,alive:true,grounded:true,moving:0,yaw:0,speed:5.1+random()*.7}))];
 beginRound(g);g.phase='intro';g.duration=2;return g;
}
export function beginRound(g){
 g.round++;g.elapsed=0;g.phase='rush';g.duration=Math.max(MODES[g.mode].min,MODES[g.mode].first-(g.round-1)*.23);
 g.board=Array.from({length:SIZE*SIZE},(_,i)=>i%COLORS.length);for(let i=g.board.length-1;i>0;i--){const j=Math.floor(g.random()*(i+1));[g.board[i],g.board[j]]=[g.board[j],g.board[i]]}
 let next=Math.floor(g.random()*COLORS.length);if(next===g.target&&g.round>1)next=(next+1)%COLORS.length;g.target=next;
 for(const a of g.actors)if(!a.player&&a.alive){const hit=g.random()<.98-g.round*.025,choices=g.board.map((color,i)=>({color,i})).filter(c=>hit?c.color===g.target:c.color!==g.target);choices.sort((a1,b)=>{const p=cellCenter(a1.i),q=cellCenter(b.i);return Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z)});const choice=choices[Math.min(choices.length-1,Math.floor(g.random()*Math.min(3,choices.length)))],center=cellCenter(choice.i);a.goal={x:center.x+(g.random()-.5)*1.0,z:center.z+(g.random()-.5)*1.0};a.wait=.4+g.random()*Math.min(1.4,g.duration*.3)}
}
export function supported(g,a){const cell=cellAt(a.x,a.z);return cell>=0&&(g.phase!=='drop'||g.board[cell]===g.target)}
export function step(g,input,dt){
 if(g.ended)return;g.totalTime+=dt;g.elapsed+=dt;
 for(const a of g.actors){if(!a.alive){a.vy-=22*dt;a.y+=a.vy*dt;continue}let dx=0,dz=0;
  if(a.player){const controls=typeof input==='function'?input(a):input;dx=controls.x||0;dz=controls.z||0;if(controls.jump&&a.grounded){a.vy=7.2;a.grounded=false}}
  else if(g.phase==='rush'||g.phase==='drop'){if(g.elapsed>a.wait||g.phase==='drop'){const x=a.goal.x-a.x,z=a.goal.z-a.z,dist=Math.hypot(x,z);if(dist>.06){dx=x/dist;dz=z/dist;const scale=Math.min(1,dist/(a.speed*dt));dx*=scale;dz*=scale}}}
  const magnitude=Math.hypot(dx,dz);if(magnitude>1){dx/=magnitude;dz/=magnitude}const speed=a.player?MODES[g.mode].speed:a.speed;a.x=clamp(a.x+dx*speed*dt,-EDGE+.35,EDGE-.35);a.z=clamp(a.z+dz*speed*dt,-EDGE+.35,EDGE-.35);a.moving=Math.hypot(dx,dz);if(a.moving>.01)a.yaw=Math.atan2(-dx,-dz);
  a.vy-=22*dt;a.y+=a.vy*dt;const floor=supported(g,a);if(a.y<=0&&floor&&a.vy<=0){a.y=0;a.vy=0;a.grounded=true}else if(!floor||a.y>0)a.grounded=false;
  if(a.y< -3.5){a.alive=false;a.grounded=false;if(a.player&&!g.multiplayer){g.ended=true;g.result='loss'}}
 }
 if(g.multiplayer&&!g.actors.some(a=>a.player&&a.alive)){g.ended=true;g.result='loss'}
 if(g.ended)return;
 if(g.elapsed>=g.duration){
  if(g.phase==='intro'){g.phase='rush';g.elapsed=0;g.duration=Math.max(MODES[g.mode].min,MODES[g.mode].first-(g.round-1)*.23)}
  else if(g.phase==='rush'){g.phase='drop';g.elapsed=0;g.duration=2.4}
  else if(g.phase==='drop'){g.safeRounds++;if(g.round>=g.maxRounds||g.actors.filter(a=>a.alive).length===1){g.ended=true;g.result='win'}else{g.phase='recover';g.elapsed=0;g.duration=1.2}}
  else if(g.phase==='recover')beginRound(g);
 }
}
export function nearestSafe(g,a){return g.board.map((c,i)=>({c,i})).filter(t=>t.c===g.target).map(t=>({...cellCenter(t.i),i:t.i})).sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z))[0]}
