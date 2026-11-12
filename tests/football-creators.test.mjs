import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Box3} from '../public/vendor/three.module.js';
import {CREATOR_KEY,CRESTS,POSITIONS,normalizeTeam,normalizePlayer,restoreCreations,saveCreations,readCreations,resolveTeam,rosterForTeam,validatePlayerSlot,normalizeFootballConfig} from '../public/games/touchdown-rush/creator-data.js';
import {TEAMS,teamById} from '../public/games/touchdown-rush/teams.js';
import {createGame,lineup,punt,beginPlaceKick,step,snap,throwPass} from '../public/games/touchdown-rush/rules.js';
import {makePlayer} from '../public/games/touchdown-rush/players.js';
import {dispose} from '../public/games/touchdown-rush/scene.js';
import {teamLogoUrl} from '../public/games/touchdown-rush/team-branding.js';
import {makeRoom,readyPlayer,publicRoom} from '../server/matches.js';

const club=normalizeTeam({id:'club-test-000001',city:'San Diego',nickname:'Sharks',css:'#123456',accentCss:'#ffcc00',crest:'shark'});
assert.equal(club.name,'San Diego Sharks');assert.equal(club.color,0x123456);assert.equal(club.custom,true);
assert.equal(normalizeTeam({id:'dallas-cowboys',city:'Hack',nickname:'Club'}),null);
assert.equal(normalizeTeam({...club,city:''}),null);
assert.equal(normalizeTeam({...club,css:'url(javascript:bad)',crest:'../../secret'}).css,'#087f9c');
assert.equal(normalizeTeam({...club,css:'url(javascript:bad)',crest:'../../secret'}).crest,'thunder');
assert(!normalizeTeam({...club,nickname:'<script>Sharks</script>'}).name.includes('<'));
for(const crest of CRESTS){const file=new URL('../public/games/touchdown-rush/creator-logos/'+crest.id+'.png',import.meta.url);assert(fs.statSync(file).size>10000);assert.equal(fs.readFileSync(file).toString('ascii',1,4),'PNG');}
assert(teamLogoUrl(club).endsWith('/creator-logos/shark.png'));assert(teamLogoUrl(TEAMS[0]).endsWith('/logos/ari.png'));

const raw={id:'athlete-test-000001',name:'Archer Stein',team:club.id,position:'QB',height:75,weight:225,number:12,skinTone:'#986344',accuracy:99};
const athlete=normalizePlayer(raw,[club]);assert.equal(athlete.height,75);assert.equal(athlete.weight,225);
assert.equal(athlete.accuracy,99);
assert.equal(normalizePlayer({...raw,accuracy:undefined},[club]).accuracy,82,'old saved quarterbacks keep their original accuracy');
assert.equal(normalizePlayer({...raw,accuracy:1000},[club]).accuracy,99);
assert.equal(normalizePlayer({...raw,accuracy:-1000},[club]).accuracy,55);
assert.equal(normalizePlayer({...raw,accuracy:'bad'},[club]).accuracy,82);
assert.equal(normalizePlayer({...raw,position:'WR'},[club]).accuracy,75,'passing customization belongs to quarterbacks');
assert.equal(normalizePlayer({...raw,team:'not-a-team'},[club]),null);
assert.equal(normalizePlayer({...raw,position:'FLYER'},[club]),null);
const clamped=normalizePlayer({...raw,height:Infinity,weight:100000,number:-20},[club]);assert.equal(clamped.height,72);assert.equal(clamped.weight,380);assert.equal(clamped.number,0);
const data=restoreCreations({teams:[club,club],players:[athlete,athlete,{...raw,team:'gone'}]});assert.equal(data.teams.length,1);assert.equal(data.players.length,1);
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
saveCreations(storage,data);assert.deepEqual(readCreations(storage),data);assert(memory.has(CREATOR_KEY));
assert.deepEqual(readCreations({getItem:()=>'{broken'}),{teams:[],players:[]});
assert.throws(()=>saveCreations({setItem:()=>{throw Error('full')}},data),/full/);
assert.throws(()=>validatePlayerSlot({...athlete,id:'athlete-another-00001'},data),/position is full/);

