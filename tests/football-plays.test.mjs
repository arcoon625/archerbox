import assert from 'node:assert/strict';
import {createGame,lineup,snap,step,action,endPlay,throwPass,punt,beginPlaceKick,PLAYS,RUN_PLAYS,SCRIMMAGE_PLAYS,routePoint,runLane,playForKey,direction} from '../public/games/touchdown-rush/rules.js';
import {makeRoom,readyPlayer,tickRoom,event,encodeRoom,publicRoom,safeInput} from '../server/matches.js';

const added=PLAYS.filter(p=>p.new);
assert.equal(PLAYS.length,14);assert.equal(added.length,7);assert.equal(SCRIMMAGE_PLAYS.length,12);
assert.equal(new Set(PLAYS.map(p=>p.id)).size,14);assert.equal(new Set(PLAYS.map(p=>p.code)).size,14);
for(const [key,id] of Object.entries({Digit1:'deep',Digit2:'slant',Digit3:'run',Digit4:'sweepLeft',Digit5:'sweepRight',KeyP:'punt',KeyF:'fieldGoal',Digit6:'curl',Digit7:'corner',Digit8:'cross',Digit9:'screen',Digit0:'counter',KeyQ:'qbDraw',KeyR:'qbSneak'}))assert.equal(playForKey(key)?.id,id);
assert.equal(playForKey('Space'),undefined);

function openField(team=0){
 // Balanced mode isolates route geometry; rated routes have their own regression.
 const g=createGame('rookie',{playerTraits:false});g.multiplayer=true;g.statsByTeam=[g.stats,{passes:0,tackles:0,touchdowns:0}];g.offense=team;g.line=0;g.goal=direction(team)*10;lineup(g);
 const d=direction(team);for(const a of g.actors.filter(a=>a.team!==team)){a.x=24;a.z=-d*48;}
 return g;
}
function advance(g,seconds,input=()=>({})){for(let t=0;t<seconds;t+=1/120)step(g,input,1/120);}

// The routes really bend, stop or cross, rather than only changing a label.
assert(routePoint('curl',1,3).depth<routePoint('curl',1,1.4).depth,'curl returns toward the quarterback');
assert(routePoint('corner',2,4).x>22,'corner breaks toward the sideline');
assert(routePoint('cross',1,5).x>0&&routePoint('cross',2,5).x<0,'crossing receivers switch sides at different depths');
assert(routePoint('screen',5,1).depth<0,'screen starts behind the line');
assert(runLane('counter',.2)<0&&runLane('counter',1.2)>0,'counter switches running direction');
for(const team of [0,1]){
 const d=direction(team),curl=openField(team);snap(curl,'curl');advance(curl,1.5);const depth=curl.actors[team*11+1].z*d;advance(curl,1.8);assert(curl.actors[team*11+1].z*d<depth-1,'actual curl receiver turns back');
 const cross=openField(team);snap(cross,'cross');advance(cross,5.1);assert(cross.actors[team*11+1].x>0&&cross.actors[team*11+2].x<0,'actual receivers cross the field');
 const screen=openField(team);snap(screen,'screen');advance(screen,1.2);assert(screen.actors[team*11+5].x>8&&screen.actors[team*11+5].z*d<0,'actual screen back runs toward the flat behind the line');
}

