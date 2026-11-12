const roomId=new URLSearchParams(location.search).get('room');
export function connectRace({onRoom,onError,input}){
 if(!roomId||!/^[a-f0-9-]{36}$/.test(roomId))return null;
 const clientId=crypto.randomUUID();
 let busy=false,closed=false,sequence=Date.now()*1000,pending=null,failures=0;
 async function send(){
  if(busy||closed)return;busy=true;const command=pending||{action:'input',seq:++sequence,input:input()};pending=null;
  try{const response=await fetch('/api/social/room/'+roomId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...command,clientId}),cache:'no-store',signal:AbortSignal.timeout(6000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Race connection failed.');failures=0;onRoom(data);}catch(error){if(command.action==='ready')pending=command;if(++failures>=2)onError(error.message);}finally{busy=false;}
 }
 const timer=setInterval(send,150);send();
 function leave(){if(closed)return;closed=true;clearInterval(timer);navigator.sendBeacon('/api/social/room/'+roomId,new Blob([JSON.stringify({action:'leave'})],{type:'application/json'}));}
 window.addEventListener('pagehide',()=>{closed=true;clearInterval(timer)},{once:true});
 return {claim(){pending={action:'claim'};send()},recover(){pending={action:'recover'};send()},ready(kart){pending={action:'ready',kart};send()},leave,id:roomId};
}
