import assert from 'node:assert/strict';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';
import {handleCharts} from '../server/charts.js';
import {GAMES} from '../public/catalog.js';
import {DAY,METRICS,periodStart} from '../public/charts/rules.js';
const {db,sqlite}=fantasyDatabase();
let clock=Date.parse('2026-11-11T12:00:00Z');
const users=['archer-account','nova-account','volt-account'];
for(const [i,id] of users.entries())sqlite.prepare('INSERT INTO social_profiles (id,code,name,color,seen,created) VALUES (?,?,?,?,?,?)').run(id,'testcode0'+i,['Archer','Nova','Volt'][i],['#c0f16b','#b9a2fb','#77d9dc'][i],clock,clock);
async function call(path,{id=users[0],body,origin='https://arcade.test',method=body?'POST':'GET'}={}){const r=await handleCharts(new Request('https://arcade.test/api/charts/'+path,{method,headers:{...(id?{'oai-authenticated-user-id':id}:{}),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),db,{now:()=>clock});return{status:r.status,...await r.json()}}
async function play(game='neon-clash',id=users[0]){const r=await call('play',{id,body:{game}});assert.equal(r.status,200,JSON.stringify(r));return r.session}
async function score(session,progress,{id=users[0],game='neon-clash',event='elimination',run='run1',...extra}={}){return call('progress',{id,body:{game,event,run,progress,session,...extra}})}
assert.equal(METRICS.length,21);assert.deepEqual(new Set(METRICS.map(m=>m.game)),new Set(GAMES.map(g=>g.id)));
assert.equal(periodStart('daily',clock),Date.parse('2026-11-11T00:00:00Z'));
assert.equal(periodStart('weekly',clock),Date.parse('2026-11-09T00:00:00Z'));
assert.equal(periodStart('monthly',clock),Date.parse('2026-11-01T00:00:00Z'));
assert.equal(periodStart('weekly',Date.parse('2027-01-03T23:59:59Z')),Date.parse('2026-12-28T00:00:00Z'));
assert.equal(periodStart('monthly',Date.parse('2024-02-29T23:59:59Z')),Date.parse('2024-02-01T00:00:00Z'));
assert.equal((await call('play',{id:null,body:{game:'neon-clash'}})).status,401);
assert.equal((await call('play',{body:{game:'neon-clash'},origin:'https://evil.test'})).status,403);
assert.equal((await call('play',{id:'unknown',body:{game:'neon-clash'}})).status,428);
assert.equal((await call('leaderboard?game=neon-clash&period=wrong')).status,400);
assert.equal((await call('leaderboard?game=sql%27')).status,400);
assert.equal((await call('trending',{id:null})).games.filter(g=>g.players).length,0);
const s=await play();assert.equal((await score(s,5)).added,5);assert.equal((await score(s,5)).added,0);assert.equal((await score(s,3)).added,0);
// D1 serializes each transaction; both possible request orders produce a cumulative maximum.
assert.equal((await score(s,8)).added,3);assert.equal((await score(s,10)).added,2);assert.equal((await score(s,8)).added,0);
assert.equal((await score(s,11,{id:users[1]})).status,403);
assert.equal((await score(s,11,{game:'touchdown-rush',event:'touchdown'})).status,403);
assert.equal((await score(s,1000000)).status,429);
assert.equal((await score(s,-1)).status,400);assert.equal((await score(s,1.5)).status,400);
assert.equal((await score(s,11,{run:'bad string'})).status,400);
assert.equal((await score(s,11,{event:'coins'})).status,400);
assert.equal((await score(s,11,{name:'Cheater',userId:users[1],created:0,points:900})).added,1);
let b=await call('leaderboard?game=neon-clash&period=all-time');assert.equal(b.entries[0].score,11);assert.equal(b.entries[0].name,'Archer');assert.equal(b.entries[0].you,true);
assert.equal(JSON.stringify(b).includes('archer-account'),false);assert.equal(JSON.stringify(b).includes('testcode'),false);
for(let n=0;n<3;n++)await play();
let trend=await call('trending');assert.equal(trend.games.find(g=>g.game==='neon-clash').players,1);assert.equal(trend.games[0].daily.at(-1),1);
const ns=await play('neon-clash',users[1]);await score(ns,2,{id:users[1]});trend=await call('trending');assert.equal(trend.games[0].players,2);
clock+=DAY;const daySession=await play();await score(daySession,12); // same run: only one NEW kill on a new day
b=await call('leaderboard?game=neon-clash&period=daily');assert.equal(b.yourEntry.score,1);
b=await call('leaderboard?game=neon-clash&period=weekly');assert.equal(b.yourEntry.score,12);
clock=Date.parse('2026-12-01T12:00:00Z');const ms=await play();await score(ms,13);
b=await call('leaderboard?game=neon-clash&period=monthly');assert.equal(b.yourEntry.score,1);
b=await call('leaderboard?game=neon-clash&period=all-time');assert.equal(b.yourEntry.score,13);
trend=await call('trending');assert.equal(trend.games[0].players,1);assert.equal(trend.games[0].daily.reduce((a,b)=>a+b),1);
// Every game accepts its own fitting stat, and all four periods return a valid board.
for(const m of METRICS){const session=await play(m.game,users[2]),event=Object.keys(m.events)[0];assert.equal((await score(session,1,{id:users[2],game:m.game,event,run:'fresh'})).status,200);for(const p of ['all-time','monthly','weekly','daily'])assert.equal((await call(`leaderboard?game=${m.game}&period=${p}`)).status,200)}
// One-time discoveries and cumulative counters survive fresh sessions without duplicating.
const cv=await play('creature-vault');assert.equal((await score(cv,1,{game:'creature-vault',event:'discovery',run:'discovery:emberfox'})).added,1);
const cv2=await play('creature-vault');assert.equal((await score(cv2,1,{game:'creature-vault',event:'discovery',run:'discovery:emberfox'})).added,0);
// Saved friend matches constrain Rivals kills, and non-members cannot submit them.
const room={game:'neon-clash',players:users.slice(0,2).map(id=>({id})),match:{actors:[{seat:0,human:true,kills:2},{seat:1,human:true,kills:1}]}};
sqlite.prepare('INSERT INTO social_rooms (id,host,guest,data,version,updated) VALUES (?,?,?,?,?,?)').run('test-room',users[0],users[1],JSON.stringify(room),0,clock);
const rs=await play();assert.equal((await score(rs,3,{run:'room:test-room'})).status,400);assert.equal((await score(rs,2,{run:'room:test-room'})).added,2);
const vs=await play('neon-clash',users[2]);assert.equal((await score(vs,1,{id:users[2],run:'room:test-room'})).status,403);
// Honest empty board and anonymous reads have no invented CPU entries.
const empty=await call('leaderboard?game=bearwatch&period=daily',{id:null});assert.equal(empty.signedIn,false);assert.equal(empty.yourEntry,null);assert.equal(empty.entries.length,1);
// More than 50 players: top list stays bounded, while your own placement remains visible.
const insertProfile=sqlite.prepare('INSERT INTO social_profiles (id,code,name,color,seen,created) VALUES (?,?,?,?,?,?)'),insertScore=sqlite.prepare('INSERT INTO chart_scores VALUES (?,?,?,?,?,?,?,?,?,?)');
for(let n=0;n<55;n++){const id='rank-'+n;insertProfile.run(id,'rankcode'+String(n).padStart(2,'0'),'Player '+n,'#77d9dc',clock,clock);insertScore.run('score-'+n,id,'touchdown-rush','fixture','touchdown','fixture',n+1,n+1,n+1,clock)}
b=await call('leaderboard?game=touchdown-rush&period=daily',{id:'rank-0'});assert.equal(b.entries.length,50);assert.equal(b.totalPlayers,56);assert.equal(b.yourEntry.rank,55);assert.equal(b.yourEntry.score,1);
assert.equal(b.entries.some(e=>e.name==='Player 0'),false);
sqlite.close();console.log('Charts passed: 21 games × 4 periods, UTC resets, shared ranking, unique-player trends, identity checks, duplicate/reordered submissions, discovery deduplication, Rivals match validation, rate limits and own rank beyond top 50.');
