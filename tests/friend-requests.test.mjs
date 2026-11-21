import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../worker/index.js';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';
import {DEFAULT_LOOK} from '../public/avatar/catalog.js';

async function fixture(){
 const {db,sqlite}=fantasyDatabase(),env={DB:db};
 async function call(path,{user,body,origin='https://arcade.test',headers={}}={}){
  const response=await worker.fetch(new Request('https://arcade.test'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',...(user?{Cookie:user.cookie}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
  return {status:response.status,data:await response.json(),cookie:response.headers.get('Set-Cookie')?.split(';')[0]};
 }
 async function register(name){const r=await call('/api/session',{body:{username:name}});assert.equal(r.status,200);return{cookie:r.cookie,...sqlite.prepare('SELECT id,public_id AS playerId,code FROM social_profiles WHERE name=?').get(name)};}
 const [a,b,c]=await Promise.all([register('Falcon'),register('Nova'),register('Volt')]);
 const social=(user,path,body,extra={})=>call('/api/social/'+path,{user,body,...extra});
 const state=async user=>(await social(user,'state')).data;
 const request=async(from,to)=>social(from,'friend-request',{playerId:to.playerId});
 const board=async(user,period='all-time',game='neon-clash')=>(await call(`/api/charts/leaderboard?game=${game}&period=${period}`,{user})).data;
 function score(user,game='neon-clash'){sqlite.prepare('INSERT INTO chart_scores VALUES (?,?,?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),user.id,game,'test','elimination','run',10,10,10,Date.now());}
 return{db,sqlite,call,social,state,request,board,score,a,b,c};
}

test('leaderboard request waits for recipient consent, then both can invite each other',async()=>{
 const f=await fixture(),{a,b,c,sqlite}=f;try{
  f.score(a);f.score(b);f.score(c,'touchdown-rush');
  let board=await f.board(a);const target=board.entries.find(r=>r.name==='Nova');
  assert.match(target.playerId,/^[a-f0-9]{32}$/);assert.equal(target.friendship,'none');assert.equal(board.entries.find(r=>r.you).friendship,'self');
  for(const privateValue of [a.id,b.id,c.id,a.code,b.code,a.cookie.split('=')[1]])assert(!JSON.stringify(board).includes(privateValue),'leaderboard must not disclose private identifiers');
  assert.equal((await f.request(a,b)).status,200);
  assert.equal((await f.state(a)).friends.length,0);assert.equal((await f.state(b)).friends.length,0);
  assert.equal((await f.social(a,'invite',{friend:b.id,track:0})).status,403);
  const incoming=(await f.state(b)).friendRequests.incoming[0];assert.equal(incoming.name,'Falcon');
  assert.equal((await f.state(a)).friendRequests.outgoing[0].id,incoming.id);
  for(const period of ['all-time','monthly','weekly','daily']){
   board=await f.board(a,period);assert.equal(board.entries.find(r=>r.name==='Nova').friendship,'outgoing');
   assert.equal((await f.board(b,period)).entries.find(r=>r.name==='Falcon').friendRequestId,incoming.id);
  }
  assert.equal((await f.social(a,'friend-response',{request:incoming.id,accept:true})).status,404);
  assert.equal((await f.social(c,'friend-response',{request:incoming.id,accept:true})).status,404);
  assert.equal((await f.social(b,'friend-response',{request:incoming.id,accept:'true'})).status,400);
  assert.equal((await f.social(b,'friend-response',{request:incoming.id,accept:true})).status,200);
  assert.equal((await f.state(a)).friends[0].name,'Nova');assert.equal((await f.state(b)).friends[0].name,'Falcon');
  assert.equal((await f.state(a)).friendRequests.outgoing.length,0);assert.equal((await f.state(b)).friendRequests.incoming.length,0);
  assert.equal((await f.board(a)).entries.find(r=>r.name==='Nova').friendship,'friends');
  assert.equal((await f.social(b,'friend-response',{request:incoming.id,accept:true})).status,200,'accept retry is safe');
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_friends').get().n,1);
  const invited=await f.social(a,'invite',{friend:b.id,game:'turbo-kart-racing',track:0});assert.equal(invited.status,200);
  const gameInvite=(await f.state(b)).incoming[0];assert.equal(gameInvite.game,'turbo-kart-racing');
  assert.equal((await f.social(b,'respond',{invite:gameInvite.id,accept:true})).status,200);
 }finally{sqlite.close();}
});

test('friends can see the latest saved catalog avatar and lose access when removed',async()=>{
 const f=await fixture(),{a,b,c,sqlite}=f;
 const avatar='avatar?friend='+encodeURIComponent(b.id);
 const outfit={...DEFAULT_LOOK,head:'head-02',back:'back-01',pet:'pet-02',expression:'wink'};
 try{
  assert.equal((await f.social(b,'avatar',{look:[]})).status,400);
  assert.equal((await f.social(b,'avatar',{look:outfit},{origin:'https://elsewhere.test'})).status,403);
  const saved=await f.social(b,'avatar',{friend:c.id,look:{...outfit,face:'shirt-01',privateNote:'not a catalog field'}});
  assert.deepEqual(saved.data,{ok:true});
  assert.equal((await f.social(null,avatar)).status,401);
  assert.equal((await f.social(a,avatar)).status,403);
  const requested=await f.request(a,b);
  assert.equal(requested.status,200);
  assert.equal((await f.social(a,avatar)).status,403);
  const request=(await f.state(b)).friendRequests.incoming[0].id;
  assert.equal((await f.social(b,'friend-response',{request,accept:true})).status,200);
  assert.deepEqual((await f.social(a,avatar)).data,{look:outfit});
  assert.deepEqual((await f.social(b,'avatar?friend='+encodeURIComponent(a.id))).data,{look:null});
  assert.equal((await f.social(c,avatar)).status,403);
  assert.equal(sqlite.prepare('SELECT avatar_look FROM social_profiles WHERE id=?').get(c.id).avatar_look,null);
  const next={...outfit,head:null,expression:'grin'};
  assert.equal((await f.social(b,'avatar',{look:next})).status,200);
  assert.deepEqual((await f.social(a,avatar)).data,{look:next});
  assert.equal((await f.social(a,'remove',{friend:b.id})).status,200);
  assert.equal((await f.social(a,avatar)).status,403);
 }finally{sqlite.close();}
});

test('duplicate and crossed requests stay pending; decline, cancel and removal prevent stale accepts',async()=>{
 const f=await fixture(),{a,b,c,sqlite}=f;try{
  await Promise.all([f.request(a,b),f.request(b,a),f.request(a,b)]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_friend_requests').get().n,1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_friends').get().n,0);
  const row=sqlite.prepare('SELECT * FROM social_friend_requests').get(),recipient=row.recipient===a.id?a:b,sender=row.sender===a.id?a:b;
  assert.equal((await f.social(c,'friend-cancel',{request:row.id})).status,410);
  assert.equal((await f.social(recipient,'friend-response',{request:row.id,accept:false})).status,200);
  assert.equal((await f.social(recipient,'friend-response',{request:row.id,accept:true})).status,410);
  assert.equal((await f.request(sender,recipient)).status,429,'decline has a resend cooldown');
  sqlite.exec('UPDATE social_friend_requests SET updated=0');await f.request(sender,recipient);
  let next=(await f.state(recipient)).friendRequests.incoming[0];assert.notEqual(next.id,row.id);
  assert.equal((await f.social(recipient,'friend-response',{request:row.id,accept:true})).status,404);
  await f.social(sender,'friend-cancel',{request:next.id});
  assert.equal((await f.social(recipient,'friend-response',{request:next.id,accept:true})).status,410);
  sqlite.exec('UPDATE social_friend_requests SET updated=0');await f.request(sender,recipient);next=(await f.state(recipient)).friendRequests.incoming[0];
  await f.social(recipient,'friend-response',{request:next.id,accept:true});
  await f.social(sender,'remove',{friend:recipient.id});
  assert.equal((await f.social(recipient,'friend-response',{request:next.id,accept:true})).status,410);
  assert.equal((await f.state(recipient)).friends.length,0);
 }finally{sqlite.close();}
});

test('session identity, same-origin validation, invalid targets and cancellation races are enforced',async()=>{
 const f=await fixture(),{a,b,c,db,sqlite}=f;try{
  assert.equal((await f.call('/api/social/friend-request',{body:{playerId:b.playerId},headers:{'oai-authenticated-user-id':a.id}})).status,401);
  assert.equal((await f.request(a,a)).status,400);
  for(const playerId of ['bad',a.code,a.id,null,{},'0'.repeat(32)])assert.equal((await f.social(a,'friend-request',{playerId})).status,playerId==='0'.repeat(32)?404:400);
  assert.equal((await f.social(a,'friend-request',{playerId:b.playerId},{origin:'https://other.test'})).status,403);
  await f.request(a,b);let request=(await f.state(b)).friendRequests.incoming[0];
  assert.equal((await f.social(c,'friend-response',{request:request.id,accept:true},{headers:{'oai-authenticated-user-id':b.id}})).status,404);
  const batch=db.batch;let intercepted=false;
  db.batch=async statements=>{
   if(!intercepted&&statements.some(s=>s.args.includes(request.id))){intercepted=true;sqlite.prepare("UPDATE social_friend_requests SET status='cancelled' WHERE id=?").run(request.id);}
   return batch(statements);
  };
  assert.equal((await f.social(b,'friend-response',{request:request.id,accept:true})).status,410);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_friends').get().n,0,'cancel between read and transaction cannot create friendship');
  db.batch=batch;
 }finally{sqlite.close();}
});

test('reset everything removes sent and received friend requests without affecting other players',async()=>{
 const f=await fixture(),{a,b,c,sqlite}=f;try{
  await f.request(a,b);await f.request(c,a);await f.request(b,c);
  const before=(await f.state(c)).friendRequests.incoming[0].id;
  const reset=await f.call('/api/session/reset',{user:a,body:{confirm:true}});assert.equal(reset.status,200);assert.equal(reset.data.reset,true);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_friend_requests WHERE sender=? OR recipient=?').get(a.id,a.id).n,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_friend_requests').get().n,1);
  assert.equal((await f.state(c)).friendRequests.incoming[0].id,before);assert.equal((await f.state(b)).friendRequests.incoming.length,0);
 }finally{sqlite.close();}
});

test('migration gives existing players unique public identifiers while preserving friend codes and friendships',()=>{
 const sqlite=new DatabaseSync(':memory:');try{
  const migrations=fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort();
  for(const file of migrations.filter(f=>f<'0007_'))sqlite.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
  for(const [id,code] of [['a','abcdefgh23'],['b','jkmnpqrs45']])sqlite.prepare('INSERT INTO social_profiles VALUES (?,?,?,?,?,?)').run(id,code,id,'#77d9dc',0,0);
  sqlite.prepare('INSERT INTO social_friends VALUES (?,?,?)').run('a','b',0);
  sqlite.exec(fs.readFileSync(new URL('../drizzle/0007_friend_requests.sql',import.meta.url),'utf8'));
  const rows=sqlite.prepare('SELECT * FROM social_profiles').all();assert.equal(new Set(rows.map(r=>r.public_id)).size,2);for(const row of rows)assert.match(row.public_id,/^[a-f0-9]{32}$/);
  assert.equal(rows[0].code,'abcdefgh23');assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_friends').get().n,1);
 }finally{sqlite.close();}
});
