import assert from 'node:assert/strict';
import {CALLS,CommentaryDirector} from '../public/games/touchdown-rush/commentary.js';
import {SpeechChannel,englishVoices} from '../public/games/touchdown-rush/speech.js';
import {createGame,snap,endPlay,beginPlaceKick,practicePlaceKicks} from '../public/games/touchdown-rush/rules.js';
import {TEAMS} from '../public/games/touchdown-rush/teams.js';

const teams=[TEAMS.find(t=>t.mark==='SF'),TEAMS.find(t=>t.mark==='DET')];
const director=()=>new CommentaryDirector({random:()=>.35});
const calls=Object.values(CALLS).flat();assert(calls.length>=200,'a broad original vocabulary rather than a handful of repeated lines');
const d=director(),ctx={name:'Brock Purdy',qb:'Brock Purdy',team:'49ers',away:'Lions',home:'49ers',target:'George Kittle',defender:'Fred Warner',kicker:'Eddy Pineiro',other:'Lions',down:'second',toGo:7,yards:12,gain:'12 yards',loss:'2 yards',returnGain:'91 yards',distance:42,winner:'49ers',loser:'Lions',high:21,low:14};
for(const kind of Object.keys(CALLS)){const heard=new Set();for(let i=0;i<CALLS[kind].length;i++){const line=d.pick(kind,ctx);assert(!line.includes('{'),'every template has all its facts filled');assert(line.length<=220,'calls are brief enough for live action');heard.add(line);}assert.equal(heard.size,CALLS[kind].length,'each category rotates through every line before repeating');}

function fixture(){const g=createGame(),d=director();d.reset(g,{teams,homeIndex:0});return {g,d};}
{
 const {g,d}=fixture(),before=JSON.stringify(g);assert(d.intro(g).text.includes('49ers'));assert.equal(d.observe(g),null);assert.equal(JSON.stringify(g),before,'commentary is a read-only view of football');
 snap(g,'run');assert.equal(d.observe(g).kind,'handoff');assert.equal(d.observe(g),null,'repeated snapshots stay silent');g.actors[g.carrier].z=g.line-7;endPlay(g,'tackle');const cue=d.observe(g);assert.equal(cue.kind,'tackle');assert(cue.text.includes('7'));assert.equal(d.observe(g),null);
}
{
 const {g,d}=fixture();snap(g,'qbSneak');assert.equal(d.observe(g).kind,'sneak');g.actors[g.carrier].z=g.line-12;endPlay(g,'tackle');assert.equal(d.observe(g).kind,'firstDown');assert.equal(d.context(g).gain,'12 yards');
}
{
 const {g,d}=fixture();snap(g,'deep');d.observe(g);g.actors[0].z=g.line+4;endPlay(g,'sack');assert.equal(d.observe(g).kind,'sack');
}
for(const [cause,kind] of Object.entries({ground:'incomplete',dropped:'dropped',brokenUp:'brokenUp',pressure:'pressureMiss',offTarget:'offTarget',bounds:'passBounds'})){
 const {g,d}=fixture();snap(g,'deep');d.observe(g);g.passResult={id:1,kind:'incomplete',receiver:1,defender:18,cause};endPlay(g,'incomplete');assert.equal(d.observe(g).kind,kind);
}
{
 const {g,d}=fixture();g.down=4;d.reset(g,{teams});snap(g,'deep');d.observe(g);g.passResult={id:1,kind:'incomplete',receiver:1,cause:'ground'};endPlay(g,'incomplete');assert.equal(d.observe(g).kind,'turnoverIncomplete','fourth-down failure is not announced as an ordinary completion or a new first down');
}
{
 const {g,d}=fixture();snap(g,'deep');d.observe(g);g.passResult={id:1,kind:'interception',fromTeam:0,receiver:1,defender:18};g.carrier=18;endPlay(g,'interception');assert.equal(d.observe(g).kind,'interception');assert.equal(d.observe(g),null);
}
{
 const {g,d}=fixture();snap(g,'run');d.observe(g);g.actors[g.carrier].z=-51;endPlay(g,'touchdown');const cue=d.observe(g);assert.equal(cue.kind,'touchdown');assert.equal(cue.priority,95);assert.equal(d.observe(g),null,'a celebration must not repeat the score call every frame');
}
{
 const {g,d}=fixture();g.phase='live';g.returnPlay={kind:'punt',start:42};g.carrier=1;g.actors[1].z=42;assert.equal(d.observe(g).kind,'puntReturn');g.actors[1].z=30;endPlay(g,'tackle');assert.equal(d.observe(g).kind,'returnStop');
}
{
 const {g,d}=fixture();g.phase='live';g.returnPlay={kind:'kickoff',start:42};g.carrier=1;d.observe(g);g.actors[1].z=-50;endPlay(g,'touchdown');assert.equal(d.observe(g).kind,'returnTouchdown');
}
for(const [event,kind] of [['FIELD GOAL GOOD!','fieldGood'],['EXTRA POINT GOOD!','extraGood'],['NO GOOD · SHORT','kickShort'],['NO GOOD · WIDE LEFT','kickLeft'],['NO GOOD · WIDE RIGHT','kickRight']]){
 const {g,d}=fixture();beginPlaceKick(g);assert.equal(d.observe(g).kind,'fieldSetup');g.phase='dead';g.event=event;if(kind==='fieldGood')g.scores[0]+=3;if(kind==='extraGood')g.scores[0]+=1;assert.equal(d.observe(g).kind,kind);
}
{
 const {g,d}=fixture();practicePlaceKicks(g);assert.equal(d.intro(g).kind,'practice');g.scores=[7,21];g.ended=true;g.phase='finished';const cue=d.observe(g);assert.equal(cue.kind,'final');assert(cue.text.includes('Lions'));assert(cue.text.includes('21'));assert.equal(d.observe(g),null);
}
{
 const {g,d}=fixture();g.clock=59.9;assert.equal(d.observe(g).kind,'oneMinute');g.clock=58;assert.equal(d.observe(g),null);
}
// Friend snapshots reverse team indices, but preserve physical field direction.
{
 const {g,d}=fixture();g.offense=1;g.viewDirection=-1;g.line=30;g.goal=20;g.phase='live';g.carrier=12;d.reset(g,{teams:teams.toReversed()});g.actors[12].z=23;g.phase='dead';g.nextLine=23;g.event='TACKLED';assert.equal(d.observe(g).kind,'tackle');assert.equal(d.context(g).gain,'7 yards');
}