for(const team of [0,1])for(const play of added){
 const g=openField(team),d=direction(team);assert(snap(g,play.id));
 if(play.kind==='pass'){
  assert.equal(g.selected,team*11+play.target);advance(g,1.1);const receiver=g.selected,speed=team===0?7.2:5.9;
  assert(throwPass(g));const ball=g.ball,lead=routePoint(play.id,receiver%11,g.playTime+ball.duration,speed);
  assert(Math.abs(ball.idealTo.x-lead.x)<1e-6&&Math.abs(ball.idealTo.z-d*lead.depth)<1e-6,'pass leads along the called route');
  advance(g,ball.duration+.02);assert.equal(g.carrier,receiver,'new route can be caught');assert.equal(g.statsByTeam[team].passes,1);assert.equal(g.controls[team],receiver);
 }else{
  const plan=RUN_PLAYS[play.id];assert.equal(g.carrier,team*11+plan.runner);assert.equal(g.controls[team],g.carrier);
  if(plan.runner===0){assert(!throwPass(g,team*11+1));assert(!punt(g));assert(!beginPlaceKick(g));action(g,team);assert(g.actors[g.carrier].juke>0,'Space jukes on a QB keeper');assert.equal(g.event,'JUKE!');}
  const before=g.actors[g.carrier].z;advance(g,.5,seat=>seat===team?{z:d,sprint:true}:{});assert((g.actors[g.carrier].z-before)*d>1,'ball carrier is controllable');assert.equal(g.ball,null,'running plays do not auto-throw');
 }
 assert(g.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.abs(a.x)<=25.3&&Math.abs(a.z)<=58));
 assert.equal(g.scores[team],0,'new play never awards an automatic touchdown');
 if(play.kind==='run'){endPlay(g,'tackle');advance(g,2.6);assert.equal(g.phase,'ready');assert(snap(g,'fieldGoal'),'field goals stay available after a new run');assert.equal(g.phase,'placekick-aim');}
}

// Quarterback runs are tackles, not sacks, and do not turn into CPU passes.
for(const team of [0,1]){
 const g=openField(team);snap(g,'qbDraw');const runner=g.actors[g.carrier],def=g.actors.find(a=>a.team!==team&&a.id!==g.controls[1-team]);def.x=runner.x;def.z=runner.z;runner.juke=0;g.playTime=.6;step(g,()=>({}),.001);assert.equal(g.event,'TACKLED');
 const td=openField(team);snap(td,'qbDraw');td.actors[td.carrier].z=direction(team)*51;step(td,()=>({}),.001);assert.equal(td.scores[team],6);assert(td.pendingTry);assert(beginPlaceKick(td,'extraPoint'),'QB draw touchdowns keep their extra-point attempt');
}

// CPU play calling reaches every addition; fourth-down kick logic is preserved
// by the separate football-kicks and football-placekicks regressions.
for(const play of added){
 const g=createGame('rookie');g.offense=1;lineup(g);g.clock=120+SCRIMMAGE_PLAYS.findIndex(p=>p.id===play.id)-g.down;step(g,{},2.01);assert.equal(g.play,play.id);assert.equal(g.phase,'live');
 if(play.kind==='run'){advance(g,1.3);assert.equal(g.ball,null,'CPU runs stay running plays');}
}

// Every new call works for both friends after persistence and guest remapping.
for(const team of [0,1])for(const play of added){
 let room=makeRoom(crypto.randomUUID(),{id:'a',name:'Archer'},{id:'b',name:'Nova'},0,10000,'touchdown-rush');readyPlayer(room,'a',{difficulty:'pro'},10000);readyPlayer(room,'b',{},10000);room.players.forEach(p=>{p.seen=room.startAt;p.input=safeInput({},room.game);});tickRoom(room,room.startAt);room.match.offense=team;lineup(room.match);
 event(room,1-team,'play',{play:play.id});assert.equal(room.match.phase,'ready','only the offense can call a play');event(room,team,'play',{play:play.id});assert.equal(room.match.play,play.id);room=JSON.parse(encodeRoom(room));
 const view=publicRoom(room,team?'b':'a').match;assert.equal(view.play,play.id);assert.equal(view.offense,0);assert.equal(view.carrier,play.kind==='run'?RUN_PLAYS[play.id].runner:0);assert.equal(view.control,view.carrier);if(play.kind==='pass')assert.equal(view.selected,play.target);
 const now=room.updatedAt+150;room.players.forEach(p=>p.seen=now);tickRoom(room,now);assert(room.match.actors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));
}
console.log('New football plays passed: 14 preserved/expanded calls, seven distinct additions, unchanged old keys, curved pass leads/catches, QB keeper controls and tackles, counter paths, CPU calls and both friend seats.');
