import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import * as f from '../public/fantasy/rules.js';
import {handleFantasy,recordFantasyResult} from '../server/fantasy.js';
import {handleSocial} from '../server/social.js';
import {createGame,lineup as footballLineup,snap,endPlay,direction} from '../public/games/touchdown-rush/rules.js';
const sqlite=new DatabaseSync(':memory:');for(const file of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
const db={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){const r=sqlite.prepare(sql).run(...this.args);return {meta:{changes:r.changes}};}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const q of statements)results.push(await q.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
async function api(user,path,body,origin='https://archerbox.test'){const r=await handleFantasy(new Request('https://archerbox.test/api/fantasy/'+path,{method:body===undefined?'GET':'POST',headers:{'oai-authenticated-user-id':user||'','Origin':origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),db);return {http:r.status,...await r.json()};}
for(const [user,name] of [['a','Archer'],['b','Nova'],['c','Echo'],['d','Volt']])await handleSocial(new Request('https://archerbox.test/api/social/profile',{method:'POST',headers:{'oai-authenticated-user-id':user,'Origin':'https://archerbox.test','Content-Type':'application/json'},body:JSON.stringify({name})}),db);
assert.equal((await api(null,'state')).http,401);assert.equal((await api('unknown','state')).http,428);assert.equal((await api('a','register',{position:'QB'},'https://elsewhere.test')).http,403);assert.equal((await api('a','register',{position:'ALIEN'})).http,400);
const archer=(await api('a','register',{position:'QB'})).player,nova=(await api('b','register',{position:'WR'})).player;assert.equal((await api('a','register',{position:'K'})).player.position,'QB','position cannot be changed to farm another stat');
assert(!JSON.stringify(archer).includes('user_id'));assert.equal((await api('c','create',{name:'No registration'})).http,428);
let result=await api('a','create',{name:'The Test League',teamName:'Archer United'});assert.equal(result.http,200);let l=result.league,id=l.id;assert.match(l.code,/^[A-Z0-9]{8}$/);assert.equal(l.teams.length,1);assert.equal((await api('b','league/'+id)).http,403);
let joined=await api('b','join',{code:l.code.toLowerCase(),teamName:'Nova United'});assert.equal(joined.http,200);assert.equal(joined.league.teams.length,2);assert.equal((await api('b','join',{code:l.code})).league.teams.length,2,'joining twice is idempotent');assert.equal((await api('b','league/'+id,{action:'draftStart'})).http,403);
for(const user of ['c','d']){await api(user,'register',{position:'K'});await api(user,'join',{code:l.code});}
result=await api('a','league/'+id,{action:'draftStart'});l=result.league;assert.equal(l.phase,'draft');assert.equal(l.teams.length,4);assert(l.pool.some(p=>p.id===archer.id)&&l.pool.some(p=>p.id===nova.id));assert(l.pool.some(p=>p.kind==='cpu'));assert.equal((await api('b','join',{code:l.code})).http,200,'existing manager can reopen a drafted league');
assert.equal((await api('b','league/'+id,{action:'pick',player:nova.id})).http,409);result=await api('a','league/'+id,{action:'pick',player:archer.id});assert.equal(result.league.draft[0].player,archer.id);
assert.equal((await api('b','league/'+id,{action:'pick',player:archer.id})).http,409);await api('b','league/'+id,{action:'pick',player:nova.id});await api('b','league/'+id,{action:'auto',enabled:true});for(const user of ['c','d'])await api(user,'league/'+id,{action:'auto',enabled:true});result=await api('a','league/'+id,{action:'auto',enabled:true});l=result.league;assert.equal(l.phase,'lineup');assert.equal(l.draft.length,48);assert.equal(new Set(l.draft.map(p=>p.player)).size,48);
assert.deepEqual(l.draft.slice(0,8).map(d=>d.team),['team-1','team-2','team-3','team-4','team-4','team-3','team-2','team-1']);
for(const t of l.teams){assert.equal(t.roster.length,12);assert(t.lineup.every((id,i)=>f.eligible(f.player(l,id),f.SLOTS[i])));assert.equal(new Set(t.lineup).size,9);}
const own=l.teams[0];let invalid=own.lineup.slice();invalid[1]=invalid[0];assert.equal((await api('a','league/'+id,{action:'lineup',lineup:invalid})).http,400);invalid=own.lineup.slice();invalid[0]=nova.id;assert.equal((await api('a','league/'+id,{action:'lineup',lineup:invalid})).http,400);
const free=f.available(l)[0],drop=own.roster.at(-1);result=await api('a','league/'+id,{action:'add',player:free.id,drop});l=result.league;assert(l.teams[0].roster.includes(free.id));assert(!l.teams[0].roster.includes(drop));assert(l.waivers[drop]>Date.now());
result=await api('b','league/'+id,{action:'add',player:drop,drop:l.teams[1].roster.at(-1)});assert.equal(result.league.claims.length,1);assert(!result.league.teams[1].roster.includes(drop));
let stored=JSON.parse(sqlite.prepare('SELECT data FROM fantasy_leagues WHERE id=?').get(id).data);stored.waivers[drop]=Date.now()-1;sqlite.prepare('UPDATE fantasy_leagues SET data=? WHERE id=?').run(JSON.stringify(stored),id);l=(await api('a','league/'+id)).league;assert(l.teams[1].roster.includes(drop));assert.equal(l.waiverOrder.at(-1),'team-2');
const give=l.teams[0].roster.at(-1),get=l.teams[1].roster.at(-1);result=await api('a','league/'+id,{action:'trade',to:'team-2',give,get});let trade=result.league.trades[0];assert.equal(trade.status,'pending');assert.equal((await api('a','league/'+id,{action:'respondTrade',trade:trade.id,accept:true})).http,403);result=await api('b','league/'+id,{action:'respondTrade',trade:trade.id,accept:true});l=result.league;assert(l.teams[1].roster.includes(give));assert(l.teams[0].roster.includes(get));assert.equal((await api('b','league/'+id,{action:'respondTrade',trade:trade.id,accept:true})).http,403);
// Ensure the real QB starts, then verify match ingestion and duplicate protection.
let lineup=l.teams[0].lineup.slice();lineup[0]=archer.id;assert.equal((await api('a','league/'+id,{action:'lineup',lineup})).http,200);assert.equal((await api('b','league/'+id,{action:'weekStart'})).http,403);l=(await api('a','league/'+id,{action:'weekStart'})).league;assert.equal(l.phase,'live');assert.equal((await api('a','league/'+id,{action:'lineup',lineup})).http,400);assert.equal((await api('a','league/'+id,{action:'advance'})).http,400);
const room={id:'verified-finish',game:'touchdown-rush',status:'finished',players:[{id:'a'},{id:'b'}],match:{multiplayer:true,ended:true,scores:[21,14],statsByTeam:[{passingYards:250,passingTouchdowns:3,interceptionsThrown:1,rushingYards:20},{receivingYards:100,receivingTouchdowns:1,passes:5}]}};
await recordFantasyResult(db,{...room,status:'playing'});assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM fantasy_results').get().n,0);await recordFantasyResult(db,room);await recordFantasyResult(db,room);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM fantasy_results').get().n,2);
l=(await api('a','league/'+id)).league;assert.equal(l.active.results[archer.id].points,22);assert.equal(l.active.results[archer.id].games,1);assert(!JSON.stringify(l).includes('user_id'));assert.equal((await api('a','state')).leagues.length,1);
await recordFantasyResult(db,{...room,id:'worse-finish',match:{...room.match,statsByTeam:[{passingYards:25},{}]}});l=(await api('a','league/'+id)).league;assert.equal(l.active.results[archer.id].points,22,'best game counts rather than summing spam');assert.equal(l.active.results[archer.id].games,2);
// Real leagues have no timer, including leagues saved with an old deadline.
const actualNow=Date.now;let clock=actualNow()+30*86400000;
try{
 Date.now=()=>clock;
 stored=JSON.parse(sqlite.prepare('SELECT data FROM fantasy_leagues WHERE id=?').get(id).data);
 stored.active.end=stored.active.start+7*86400000;delete stored.weekTiming;
 sqlite.prepare('UPDATE fantasy_leagues SET data=? WHERE id=?').run(JSON.stringify(stored),id);
 l=(await api('a','league/'+id)).league;
 assert.equal(l.phase,'live','thirty elapsed days do not end a week');assert.equal(l.week,1);assert.equal(l.active.end,null);assert.equal(l.weekTiming,'manual');assert.equal(l.history.length,0);
 await recordFantasyResult(db,{...room,id:'late-finish',match:{...room.match,statsByTeam:[{passingYards:350,passingTouchdowns:3,rushingYards:20},{}]}});
 clock++;
 l=(await api('a','league/'+id)).league;assert.equal(l.active.results[archer.id].points,28,'matches after seven days still score');assert.equal(l.active.results[archer.id].games,3);
 assert.equal((await api('b','league/'+id,{action:'weekFinish'})).http,403,'only the creator can close a week');
 // A completion exactly at the cutoff is outside the old scoring window.
 sqlite.prepare('INSERT INTO fantasy_results (room_id,player_id,stats,completed) VALUES (?,?,?,?)').run('at-cutoff',archer.id,JSON.stringify({passingYards:500,passingTouchdowns:5}),clock);
 l=(await api('a','league/'+id,{action:'weekFinish'})).league;
 assert.equal(l.phase,'lineup');assert.equal(l.history.length,1);assert.equal(l.history[0].end,clock);assert.equal(l.history[0].results[archer.id].points,28);assert.equal(l.history[0].results[archer.id].games,3);
 const frozen=JSON.stringify(l.history),standings=JSON.stringify(f.standings(l));
 assert.equal((await api('a','league/'+id,{action:'weekFinish'})).http,400,'repeated Finish cannot settle a week twice');
 assert.equal((await api('a','league/'+id,{action:'lineup',lineup})).http,200,'lineups reopen between weeks');
 clock+=40*86400000;
 l=(await api('a','league/'+id)).league;assert.equal(l.phase,'lineup','the next week never starts by itself');assert.equal(l.week,1);assert.equal(JSON.stringify(f.standings(l)),standings);assert.equal(JSON.stringify(l.history),frozen);
 l=(await api('a','league/'+id,{action:'weekStart'})).league;assert.equal(l.week,2);assert.equal(l.active.end,null);assert.equal(l.active.start,clock);
 l=(await api('a','league/'+id)).league;assert.equal(l.active.results[archer.id].points,0,'old games and games between weeks cannot score in the next week');
 clock++;
 await recordFantasyResult(db,{...room,id:'second-week-finish'});clock++;
 l=(await api('a','league/'+id)).league;assert.equal(l.active.results[archer.id].points,22);assert.equal(l.active.results[archer.id].games,1);assert.equal(JSON.stringify(l.history),frozen,'past results stay final');
 l=(await api('a','league/'+id,{action:'weekFinish'})).league;assert.equal(l.phase,'lineup');assert.equal(l.history.length,2);assert(l.history[1].end-l.history[1].start<86400000,'a week can finish on the day it starts');
}finally{Date.now=actualNow;}
// True scoring events from the existing football rules.
const g=createGame();g.multiplayer=true;g.statsByTeam=[g.stats,{passes:0,tackles:0,touchdowns:0}];g.offense=0;g.line=30;footballLineup(g);snap(g,'run');g.actors[g.carrier].z=20;endPlay(g,'tackle');assert.equal(g.statsByTeam[0].rushingYards,10);endPlay(g,'tackle');assert.equal(g.statsByTeam[0].rushingYards,10,'dead plays cannot double-count');
g.offense=1;g.line=20;footballLineup(g);snap(g,'deep');g.passResult={kind:'complete'};g.carrier=12;g.actors[12].z=51;endPlay(g,'touchdown');assert.equal(g.statsByTeam[1].passingYards,30);assert.equal(g.statsByTeam[1].passingTouchdowns,1);assert.equal(g.statsByTeam[1].receivingTouchdowns,1);
// Both saved and practice leagues can complete an entire season at their own pace.
for(const practice of [false,true]){
 const season=f.createLeague({id:'season-'+practice,code:'DEMO1234',managerId:'me',managerName:'Archer',demo:practice});if(!practice)for(let i=2;i<=4;i++){f.joinLeague(season,{managerId:'guest-'+i,managerName:'Guest '+i},1000);season.teams.at(-1).auto=true;}f.startDraft(season,[],1000);season.teams[0].auto=true;f.tickDraft(season,1000);assert.equal(season.phase,'lineup');
 let at=10000;
 for(let week=1;week<=6;week++){
  f.startWeek(season,at);assert.equal(season.phase,'live');assert.equal(season.active.end,null);assert(Object.values(season.active.scores).every(n=>Number.isFinite(n)&&n>0));
  const before=JSON.stringify(season.active.results);f.refreshScores(season,[]);assert.equal(JSON.stringify(season.active.results),before,'CPU results stay stable while a week is open');
  at+=week%2?1:30*86400000;if(practice)f.demoAdvance(season,at);else f.finishWeek(season,at);
  assert.equal(season.history.length,week);assert.equal(season.history.at(-1).end,at);at++;
 }
 assert.equal(season.phase,'complete');assert(season.teams.some(t=>t.id===season.champion));assert.equal(season.history[5].matchups[0].winner,season.champion);assert.throws(()=>f.demoAdvance({...season,demo:false},at));
 const past=JSON.stringify(season.history);f.manualWeeks(season);assert.equal(JSON.stringify(season.history),past,'migration never reopens completed weeks');
}
// Finishing a championship deletes the shared league, never an earlier week.
for(let week=3;week<=6;week++){
 l=(await api('a','league/'+id,{action:'weekStart'})).league;assert.equal(l.week,week);
 assert(sqlite.prepare('SELECT id FROM fantasy_leagues WHERE id=?').get(id),'a live championship is retained until Finish');
 if(week===6)assert.equal((await api('b','league/'+id,{action:'weekFinish'})).http,403,'a member cannot delete a live championship by finishing it');
 const finished=await api('a','league/'+id,{action:'weekFinish'});assert.equal(finished.http,200);
 if(week<6){assert.equal(finished.league.phase,'lineup');assert(sqlite.prepare('SELECT id FROM fantasy_leagues WHERE id=?').get(id));}
 else{assert.equal(finished.deleted,true);assert.equal(finished.league,null);assert.equal(typeof finished.champion,'string');assert(!sqlite.prepare('SELECT id FROM fantasy_leagues WHERE id=?').get(id));}
}
assert.equal((await api('a','league/'+id)).http,404);assert.equal((await api('b','join',{code:l.code})).http,404,'a finished league code no longer works');
assert(!(await api('a','state')).leagues.some(v=>v.id===id));assert(!(await api('b','state')).leagues.some(v=>v.id===id));
// Old completed leagues are removed on the next visit, scoped to membership.
function oldFinished(id,managerId){const saved=f.createLeague({id,code:id,managerId,managerName:'Archer',demo:true});f.startDraft(saved,[],1);saved.teams[0].auto=true;f.tickDraft(saved,1);for(let week=1;week<=6;week++){f.startWeek(saved,week*10);f.finishWeek(saved,week*10+1);}return saved;}
function saveFixture(saved){sqlite.prepare('INSERT INTO fantasy_leagues (id,code,data,version,updated) VALUES (?,?,?,0,?)').run(saved.id,saved.code,JSON.stringify(saved),1);}
saveFixture(oldFinished('old-own',archer.id));saveFixture(oldFinished('old-other',nova.id));
const keep=f.createLeague({id:'keep-active',code:'KEEP1234',managerId:archer.id,managerName:'Archer'});saveFixture(keep);
assert.equal((await api('b','league/old-own')).http,403);assert(sqlite.prepare('SELECT id FROM fantasy_leagues WHERE id=?').get('old-own'));
const state=await api('a','state');assert(state.leagues.some(l=>l.id==='keep-active'));assert(!state.leagues.some(l=>l.id==='old-own'));
assert(!sqlite.prepare('SELECT id FROM fantasy_leagues WHERE id=?').get('old-own'));assert(sqlite.prepare('SELECT id FROM fantasy_leagues WHERE id=?').get('old-other'),'another manager’s unrelated league is untouched');
assert.equal((await api('b','league/old-other')).deleted,true,'opening an old completed league removes it gracefully');
saveFixture(oldFinished('old-create',archer.id));assert.equal((await api('a','create',{name:'Fresh season'})).http,200);assert(!sqlite.prepare('SELECT id FROM fantasy_leagues WHERE id=?').get('old-create'),'creating a new league frees completed slots');
assert(!f.championshipFinished({...oldFinished('guard',archer.id),week:5}));assert(!f.championshipFinished({...oldFinished('guard',archer.id),champion:null}));
console.log('Fantasy passed: authenticated opt-in, private leagues, snake draft, lineup eligibility and ownership, waivers, trades, real match stats, manual weeks, seeded playoffs, creator-only championship deletion, stale-code rejection, old completed cleanup, membership isolation and active-league preservation.');
