export const DIFFICULTIES={easy:{name:'ROOKIE',travel:1.4,window:.27,cpuHit:.16},normal:{name:'ALL-STAR',travel:1.15,window:.21,cpuHit:.28},hard:{name:'PRO',travel:.94,window:.16,cpuHit:.4}};
export const PITCHES=['Fastball','Curveball','Changeup'];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function rng(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
export function createGame({mode='match',difficulty='easy',seed=Date.now()}={}){return{mode,difficulty,random:rng(seed),inning:1,innings:3,side:0,scores:[0,0],outs:0,strikes:0,balls:0,bases:[false,false,false],phase:'ready',elapsed:0,pitch:null,flight:null,swung:false,event:'PLAY BALL!',detail:mode==='derby'?'Ten pitches. How many can you send over the fence?':'You bat first. Then pitch against the Comets.',pitchNumber:0,derbyPitches:10,homeRuns:0,hits:0,finished:false,result:null,style:'power',aim:0,lastPitch:0};}
export function releaseValue(g){return (Math.sin(g.elapsed*2.8)+1)/2}
export function beginPitch(g,{kind=0,x=0,y=1.18}={}){
 const d=DIFFICULTIES[g.difficulty],cpu=g.side===0;
 const type=cpu?Math.floor(g.random()*3):kind,quality=cpu?1:1-Math.abs(releaseValue(g)-.5)*2;
 const px=cpu?(g.random()-.5)*.6:x+(g.random()-.5)*.34*(1-quality),py=cpu?((g.mode==='derby'||g.random()<.86)?1.1+g.random()*.25:1.95):y+(g.random()-.5)*.4*(1-quality);
 g.pitch={kind:type,x:px,y:py,inZone:Math.abs(px)<=.5&&py>=.62&&py<=1.72,duration:cpu?d.travel*[1,1.13,1.27][type]:1.06*[1,1.12,1.24][type],quality};g.phase='pitch';g.elapsed=0;g.swung=false;g.pitchNumber++;g.event=cpu?'WATCH THE BALL':PITCHES[type].toUpperCase();g.detail=cpu?'Swing when the marker reaches the gold zone.':'The CPU batter is watching your pitch.';g.flight=null;g.lastPitch=type;
}
export function moveRunners(g,bases){let runs=0;const next=[false,false,false];for(let i=2;i>=0;i--)if(g.bases[i]){const n=i+bases;if(n>=3)runs++;else next[n]=true}if(bases>=4)runs++;else next[bases-1]=true;g.bases=next;g.scores[g.side]+=runs;return runs}
export function walk(g){let run=0;if(g.bases[0]){if(g.bases[1]){if(g.bases[2])run++;g.bases[2]=true}g.bases[1]=true}g.bases[0]=true;g.scores[g.side]+=run;return run}
function atBatEnds(g){g.strikes=0;g.balls=0;}
function show(g,event,detail,duration=1.15){g.phase='result';g.elapsed=0;g.resultDuration=duration;g.event=event;g.detail=detail;g.flight=null;}
export function strike(g){g.strikes++;if(g.mode==='derby'){show(g,'MISSED!','Next pitch. Try swinging a little closer to the gold zone.');return}if(g.strikes>=3){g.outs++;atBatEnds(g);show(g,'STRIKEOUT!',g.side===0?'Shake it off. The next batter is up.':'Great pitching! You got the out.')}else show(g,'STRIKE '+g.strikes,g.side===0?'Time your swing as the ball reaches the plate.':'Keep mixing your pitches.');}
export function ball(g){if(g.mode==='derby'){show(g,'BALL!','That one was outside the zone. Next pitch.');return}g.balls++;if(g.balls>=4){const runs=walk(g);atBatEnds(g);show(g,'WALK!',runs?'A runner comes home!':'The batter takes first base.')}else show(g,'BALL '+g.balls,'Four balls give the batter a walk.');}
export function foul(g,early=true){if(g.strikes<2)g.strikes++;g.phase='flight';g.elapsed=0;g.resultDuration=2;g.flight={kind:'foul',distance:32,angle:early?-1.04:1.04,height:14,quality:.2,duration:2};g.event='FOUL BALL';g.detail=g.mode==='derby'?'That pitch counts. Keep it inside the foul lines.':'Fouls count as strikes, but a foul cannot give you strike three.';}
export function hit(g,quality,aim=0){
 let q=clamp(quality,0,1);if(g.side===0&&g.style==='contact')q*=.82;
 const kind=q>=.78?'homer':q>=.65?'triple':q>=.5?'double':q>=.23?'single':'out',advance={homer:4,triple:3,double:2,single:1,out:0}[kind],distance={homer:107+q*20,triple:88,double:76,single:53,out:31}[kind];
 let runs=0;if(advance){runs=moveRunners(g,advance);if(g.side===0){g.hits++;if(kind==='homer')g.homeRuns++}}else if(g.mode!=='derby')g.outs++;
 atBatEnds(g);g.phase='flight';g.elapsed=0;g.resultDuration=kind==='homer'?3.3:2.65;g.flight={kind,distance,angle:clamp(aim,-1,1)*.55+(g.random()-.5)*.1,height:kind==='out'?3:kind==='homer'?29:12+q*8,quality:q,duration:g.resultDuration};
 g.event={homer:'HOME RUN!',triple:'TRIPLE!',double:'DOUBLE!',single:'BASE HIT!',out:'GROUND OUT'}[kind];g.detail=(runs?runs+(runs===1?' RUN SCORES':' RUNS SCORE')+' · ':'')+(advance?Math.round(distance*3.28084)+' FT · '+(kind==='homer'?'OVER THE FENCE!':'RUNNERS ADVANCE'):'The defense fields it and throws to first.');
}
export function swing(g,aim=g.aim){
 if(g.phase!=='pitch'||g.side!==0||g.swung)return false;g.swung=true;const window=DIFFICULTIES[g.difficulty].window*(g.style==='contact'?1.3:1),error=g.elapsed/g.pitch.duration-1;
 if(Math.abs(error)>window){g.event=error<0?'TOO EARLY':'TOO LATE';g.detail='Keep an eye on the timing marker.';return false}
 if(!g.pitch.inZone){foul(g,error<0);return true}
 const quality=1-Math.abs(error)/window;if(quality<.14){foul(g,error<0);return true}hit(g,quality,aim);return true;
}
function nextPlay(g){
 if(g.mode==='derby'){if(g.pitchNumber>=g.derbyPitches){g.finished=true;g.phase='finished';g.result='derby';return}g.phase='ready';g.elapsed=0;g.event='NEXT PITCH';g.detail='Keep aiming for that gold zone.';return}
 if(g.outs>=3){g.outs=0;g.strikes=0;g.balls=0;g.bases=[false,false,false];if(g.side===0){g.side=1;g.phase='pitchReady';g.event='YOUR TURN TO PITCH';g.detail='Choose a pitch. Release when the marker is near the middle.'}else{if(g.inning>=g.innings&&(g.scores[0]!==g.scores[1]||g.inning>=5)){g.finished=true;g.phase='finished';g.result=g.scores[0]>g.scores[1]?'win':g.scores[0]<g.scores[1]?'loss':'tie';return}g.inning++;g.side=0;g.phase='ready';g.event=g.inning>g.innings?'EXTRA INNING!':'YOUR TURN TO BAT';g.detail='Three outs. Bring your hitters back up!'}}else{g.phase=g.side===0?'ready':'pitchReady';g.event=g.side===0?'GET READY':'CHOOSE YOUR PITCH';g.detail=g.side===0?'Watch the pitch and time your swing.':'Release close to the middle for a better pitch.'}g.elapsed=0;g.pitch=null;g.flight=null;
}
export function step(g,input,dt){
 if(g.finished)return;g.elapsed+=dt;if(input.style)g.style=input.style;if(input.aim!==undefined)g.aim=clamp(input.aim,-1,1);
 if(g.phase==='ready'&&g.elapsed>=1)beginPitch(g);
 else if(g.phase==='pitchReady'&&input.throw)beginPitch(g,input.throw);
 else if(g.phase==='pitch'){
  if(input.swing&&g.side===0)swing(g);
  if(g.phase!=='pitch')return;
  if(g.elapsed>=g.pitch.duration*(g.side===0?1.18:1.03)){
   if(g.side===0){if(g.swung||g.pitch.inZone)strike(g);else ball(g)}else{
    const d=DIFFICULTIES[g.difficulty],p=g.pitch;
    if(!p.inZone){g.random()<.1?strike(g):ball(g)}else if(g.random()<d.cpuHit+(1-p.quality)*.2){hit(g,.25+g.random()*.62,(g.random()-.5)*1.7)}else if(g.random()<.12)foul(g,g.random()<.5);else strike(g);
   }
  }
 }else if((g.phase==='result'||g.phase==='flight')&&g.elapsed>=g.resultDuration)nextPlay(g);
}
export function ballPosition(g){
 if(g.phase==='pitch'&&g.pitch){const p=g.pitch,t=clamp(g.elapsed/p.duration,0,1.18),u=Math.min(t,1);return{x:p.x*u+(p.kind===1?Math.sin(u*Math.PI)*1.25:0),y:1.8+(p.y-1.8)*u+Math.sin(u*Math.PI)*.45,z:-18.44*(1-t)}}
 if(g.phase==='flight'&&g.flight){const f=g.flight,t=clamp(g.elapsed/f.duration,0,1),r=f.distance*t;return{x:Math.sin(f.angle)*r,y:1.15*(1-t)+Math.sin(Math.PI*t)*f.height+(f.kind==='homer'?4*t:0),z:-Math.cos(f.angle)*r}}
 return{x:0,y:1.8,z:-18.44};
}
