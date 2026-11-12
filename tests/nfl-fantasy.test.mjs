import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {NFL_DATA} from '../public/fantasy/nfl-data.js';
import {parseNflWeek,applyNflScores} from '../public/fantasy/nfl-source.js';
import {createNflProvider} from '../server/nfl-fantasy.js';
import * as f from '../public/fantasy/rules.js';
import {handleFantasy} from '../server/fantasy.js';
import {handleSocial} from '../server/social.js';

// A mixed provider response deliberately includes projections and another year.
const board={season:{year:2026,type:2},week:{number:6,teamsOnBye:[{id:'2'}]},events:[{status:{type:{completed:true}},competitions:[{competitors:[{team:{id:'1'}}]}]}]};
const payload={players:Array.from({length:100},(_,i)=>({id:i+1,fullName:'Test '+i,defaultPositionId:3,proTeamId:i===98?2:1,stats:i<98?[
 {seasonId:2025,statSourceId:0,statSplitTypeId:1,scoringPeriodId:6,appliedTotal:999},
 {seasonId:2026,statSourceId:1,statSplitTypeId:1,scoringPeriodId:6,appliedTotal:888},
 {seasonId:2026,statSourceId:0,statSplitTypeId:1,scoringPeriodId:5,appliedTotal:777},
 {seasonId:2026,statSourceId:0,statSplitTypeId:1,scoringPeriodId:6,appliedTotal:i===0?11:i===1?-2:5,stats:{53:50,43:1,42:1}}
]:[]}))};
const parsed=parseNflWeek(payload,board,{week:6,checkedAt:'2026-10-23T00:00:00Z'});
assert.equal(parsed.format,'STANDARD');assert.equal(parsed.results['nfl-1'].points,11,'50 receiving yards plus a TD is 11, with no catch bonus');
assert.equal(parsed.results['nfl-2'].points,-2,'negative actual points are retained');
assert.equal(parsed.results['nfl-99'].status,'bye');assert.equal(parsed.results['nfl-99'].points,0);
assert.equal(parsed.results['nfl-100'].status,'unreported');assert.equal(parsed.results['nfl-100'].points,null);
assert.throws(()=>parseNflWeek(payload,{...board,week:{number:5}},{week:6}),/schedule/);
assert.throws(()=>parseNflWeek({players:payload.players.slice(0,20)},board,{week:6}),/Incomplete/);
assert.throws(()=>parseNflWeek({players:payload.players.map(p=>({...p,stats:p.stats.filter(s=>s.statSourceId===1)}))},board,{week:6}),/Actual/);

assert.equal(NFL_DATA.format,'STANDARD');assert(NFL_DATA.players.length>=700);
assert.equal(new Set(NFL_DATA.players.map(p=>p.id)).size,NFL_DATA.players.length);
assert.equal(NFL_DATA.players.filter(p=>p.position==='DEF').length,32);
for(const p of NFL_DATA.players){assert.equal(p.kind,'nfl');if(p.photo)assert(fs.existsSync(new URL('../public/'+p.photo,import.meta.url)));}
for(const [key,w] of Object.entries(NFL_DATA.weeks)){assert.equal(w.season,2026);assert.equal(w.week,Number(key));assert(w.complete);assert.equal(w.format,'STANDARD');assert.match(w.source,/leaguedefaults\/1\?/);}
for(const [name,points] of [['Christian McCaffrey',21.7],['Jaxon Smith-Njigba',13.4],['Josh Allen',18.3]]){
 const p=NFL_DATA.players.find(p=>p.name===name);assert(p,name);assert.equal(NFL_DATA.weeks[6].results[p.id].points,points,name+' verified Week 6 non-PPR score');
}
const league=f.createLeague({id:'nfl-test',managerId:'me',managerName:'Archer',mode:'nfl',demo:true});
f.startDraft(league,[{id:'human',kind:'human',position:'QB'}],100);league.teams[0].auto=true;f.tickDraft(league,100);
assert.equal(league.draft.length,48);assert.equal(new Set(league.draft.map(p=>p.player)).size,48);assert(league.pool.every(p=>p.kind==='nfl'));
for(const t of league.teams)assert(t.lineup.every((id,i)=>f.eligible(f.player(league,id),f.SLOTS[i])));
assert.throws(()=>f.startWeek(league,200,{nflWeek:7,nflData:{...NFL_DATA.weeks[6],week:7,complete:false}}),/completed/);
f.startWeek(league,200,{nflWeek:6,nflData:NFL_DATA.weeks[6]});assert.equal(league.active.nflWeek,6);assert.equal(league.active.end,null);
for(const t of league.teams){const expected=Math.round(t.lineup.reduce((s,id)=>s+(NFL_DATA.weeks[6].results[id]?.points??0),0)*100)/100;assert.equal(league.active.scores[t.id],expected);}
const current=JSON.stringify(league.active);f.refreshScores(league,[{player:league.teams[0].roster[0],stats:{receivingYards:9999}}]);assert.equal(JSON.stringify(league.active),current,'Archerbox matches cannot alter NFL scores');
assert.throws(()=>applyNflScores(league,NFL_DATA.weeks[5]),/match/);
const missing=structuredClone(NFL_DATA.weeks[6]);delete missing.results[league.teams[0].lineup[0]];applyNflScores(league,missing);assert.equal(league.active.results[league.teams[0].lineup[0]].points,null);
applyNflScores(league,NFL_DATA.weeks[6]);f.finishWeek(league,201);const frozen=JSON.stringify(league.history);
assert.throws(()=>f.startWeek(league,202,{nflWeek:6,nflData:NFL_DATA.weeks[6]}),/unused/);
f.startWeek(league,203,{nflWeek:1,nflData:NFL_DATA.weeks[1]});assert.equal(JSON.stringify(league.history),frozen,'new weeks cannot rewrite final results');

