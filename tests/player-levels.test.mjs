import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';
import worker from '../worker/index.js';
import {GAMES} from '../public/catalog.js';
import {METRICS} from '../public/charts/rules.js';
import {XP_REWARDS,levelInfo,levelThreshold,xpFor} from '../public/progression/rules.js';
import {createLevelClient} from '../public/progression/client.js';

test('all 21 games award fitting XP and level thresholds stay exact',()=>{
  assert.deepEqual(new Set(XP_REWARDS.map(r=>r.game)),new Set(GAMES.map(g=>g.id)));
  assert.deepEqual(XP_REWARDS.map(r=>r.game+'/'+r.event).sort(),METRICS.flatMap(m=>Object.keys(m.events).map(e=>m.game+'/'+e)).sort());
  assert.equal(xpFor('neon-clash','elimination'),10);
  assert.equal(xpFor('touchdown-rush','touchdown'),50);
  assert.equal(xpFor('turbo-kart-racing','finish'),75);
  assert.equal(xpFor('fake','purchase'),0);
  assert.equal(levelInfo(0).level,1);assert.equal(levelInfo(99).remainingXP,1);
  assert.equal(levelInfo(100).level,2);assert.equal(levelInfo(100).earnedXP,0);assert.equal(levelInfo(100).neededXP,150);
  assert.equal(levelInfo(249).level,2);assert.equal(levelInfo(250).level,3);
  for(let level=1;level<=10000;level++){
    const start=levelThreshold(level),s=levelInfo(start);
    assert.equal(s.level,level);assert.equal(s.earnedXP,0);assert.equal(s.neededXP,100+(level-1)*50);
    assert.equal(levelInfo(s.nextLevelXP-1).level,level);
    assert.equal(levelInfo(s.nextLevelXP).level,level+1);
  }
  assert.equal(levelInfo(levelThreshold(5)).title,'Explorer');
  assert.equal(levelInfo(levelThreshold(100)).title,'Archerbox Icon');
  for(const invalid of [-1,NaN,Infinity,'100',1.5])assert.equal(levelInfo(invalid).totalXP,0);
});

test('server-owned XP credits saved achievements once, persists, and isolates browser profiles',async()=>{
  const {db,sqlite}=fantasyDatabase();
  const env={DB:db,ASSETS:{fetch:async()=>new Response('asset')}};
  async function request(path,{cookie,body,headers={}}={}){
    const response=await worker.fetch(new Request('https://arcade.test/api/'+path,{method:body?'POST':'GET',headers:{Origin:'https://arcade.test',...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}),env);
    return {status:response.status,cookie:response.headers.get('Set-Cookie')?.split(';')[0],cache:response.headers.get('Cache-Control'),...await response.json()};
  }
  const first=await request('social/profile',{body:{name:'One',color:'#abcdef'}}),second=await request('social/profile',{body:{name:'Two'}});
  const cookie=first.cookie,other=second.cookie;
  let state=await request('charts/player',{cookie});assert.equal(state.level,1);assert.equal(state.totalXP,0);assert.equal(state.achievements,0);assert.equal(state.gamesPlayed,0);assert.match(state.cache,/no-store/);
  assert.equal((await request('charts/player')).status,401);
  assert.equal((await request('charts/player',{headers:{'oai-authenticated-user-id':'forged'}})).status,401);
  assert.equal((await request('charts/player',{cookie,body:{xp:999999,level:100}})).status,404);
  const rs=await request('charts/play',{cookie,body:{game:'neon-clash'}});
  const submit=(progress,extras={})=>request('charts/progress',{cookie,body:{game:'neon-clash',event:'elimination',run:'match-one',progress,session:rs.session,...extras}});
  assert.equal((await submit(5,{xp:100000,level:99})).added,5);
  state=await request('charts/player',{cookie});assert.equal(state.totalXP,50);assert.equal(state.level,1);
  await submit(5);await submit(3);state=await request('charts/player',{cookie});assert.equal(state.totalXP,50);
  await submit(10);state=await request('charts/player',{cookie});assert.equal(state.totalXP,100);assert.equal(state.level,2);assert.equal(state.earnedXP,0);
  const fs=await request('charts/play',{cookie,body:{game:'touchdown-rush'}});
  await request('charts/progress',{cookie,body:{game:'touchdown-rush',event:'touchdown',run:'football-one',progress:1,session:fs.session}});
  state=await request('charts/player',{cookie});assert.equal(state.totalXP,150);assert.equal(state.level,2);assert.equal(state.achievements,11);assert.equal(state.gamesPlayed,2);
  assert.equal((await request('charts/player?xp=999999&user=other',{cookie})).totalXP,150);
  const freshSession=await request('charts/play',{cookie,body:{game:'neon-clash'}});
  await submit(10,{session:freshSession.session});assert.equal((await request('charts/player',{cookie})).totalXP,150);
  assert.equal((await request('charts/player',{cookie:other})).totalXP,0);
  // A fresh client reads previous server results; no local coin balance or XP import is needed.
  const restored=await request('charts/player',{cookie,headers:{'oai-authenticated-user-id':'someone-else'}});
  assert.equal(restored.totalXP,150);assert.equal(restored.level,2);
  assert.equal('userId' in restored,false);assert.equal('code' in restored,false);
  const indexes=sqlite.prepare("PRAGMA index_list('chart_scores')").all();assert(indexes.some(i=>i.name==='chart_scores_user_game_event'));
  sqlite.close();
});

test('XP refresh handles a game event during loading, celebrates once, preserves errors, and drops a stale identity response',async()=>{
  const responses=[],states=[],ups=[],errors=[];
  const fetcher=()=>new Promise(resolve=>responses.push(resolve));
  const client=createLevelClient({fetcher,onState:s=>states.push(s),onLevelUp:s=>ups.push(s.level),onError:e=>errors.push(e.message)});
  const payload=xp=>Response.json({...levelInfo(xp),achievements:1,gamesPlayed:1});
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  client.connect('profile-one');responses.shift()(payload(90));await tick();assert.equal(client.getState().totalXP,90);
  const pending=client.refresh();void client.refresh({celebrate:true});
  responses.shift()(payload(90));await tick();
  assert.equal(responses.length,1);responses.shift()(payload(100));await pending;
  assert.equal(client.getState().level,2);assert.deepEqual(ups,[2]);
  const repeat=client.refresh({celebrate:true});responses.shift()(payload(100));await repeat;assert.deepEqual(ups,[2]);
  const failed=client.refresh({celebrate:true});responses.shift()(Response.json({error:'Offline'},{status:503}));await failed;
  assert.equal(client.getState().totalXP,100);assert.equal(errors.length,1);
  const stale=client.refresh();client.connect('profile-two');responses.shift()(payload(999999));await stale;await tick();
  assert.equal(client.getState(),null);assert.equal(responses.length,1);
  responses.shift()(payload(0));await tick();assert.equal(client.getState().level,1);assert.equal(client.getState().totalXP,0);assert.deepEqual(ups,[2]);
});
