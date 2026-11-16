import assert from 'node:assert/strict';
import test from 'node:test';
import {TEAMS} from '../public/games/touchdown-rush/teams.js';
import {createSeason,standings,currentFixture,advanceSeason,restoreSeason,seededRandom} from '../public/games/touchdown-rush/seasons.js';
import {rollWeather,windLabel} from '../public/games/touchdown-rush/weather.js';
import {createGame,lineup,snap,throwPass,beginPlaceKick,strikePlaceKick,step} from '../public/games/touchdown-rush/rules.js';
import {kickVelocity,kickPosition,goalCrossing,kickIsGood} from '../public/games/touchdown-rush/kicking.js';
import {makeRoom,readyPlayer,publicRoom,encodeRoom} from '../server/matches.js';
import {restoreWallet,award} from '../public/economy/rules.js';

test('weather has exactly one bucket each for rain, snow and wind, and five clear buckets',()=>{
 const kinds=[];for(let bucket=0;bucket<8;bucket++){let first=true;kinds.push(rollWeather(()=>{if(first){first=false;return (bucket+.5)/8;}return .5;}).kind);}
 assert.deepEqual(kinds,['rain','snow','wind','clear','clear','clear','clear','clear']);
 assert.deepEqual(rollWeather(seededRandom(77)),rollWeather(seededRandom(77)));
});
test('rain increases actual pass error for both offenses without changing clear passing',()=>{
 for(const team of [0,1]){
  const games=['clear','rain'].map(kind=>{const g=createGame('pro',{weather:{kind},injuries:false});g.offense=team;lineup(g);snap(g,'deep');for(const a of g.actors.filter(a=>a.team!==team)){a.x=24;a.z=45;}assert(throwPass(g,team*11+1));return g;});
  assert(games[1].ball.spread>games[0].ball.spread+1);
  assert.notDeepEqual(games[1].ball.to,games[0].ball.to);
 }
});
test('wind bends field goals AND extra points, and compensating aim can score in either direction',()=>{
 const weather={kind:'wind',windX:5.8,windZ:-.8};
 for(const d of [-1,1])for(const kind of ['fieldGoal','extraPoint']){
  const g=createGame('rookie',{weather,injuries:false});g.offense=d===-1?0:1;g.line=d*28;lineup(g);
  if(kind==='extraPoint'){g.pendingTry=true;g.phase='dead';}assert(beginPlaceKick(g,kind));
  const p=g.placeKick,make=aim=>({from:p.from,goalZ:p.goalZ,...kickVelocity(d,aim,.8,weather)}),still={from:p.from,goalZ:p.goalZ,...kickVelocity(d,0,.8)};
  assert(kickIsGood(still));assert(!kickIsGood(make(0)),'centered aim drifts outside the posts');
  let best=null;for(let i=-100;i<=100;i++){const ball=make(i/100);if(kickIsGood(ball)&&(!best||Math.abs(goalCrossing(ball).x)<Math.abs(goalCrossing(best.ball).x)))best={aim:i/100,ball};}
  assert(best,'reading the wind and aiming into it can still score');
  const preview=goalCrossing(best.ball);assert(Math.abs(preview.z-p.goalZ)<1e-8);
  strikePlaceKick(g,best.aim,.8);assert.equal(g.ball.ax,weather.windX);assert.equal(g.ball.az,weather.windZ);
  for(let i=0;i<1200&&g.phase==='placekick-flight';i++)step(g,{},1/120);
  assert.equal(g.scores[g.offense],kind==='extraPoint'?1:3,'the real scored flight matches the aiming preview');
  assert(Math.abs(kickPosition(best.ball,preview.time).x-preview.x)<1e-9);
 }
 assert(windLabel(weather,-1).includes('RIGHT'));assert(windLabel(weather,1).includes('LEFT'));
 for(const d of [-1,1]){const weak={from:{x:0,z:-d*38},goalZ:d*60,...kickVelocity(d,0,.15,{kind:'wind',windX:6,windZ:-d*1.4})},end=goalCrossing(weak);assert.equal(end.reachable,false);assert(Object.values(end).every(v=>typeof v!=='number'||Number.isFinite(v)),'a headwind that stops a short kick never creates invalid preview geometry');assert(!kickIsGood(weak));}
});
test('a season gives all 32 teams 17 unique opponents and preserves forecasts across reloads',()=>{
 const s=createSeason(TEAMS,'las-vegas-raiders',{seed:91});
 assert.equal(s.weeks.length,17);
 for(const week of s.weeks){assert.equal(week.length,16);assert.equal(new Set(week.flatMap(m=>[m.home,m.away])).size,32);}
 for(const t of TEAMS){const opponents=s.weeks.map(w=>{const m=w.find(m=>m.home===t.id||m.away===t.id);return m.home===t.id?m.away:m.home;});assert.equal(new Set(opponents).size,17);}
 const before=currentFixture(s);const g=createGame('pro',{weather:before.weather});snap(g,'deep');s.inProgress={fixtureId:before.id,game:g};
 const restored=restoreSeason(JSON.parse(JSON.stringify(s)),TEAMS);assert.deepEqual(currentFixture(restored),before);assert.equal(restored.inProgress.game.phase,'live');assert.deepEqual(restored.inProgress.game.weather,before.weather);
 assert.equal(restoreSeason({version:1},TEAMS),null);
});
test('wins advance once, home/away scores are correct, and a perfect team wins a 14-team playoff',()=>{
 let s=createSeason(TEAMS,'las-vegas-raiders',{seed:91});const first=currentFixture(s),firstId=first.id;
 assert(!advanceSeason(s,[21,0],'wrong-match'));assert.equal(s.week,0);
 assert(advanceSeason(s,[21,0],firstId));assert(!advanceSeason(s,[21,0],firstId),'a replayed finish cannot advance the next week');
 const savedFirst=s.weeks[0].find(m=>m.id===firstId);assert.deepEqual(savedFirst.score,first.home===s.teamId?[21,0]:[0,21]);
 assert.equal(standings(s).find(t=>t.id===s.teamId).wins,1);
 for(let i=1;i<17;i++){const m=currentFixture(s);assert(advanceSeason(s,[35,0],m.id));s=restoreSeason(JSON.parse(JSON.stringify(s)),TEAMS);assert(s);}
 assert.equal(s.stage,'wildcard');assert.equal(s.playoffs[0].matches.length,6);assert.equal(s.seeds.AFC.length+s.seeds.NFC.length,14);assert.equal(currentFixture(s),null,'the top seed gets a first-round bye');
 assert(advanceSeason(s));assert.equal(s.stage,'divisional');assert.equal(s.playoffs[1].matches.length,4);
 while(!s.champion){const m=currentFixture(s);assert(m);assert(advanceSeason(s,[28,0],m.id));}
 assert.equal(s.champion,s.teamId);assert.equal(s.titles,1);assert.equal(s.stage,'complete');assert(!advanceSeason(s));
});
test('missing playoffs or losing a playoff still lets the full season finish',()=>{
 for(const loseAll of [true,false]){
  const s=createSeason(TEAMS,'las-vegas-raiders',{seed:19});
  for(let i=0;i<17;i++){const m=currentFixture(s);assert(advanceSeason(s,loseAll?[0,35]:[35,0],m.id));}
  let rounds=0;while(!s.champion&&rounds++<8){const m=currentFixture(s);assert(advanceSeason(s,m?[0,28]:null,m?.id));}
  assert(s.champion);assert.notEqual(s.champion,s.teamId);assert.equal(s.titles,0);
 }
});
test('friend matches share the server forecast and keep wind in world coordinates after serialization',()=>{
 let room=makeRoom(crypto.randomUUID(),{id:'a',name:'A'},{id:'b',name:'B'},0,10000,'touchdown-rush');readyPlayer(room,'a',{team:'las-vegas-raiders',weather:{kind:'wind'}},10000);readyPlayer(room,'b',{team:'kansas-city-chiefs'},10000);
 assert.deepEqual(room.match.weather,rollWeather(seededRandom(room.seed)),'client weather choices cannot override the room forecast');
 room.match.weather={kind:'wind',windX:5,windZ:-1};room=JSON.parse(encodeRoom(room));
 assert.deepEqual(publicRoom(room,'a').match.weather,publicRoom(room,'b').match.weather);
 assert.equal(publicRoom(room,'b').match.weather.windX,5);
});
test('resuming a season fixture cannot claim its already-earned touchdown coins again',()=>{
 const s=createSeason(TEAMS,'las-vegas-raiders',{seed:91}),id=currentFixture(s).id,w=restoreWallet(null),event={game:'touchdown-rush',event:'touchdown',run:'room:season:'+id,progress:2};
 assert.equal(award(w,event).amount,2);assert.equal(award(w,event).amount,0);assert.equal(award(w,{...event,progress:3}).amount,1);
});
