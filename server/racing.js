import {makeTrack,makeRacer,drive,cpuInput,checkFinish,clamp} from '../public/games/turbo-kart-racing/race.js';
const trackCache=new Map();
export const getTrack=index=>{if(!trackCache.has(index))trackCache.set(index,makeTrack(index));return trackCache.get(index)};
export function makeRoom(id,host,guest,track,now){return {id,track,status:'waiting',players:[{id:host.id,name:host.name,color:host.color,kart:0,ready:false,seen:now,input:{},seq:-1},{id:guest.id,name:guest.name,color:guest.color,kart:1,ready:false,seen:now,input:{},seq:-1}],racers:[],startAt:0,updatedAt:now,time:0,created:now};}
export function safeInput(raw={}){return {assist:true,throttle:clamp(Number(raw.throttle)||0,-1,1),steer:clamp(Number(raw.steer)||0,-1,1),boost:raw.boost===true,drift:raw.drift===true};}
export function tickRoom(room,now){
 if(['left','finished'].includes(room.status))return;
 if(now-room.created>15*60_000||room.players.some(p=>now-p.seen>60_000)){room.status='left';room.message='A player left the race. Invite your friend again to race.';return;}
 if(room.status==='waiting')return;
 if(now<room.startAt){room.status='countdown';room.updatedAt=now;return;}
 room.status='racing';const track=getTrack(room.track),elapsed=Math.max(0,Math.min(.5,(now-Math.max(room.updatedAt,room.startAt))/1000));
 const count=Math.ceil(elapsed*60),dt=count?elapsed/count:0;
 for(let i=0;i<count;i++){
  room.time+=dt;
  for(let n=0;n<room.racers.length;n++){
   const r=room.racers[n],p=room.players.find(p=>p.id===r.playerId);
   drive(r,track,p?(now-p.seen<1800?p.input:safeInput()):cpuInput(r,track,room.time,n+1),dt);
   checkFinish(r,track,room.time);
  }
  for(let a=0;a<room.racers.length;a++)for(let b=a+1;b<room.racers.length;b++){
   const x=room.racers[a],y=room.racers[b];if(x.finished||y.finished||x.air>.7||y.air>.7)continue;
   if(Math.abs(x.s-y.s)<2.1&&Math.abs(x.lane-y.lane)<1.4){const d=x.lane>=y.lane?1:-1;x.lane=clamp(x.lane+d*dt*3,-7.65,7.65);y.lane=clamp(y.lane-d*dt*3,-7.65,7.65);x.speed*=1-dt*.25;y.speed*=1-dt*.25;}
  }
 }
 room.updatedAt=now;
 if(room.racers.every(r=>r.finished)||room.time>360){room.status='finished';}
}
export function readyPlayer(room,id,kart,now){
 if(room.status!=='waiting')return;const p=room.players.find(p=>p.id===id);p.ready=true;p.kart=Number.isInteger(kart)&&kart>=0&&kart<4?kart:0;p.seen=now;
 if(room.players.every(p=>p.ready)){
  const names=['VOLT','BLAZE','ECHO','NOVA'];room.racers=names.map((name,i)=>({...makeRacer(name,i,i),playerId:null}));
  room.players.forEach((p,i)=>room.racers.push({...makeRacer(p.name,p.kart,4+i),playerId:p.id,color:p.color}));
  room.startAt=now+4500;room.updatedAt=now;room.status='countdown';
 }
}
// Keep account IDs server-side; the client only needs its own seat and racer slot.
export function publicRoom(room,user,connection){return {id:room.id,track:room.track,status:room.status,time:room.time,startAt:room.startAt,now:Date.now(),message:room.message,controlling:room.players.find(p=>p.id===user)?.connection===connection,players:room.players.map((p,i)=>({seat:i,name:p.name,ready:p.ready,kart:p.kart,you:p.id===user,online:Date.now()-p.seen<5000})),racers:room.racers.map(r=>({...r,playerId:undefined,human:!!r.playerId,you:r.playerId===user}))};}
