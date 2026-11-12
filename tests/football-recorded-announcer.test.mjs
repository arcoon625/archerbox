import assert from 'node:assert/strict';
import {RecordedChannel} from '../public/games/touchdown-rush/recorded-speech.js';
import {STUDIO_CLIPS} from '../public/games/touchdown-rush/studio-clips.js';

const clips={throw:[{text:'The pass is on its way.',file:'throw.mp3'}],catch:[{text:'He makes the catch.',file:'catch.mp3'}],touchdown:[{text:'Touchdown!',file:'td.mp3'}]};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture({defer=false,fail=false}={}){
 let time=0,id=0;const timers=new Map(),sources=[],requests=[],lines=[],statuses=[];let resolve;
 const loading=new Promise(r=>resolve=r);
 class Context{
  constructor(){this.state='suspended';this.destination={};}
  resume(){this.state='running';return Promise.resolve();}
  createGain(){return {gain:{value:0},connect(){}};}
  decodeAudioData(){return Promise.resolve({duration:2});}
  createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};sources.push(source);return source;}
  close(){this.closed=true;this.state='closed';return Promise.resolve();}
 }
 const c=new RecordedChannel({Context,clips,now:()=>time,random:()=>.4,timer:(cb,ms)=>{timers.set(++id,{cb,at:time+ms});return id;},clearTimer:n=>timers.delete(n),
  fetcher:async url=>{requests.push(url);if(fail)throw Error('offline');if(defer)await loading;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};},onLine:(text,meta)=>lines.push({text,...meta}),onStatus:s=>statuses.push(s)});
 return {c,sources,requests,lines,statuses,resolve,tick(ms){time+=ms;for(let i=0;i<100;i++){const next=[...timers].find(([,t])=>t.at<=time);if(!next)return;timers.delete(next[0]);next[1].cb();}throw Error('timer loop');}};
}
{
 const {c,sources,requests,lines}=fixture();assert(!c.submit({kind:'throw',priority:42}));assert.equal(requests.length,0,'no fetching or audio before a click');
 c.activate();c.submit({kind:'throw',text:'Ignored dynamic device text.',priority:42});await flush();
 assert.equal(sources.length,1);assert(sources[0].started);assert.equal(lines[0].text,clips.throw[0].text,'captions match the complete recording');assert.equal(lines[0].duration,2);
 c.configure({volume:.35});assert.equal(c.gain.gain.value,.35,'volume changes the call already playing');c.destroy();assert(sources[0].stopped);assert(c.context.closed);
}
{
 const f=fixture(),{c}=f;c.activate();c.submit({kind:'throw',priority:42,ttl:800});await flush();const staleEnd=f.sources[0].onended;
 c.submit({kind:'touchdown',priority:95,ttl:6000});assert(f.sources[0].stopped,'a score interrupts ordinary chatter');f.tick(100);await flush();assert.equal(f.lines.at(-1).text,'Touchdown!');staleEnd();assert.equal(c.current.kind,'touchdown','late callbacks cannot finish a newer clip');
 assert(!c.submit({kind:'throw',priority:42}),'routine calls do not queue behind a score');c.stop();
}
{
 const f=fixture({defer:true}),{c}=f;c.activate();c.submit({kind:'catch',priority:60,ttl:800});f.tick(900);f.resolve();await flush();assert.equal(f.sources.length,0,'a slow download cannot announce a stale catch');assert.equal(f.lines.length,0);assert.equal(c.current,null);c.destroy();
}
{
 const f=fixture({defer:true}),{c}=f;c.activate();c.submit({kind:'catch',priority:60});c.suspend();f.resolve();await flush();assert.equal(f.sources.length,0,'pause cancels audio that is still loading');assert(!c.armed);c.destroy();
}
{
 const f=fixture(),{c}=f;c.activate();c.submit({kind:'throw',priority:42});await flush();c.submit({kind:'catch',priority:60,ttl:500});f.tick(600);f.sources[0].onended();f.tick(500);await flush();assert.equal(f.sources.length,1,'only one pending call, discarded after its expiry');
 c.configure({enabled:false});assert(!c.submit({kind:'touchdown',priority:95}));assert.equal(f.statuses.at(-1).state,'off');c.destroy();
}
{
 const f=fixture({fail:true}),{c}=f;c.activate();c.submit({kind:'touchdown',priority:95});await flush();assert.equal(f.statuses.at(-1).state,'error');assert(!c.armed);assert.equal(f.lines.length,0,'failed audio never produces a false on-air caption');assert.equal(c.current,null);c.destroy();
}
{
 const f=fixture({defer:true}),{c}=f;c.activate();c.submit({kind:'throw',priority:42});f.tick(16001);assert.equal(f.statuses.at(-1).state,'error');f.resolve();await flush();assert.equal(f.sources.length,0,'watchdog rejects a hung recording without later playback');c.destroy();
}
{
 const {c}=fixture();c.clips=STUDIO_CLIPS;for(const kind of Object.keys(STUDIO_CLIPS)){
  const count=STUDIO_CLIPS[kind].length,seen=new Set();let previous;
  for(let n=0;n<count;n++){previous=c.pick(kind);seen.add(previous.text);}assert.equal(seen.size,count);
  assert.notEqual(c.pick(kind).text,previous.text,'no repetition at the shuffle boundary');
 }c.destroy();
}
{
 const f=fixture(),{c}=f;c.activate();const previous=c.context;c.destroy();c.activate();assert.notEqual(c.context,previous,'returning from a closed page can create a fresh audio context');c.submit({kind:'touchdown',priority:95});await flush();assert(f.sources.at(-1).started);c.destroy();
}
console.log('Recorded calls: exact captions, freshness, cancellation, volume, priorities, expiry and recovery passed.');
