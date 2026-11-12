import {STUDIO_CLIPS} from './studio-clips.js?v=studio3';

// Complete, locally hosted calls: no device TTS, live service or stitched words.
// The director still owns football facts. This channel owns audio and freshness.
export class RecordedChannel{
 constructor({Context=globalThis.AudioContext||globalThis.webkitAudioContext,fetcher=(...args)=>fetch(...args),clips=STUDIO_CLIPS,random=Math.random,now=()=>performance.now(),timer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),onLine=()=>{},onStatus=()=>{}}={}){
  Object.assign(this,{Context,fetcher,clips,random,now,timer,clearTimer,onLine,onStatus});this.supported=!!Context;
  this.enabled=true;this.volume=.8;this.armed=false;this.current=null;this.pending=null;this.generation=0;this.gapUntil=0;this.buffers=new Map();this.bags=new Map();this.last=new Map();
 }
 voice(){return {name:'Archerbox announcer'};}
 configure({enabled=this.enabled,volume=this.volume}={}){
  this.enabled=!!enabled;this.volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:.8));
  if(this.gain)this.gain.gain.value=this.volume;
  if(!this.enabled||this.volume===0)this.stop();
 }
 activate(){
  if(!this.supported||!this.enabled)return false;
  try{
   if(!this.context||this.context.state==='closed'){this.context=new this.Context();this.gain=this.context.createGain();this.gain.connect(this.context.destination);this.gain.gain.value=this.volume;}
   // Resume synchronously from the user's click, before any network request.
   this.resumed=Promise.resolve(this.context.resume());this.resumed.catch(()=>{});this.armed=true;return true;
  }catch{this.fail('Audio could not start. Tap Hear sample to try again.');return false;}
 }
 pick(kind){
  const list=this.clips[kind];if(!list?.length)return null;let bag=this.bags.get(kind);
  if(!bag?.length){bag=list.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.length>1&&bag.at(-1)===this.last.get(kind))[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];this.bags.set(kind,bag);}
  const index=bag.pop();this.last.set(kind,index);return list[index];
 }
 submit(cue,{preview=false}={}){
  if(!this.supported||!this.enabled||!this.armed||this.volume===0||!this.clips[cue?.kind]?.length)return false;
  const item={...cue,expires:this.now()+(preview?16000:cue.ttl??1800),preview};
  if(preview){this.stop();this.armed=true;this.gapUntil=0;}
  if(this.current&&item.priority>=80&&item.priority>this.current.priority){this.cancelCurrent();this.pending=null;this.gapUntil=this.now()+75;}
  if(this.current&&item.priority<this.current.priority)return false;
  if(!this.pending||item.priority>=this.pending.priority)this.pending=item;
  this.pump();return true;
 }
 async buffer(clip){
  const url=new URL(clip.file,import.meta.url).href;
  if(this.buffers.has(url))return this.buffers.get(url);
  const work=(async()=>{const response=await this.fetcher(url);if(!response.ok)throw Error('clip-unavailable');return this.context.decodeAudioData(await response.arrayBuffer());})();
  this.buffers.set(url,work);
  try{const buffer=await work;if(this.buffers.size>36)this.buffers.delete(this.buffers.keys().next().value);return buffer;}catch(error){this.buffers.delete(url);throw error;}
 }
 pump(){
  this.clearTimer(this.wake);this.wake=null;
  if(!this.armed||!this.enabled||!this.supported||this.current||!this.pending)return;
  if(this.pending.expires<this.now()){this.pending=null;return;}
  if(this.now()<this.gapUntil){this.wake=this.timer(()=>this.pump(),this.gapUntil-this.now());return;}
  const item=this.pending;this.pending=null;const clip=this.pick(item.kind),generation=++this.generation;
  this.current={...item,clip,generation,started:false};this.onStatus({state:'starting',voice:this.voice().name});
  this.watchdog=this.timer(()=>{if(this.current?.generation===generation)this.fail('The announcer could not load. Tap Hear sample to retry.');},16000);
  this.play(item,clip,generation);
 }
 async play(item,clip,generation){
  try{
   const [buffer]=await Promise.all([this.buffer(clip),this.resumed]);
   if(this.current?.generation!==generation)return;
   // A slow download must not turn an old catch or throw into a late call.
   if(item.expires<this.now()||!this.armed||!this.enabled){this.finish(generation,0);return;}
   if(this.context.state!=='running')throw Error('audio-paused');
   const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.gain);source.onended=()=>this.finish(generation);
   this.current.source=source;this.current.started=true;source.start();
   this.onLine(clip.text,{kind:item.kind,preview:item.preview,duration:buffer.duration});this.onStatus({state:'speaking',voice:this.voice().name});
  }catch{if(this.current?.generation===generation)this.fail('The announcer could not play. Check your connection, then tap Hear sample.');}
 }
 finish(generation,gap=450){
  if(this.current?.generation!==generation)return;
  this.current.source?.disconnect();this.clearTimer(this.watchdog);this.current=null;this.gapUntil=this.now()+gap;this.onStatus({state:'ready',voice:this.voice().name});this.pump();
 }
 cancelCurrent(){
  const item=this.current;this.current=null;this.generation++;this.clearTimer(this.watchdog);
  if(item?.source){item.source.onended=null;try{item.source.stop();item.source.disconnect();}catch{}}
 }
 fail(message){this.pending=null;this.clearTimer(this.wake);this.cancelCurrent();this.armed=false;this.onStatus({state:'error',message});}
 stop(){this.pending=null;this.clearTimer(this.wake);this.cancelCurrent();this.gapUntil=0;this.armed=false;this.onStatus({state:this.enabled?'ready':'off',voice:this.voice().name});}
 suspend(){this.stop();}
 destroy(){this.stop();this.buffers.clear();try{this.context?.close()?.catch(()=>{});}catch{}}
}
