import {createPlayback} from '../../multiplayer/playback.js';
import {createPollLoop} from '../../multiplayer/poll-loop.js';
const roomId=new URLSearchParams(location.search).get('room');
export function connectRace({onRoom,onError,input}){
 if(!roomId||!/^[a-f0-9-]{36}$/.test(roomId))return null;
 const clientId=crypto.randomUUID();
 const playback=createPlayback();
 let closed=false,sequence=Date.now()*1000,pending=null,failures=0;
 async function send(){
  if(closed)return;let succeeded=false;const command=pending||{action:'input',seq:++sequence,input:input()};pending=null;
  try{const response=await fetch('/api/social/room/'+roomId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...command,clientId}),cache:'no-store',signal:AbortSignal.timeout(6000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Race connection failed.');failures=0;succeeded=true;playback.receive(data,performance.now(),data.status);onRoom(data);if(['finished','left'].includes(data.status))loop.stop();}catch(error){if(command.action==='ready')pending=command;if(++failures>=2)onError(error.message);}finally{if(succeeded&&pending)loop.request();}
 }
 const loop=createPollLoop(send);
 const changed=e=>{if(!e.repeat)queueMicrotask(()=>loop.request())};
 for(const event of ['keydown','keyup','pointerdown','pointerup','pointercancel','blur'])window.addEventListener(event,changed);
 loop.request();
 function leave(){if(closed)return;closed=true;loop.stop();navigator.sendBeacon('/api/social/room/'+roomId,new Blob([JSON.stringify({action:'leave'})],{type:'application/json'}));}
 window.addEventListener('pagehide',()=>{closed=true;loop.stop()},{once:true});
 return {frame(now=performance.now()){playback.frame(now)},claim(){pending={action:'claim'};loop.request()},recover(){pending={action:'recover'};loop.request()},ready(kart){pending={action:'ready',kart};loop.request()},leave,id:roomId};
}
