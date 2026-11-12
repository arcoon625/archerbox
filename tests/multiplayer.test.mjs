import assert from 'node:assert/strict';
import {makeRoom,readyPlayer,tickRoom,safeInput,publicRoom,event,encodeRoom,validGame} from '../server/matches.js';
import {collisionArena,rayBox,tickRivals,rivalAction} from '../server/rivals.js';
import * as hide from '../public/games/hide-and-seek/rules.js';
import * as color from '../public/games/color-rush/rules.js';
import * as football from '../public/games/touchdown-rush/rules.js';
const start=100000,roundtrip=r=>JSON.parse(encodeRoom(r));
function room(game,track=0,a={},b={},variant='versus'){
 const r=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer',color:'#abcdef'},{id:'b',name:'Nova',color:'#fedcba'},track,start,game,variant);
 readyPlayer(r,'a',a,start);assert.equal(r.status,'waiting');readyPlayer(r,'b',b,start);assert.equal(r.status,'countdown');
 for(const p of r.players){p.connection=p.id;p.seen=r.startAt;p.input=safeInput({},game);}tickRoom(r,r.startAt);return roundtrip(r);
}
function advance(r,seconds,inputs=[{},{}]){
 const end=r.updatedAt+seconds*1000;while(r.updatedAt<end&&!['finished','left'].includes(r.status)){
  const now=Math.min(end,r.updatedAt+100);for(let i=0;i<2;i++){r.players[i].seen=now;r.players[i].input=safeInput(typeof inputs==='function'?inputs(r,i):inputs[i],r.game);}
  tickRoom(r,now);r=roundtrip(r);
 }return r;
}
assert(!validGame('floor-is-lava'));assert(!validGame('baseball-blast'));assert.equal(validGame('neon-clash').name,'Rivals');
assert.deepEqual(safeInput({x:999,z:-999,slot:5,pitch:99,yaw:Infinity,hp:999,s:999},'neon-clash'),{x:1,z:-1,sprint:false,jump:false,throttle:false,brake:false,steer:0,vertical:0,boost:false,yaw:0,pitch:1.4,fire:false,aim:false,slot:0});

for(let track=0;track<3;track++){
 let r=room('shark-racing',track,{shark:0},{shark:2});r=advance(r,240,[{throttle:true},{throttle:true,boost:true}]);
 assert.equal(r.status,'finished');assert(r.match.racers.every(a=>a.finished));assert.equal(r.match.racers.filter(a=>a.human).length,2);assert.notEqual(r.match.racers[0].time,r.match.racers[1].time);
 const a=publicRoom(r,'a','a'),b=publicRoom(r,'b','b');assert.equal(a.match.racers[0].name,'Archer');assert.equal(b.match.racers[0].name,'Nova');assert.equal(b.match.shark,2);assert.deepEqual(a.match.racers.map(a=>a.s).sort(),b.match.racers.map(a=>a.s).sort());assert(!encodeRoom(a).includes('"connection"'));
}

for(let map=0;map<3;map++)for(const role of ['hider','seeker']){
 let r=room('hide-and-seek',map,{role});const hider=r.match.actors.find(a=>a.human&&a.role==='hider'),seeker=r.match.actors.find(a=>a.role==='seeker');
 assert.equal(r.match.actors.filter(a=>!a.human).length,4);const seat=hider.id,pos={x:hider.x,z:hider.z};
 r=advance(r,.4,i=>({})); // Refresh serialized sets and maps before actions.
 r=advance(r,.4,(_,i)=>i===seat?{x:1}:{});assert(hide.distance(pos,r.match.actors[seat])>.1,'human hider can move during hiding time');
 r=advance(r,18);assert.equal(r.match.phase,'seek');assert(hide.distance(pos,r.match.actors[seat])<6,'human is not teleported to a CPU hiding spot');
 const g=r.match,s=g.actors[seeker.id],h=g.actors[seat],spot=hide.MAPS[map].spots.find(s=>!g.actors.some(a=>a.hidden===s.id));
 h.x=spot.x;h.z=spot.z;event(r,seat,'interact');assert.equal(h.hidden,spot.id);
 const privateView=publicRoom(r,seeker.id===0?'a':'b',seeker.id===0?'a':'b');assert.equal(privateView.match.actors[1].hidden,-1,'seeker cannot read a friend’s secret spot ID');assert.equal(privateView.match.actors[1].x,0);
 s.x=spot.x;s.z=spot.z;event(r,seeker.id,'interact');assert(h.found);assert.equal(g.found,1);assert.equal(g.phase,'seek','finding one human does not stop the other hiders');
 event(r,seeker.id,'ping');assert.equal(g.pingTime,3);r=advance(r,110);assert.equal(r.status,'finished');
 const view=publicRoom(r,seat===0?'a':'b',seat===0?'a':'b');assert.equal(view.match.result.win,false);
}

