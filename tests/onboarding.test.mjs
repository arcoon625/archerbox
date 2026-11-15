import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import worker from '../worker/index.js';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';
import {GAMES} from '../public/catalog.js';
import {usernameChoice} from '../public/onboarding/rules.js';
import {readPlayer} from '../public/onboarding/session.js';
import {createTracker} from '../public/charts/client.js';

function fixture(){
  const {db,sqlite}=fantasyDatabase();
  const assets={async fetch(request){
    let p=decodeURIComponent(new URL(request.url).pathname).replace(/\/{2,}/g,'/');
    if(p.startsWith('/onboarding'))return new Response(fs.readFileSync(new URL('../public/onboarding/index.html',import.meta.url)),{headers:{'Content-Type':'text/html'}});
    if(p==='/'||p==='/index.html'||p==='/index')return new Response('<main id="lobby">Lobby</main>',{headers:{'Content-Type':'text/html'}});
    if(p.endsWith('.js'))return new Response('game module',{headers:{'Content-Type':'text/javascript'}});
    if(p.startsWith('/games/'))return new Response('<main id="game">Playable game</main>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
    return new Response('Not found',{status:404});
  }};
  const env={DB:db,ASSETS:assets};
  const call=(path,{cookie,body,raw,origin='https://arcade.test',extra={},method=body!==undefined||raw!==undefined?'POST':'GET'}={})=>worker.fetch(new Request('https://arcade.test'+path,{method,headers:{Origin:origin,...(method==='POST'?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...extra},...(method==='POST'?{body:raw??JSON.stringify(body)}:{})}),env);
  return {db,sqlite,env,call};
}

test('username choice rejects blanks, bad lengths and unsupported characters',()=>{
  for(const value of [null,undefined,{},['Volt'],'','   ','ab','a'.repeat(17),'Cool Player','<script>','écho','name\nname','a-b'])assert(usernameChoice(value).error,JSON.stringify(value));
  for(const value of ['Volt','Perry_Pilot','Racer2026','abc','a'.repeat(16)])assert.equal(usernameChoice(value).name,value);
  assert.equal(usernameChoice('  Nova  ').name,'Nova');
});

test('new players cannot enter through the lobby, game URLs, aliases or forged identity headers',async()=>{
  const {call,sqlite}=fixture();
  for(const path of ['/','/index.html','/index','/#play/neon-clash']){
    const r=await call(path,{extra:{'oai-authenticated-user-id':'forged'}});
    assert.equal(r.status,200);const html=await r.text();assert(html.includes('Every player'));assert(!html.includes('id="lobby"'));
    assert.match(r.headers.get('Cache-Control'),/private, no-store/);assert.equal(r.headers.get('Vary'),'Cookie');
  }
  for(const game of GAMES){
    const r=await call('/games/'+game.id+'/index.html');assert.equal(r.status,303);
    assert.equal(r.headers.get('Location'),'https://arcade.test/#play/'+game.id);
    assert(!(await r.text()).includes('Playable game'));
  }
  for(const path of ['/games/neon-clash','/games/neon-clash/','/games/neon-clash/index','/%67ames/neon-clash/index.html','/games%2Fneon-clash%2Findex.html','//games/neon-clash/index.html']){
    const r=await call(path,{extra:{Accept:'application/javascript'}});assert.equal(r.status,303,path);assert.equal(r.headers.get('Location'),'https://arcade.test/#play/neon-clash');
  }
  const room=await call('/games/turbo-kart-racing/index.html?room=abc');assert.equal(room.headers.get('Location'),'https://arcade.test/#play/turbo-kart-racing?room=abc');
  assert.equal((await call('/api/session')).headers.get('Set-Cookie'),null);
  assert.deepEqual(await (await call('/api/session')).json(),{ready:false,profile:null});
  assert.equal((await call('/api/social/profile',{body:{name:'Archer',update:false}})).status,428);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM browser_sessions').get().n,0);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM social_profiles').get().n,0);
  assert.equal(await (await call('/games/neon-clash/game.js')).text(),'game module');
  sqlite.close();
});

