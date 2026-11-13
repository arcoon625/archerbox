import {readyPlayer,safeInput,event} from './matches.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
export function applyRoomCommand(room,user,body,now){
 const player=room.players.find(p=>p.id===user);
 if(!player)fail('This match belongs to other players.',403);
 if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid match message.');
 const connection=typeof body.clientId==='string'&&/^[a-f0-9-]{36}$/.test(body.clientId)?body.clientId:null;
 if(body.action!=='leave'&&!connection)fail('Reconnect to the match.');
 if(!['input','ready','claim','event','recover','leave'].includes(body.action))fail('Unknown match action.');
 if(!player.connection||body.action==='claim'||(body.action==='ready'&&room.status==='waiting')){player.connection=connection;player.seq=-1;}
 const controlling=player.connection===connection;
 if(controlling)player.seen=now;
 if(body.action==='leave'){
  // Unloading an old tab must not close the tab that now owns the controls.
  if((controlling||!connection)&&!['finished','left'].includes(room.status)){room.status='left';room.message=player.name+' left the match.';}
  return connection;
 }
 if(!controlling)return connection;
 if(Number.isSafeInteger(body.seq)&&body.seq>player.seq&&body.input){player.seq=body.seq;player.input=safeInput(body.input,room.game);}
 if(body.action==='ready')readyPlayer(room,user,room.game&&room.game!=='turbo-kart-racing'?body.config:body.kart,now);
 if(body.action==='recover'&&room.status==='racing'){
  const kart=room.racers.find(k=>k.playerId===user);if(kart&&!kart.finished){kart.lane=0;kart.heading=0;kart.speed=Math.min(kart.speed,7);kart.air=kart.vy=0;}
 }
 if(body.action==='event'&&Number.isSafeInteger(body.eventSeq)&&body.eventSeq>(player.eventSeq??-1)){
  player.eventSeq=body.eventSeq;event(room,room.players.indexOf(player),String(body.event||''),body.args&&typeof body.args==='object'?body.args:{},now);
 }
 return connection;
}
