import {createLevelClient} from './client.js?v=levels1';
import {XP_REWARDS,LEVEL_TITLES} from './rules.js?v=levels1';
import {REWARDS} from '../economy/rules.js?v=seas2';
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n).toLocaleString();
const meter=label=>`<div class="playerXPTrack" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>`;
export function initPlayerLevels({games,onProfile}) {
  document.getElementById('profileName').insertAdjacentHTML('afterend','<small class="profileLevel" data-level-badge aria-label="Player level is loading">LV —</small>');
  document.querySelector('.greeting').insertAdjacentHTML('afterend',`<section class="playerJourney" aria-label="Your player level"><div class="playerLevelMedal" aria-hidden="true"><small>LEVEL</small><b data-level-number>—</b><span>✦</span></div><div class="playerJourneyMain"><div class="playerJourneyHeading"><div><small>PLAY. PROGRESS. LEVEL UP.</small><strong data-level-title>Your next level starts here.</strong></div><span data-level-total>Connecting your XP…</span></div>${meter('XP toward your next player level')}<div class="playerJourneyBottom"><span data-level-progress>Earn XP in all 21 games.</span><span data-level-next>One level across your whole arcade</span></div></div><button type="button" data-level-profile>View progress <span>↗</span></button></section>`);
  const rows=games.map(g=>{const rewards=XP_REWARDS.filter(r=>r.game===g.id);return `<div class="xpRewardRow"><div><strong>${esc(g.name)}</strong>${rewards.map(r=>`<p>${esc(REWARDS.find(a=>a.game===r.game&&a.event===r.event).label)} <b>+${r.xp} XP</b></p>`).join('')}</div></div>`}).join('');
  document.querySelector('#profileForm h2').insertAdjacentHTML('afterend',`<section class="levelProfile" aria-label="Player level and XP"><div class="levelProfileHero"><div class="playerLevelMedal" aria-hidden="true"><small>LEVEL</small><b data-level-number>—</b><span>✦</span></div><div><small>YOUR ARCHERBOX LEVEL</small><h3 data-level-title>Getting your level…</h3><p>One player. Twenty-one ways to progress.</p></div></div><div class="levelProfileMeter"><div><strong data-level-progress>Connecting your XP…</strong><span data-level-next>Earn XP by completing achievements.</span></div>${meter('Profile XP toward next player level')}</div><div class="levelProfileStats"><div><b data-level-total>—</b><span>LIFETIME XP</span></div><div><b data-level-achievements>—</b><span>ACHIEVEMENTS</span></div><div><b data-level-games>—</b><span>GAMES EARNED IN</span></div></div><p class="levelConnection" data-level-status role="status" hidden></p><button type="button" class="levelRetry" data-level-refresh>↻ Refresh XP</button><details class="xpGuide"><summary>How to earn XP <span>＋</span></summary><p>Earn XP for these achievements. Repeating races and rounds counts again; each new creature counts once. Recorded online achievements you already earned count too.</p><div class="xpRewardList">${rows}</div><p>Your first level-up takes 100 XP. Each next level takes 50 more XP than the last. Your XP never expires, and buying avatar items does not spend it.</p><div class="levelMilestones">${LEVEL_TITLES.map(t=>`<span>LV ${t.level} <b>${t.title}</b></span>`).join('')}</div></details></section>`);
  let toastTimer,pendingRefresh;
  const setText=(selector,text)=>document.querySelectorAll(selector).forEach(el=>{el.textContent=text});
  function render(state) {
    const ready=!!state;
    setText('[data-level-badge]',ready?'LV '+state.level:'LV —');
    document.querySelectorAll('[data-level-badge]').forEach(el=>el.setAttribute('aria-label',ready?'Player level '+state.level:'Player level is loading'));
    setText('[data-level-number]',ready?state.level:'—');
    setText('[data-level-title]',ready?state.title:'Getting your level…');
    setText('[data-level-total]',ready?number(state.totalXP)+' XP':'Connecting your XP…');
    setText('[data-level-progress]',ready?number(state.earnedXP)+' / '+number(state.neededXP)+' XP':'Earn XP in all 21 games.');
    setText('[data-level-next]',ready?number(state.remainingXP)+' XP to Level '+(state.level+1):'One level across your whole arcade');
    setText('[data-level-achievements]',ready?number(state.achievements):'—');
    setText('[data-level-games]',ready?state.gamesPlayed+' / '+games.length:'—');
    document.querySelectorAll('.playerXPTrack').forEach(el=>{
      el.setAttribute('aria-valuemax',ready?state.neededXP:100);el.setAttribute('aria-valuenow',ready?state.earnedXP:0);
      el.setAttribute('aria-valuetext',ready?`${state.earnedXP} of ${state.neededXP} XP to Level ${state.level+1}`:'Loading XP');
      el.firstElementChild.style.width=(ready?state.percent:0)+'%';el.setAttribute('aria-busy',String(!ready));
    });
    document.querySelector('[data-level-status]').hidden=true;
  }
  function celebrate(state) {
    let toast=document.getElementById('playerLevelToast');
    if(!toast){toast=document.createElement('div');toast.id='playerLevelToast';toast.setAttribute('role','status');document.body.append(toast)}
    toast.replaceChildren();const icon=document.createElement('span');icon.textContent='✦';const text=document.createElement('div'),title=document.createElement('strong'),sub=document.createElement('small');title.textContent='LEVEL UP! You reached Level '+state.level;sub.textContent=state.title+' · Keep making your mark.';text.append(title,sub);toast.append(icon,text);toast.hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},5500);
  }
  const client=createLevelClient({onState:render,onLevelUp:celebrate,onError:error=>{
    const status=document.querySelector('[data-level-status]');status.textContent=error.message+' Your saved XP is safe. Use Refresh XP to try again.';status.hidden=false;
    if(!client.getState())setText('[data-level-total]','Connect to see your XP');
  }});
  const schedule=()=>{clearTimeout(pendingRefresh);pendingRefresh=setTimeout(()=>void client.refresh({celebrate:true}),200)};
  document.querySelector('[data-level-profile]').onclick=onProfile;
  document.querySelector('[data-level-refresh]').onclick=()=>void client.refresh({celebrate:true});
  document.addEventListener('archerbox:profile-open',()=>void client.refresh({celebrate:true}));
  window.addEventListener('archerbox:xp-sync',schedule);
  window.addEventListener('online',()=>void client.refresh({celebrate:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void client.refresh({celebrate:true})});
  // Other open game tabs can save XP too; polling is paused while this tab is hidden.
  setInterval(()=>{if(!document.hidden)void client.refresh({celebrate:true})},30000);
  return {connect:code=>client.connect(code),refresh:schedule};
}
