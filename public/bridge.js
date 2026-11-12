import {isNonFatalBrowserNotice} from './game-errors.js?v=recovery1';
// Only the active, same-origin game can request a return to its own lobby.
if(window.parent!==window){
 const send=type=>window.parent.postMessage({type},window.location.origin);
 document.addEventListener('DOMContentLoaded',()=>send('archerbox:ready'));
 if(document.readyState!=='loading')send('archerbox:ready');
 window.addEventListener('error',event=>{if(!isNonFatalBrowserNotice(event))send('archerbox:game-error');});
 window.addEventListener('archerbox:game-recovered',()=>send('archerbox:game-recovered'));
 document.querySelectorAll('a[href="../../index.html"]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();send('archerbox:lobby')}));
}
