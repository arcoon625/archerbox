// Web Speech owns audio output; this channel owns pacing and freshness. Never
// feed the browser a long queue of old plays. No account, microphone or API key.
const novelty=/^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Hysterical|Jester|Organ|Trinoids|Whisper|Zarvox|Fred|Kathy|Ralph|Junior|Grandma|Grandpa|Superstar|Wobble)(?:\b|\s|$)/i;
export function rankVoice(v){
 let score=/^en[-_]US$/i.test(v.lang)?30:/^en[-_]GB$/i.test(v.lang)?22:10;
 if(/natural|neural|enhanced|premium/i.test(v.name))score+=100;
 if(/Siri/i.test(v.name))score+=70;
 if(/Google.*English/i.test(v.name))score+=45;
 if(/^(Alex|Daniel|Samantha|Karen|Ava|Tom|Evan)(\b|\s|$)/i.test(v.name))score+=25;
 if(v.localService)score+=5;if(v.default)score+=2;
 if(novelty.test(v.name))score-=200;
 return score;
}
export function englishVoices(voices=[]){return voices.filter(v=>/^en(?:[-_]|$)/i.test(v.lang)&&!novelty.test(v.name)).sort((a,b)=>rankVoice(b)-rankVoice(a)||a.name.localeCompare(b.name));}

export class SpeechChannel{
 constructor({synth,Utterance,now=()=>performance.now(),timer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),onLine=()=>{},onStatus=()=>{},onVoices=()=>{}}={}){
  Object.assign(this,{synth,Utterance,now,timer,clearTimer,onLine,onStatus,onVoices});this.supported=!!synth&&!!Utterance;
  this.enabled=true;this.armed=false;this.volume=.8;this.voiceURI='';this.current=null;this.pending=null;this.generation=0;this.gapUntil=0;
  this.changed=()=>this.onVoices(this.voices());this.synth?.addEventListener?.('voiceschanged',this.changed);
 }
 voices(){try{return englishVoices(this.synth?.getVoices()||[]);}catch{return [];}}
 voice(){const list=this.voices();return list.find(v=>(v.voiceURI||v.name)===this.voiceURI)||list[0]||null;}
 activate(){if(!this.supported||!this.enabled)return false;this.armed=true;try{this.synth.resume();}catch{}return true;}
 configure({enabled=this.enabled,volume=this.volume,voiceURI=this.voiceURI}={}){
  const voiceChanged=this.voiceURI!==voiceURI;this.enabled=!!enabled;this.volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:.8));this.voiceURI=voiceURI;
  if(!this.enabled||this.volume===0||voiceChanged)this.stop();
 }
 submit(cue,{preview=false}={}){
  if(!this.supported||!this.enabled||!this.armed||this.volume===0||!cue?.text)return false;
  const item={...cue,text:String(cue.text).slice(0,220),expires:this.now()+(cue.ttl??1800),preview};
  if(preview){this.stop();this.armed=true;this.gapUntil=0;}
  if(this.current&&item.priority>=80&&item.priority>this.current.priority){this.cancelCurrent();this.pending=null;this.gapUntil=this.now()+90;}
  // Low-value chatter never waits behind a higher-priority live call.
  if(this.current&&item.priority<this.current.priority)return false;
  if(!this.pending||item.priority>=this.pending.priority)this.pending=item;
  this.pump();return true;
 }
 pump(){
  this.clearTimer(this.wake);this.wake=null;
  if(!this.armed||!this.enabled||!this.supported||this.current||!this.pending)return;
  if(this.pending.expires<this.now()){this.pending=null;return;}
  if(this.now()<this.gapUntil){this.wake=this.timer(()=>this.pump(),this.gapUntil-this.now());return;}
  const item=this.pending;this.pending=null;const utterance=new this.Utterance(item.text),voice=this.voice(),generation=++this.generation;
  utterance.lang=voice?.lang||'en-US';if(voice)utterance.voice=voice;
  // A steady voice and written punctuation sound more conversational than
  // randomly changing pitch. Excitement gets a small pace lift, not a squeak.
  utterance.rate=item.priority>=85?1.08:1.035;utterance.pitch=1;utterance.volume=this.volume;
  this.current={...item,utterance,generation,started:false};
  const finish=()=>{if(this.current?.generation!==generation)return;this.clearTimer(this.watchdog);this.current=null;this.gapUntil=this.now()+360;this.onStatus({state:'ready',voice:voice?.name||'System English voice'});this.pump();};
  utterance.onstart=()=>{if(this.current?.generation!==generation)return;this.current.started=true;this.onLine(item.text,{kind:item.kind,preview:item.preview});this.onStatus({state:'speaking',voice:voice?.name||'System English voice'});};
  utterance.onend=finish;
  utterance.onerror=event=>{if(this.current?.generation!==generation)return;const code=event.error;this.clearTimer(this.watchdog);this.current=null;this.pending=null;this.armed=false;this.onStatus({state:'error',message:code==='not-allowed'?'Tap Hear sample to enable the voice.':'The voice could not play. Try another voice or tap Hear sample.'});};
  this.onStatus({state:'starting',voice:voice?.name||'System English voice'});
  // A broken device voice must not block the next play indefinitely.
  this.watchdog=this.timer(()=>{if(this.current?.generation===generation){this.cancelCurrent();this.pending=null;this.onStatus({state:'error',message:'The voice did not finish. Try a different voice.'});}},16000);
  try{this.synth.speak(utterance);}catch{utterance.onerror({error:'synthesis-failed'});}
 }
 cancelCurrent(){
  const item=this.current;this.current=null;this.generation++;this.clearTimer(this.watchdog);
  if(item){item.utterance.onstart=item.utterance.onend=item.utterance.onerror=null;try{this.synth.cancel();}catch{}}
 }
 stop(){this.pending=null;this.clearTimer(this.wake);this.cancelCurrent();this.gapUntil=0;this.armed=false;this.onStatus({state:this.enabled?'ready':'off',voice:this.voice()?.name||'System English voice'});}
 suspend(){this.stop();}
 destroy(){this.stop();this.synth?.removeEventListener?.('voiceschanged',this.changed);}
}
