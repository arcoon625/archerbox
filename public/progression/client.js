// One server read can cover several achievements. If another arrives during the read,
// fetch again afterwards so a late response cannot leave the displayed level behind.
export function createLevelClient({fetcher=globalThis.fetch,onState=()=>{},onError=()=>{},onLevelUp=()=>{}}={}) {
  let owner=null,state=null,inFlight=null,generation=0,again=false,celebrateNext=false;
  async function refresh({celebrate=false}={}) {
    if(!owner)return;
    celebrateNext ||= celebrate;
    if(inFlight){again=true;return inFlight;}
    const requestGeneration=generation;
    inFlight=(async()=>{
      do {
        again=false;
        const shouldCelebrate=celebrateNext;celebrateNext=false;
        try {
          const response=await fetcher('/api/charts/player',{credentials:'same-origin',cache:'no-store'});
          const next=await response.json();
          if(!response.ok)throw new Error(next.error||'Your level could not connect.');
          if(requestGeneration!==generation)return;
          if(!Number.isSafeInteger(next.totalXP)||next.totalXP<0||!Number.isSafeInteger(next.level)||next.level<1)throw new Error('Your level could not load. Try again.');
          const previous=state;state=next;onState(next);
          if(shouldCelebrate&&previous&&next.level>previous.level)onLevelUp(next);
        } catch(error) {
          if(requestGeneration===generation){celebrateNext ||= shouldCelebrate;onError(error);}
        }
      } while(again&&requestGeneration===generation);
    })();
    try {await inFlight;} finally {
      inFlight=null;
      // A profile changed while its old request was still resolving.
      if(requestGeneration!==generation&&owner)void refresh();
    }
  }
  return {
    connect(code){if(typeof code!=='string'||!code)return;if(owner===code)return;owner=code;state=null;++generation;celebrateNext=false;onState(null);void refresh();},
    refresh,
    getState:()=>state
  };
}
