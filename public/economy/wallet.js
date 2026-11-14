import {restoreWallet,award,purchase,canWear,priceOf} from './rules.js?v=seas2';
import {recordPlay,recordProgress} from '../charts/client.js?v=levels1';
export {canWear,priceOf};
export const WALLET_KEY='archerbox-coins-v1';
const parse=value=>{try{return JSON.parse(value||'null')}catch{return null}};
function loadWallet(storage){return restoreWallet(parse(storage.getItem(WALLET_KEY)),parse(storage.getItem('archerbox-avatar-v1')))}
export function readWallet(storage=localStorage){try{return loadWallet(storage)}catch{return restoreWallet(null)}}
// The lock serializes purchases and rewards from different game frames or tabs.
export async function transactWallet(mutate,{storage=localStorage,locks=globalThis.navigator?.locks,notify=()=>window.dispatchEvent(new Event('archerbox:wallet'))}={}){
 const apply=()=>{let wallet,result;try{wallet=loadWallet(storage);result=mutate(wallet);if(!result.ok)return result;storage.setItem(WALLET_KEY,JSON.stringify(wallet));}catch{return {ok:false,reason:'storage'}}try{notify()}catch{}return {...result,wallet};};
 try{return locks?await locks.request(WALLET_KEY,apply):apply()}catch{return {ok:false,reason:'storage'}}
}
export function subscribeWallet(callback){const listener=e=>{if(e.type!=='storage'||e.key===WALLET_KEY||e.key===null)callback(readWallet())};window.addEventListener('storage',listener);window.addEventListener('archerbox:wallet',listener);callback(readWallet());return()=>{window.removeEventListener('storage',listener);window.removeEventListener('archerbox:wallet',listener)}}
export const buyItem=id=>transactWallet(wallet=>purchase(wallet,id));
let toastTimer,errorShown=false,toastAmount=0,toastLabels=new Set();
function notice(text,error=false){let el=document.getElementById('archerboxCoinToast');if(!el){el=document.createElement('div');el.id='archerboxCoinToast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');Object.assign(el.style,{position:'fixed',zIndex:'2147483646',left:'50%',bottom:'24px',transform:'translateX(-50%)',maxWidth:'calc(100vw - 28px)',boxSizing:'border-box',padding:'13px 20px',borderRadius:'16px',background:'#17241d',color:'#fff1b7',border:'1px solid #9c8745',boxShadow:'0 8px 32px #0004',font:'600 14px/1.5 system-ui,sans-serif',textAlign:'center',pointerEvents:'none'});document.body.append(el)}const target=document.querySelector('dialog[open]')||document.body;if(el.parentNode!==target)target.append(el);el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;toastAmount=0;toastLabels.clear()},3800);if(error)el.style.color='#ffd7bd'}
async function grant(data){const result=await transactWallet(wallet=>award(wallet,data));if(result.ok&&result.amount){void recordProgress(data);toastAmount+=result.amount;toastLabels.add(result.label);notice(`+${toastAmount} Archerbox ${toastAmount===1?'coin':'coins'} · ${toastLabels.size===1?result.label:'Great playing!'}`)}else if(!result.ok&&result.reason==='storage'&&!errorShown){errorShown=true;notice('Coins could not save. Please allow browser storage to earn coins.',true)}return result}
export function createCoinRun(game,{room=typeof location!=='undefined'?new URLSearchParams(location.search).get('room'):null,write=grant,newId=()=>globalThis.crypto.randomUUID()}={}){
 if(typeof window!=='undefined'&&write===grant)void recordPlay(game);
 let run=room?'room:'+room:null,seen=new Map();
 return {
  begin(){run=room?'room:'+room:newId();seen=new Map()},
  counter(event,progress){if(!run||!Number.isSafeInteger(progress)||progress<1||progress<=(seen.get(event)||0))return;const previous=seen.get(event)||0;seen.set(event,progress);const current=run;return write({game,event,run:current,progress}).then(result=>{if(!result.ok&&run===current&&seen.get(event)===progress)seen.set(event,previous);return result})},
  once(event){return this.counter(event,1)},
  unique(event,id){if(typeof id!=='string'||!id||id.length>80)return;const key=event+'/'+id;if(seen.has(key))return;seen.set(key,1);return write({game,event,run:'discovery:'+id,progress:1}).then(result=>{if(!result.ok)seen.delete(key);return result})}
 };
}
// Persist the one-time saved-outfit migration even before the first reward.
if(typeof window!=='undefined')transactWallet(()=>({ok:true}));
