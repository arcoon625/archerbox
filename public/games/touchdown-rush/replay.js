const livePhases=new Set(['live','flight','kick','placekick-flight']);
const sampleInterval=1/24;
const clipLimit=24;
const afterWhistle=.75;

function capture(game,time){
 const {actors,ball,phase,phaseTime,offense,carrier,control,selected,scramble,tacklePose,passResult,placeKick,viewDirection,play,event,personnelVersion}=game;
 return {
  time,phase,phaseTime,offense,carrier,control,selected,viewDirection,play,event,personnelVersion,
  actors:actors.map(actor=>({...actor})),
  ball:ball&&{...ball,from:ball.from&&{...ball.from},to:ball.to&&{...ball.to}},
  scramble:scramble&&{...scramble},
  tacklePose:tacklePose&&{...tacklePose},
  passResult:passResult&&{...passResult},
  placeKick:placeKick&&{...placeKick,from:{...placeKick.from}}
 };
}

export function makeReplayRecorder(){
 let frames=[],latest=null,recording=false;
 function finish(event){
  const first=frames[0],last=frames.at(-1);
  if(first&&last.time>first.time){
   const length=last.time-first.time;
   const tail=last.phase==='dead'||last.phase==='finished'?Math.max(.1,afterWhistle-last.phaseTime):.35;
   latest={frames:frames.slice(),length,duration:length+tail,event:event||last.event};
  }
 }
 return {
  reset(){frames=[];latest=null;recording=false;},
  latest:()=>latest,
  record(game,time){
   const live=livePhases.has(game.phase);
   const last=frames.at(-1);
   if(live&&(!recording||last?.phase==='dead'||last?.phase==='finished')){
    frames=[capture(game,time)];recording=true;return;
   }
   if(!recording)return;
   const resolved=game.phase==='dead'||game.phase==='finished';
   if(!live&&!resolved){if(livePhases.has(last.phase))finish(game.event==='TOUCHBACK'?game.event:undefined);recording=false;return;}
   if(resolved&&game.phaseTime>afterWhistle&&last.phase===game.phase){recording=false;return;}
   if(last.phase===game.phase&&time-last.time<sampleInterval)return;
   if(time<=last.time)return;
   frames.push(capture(game,time));
   while(frames.length>2&&frames[1].time<time-clipLimit)frames.shift();
   if(resolved)finish();
  }
 };
}

const mix=(a,b,t)=>a+(b-a)*t;
function mixPose(a,b,t,props){
 const result={...a};
 for(const key of props)if(Number.isFinite(a[key])&&Number.isFinite(b[key]))result[key]=mix(a[key],b[key],t);
 return result;
}

export function replayAt(clip,seconds){
 const {frames,length}=clip;
 const first=frames[0],last=frames.at(-1);
 if(seconds>=length)return {...last,phaseTime:last.phaseTime+Math.min(seconds-length,clip.duration-length)};
 const time=first.time+Math.max(0,seconds);
 let low=0,high=frames.length-1;
 while(high-low>1){
  const middle=(low+high)>>1;
  if(frames[middle].time<=time)low=middle;
  else high=middle;
 }
 const a=frames[low],b=frames[high];
 if(a.phase!==b.phase||a.personnelVersion!==b.personnelVersion)return a;
 const t=(time-a.time)/(b.time-a.time);
 return {...a,time,phaseTime:mix(a.phaseTime,b.phaseTime,t),
  actors:a.actors.map((actor,i)=>{
   const next=b.actors[i];
   const pose=mixPose(actor,next,t,['x','z','moving','hurdle']);
   const angle=Math.atan2(Math.sin(next.yaw-actor.yaw),Math.cos(next.yaw-actor.yaw));
   pose.yaw=actor.yaw+angle*t;
   return pose;
  }),
  ball:a.ball&&b.ball?.kind===a.ball.kind?mixPose(a.ball,b.ball,t,['x','y','z','elapsed']):a.ball
 };
}
