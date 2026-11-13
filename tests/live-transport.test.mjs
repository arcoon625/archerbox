import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMatchTransport} from '../public/multiplayer/transport.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('live controls do not wait for an HTTP reply, acknowledge actions, and stop cleanly',async()=>{
 const sockets=[],messages=[],errors=[];let x=0,http=0;
 class Socket{
  constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;this.sent=[];sockets.push(this);}
  send(raw){this.sent.push(JSON.parse(raw));}
  close(){this.readyState=3;}
 }
 const transport=createMatchTransport({id:crypto.randomUUID(),clientId:crypto.randomUUID(),input:()=>({x}),onRoom:d=>messages.push(d),onError:e=>errors.push(e),WebSocketClass:Socket,fetcher:async()=>{http++;throw Error('Should not need HTTP');},base:'https://arcade.test'});
 try{
  const socket=sockets[0];assert(socket.url.href.startsWith('wss://arcade.test/api/social/room/'));
  socket.readyState=1;socket.onopen();x=1;transport.request();
  assert.equal(socket.sent.at(-1).input.x,1);assert.equal(http,0,'live input avoids HTTP and database round trips');
  transport.command({action:'event',event:'jump',eventSeq:1});const event=socket.sent.find(p=>p.event==='jump');assert(event.requestId);
  socket.onmessage({data:JSON.stringify({status:'playing',ack:event.requestId,controlling:true})});
  socket.onmessage({data:JSON.stringify({status:'playing',players:[{name:'One'}],match:{teamRosters:[{name:'Roster'}],actors:[{x:0}]}})});
  socket.onmessage({data:JSON.stringify({status:'playing',patch:true,match:{actors:[{x:1}]}})});
  assert.equal(messages.at(-1).match.teamRosters[0].name,'Roster','small live updates retain unchanged roster data');
  assert.equal(messages.at(-1).players[0].name,'One');assert.equal(messages.at(-1).match.actors[0].x,1);
  transport.request();assert.equal(socket.sent.filter(p=>p.event==='jump').length,1,'acknowledged actions are not sent again');
  const count=socket.sent.length;socket.bufferedAmount=100000;transport.request();assert.equal(socket.sent.length,count,'backpressure drops obsolete movement samples');socket.bufferedAmount=0;
  await sleep(60);assert(socket.sent.length>count,'input keeps streaming without waiting for a reply');
  transport.stop();const stopped=socket.sent.length;await sleep(60);assert.equal(socket.sent.length,stopped);assert.equal(socket.readyState,3);assert.equal(errors.length,0);
 }finally{transport.stop();}
});

test('networks without WebSockets use the serialized HTTP fallback',async()=>{
 let calls=0,received=0;
 class BlockedSocket{constructor(){throw Error('WebSockets blocked');}}
 const transport=createMatchTransport({id:crypto.randomUUID(),clientId:crypto.randomUUID(),input:()=>({x:1}),onRoom:()=>received++,WebSocketClass:BlockedSocket,base:'https://arcade.test',fetcher:async()=>{calls++;return Response.json({status:'waiting',controlling:true});}});
 try{await sleep(50);assert(calls>=1);assert(received>=1);}finally{transport.stop();}
});
