export const EPOCH='__archerbox_restart_epoch',PENDING='__archerbox_restart_pending';
export function pendingReset(storage){
  try{const value=JSON.parse(storage.getItem(PENDING)||'null');return value?.confirmed===true&&typeof value.id==='string'&&/^[a-f0-9-]{36}$/.test(value.id)?value:null}catch{return null}
}
export async function clearSavedProgress({storage,session,epoch,cacheStorage,indexedDB}){
  if(cacheStorage)for(const key of await cacheStorage.keys())await cacheStorage.delete(key);
  if(indexedDB?.databases){
    for(const database of await indexedDB.databases())if(database.name)await new Promise((resolve,reject)=>{
      const request=indexedDB.deleteDatabase(database.name);
      request.onsuccess=resolve;request.onerror=()=>reject(Error('A saved game could not be cleared. Please try again.'));
      request.onblocked=()=>reject(Error('Close other Archerbox tabs, then finish restarting.'));
    });
  }
  session?.clear();storage.clear();
  // This anonymous save generation contains no progress. Old open tabs can only
  // write to their previous generation, which the new player will never load.
  storage.setItem(EPOCH,epoch);
}
export function createRestart({storage,session,fetcher=globalThis.fetch,locks=globalThis.navigator?.locks,cacheStorage,indexedDB,currentEpoch='',newId=()=>crypto.randomUUID(),onStart=()=>{},onFinish=()=>{}}){
  let running=null;
  function restart(confirmed){
    if(confirmed!==true)return Promise.reject(Error('Confirm before restarting everything.'));
    if(running)return running;
    const execute=async()=>{
      let pending=pendingReset(storage);
      if(!pending&&(storage.getItem(EPOCH)||'')!==currentEpoch){onFinish();return}
      if(!pending){pending={id:newId(),confirmed:true};storage.setItem(PENDING,JSON.stringify(pending));}
      onStart();
      let result;
      do {
        const response=await fetcher('/api/session/reset',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true}),signal:AbortSignal.timeout(30000)});
        result=await response.json();if(!response.ok||(!result.reset&&!result.pending))throw Error(result.error||'Your restart could not finish. Please try again.');
      } while(result.pending);
      await clearSavedProgress({storage,session,epoch:pending.id,cacheStorage,indexedDB});
      onFinish();
    };
    running=(locks?locks.request('archerbox-restart-everything',execute):execute()).finally(()=>{running=null});
    return running;
  }
  async function finishIfDeleted(){
    const pending=pendingReset(storage);if(!pending)return false;
    const response=await fetcher('/api/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)}),state=await response.json();
    if(!response.ok||state.ready||state.resetting)return false;
    const complete=async()=>{if(pendingReset(storage)?.id===pending.id)await clearSavedProgress({storage,session,epoch:pending.id,cacheStorage,indexedDB});onFinish();};
    if(locks)await locks.request('archerbox-restart-everything',complete);else await complete();
    return true;
  }
  return {restart,finishIfDeleted};
}
