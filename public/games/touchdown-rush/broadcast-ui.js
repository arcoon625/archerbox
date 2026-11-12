import {CommentaryDirector} from './commentary.js?v=broadcast4';
import {RecordedChannel} from './recorded-speech.js?v=studio3';

const KEY='archerbox-football-broadcast-v1';
export function setupBroadcast({getGame,getTeams,getHomeIndex,active}){
 const $=id=>document.getElementById(id),director=new CommentaryDirector();let enabled=true,volume=.8,captions=true,hideCaption,sample=0;
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');enabled=saved.enabled!==false;captions=saved.captions!==false;volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.8;}catch{}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({enabled,volume,captions}));}catch{}};
 function clearCaption(){clearTimeout(hideCaption);$('broadcastCaption').hidden=true;}
 function line(text,{preview=false,duration=4}={}){
  $('broadcastSampleLine').textContent=(preview?'SAMPLE · ':'LAST CALL · ')+text;
  if(!captions||!active())return;clearTimeout(hideCaption);$('broadcastTag').textContent='LIVE CALL';$('broadcastLine').textContent=text;$('broadcastCaption').hidden=false;
  hideCaption=setTimeout(clearCaption,Math.max(3000,(duration+.6)*1000));
 }
 function showStatus(next){
  $('announcerStatus').dataset.state=next.state;
  $('announcerStatus').textContent=!channel.supported?'Audio is unavailable in this browser.':!enabled?'Announcer off.':volume===0?'Volume is at zero.':next.state==='error'?next.message:next.state==='speaking'?'ON AIR · '+next.voice:next.state==='starting'?'Loading call…':'Ready · '+channel.voice().name;
 }
 const channel=new RecordedChannel({onLine:line,onStatus:showStatus});
 channel.configure({enabled,volume});
 function controls(){
  $('announcerEnabled').textContent=enabled?'ON':'OFF';$('announcerEnabled').setAttribute('aria-pressed',String(enabled));$('announcerLive').textContent='ANNOUNCER '+(enabled?'ON':'OFF');$('announcerLive').setAttribute('aria-pressed',String(enabled));
  $('announcerVolume').value=String(Math.round(volume*100));$('announcerVolumeValue').textContent=Math.round(volume*100)+'%';$('announcerCaptions').checked=captions;
  for(const id of ['announcerEnabled','announcerLive','announcerVolume','announcerTest'])$(id).disabled=!channel.supported;
 }
 function reset(g){director.reset(g,{teams:getTeams(),homeIndex:getHomeIndex()});}
 function enable(){enabled=!enabled;channel.configure({enabled});clearCaption();if(enabled){channel.activate();reset(getGame());}controls();showStatus({state:enabled?'ready':'off'});save();}
 $('announcerEnabled').onclick=enable;$('announcerLive').onclick=enable;
 $('announcerVolume').oninput=()=>{volume=Number($('announcerVolume').value)/100;channel.configure({volume});$('announcerVolumeValue').textContent=Math.round(volume*100)+'%';save();if(volume===0)clearCaption();};
 $('announcerCaptions').onchange=()=>{captions=$('announcerCaptions').checked;if(!captions)clearCaption();save();};
 $('announcerTest').onclick=()=>{
  if(!enabled){enabled=true;channel.configure({enabled});controls();save();}if(volume===0){volume=.8;channel.configure({volume});controls();save();}
  const g=getGame();reset(g);channel.activate();const kinds=['touchdown','interception','firstDown','fieldGood'],kind=kinds[sample++%kinds.length],a=g.actors?.[1];
  const cue=director.cue(kind,g,90,6000,{name:a?.name||'The receiver',defender:g.actors?.[18]?.name||'The defender',gain:'twelve yards',yards:12,distance:42});channel.submit(cue,{preview:true});
 };
 controls();showStatus({state:enabled?'ready':'off'});
 const suspend=()=>{channel.suspend();clearCaption();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',event=>{clearCaption();if(event.persisted)channel.suspend();else channel.destroy();});
 return {
  start(g){channel.stop();clearCaption();reset(g);channel.activate();channel.submit(director.intro(g));},
  observe(g){const cue=director.observe(g);if(cue)channel.submit(cue);channel.pump();},
  resume(g){clearCaption();reset(g);channel.activate();},suspend,
  reset(g){suspend();reset(g);}
 };
}
