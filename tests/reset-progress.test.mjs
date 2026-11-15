import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import worker from '../worker/index.js';
import {MatchRoom} from '../worker/match-room.js';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';
import {makeRoom} from '../server/matches.js';
import * as fantasy from '../public/fantasy/rules.js';
import {createRestart,EPOCH,PENDING} from '../public/reset/client.js';
const memory=()=>{const values=new Map();return {get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()}};
function fixture(){
 const {db,sqlite}=fantasyDatabase(),objects=new Map();
 const env={DB:db,ASSETS:{fetch:async request=>{
  const path=new URL(request.url).pathname;
  if(path.startsWith('/onboarding')||path.startsWith('/reset/recover'))return new Response(fs.readFileSync(new URL('../public'+(path.startsWith('/onboarding')?'/onboarding/index.html':'/reset/recover.html'),import.meta.url)),{headers:{'Content-Type':'text/html'}});
  if(path==='/')return new Response('<html><head></head><body><main id="lobby">Lobby</main></body></html>',{headers:{'Content-Type':'text/html'}});
  return new Response('Missing',{status:404});
 }},MATCH_ROOMS:{idFromName:id=>id,get:id=>({fetch:request=>objects.get(id)?.fetch(request)||Promise.resolve(new Response('Missing',{status:404}))})}};
 async function call(path,{cookie,body,raw,origin='https://arcade.test',headers={},method=body!==undefined||raw!==undefined?'POST':'GET'}={}){
  const response=await worker.fetch(new Request('https://arcade.test'+path,{method,headers:{Origin:origin,...(method==='POST'?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(method==='POST'?{body:raw??JSON.stringify(body)}:{})}),env);return response;
 }
 async function register(name,cookie){const response=await call('/api/session',{cookie,body:{username:name}}),data=await response.json();return{cookie:response.headers.get('Set-Cookie').split(';')[0],profile:data.profile,id:sqlite.prepare('SELECT id FROM social_profiles WHERE name=?').get(name).id}}
 return {db,sqlite,env,objects,call,register};
}

test('restart requires explicit confirmation and deletes only the current player, including live match checkpoints',async()=>{
 const {db,sqlite,env,objects,call,register}=fixture(),a=await register('Alpha'),b=await register('Beta');
 const roomId=crypto.randomUUID(),room=makeRoom(roomId,{id:a.id,name:'Alpha'},{id:b.id,name:'Beta'},0,Date.now(),'color-rush');
 sqlite.prepare('INSERT INTO social_rooms VALUES (?,?,?,?,?,?)').run(roomId,a.id,b.id,JSON.stringify(room),0,Date.now());
 const durable=new Map([['room',structuredClone(room)]]),waits=[],closed=[];
 const ctx={storage:{get:async k=>durable.get(k),put:async(k,v)=>durable.set(k,structuredClone(v)),deleteAll:async()=>durable.clear()},blockConcurrencyWhile:fn=>fn(),waitUntil:p=>waits.push(p)};
 const live=new MatchRoom(ctx,{DB:db});objects.set(roomId,live);await live.initialized;live.sockets.set({close:(...args)=>closed.push(args)},{user:a.id});
 for(const p of [a,b]){
  sqlite.prepare('INSERT INTO chart_sessions VALUES (?,?,?,?)').run('session-'+p.id,p.id,'neon-clash',Date.now());
  sqlite.prepare('INSERT INTO chart_plays VALUES (?,?,?,?)').run(p.id,'neon-clash',0,Date.now());
  sqlite.prepare('INSERT INTO chart_progress VALUES (?,?,?,?,?)').run(p.id,'neon-clash','round','elimination',3);
  sqlite.prepare('INSERT INTO chart_scores VALUES (?,?,?,?,?,?,?,?,?,?)').run('score-'+p.id,p.id,'neon-clash','session-'+p.id,'elimination','round',3,3,3,Date.now());
  sqlite.prepare('INSERT INTO fantasy_players VALUES (?,?,?,?)').run(p.id,'public-'+p.id,'QB',Date.now());
  sqlite.prepare('INSERT INTO fantasy_results VALUES (?,?,?,?)').run(roomId,'public-'+p.id,'{"passingYards":100}',Date.now());
 }
 sqlite.prepare('INSERT INTO social_friends VALUES (?,?,?)').run(a.id,b.id,Date.now());
 sqlite.prepare('INSERT INTO social_invites (id,sender,recipient,status,track,created,expires) VALUES (?,?,?,?,?,?,?)').run(crypto.randomUUID(),a.id,b.id,'pending',0,Date.now(),Date.now()+10000);
 const pub='public-'+a.id,otherPub='public-'+b.id;
 const alone=fantasy.createLeague({id:'solo',code:'SOLO1234',managerId:pub,managerName:'Alpha'});
 const shared=fantasy.createLeague({id:'shared',code:'SHARED12',managerId:pub,managerName:'Alpha'});fantasy.joinLeague(shared,{managerId:otherPub,managerName:'Beta'},Date.now());
 shared.phase='lineup';shared.pool.push({id:pub,name:'Alpha',kind:'human',position:'QB',projection:10});shared.teams[1].roster=[pub];shared.teams[1].lineup=[pub,...Array(8).fill(null)];shared.history=[{results:{[pub]:{points:10}},lockedLineups:{'team-2':[pub]}}];shared.activity=[{text:'Alpha joined the league.'},{text:'Beta joined the league.'}];
 const lobby=fantasy.createLeague({id:'waiting',code:'WAIT1234',managerId:pub,managerName:'Alpha'});fantasy.joinLeague(lobby,{managerId:otherPub,managerName:'Beta'},Date.now());
 const untouched=fantasy.createLeague({id:'other',code:'OTHER123',managerId:otherPub,managerName:'Beta'});
 for(const l of [alone,shared,lobby,untouched])sqlite.prepare('INSERT INTO fantasy_leagues VALUES (?,?,?,?,?)').run(l.id,l.code,JSON.stringify(l),0,Date.now());
 for(const body of [{},{confirm:false},{confirm:'true'}])assert.equal((await call('/api/session/reset',{cookie:a.cookie,body})).status,400);
 assert.equal((await call('/api/session/reset',{cookie:a.cookie})).status,405);
 assert.equal((await call('/api/session/reset',{cookie:a.cookie,body:{confirm:true},origin:'https://other.test'})).status,403);
 assert.equal((await call('/api/session/reset',{cookie:a.cookie,body:{confirm:true},headers:{'Content-Type':'text/plain'}})).status,415);
 assert.equal((await call('/api/session/reset',{cookie:a.cookie,raw:'x'.repeat(1025)})).status,413);
 await call('/api/session/reset',{body:{confirm:true,userId:a.id},headers:{'oai-authenticated-user-id':a.id}});
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_profiles').get().n,2,'a forged identity cannot reset someone else');
 assert.equal((await live.fetch(new Request('https://match.internal/_restart/'+roomId,{method:'POST',headers:{'oai-authenticated-user-id':'outsider'}}))).status,403);
 const response=await call('/api/session/reset',{cookie:a.cookie,body:{confirm:true,userId:b.id}});assert.equal(response.status,200);assert.equal((await response.json()).reset,true);
 assert(response.headers.getSetCookie().some(c=>c.includes('archerbox_session=;')&&c.includes('Max-Age=0')));assert(response.headers.getSetCookie().some(c=>c.startsWith('archerbox_restart=1;')));
 for(const table of ['browser_sessions','chart_scores','chart_progress','chart_plays','chart_sessions','fantasy_players'])assert.equal(sqlite.prepare(`SELECT COUNT(*) n FROM ${table} WHERE user_id=?`).get(a.id).n,0,table);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_profiles WHERE id=?').get(a.id).n,0);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_friends WHERE a=? OR b=?').get(a.id,a.id).n,0);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_invites WHERE sender=? OR recipient=?').get(a.id,a.id).n,0);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_rooms').get().n,0);assert.equal(durable.size,1);assert.equal(durable.get('retired'),true);assert.equal(closed.length,1);
 assert.equal(live.room,null);await live.persist(true);assert.equal(durable.get('room'),undefined);
 const restored=new MatchRoom(ctx,{DB:db});await assert.rejects(()=>restored.load(roomId),/restarted/);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM fantasy_results WHERE player_id=?').get(pub).n,0);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM fantasy_results WHERE player_id=?').get(otherPub).n,1);
 assert.equal(sqlite.prepare('SELECT id FROM fantasy_leagues WHERE id=?').get('solo'),undefined);
 const remaining=JSON.parse(sqlite.prepare('SELECT data FROM fantasy_leagues WHERE id=?').get('shared').data);
 assert(!JSON.stringify(remaining).includes(pub));assert(!JSON.stringify(remaining).includes('Alpha'));
 assert.equal(remaining.owner,'team-2');assert.equal(remaining.teams[0].cpu,true);assert.equal(remaining.teams[1].managerId,otherPub);assert(remaining.pool.some(p=>p.name==='CPU Prospect'));
 const waiting=JSON.parse(sqlite.prepare('SELECT data FROM fantasy_leagues WHERE id=?').get('waiting').data);assert.equal(waiting.teams.length,1);assert.equal(waiting.owner,'team-1');
 fantasy.joinLeague(waiting,{managerId:'third-manager',managerName:'Third'},Date.now());assert.equal(new Set(waiting.teams.map(t=>t.id)).size,2);
 assert.equal(sqlite.prepare('SELECT data FROM fantasy_leagues WHERE id=?').get('other').data,JSON.stringify(untouched));
 assert.equal((await (await call('/api/charts/player',{cookie:b.cookie})).json()).totalXP,30);
 assert.equal((await (await call('/api/session',{cookie:a.cookie})).json()).ready,false);
 const fresh=await register('FreshPlayer','archerbox_restart=1');assert.notEqual(fresh.id,a.id);assert.equal((await call('/api/charts/player',{cookie:fresh.cookie})).status,409,'old pages cannot use the new player cookie');
 assert.equal((await (await call('/api/charts/player',{cookie:fresh.cookie,headers:{'X-Archerbox-Player':fresh.profile.code}})).json()).totalXP,0);
 assert.equal((await call('/api/session/reset',{cookie:fresh.cookie,body:{confirm:true},headers:{'X-Archerbox-Player':a.profile.code}})).status,409);
 const html=await (await call('/',{cookie:fresh.cookie})).text();assert(html.includes('content="'+fresh.profile.code+'"'));assert(html.includes('/player-runtime.js?v=restart1'));
 const wsId=crypto.randomUUID();objects.set(wsId,{fetch:async()=>Response.json({forwarded:true})});
 assert.equal((await call('/api/social/room/'+wsId+'/connect?playerKey='+fresh.profile.code,{cookie:fresh.cookie,headers:{Upgrade:'websocket'}})).status,200);
 assert.equal((await call('/api/social/room/'+wsId+'/connect?playerKey=wrong',{cookie:fresh.cookie,headers:{Upgrade:'websocket'}})).status,409);
 sqlite.close();
});