function audioFixture(){
 let time=0,id=0;const timers=new Map(),spoken=[],statuses=[],lines=[],voices=[{name:'Zarvox',lang:'en-US',voiceURI:'robot'},{name:'Samantha',lang:'en-US',voiceURI:'sam',localService:true},{name:'Ava Enhanced',lang:'en-US',voiceURI:'ava',localService:true},{name:'French Voice',lang:'fr-FR',voiceURI:'fr'}];
 const synth={getVoices:()=>voices,speak:u=>{spoken.push(u);u.onstart?.();},resume(){},cancel(){this.cancelled=(this.cancelled||0)+1;},addEventListener(){},removeEventListener(){}};
 const channel=new SpeechChannel({synth,Utterance:class{constructor(text){this.text=text;}},now:()=>time,timer:(cb,ms)=>{timers.set(++id,{cb,at:time+ms});return id;},clearTimer:n=>timers.delete(n),onLine:t=>lines.push(t),onStatus:s=>statuses.push(s)});
 return {channel,synth,spoken,statuses,lines,tick(ms){time+=ms;for(let count=0;count<100;count++){const due=[...timers.entries()].filter(([,t])=>t.at<=time).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)return;timers.delete(due[0]);due[1].cb();}throw Error('timer loop');}};
}
assert.equal(englishVoices([{name:'French',lang:'fr-FR'},{name:'Daniel',lang:'en-GB'},{name:'Ava Enhanced',lang:'en-US'}])[0].name,'Ava Enhanced');
{
 const f=audioFixture(),c=f.channel;assert(!c.submit({text:'Before a click',priority:50}),'no unsolicited autoplay before activation');c.activate();c.submit({kind:'intro',text:'Welcome to the field.',priority:50,ttl:5000});assert.equal(f.spoken.length,1);assert.equal(f.spoken[0].voice.voiceURI,'ava');assert.equal(f.lines.length,1,'caption appears when audio actually starts');
 assert(!c.submit({text:'Old dropback',priority:35}));c.submit({text:'Caught.',priority:60,ttl:700});f.tick(800);f.spoken[0].onend();f.tick(500);assert.equal(f.spoken.length,1,'expired catch is never narrated late');
 c.submit({text:'He throws.',priority:42});f.tick(500);const staleEnd=f.spoken.at(-1).onend;c.submit({kind:'touchdown',text:'Touchdown!',priority:95,ttl:6000});assert.equal(f.synth.cancelled,1);f.tick(100);assert.equal(f.spoken.at(-1).text,'Touchdown!');staleEnd();assert.equal(c.current.text,'Touchdown!','late cancelled callbacks cannot finish a newer call');
 c.configure({enabled:false});f.tick(10000);assert.equal(c.current,null);assert.equal(c.pending,null);assert(!c.submit({text:'A muted call',priority:99}));assert.equal(f.statuses.at(-1).state,'off');
}
{
 const {channel:c,spoken,tick}=audioFixture();c.activate();c.submit({text:'First down.',priority:70});c.suspend();tick(30000);assert.equal(spoken.length,1);assert(!c.armed,'pause and tab hiding require a fresh user resume');c.activate();c.submit({text:'Next play.',priority:40});assert.equal(spoken.at(-1).text,'Next play.');c.destroy();
}
{
 const {channel:c,spoken,statuses}=audioFixture();c.activate();c.submit({text:'Test.',priority:90});spoken[0].onerror({error:'not-allowed'});assert.equal(statuses.at(-1).state,'error');assert(!c.armed);assert(!c.current);c.configure({volume:0});c.activate();assert(!c.submit({text:'Silent.',priority:90}));
}
// WebKit's native timer methods reject a SpeechChannel receiver. Exercise
// production defaults, not just injected fake timers, against that contract.
{
 const savedSet=globalThis.setTimeout,savedClear=globalThis.clearTimeout;
 try{
  globalThis.setTimeout=function(fn,ms){assert(!(this instanceof SpeechChannel),'native timer keeps its proper receiver');return savedSet(fn,ms);};
  globalThis.clearTimeout=function(id){assert(!(this instanceof SpeechChannel),'native cancellation keeps its proper receiver');return savedClear(id);};
  const c=new SpeechChannel({synth:{getVoices:()=>[],resume(){},cancel(){},speak:u=>u.onstart?.()},Utterance:class{constructor(text){this.text=text;}}});c.stop();c.activate();c.submit({text:'Startup call.',priority:50});c.stop();
 }finally{globalThis.setTimeout=savedSet;globalThis.clearTimeout=savedClear;}
}
console.log(`Broadcast passed: ${calls.length} original calls, real play outcomes, no game mutation, accurate friend perspective, voice choice, no overlaps/backlog, urgent interruption, mute/pause and speech failure recovery.`);
