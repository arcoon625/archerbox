import {metricFor,scoreEvent,validRun} from './rules.js?v=charts1';
// Scores use the signed-in arcade profile, never a name or identity supplied by a game.
export function createTracker({fetcher=globalThis.fetch,storage=globalThis.localStorage,setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,onSynced=()=>{}}={}){
 let identity=null,profilePromise=null,queue=[],flushing=null,retry=null;const sessions=new Map();
 const key=code=>'archerbox-chart-outbox-v1:'+code;
 const read=k=>{try{return JSON.parse(storage?.getItem(k)||'null')}catch{return null}};
 function save(){if(identity)try{storage?.setItem(key(identity),JSON.stringify(queue.slice(-200)))}catch{}}
 async function api(path,body){const r=await fetcher(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error||'Could not sync results.'),{status:r.status});return data}
 function load(code){if(identity===code)return;identity=code;sessions.clear();const saved=read(key(code));queue=Array.isArray(saved)?saved.filter(e=>scoreEvent(e.game,e.event,e.progress)&&validRun(e.run)).slice(-200):[]}
 async function profile(){
  if(profilePromise)return profilePromise;
  profilePromise=(async()=>{const local=read('archerbox-lobby-v1')?.profile||{};const data=await api('/api/social/profile',{name:typeof local.name==='string'?local.name:'Archer',color:typeof local.color==='string'?local.color:'#c0f16b'});const code=data.profile?.code;if(typeof code!=='string'||!/^[a-z0-9]{10}$/.test(code))throw Error('Profile is not ready.');load(code);return code})();
  try{return await profilePromise}catch(e){profilePromise=null;throw e}
 }
 async function session(game){let pending=sessions.get(game);if(!pending){pending=api('/api/charts/play',{game}).then(d=>d.session);sessions.set(game,pending);pending.catch(()=>sessions.delete(game))}return pending}
 function later(){if(!retry)retry=setTimer(()=>{retry=null;flush().catch(()=>{})},30000)}
 async function flush(){
  if(flushing)return flushing;
  flushing=(async()=>{await profile();const owner=identity;while(queue.length&&owner===identity){
   const item={...queue[0]};
   try{const result=await api('/api/charts/progress',{...item,session:await session(item.game)});if(owner!==identity)break;if(result.added>0)try{onSynced()}catch{}queue=queue.filter(e=>!(e.game===item.game&&e.run===item.run&&e.event===item.event&&e.progress<=item.progress));save()}
   catch(e){if(e.status===410){sessions.delete(item.game);later();break}if(e.status===401||e.status===403||e.status===428){profilePromise=null;sessions.clear();later();break}if(e.status===400||e.status===404||e.status===413){queue=queue.filter(q=>!(q.game===item.game&&q.run===item.run&&q.event===item.event&&q.progress<=item.progress));save();continue}later();break}
  }})();try{await flushing}catch{later()}finally{flushing=null}
 }
 return {
  async play(game){if(!metricFor(game))return;try{await profile();await session(game);void flush()}catch{profilePromise=null;later()}},
  async record(data){if(!scoreEvent(data.game,data.event,data.progress)||!validRun(data.run))return;try{await profile();const e=queue.find(e=>e.game===data.game&&e.event===data.event&&e.run===data.run);if(e)e.progress=Math.max(e.progress,data.progress);else queue.push({game:data.game,event:data.event,run:data.run,progress:data.progress});queue=queue.slice(-200);save();void flush()}catch{profilePromise=null}},
  async refresh(){profilePromise=null;await flush()},
  stop(){if(retry)clearTimer(retry);retry=null},
 };
}
let tracker;
function browserTracker(){if(typeof window==='undefined')return null;try{return tracker??=createTracker({onSynced:()=>{window.dispatchEvent(new Event('archerbox:xp-sync'));if(window.parent!==window)window.parent.postMessage({type:'archerbox:xp-sync'},location.origin)}})}catch{return null}}
export const recordPlay=game=>browserTracker()?.play(game);
export const recordProgress=data=>browserTracker()?.record(data);
export const flushStats=()=>browserTracker()?.refresh().catch(()=>{});
if(typeof window!=='undefined'){
 window.addEventListener('online',()=>flushStats());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&tracker)void tracker.refresh()});
}
