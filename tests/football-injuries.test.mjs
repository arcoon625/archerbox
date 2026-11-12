import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TEAMS} from '../public/games/touchdown-rush/teams.js';
import {teamRoster} from '../public/games/touchdown-rush/rosters.js';
import {RESERVE_ROSTERS} from '../public/games/touchdown-rush/reserves.js';
import {createGame,lineup,snap,step,endPlay,punt,kickoff,beginPlaceKick,practicePlaceKicks,strikePlaceKick} from '../public/games/touchdown-rush/rules.js';
import {createInjury,injuryTraining,injuryChance,completeMedicalPlay,isUnavailable} from '../public/games/touchdown-rush/injuries.js';
import {makeRoom,readyPlayer,publicRoom,encodeRoom,event} from '../server/matches.js';
const unique=g=>{for(const t of [0,1]){const a=g.actors.filter(p=>p.team===t);assert.equal(a.length,11);assert.equal(new Set(a.map(p=>p.playerId)).size,11);assert.equal(new Set(a.map(p=>p.jerseyNumber)).size,11);}};
const finish=(g,reason='bounds')=>{snap(g,'run');endPlay(g,reason);lineup(g);};
const advance=(g,seconds,dt=1/120)=>{for(let time=0;time<seconds;time+=dt)step(g,{},Math.min(dt,seconds-time));};
assert.deepEqual(Object.keys(RESERVE_ROSTERS).sort(),TEAMS.map(t=>t.id).sort());
let benchCount=0,substitutions=0;
for(const t of TEAMS){
 const roster=teamRoster(t.id),r=roster.reserves;assert.deepEqual(r,RESERVE_ROSTERS[t.id]);assert.match(r.checked,/^2026-\d{2}-\d{2}$/);benchCount+=r.players.length;
 assert.equal(new Set(r.players.map(p=>p.id)).size,r.players.length);
 for(const p of r.players){assert(p.id&&p.name&&p.shortName&&p.position);assert(Number.isInteger(p.number)&&p.number>=0&&p.number<=99);}
 // Every available positional backup must preserve full, distinct normal and kicking units.
 for(const offense of [0,1])for(let index=0;index<11;index++){
  const g=createGame('pro',{teamRosters:[roster,teamRoster('kansas-city-chiefs')],injurySeed:99});g.offense=offense;lineup(g);
  const original={...g.actors[index]},e=createInjury(g,index,'head');if(!e)continue;substitutions++;
  assert(r.players.some(p=>p.id===e.replacement.id));assert(![...roster.offense,...roster.defense].some(p=>p.id===e.replacement.id));
  lineup(g);assert.equal(g.actors[index].playerId,e.replacement.id);assert.equal(g.actors[index].jerseyNumber,e.replacement.number);assert.equal(g.actors[index].role,original.role);unique(g);
  for(const kind of ['punt','kickoff','fieldGoal']){
   g.offense=offense;lineup(g);(kind==='punt'?punt:kind==='kickoff'?kickoff:beginPlaceKick)(g);unique(g);
   assert(!g.actors.some(a=>a.team===0&&a.playerId===e.playerId),'injured player cannot reappear on special teams');
  }
  g.offense=1-offense;lineup(g);unique(g);assert(!g.actors.some(a=>a.team===0&&a.playerId===e.playerId));
 }
}
assert(benchCount>1500);assert(substitutions>500);
const qb=createGame();const qe=createInjury(qb,0,'head');assert.equal(qe.replacement.name,'Sam Howell');lineup(qb);assert.equal(qb.actors[0].role,'QB');assert.equal(qb.actors[0].jerseyNumber,16);
// Jersey customizations cannot produce duplicate backup numbers.
const custom=createGame('pro',{offenseNumbers:[[90,91,92,93,94,95,96,97,98,99,89],null]});assert(createInjury(custom,5,'shoulder'));lineup(custom);unique(custom);assert.equal(custom.actors[5].jerseyNumber,32);assert.equal(custom.actors[0].jerseyNumber,90);
for(const [type,plays] of [['shoulder',2],['ankle',3],['head',null],['strain',null]]){
 const g=createGame('rookie',{injurySeed:456}),original=g.actors[5].playerId,e=createInjury(g,5,type);assert(e);lineup(g);assert(isUnavailable(g,0,original));
 advance(g,20);assert(isUnavailable(g,0,original),'waiting/menu time does not heal injuries');
 for(let n=1;n<=5;n++){finish(g);assert.equal(e.status,plays&&n>=plays?'returned':plays?'sideline':'out');assert.equal(g.actors[5].playerId,plays&&n>=plays?original:e.replacement.id);unique(g);}
 if(plays){assert.equal(g.medical.notice.type,'return');assert.equal(createInjury(g,5,type),null,'no repeat injury to the same player');}
}
// Only completed plays advance absence timers, and each whistle is counted once.
const once=createGame();createInjury(once,5,'shoulder');snap(once,'run');endPlay(once,'bounds');const plays=once.medical.plays;endPlay(once,'bounds');completeMedicalPlay(once,'tackle',once.actors[11]);assert.equal(once.medical.plays,plays);
const off=createGame('pro',{injuries:false,injurySeed:1});assert.equal(createInjury(off,5,'head'),null);snap(off,'run');endPlay(off,'tackle',off.actors[11]);assert.deepEqual(off.medical.events,[]);
const idle=createGame('pro',{injurySeed:1});advance(idle,30);assert.equal(idle.medical.plays,0);assert.equal(idle.medical.events.length,0);
const misses=createGame('pro',{injurySeed:1});for(let n=0;n<30;n++)finish(misses,'incomplete');assert.equal(misses.medical.events.length,0);
const noContact=createGame('pro',{injurySeed:1});for(let n=0;n<30;n++)finish(noContact,'tackle');assert.equal(noContact.medical.events.length,0,'timeout/administrative tackle is not contact');
const practice=createGame('pro',{injurySeed:1});practicePlaceKicks(practice);assert.equal(createInjury(practice,0,'head'),null);strikePlaceKick(practice);advance(practice,8);assert.equal(practice.medical.events.length,0);
const demo=createGame();assert(injuryTraining(demo));assert.equal(demo.medical.events[0].status,'sideline');advance(demo,2.6);assert.equal(demo.actors[5].name,'Tyler Goodson');finish(demo);finish(demo);assert.equal(demo.medical.events[0].status,'returned');assert.equal(demo.actors[5].name,'Javonte Williams');assert.equal(createGame().medical.events.length,0);
// Actual automatic tackles are connected to the model.
function contactGame(seed=1){const g=createGame('pro',{injurySeed:seed});snap(g,'run');for(const a of g.actors){a.x=22;a.z=-10;}Object.assign(g.actors[5],{x:0,z:20,juke:0});Object.assign(g.actors[11],{x:0,z:20});g.playTime=1;return g;}
const hit=contactGame();step(hit,{},1/120);assert.equal(hit.phase,'dead');assert.equal(hit.medical.events.length,1);assert.equal(hit.medical.plays,1);unique(hit);
// Risk is once per tackle, bounded, and a higher relative speed increases the estimate.
const risk=createGame();assert.equal(injuryChance(risk,risk.actors[5],null),0);assert(injuryChance(risk,{vx:10},{vx:-10})>injuryChance(risk,{vx:1},{vx:1}));assert(injuryChance(risk,{vx:999},{vx:-999})<=.03);
const cap=createGame();for(const i of [0,1,5])assert(createInjury(cap,i,'head'));assert.equal(createInjury(cap,4,'head'),null);assert.equal(cap.medical.events.length,3);lineup(cap);unique(cap);
const cooldown=createGame('pro',{injurySeed:1});createInjury(cooldown,0,'head');lineup(cooldown);snap(cooldown,'run');endPlay(cooldown,'tackle',cooldown.actors[11]);assert.equal(cooldown.medical.events.length,1);assert.equal(cooldown.medical.state,1,'cooldown does not draw repeated random attempts');
// Frame time and JSON serialization cannot add random rolls during idle frames.
function replay(dt,serialize){let g=createGame('pro',{injurySeed:123456789});for(let n=0;n<25;n++){g.offense=0;lineup(g);advance(g,.4,dt);snap(g,'run');g.actors[g.carrier].vz=-8;g.actors[11].vz=6;endPlay(g,'tackle',g.actors[11]);if(serialize)g=JSON.parse(JSON.stringify(g));}return g.medical;}
assert.deepEqual(replay(1/120,false),replay(1/30,true));assert.deepEqual(replay(1/120,false),replay(.2,true));
let incidents=0;for(let n=1;n<=2000;n++){const g=createGame('pro',{injurySeed:Math.imul(n,2654435761)>>>0});snap(g,'run');g.actors[5].vz=-8;g.actors[11].vz=8;endPlay(g,'tackle',g.actors[11]);incidents+=g.medical.events.length;}assert(incidents>25&&incidents<85,'rare contact injuries across an independent seed sweep');
// Authoritative friend state, correct teams for both views, no force/heal client event.
let room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');readyPlayer(room,'a',{team:'dallas-cowboys',injuries:true},10000);readyPlayer(room,'b',{team:'kansas-city-chiefs',injuries:false},10000);assert.equal(room.match.medical.enabled,true);assert.equal(room.match.medical.state,room.seed);
const event1=createInjury(room.match,5,'head');room=JSON.parse(encodeRoom(room));const guest=publicRoom(room,'b').match;assert.equal(guest.medical.events[0].team,1);assert.equal(guest.medical.notice.team,1);assert.equal(guest.medical.events[0].playerId,event1.playerId);assert.equal(guest.medical.events[0].replacement.id,event1.replacement.id);assert.equal(publicRoom(room,'a').match.medical.events[0].team,0);
room.status='playing';const before=JSON.stringify(room.match.medical);event(room,1,'injury',{playerId:room.match.actors[0].playerId,type:'head'});event(room,0,'heal',{});assert.equal(JSON.stringify(room.match.medical),before);assert.equal(injuryTraining(room.match),false);
const disabled=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');readyPlayer(disabled,'a',{injuries:false},10000);readyPlayer(disabled,'b',{injuries:true},10000);assert.equal(disabled.match.medical.enabled,false);
const score=createGame('rookie',{injurySeed:1});snap(score,'run');score.actors[5].z=-51;endPlay(score,'touchdown');assert.equal(score.scores[0],6);assert.equal(score.stats.rushingTouchdowns,1);assert.equal(score.medical.events.length,0);assert(score.pendingTry);
// Confirm the snapshot generator excludes non-active roster groups/statuses.
const generator=fs.readFileSync(new URL('../scripts/update-injury-reserves.py',import.meta.url),'utf8');assert(generator.includes("['offense', 'defense', 'specialTeam']"));assert(generator.includes("['active', 'day-to-day']"));
console.log(`Injuries passed: ${benchCount} roster identities, ${substitutions} positional substitutions across all 32 teams, eleven distinct players on every unit, short absences/returns, game-ending injuries, contact-only risk (${incidents}/2000 trials), off/practice/reset, deterministic serialized state, friend authority, and preserved scoring.`);