test('an interrupted restart stays blocked and can be retried without making a second player',async()=>{
 const {sqlite,objects,call,register}=fixture(),a=await register('RetryPlayer'),id=crypto.randomUUID();
 sqlite.prepare('INSERT INTO social_rooms VALUES (?,?,?,?,?,?)').run(id,a.id,'guest','{}',0,Date.now());objects.set(id,{fetch:async()=>new Response('retry',{status:503})});
 assert.equal((await call('/api/session/reset',{cookie:a.cookie,body:{confirm:true}})).status,503);
 assert.equal(sqlite.prepare('SELECT resetting FROM browser_sessions WHERE user_id=?').get(a.id).resetting,1);
 const state=await (await call('/api/session',{cookie:a.cookie})).json();assert.equal(state.resetting,true);assert.equal(state.ready,false);
 assert.equal((await call('/api/charts/play',{cookie:a.cookie,body:{game:'neon-clash'}})).status,409);
 assert((await (await call('/',{cookie:a.cookie})).text()).includes('Finishing your fresh start'));
 objects.set(id,{fetch:async()=>Response.json({forgotten:true})});assert.equal((await call('/api/session/reset',{cookie:a.cookie,body:{confirm:true}})).status,200);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_profiles').get().n,0);
 sqlite.close();
});