let now=Date.parse('2026-10-23T04:00:00Z'),calls=0,offline=false;
const provider=createNflProvider({now:()=>now,fetcher:async url=>{calls++;await Promise.resolve();if(offline)throw Error('offline');return {ok:true,json:async()=>url.includes('scoreboard')?board:payload};}});
const [one,two]=await Promise.all([provider(6),provider(6)]);assert.deepEqual(one,two);assert.equal(calls,2,'concurrent requests share the same pair of provider requests');
await provider(6);await provider(6,{refresh:true});assert.equal(calls,2,'cache protects the upstream source');
now+=61000;await provider(6,{refresh:true});assert.equal(calls,4);offline=true;now+=16*60000;
const fallback=await provider(6);assert(fallback.fallback);assert.equal(fallback.checkedAt,new Date(now-16*60000).toISOString(),'fallback does not pretend old points were freshly checked');
await assert.rejects(provider(19),/1 to 18/);await assert.rejects(provider(7),/could not be checked/);
const outage=createNflProvider({fetcher:async()=>{throw Error('offline');}});assert.equal((await outage(6)).checkedAt,NFL_DATA.weeks[6].checkedAt);

// Authenticated API: server selects points, members cannot finish each other's weeks.
const sqlite=new DatabaseSync(':memory:');for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const db={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){const r=sqlite.prepare(sql).run(...this.args);return {meta:{changes:r.changes}};}};}};
const headers=user=>({'oai-authenticated-user-id':user,Origin:'https://archerbox.test','Content-Type':'application/json'});
const nflProvider=async week=>{if(!NFL_DATA.weeks[week])throw Error('No completed NFL result');return NFL_DATA.weeks[week];};
async function api(user,path,body){const r=await handleFantasy(new Request('https://archerbox.test/api/fantasy/'+path,{method:body?'POST':'GET',headers:headers(user),body:body?JSON.stringify(body):undefined}),db,{nflProvider});return {http:r.status,...await r.json()};}
for(const user of ['a','b','c','d']){await handleSocial(new Request('https://archerbox.test/api/social/profile',{method:'POST',headers:headers(user),body:JSON.stringify({name:user})}),db);await api(user,'register',{position:'QB'});}
let r=await api('a','create',{name:'NFL API',mode:'nfl'}),l=r.league,id=l.id;assert.equal(l.mode,'nfl');
for(const user of ['b','c','d'])await api(user,'join',{code:l.code});await api('a','league/'+id,{action:'draftStart'});for(const user of ['c','d'])await api(user,'league/'+id,{action:'auto',enabled:true});await api('a','league/'+id,{action:'auto',enabled:true});l=(await api('b','league/'+id,{action:'auto',enabled:true})).league;assert.equal(l.phase,'lineup');
assert.equal((await api('b','league/'+id,{action:'weekStart',nflWeek:6})).http,403);
assert.equal((await api('a','league/'+id,{action:'weekStart',nflWeek:7})).http,503);
l=(await api('a','league/'+id,{action:'weekStart',nflWeek:6,points:9999})).league;assert.equal(l.active.source.format,'STANDARD');assert.equal(l.active.nflWeek,6);
for(const p of l.pool)assert.equal(l.active.results[p.id].points,NFL_DATA.weeks[6].results[p.id]?.points??null);
assert.equal((await api('b','league/'+id,{action:'weekFinish'})).http,403);
assert.equal((await api('a','league/'+id,{action:'lineup',lineup:l.teams[0].lineup})).http,400);
l=(await api('a','league/'+id,{action:'weekFinish'})).league;assert.equal(l.phase,'lineup');assert.equal(l.history.length,1);
assert.equal((await api('a','league/'+id,{action:'weekStart',nflWeek:6})).http,400);assert.equal((await api('a','nfl?week=6')).week.format,'STANDARD');
for(let nflWeek=1;nflWeek<=5;nflWeek++){
 l=(await api('a','league/'+id,{action:'weekStart',nflWeek})).league;assert.equal(l.active.nflWeek,nflWeek);
 if(nflWeek===5)assert.equal((await api('b','league/'+id,{action:'weekFinish'})).http,403);
 const finished=await api('a','league/'+id,{action:'weekFinish'});assert.equal(finished.http,200);
 if(nflWeek<5)assert.equal(finished.league.phase,'lineup');else{assert(finished.deleted);assert.equal(finished.league,null);assert(finished.champion);}
}
assert(!sqlite.prepare('SELECT id FROM fantasy_leagues WHERE id=?').get(id));assert.equal((await api('b','league/'+id)).http,404);
sqlite.close();
console.log('NFL fantasy passed: exact actual-source selection, standard scoring, missing/bye/negative points, real draft, unique manual periods, frozen history, provider cache/concurrency/fallback, authenticated server-owned scores and creator controls.');
