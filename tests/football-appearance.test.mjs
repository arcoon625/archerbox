import assert from 'node:assert/strict';
import {Color} from '../public/vendor/three.module.js';
import {ROSTERS} from '../public/games/touchdown-rush/rosters.js';
import {gameRoster,CLASSIC_HILL} from '../public/games/touchdown-rush/classic.js';
import {PLAYER_SKIN_TONES} from '../public/games/touchdown-rush/appearance-data.js';
import {playerAppearance,DEFAULT_SKIN_TONE} from '../public/games/touchdown-rush/appearance.js';
import {makePlayer} from '../public/games/touchdown-rush/players.js';
import {dispose} from '../public/games/touchdown-rush/scene.js';
import {createGame,lineup,beginPlaceKick} from '../public/games/touchdown-rush/rules.js';
import {createInjury} from '../public/games/touchdown-rush/injuries.js';
import {makeRoom,readyPlayer,publicRoom} from '../server/matches.js';

const athletes=new Map();
for(const r of Object.values(ROSTERS))for(const p of [...r.offense,...r.defense,...r.reserves.players,...['K','P','H','LS','KR','PR'].map(k=>r.specialTeams[k])])athletes.set(p.id,p);
athletes.set(CLASSIC_HILL.id,CLASSIC_HILL);
for(const p of athletes.values()){
 const a=playerAppearance(p.id);assert(a.matched,`${p.name} has a sourced appearance`);assert.match(a.skinTone,/^#[0-9a-f]{6}$/i);assert(a.source.endsWith('/'+p.id+'.png')||a.source==='https://www.atlantafalcons.com/team/players-roster/jack-strand/');
}
assert.equal(Object.keys(PLAYER_SKIN_TONES).length,athletes.size);
assert.equal(playerAppearance('missing').skinTone,DEFAULT_SKIN_TONE);
assert.equal(playerAppearance(null).matched,false);

// Reproduces the old name/number hash bug: a single athlete must keep their
// visible color when the name label, jersey, role, kit or actor slot changes.
for(const id of ['3918298','3916387','3117251','3116406','4361741']){
 const expected=new Color(playerAppearance(id).skinTone).getHex();
 for(const options of [{playerName:'Original name',number:12,role:'QB',away:false},{playerName:'New label',number:99,role:'WR',away:true}]){
  const m=makePlayer(0x003594,options.number,{...options,playerId:id});let exposedParts=0;
  assert.equal(m.userData.skin.color.getHex(),expected);assert.equal(m.userData.appearance.playerId,id);
  m.traverse(part=>{if(part.material?.name==='Player skin'){exposedParts++;assert.equal(part.material,m.userData.skin,'face, neck, arms and calves share the same skin material');}});
  assert(exposedParts>=8,'skin remains visible on the articulated head, neck, arms and legs');dispose(m);
 }
}
assert.notEqual(playerAppearance('3918298').skinTone,playerAppearance('3916387').skinTone,'distinct source portraits must not collapse to a shared default');

// A backup owns their appearance; they cannot inherit the injured actor's.
const g=createGame('pro',{teamRosters:[ROSTERS['san-francisco-49ers'],ROSTERS['baltimore-ravens']]});
const before=g.actors[0].playerId,e=createInjury(g,0,'head');assert(e);lineup(g);
assert.notEqual(g.actors[0].playerId,before);assert.equal(g.actors[0].playerId,e.replacement.id);assert(playerAppearance(g.actors[0].playerId).matched);
beginPlaceKick(g);for(const a of g.actors)assert(playerAppearance(a.playerId).matched,'specialists use their own appearance');
assert.equal(playerAppearance(gameRoster('miami-dolphins',true).offense[1].id).skinTone,playerAppearance(CLASSIC_HILL.id).skinTone);

// Friend seats remap actor slots, never the stable athlete identity/color.
const room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');
readyPlayer(room,'a',{team:'buffalo-bills'},10000);readyPlayer(room,'b',{team:'baltimore-ravens'},10000);
const guest=publicRoom(room,'b').match;
for(const a of guest.actors){const original=room.match.actors[a.id<11?a.id+11:a.id-11];assert.deepEqual(playerAppearance(a.playerId),playerAppearance(original.playerId));}
console.log(`Appearance passed: ${athletes.size} sourced identities, consistent exposed skin, home/away and jersey changes, backups, specialists, Classic Hill and friend seats.`);
