import {createRestart,pendingReset} from './client.js?v=restart1';
export function initRestart({mount,onStart=()=>{},recovery=false}={}){
  const runtime=window.archerboxRuntime;
  const storage=runtime?.rawStorage||localStorage,session=runtime?.rawSessionStorage||sessionStorage;
  if(mount)mount.insertAdjacentHTML('beforeend',`<section class="restartSection"><div><strong>Start from scratch</strong><p>Restart your player and all saved progress.</p></div><button type="button" data-open-restart>↻ Restart all progress</button></section>`);
  document.body.insertAdjacentHTML('beforeend',`<dialog id="restartDialog" aria-labelledby="restartTitle" aria-describedby="restartDescription"><div class="restartDialogContent"><span class="restartSymbol" aria-hidden="true">↻</span><small>RESTART YOUR PLAYER</small><h2 id="restartTitle">Are you sure?</h2><p id="restartDescription">Restarting everything deletes:</p><ul><li>Your username and friend code</li><li>Your level, XP, and leaderboard scores</li><li>Your coins, avatar items, pets, and outfits</li><li>Every game save, record, collection, and custom team</li><li>Your friends, invites, and current matches</li><li>Your fantasy teams and league memberships</li></ul><p class="restartLeagueNote">Shared leagues can continue with a CPU team in your place.</p><p class="restartWarning">You’ll choose a new username and start from zero. This cannot be undone.</p><p class="restartError" id="restartError" role="alert" hidden></p><p id="restartStatus" role="status"></p><div class="restartActions"><button type="button" id="cancelRestart" autofocus>Keep my progress</button><button type="button" id="confirmRestart">Yes, restart everything</button></div></div></dialog>`);
  const dialog=document.getElementById('restartDialog'),cancel=document.getElementById('cancelRestart'),confirm=document.getElementById('confirmRestart'),status=document.getElementById('restartStatus'),error=document.getElementById('restartError');
  let busy=false;
  const restart=createRestart({storage,session,fetcher:window.fetch.bind(window),locks:navigator.locks,cacheStorage:window.caches,indexedDB:window.indexedDB,currentEpoch:runtime?.epoch||'',onStart:()=>{document.dispatchEvent(new Event('archerbox:reset-start'));onStart();},onFinish:()=>location.replace('/')});
  const open=()=>{if(pendingReset(storage)){cancel.disabled=true;cancel.textContent='Restart already started';}error.hidden=true;status.textContent='';if(!dialog.open)dialog.showModal();(cancel.disabled?confirm:cancel).focus()};
  document.querySelectorAll('[data-open-restart]').forEach(button=>button.addEventListener('click',open));
  cancel.onclick=()=>dialog.close();
  dialog.addEventListener('cancel',event=>{if(busy||pendingReset(storage))event.preventDefault()});
  confirm.onclick=async()=>{
    if(busy)return;busy=true;confirm.disabled=true;cancel.disabled=true;error.hidden=true;status.textContent='Restarting your player and clearing every save…';
    try{await restart.restart(true)}catch(problem){busy=false;confirm.disabled=false;confirm.textContent='Try finishing restart again';error.textContent=problem.message;error.hidden=false;status.textContent='Your restart has started. Finish it to create your new player.';}
  };
  if(recovery){
    let polling=false;const poll=async()=>{if(polling)return;polling=true;try{await restart.finishIfDeleted();if(!pendingReset(storage)){const response=await fetch('/api/session',{cache:'no-store'}),state=await response.json();if(!state.resetting)location.replace('/')}}catch{}finally{polling=false}};
    void poll();setInterval(poll,2500);
  }
  return {open};
}
