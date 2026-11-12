import {RUN_PLAYS} from './playbook.js?v=runlanes1';

// Original play-by-play copy. Calls describe observed game facts, rather than
// inventing penalties, routes, broken tackles, injuries or game periods.
export const CALLS={
 intro:[
  "{home} host the {away}. Let's play football.","The {away} visit the {home}. We're ready to go.",
  "Football time. {home} and {away}, here we go.","Welcome to the field. {home} against the {away}.",
  "The teams are set. {home}, {away}. Let's get to it."
 ],
 ready:["{down} and {toGo} for the {team}.","{team} come to the line. {down} and {toGo}.","{down} down. {toGo} to move the chains.","Next snap, {down} and {toGo}.","The {team} set up for {down} and {toGo}."],
 goalReady:["{down} and goal. The end zone is right there.","Goal to go for the {team}.","{team} have a chance here. {down} and goal.","A short field now. {down} and goal."],
 dropback:["{qb} drops back.","{qb} looks downfield.","Back to pass. {qb} scans the field.","{qb} sets up in the pocket.","{qb}, looking for a target.","Here's {qb}, with time to look."],
 handoff:["The handoff goes to {name}.","{name} takes the handoff.","They give it to {name}.","On the ground with {name}.","{name} carries it for the {team}.","They turn to the run. Here's {name}."],
 keeper:["{name} keeps it himself.","The quarterback takes off.","A keeper for {name}.","{name} tucks it and runs.","They keep it with the quarterback.","{name} takes this one on the ground."],
 sneak:["{name} on the sneak.","Quarterback sneak, right up the middle.","A quick push with {name}.","{name} follows the center on the sneak."],
 pressure:["Pressure getting close.","The pocket is getting tight.","A defender closes on {qb}.","{qb} has company in the backfield.","The rush is closing in.","{qb} has to deal with pressure."],
 throw:["{qb} lets it go.","The pass is away.","{qb} fires downfield.","A throw from {qb}.","{qb} sends it toward {target}.","It's on the way to {target}."],
 deepThrow:["{qb} goes deep.","A long ball from {qb}.","{qb} takes a shot downfield.","Going downfield for {target}.","{qb} launches it.","Here's the deep throw."],
 catch:["{name} makes the catch.","Caught by {name}.","{name} pulls it in.","Pass complete to {name}.","{name} has it, and turns upfield.","Right into the hands of {name}.","{name} gathers it in.","They connect with {name}."],
 incomplete:["Incomplete. That one hits the turf.","The pass falls incomplete.","No catch on that throw.","That pass is incomplete.","It falls to the ground. No completion.","Nothing there. Incomplete."],
 dropped:["{name} can't hang on. Incomplete.","It gets away from {name}.","{name} can't secure the catch.","Dropped by {name}. The pass is incomplete.","That one comes loose before the catch."],
 brokenUp:["{defender} breaks it up.","Knocked away by {defender}.","{defender} gets a hand on it.","Good coverage. {defender} knocks it away.","No completion. {defender} breaks up the pass."],
 offTarget:["The throw misses its target.","That pass is off the mark.","They can't connect on that one.","The throw gets away. Incomplete.","Not on target this time. Incomplete."],
 pressureMiss:["The rush forces a tough throw. Incomplete.","Pressure on the throw, and it falls incomplete.","He can't connect with the rush closing in.","An off-target pass under pressure."],
 passBounds:["That throw sails out of bounds.","The pass lands out of play.","Out of bounds, and incomplete.","No chance in bounds on that throw."],
 interception:["Picked off by {defender}! The {other} take over.","Interception! {defender} comes down with it.","{defender} takes it away. {other} ball.","It's intercepted! {defender} makes the play.","The defense has it. Picked off by {defender}.","A takeaway for the {other}! {defender} has the interception."],
 firstDown:["That's a first down. A gain of {gain}.","Move the chains. {name} picks up {gain}.","{gain}, and a fresh set of downs.","{name} gets past the sticks. First down.","The {team} keep the drive alive. First down.","Enough to move the chains. {gain} on the play.","They pick up the first. Good for {gain}."],
 tackle:["Brought down after {gain}.","They stop {name}. A gain of {gain}.","{name} is down after picking up {gain}.","A {yards}-yard gain for {name}.","They bring him down. {gain} on the play.","{name} takes it for {gain}."],
 bigGain:["A big pickup. {gain} for {name}.","{name} gains {gain} on that one.","That moves the drive along. A gain of {gain}.","{name} takes a big chunk of the field. {gain}."],
 loss:["Stopped behind the line. A loss of {loss}.","The defense pushes them back {loss}.","{name} loses {loss} on that play.","Nowhere to go. They lose {loss}.","The {other} win that snap. A loss of {loss}."],
 noGain:["No gain on that play.","Stopped right at the line.","The defense holds them to no gain.","{name} has nowhere to go.","Nothing doing on that snap."],
 sack:["They get to {name}. It's a sack.","{name} goes down behind the line.","Sacked! The defense gets home.","The rush brings down {name}.","Down goes {name}. A sack for the defense.","The pocket closes, and {name} is down."],
 bounds:["{name} steps out after {gain}.","Out of bounds. A gain of {gain}.","{name} heads out of play after {gain}.","They finish along the sideline. {gain} on the play."],
 turnover:["They come up short on fourth down. {other} ball.","Turnover on downs. The {other} take over.","The defense holds. {other} get the football.","They can't reach the sticks. The ball goes over on downs."],
 turnoverIncomplete:["Incomplete on fourth down. {other} take over.","That falls incomplete. A turnover on downs.","Fourth down, no catch. The {other} get the ball.","The pass is incomplete, and the defense takes over."],
 breakaway:["{name} finds open field.","Room to run for {name}.","{name} is picking up speed in space.","{name} has some daylight.","A big run developing for {name}."],
 touchdown:["Touchdown, {team}! {name} takes it in.","{name} reaches the end zone. Touchdown!","Six points for the {team}! {name} scores.","He's in! A touchdown for {name}.","{name} finishes the drive. Touchdown, {team}!","Into the end zone goes {name}. Six points.","The {team} find the end zone! {name} with the score.","Touchdown! {name} gets it across the goal line."],
 returnTouchdown:["All the way! {name} takes the return for a touchdown.","A return touchdown for {name}! Six for the {team}.","{name} runs it back to the end zone!","What a return! {name} takes it the distance.","Touchdown on the return! {name} goes {returnGain}."],
 punt:["{kicker} sends the punt away.","Here's the punt from {kicker}.","The {team} punt it downfield.","{kicker} gets the punt off.","They send the punt toward {target}."],
 kickoff:["{kicker} kicks it away.","Here's the kickoff.","The {team} send it downfield.","{kicker} puts the kickoff in the air.","The return team waits for the kick."],
 puntReturn:["{name} fields the punt.","{name} takes it on the return.","The punt comes down to {name}.","Here's {name} with the punt return."],
 kickReturn:["{name} brings the kickoff back.","The kick comes down to {name}.","{name} has the kickoff. Here comes the return.","Here's the return from {name}."],
 returnStop:["A return of {returnGain}. The {team} take over.","They stop the return after {returnGain}.","{name} brings it back {returnGain}.","The return ends there. {returnGain}."],
 touchback:["A touchback. {team} start at their twenty.","No return. It's a touchback.","Touchback, and the {team} come out to the twenty.","The ball comes out to the twenty after a touchback."],
 fieldSetup:["{kicker} lines up from {distance} yards.","A {distance}-yard field goal attempt for {kicker}.","The {team} try for three, from {distance}.","{kicker}, with a chance from {distance} yards.","The field goal unit is on. {distance} yards out."],
 extraSetup:["{kicker} is on for the extra point.","Now the extra-point try.","{team} line up for one more point.","Here's {kicker} for the extra point."],
 kickFlight:["The kick is on its way.","{kicker} sends it toward the uprights.","The kick is away.","Here's the kick.","It's up. Watch the uprights."],
 fieldGood:["It's good! Three points for the {team}.","Through the uprights. {kicker} puts three on the board.","The field goal is good from {distance} yards.","{kicker} hits it! Three more for the {team}.","Right through. The {team} add a field goal."],
 extraGood:["The extra point is good.","One more for the {team}.","{kicker} adds the extra point.","Through the uprights for one.","The {team} tack on the extra point."],
 kickShort:["No good. That kick comes up short.","Not enough distance. The kick is short.","It falls short of the crossbar.","The kick doesn't get there. No good."],
 kickLeft:["No good. Wide left.","That kick drifts to the left.","Left of the uprights. No good.","{kicker} misses to the left."],
 kickRight:["No good. Wide right.","That one goes to the right of the posts.","Right of the uprights. No good.","{kicker} misses to the right."],
 oneMinute:["One minute left. Every snap matters.","A minute to play. Time is getting short.","Under a minute now. Keep an eye on the clock.","The final minute is here."],
 final:["That's the ballgame. {winner} win, {high} to {low}.","It's over. The {winner} take it, {high} to {low}.","The final score, {winner} {high}, {loser} {low}.","The {winner} finish on top, {high} to {low}.","That will do it. A {high} to {low} win for the {winner}."],
 practice:["Field goal practice. {kicker} is ready.","Let's work on the kicking game.","{kicker} gets set for a practice kick.","The kicking unit is ready for a few tries."]
};

