import {createPlayback} from '../../multiplayer/playback.js';
import {createMatchTransport} from '../../multiplayer/transport.js';
const roomId=new URLSearchParams(location.search).get('room');
export function connectRace({onRoom,onError,input}){
 if(!roomId||!/^[a-f0-9-]{36}$/.test(roomId))return null;
 const clientId=crypto.randomUUID(),playback=createPlayback();let closed=false;
 const transport=createMatchTransport({id:roomId,clientId,input,onError,onRoom:data=>{playback.receive(data,performance.now(),data.status);onRoom(data);}});
 function leave(){if(closed)return;closed=true;transport.stop();navigator.sendBeacon('/api/social/room/'+roomId,new Blob([JSON.stringify({action:'leave',clientId})],{type:'application/json'}));}
 return {frame(now=performance.now()){playback.frame(now)},claim(){transport.command({action:'claim'})},recover(){transport.command({action:'recover'})},ready(kart){transport.command({action:'ready',kart})},leave,id:roomId};
}
