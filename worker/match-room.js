import {tickRoom,publicRoom,encodeRoom} from '../server/matches.js';
import {applyRoomCommand} from '../server/room-commands.js';
import {recordFantasyResult} from '../server/fantasy.js';
const terminal=room=>['finished','left'].includes(room.status);
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});

// One live coordinator per match. Game ticks never wait for a remote database.
export class MatchRoom {
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;this.room=null;this.sockets=new Map();this.timer=null;this.savedAt=0;this.databaseAt=0;this.saving=null;
  this.initialized=ctx.blockConcurrencyWhile(async()=>{this.room=await ctx.storage.get('room')||null;});
 }
 async load(id){
  await this.initialized;
  if(!this.room){
   this.loading??=(async()=>{const row=await this.env.DB.prepare('SELECT data FROM social_rooms WHERE id=?').bind(id).first();if(!row)throw Object.assign(new Error('This match could not be found.'),{status:404});this.room=JSON.parse(row.data);})();
   try{await this.loading}catch(error){this.loading=null;throw error;}
  }
  if(this.room.id!==id)throw Object.assign(new Error('Wrong match.'),{status:403});
 }
 view(user,connection,ack){return {...publicRoom(this.room,user,connection),...(ack===undefined?{}:{ack}),transport:'live'};}
 async persist(force=false){
  const now=Date.now();
  if(!force&&now-this.savedAt<1000)return;
  if(this.saving)return force?this.saving.then(()=>this.persist(true)):this.saving;
  this.savedAt=now;
  const snapshot=encodeRoom(this.room),room=JSON.parse(snapshot),toDatabase=force||now-this.databaseAt>=5000;
  this.saving=(async()=>{
   await this.ctx.storage.put('room',room);
   if(toDatabase){await this.env.DB.prepare('UPDATE social_rooms SET data=?,version=version+1,updated=? WHERE id=?').bind(snapshot,now,room.id).run();this.databaseAt=now;await recordFantasyResult(this.env.DB,room);}
  })().catch(error=>{this.savedAt=0;console.error('Match checkpoint failed:',error);}).finally(()=>{this.saving=null;});
  return this.saving;
 }
 checkpoint(force=false){this.ctx.waitUntil(this.persist(force));}
 sendSnapshot(socket,client,ack){
  const data=this.view(client.user,client.connection,ack);
  client.staticFields??=new Map();
  // Team rosters and loadouts are large but usually unchanged. Send them once
  // per connection; always send fresh actors so hidden positions cannot linger.
  for(const [key,object,field]of [['players',data,'players'],...['teamRosters','teamNames','offenseNumbers','board'].map(field=>['match.'+field,data.match,field])]){
   if(!object||object[field]===undefined)continue;
   const value=JSON.stringify(object[field]);
   if(client.staticFields.get(key)===value){delete object[field];data.patch=true;}else client.staticFields.set(key,value);
  }
  socket.send(JSON.stringify(data));
 }
 broadcast(){
  for(const [socket,client]of this.sockets){
   try{this.sendSnapshot(socket,client);}catch{this.sockets.delete(socket);}
  }
 }
 start(){
  if(this.timer||!this.sockets.size||terminal(this.room))return;
  this.timer=setInterval(()=>{
   try{tickRoom(this.room,Date.now());this.broadcast();this.checkpoint(terminal(this.room));if(terminal(this.room)||!this.sockets.size)this.stop();}
   catch(error){console.error('Match tick failed:',error);}
  },50);
 }
 stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
 disconnect(socket){this.sockets.delete(socket);if(!this.sockets.size){this.stop();this.checkpoint(true);}}
 command(user,body,respond=true){
  tickRoom(this.room,Date.now());
  const connection=applyRoomCommand(this.room,user,body,Date.now());
  this.checkpoint(terminal(this.room));
  return respond?this.view(user,connection,body.requestId):null;
 }
 async fetch(request){
  try{
   const url=new URL(request.url),match=url.pathname.match(/^\/api\/social\/room\/([a-f0-9-]{36})(?:\/(?:connect|score))?$/),user=request.headers.get('oai-authenticated-user-id');
   if(!match||!user)return json({error:'Open this match from your player profile.'},401);
   await this.load(match[1]);
   if(!this.room.players.some(p=>p.id===user))return json({error:'This match belongs to other players.'},403);
   if(url.pathname.endsWith('/score')&&request.method==='GET'){
    const seat=this.room.players.findIndex(p=>p.id===user);
    return json({game:this.room.game||'turbo-kart-racing',kills:this.room.match?.actors?.find(a=>a.seat===seat&&a.human)?.kills||0});
   }
   if(request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
    if(request.headers.get('Origin')!==url.origin)return json({error:'Open this match from Archerbox.'},403);
    const connection=url.searchParams.get('clientId');
    if(!/^[a-f0-9-]{36}$/.test(connection||''))return json({error:'Invalid player connection.'},400);
    // Limit duplicate/abandoned tabs without changing who owns the controls.
    if(this.sockets.size>=8)return json({error:'Close other tabs for this match.'},429);
    const pair=new WebSocketPair(),client=pair[0],socket=pair[1];socket.accept();
    const state={user,connection,window:Date.now(),messages:0};this.sockets.set(socket,state);
    socket.addEventListener('message',message=>{
     let body;
     try{
      if(typeof message.data!=='string'||message.data.length>4096)throw Error('Match message is too large.');
      const now=Date.now();if(now-state.window>1000){state.window=now;state.messages=0;}if(++state.messages>80)throw Error('Too many match messages.');
      body=JSON.parse(message.data);
      // A socket's player and tab identity come only from its authenticated handshake.
      body.clientId=connection;
      this.command(user,body,false);
      if(body.action!=='input'){this.sendSnapshot(socket,state,body.requestId);this.broadcast();}
     }catch(error){socket.send(JSON.stringify({error:error.message,ack:body?.requestId}));}
    });
    socket.addEventListener('close',()=>this.disconnect(socket));socket.addEventListener('error',()=>this.disconnect(socket));
    this.sendSnapshot(socket,state);this.start();
    return new Response(null,{status:101,webSocket:client});
   }
   if(request.method!=='POST')return json({error:'Use a live connection or POST.'},405);
   if(request.headers.get('Origin')!==url.origin)return json({error:'Open this match from Archerbox.'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Send JSON.'},415);
   const raw=await request.text();if(raw.length>4096)return json({error:'Match message is too large.'},413);
   return json(this.command(user,JSON.parse(raw)));
  }catch(error){return json({error:error.message||'Could not connect to the match.'},error.status||400);}
 }
}
