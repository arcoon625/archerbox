import {usernameChoice} from './rules.js?v=welcome1';
const form=document.getElementById('usernameForm'),input=document.getElementById('newUsername'),button=document.getElementById('saveUsername'),error=document.getElementById('usernameError'),status=document.getElementById('usernameStatus'),avatar=document.getElementById('nameAvatar');
let saving=false;
function update(){const choice=usernameChoice(input.value);button.disabled=saving||!!choice.error;avatar.textContent=choice.name?choice.name.slice(0,2).toUpperCase():'?';error.hidden=true;input.removeAttribute('aria-invalid')}
input.addEventListener('input',update);
form.addEventListener('submit',async event=>{
  event.preventDefault();if(saving)return;
  const choice=usernameChoice(input.value);if(choice.error){error.textContent=choice.error;error.hidden=false;input.setAttribute('aria-invalid','true');input.focus();return}
  saving=true;button.disabled=true;input.readOnly=true;error.hidden=true;status.textContent='Saving your username…';
  try {
    const response=await fetch('/api/session',{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({username:choice.name})});
    const data=await response.json();if(!response.ok||!data.ready)throw Error(data.error||'Your username could not save. Try again.');
    // Confirm that the browser kept its session. A local flag can never unlock the lobby.
    const check=await fetch('/api/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)}),saved=await check.json();
    if(!check.ok||!saved.ready)throw Error('Allow cookies for Archerbox, then save your username again.');
    status.textContent='You’re in! Opening Archerbox…';
    location.reload();
  } catch(problem) {
    saving=false;input.readOnly=false;update();error.textContent=problem.message||'Connect to the internet and try again.';error.hidden=false;status.textContent='Your username must be saved before you can play.';
  }
});
// Recheck when returning from another tab, where this browser may have finished setup.
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
input.focus();
