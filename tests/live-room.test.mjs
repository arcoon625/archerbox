import assert from 'node:assert/strict';
import {test} from 'node:test';
import {MatchRoom} from '../worker/match-room.js';
import {makeRoom,publicRoom} from '../server/matches.js';
import {applyRoomCommand} from '../server/room-commands.js';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';

test('live rooms authorize players, advance without D1 per input, and restore saved state',async()=>{
 const {db,sqlite}=fantasyDatabase(),id=crypto.randomUUID(),now=Date.now();
 const initial=makeRoom(id,{id:'a',name:'One'},{id:'b',name:'Two'},0,now,'color-rush');
 await db.prepare('INSERT INTO social_rooms (id,host,guest,data,version,updated) VALUES (?,?,?,?,0,?)').bind(id,'a','b',JSON.stringify(initial),now).run();
 let reads=0,writes=0;const counted={prepare(sql){if(sql.startsWith('SELECT'))reads++;else writes++;return db.prepare(sql);}};
 const storage=new Map(),waits=[];const ctx={storage:{get:async key=>storage.get(key),put:async(key,value)=>storage.set(key,structuredClone(value))},blockConcurrencyWhile:fn=>fn(),waitUntil:promise=>waits.push(promise)};
 const room=new MatchRoom(ctx,{DB:counted}),client=crypto.randomUUID(),other=crypto.randomUUID();
 async function request(user,body,origin='https://arcade.test',suffix=''){
  return room.fetch(new Request('https://arcade.test/api/social/room/'+id+suffix,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':user},...(body?{body:JSON.stringify(body)}:{})}));
 }
 assert.equal((await request('outsider',{action:'input',clientId:client})).status,403);
 assert.equal((await request('a',{action:'input',clientId:client},'https://other.test')).status,403);
 assert.equal((await request('a',{action:'ready',clientId:client,config:{pace:'chill'},requestId:1})).status,200);
 await request('b',{action:'ready',clientId:other,config:{},requestId:2});
 room.room.startAt=Date.now()-100;room.room.updatedAt=Date.now()-100;
 for(let seq=0;seq<100;seq++)room.command('a',{action:'input',clientId:client,seq,input:{x:1}});
 assert.equal(reads,1,'all inputs share one initial D1 read');
 assert(writes<=1,'the hot movement path does not write D1 every frame');
 assert.equal(room.room.players[0].input.x,1);
 const wrong=await request('a',{action:'input',clientId:other,seq:1000,input:{x:-1}});assert.equal((await wrong.json()).controlling,false);assert.equal(room.room.players[0].input.x,1);
 await request('a',{action:'leave',clientId:other});assert.notEqual(room.room.status,'left','an obsolete tab cannot end the active tab’s match');
 assert.equal((await request('a',null,undefined,'/score')).status,200);
 await Promise.all(waits);await room.persist(true);
 assert(writes<5);const saved=storage.get('room');assert.equal(saved.players[0].input.x,1);
 const restored=new MatchRoom(ctx,{DB:counted});await restored.load(id);assert.equal(reads,1,'restart uses the durable checkpoint');assert.equal(restored.room.players[0].input.x,1);
 await request('a',{action:'leave',clientId:client});await Promise.all(waits);assert.equal(room.room.status,'left');
 sqlite.close();
});

test('live commands deduplicate actions and keep private room data private',()=>{
 const now=Date.now(),room=makeRoom(crypto.randomUUID(),{id:'a',name:'One'},{id:'b',name:'Two'},0,now,'neon-clash'),a=crypto.randomUUID(),b=crypto.randomUUID();
 applyRoomCommand(room,'a',{action:'ready',clientId:a,config:{}},now);applyRoomCommand(room,'b',{action:'ready',clientId:b,config:{}},now);
 room.status='playing';const actor=room.match.actors.find(p=>p.seat===0);
 actor.grenades=2;
 applyRoomCommand(room,'a',{action:'event',clientId:a,event:'grenade',eventSeq:1,args:{}},now);
 const after=actor.grenades;assert.equal(after,1);
 applyRoomCommand(room,'a',{action:'event',clientId:a,event:'grenade',eventSeq:1,args:{}},now);assert.equal(actor.grenades,after);
 assert.throws(()=>applyRoomCommand(room,'outsider',{action:'input',clientId:a},now),/other players/);
 assert.throws(()=>applyRoomCommand(room,'a',{action:'cheat',clientId:a},now),/Unknown/);
 const view=publicRoom(room,'a',a);assert.equal(view.controlling,true);assert(!JSON.stringify(view.players).includes('"id"'));
});

test('live broadcasts avoid resending large unchanged roster data',()=>{
 const room=new MatchRoom({storage:{get:async()=>null},blockConcurrencyWhile:fn=>fn()},{});
 const now=Date.now();room.room=makeRoom(crypto.randomUUID(),{id:'a',name:'One'},{id:'b',name:'Two'},0,now,'touchdown-rush');
 applyRoomCommand(room.room,'a',{action:'ready',clientId:crypto.randomUUID(),config:{}},now);
 applyRoomCommand(room.room,'b',{action:'ready',clientId:crypto.randomUUID(),config:{}},now);
 const sent=[],socket={send:raw=>sent.push(JSON.parse(raw))},client={user:'a',connection:null};
 room.sendSnapshot(socket,client);room.sendSnapshot(socket,client);
 assert(sent[0].match.teamRosters);assert.equal(sent[1].patch,true);assert.equal(sent[1].match.teamRosters,undefined);
 assert(sent[1].match.actors,'positions and visibility must always be fresh');
 assert(JSON.stringify(sent[1]).length<JSON.stringify(sent[0]).length/2,'steady football updates are less than half the original payload');
});