test('only explicit, valid registration unlocks pages, persists, and preserves existing player data',async()=>{
  const {call,sqlite,env}=fixture();
  for(const username of ['', '  ', 'ab','a'.repeat(17),'<script>','Not Allowed'])assert.equal((await call('/api/session',{body:{username}})).status,400);
  assert.equal((await call('/api/session',{body:{name:'Default without choice'}})).status,400);
  assert.equal((await call('/api/session',{raw:'{'})).status,400);
  assert.equal((await call('/api/session',{body:[]})).status,400);
  assert.equal((await call('/api/session',{body:{username:'Player'},origin:'https://other.test'})).status,403);
  assert.equal((await call('/api/session',{body:{username:'Player'},extra:{'Content-Type':'text/plain'}})).status,415);
  assert.equal((await call('/api/session',{raw:'x'.repeat(4097)})).status,413);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM browser_sessions').get().n,0);
  const registration=await call('/api/session',{body:{username:'Perry_Pilot',name:'Archer',id:'forged'}});
  assert.equal(registration.status,200);const cookie=registration.headers.get('Set-Cookie').split(';')[0],chosen=await registration.json();
  assert.equal(chosen.ready,true);assert.equal(chosen.profile.name,'Perry_Pilot');assert.match(chosen.profile.code,/^[a-z0-9]{10}$/);
  const state=await (await call('/api/session',{cookie})).json();assert.equal(state.profile.name,'Perry_Pilot');
  assert((await (await call('/',{cookie})).text()).includes('id="lobby"'));
  assert((await (await call('/games/neon-clash/index.html',{cookie})).text()).includes('Playable game'));
  const repeat=await call('/api/session',{cookie,body:{username:'DifferentName'}});assert.equal(repeat.headers.get('Set-Cookie'),null);assert.equal((await repeat.json()).profile.name,'Perry_Pilot');
  const id=sqlite.prepare('SELECT user_id FROM browser_sessions').get().user_id;
  sqlite.prepare('UPDATE social_profiles SET name=? WHERE id=?').run('Old Name',id);
  sqlite.prepare('INSERT INTO chart_scores VALUES (?,?,?,?,?,?,?,?,?,?)').run('score',id,'neon-clash','session','elimination','run',3,3,3,Date.now());
  const legacy=await (await call('/api/session',{cookie})).json();assert.equal(legacy.ready,true);assert.equal(legacy.profile.name,'Old Name');
  assert.equal((await (await call('/api/charts/player',{cookie})).json()).totalXP,30);
  assert.equal((await call('/onboarding/',{cookie})).status,303);
  const forged='archerbox_session='+'a'.repeat(64);
  assert.equal((await (await call('/api/session',{cookie:forged,extra:{'oai-authenticated-user-id':id}})).json()).ready,false);
  assert((await (await call('/',{cookie:forged})).text()).includes('Every player'));
  sqlite.exec('UPDATE browser_sessions SET expires=0');
  assert.equal((await (await call('/api/session',{cookie})).json()).ready,false);
  assert.equal((await call('/games/neon-clash/index.html',{cookie})).status,303);
  const unavailable=await worker.fetch(new Request('https://arcade.test/'),{ASSETS:env.ASSETS});assert.equal(unavailable.status,503);assert(!(await unavailable.text()).includes('id="lobby"'));
  sqlite.close();
});

test('cached HTML cannot bypass the username gate with cache validators',async()=>{
  const {call,env,sqlite}=fixture(),fetchAsset=env.ASSETS.fetch;
  env.ASSETS.fetch=async request=>{
    if(request.method!=='HEAD'&&request.headers.has('If-None-Match'))return new Response(null,{status:304,headers:request.headers.has('X-Omit-Type')?{}:{'Content-Type':'text/html'}});
    return fetchAsset(request);
  };
  for(const extra of [{'If-None-Match':'old-lobby'},{'If-None-Match':'old-lobby','X-Omit-Type':'yes'}]){
    const lobby=await call('/',{extra});assert.equal(lobby.status,200);assert((await lobby.text()).includes('Every player'));
    const game=await call('/games/neon-clash/',{extra});assert.equal(game.status,303);
  }
  const registered=await call('/api/session',{body:{username:'CachePlayer'}}),cookie=registered.headers.get('Set-Cookie').split(';')[0];
  const allowed=await call('/',{cookie,extra:{'If-None-Match':'old-lobby'}});assert.equal(allowed.status,200);assert.match(allowed.headers.get('Cache-Control'),/private, no-store/);
  sqlite.close();
});

test('tracking clients never create an automatic default username',async()=>{
  const calls=[],tracker=createTracker({fetcher:async(path,options)=>{calls.push({path,options});return Response.json({ready:false,profile:null})},storage:{getItem:()=>null,setItem:()=>{}},setTimer:()=>1,clearTimer:()=>{}});
  await tracker.play('neon-clash');await tracker.record({game:'neon-clash',event:'elimination',run:'example',progress:1});tracker.stop();
  assert(calls.length);assert(calls.every(c=>c.path==='/api/session'&&c.options.method==='GET'));
  assert.equal(await readPlayer(async()=>Response.json({ready:false,profile:null})),null);
  assert.deepEqual(await readPlayer(async()=>Response.json({ready:true,profile:{name:'Volt'}})),{name:'Volt'});
  await assert.rejects(()=>readPlayer(async()=>Response.json({error:'Try again'},{status:503})),/Try again/);
});
