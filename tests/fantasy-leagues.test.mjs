import assert from 'node:assert/strict';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';
import {handleFantasy} from '../server/fantasy.js';
import {handleSocial} from '../server/social.js';
const {db,sqlite}=fantasyDatabase(),origin='https://archerbox.test';
async function request(user,kind,path,body){const response=await (kind==='social'?handleSocial:handleFantasy)(new Request(origin+'/api/'+kind+'/'+path,{method:body===undefined?'GET':'POST',headers:{'oai-authenticated-user-id':user,Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),db);return {status:response.status,...await response.json()};}
const api=(user,path,body)=>request(user,'fantasy',path,body);
for(const name of ['Archer','Nova','Blaze','Echo','Volt','Axel']){await request(name,'social','profile',{name});await api(name,'register',{position:'WR'});}
// The unique database index must trigger a fresh code rather than duplicating a league.
const originalRandom=crypto.getRandomValues.bind(crypto);let calls=0,first,second;
try{crypto.getRandomValues=array=>{array.fill(++calls<=2?1:2);return array;};first=await api('Archer','create',{name:'First',teamName:'Archer United',mode:'nfl'});second=await api('Archer','create',{name:'Second',teamName:'Other team'});}finally{crypto.getRandomValues=originalRandom;}
assert.equal(first.status,200);assert.equal(second.status,200);assert.notEqual(first.league.code,second.league.code);assert.equal(calls,3,'collision retried with another code');
const {id,code}=first.league;
assert.equal((await api('Nova','join',{code:'wrong!'})).status,400);assert.equal((await api('Nova','join',{code:'ZZZZZZZZ'})).status,404);assert.equal((await api('Volt','league/'+id)).status,403);
// Simultaneous friends cannot overwrite each other while joining the same lobby.
const arrivals=await Promise.all(['Nova','Blaze','Echo','Volt'].map(user=>api(user,'join',{code:' '+code.toLowerCase()+' ',teamName:user+' United'})));
assert.equal(arrivals.filter(r=>r.status===200).length,4);assert.equal(arrivals.filter(r=>r.status===400).length,0);
const lobby=(await api('Archer','league/'+id)).league;
assert.equal(lobby.teams.length,5);assert.equal(new Set(lobby.teams.map(t=>t.managerId)).size,5);assert.equal(new Set(lobby.teams.map(t=>t.id)).size,5);assert(lobby.teams.every(t=>!t.cpu));
const guest=lobby.teams[1].managerName;
assert.equal((await api(guest,'join',{code,teamName:'Duplicate'})).league.teams.length,5);
assert.equal((await api(guest,'league/'+id,{action:'draftStart'})).status,403);
assert.equal((await api(guest,'state')).leagues[0].id,id,'the same shared league is saved for the guest');
const started=await api('Archer','league/'+id,{action:'draftStart'});assert.equal(started.league.phase,'draft');
const athlete=started.league.pool[0].id;assert.equal((await api('Archer','league/'+id,{action:'pick',player:athlete})).status,200);
const observed=await api(guest,'league/'+id);assert.equal(observed.league.draft[0].player,athlete,'another account sees the owner’s draft pick');assert.equal(observed.myTeam,lobby.teams[1].id);
assert.equal((await api('Axel','join',{code})).status,400,'new managers cannot join after draft start');
// Join and create enforce the same saved-league limit; reopening stays possible.
for(let i=0;i<12;i++)assert.equal((await api('Axel','create',{name:'Capacity '+i})).status,200);
const blocked=await api('Axel','join',{code:second.league.code});assert.equal(blocked.status,400);assert.match(blocked.error,/twelve/);
const ownLeague=(await api('Axel','state')).leagues[0],ownCode=JSON.parse(sqlite.prepare('SELECT data FROM fantasy_leagues WHERE id=?').get(ownLeague.id).data).code;
assert.equal((await api('Axel','join',{code:ownCode})).status,200);
sqlite.close();
console.log('Fantasy leagues passed: unique-code collision retry, validation, simultaneous joins, flexible-manager membership, shared membership and picks, owner permissions, draft lock and league limits.');
