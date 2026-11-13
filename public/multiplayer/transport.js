import {createPollLoop} from './poll-loop.js';

// Persistent authenticated connection shared by all six friend games.
// HTTP is retained for networks which block WebSockets, not used per live frame.
export function createMatchTransport({id,clientId,input,onRoom,onError=()=>{},WebSocketClass=globalThis.WebSocket,fetcher=globalThis.fetch,base=location.href}){
 let socket=null,closed=false,connected=false,sequence=Date.now()*1000,requestId=sequence,reconnect=null,heartbeat=null,watchdog=null,previous=null;
 const pending=new Map();
 const path='/api/social/room/'+id;
 const controls=command=>({...command,clientId,seq:++sequence,input:input()});
 function receive(data){
  if(closed)return;
  if(data.ack!==undefined)pending.delete(data.ack);
  if(data.error){onError(data.error);return;}
  if(data.patch&&previous)data={...previous,...data,match:data.match?{...previous.match,...data.match}:previous.match};
  previous=data;
  onRoom(data);
  if(['finished','left'].includes(data.status))stop();
 }
 function send(){
  if(closed||!connected||socket?.readyState!==1)return;
  // Backpressure: drop old movement samples instead of building a delayed queue.
  if(socket.bufferedAmount>65536)return;
  socket.send(JSON.stringify(controls({action:'input'})));
  for(const item of pending.values())if(!item.sent||Date.now()-item.sent>1000){
   socket.send(JSON.stringify(controls(item.body)));item.sent=Date.now();
  }
 }
 const fallback=createPollLoop(async()=>{
  if(closed||connected)return;
  const item=pending.values().next().value,body=controls(item?.body||{action:'input'});
  try{
   const response=await fetcher(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(6000)});
   if(closed||connected)return;
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Could not connect to this match.');
   if(item)pending.delete(item.body.requestId);
   receive(data);
  }catch(error){if(!closed)onError(error.message);}
 });
 function connect(){
  if(closed)return;
  const url=new URL(path+'/connect',base);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('clientId',clientId);
  let current;
  try{current=new WebSocketClass(url);socket=current;}catch{fallback.request();reconnect=setTimeout(connect,2000);return;}
  watchdog=setTimeout(()=>{if(!closed&&!connected)fallback.request();},1500);
  current.onopen=()=>{
   if(closed||socket!==current){current.close();return;}
   connected=true;clearTimeout(watchdog);for(const item of pending.values())item.sent=0;send();
  };
  current.onmessage=message=>{if(socket!==current||closed)return;try{receive(JSON.parse(message.data));}catch(error){onError(error.message);}};
  current.onerror=()=>{if(!closed)fallback.request();};
  current.onclose=()=>{
   if(socket!==current||closed)return;
   connected=false;clearTimeout(watchdog);fallback.request();
   reconnect=setTimeout(connect,1000);
  };
 }
 function stop(){
  if(closed)return;closed=true;connected=false;fallback.stop();clearTimeout(reconnect);clearTimeout(watchdog);clearInterval(heartbeat);socket?.close();pending.clear();
 }
 function request(){if(connected)send();else fallback.request();}
 function command(body){
  if(closed)return;
  const request={...body,requestId:++requestId};
  if(pending.size>=30){onError('Wait for the match to reconnect.');return;}
  pending.set(request.requestId,{body:request,sent:0});requestInput();
 }
 function requestInput(){request();}
 const changed=e=>{if(!e.repeat)queueMicrotask(request);};
 for(const event of ['keydown','keyup','pointerdown','pointerup','mousedown','mouseup','pointercancel','blur'])globalThis.addEventListener?.(event,changed);
 globalThis.addEventListener?.('pagehide',stop,{once:true});
 heartbeat=setInterval(send,50);connect();
 return {command,stop,request,get connected(){return connected;}};
}