{
 let r=room('color-rush');assert.equal(r.match.actors.filter(a=>a.player).length,2);assert.equal(r.match.actors.length,8);
 const before=r.match.actors.map(a=>a.x);r=advance(r,.3,[{x:1,jump:true},{x:-1}]);assert(r.match.actors[0].x>before[0]);assert(r.match.actors[1].x<before[1]);assert(r.match.actors[0].y>0);
 const a=publicRoom(r,'a','a'),b=publicRoom(r,'b','b');assert.deepEqual(a.match.board,b.match.board);assert.equal(b.match.actors[0].name,'Nova');assert.equal(b.match.actors[0].player,true);assert.equal(b.match.actors[1].player,false);
 // Survive all rounds by steering each human toward the shared safe color.
 r=advance(r,180,(r,i)=>{const g=r.match,a=g.actors[i],target=color.nearestSafe(g,a);return {x:target.x-a.x,z:target.z-a.z};});assert.equal(r.status,'finished');assert(r.match.safeRounds>1);assert(r.match.actors.some(a=>a.player&&a.alive));
 // Restarting from a serialized random state produces the same next board.
 const x=room('color-rush'),y=roundtrip(x);x.match.random=color.rng(x.match.randomState);y.match.random=color.rng(y.match.randomState);color.beginRound(x.match);color.beginRound(y.match);assert.deepEqual(x.match.board,y.match.board);
 let lost=room('color-rush');lost.match.actors[0].alive=false;lost=advance(lost,.1);assert.equal(lost.status,'playing','one friend can watch the other survive');lost.match.actors[1].alive=false;lost=advance(lost,.1);assert.equal(lost.status,'finished');
}

{
 let r=room('touchdown-rush',2,{team:'dallas-cowboys',difficulty:'rookie',celebration:'griddy'},{team:'buffalo-bills'});r=advance(r,3);assert.equal(r.match.phase,'ready','human chooses when to snap');assert.equal(r.match.actors.length,22);
 event(r,1,'play',{play:'run'});assert.equal(r.match.phase,'ready','defense cannot choose the offense’s play');event(r,0,'play',{play:'deep'});const ids=r.match.controls.slice(),before=ids.map(id=>({...r.match.actors[id]}));r=advance(r,.2,[{x:1},{x:-1}]);assert(r.match.actors[ids[0]].x>before[0].x);assert(r.match.actors[ids[1]].x<before[1].x);
 event(r,0,'target',{target:2});event(r,0,'action');assert.equal(r.match.phase,'flight');assert.equal(r.match.ball.target,2);
 const guest=publicRoom(r,'b','b').match;assert.equal(guest.teamNames[0],'Buffalo Bills');assert.equal(guest.control,ids[1]-11);assert.equal(guest.ball.target,13);assert.equal(guest.viewDirection,-1);assert.equal(guest.actors[guest.control].team,0);
 // Test passes and control transfer for either offense with defenders moved away.
 for(const team of [0,1]){let p=room('touchdown-rush',0,{difficulty:'rookie'});p.match.offense=team;p.match.line=team?-30:30;football.lineup(p.match);event(p,team,'play',{play:'deep'});for(const a of p.match.actors.filter(a=>a.team!==team)){a.x=25;a.z=team?-45:45;}event(p,team,'target',{target:1});event(p,team,'action');p=advance(p,1.5);assert.equal(p.match.carrier,team*11+1);assert.equal(p.match.controls[team],team*11+1);assert.equal(p.match.statsByTeam[team].passes,1);}
 // A score is one shared event; both views get the same celebration and reversed scores.
 let td=room('touchdown-rush',0,{celebration:'griddy'});event(td,0,'play',{play:'run'});td.match.actors[td.match.carrier].z=-51;td=advance(td,.1);assert.deepEqual(td.match.scores,[6,0]);assert.equal(td.celebration.id,'griddy');assert.equal(publicRoom(td,'b','b').celebration.own,false);assert.deepEqual(publicRoom(td,'b','b').match.scores,[0,6]);
 const clock=td.match.clock;td=advance(td,2);assert.equal(td.match.clock,clock);event(td,0,'skipCelebration',{},td.updatedAt);td=advance(td,.2);assert(!td.celebration);td=advance(td,3);assert.equal(td.match.phase,'placekick-aim');event(td,0,'placeKick',{aim:0,power:.8});td=advance(td,2.2);assert.equal(td.match.scores[0],7);assert(!td.celebration);td=advance(td,2.6);assert.equal(td.match.phase,'kick');td=advance(td,3.2);assert.equal(td.match.offense,1);assert.equal(td.match.returnPlay.kind,'kickoff');football.endPlay(td.match,'tackle');td=advance(td,3);assert.equal(td.match.phase,'ready','guest QB never auto snaps');event(td,1,'play',{play:'run'});assert.equal(td.match.controls[1],16);
 const defender=td.match.actors[td.match.controls[0]],carrier=td.match.actors[td.match.carrier];defender.x=carrier.x;defender.z=carrier.z;defender.cooldown=carrier.juke=0;event(td,0,'action');assert.equal(td.match.statsByTeam[0].tackles,1);assert.equal(td.match.phase,'dead');
}

