// One request at a time, paced from its start rather than an unrelated timer.
// Control changes and queued actions run as soon as the current reply arrives.
export function createPollLoop(send,{interval=120,minGap=40,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,onError=console.error}={}){
 let timer=null,busy=false,stopped=false,urgent=false,started=-Infinity;
 function request(){
  if(stopped)return;
  urgent=true;
  if(busy)return;
  if(timer!==null)cancel(timer);
  timer=schedule(run,Math.max(0,minGap-(now()-started)));
 }
 async function run(){
  if(stopped||busy)return;
  timer=null;busy=true;urgent=false;started=now();
  try{await send()}catch(error){onError(error)}finally{
   busy=false;
   if(!stopped)timer=schedule(run,Math.max(0,(urgent?minGap:interval)-(now()-started)));
  }
 }
 function stop(){stopped=true;if(timer!==null)cancel(timer);timer=null;}
 return {request,stop};
}
