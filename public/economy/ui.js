import {REWARDS} from './rules.js?v=seas2';
import {readWallet,subscribeWallet} from './wallet.js?v=seas2';
let shop=()=>{};
export const coinButton=()=>'<button class="coinWallet" data-coin-wallet aria-label="Archerbox coins and how to earn them"><span class="coinMark" aria-hidden="true">✦</span><b data-coin-balance>'+readWallet().balance.toLocaleString()+'</b><span class="coinWord">coins</span></button>';
export function bindCoinButtons(root=document){root.querySelectorAll('[data-coin-wallet]').forEach(b=>b.onclick=showCoinGuide);updateBalances(readWallet())}
function updateBalances(wallet){document.querySelectorAll('[data-coin-balance]').forEach(el=>el.textContent=wallet.balance.toLocaleString())}
export function showCoinGuide(){const dialog=document.getElementById('coinGuide');if(dialog&&!dialog.open)dialog.showModal()}
export function initCoinUI({onShop}){
 shop=onShop;document.body.insertAdjacentHTML('beforeend',`<dialog id="coinGuide" class="coinGuide"><button id="closeCoinGuide" class="close" aria-label="Close coin guide">×</button><div class="coinGuideTop"><span class="coinMark" aria-hidden="true">✦</span><small>PLAY. EARN. MAKE IT YOURS.</small><h2>Your next look starts here.</h2><p>You have <b data-coin-balance>0</b> Archerbox coins.</p><button id="coinShop" class="coinShopLink">Explore the avatar shop ↗</button></div><div class="coinGuideList">${[...new Set(REWARDS.map(r=>r.game))].map(game=>{const rows=REWARDS.filter(r=>r.game===game);return '<div><b>'+rows[0].name+'</b><p>'+rows.map(r=>r.description).join(' Or ')+'</p><span>✦ +1</span></div>'}).join('')}</div><p class="coinFinePrint">Every achievement above earns 1 coin. Repeat races, levels, and rounds to earn more. New creatures earn once per creature. Coins and bought items are saved in this browser, just like your avatar. Coins only buy looks; they never change your abilities.</p></dialog>`);
 document.getElementById('closeCoinGuide').onclick=()=>document.getElementById('coinGuide').close();document.getElementById('coinShop').onclick=()=>{document.getElementById('coinGuide').close();shop()};subscribeWallet(updateBalances);bindCoinButtons();
}
