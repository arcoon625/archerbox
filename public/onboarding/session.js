export async function readPlayer(fetcher=globalThis.fetch) {
  const response=await fetcher('/api/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
  const state=await response.json();
  if(!response.ok)throw Error(state.error||'Your player profile could not connect.');
  return state.ready&&state.profile?state.profile:null;
}
export async function requirePlayer() {
  try {
    const player=await readPlayer();if(player)return player;
    // Reload through the Worker, so a game hash or local save never skips setup.
    location.reload();
  } catch {
    const main=document.createElement('main'),title=document.createElement('h1'),text=document.createElement('p'),retry=document.createElement('button');
    main.setAttribute('aria-label','Connect your player profile');
    Object.assign(main.style,{maxWidth:'480px',margin:'15vh auto',padding:'30px',textAlign:'center',fontFamily:'system-ui,sans-serif'});
    title.textContent='Let’s reconnect.';text.textContent='Archerbox needs to check your saved username before opening the games.';retry.textContent='Try again ↻';retry.onclick=()=>location.reload();
    Object.assign(retry.style,{padding:'12px 20px',background:'#c0f16b',color:'#20351a',border:0,borderRadius:'8px',fontWeight:'700',cursor:'pointer'});
    main.append(title,text,retry);document.body.replaceChildren(main);
  }
  return new Promise(()=>{});
}
