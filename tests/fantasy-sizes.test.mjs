import assert from 'node:assert/strict';
import * as f from '../public/fantasy/rules.js';
import {NFL_DATA} from '../public/fantasy/nfl-data.js';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';
import {handleFantasy} from '../server/fantasy.js';
import {handleSocial} from '../server/social.js';
function makeLeague(count,mode='archerbox'){
 const l=f.createLeague({id:'size-'+count+'-'+mode,code:'SIZE1234',managerId:'manager-1',managerName:'Archer',mode});
 for(let i=2;i<=count;i++)f.joinLeague(l,{managerId:'manager-'+i,managerName:'Manager '+i},1);
 return l;
}
const solo=makeLeague(1);assert.throws(()=>f.startDraft(solo,[],1),/2–14/);assert.equal(solo.phase,'lobby');
for(let count=2;count<=14;count++)for(const mode of ['archerbox','nfl']){
 const l=makeLeague(count,mode);assert(l.teams.every(t=>!t.cpu));
 if(count===14)assert.throws(()=>f.joinLeague(l,{managerId:'extra',managerName:'Extra'},1),/14 managers/);
 f.startDraft(l,[],10);assert.equal(l.teams.length,count,'no unrequested CPU managers');
 l.teams.forEach(t=>t.auto=true);f.tickDraft(l,10);assert.equal(l.phase,'lineup');assert.equal(l.draft.length,count*12);assert.equal(new Set(l.draft.map(p=>p.player)).size,count*12);
 assert.deepEqual(l.draft.slice(0,count*2).map(p=>p.team),[...l.teams.map(t=>t.id),...l.teams.map(t=>t.id).reverse()]);
 for(const t of l.teams){assert.equal(t.roster.length,12);assert(t.lineup.every((id,i)=>f.eligible(f.player(l,id),f.SLOTS[i])),count+' '+mode+' legal starters');assert.equal(new Set(t.lineup).size,9);}
 for(let i=0;i<l.draft.length;i++)assert.equal(l.draft[i].round,Math.floor(i/count)+1);
 // A complete rotation covers every opponent once and rotates each odd-league bye once.
 const opponents=new Set(),byeCounts=Object.fromEntries(l.teams.map(t=>[t.id,0]));
 for(let week=1;week<=(count%2?count:count-1);week++){
  const pairs=f.roundRobin(l.teams.map(t=>t.id),week),playing=pairs.flat();assert.equal(new Set(playing).size,playing.length);
  for(const pair of pairs){const key=pair.sort().join(':');assert(!opponents.has(key));opponents.add(key);}
  for(const t of l.teams)if(!playing.includes(t.id))byeCounts[t.id]++;
 }
 assert.equal(opponents.size,count*(count-1)/2);for(const n of Object.values(byeCounts))assert.equal(n,count%2);
 for(let week=1;week<=f.seasonWeeks(l);week++){
  const totalBefore=Object.fromEntries(l.teams.map(t=>[t.id,t.points]));
  f.startWeek(l,week*100,mode==='nfl'?{nflWeek:week,nflData:NFL_DATA.weeks[week]}:{});
  const w=l.active,playing=w.matchups.flatMap(m=>[m.a,m.b]);assert.equal(new Set(playing).size,playing.length);
  assert.equal(playing.length+w.byes.length,count);assert(w.matchups.every(m=>m.a&&m.b&&m.a!==m.b));
  assert.equal(w.byes.length,count%2);assert(Object.values(w.scores).every(Number.isFinite));
  const byeRecords=w.byes.map(id=>[id,f.team(l,id).wins,f.team(l,id).losses,f.team(l,id).ties]);
  f.finishWeek(l,week*100+1);for(const t of l.teams)assert.equal(t.points,f.round(totalBefore[t.id]+w.scores[t.id]));
  for(const [id,wins,losses,ties] of byeRecords)assert.deepEqual([f.team(l,id).wins,f.team(l,id).losses,f.team(l,id).ties],[wins,losses,ties]);
  assert.equal(l.phase,week===f.seasonWeeks(l)?'complete':'lineup');
 }
 assert.equal(l.history.length,count<4?5:6);assert(f.championshipFinished(l));assert.equal(l.champion,l.history.at(-1).matchups[0].winner);
 const copy=JSON.stringify(l.history);f.manualWeeks(l);assert.equal(JSON.stringify(l.history),copy,'existing saved history remains intact');
}
// API boundary: 14 seats, racing for the final seat, minimum two, and automatic
// deletion of a small league after its Week 5 championship.
const {db,sqlite}=fantasyDatabase(),origin='https://archerbox.test';
async function api(user,path,body,kind='fantasy'){
 const request=new Request(origin+'/api/'+kind+'/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':user},body:body===undefined?undefined:JSON.stringify(body)});
 const r=await(kind==='social'?handleSocial(request,db):handleFantasy(request,db,{nflProvider:async week=>NFL_DATA.weeks[week]}));return {status:r.status,...await r.json()};
}
for(let i=1;i<=15;i++){await api('user-'+i,'profile',{name:'Manager '+i},'social');await api('user-'+i,'register',{position:'WR'});}
let created=await api('user-1','create',{name:'Full lobby'}),{id,code}=created.league;
assert.equal((await api('user-1','league/'+id,{action:'draftStart'})).status,400);
for(let i=2;i<=13;i++)assert.equal((await api('user-'+i,'join',{code})).status,200);
const race=await Promise.all([14,15].map(i=>api('user-'+i,'join',{code})));assert.deepEqual(race.map(r=>r.status).sort(),[200,400]);
assert.equal((await api('user-1','league/'+id)).league.teams.length,14);
assert.equal((await api('user-1','join',{code})).league.teams.length,14,'reopening a full league is idempotent');
for(const count of [2,3]){
 const start=await api('user-1','create',{name:'Small '+count,mode:'nfl'}),id=start.league.id;
 for(let i=2;i<=count;i++)await api('user-'+i,'join',{code:start.league.code});
 assert.equal((await api('user-1','league/'+id,{action:'draftStart'})).league.teams.length,count);
 for(let i=1;i<=count;i++)await api('user-'+i,'league/'+id,{action:'auto',enabled:true});
 for(let week=1;week<=5;week++){
  const live=await api('user-1','league/'+id,{action:'weekStart',nflWeek:week});assert.equal(live.status,200);assert.equal(live.league.week,week);
  const finished=await api('user-1','league/'+id,{action:'weekFinish'});assert.equal(finished.status,200);
  if(week<5)assert.equal(finished.league.phase,'lineup');else assert(finished.deleted&&finished.champion);
 }
 assert.equal((await api('user-2','league/'+id)).status,404);
}
sqlite.close();console.log('Fantasy sizes passed: every size 2–14 in both modes, 168-pick drafts, legal lineups, odd-size bye rotation, complete seasons, standings, consolation games, minimum/capacity races and small-league championship cleanup.');
