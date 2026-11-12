import assert from 'node:assert/strict';
import {TEAMS} from '../public/games/touchdown-rush/teams.js';
import {teamRoster,realNumbers} from '../public/games/touchdown-rush/rosters.js';
import {SPECIAL_TEAMS,SPECIAL_TEAMS_CHECKED} from '../public/games/touchdown-rush/special-teams.js';
import {createGame,lineup,punt,kickoff,beginPlaceKick,step,endPlay,direction} from '../public/games/touchdown-rush/rules.js';
import {makeRoom,readyPlayer,publicRoom,encodeRoom} from '../server/matches.js';
const advance=(g,seconds)=>{for(let t=0;t<seconds;t+=1/120)step(g,{},1/120);};
const identity=(actor,p)=>{assert.equal(actor.playerId,p.id);assert.equal(actor.name,p.name);assert.equal(actor.jerseyNumber,p.number);};
function unique(g){for(const team of [0,1]){const unit=g.actors.filter(a=>a.team===team);assert.equal(unit.length,11);assert.equal(new Set(unit.map(a=>a.playerId)).size,11);assert.equal(new Set(unit.map(a=>a.jerseyNumber)).size,11);}}
assert.match(SPECIAL_TEAMS_CHECKED,/^2026-\d{2}-\d{2}$/);
assert.deepEqual(Object.keys(SPECIAL_TEAMS).sort(),TEAMS.map(t=>t.id).sort());
for(const t of TEAMS){
 const roster=teamRoster(t.id),s=roster.specialTeams;
 assert.equal(s.season,2026);
 for(const role of ['K','P','H','LS','KR','PR']){const p=s[role];assert(p.id&&p.name&&p.shortName&&p.depthSlot);assert(Number.isInteger(p.number)&&p.number>=0&&p.number<=99);}
 assert.equal(s.K.position,'PK');assert.equal(s.P.position,'P');assert.equal(s.LS.position,'LS');
 for(const team of [0,1])for(const kind of ['fieldGoal','extraPoint','punt','kickoff']){
  const rosters=[roster,teamRoster('kansas-city-chiefs')];if(team===1)rosters.reverse();
  const g=createGame('rookie',{teamRosters:rosters,offenseNumbers:[Array.from({length:11},(_,i)=>90-i),null]});
  g.offense=team;g.line=-direction(team)*30;lineup(g);const version=g.personnelVersion,o=team*11,f=(1-team)*11;
  if(kind==='extraPoint'){g.pendingTry=true;g.phase='dead';beginPlaceKick(g,kind);}else if(kind==='fieldGoal')beginPlaceKick(g);else (kind==='punt'?punt:kickoff)(g);
  assert(g.personnelVersion>version,'switching units refreshes player models even for the same offense');assert.equal(g.specialTeams.kind,kind);assert.equal(g.specialTeams.kickingTeam,team);unique(g);
  identity(g.actors[o],s[kind==='punt'?'P':'K']);assert.notEqual(g.actors[o].role,'QB');
  if(kind==='fieldGoal'||kind==='extraPoint'){
   identity(g.actors[g.placeKick.holder],s.H);identity(g.actors[g.placeKick.longSnapper],s.LS);assert.equal(g.actors[g.placeKick.longSnapper].x,g.placeKick.from.x);
  }else{
   const receiver=rosters[1-team].specialTeams[kind==='punt'?'PR':'KR'];identity(g.actors[f+1],receiver);
   if(kind==='punt')identity(g.actors[o+8],s.LS);
   while(g.phase==='kick')step(g,{},1/120);
   assert.equal(g.offense,1-team);assert.equal(g.carrier,f+1);identity(g.actors[g.carrier],receiver);unique(g);
   advance(g,.15);identity(g.actors[g.carrier],receiver);
   endPlay(g,'tackle');advance(g,2.6);assert.equal(g.phase,'ready');assert.equal(g.specialTeams,null);
   for(const a of g.actors){const expected=rosters[a.team][a.team===g.offense?'offense':'defense'][a.id%11];assert.equal(a.playerId,expected.id);assert.equal(a.specialRole,null);}
  }
 }
}
const d=SPECIAL_TEAMS['dallas-cowboys'],kc=SPECIAL_TEAMS['kansas-city-chiefs'];
assert.deepEqual([d.K.name,d.K.number,d.P.name,d.P.number,d.LS.name,d.LS.number,d.KR.name,d.KR.number],['Brandon Aubrey',17,'Bryan Anger',5,'Trent Sieg',44,'KaVontae Turpin',9]);
assert.deepEqual([kc.K.name,kc.K.number,kc.P.name,kc.P.number,kc.LS.name,kc.LS.number,kc.PR.name,kc.PR.number],['Harrison Butker',7,'Matt Araiza',14,'James Winchester',41,'Nikko Remigio',81]);
assert.notEqual(SPECIAL_TEAMS['denver-broncos'].KR.id,SPECIAL_TEAMS['denver-broncos'].PR.id,'kick and punt returners are independently sourced');
// Friend serialization must preserve player identities and remap every specialist.
for(const team of [0,1])for(const kind of ['fieldGoal','punt','kickoff']){
 let room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');readyPlayer(room,'a',{team:'dallas-cowboys'},10000);readyPlayer(room,'b',{team:'kansas-city-chiefs'},10000);
 const g=room.match;g.offense=team;g.line=-direction(team)*30;lineup(g);(kind==='fieldGoal'?beginPlaceKick:kind==='punt'?punt:kickoff)(g);
 room=JSON.parse(encodeRoom(room));const guest=publicRoom(room,'b').match;
 assert.equal(guest.specialTeams.kickingTeam,1-team);
 for(const a of guest.actors){const original=room.match.actors[a.id<11?a.id+11:a.id-11];assert.equal(a.playerId,original.playerId);assert.equal(a.jerseyNumber,original.jerseyNumber);}
 if(kind==='fieldGoal'){for(const key of ['kicker','holder','longSnapper']){const a=guest.actors[guest.placeKick[key]];assert.equal(a.team,guest.offense);assert.equal(a.specialRole,{kicker:'K',holder:'H',longSnapper:'LS'}[key]);}}
 else {while(room.match.phase==='kick')step(room.match,()=>({}),1/120);const view=publicRoom(room,'b').match;assert.equal(view.actors[view.carrier].playerId,room.match.actors[room.match.carrier].playerId);}
}
assert.equal(realNumbers('dallas-cowboys')[0],4,'ordinary offensive numbers remain unchanged');
console.log('Special teams passed: 192 listed roles, all 32 teams, real specialist numbers, four kicking situations in both directions, unique 11-player units, returner identity through catches, normal-drive restoration and serialized friend views.');
