// Runs before any game module. Each open page keeps its original save generation
// and player identity, so an old tab cannot restore a profile after a restart.
(()=>{
  if(window.archerboxRuntime)return;
  const EPOCH='__archerbox_restart_epoch',PENDING='__archerbox_restart_pending';
  const raw=window.localStorage,rawSession=window.sessionStorage,epoch=raw.getItem(EPOCH)||'';
  const playerKey=document.querySelector('meta[name="archerbox-player-key"]')?.content||'';
  const prefix=epoch?'archerbox-save:'+epoch+':':'';
  if(prefix)for(const store of [raw,rawSession])for(let i=store.length-1;i>=0;i--){const key=store.key(i);if(key&&key!==EPOCH&&key!==PENDING&&!key.startsWith(prefix))store.removeItem(key);}
  const stale=()=>raw.getItem(EPOCH)!==null&&raw.getItem(EPOCH)!==epoch||!!raw.getItem(PENDING);
  function scoped(storage){
    const keys=()=>Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k!==EPOCH&&k!==PENDING&&(!prefix||k.startsWith(prefix)));
    return {get length(){return keys().length},key(i){const k=keys()[i];return k==null?null:prefix?k.slice(prefix.length):k},
      getItem(key){return storage.getItem(prefix+String(key))},
      setItem(key,value){if(stale())throw new DOMException('A player restart is in progress.','InvalidStateError');storage.setItem(prefix+String(key),String(value))},
      removeItem(key){if(stale())return;storage.removeItem(prefix+String(key))},
      clear(){if(stale())return;for(const k of keys())storage.removeItem(k)}
    };
  }
  try{Object.defineProperty(window,'localStorage',{value:scoped(raw),configurable:true});Object.defineProperty(window,'sessionStorage',{value:scoped(rawSession),configurable:true})}catch{}
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);
    if(url.origin===location.origin&&url.pathname.startsWith('/api/')){
      const headers=new Headers(init?.headers||input?.headers);
      if(playerKey)headers.set('X-Archerbox-Player',playerKey);
      return originalFetch(input,{...init,headers});
    }
    return originalFetch(input,init);
  };
  function recover(){
    if(location.pathname.startsWith('/reset/recover'))return;
    if(raw.getItem(PENDING)||raw.getItem(EPOCH)!==null&&raw.getItem(EPOCH)!==epoch){
      try{window.top.location.replace('/reset/recover.html')}catch{location.replace('/reset/recover.html')}
    }
  }
  window.addEventListener('storage',event=>{
    if(event.archerboxScoped)return;
    if(event.key===EPOCH||event.key===PENDING||event.key===null){recover();return}
    if(prefix){
      event.stopImmediatePropagation();
      if(event.key?.startsWith(prefix)){
        const scopedEvent=new StorageEvent('storage',{key:event.key.slice(prefix.length),oldValue:event.oldValue,newValue:event.newValue,url:event.url,storageArea:event.storageArea});
        Object.defineProperty(scopedEvent,'archerboxScoped',{value:true});window.dispatchEvent(scopedEvent);
      }else if(event.key&&event.newValue!==null){event.storageArea?.removeItem(event.key);}
    }
  });
  window.addEventListener('pageshow',recover);
  window.archerboxRuntime={rawStorage:raw,rawSessionStorage:rawSession,epoch,playerKey,EPOCH,PENDING};
  recover();
})();