const yard=n=>Math.abs(n)+' '+(Math.abs(n)===1?'yard':'yards');
const snapshot=g=>({phase:g.phase,event:g.event,offense:g.offense,line:g.line,down:g.down,goal:g.goal,scores:[...g.scores],clock:g.clock,ended:g.ended,snap:g.snapSerial,pass:g.passResult?g.passResult.id+':'+g.passResult.kind:null,passSequence:g.passSequence,kick:g.kickSequence,returnStart:g.returnPlay?.start??null,returnKind:g.returnPlay?.kind});
const name=a=>(a?.name||a?.shortName||'The runner').replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/,'');

export class CommentaryDirector{
 constructor({random=Math.random}={}){this.random=random;this.bags=new Map();this.last=new Map();this.sequence=0;this.epoch=0;}
 reset(g,{teams=[],homeIndex=0}={}){this.previous=snapshot(g);this.latest=g;this.teams=teams;this.homeIndex=homeIndex;this.epoch++;this.pressureSnap=null;this.breakawaySnap=null;}
 team(g,i){return this.teams[i]?.shortName||g.teamNames?.[i]||['Home team','Visiting team'][i];}
 context(g){
  const a=g.actors?.[g.carrier],offense=g.offense??0,d=g.viewDirection??(offense===0?-1:1),delta=Math.round(((g.phase==='dead'?g.nextLine:undefined)??a?.z??g.line)-g.line)*d;
  const returning=g.returnPlay?.start??this.previous?.returnStart,returnYards=returning==null?0:Math.max(0,Math.round(((g.phase==='dead'?g.nextLine:undefined)??a?.z??returning)-returning)*d);
  const r=g.passResult,k=g.placeKick,q=g.actors?.[offense*11],receiver=g.actors?.[g.ball?.target??g.selected];
  return {name:name(a),qb:name(q),target:name(receiver),defender:name(g.actors?.[r?.defender]),kicker:name(g.actors?.[k?.kicker??offense*11]),team:this.team(g,offense),other:this.team(g,1-offense),
   home:this.team(g,this.homeIndex),away:this.team(g,1-this.homeIndex),down:['','first','second','third','fourth'][g.down]||'first',toGo:Math.max(0,Math.ceil((g.goal-g.line)*d)),gain:yard(delta),yards:Math.abs(delta),loss:yard(delta),returnGain:yard(returnYards),distance:k?.distance??0};
 }
 pick(kind,context){
  const lines=CALLS[kind];let bag=this.bags.get(kind);
  if(!bag?.length){bag=lines.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===this.last.get(kind)&&bag.length>1)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];this.bags.set(kind,bag);}
  const index=bag.pop();this.last.set(kind,index);return lines[index].replace(/\{(\w+)\}/g,(_,key)=>String(context[key]??''));
 }
 cue(kind,g,priority=40,ttl=1800,extra={}){return {id:++this.sequence,epoch:this.epoch,kind,priority,ttl,text:this.pick(kind,{...this.context(g),...extra})};}
 intro(g){return this.cue(g.practiceKicks?'practice':'intro',g,50,3500);}
 observe(g){
  if(!this.previous){this.reset(g);return null;}const p=this.previous;this.latest=g;
  const cue=this.detect(g,p);this.previous=snapshot(g);return cue;
 }
 detect(g,p){
  const result=g.passResult,newResult=result&&p.pass!==result.id+':'+result.kind,event=g.event||'',delta=g.scores.map((s,i)=>s-p.scores[i]);
  if(g.ended&&!p.ended){const w=g.scores[0]>g.scores[1]?0:1;return this.cue('final',g,100,9000,{winner:this.team(g,w),loser:this.team(g,1-w),high:g.scores[w],low:g.scores[1-w]});}
  if(delta.some(n=>n===6))return this.cue(event.includes('RETURN')?'returnTouchdown':'touchdown',g,95,6500);
  if(delta.some(n=>n===3||n===1))return this.cue(delta.some(n=>n===3)?'fieldGood':'extraGood',g,90,5000);
  if(newResult&&result.kind==='interception')return this.cue('interception',g,94,5500,{other:this.team(g,1-result.fromTeam)});
  if(g.phase==='dead'&&(p.phase!=='dead'||p.event!==event)){
   if(event.includes('NO GOOD'))return this.cue(event.includes('SHORT')?'kickShort':event.includes('LEFT')?'kickLeft':'kickRight',g,88,4500);
   if(event.includes('TURNOVER ON DOWNS'))return this.cue(result?.kind==='incomplete'?'turnoverIncomplete':'turnover',g,85,4500);
   if(event.includes('INCOMPLETE')){const kind={dropped:'dropped',brokenUp:'brokenUp',pressure:'pressureMiss',offTarget:'offTarget',bounds:'passBounds'}[result?.cause]||'incomplete';return this.cue(kind,g,75,2700,{name:name(g.actors?.[result?.receiver])});}
   if(event==='RETURN STOPPED')return this.cue('returnStop',g,75,3500);
   if(event.includes('FIRST DOWN'))return this.cue('firstDown',g,78,3000);
   if(event.includes('SACK'))return this.cue('sack',g,80,3200);
   const d=g.viewDirection??(g.offense===0?-1:1),gain=Math.round(((g.nextLine??g.actors?.[g.carrier]?.z??g.line)-g.line)*d);
   if(event==='TACKLED'||event==='OUT OF BOUNDS')return this.cue(gain<0?'loss':gain===0?'noGain':event==='OUT OF BOUNDS'?'bounds':gain>=15?'bigGain':'tackle',g,70,2800);
  }
  if(newResult&&result.kind==='complete')return this.cue('catch',g,60,1000);
  if(g.phase==='placekick-aim'&&(p.phase!=='placekick-aim'||p.kick!==g.kickSequence))return this.cue(g.placeKick.kind==='extraPoint'?'extraSetup':'fieldSetup',g,45,2600);
  if(g.phase==='placekick-flight'&&p.phase!=='placekick-flight')return this.cue('kickFlight',g,42,800);
  if(g.phase==='kick'&&p.phase!=='kick')return this.cue(g.ball?.kind==='punt'?'punt':'kickoff',g,55,1700);
  if(g.returnPlay&&p.returnStart==null)return this.cue(g.returnPlay.kind==='punt'?'puntReturn':'kickReturn',g,58,1500);
  if(event==='TOUCHBACK'&&p.event!==event)return this.cue('touchback',g,65,2500);
  if((g.snapSerial!==p.snap&&g.snapSerial!=null)||(g.phase==='live'&&p.phase==='ready')){
   const plan=RUN_PLAYS[g.play];return this.cue(g.play==='qbSneak'?'sneak':plan?(plan.runner===0?'keeper':'handoff'):'dropback',g,35,1100);
  }
  if(g.phase==='flight'&&(p.phase!=='flight'||g.passSequence!==p.passSequence)){
   const b=g.ball,long=b&&Math.hypot(b.to.x-b.from.x,b.to.z-b.from.z)>=24;return this.cue(long?'deepThrow':'throw',g,42,800);
  }
  if(g.phase==='live'&&!g.ball){
   const a=g.actors?.[g.carrier],key=g.offense+':'+(g.snapSerial??0)+':'+g.line+':'+(g.returnPlay?.start??'');
   if(a){const defenders=g.actors.filter(b=>b.team!==a.team),near=Math.min(...defenders.map(b=>Math.hypot(a.x-b.x,a.z-b.z))),d=g.viewDirection??(g.offense===0?-1:1),gain=(a.z-g.line)*d;
    if(a.role==='QB'&&!RUN_PLAYS[g.play]&&!g.returnPlay&&near<2.7&&g.playTime>.6&&this.pressureSnap!==key){this.pressureSnap=key;return this.cue('pressure',g,38,700);}
    if((RUN_PLAYS[g.play]||g.passResult?.kind==='complete'||g.returnPlay)&&gain>=15&&near>5&&this.breakawaySnap!==key){this.breakawaySnap=key;return this.cue('breakaway',g,53,1000);}
   }
  }
  if(g.clock<=60&&p.clock>60&&!g.practiceKicks)return this.cue('oneMinute',g,30,1800);
  if(g.phase==='ready'&&p.phase!=='ready')return this.cue((g.goal*(g.viewDirection??(g.offense===0?-1:1)))>=50?'goalReady':'ready',g,25,1800);
  return null;
 }
}
