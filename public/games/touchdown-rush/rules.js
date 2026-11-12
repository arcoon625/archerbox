import {playerTraits,NEUTRAL_TRAITS,speedFactor,accuracyFactor,tackleFactor,catchReach,dropsPass,finishYards} from './traits.js?v=realism2026';
import {initMedical,startMedicalPlay,completeMedicalPlay,substituteUnit} from './injuries.js?v=injuries1';
import {teamRoster} from './rosters.js?v=injuries1';
import {specialTeamUnit} from './personnel.js?v=specialists1';
import {PLAYS,RUN_PLAYS,SCRIMMAGE_PLAYS,routePoint,runLane} from './playbook.js?v=runlanes1';
export {PLAYS,RUN_PLAYS,SCRIMMAGE_PLAYS,routePoint,runLane,playForKey} from './playbook.js?v=runlanes1';
import {GOALPOST,KICK_CLEARANCE,KICK_DROP,POINTS_TO_WIN,kickVelocity,kickPosition,goalCrossing,kickIsGood,kickDistance} from './kicking.js?v=placekicks1';
export {kickDistance} from './kicking.js?v=placekicks1';
export const TEAM_SIZE=11;
export const PASS_TARGETS=[1,2,3,4,5];
export const JERSEYS=[12,7,21,11,88,26,72,65,56,68,77,8,24,31,18,44,27,90,53,59,22,33];
export const DIFFICULTIES={
 rookie:{name:'Rookie',detail:'MORE TIME · EASY PASSES',defenderSpeed:5.3,playerSpeed:8.8,cpuRunnerSpeed:5.9,reaction:.8,pursuit:.08,blockSlow:.32,catchRadius:3.7,interceptRadius:1.15,catchGrace:1,jukeDuration:.65,throwTime:2.2,teammateSpeed:7},
 pro:{name:'Pro',detail:'TIGHT COVERAGE · QB RUSH',defenderSpeed:7.2,playerSpeed:8,cpuRunnerSpeed:7.3,reaction:.3,pursuit:.32,blockSlow:.58,catchRadius:3.1,interceptRadius:1.8,catchGrace:.22,jukeDuration:.4,throwTime:1.7,teammateSpeed:6.7},
 allstar:{name:'All-Star',detail:'ELITE CPU · TOUGH TACKLES',defenderSpeed:8.1,playerSpeed:7.8,cpuRunnerSpeed:8.0,reaction:.12,pursuit:.58,blockSlow:.76,catchRadius:2.6,interceptRadius:2.25,catchGrace:.08,jukeDuration:.28,throwTime:1.35,teammateSpeed:6.5}
};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const direction=team=>team===0?-1:1;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const passing=g=>g.carrier===g.offense*TEAM_SIZE&&!RUN_PLAYS[g.play];
const statsFor=(g,team)=>g.statsByTeam?.[team]||(team===0?g.stats:null);
const addStat=(g,team,key,amount=1)=>{const stats=statsFor(g,team);if(stats)stats[key]=(stats[key]||0)+amount;};
const roundYards=n=>Math.round(n*10)/10;
export function createGame(difficulty='pro',options={}){
 const names=Array(TEAM_SIZE*2).fill('');
 if(!DIFFICULTIES[difficulty])difficulty='pro';
 const g={difficulty,actors:names.map((name,i)=>({id:i,name,team:i<TEAM_SIZE?0:1,x:0,z:0,vx:0,vz:0,yaw:0,moving:0,stamina:100,juke:0,cooldown:0,role:''})),offense:0,line:30,goal:20,down:1,scores:[0,0],clock:180,phase:'ready',phaseTime:0,playTime:0,play:'deep',carrier:0,control:0,selected:1,ball:null,passResult:null,passSequence:0,event:'YOUR BALL',detail:'Pick a play. Gain 10 yards for a first down.',stats:{passes:0,passAttempts:0,incompletions:0,interceptions:0,interceptionsThrown:0,tackles:0,touchdowns:0},ended:false};
 g.teamNames=options.teamNames||['Dallas Cowboys','Kansas City Chiefs'];g.teamRosters=options.teamRosters||[teamRoster('dallas-cowboys'),teamRoster('kansas-city-chiefs')];g.offenseNumbers=options.offenseNumbers||[null,null];g.playerTraits=options.playerTraits!==false;initMedical(g,options);lineup(g);return g;
}
function setIdentity(g,a,plan,unit){
 const p=plan.player;Object.assign(a,{role:plan.role,name:p.name,shortName:p.shortName,playerId:p.id,position:plan.specialRole||p.position,depthSlot:plan.depthSlot,specialRole:plan.specialRole||null,unit,jerseyNumber:plan.number,backupFor:plan.backupFor||null,customProfile:p.customProfile||null,traits:g.playerTraits===false?{...NEUTRAL_TRAITS}:(p.customTraits||playerTraits(p.id,p.position))});
}
function assignPlayers(g){
 const offenseRoles=['QB','WR','WR','WR','TE','RB','LT','LG','C','RG','RT'],defenseRoles=['DE','DT','DT','DE','LB','LB','LB','CB','CB','S','S'];
 g.specialTeams=null;g.personnelVersion=(g.personnelVersion||0)+1;
 for(const team of [0,1]){
  const unit=team===g.offense?'offense':'defense',plans=g.teamRosters[team][unit].map((p,i)=>({player:p,role:(unit==='offense'?offenseRoles:defenseRoles)[i],depthSlot:p.depthSlot,number:unit==='offense'?(g.offenseNumbers[team]?.[i]??p.number):p.number}));
  substituteUnit(g,team,plans).forEach((plan,i)=>{const a=g.actors[team*TEAM_SIZE+i];setIdentity(g,a,plan,unit);a.stamina=100;a.juke=a.cooldown=a.moving=a.vx=a.vz=0;a.blocking=a.blockedBy=null;a.blockRemaining=a.blockCooldown=0;a.shedBlock=false;});
 }
}
function assignSpecialTeams(g,kind){
 assignPlayers(g);g.specialTeams={kind,kickingTeam:g.offense};
 for(const team of [0,1]){
  const kicking=team===g.offense;if(!kicking&&['fieldGoal','extraPoint'].includes(kind))continue;
  const plans=specialTeamUnit(g.teamRosters[team],kind,kicking).map(p=>({player:p,number:p.number,role:p.specialRole==='LS'?'C':p.position,depthSlot:p.depthSlot,specialRole:p.specialRole}));
  substituteUnit(g,team,plans).forEach((plan,i)=>setIdentity(g,g.actors[team*TEAM_SIZE+i],plan,'specialTeams'));
 }
}
export function lineup(g){
 const d=direction(g.offense),o=g.offense*TEAM_SIZE,f=(1-g.offense)*TEAM_SIZE;
 const ox=[0,-19,19,-10,10,2,-5.6,-2.8,0,2.8,5.6],oz=[-5,0,0,-.8,0,-7,-.7,-.7,-.7,-.7,-.7],or=['QB','WR','WR','WR','TE','RB','LT','LG','C','RG','RT'];
 // Fronts vary between downs. Wide fronts leave room inside; pinched fronts
 // invite a cut outside. Every defender remains an ordinary, solid player.
 g.defensiveFront=(g.snapSerial||0)%4;
 const front=[[-6,-2,2,6],[-7.2,-3.7,3.7,7.2],[-5.2,-1.1,1.1,5.2],[-6.8,-3.3,3.3,6.8]][g.defensiveFront];
 const dx=[...front,10,0,-10,-19,19,-8,8],dz=[1.8,1.8,1.8,1.8,6,7,6,3.8,3.8,16,16],dr=['DE','DT','DT','DE','LB','LB','LB','CB','CB','S','S'];
 for(let i=0;i<TEAM_SIZE;i++){
  const a=g.actors[o+i];a.x=ox[i];a.z=g.line+d*oz[i];a.yaw=d<0?0:Math.PI;a.role=or[i];
  const b=g.actors[f+i];b.x=dx[i];b.z=g.line+d*dz[i];b.yaw=d<0?Math.PI:0;b.role=dr[i];
 }
 assignPlayers(g);g.finishContact=null;g.finishAttempted=false;g.runFit=null;g.returnPlay=null;g.placeKick=null;g.passResult=null;
 g.carrier=o;g.control=g.offense===0?0:closestDefender(g);if(g.multiplayer){g.controls=[0,0];for(const team of [0,1])g.controls[team]=team===g.offense?o:closestDefender(g,team);g.control=g.controls[0];}g.selected=o+1;g.ball=null;g.playTime=0;g.phaseTime=0;g.phase='ready';
}
export function snap(g,play='deep'){
 if(g.phase!=='ready'||g.ended)return false;
 if(play==='punt')return punt(g);
 if(play==='fieldGoal')return beginPlaceKick(g);
 if(!PLAYS.some(p=>p.id===play))return false;startMedicalPlay(g);g.snapSerial=(g.snapSerial||0)+1;g.play=play;g.phase='live';g.playTime=g.phaseTime=0;g.passResult=null;g.finishContact=null;g.finishAttempted=false;
 if(RUN_PLAYS[play]){const plan=RUN_PLAYS[play];g.runFit={front:g.defensiveFront,readTime:g.defensiveFront%2?1.25:.65,lane:plan.lane};g.carrier=g.offense*TEAM_SIZE+plan.runner;const runner=g.actors[g.carrier];runner.x=(plan.startLane??plan.lane)*.55;runner.z=g.line-direction(g.offense)*(plan.startDepth??(plan.runner===0?5:3.8));runner.juke=play==='qbSneak'?.15:g.difficulty==='rookie'?.65:.35;if(g.multiplayer){g.controls[g.offense]=g.carrier;g.control=g.controls[0];}if(g.offense===0)g.control=g.carrier;g.event=plan.name.toUpperCase()+(plan.runner===0?' · QB KEEPER!':' · HANDOFF!');g.detail=g.offense===0?(play==='counter'?'Start left, then cut right behind your blockers.':play==='qbSneak'?'Quick snap! Follow your center, then cut into a gap.':play==='qbDraw'?'You control the quarterback. Find a lane and run!':'Follow your blockers'+(play==='run'?' through the middle':play==='sweepLeft'?' to the left':' to the right')+'.')+' Shift to sprint · Space to juke.':'Stop the runner! Work around the blocks · Space to tackle.';}
 else {const plan=PLAYS.find(p=>p.id===play);g.selected=g.offense*TEAM_SIZE+(plan.target||1);g.event=g.offense===0?(plan.new?plan.name.toUpperCase():'FIND YOUR RECEIVER'):'PLAY DEFENSE';g.detail=g.offense===0?(plan.new?plan.detail+'. ':'')+'1–5 select a receiver · Space to throw · Watch for the rush!':'Chase the ball carrier · E switches defender · Space tackles'}
 return true;
}
// Arcade special teams: automatic catches put the player straight into the return.
export function punt(g){
 if(g.ended||g.returnPlay||!['ready','live'].includes(g.phase)||g.carrier!==g.offense*TEAM_SIZE||(g.phase==='live'&&RUN_PLAYS[g.play]))return false;
 return kick(g,'punt');
}
export function kickoff(g){return g.ended?false:kick(g,'kickoff')}
export function beginPlaceKick(g,kind='fieldGoal'){
 if(g.ended||!['fieldGoal','extraPoint'].includes(kind))return false;
 if(kind==='fieldGoal'&&(g.returnPlay||!['ready','live'].includes(g.phase)||g.carrier!==g.offense*TEAM_SIZE||(g.phase==='live'&&RUN_PLAYS[g.play])))return false;
 if(kind==='extraPoint'&&(!g.pendingTry||g.phase!=='dead'))return false;
 const team=g.offense,d=direction(team),o=team*TEAM_SIZE;if(kind==='extraPoint')g.line=d*35;
 startMedicalPlay(g);assignSpecialTeams(g,kind);
 const from={x:kind==='extraPoint'?0:clamp(g.actors[g.carrier].x,-3.1,3.1),z:g.line-d*KICK_DROP};
 g.kickSequence=(g.kickSequence||0)+1;g.placeKick={id:g.kickSequence,kind,team,direction:d,kicker:o,holder:o+5,longSnapper:o+8,from,goalZ:d*GOALPOST.z,distance:kickDistance(g.line,d),aim:clamp(Math.atan2(d*from.x,Math.abs(d*GOALPOST.z-from.z))/.23,-1,1),power:.8};
 g.pendingTry=false;g.pendingKickoff=false;g.returnPlay=null;g.ball=null;g.carrier=o;g.phase='placekick-aim';g.phaseTime=0;
 for(const a of g.actors){a.blocking=a.blockedBy=null;a.blockRemaining=a.blockCooldown=a.moving=a.vx=a.vz=0;}
 for(let i=0;i<TEAM_SIZE;i++){const a=g.actors[o+i];a.x=(i-5)*1.5;a.z=g.line-d*.5;a.yaw=d<0?0:Math.PI;const b=g.actors[(1-team)*TEAM_SIZE+i];b.x=(i-5)*1.8;b.z=g.line+d*2;b.yaw=d<0?Math.PI:0;}
 Object.assign(g.actors[o],{x:from.x-2*d,z:from.z-d*2.6});Object.assign(g.actors[o+5],{x:from.x+d*.65,z:from.z-d*.25});Object.assign(g.actors[o+8],{x:from.x,z:g.line-d*.5});
 if(g.multiplayer){g.controls[team]=o;g.controls[1-team]=(1-team)*TEAM_SIZE;g.control=g.controls[0];}else g.control=team===0?o:(1-team)*TEAM_SIZE;
 g.event=kind==='extraPoint'?'EXTRA POINT · 1 POINT':'FIELD GOAL · 3 POINTS';g.detail=g.actors[o].name+' #'+g.actors[o].jerseyNumber+' is kicking. '+(team===0?'Aim between the posts. Set power, then press Space or KICK.':'Watch the kick. The CPU is lining it up.');return true;
}
export function aimPlaceKick(g,aim,power){if(g.phase!=='placekick-aim')return false;g.placeKick.aim=clamp(Number.isFinite(aim)?aim:g.placeKick.aim,-1,1);g.placeKick.power=clamp(Number.isFinite(power)?power:g.placeKick.power,.15,1);return true;}
export function strikePlaceKick(g,aim=g.placeKick?.aim,power=g.placeKick?.power){
 if(g.phase!=='placekick-aim'||g.ended)return false;aimPlaceKick(g,aim,power);const p=g.placeKick;
 g.ball={kind:p.kind,placeKick:true,from:{...p.from},goalZ:p.goalZ,...kickVelocity(p.direction,p.aim,p.power),elapsed:-.32,x:p.from.x,y:.28,z:p.from.z};g.phase='placekick-flight';g.phaseTime=0;g.event='THE KICK IS UP!';g.detail=p.distance+' yards · Watch the ball clear the crossbar.';
 const stats=g.statsByTeam?.[g.offense]||(g.offense===0?g.stats:null);if(stats){const key=p.kind==='extraPoint'?'extraPointAttempts':'fieldGoalAttempts';stats[key]=(stats[key]||0)+1;}return true;
}
export function practicePlaceKicks(g){if(g.multiplayer)return false;g.practiceKicks=true;g.offense=0;g.line=-28;g.goal=-38;lineup(g);return beginPlaceKick(g);}
function finishMatch(g){if(g.practiceKicks||(!g.scores.some(s=>s>=POINTS_TO_WIN)&&!(g.clock<=0&&g.scores[0]!==g.scores[1])))return false;g.ended=true;g.phase='finished';g.event=g.teamNames[g.scores[0]>g.scores[1]?0:1].toUpperCase()+' WIN!';g.detail='Final score: '+g.teamNames[0]+' '+g.scores[0]+' – '+g.teamNames[1]+' '+g.scores[1];return true;}
function finishPlaceKick(g,good){
 completeMedicalPlay(g,'kick');
 const p=g.placeKick,extra=p.kind==='extraPoint',stats=g.statsByTeam?.[g.offense]||(g.offense===0?g.stats:null),cross=goalCrossing(g.ball);
 if(good){g.scores[g.offense]+=extra?1:3;if(stats){const key=extra?'extraPoints':'fieldGoals';stats[key]=(stats[key]||0)+1;}}
 g.event=good?(extra?'EXTRA POINT GOOD!':'FIELD GOAL GOOD!'):cross.y<=GOALPOST.crossbar+KICK_CLEARANCE+1e-6?'NO GOOD · SHORT':cross.x*(-p.direction)<0?'NO GOOD · WIDE LEFT':'NO GOOD · WIDE RIGHT';
 g.detail=(good?(extra?'One extra point!':'Three points! '+p.distance+'-yard field goal.'):'No points this time.')+(g.practiceKicks?' Try another kick in a moment.':extra||good?' Kickoff is next.':' The other team takes possession.');
 g.ball.finished=true;g.ball.y=Math.max(.15,g.ball.y);g.phase='dead';g.phaseTime=0;g.pendingTry=false;g.pendingKickoff=extra||good;
 g.nextOffense=1-g.offense;const nextD=direction(g.nextOffense);g.nextLine=g.ball.from.z*nextD<-30?-nextD*30:clamp(g.ball.from.z,-49,49);g.nextDown=1;g.nextGoal=g.nextLine+nextD*10;finishMatch(g);
}
function stepPlaceKick(g,dt){
 const p=g.placeKick;if(g.phase==='placekick-aim'){if(!g.multiplayer&&g.offense===1&&g.phaseTime>1.8){const error=((g.down+g.scores[0]+g.scores[1])%5-2)*.035;strikePlaceKick(g,p.aim+error,Math.min(1,.68+p.distance*.003));}return;}
 const b=g.ball;b.elapsed+=dt;if(p.kind==='fieldGoal'&&!g.practiceKicks)g.clock=Math.max(0,g.clock-dt);Object.assign(b,kickPosition(b,b.elapsed));
 const runup=clamp((b.elapsed+.32)/.32,0,1),a=g.actors[p.kicker];a.x=p.from.x-2*p.direction*(1-runup);a.z=p.from.z-p.direction*(2.6*(1-runup)+.45);a.moving=runup<1?6:0;
 if(b.elapsed>=0&&((b.z-b.goalZ)*p.direction>=0||b.y<=0||b.elapsed>6)){const good=(b.z-b.goalZ)*p.direction>=0&&kickIsGood(b);if(good)Object.assign(b,goalCrossing(b));finishPlaceKick(g,good);}
}
function kick(g,kind){
 g.finishContact=null;g.finishAttempted=false;
 const team=g.offense,d=direction(team),receivingTeam=1-team,returner=receivingTeam*TEAM_SIZE+1,kicker=team*TEAM_SIZE;
 startMedicalPlay(g);assignSpecialTeams(g,kind);
 g.placeKick=null;g.pendingTry=false;
 for(const a of g.actors){a.blocking=a.blockedBy=null;a.blockRemaining=a.blockCooldown=0;a.shedBlock=false;}
 if(kind==='kickoff'){g.line=-d*15;for(const a of g.actors){a.x=(a.id%TEAM_SIZE-5)*4;a.z=a.team===team?g.line-d*(a.id%2)*2:d*(25+(a.id%4)*5)}}
 const from=kind==='punt'?{x:g.actors[kicker].x,z:g.actors[kicker].z}:{x:0,z:g.line},to={x:kind==='punt'?clamp(from.x,-16,16):-8,z:kind==='punt'?g.line+d*45:d*47},r=g.actors[returner];r.x=to.x;r.z=clamp(to.z,-49,49);
 g.carrier=kicker;g.ball={kind,from,to,target:returner,receivingTeam,elapsed:0,duration:kind==='punt'?2.7:3.1,x:from.x,y:1,z:from.z};g.phase='kick';g.phaseTime=0;g.playTime=0;g.pendingKickoff=false;
 g.control=receivingTeam===0?returner:closestDefender(g);if(g.multiplayer){g.controls[receivingTeam]=returner;g.controls[team]=kicker;g.control=g.controls[0];}
 g.event=kind==='punt'?'PUNT!':'KICKOFF!';g.detail=g.actors[kicker].name+' #'+g.actors[kicker].jerseyNumber+' '+(kind==='punt'?'punts':'kicks')+' to '+r.name+' #'+r.jerseyNumber+'. Catch automatically — then sprint for the end zone!';return true;
}
function stepKick(g,dt){
 const b=g.ball,d=direction(g.offense);b.elapsed+=dt;g.clock=Math.max(0,g.clock-dt);const t=clamp(b.elapsed/b.duration,0,1);b.x=b.from.x+(b.to.x-b.from.x)*t;b.z=b.from.z+(b.to.z-b.from.z)*t;b.y=1+Math.sin(t*Math.PI)*(b.kind==='punt'?16:13);
 for(const a of g.actors){if(a.id===b.target)continue;const tx=clamp(b.to.x+(a.id%TEAM_SIZE-5)*2.5,-24,24),tz=a.team===g.offense?b.to.z-d*10:b.to.z+d*(5+(a.id%3)*2);move(a,tx,tz,a.team===g.offense?6:4.8,dt)}
 if(t<1)return;const kind=b.kind,receivingTeam=b.receivingTeam,returner=b.target,touchback=Math.abs(b.to.z)>=50;g.offense=receivingTeam;g.line=touchback?-direction(receivingTeam)*30:b.to.z;g.goal=g.line+direction(receivingTeam)*10;g.down=1;g.ball=null;g.playTime=g.phaseTime=0;
 if(touchback){completeMedicalPlay(g,'touchback');lineup(g);g.event='TOUCHBACK';g.detail=g.teamNames[receivingTeam]+' start at their 20-yard line.';return}
 g.carrier=returner;g.actors[returner].x=b.to.x;g.actors[returner].z=b.to.z;g.actors[returner].juke=1.1;g.phase='live';g.play='return';g.returnPlay={kind,start:b.to.z,team:receivingTeam};g.control=receivingTeam===0?returner:closestDefender(g);if(g.multiplayer){g.controls[receivingTeam]=returner;g.controls[1-receivingTeam]=closestDefender(g,1-receivingTeam);g.control=g.controls[0]}
 const stats=g.statsByTeam?.[receivingTeam]||(receivingTeam===0?g.stats:null);if(stats)stats.returns=(stats.returns||0)+1;g.event=kind==='punt'?'PUNT RETURN!':'KICK RETURN!';g.detail='Ball caught! Run it back · Shift to sprint · Space to juke. A return touchdown scores six!';
}
export function selectReceiver(g,n){if(!PASS_TARGETS.includes(n))return;g.selected=g.offense*TEAM_SIZE+n}
export function passRead(g,target){
 const q=g.actors[g.offense*TEAM_SIZE],r=g.actors[target];if(!r)return {risk:'COVERED',pressure:0};
 const opponents=g.actors.filter(a=>a.team!==g.offense),dx=r.x-q.x,dz=r.z-q.z,length=dx*dx+dz*dz;
 let coverage=Infinity,lane=Infinity,nearest=Infinity;
 for(const a of opponents){coverage=Math.min(coverage,distance(a,r));nearest=Math.min(nearest,distance(a,q));const t=length?((a.x-q.x)*dx+(a.z-q.z)*dz)/length:0;if(t>.15&&t<.95)lane=Math.min(lane,Math.hypot(a.x-q.x-dx*t,a.z-q.z-dz*t));}
 return {risk:coverage<2.2||lane<.95?'RISKY':coverage<4.5||lane<1.8?'COVERED':'OPEN',pressure:clamp((4.5-nearest)/3.4,0,1)};
}
export function passPosition(b,t){const arc=b.arc??clamp(1.2+distance(b.from,b.to)*.11,1.7,6.5);return {x:b.from.x+(b.to.x-b.from.x)*t,z:b.from.z+(b.to.z-b.from.z)*t,y:1.65*(1-t)+Math.sin(t*Math.PI)*arc};}
export function throwPass(g,target=g.selected){
 if(g.phase!=='live'||!passing(g)||!g.actors[target]||g.actors[target].team!==g.offense||!PASS_TARGETS.includes(target%TEAM_SIZE))return false;
 const a=g.actors[g.carrier],r=g.actors[target],d=direction(g.offense),duration=clamp(.65+distance(a,r)*.02,.8,1.35),routeSpeed=(g.offense===0?7.2:DIFFICULTIES[g.difficulty].cpuRunnerSpeed)*speedFactor(r);
 const lead=routePoint(g.play,target%TEAM_SIZE,g.playTime+duration,routeSpeed);
 const idealTo=lead?{x:lead.x,z:clamp(g.line+d*lead.depth,-54,54)}:{x:r.x,z:clamp(r.z+d*routeSpeed*duration,-54,54)},read=passRead(g,target),moving=clamp((a.moving||0)/DIFFICULTIES[g.difficulty].playerSpeed,0,1),range=clamp((distance(a,idealTo)-28)/25,0,1);
 g.passSequence=(g.passSequence||0)+1;const seed=g.passSequence*11+g.down*13,spread=(read.pressure*8+moving*2.1+range*3.2)*accuracyFactor(a)+Math.max(0,75-(a.traits?.accuracy??75))*.035*(.35+range);
 const to={x:idealTo.x+Math.sin(seed*3.71+1.2)*spread,z:idealTo.z+Math.cos(seed*5.13+.7)*spread*.6*d};
 g.ball={kind:'pass',id:g.passSequence,fromTeam:g.offense,from:{x:a.x,z:a.z},idealTo,to,pressure:read.pressure,spread,arc:clamp(1.2+distance(a,to)*.11,1.7,6.5),target,elapsed:0,duration,x:a.x,y:1.65,z:a.z};
 addStat(g,g.offense,'passAttempts');g.passResult=null;g.phase='flight';g.phaseTime=0;g.event='BALL IN THE AIR';g.detail=read.pressure>.3?'PRESSURE! This throw may be off target.':read.risk==='RISKY'?'Risky throw — watch the defender in the passing lane!':'Watch your receiver make the catch.';return true;
}
function resolvePass(g,b,kind,point,receiver=null,defender=null,cause='ground'){
 if(b.resolved)return;b.resolved=true;const team=b.fromTeam??g.offense;
 g.passResult={id:b.id??g.passSequence,kind,fromTeam:team,receiver:receiver?.id??b.target,defender:defender?.id??null,cause:kind==='complete'?'caught':cause,x:point.x,y:point.y,z:point.z};
 if(kind==='complete'){
  addStat(g,team,'passes');g.carrier=receiver.id;receiver.juke=team===0?DIFFICULTIES[g.difficulty].catchGrace:.14;
  if(g.multiplayer){g.controls[team]=receiver.id;g.control=g.controls[0];}else if(team===0)g.control=receiver.id;
  g.ball=null;g.phase='live';g.phaseTime=0;g.event='CAUGHT!';g.detail=receiver.shortName+' caught it! '+(team===0?'You control the receiver now. Run for the end zone!':'Stop the receiver! E switches to the nearest defender.');return;
 }
 if(kind==='interception'){
  addStat(g,team,'interceptionsThrown');addStat(g,1-team,'interceptions');g.carrier=defender.id;
  if(g.multiplayer){g.controls[1-team]=defender.id;g.control=g.controls[0];}else if(defender.team===0)g.control=defender.id;
  endPlay(g,'interception');return;
 }
 addStat(g,team,'incompletions');g.carrier=team*TEAM_SIZE;endPlay(g,'incomplete');
}
function stepPass(g,dt,before){
 const b=g.ball,cfg=DIFFICULTIES[g.difficulty],from=b.elapsed/b.duration,to=clamp((b.elapsed+dt)/b.duration,0,1),count=Math.max(1,Math.ceil((to-from)*Math.max(32,distance(b.from,b.to)/.5)));
 const catchRadius=g.difficulty==='rookie'?1.6:g.difficulty==='allstar'?1.15:1.35,swatRadius=Math.max(catchRadius,clamp(cfg.interceptRadius*.64,.72,1.35));
 for(let i=1;i<=count;i++){
  const t=from+(to-from)*i/count,fraction=dt?clamp((t-from)*b.duration/dt,0,1):1,p=passPosition(b,t);Object.assign(b,p);b.elapsed=t*b.duration;
  if(Math.abs(p.x)>=26.65||Math.abs(p.z)>=60){resolvePass(g,b,'incomplete',p,null,null,'bounds');return;}
  if(t<.18||p.y>2.7||p.y<.35)continue;
  let receiver=null,defender=null,receiverDistance=Infinity,defenderDistance=Infinity,defenderSide=Infinity;
  for(const a of g.actors){const old=before[a.id],x=old.x+(a.x-old.x)*fraction,z=old.z+(a.z-old.z)*fraction,near=Math.hypot(x-p.x,z-p.z);
   if(a.team===g.offense){if(t>=.55&&PASS_TARGETS.includes(a.id%TEAM_SIZE)&&near<=catchReach(a,catchRadius)&&near<receiverDistance){receiver=a;receiverDistance=near;}}
   else if(a.blockedBy==null&&near<=swatRadius&&near<defenderDistance){defender=a;defenderDistance=near;const dx=b.to.x-b.from.x,dz=b.to.z-b.from.z;defenderSide=Math.abs((x-b.from.x)*dz-(z-b.from.z)*dx)/Math.max(.001,Math.hypot(dx,dz));}
  }
  if(defender&&(!receiver||defenderDistance+.18<receiverDistance)&&defenderSide<.48){if(defenderDistance<=.68){resolvePass(g,b,'interception',p,null,defender,'intercepted');return;}continue;}
  if(defender&&(!receiver||defenderDistance<receiverDistance+.35)){if(defenderDistance<=.9){resolvePass(g,b,'incomplete',p,receiver,defender,'brokenUp');return;}if(receiver)continue;}
  if(receiver){if(dropsPass(g,receiver,b))resolvePass(g,b,'incomplete',p,receiver,null,'dropped');else resolvePass(g,b,'complete',p,receiver);return;}
 }
 if(to>=1)resolvePass(g,b,'incomplete',passPosition(b,1),null,null,b.pressure>.2?'pressure':b.spread>.5?'offTarget':'ground');
}
export function closestDefender(g,team=0){const a=g.actors[g.carrier];return g.actors.filter(b=>b.team===team&&b.team!==g.offense).sort((b,c)=>distance(a,b)-distance(a,c))[0]?.id??0}
export function switchDefender(g,team=0){if(g.offense===team)return;const id=closestDefender(g,team);if(g.multiplayer){g.controls[team]=id;g.control=g.controls[0]}else g.control=id}
export function action(g,team=0){const control=g.multiplayer?g.controls[team]:g.control;
 if(g.phase==='placekick-aim'){if(g.offense===team)strikePlaceKick(g);return;}
 if(g.phase==='ready'){if(g.offense===team)snap(g,g.play);return}
 if(g.phase!=='live')return;
 if(g.offense===team){if(passing(g))throwPass(g);else{const a=g.actors[control];if(a.cooldown<=0){a.juke=Math.max(a.juke,DIFFICULTIES[g.difficulty].jukeDuration);a.cooldown=2.4;g.event='JUKE!';g.detail='A quick burst past the defense.'}}}
 else{const a=g.actors[control],b=g.actors[g.carrier];if(a.cooldown<=0){a.cooldown=.65;if(distance(a,b)<3.3*tackleFactor(a)&&b.juke<=0&&tackleClear(g,a,b)){attemptTackle(g,a)}else{g.event=a.blockedBy!=null?'BLOCKED!':'GET CLOSER';g.detail='Work around the blockers, then tackle within three yards.'}}}
}
function move(a,x,z,speed,dt){speed*=speedFactor(a);const dx=x-a.x,dz=z-a.z,l=Math.hypot(dx,dz);if(l<.08){a.moving=a.vx=a.vz=0;return}const amount=Math.min(l,speed*dt),oldX=a.x,oldZ=a.z;a.x=clamp(a.x+dx/l*amount,-25.3,25.3);a.z=clamp(a.z+dz/l*amount,-58,58);a.vx=(a.x-oldX)/dt;a.vz=(a.z-oldZ)/dt;a.yaw=Math.atan2(-dx,-dz);a.moving=amount/dt}
const BODY_DISTANCE=1.08,BLOCK_DISTANCE=1.28;
const isLineman=a=>['LT','LG','C','RG','RT'].includes(a.role);
function blockingUnit(g){const o=g.offense*TEAM_SIZE,protect=passing(g)||(g.play==='qbDraw'&&g.playTime<.45);return g.actors.filter(a=>a.team===g.offense&&a.id!==g.carrier&&a.id!==o&&(a.id-o>=6||!protect));}
function releaseBlock(g,a){const b=g.actors[a.blockedBy];if(b?.blocking===a.id)b.blocking=null;a.blockedBy=null;a.blockRemaining=0;a.blockCooldown=1.1;a.shedBlock=true;}
function ageBlocks(g,dt){for(const a of g.actors){a.blockCooldown=Math.max(0,(a.blockCooldown||0)-dt);if(a.blockedBy==null)continue;a.blockRemaining-=dt;const b=g.actors[a.blockedBy];if(!b||b.team!==g.offense||b.id===g.carrier||distance(a,b)>BLOCK_DISTANCE+.35||a.blockRemaining<=0)releaseBlock(g,a);}}
// Sweep the entire movement segment against solid blocker bodies, then slide
// along contact. Even a long step cannot put a defender through a lineman.
function moveDefender(a,x,z,speed,dt,blockers){
 // Contact slows a defender but still permits lateral hand fighting and escape.
 if(a.blockedBy!=null)speed*=.38;
 const old={x:a.x,z:a.z};move(a,x,z,speed,dt);let px=old.x,pz=old.z,dx=a.x-px,dz=a.z-pz;
 for(let pass=0;pass<3;pass++){
  const length=dx*dx+dz*dz;if(length<1e-10)break;let hit=null,first=1;
  for(const b of blockers){const rx=px-b.x,rz=pz-b.z,c=rx*rx+rz*rz-BODY_DISTANCE**2,dot=rx*dx+rz*dz,disc=dot*dot-length*c;if(c<-.001||dot>=0||disc<0)continue;const t=(-dot-Math.sqrt(disc))/length;if(t>=0&&t<=first){first=t;hit=b;}}
  px+=dx*first;pz+=dz*first;if(!hit){dx=dz=0;break;}
  const nx=(px-hit.x)/BODY_DISTANCE,nz=(pz-hit.z)/BODY_DISTANCE;px+=nx*.001;pz+=nz*.001;dx*=1-first;dz*=1-first;const inward=Math.min(0,dx*nx+dz*nz);dx-=nx*inward;dz-=nz*inward;
 }
 a.x=clamp(px,-25.3,25.3);a.z=clamp(pz,-58,58);
}
function blockAssignments(g,blockers,defenders){
 const targets=new Map(),used=new Set(),o=g.offense*TEAM_SIZE,d=direction(g.offense),carrier=g.actors[g.carrier];
 for(const b of blockers)if(b.blocking!=null){targets.set(b.id,g.actors[b.blocking]);used.add(b.blocking);}
 const ordered=[...blockers].sort((a,b)=>(a.id-o>=6?0:1)-(b.id-o>=6?0:1));
 for(const b of ordered){if(targets.has(b.id))continue;const k=b.id-o-6,preferred=defenders[[0,1,5,2,3][k]];let target;
  if(preferred&&!used.has(preferred.id)&&(passing(g)||(carrier.z-g.line)*d<4))target=preferred;
  else target=defenders.filter(a=>!used.has(a.id)).sort((a,c)=>{const score=a=>distance(b,a)+distance(carrier,a)*.35+((a.z-carrier.z)*d<-1?35:0);return score(a)-score(c);})[0];
  if(target){targets.set(b.id,target);used.add(target.id);}
 }return targets;
}
function detour(a,target,blockers){
 const dx=target.x-a.x,dz=target.z-a.z,length=Math.hypot(dx,dz);if(length<.1)return target;const ux=dx/length,uz=dz/length;
 for(const b of blockers){const along=(b.x-a.x)*ux+(b.z-a.z)*uz,across=(b.x-a.x)*-uz+(b.z-a.z)*ux;if(along<0||along>Math.min(2.4,length)||Math.abs(across)>BODY_DISTANCE+.12)continue;const side=Math.abs(across)>.08?(across>0?-1:1):a.id%TEAM_SIZE%2?1:-1;return {x:clamp(b.x-uz*side*1.65,-24.5,24.5),z:clamp(b.z+ux*side*1.65,-57,57)};}return target;
}
function blockLeverage(b,a){const length=Math.max(.001,distance(a,b)),dx=(a.x-b.x)/length,dz=(a.z-b.z)/length;
 const front=-Math.sin(b.yaw)*dx-Math.cos(b.yaw)*dz,defenderFront=Math.sin(a.yaw)*dx+Math.cos(a.yaw)*dz;
 return front>.35&&defenderFront>-.1?front:0;
}
function resolveBlocks(g,blockers,defenders,dt){
 // Both players give ground. A receiver cannot stonewall a defensive tackle.
 const mode=g.multiplayer||g.offense===0?g.difficulty:'pro';
 for(const b of blockers)if(b.blocking!=null){const a=g.actors[b.blocking],length=Math.max(.001,distance(a,b)),nx=(a.x-b.x)/length,nz=(a.z-b.z)/length;
  const drive=(passing(g)?-.18:.1)+(isLineman(b)?.16:-.45)-(a.role==='DT'?.3:a.role==='DE'?.15:0)+(mode==='rookie'?.1:mode==='allstar'?-.12:0);
  const run=RUN_PLAYS[g.play],lane=runLane(g.play,g.playTime),seal=run&&isLineman(b)&&g.playTime<1.5&&Math.abs(b.x-lane)<6?Math.sign((b.x+a.x)/2-lane)*.85:0;
  for(const p of [a,b]){p.x=clamp(p.x+(nx*drive+seal)*dt,-25.3,25.3);p.z=clamp(p.z+nz*drive*dt,-58,58);}
 }
 // Offensive movement can also close a gap: settle overlap before tackles.
 for(let pass=0;pass<4;pass++)for(const b of blockers)for(const a of defenders){const dx=a.x-b.x,dz=a.z-b.z,length=Math.hypot(dx,dz);if(length>=BODY_DISTANCE)continue;const nx=length>.0001?dx/length:0,nz=length>.0001?dz/length:direction(g.offense),overlap=BODY_DISTANCE-length;
  b.x=clamp(b.x-nx*overlap*.45,-25.3,25.3);b.z=clamp(b.z-nz*overlap*.45,-58,58);a.x=clamp(a.x+nx*overlap*.55,-25.3,25.3);a.z=clamp(a.z+nz*overlap*.55,-58,58);}
 for(const b of blockers){if(b.blocking!=null)continue;const a=defenders.filter(a=>a.blockedBy==null&&!a.blockCooldown&&distance(a,b)<=BLOCK_DISTANCE&&blockLeverage(b,a)>0).sort((a,c)=>distance(a,b)-distance(c,b))[0];if(!a)continue;
  const variation=.84+(((b.id%TEAM_SIZE)*7+(a.id%TEAM_SIZE)*3+g.down*5)%7)*.055,leverage=blockLeverage(b,a),role=isLineman(b)?1:b.role==='TE'?.7:.5;
  b.blocking=a.id;a.blockedBy=b.id;a.blockRemaining=(passing(g)?{rookie:2.1,pro:1.15,allstar:.8}:{rookie:1.5,pro:.8,allstar:.55})[mode]*variation*role*(.55+.45*leverage);
 }
 for(const b of blockers)if(b.blocking!=null){const a=g.actors[b.blocking];b.yaw=Math.atan2(b.x-a.x,b.z-a.z);a.yaw=Math.atan2(a.x-b.x,a.z-b.z);}
}
function tackleClear(g,a,carrier){
 const dx=carrier.x-a.x,dz=carrier.z-a.z,length=dx*dx+dz*dz;if(length<.001)return true;
 return !blockingUnit(g).some(b=>{const t=((b.x-a.x)*dx+(b.z-a.z)*dz)/length;return t>.05&&t<.95&&Math.hypot(b.x-a.x-dx*t,b.z-a.z-dz*t)<.57;});
}
function stopTackle(g,defender){addStat(g,defender.team,'tackles');endPlay(g,passing(g)?'sack':'tackle',defender);return true;}
export function attemptTackle(g,defender){
 if(g.phase!=='live'||g.ended)return false;
 if(g.finishContact){if(g.finishContact.defender===defender.id)return false;return stopTackle(g,defender);}
 const carrier=g.actors[g.carrier],running=RUN_PLAYS[g.play]||g.passResult?.kind==='complete'||g.returnPlay;
 if(!g.finishAttempted&&running&&(carrier.z-g.line)*direction(g.offense)>=0){
  g.finishAttempted=true;const yards=finishYards(g,carrier,defender);
  if(yards){g.finishContact={carrier:carrier.id,defender:defender.id,fromZ:carrier.z,yards,started:g.playTime};g.event='FIGHTING FOR YARDS!';g.detail=carrier.shortName+' can drive for up to '+yards+' extra yards. Keep moving forward! A second defender can stop the run.';return false;}
 }
 return stopTackle(g,defender);
}
export function endPlay(g,reason,tackler=null){
 if(g.ended||g.phase==='dead')return;g.finishContact=null;completeMedicalPlay(g,reason,tackler);const a=g.actors[g.carrier],d=direction(g.offense);g.phase='dead';g.phaseTime=0;g.ball=null;g.nextOffense=g.offense;g.nextLine=clamp(a.z,-49,49);g.nextDown=g.down+1;g.nextGoal=g.goal;
 const returnPlay=g.returnPlay;
 if(!returnPlay&&!['incomplete','interception','sack'].includes(reason)){
  const yards=roundYards((clamp(a.z,-50,50)-g.line)*d),caught=g.passResult?.kind==='complete';
  if(caught){addStat(g,g.offense,'passingYards',yards);addStat(g,g.offense,'receivingYards',yards);if(reason==='touchdown'){addStat(g,g.offense,'passingTouchdowns');addStat(g,g.offense,'receivingTouchdowns');}}
  else{addStat(g,g.offense,'rushingYards',yards);if(reason==='touchdown')addStat(g,g.offense,'rushingTouchdowns');}
 }if(reason==='sack')addStat(g,1-g.offense,'sacks');
 if(reason==='touchdown'){
  g.scores[g.offense]+=6;g.touchdownSerial=(g.touchdownSerial||0)+1;if(g.multiplayer)g.statsByTeam[g.offense].touchdowns++;else if(g.offense===0)g.stats.touchdowns++;g.event=g.offense===0?'TOUCHDOWN!':g.teamNames[1].toUpperCase()+' TOUCHDOWN';g.detail='Six points! Celebrate, then kick the extra point.';g.nextOffense=1-g.offense;g.nextLine=g.nextOffense===0?30:-30;g.nextDown=1;g.nextGoal=g.nextLine+direction(g.nextOffense)*10;
  g.pendingTry=true;g.pendingKickoff=false;if(returnPlay){g.event=returnPlay.kind==='punt'?'PUNT RETURN TOUCHDOWN!':'KICK RETURN TOUCHDOWN!';const stats=g.statsByTeam?.[g.offense]||(g.offense===0?g.stats:null);if(stats)stats.returnTouchdowns=(stats.returnTouchdowns||0)+1;g.detail='All the way! '+Math.round(Math.abs(a.z-returnPlay.start))+' yards and six points. Extra point is next.';}
 }else if(reason==='interception'){
  g.event='INTERCEPTED!';g.nextOffense=1-g.offense;g.nextDown=1;const newDirection=direction(g.nextOffense),touchback=a.z*newDirection<=-50;if(touchback)g.nextLine=-newDirection*30;g.nextGoal=g.nextLine+newDirection*10;g.detail=a.shortName+' intercepted the pass! '+g.teamNames[g.nextOffense]+' take over. '+(touchback?'Touchback — ball at their 20.':'First and ten at the catch spot.');
 }else if(reason==='incomplete'){
  g.nextLine=g.line;g.event='INCOMPLETE';const result=g.passResult;g.detail=result?.cause==='dropped'?g.actors[result.receiver].shortName+' could not hold onto the pass.':result?.cause==='brokenUp'?g.actors[result.defender].shortName+' knocked the pass away!':result?.cause==='bounds'?'The pass went out of bounds.':result?.cause==='pressure'?'The rush forced an off-target pass.':result?.cause==='offTarget'?'The throw missed the receiver.':'The ball hit the ground before a catch.';g.detail+=' No yards gained — ball back at the line.';
 }else{
  g.event=reason==='bounds'?'OUT OF BOUNDS':reason==='sack'?'SACKED!':'TACKLED';const yards=Math.round((a.z-g.line)*d);g.detail=(yards>=0?'Gained '+yards+' yards.':'Lost '+Math.abs(yards)+' yards.')+' Choose your next play.';
 }
 if(returnPlay&&reason!=='touchdown'){g.nextDown=1;g.nextGoal=g.nextLine+d*10;g.event='RETURN STOPPED';g.detail='A '+Math.max(0,Math.round((a.z-returnPlay.start)*d))+'-yard return. First and ten!';}
 if(!returnPlay&&!['touchdown','interception'].includes(reason)){
  if((g.nextLine-g.goal)*d>=-.05){g.nextDown=1;g.nextGoal=g.nextLine+d*10;g.event='FIRST DOWN!';g.detail='A fresh set of four downs. Keep the drive alive!'}
  else if(g.nextDown>4){g.nextOffense=1-g.offense;g.nextDown=1;g.nextGoal=g.nextLine+direction(g.nextOffense)*10;g.event=reason==='incomplete'?'INCOMPLETE · TURNOVER ON DOWNS':'TURNOVER ON DOWNS';g.detail='Four tries used. The other team takes the ball.'}
 }
 g.returnPlay=null;
 if(reason!=='touchdown')finishMatch(g);
}
export function step(g,input,dt){
 if(g.ended)return;g.phaseTime+=dt;
 if(['placekick-aim','placekick-flight'].includes(g.phase)){stepPlaceKick(g,dt);return;}
 if(g.phase==='kick'){stepKick(g,dt);return}
 if(g.phase==='ready'){if(!g.multiplayer&&g.offense===1&&g.phaseTime>2){if(g.down===4){if(kickDistance(g.line,direction(g.offense))<=58)beginPlaceKick(g);else punt(g);}else snap(g,SCRIMMAGE_PLAYS[(g.down+Math.floor(g.clock))%SCRIMMAGE_PLAYS.length].id);}return}
 if(g.phase==='dead'){if(g.phaseTime>2.5){if(g.practiceKicks){practicePlaceKicks(g);return;}if(g.pendingTry){beginPlaceKick(g,'extraPoint');return;}if(g.pendingKickoff){kickoff(g);return}g.offense=g.nextOffense;g.line=g.nextLine;g.down=g.nextDown;g.goal=g.nextGoal;lineup(g);g.event=g.offense===0?'YOUR BALL':'DEFEND YOUR END ZONE';g.detail=g.offense===0?'Pick a play to snap the ball.':g.teamNames[1]+' are calling a play. Get ready!'}return}
 g.clock=Math.max(0,g.clock-dt);g.playTime+=dt;ageBlocks(g,dt);const cfg=DIFFICULTIES[g.difficulty],d=direction(g.offense),o=g.offense*TEAM_SIZE,f=(1-g.offense)*TEAM_SIZE,carrier=g.actors[g.carrier],blockers=blockingUnit(g),defenders=g.actors.slice(f,f+TEAM_SIZE),targets=blockAssignments(g,blockers,defenders),before=g.actors.map(a=>({x:a.x,z:a.z})),run=RUN_PLAYS[g.play];
 for(const a of g.actors){a.juke=Math.max(0,a.juke-dt);a.cooldown=Math.max(0,a.cooldown-dt);a.moving=0}
 for(const control of g.multiplayer?g.controls:[g.control]){const user=g.actors[control],controls=typeof input==='function'?input(user.team):input;let ix=controls.x||0,iz=controls.z||0,l=Math.max(1,Math.hypot(ix,iz));ix/=l;iz/=l;const sprint=controls.sprint&&user.stamina>0&&Math.hypot(ix,iz)>.1;user.stamina=clamp(user.stamina+(sprint?-22:17)*dt,0,100);const speed=cfg.playerSpeed*(sprint?1.28:1)*(user.juke>0?1.2:1);
 if(g.phase==='live'||g.offense===1||(g.multiplayer&&user.team!==g.offense)){const movePlayer=user.team===g.offense?move:moveDefender;movePlayer(user,user.x+ix*10,user.z+iz*10,speed*(run&&user.id===g.carrier?1.06:1),dt,blockers);}}
 for(const a of g.actors){
  if(g.multiplayer?g.controls.includes(a.id):a.id===g.control)continue;
  if(a.team===g.offense){
   if(a.id===g.carrier&&(g.carrier!==o||run)){if(g.play==='qbDraw'&&g.playTime<.45){move(a,0,g.line-d*5,3,dt);continue;}const near=[...defenders].filter(b=>b.blockedBy==null).sort((b,c)=>distance(a,b)-distance(a,c))[0];let tx=run&&(a.z-g.line)*d<5?runLane(g.play,g.playTime):a.x;if(near&&distance(a,near)<5)tx=clamp(a.x+(a.x>=near.x?5:-5),-22,22);move(a,tx,a.z+d*10,(g.offense===0?7.3:cfg.cpuRunnerSpeed)*(run?1.06:1),dt)}
   else if(a.id===o){move(a,0,g.line-d*5,3,dt)}
   else if(targets.has(a.id)){
    const enemy=targets.get(a.id),k=a.id-o-6;
    if(a.blocking!=null){const length=Math.max(.01,distance(a,enemy));move(a,enemy.x-(enemy.x-a.x)/length*BODY_DISTANCE,enemy.z-(enemy.z-a.z)/length*BODY_DISTANCE,.65,dt);}
    else if(passing(g)){const home=(k-2)*2.8;move(a,home+clamp(enemy.x-home,-.75,.75),g.line+d*.4,6.6,dt);}
    else{const ahead=(enemy.z-carrier.z)*d,tx=ahead>=-1?enemy.x:carrier.x+(k%3-1)*2.2,tz=ahead>=-1?enemy.z-d*1.1:carrier.z+d*4;move(a,tx,tz,cfg.teammateSpeed*(isLineman(a)?.92:1.02),dt);}
   }
   else {const k=a.id-o,speed=g.offense===0?7.2:cfg.cpuRunnerSpeed,route=routePoint(g.play,k,g.playTime,speed*speedFactor(a));let tx=[0,-21,21,-10,10,5][k],tz=g.line+d*Math.min(43,g.playTime*speed*speedFactor(a));if(k===5){tx=-6;tz=g.line+d*Math.min(14,g.playTime*4)}if(k===4)tz=g.line+d*Math.min(30,g.playTime*6.2);if(g.play==='slant'){tx=[0,7,-7,13,-4,6][k];tz=g.line+d*Math.min(27,g.playTime*6.6)}if(route){tx=route.x;tz=g.line+d*route.depth;}if(g.phase==='flight'&&g.ball?.target===a.id&&(g.ball.spread<.5||g.ball.elapsed>.22)){tx=g.ball.to.x;tz=g.ball.to.z}move(a,tx,tz,speed,dt)}
  }else{
   if(g.playTime<(g.offense===0?cfg.reaction:.28))continue;const k=a.id%TEAM_SIZE,predict=g.offense===0?cfg.pursuit:.25;let target;
   if(g.phase==='flight'){target=g.ball.to;}
   else if(run&&g.runFit&&g.playTime<g.runFit.readTime&&k<=6){
    const wide=g.runFit.front%2===1,pinch=g.runFit.front===2,lanes=wide?[-7,-3.8,3.8,7,10,4,-10]:[-6,-2,2,6,pinch?5:8,0,pinch?-5:-8];
    if(g.play==='qbSneak'&&wide)lanes[5]=g.runFit.front===1?1.2:-.8;
    target={x:lanes[k],z:g.line+d*(k<4?-.3:g.play==='qbSneak'&&wide&&k===5?6.5:4.5)};
   }
   else if(g.carrier!==o||(run&&g.playTime>.45)||g.playTime>4.2||k<4){target={x:clamp(carrier.x+carrier.vx*predict,-24,24),z:carrier.z+carrier.vz*predict};}
   else if(k>=9){const r=g.actors[o+(k===9?1:2)];target={x:r.x*.65,z:Math.max(-49,Math.min(49,r.z+d*7))};}
   else {const assignment={4:4,5:5,6:3,7:1,8:2},r=g.actors[o+assignment[k]];target={x:clamp(r.x+r.vx*predict,-24,24),z:r.z+d*(g.offense===0&&g.difficulty!=='rookie'?.6:2.2)}}
   const ds=g.offense===0?cfg.defenderSpeed:cfg.teammateSpeed,path=detour(a,target,blockers);moveDefender(a,path.x,path.z,ds,dt,blockers);
  }
 }
 resolveBlocks(g,blockers,defenders,dt);for(const a of g.actors){a.vx=(a.x-before[a.id].x)/dt;a.vz=(a.z-before[a.id].z)/dt;a.moving=Math.hypot(a.vx,a.vz);}
 if(g.phase==='flight'){stepPass(g,dt,before);return;}
 if(!g.multiplayer&&g.offense===1&&passing(g)&&g.playTime>cfg.throwTime){const options=PASS_TARGETS.map(k=>o+k);options.sort((a,b)=>{const quality=id=>Math.min(...defenders.map(r=>distance(r,g.actors[id])))+(g.actors[id].z-g.line)*d*.12+(g.play==='screen'&&id===o+5?6:0);return quality(b)-quality(a)});throwPass(g,options[0]);return}
 const ballCarrier=g.actors[g.carrier];
 if(g.finishContact){const limit=g.finishContact.fromZ+d*g.finishContact.yards;if((ballCarrier.z-limit)*d>0)ballCarrier.z=limit;}
 if(ballCarrier.z*d>=50){endPlay(g,'touchdown');return}
 if(Math.abs(ballCarrier.x)>=25.25){endPlay(g,'bounds');return}
 if(g.finishContact){const c=g.finishContact;if((ballCarrier.z-c.fromZ)*d>=c.yards||g.playTime-c.started>=.7){stopTackle(g,g.actors[c.defender]);return;}}
 if(ballCarrier.juke<=0&&g.playTime>(g.play==='qbSneak'?.2:.5)){for(const a of defenders)if(!(g.multiplayer?g.controls.includes(a.id):a.id===g.control)&&distance(a,ballCarrier)<(g.offense===0&&g.difficulty==='allstar'?1.8:1.5)*tackleFactor(a)&&tackleClear(g,a,ballCarrier)){attemptTackle(g,a);if(g.phase==='dead')return;}}
 if(g.playTime>22)endPlay(g,'tackle');
}
