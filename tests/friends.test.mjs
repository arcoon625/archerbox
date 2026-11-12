import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {handleSocial,codeDistance} from '../server/social.js';
import {makeRoom,readyPlayer,tickRoom,safeInput,publicRoom,getTrack} from '../server/racing.js';
const sqlite=new DatabaseSync(':memory:');for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const db={prepare(sql){return {args:[],bind(...args){this.args=args;return this},async first(){return sqlite.prepare(sql).get(...this.args)||null},async all(){return {results:sqlite.prepare(sql).all(...this.args)}},async run(){const r=sqlite.prepare(sql).run(...this.args);return {meta:{changes:r.changes}}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const q of statements)results.push(await q.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const connections=new Map();
async function api(user,path,body,origin='https://archerbox.test'){
 if(path.startsWith('room/')&&body){if(!connections.has(user))connections.set(user,crypto.randomUUID());body={...body,clientId:connections.get(user)};}
 const headers={'oai-authenticated-user-id':user||''};if(body!==undefined){headers.Origin=origin;headers['Content-Type']='application/json'}
 const r=await handleSocial(new Request('https://archerbox.test/api/social/'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),db);return {status:r.status,...await r.json()};
}
assert.equal((await api(null,'state')).status,401);assert.equal((await api('unknown','state')).status,428);
const codes=[];for(let i=0;i<35;i++){const p=await api('user'+i,'profile',{name:'Racer '+i,color:'#77d9dc'});assert.equal(p.status,200);assert.match(p.profile.code,/^[a-z0-9]{10}$/);for(const previous of codes)assert(codeDistance(previous,p.profile.code)>=3);codes.push(p.profile.code);}
assert.equal(new Set(codes).size,35);assert.equal((await api('user0','profile',{name:'Volt',update:true})).profile.code,codes[0],'renaming keeps the friend code');
assert.equal((await api('user0','add',{code:codes[0]})).status,400);assert.equal((await api('user0','add',{code:'x@!'})).status,400);assert.equal((await api('user0','add',{code:'zzzzzzzzzz'})).status,404);
assert.equal((await api('user0','add',{code:codes[1]},'https://other.test')).status,403);
let a=await api('user0','add',{code:codes[1].toUpperCase()});assert.equal(a.friends.length,1);let b=await api('user1','state');assert.equal(b.friends.length,1);assert.equal(b.friends[0].name,'Volt');assert.equal((await api('user0','add',{code:codes[1]})).friends.length,1,'adding twice is idempotent');
assert.equal((await api('user2','invite',{friend:'user1',track:0})).status,403);assert.equal((await api('user0','invite',{friend:'user1',track:9})).status,400);
await api('user0','invite',{friend:'user1',track:2});b=await api('user1','state');const first=b.incoming[0].id;
assert.equal((await api('user2','respond',{invite:first,accept:true})).status,404);await api('user1','respond',{invite:first,accept:false});assert.equal((await api('user0','state')).outgoing[0].status,'declined');
sqlite.exec('UPDATE social_invites SET created=created-4000');await api('user0','invite',{friend:'user1',track:1});b=await api('user1','state');const id=b.incoming[0].id;
const accepted=await api('user1','respond',{invite:id,accept:true});assert.equal(accepted.roomId,id);assert.equal((await api('user0','state')).activeRoom,id);assert.equal((await api('user1','respond',{invite:id,accept:true})).roomId,id);assert.equal(sqlite.prepare('SELECT count(*) n FROM social_rooms').get().n,1);
assert.equal((await api('user2','room/'+id,{action:'input',seq:1,input:{}})).status,403);
const ready1=await api('user0','room/'+id,{action:'ready',kart:3});assert.equal(ready1.status,'waiting');const ready2=await api('user1','room/'+id,{action:'ready',kart:1});assert.equal(ready2.status,'countdown');assert.equal(ready2.racers.length,6);assert.equal(ready2.racers.filter(r=>r.human).length,2);assert.equal(ready2.racers.filter(r=>!r.human).length,4);assert.equal(ready2.racers.find(r=>r.you).kartIndex,1);const otherTab=crypto.randomUUID();let passive=await handleSocial(new Request('https://archerbox.test/api/social/room/'+id,{method:'POST',headers:{'oai-authenticated-user-id':'user1','Origin':'https://archerbox.test','Content-Type':'application/json'},body:JSON.stringify({action:'input',clientId:otherTab,seq:999999,input:{throttle:1}})}),db);assert.equal((await passive.json()).controlling,false,'another tab cannot overwrite the controlling tab');assert(!JSON.stringify(ready2).includes('user0'),'account IDs are not in room snapshots');
await api('user1','room/'+id,{action:'input',seq:200,input:{throttle:1,steer:999,s:999999,finished:true}});await api('user1','room/'+id,{action:'input',seq:199,input:{throttle:-1}});
let stored=JSON.parse(sqlite.prepare('SELECT data FROM social_rooms WHERE id=?').get(id).data);assert.equal(stored.players[1].seq,200);assert.equal(stored.players[1].input.throttle,1);assert.equal(stored.players[1].input.steer,1);assert.equal(stored.players[1].input.s,undefined);
const ended=await api('user0','room/'+id,{action:'leave'});assert.equal(ended.status,'left');assert.equal((await api('user1','room/'+id,{action:'input',seq:300,input:{}})).status,'left');
assert.equal((await api('user0','invite',{friend:'user1',track:0,game:'floor-is-lava'})).status,400);
for(const game of ['hide-and-seek','shark-racing','color-rush','touchdown-rush','neon-clash']){
 sqlite.exec('UPDATE social_invites SET created=created-4000');
 const invited=await api('user0','invite',{friend:'user1',track:0,game,variant:'coop'});assert.equal(invited.message,'Invite sent to Racer 1.');
 const incoming=(await api('user1','state')).incoming[0];assert.equal(incoming.game,game);assert.equal(incoming.variant,'coop');
 const joined=await api('user1','respond',{invite:incoming.id,accept:true});assert.equal(joined.activeGame,game);assert.equal(joined.roomId,incoming.id);
 await api('user0','room/'+incoming.id,{action:'ready',config:{gun:12,teamSize:3,role:'seeker',team:'dallas-cowboys'}});
 const ready=await api('user1','room/'+incoming.id,{action:'ready',config:{gun:1,team:'buffalo-bills'}});assert.equal(ready.game,game);assert.equal(ready.status,'countdown');assert(ready.match);
 const data=JSON.parse(sqlite.prepare('SELECT data FROM social_rooms WHERE id=?').get(incoming.id).data);data.startAt=Date.now()-500;data.updatedAt=Date.now()-100;
 sqlite.prepare('UPDATE social_rooms SET data=? WHERE id=?').run(JSON.stringify(data),incoming.id);
 const playing=await api('user0','room/'+incoming.id,{action:'input',seq:1,input:{x:999,hp:999,score:999}});assert.equal(playing.status,'playing');
 await api('user0','room/'+incoming.id,{action:'event',event:'ping',eventSeq:10});await api('user0','room/'+incoming.id,{action:'event',event:'ping',eventSeq:9});
 const saved=JSON.parse(sqlite.prepare('SELECT data FROM social_rooms WHERE id=?').get(incoming.id).data);assert.equal(saved.players[0].eventSeq,10,'events are deduplicated');assert.equal(saved.players[0].input.x,1);assert.equal(saved.players[0].input.hp,undefined);assert(!JSON.stringify(playing).includes('user1'));
 assert.equal((await api('user1','room/'+incoming.id,{action:'leave'})).status,'left');
}
await api('user0','remove',{friend:'user1'});assert.equal((await api('user1','state')).friends.length,0);
for(let track=0;track<4;track++){
 const t=100000,r=makeRoom('race',{id:'a',name:'Volt',color:'#abc'},{id:'b',name:'Nova',color:'#def'},track,t);readyPlayer(r,'a',0,t);readyPlayer(r,'b',1,t);
 for(let time=t;time<t+220000;time+=150){for(const p of r.players){p.seen=time;p.input=safeInput({throttle:1,boost:p.id==='b'})}tickRoom(r,time);if(r.status==='finished')break;}
 assert.equal(r.racers.length,6);assert(r.racers.every(p=>p.finished),'all six finish track '+track);assert.equal(r.status,'finished');assert.notEqual(r.racers[4].time,r.racers[5].time,'two human inputs control separate racers');assert(r.racers.every(p=>p.s>=getTrack(track).length*3));
 const viewA=publicRoom(r,'a'),viewB=publicRoom(r,'b');assert.equal(viewA.racers[4].you,true);assert.equal(viewB.racers[5].you,true);assert.deepEqual(viewA.racers.map(r=>r.s),viewB.racers.map(r=>r.s),'both players see the same authoritative race');
}
console.log('Friends passed: 35 distinct codes, minimum difference, mutual adds, invites/declines, idempotent accepts, authorization, input validation, leave, and two humans plus four CPUs finishing all four arenas.');