test('cancel leaves saves untouched; confirmation clears every local save only after server success',async()=>{
 const storage=memory(),session=memory(),id=crypto.randomUUID(),calls=[],deleted=[],cacheStorage={keys:async()=>['cached-assets'],delete:async k=>deleted.push(k)};
 for(const key of ['archerbox-lobby-v1','archerbox-coins-v1','archerbox-avatar-v1','archerbox-avatar-portrait-v1','archerbox-fruit-seas-v2','archerbox-pokemon-v1','archerbox-football-creators-v1','unknown-old-game-save'])storage.setItem(key,'old progress');session.setItem('old-session','data');
 let succeed=false,finished=0;
 const reset=createRestart({storage,session,cacheStorage,newId:()=>id,onFinish:()=>finished++,fetcher:async(path,options)=>{calls.push({path,options});return Response.json(succeed?{reset:true}:{error:'Try again'},{status:succeed?200:503})}});
 await assert.rejects(()=>reset.restart(false),/Confirm/);assert.equal(calls.length,0);assert.equal(storage.length,8);
 await assert.rejects(()=>reset.restart(true),/Try again/);assert.equal(storage.getItem('archerbox-coins-v1'),'old progress');assert(storage.getItem(PENDING));assert.equal(finished,0);
 succeed=true;await reset.restart(true);assert.equal(storage.length,1);assert.equal(storage.getItem(EPOCH),id);assert.equal(session.length,0);assert.deepEqual(deleted,['cached-assets']);assert.equal(finished,1);
 assert(calls.every(c=>JSON.parse(c.options.body).confirm===true));
 const newer=memory();newer.setItem(EPOCH,crypto.randomUUID());newer.setItem('new-profile','keep');
 let staleCalled=false;const stale=createRestart({storage:newer,session:memory(),currentEpoch:'old',fetcher:()=>{staleCalled=true},onFinish:()=>{}});await stale.restart(true);assert.equal(staleCalled,false);assert.equal(newer.getItem('new-profile'),'keep');
});

