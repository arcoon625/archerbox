// Keep drawing between network replies. These poses are presentation only;
// the server still decides collisions, tiles, hits, scores and match results.
const fields=['x','y','z','yaw','s','lane','depth','heading','air'];
const identity=(a,i)=>a.serverId??a.id??i;
const state=a=>[a.alive,a.found,a.hidden,a.finished].join('|');
const angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function createPlayback({delay=120,maxExtrapolation=120}={}){
 let frames=[],current=null,active=false;
 function receive(snapshot,now,status){
  if(!snapshot)return;
  current=snapshot;active=['playing','racing'].includes(status);
  const groups={};
  for(const key of ['actors','racers'])if(snapshot[key])groups[key]=snapshot[key].map((a,i)=>({id:identity(a,i),state:state(a),...Object.fromEntries(fields.filter(k=>Number.isFinite(a[k])).map(k=>[k,a[k]]))}));
  if(!active)frames=[];
  frames.push({time:now,groups});
  if(frames.length>12)frames.shift();
 }
 function frame(now){
  if(!active||frames.length<2||!current)return;
  const time=now-delay;
  let right=frames.findIndex(f=>f.time>=time);
  if(right<0)right=frames.length-1;
  const a=frames[Math.max(0,right-1)],b=frames[right],span=Math.max(1,b.time-a.time);
  const t=Math.max(0,Math.min(time,b.time+maxExtrapolation)-a.time)/span;
  for(const key of ['actors','racers']){
   const before=new Map((a.groups[key]||[]).map(p=>[p.id,p]));
   const after=new Map((b.groups[key]||[]).map(p=>[p.id,p]));
   current[key]?.forEach((actor,i)=>{
    const id=identity(actor,i),from=before.get(id),to=after.get(id);
    if(!from||!to||from.state!==to.state||to.state!==state(actor))return;
    // A teleport, respawn or recovery is intentional; don't fly across a map.
    if(Math.hypot((to.x??0)-(from.x??0),(to.z??0)-(from.z??0))>8||Math.abs((to.s??0)-(from.s??0))>30)return;
    for(const field of fields)if(Number.isFinite(from[field])&&Number.isFinite(to[field])){
     actor[field]=['yaw','heading'].includes(field)?angle(from[field],to[field],t):from[field]+(to[field]-from[field])*t;
    }
   });
  }
 }
 return {receive,frame};
}