const baseline=JSON.stringify(rosterForTeam(teamById('dallas-cowboys'),{players:[]}));
for(const t of [club,...TEAMS])for(const [position] of POSITIONS){
 const p=normalizePlayer({...raw,position,team:t.id},[club]),d={teams:[club],players:[p]},r=rosterForTeam(t,d);
 const players=[...r.offense,...r.defense,...Object.values(r.specialTeams).filter(p=>p&&typeof p==='object')];assert(players.some(x=>x.id===p.id),t.name+' '+position+' enters the roster');
 for(const unit of ['offense','defense']){assert.equal(r[unit].length,11);assert.equal(new Set(r[unit].map(p=>p.id)).size,11);assert.equal(new Set(r[unit].map(p=>p.number)).size,11,t.name+' '+position+' has distinct jersey numbers');}
 for(const special of ['K','P','H','LS','KR','PR'])assert(r.specialTeams[special]);
 for(const kind of ['scrimmage','punt','fieldGoal']){const g=createGame('rookie',{teamRosters:[r,rosterForTeam(teamById('kansas-city-chiefs'),{players:[]})]});if(kind==='punt')punt(g);if(kind==='fieldGoal')beginPlaceKick(g);for(const a of g.actors){assert(Number.isFinite(a.traits.speed));assert(Number.isFinite(a.x));}if(position==='QB'&&kind==='scrimmage'){assert.equal(g.actors[0].playerId,p.id);assert.equal(g.actors[0].customProfile.height,75);assert.equal(g.actors[0].customProfile.skinTone,raw.skinTone);}}
}
assert.equal(JSON.stringify(rosterForTeam(teamById('dallas-cowboys'),{players:[]})),baseline,'creating athletes never mutates NFL rosters');
let heights=[];
for(const height of [60,84]){const p=normalizePlayer({...raw,height},[club]),r=rosterForTeam(club,{players:[p]}),a=createGame('rookie',{teamRosters:[r,r]}).actors[0],model=makePlayer(club.color,a.jerseyNumber,{...club,role:a.role,customProfile:a.customProfile});model.updateMatrixWorld(true);const box=new Box3().setFromObject(model);heights.push(box.max.y);assert(Math.abs(box.max.y-(height+3)/36)<.03);assert.equal(model.userData.skin.color.getHexString(),'986344');dispose(model);}
assert(heights[1]>heights[0]+.6,'height changes the actual 3D model');

const now=1000,host={id:'creator-host',name:'Archer'},guest={id:'creator-guest',name:'Echo'},room=makeRoom('creators-room',host,guest,0,now,'touchdown-rush');
readyPlayer(room,host.id,{team:club.id,customTeam:club,createdPlayers:[athlete],difficulty:'rookie',homeSide:0},now);
readyPlayer(room,guest.id,{team:'kansas-city-chiefs'},now);
assert.equal(room.match.teamNames[0],'San Diego Sharks');assert.equal(room.match.actors[0].name,'Archer Stein');assert.equal(room.match.actors[0].customProfile.height,75);assert.equal(room.match.homeTeamId,club.id);
assert.equal(room.match.actors[0].traits.accuracy,99,'the authoritative friend match uses the saved accuracy');
const view=publicRoom(room,guest.id,'test');assert.equal(view.match.teamNames[1],club.name);assert.equal(view.match.actors[11].playerId,athlete.id);assert.equal(view.players[0].config.customTeam.crest,'shark');
assert.equal(view.match.actors[11].traits.accuracy,99);
const malformed=normalizeFootballConfig({team:club.id,customTeam:{...club,id:'javascript:alert(1)'},createdPlayers:[athlete]});assert.equal(malformed.customTeam,null);assert.equal(malformed.createdPlayers.length,0);
const g=createGame('rookie',{teamNames:[club.name,'Chiefs'],teamRosters:[rosterForTeam(club,data),rosterForTeam(teamById('kansas-city-chiefs'),{players:[]})]});snap(g,'run');for(let i=0;i<300;i++)step(g,{x:0,z:-1,sprint:true},1/120);assert(g.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));
function pressuredPass(accuracy){
 const qb=normalizePlayer({...raw,accuracy},[club]),r=rosterForTeam(club,{players:[qb]}),g=createGame('pro',{teamRosters:[r,rosterForTeam(teamById('kansas-city-chiefs'),{players:[]})],injuries:false});snap(g,'deep');
 for(const a of g.actors){a.x=24;a.z=45;}Object.assign(g.actors[0],{x:0,z:5,moving:0});Object.assign(g.actors[1],{x:0,z:-12});Object.assign(g.actors[11],{x:4,z:5});assert(throwPass(g,1));return g;
}
const standard=pressuredPass(82),elite=pressuredPass(99);
assert.equal(elite.actors[0].traits.accuracy,99);assert(elite.ball.spread<standard.ball.spread,'99 accuracy reduces actual pressured throw dispersion');
const miss=b=>Math.hypot(b.to.x-b.idealTo.x,b.to.z-b.idealTo.z);assert(miss(elite.ball)<miss(standard.ball),'same throw lands closer to its intended target');
const balanced=createGame('pro',{teamRosters:[rosterForTeam(club,data),rosterForTeam(club,data)],playerTraits:false});assert.equal(balanced.actors[0].traits.accuracy,75,'balanced mode still respects the traits switch');
console.log('Custom QB accuracy passed: legacy saves, 55–99 validation, saved 99 rating, both friend views, actual pass improvement, and balanced-mode opt-out.');
console.log('Football creators passed: all 17 positions across 32 NFL teams + a created club, real 3D height/skin, isolated rosters, specialists, save/reload/failure, validation, AI crest assets, playable runs and custom friend match identities.');