test('a lost reset response can finish local cleanup without sending another delete request',async()=>{
 const storage=memory(),id=crypto.randomUUID();storage.setItem('game','saved');storage.setItem(PENDING,JSON.stringify({id,confirmed:true}));let requests=0,finished=0;
 const reset=createRestart({storage,session:memory(),fetcher:async(path,options)=>{assert.equal(path,'/api/session');assert.equal(options.method,undefined);requests++;return Response.json({ready:false,profile:null})},onFinish:()=>finished++});
 assert.equal(await reset.finishIfDeleted(),true);assert.equal(requests,1);assert.equal(finished,1);assert.equal(storage.getItem(EPOCH),id);assert.equal(storage.getItem('game'),null);
});

test('page-bound storage and request identity prevent stale tabs from resurrecting a reset player',async()=>{
 const source=fs.readFileSync(new URL('../public/player-runtime.js',import.meta.url),'utf8'),raw=memory();raw.setItem('archerbox-coins-v1','old coins');
 function context(code){
  const events=new EventTarget(),navigations=[],requests=[];
  class StorageEvent extends Event{constructor(type,options){super(type);Object.assign(this,options)}}
  const context={window:null,document:{querySelector:()=>({content:code})},location:{href:'https://arcade.test/',origin:'https://arcade.test',pathname:'/',replace:path=>navigations.push(path)},localStorage:raw,sessionStorage:memory(),URL,Headers,DOMException,StorageEvent,fetch:async(input,init)=>{requests.push({input,init});return Response.json({ok:true})},addEventListener:events.addEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
  context.window=context;context.top=context;vm.runInNewContext(source,context);return{context,navigations,requests,StorageEvent};
 }
 const old=context('oldcode001');assert.equal(old.context.localStorage.getItem('archerbox-coins-v1'),'old coins');
 await old.context.fetch('/api/charts/play',{method:'POST',headers:{'Content-Type':'application/json'}});assert.equal(old.requests[0].init.headers.get('X-Archerbox-Player'),'oldcode001');
 const epoch=crypto.randomUUID();raw.clear();raw.setItem(EPOCH,epoch);raw.setItem('archerbox-coins-v1','legacy tab wrote old coins');
 const fresh=context('newcode001');assert.equal(fresh.context.localStorage.getItem('archerbox-coins-v1'),null);assert.equal(raw.getItem('archerbox-coins-v1'),null);
 fresh.context.localStorage.setItem('archerbox-coins-v1','new coins');assert.equal(raw.getItem('archerbox-save:'+epoch+':archerbox-coins-v1'),'new coins');
 assert.throws(()=>old.context.localStorage.setItem('archerbox-coins-v1','resurrect'),/restart/);
 const received=[];fresh.context.addEventListener('storage',e=>received.push(e.key));
 fresh.context.dispatchEvent(new fresh.StorageEvent('storage',{key:'archerbox-save:'+epoch+':archerbox-coins-v1',newValue:'updated',oldValue:'new coins',url:'https://arcade.test/',storageArea:raw}));
 assert.deepEqual(received,['archerbox-coins-v1']);
 raw.setItem(PENDING,JSON.stringify({id:crypto.randomUUID(),confirmed:true}));old.context.dispatchEvent(new old.StorageEvent('storage',{key:PENDING}));assert.equal(old.navigations.at(-1),'/reset/recover.html');
});

test('large match histories finish across bounded requests before expiring the player',async()=>{
 const {sqlite,objects,call,register}=fixture(),a=await register('LongHistory');
 for(let i=0;i<25;i++){const id=crypto.randomUUID();sqlite.prepare('INSERT INTO social_rooms VALUES (?,?,?,?,?,?)').run(id,a.id,'other','{}',0,Date.now());objects.set(id,{fetch:async()=>Response.json({forgotten:true})})}
 const first=await call('/api/session/reset',{cookie:a.cookie,body:{confirm:true}});assert.equal((await first.json()).pending,true);assert.equal(first.headers.get('Set-Cookie'),null);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_rooms').get().n,13);
 const second=await call('/api/session/reset',{cookie:a.cookie,body:{confirm:true}});assert.equal((await second.json()).pending,true);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_profiles').get().n,1);
 const third=await call('/api/session/reset',{cookie:a.cookie,body:{confirm:true}});assert.equal((await third.json()).reset,true);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_profiles').get().n,0);
 sqlite.close();
});

test('the browser keeps saves until every server cleanup batch has finished',async()=>{
 const storage=memory();storage.setItem('game','old save');let calls=0,finished=0;
 const reset=createRestart({storage,session:memory(),newId:()=>crypto.randomUUID(),onFinish:()=>finished++,fetcher:async()=>{assert.equal(storage.getItem('game'),'old save');calls++;return Response.json(calls<3?{pending:true,reset:false}:{reset:true})}});
 await reset.restart(true);assert.equal(calls,3);assert.equal(finished,1);assert.equal(storage.getItem('game'),null);assert.equal(storage.length,1);
});