assert.equal(rayBox({x:0,y:0,z:0},{x:1,y:0,z:0},{x:5,y:0,z:0,w:2,h:2,d:2},10),4);assert.equal(rayBox({x:0,y:5,z:0},{x:1,y:0,z:0},{x:5,y:0,z:0,w:2,h:2,d:2},10),null);
for(let map=0;map<7;map++){
 let r=room('neon-clash',map,{teamSize:2,gun:12},{gun:1});const a=r.match.actors[0],b=r.match.actors[1];assert.equal(r.match.actors.length,4);assert.equal(a.weapon,12);assert.equal(b.weapon,1);const old={...a.pos};
 r=advance(r,.25,[{x:1,yaw:0},{}]);assert(r.match.actors[0].pos.x>old.x+.2,'strafe moves X on map '+map);assert.equal(r.match.actors[1].pos.x,b.pos.x,'second human is not driven by CPU');
 r=advance(r,15,[{x:-1},{}]);assert(r.match.actors[0].pos.x>=-23.35,'arena walls bound movement');assert(Number.isFinite(r.match.actors[0].pos.y));
 const arena=collisionArena(map);assert(arena.support(-20,-10,Infinity)!==null);assert.strictEqual(arena,collisionArena(map),'arena cache reused');
 const v=publicRoom(r,'b','b');assert.equal(v.match.actors.find(a=>a.you).name,'Nova');assert.equal(v.match.actors.find(a=>a.you).team,0);
}
{
 let r=room('neon-clash',0,{gun:12,teamSize:1},{gun:1});const [a,b]=r.match.actors;
 // A clear lane permits authoritative hits, reloads, elimination, and respawn.
 a.pos={x:-20,y:1.7,z:-17};b.pos={x:-15,y:1.7,z:-17};a.yaw=-Math.PI/2;a.cooldown=a.shield=b.shield=0;
 r=advance(r,.7,[{yaw:-Math.PI/2,fire:true},{}]);assert.equal(r.match.scores[0],1);assert.equal(r.match.actors[1].alive,false);assert(r.match.actors[0].ammo<30);r=advance(r,3);assert(r.match.actors[1].alive);assert(r.match.actors[1].shield>0);
 r.match.actors[0].ammo=1;rivalAction(r,0,'reload');r=advance(r,2.3);assert.equal(r.match.actors[0].ammo,30);
 // A real arena obstruction blocks hits; a grenade beside the target is lethal.
 const wall=collisionArena(0).solids.find(s=>!s.collisionOnly&&s.h>2&&s.w>1&&s.d>1&&Math.abs(s.x)<18&&Math.abs(s.z)<18);assert(wall);
 Object.assign(r.match.actors[0],{pos:{x:wall.x-wall.w/2-2,y:wall.y,z:wall.z},shield:0,cooldown:0});Object.assign(r.match.actors[1],{pos:{x:wall.x+wall.w/2+2,y:wall.y,z:wall.z},shield:0,hp:100});
 tickRivals(r,.01,seat=>safeInput(seat===0?{yaw:-Math.PI/2,fire:true}:{},'neon-clash'));assert.equal(r.match.actors[1].hp,100);
 const victim=r.match.actors[1];victim.pos={x:-15,y:1.7,z:-17};victim.shield=0;r.match.projectiles=[{id:1,kind:'grenade',index:0,pos:{x:-15,y:.2,z:-17},velocity:{x:0,y:0,z:0},life:.001,source:0}];r=advance(r,.1);assert.equal(r.match.actors[1].alive,false,'grenade blast eliminates the enemy');
 const coop=room('neon-clash',0,{teamSize:4},{},'coop');assert.equal(coop.match.actors.length,8);assert.equal(coop.match.actors[0].team,coop.match.actors[1].team);assert.equal(coop.match.actors.filter(a=>a.team===0&&!a.human).length,2);assert.equal(coop.match.actors.filter(a=>a.team===1).length,4);
 coop.match.time=.05;assert.equal(advance(coop,.1).status,'finished');
}
console.log('Multiplayer passed: all 5 new games, every arena, serialized authority, separate human controls, private hiding, shared boards, football passes/teams/celebrations, Rivals hits/walls/grenades/respawns/team-up and match completion.');
