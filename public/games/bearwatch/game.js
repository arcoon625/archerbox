import * as T from '../../vendor/three.module.js';
import {SAVE_KEY,DAY_SECONDS,NIGHT_SECONDS,CHEST_DAYS,HIKE_UNLOCK,FIRE_MAX,SPECIES,CAMP_GOALS,BERRIES,bearDanger,nearestFood,harvestFood,nearestBerries,forage,cookFood,eatMeal,WEAPONS,CANS,SHOP,BASE,TREES,ROCKS,CHEST,CHEST_LOOT,MOUNTAINS,groundHeight,canHike,nearFire,nearestWood,nearestTree,collectWood,fuelFire,toggleAxe,chestCount,nearChest,rollChest,keepChestPrize,freshGame,restoreGame,restart,tick,interact,nearestCan,canShop,buyWeapon,equip,weapon,attack,clamp,distance,notice} from './rules.js?v=wildlife1';
import {makeWorld} from './scene.js?v=wildlife1';
import {createCoinRun} from '../../economy/wallet.js?v=charts1';
const coinRun=createCoinRun('bearwatch'),$=id=>document.getElementById(id);
const clock=t=>{const s=Math.max(0,Math.ceil(t));return Math.floor(s/60).toString().padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
const art=id=>{const common='viewBox="0 0 160 90" fill="none" stroke-linecap="round" stroke-linejoin="round"';const shapes={
 stick:'<path d="M33 71L120 16M81 41L84 15" stroke="#755137" stroke-width="9"/><path d="M36 69L47 62" stroke="#414e39" stroke-width="12"/>',
 bat:'<path d="M37 72L65 53" stroke="#6a5135" stroke-width="8"/><path d="M63 53L122 13" stroke="#b1925e" stroke-width="19"/><path d="M38 70L55 59" stroke="#3e503c" stroke-width="10"/>',
 slingshot:'<path d="M80 78V47L48 14M80 47L112 14" stroke="#9e7f4d" stroke-width="12"/><path d="M48 15L80 55L112 15" stroke="#454e3c" stroke-width="3"/><path d="M80 74V54" stroke="#4c5d40" stroke-width="14"/>',
 crossbow:'<path d="M47 66L117 20" stroke="#9a784a" stroke-width="14"/><path d="M69 23L88 14L137 62L129 77" stroke="#354b3c" stroke-width="8"/><path d="M69 23L60 58L129 77" stroke="#9d9e7c" stroke-width="2"/><path d="M43 71L125 15" stroke="#a1aaa0" stroke-width="3"/><path d="M51 65L59 79" stroke="#354b3c" stroke-width="9"/>',
 tranquilizer:'<path d="M45 65L56 44L112 34" stroke="#2b463d" stroke-width="17"/><path d="M56 44L42 24L112 12L120 34Z" fill="#395346"/><path d="M112 19L142 13" stroke="#9aa9a0" stroke-width="12"/><path d="M135 14L143 13" stroke="#6fbaae" stroke-width="15"/><path d="M65 23L90 19" stroke="#cc8752" stroke-width="4"/>',
 flare:'<path d="M49 67L60 42" stroke="#2a4439" stroke-width="18"/><path d="M46 24L111 12L120 37L56 47Z" fill="#ce713c"/><path d="M113 22L139 17" stroke="#a2b0a7" stroke-width="18"/><path d="M136 18L143 17" stroke="#e18c42" stroke-width="21"/><path d="M65 25L88 21" stroke="#ffe4a2" stroke-width="4"/>'
 };shapes['hunting-rifle']='<path d="M21 62L64 48L112 37" stroke="#6e5038" stroke-width="14"/><path d="M68 43L147 24" stroke="#3c4640" stroke-width="6"/><path d="M72 30L105 22" stroke="#263a31" stroke-width="10"/><path d="M65 50L58 66" stroke="#6e5038" stroke-width="9"/>';if(['trail-pistol','carbine','gold-rifle'].includes(id)){const gold=id==='gold-rifle',rifle=id!=='trail-pistol';shapes[id]='<path d="M53 65L62 43" stroke="#304738" stroke-width="13"/><path d="M45 27L112 20L117 42L56 49Z" fill="'+(gold?'#c7a53f':'#486253')+'"/><path d="M113 29L149 25" stroke="#a9b1a3" stroke-width="9"/>'+(rifle?'<path d="M45 32L15 36L18 51L47 42M89 46L86 67" stroke="'+(gold?'#c7a53f':'#304738')+'" stroke-width="12"/>':'');}return '<svg '+common+' aria-hidden="true">'+shapes[id]+'</svg>';};

function boot(){
 const cover=new URLSearchParams(location.search).get('cover')==='1';if(cover)document.body.classList.add('cover');
 let g,hasSave=false,storageOkay=true,lastSaveText=null;
 try{lastSaveText=localStorage.getItem(SAVE_KEY);const raw=JSON.parse(lastSaveText||'null');g=restoreGame(raw);hasSave=raw?.version===1;}catch{g=freshGame();storageOkay=false;}
 if(cover)g=freshGame();
 const canvas=$('world'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(72,innerWidth/innerHeight,.07,180);scene.add(camera);const world=makeWorld(scene,camera);
 let mode='menu',returnMode='menu',helpMode='menu',chestReturnMode='menu',keys={},touch={x:0,z:0,sprint:false},look=null,yaw=g.player.yaw,pitch=g.player.pitch,queuedJump=false,flashlight=true,mapVisible=true,graphicsLost=false,last=performance.now(),saveTime=0,hudTime=0,lastPhase=g.phase,lastEventId=0,loadoutKey='',sound=false,audio=null,claiming=false,rollInterval=null,rollTimeout=null,scareTime=0;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{sound=localStorage.getItem('archerbox-bearwatch-sound')==='on';}catch{}
 function readLatest(){try{const text=localStorage.getItem(SAVE_KEY);if(text&&text!==lastSaveText){g=restoreGame(JSON.parse(text));lastSaveText=text;hasSave=true;yaw=g.player.yaw;pitch=g.player.pitch;lastPhase=g.phase;loadoutKey='';return true;}}catch{}return false;}
 function save(){if(cover)return;if(readLatest())return;try{const serialized=JSON.stringify(g);localStorage.setItem(SAVE_KEY,serialized);lastSaveText=serialized;storageOkay=true;hasSave=true;}catch{storageOkay=false;}$('saveSummary').textContent=storageOkay?'Best: '+g.best+' / 100 nights · '+g.diamonds+' diamonds · '+g.owned.length+' weapons':'Saving is unavailable. Keep this tab open to keep your expedition.';}
 async function claimCoins(){
  if(claiming||cover||!g.coinTickets.length)return;claiming=true;
  try{for(const ticket of [...g.coinTickets]){const result=await coinRun.unique('survive',ticket);if(result?.ok){g.coinTickets=g.coinTickets.filter(id=>id!==ticket);save();}else break;}}finally{claiming=false;}
 }
 function tone(kind){if(!sound||cover)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const now=audio.currentTime,o=audio.createOscillator(),gain=audio.createGain(),hz={dawn:620,night:135,hit:92,swing:250,hide:340,buy:850,growl:65,win:1000}[kind]||440;o.type=['growl','night'].includes(kind)?'triangle':'sine';o.frequency.setValueAtTime(hz,now);o.frequency.exponentialRampToValueAtTime(hz*(kind==='dawn'||kind==='buy'||kind==='win'?1.6:.65),now+.34);gain.gain.setValueAtTime(kind==='growl'?.04:.028,now);gain.gain.exponentialRampToValueAtTime(.001,now+.4);o.connect(gain);gain.connect(audio.destination);o.start();o.stop(now+.41);}catch{}}
 function soundUI(){$('sound').textContent=sound?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',sound);}
 function resetInput(){keys={};touch={x:0,z:0,sprint:false};queuedJump=false;look=null;$('stick').firstElementChild.style.transform='';$('touchSprint').setAttribute('aria-pressed','false');}
 function releaseMouse(){if(document.pointerLockElement===canvas)document.exitPointerLock?.();}
 function menuCamera(){
  camera.fov=cover?58:innerWidth<761?57:48;
  if(cover){camera.position.set(0,2,-8);camera.lookAt(0,1.25,4);}else if(innerWidth<761){camera.position.set(20,11,26);camera.lookAt(0,1,7);}else{camera.position.set(22,12,28);camera.lookAt(-1,1,6);}
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
 }
 function follow(){const p=g.player;camera.fov=innerWidth<761?79:73;camera.position.set(p.x,groundHeight(p.x,p.z)+p.y+(p.hidden>=0?1.31:1.65)+Math.sin(p.walk*5)*.018,p.z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();}
 function refreshMenu(){
  $('start').innerHTML=(['won','lost'].includes(g.phase)?'NEW EXPEDITION':hasSave?'CONTINUE EXPEDITION':'ENTER THE FOREST')+' <span>↗</span>';
  $('saveSummary').textContent=storageOkay?(hasSave?'Night '+Math.min(100,g.survived+1)+' · Best '+g.best+' / 100 · ◇ '+g.diamonds+' diamonds':'A fresh start. A very long night.'):'Saving is unavailable. Keep this tab open to keep your expedition.';
  $('menuChest').textContent=chestCount(g)?'▣ GOLDEN CHEST · '+chestCount(g):'▣ CHEST EVERY 2 DAYS';$('menuChest').disabled=!chestCount(g);
 }
 function loadout(){
  const key=g.owned.join(',')+'/'+g.equipped+'/'+g.tool;if(key===loadoutKey)return;loadoutKey=key;
  $('hotbar').innerHTML=WEAPONS.map((w,i)=>'<button data-equip="'+w.id+'" aria-label="'+w.name+(g.owned.includes(w.id)?'':' (locked)')+'" class="'+(g.owned.includes(w.id)?'owned':'locked')+(!g.tool&&g.equipped===w.id?' active':'')+'" '+(g.owned.includes(w.id)?'':'disabled')+'><small>'+((i+1)%10)+'</small>'+w.icon+'</button>').join('');
  $('hotbar').querySelectorAll('button').forEach(b=>b.onclick=()=>{equip(g,b.dataset.equip);loadout();save();});
 }
 function drawMap(){
  const c=$('minimap').getContext('2d'),size=168,toX=x=>84+x*2.35,toY=z=>84+z*2.35;c.clearRect(0,0,size,size);c.fillStyle='#152d22';c.fillRect(0,0,size,size);c.strokeStyle='#b4c49317';c.lineWidth=1;for(let n=15;n<168;n+=23){c.beginPath();c.moveTo(n,0);c.lineTo(n,168);c.moveTo(0,n);c.lineTo(168,n);c.stroke();}
  c.fillStyle='#54704466';for(const [id,t] of TREES.entries())if(!g.felled.includes(id))c.fillRect(toX(t.x)-1,toY(t.z)-1,2,2);
  for(const m of MOUNTAINS){const x=toX(m.x),y=toY(m.z);c.fillStyle=g.peaks.includes(m.id)?'#778776':'#c4bd93';c.beginPath();c.moveTo(x,y-6);c.lineTo(x-5,y+4);c.lineTo(x+5,y+4);c.closePath();c.fill();c.font='7px Arial';c.textAlign='center';c.fillText(m.name[0],x,y+13);}
  c.fillStyle='#aa9d6b55';c.fillRect(toX(-8),toY(3),16*2.35,16*2.35);c.strokeStyle=g.phase==='day'?'#d2ca8c':'#97b39144';c.setLineDash(g.phase==='night'?[2,3]:[]);c.strokeRect(toX(-8),toY(3),16*2.35,16*2.35);c.setLineDash([]);
  for(const can of g.fireFuel>0?CANS:[]){c.fillStyle='#b9df91';c.beginPath();c.arc(toX(can.x),toY(can.z),2.5,0,Math.PI*2);c.fill();}
  c.fillStyle='#e7d39c';c.fillRect(toX(SHOP.x)-3,toY(SHOP.z)-3,6,6);
  if(chestCount(g)){c.fillStyle='#ffe087';c.fillRect(toX(CHEST.x)-4,toY(CHEST.z)-3,8,6);c.strokeStyle='#a0792c';c.strokeRect(toX(CHEST.x)-4,toY(CHEST.z)-3,8,6);}
  if(bearDanger(g)&&g.bear.retreat<=0&&distance(g.player,g.bear)<23){c.fillStyle='#ef9e65';c.beginPath();c.moveTo(toX(g.bear.x),toY(g.bear.z)-4);c.lineTo(toX(g.bear.x)-3,toY(g.bear.z)+3);c.lineTo(toX(g.bear.x)+3,toY(g.bear.z)+3);c.closePath();c.fill();}
  for(const a of g.wildlife){if(a.harvested)continue;c.fillStyle=a.down?'#f3c58c':'#d1bb8c';c.fillRect(toX(a.x)-1.7,toY(a.z)-1.7,3.4,3.4);}
  for(const b of BERRIES)if(!g.berryPicked.includes(b.id)){c.fillStyle='#d28d9d';c.fillRect(toX(b.x)-1,toY(b.z)-1,2,2);}
  c.save();c.translate(toX(g.player.x),toY(g.player.z));c.rotate(-yaw);c.fillStyle='#fff3cf';c.beginPath();c.moveTo(0,-5);c.lineTo(3.5,4);c.lineTo(0,2);c.lineTo(-3.5,4);c.closePath();c.fill();c.restore();
 }
 function hud(){
  const p=g.player,night=g.phase==='night',remaining=(night?NIGHT_SECONDS:DAY_SECONDS)-g.elapsed;
  $('day').innerHTML=(night?'NIGHT ':'DAY ')+String(Math.min(100,g.survived+1)).padStart(2,'0')+' <span>/ 100</span>';$('progress').style.width=g.survived+'%';$('phaseName').textContent=night?(g.survived===0?'FIRST NIGHT SAFE':'STAY HIDDEN'):'DAYLIGHT';$('phaseIcon').textContent=night?'☾':'☀';$('phaseBadge').classList.toggle('night',night);$('timer').textContent=clock(remaining);$('diamonds').textContent=g.diamonds;
  $('healthText').textContent=Math.ceil(p.health);$('healthBar').style.width=p.health+'%';$('staminaBar').style.width=p.stamina+'%';$('healthBar').style.background=p.health<40?'#f3a47d':'#c7d798';$('toast').textContent=g.eventTime>0?g.event:'';
  const can=nearestCan(g),hidden=p.hidden>=0,chest=nearChest(g)&&chestCount(g)>0,logs=nearestWood(g),food=nearestFood(g),berries=nearestBerries(g),fire=nearFire(g),tree=g.tool==='axe'&&nearestTree(g);
  $('hideFrame').hidden=!hidden;$('crosshair').hidden=hidden;$('interaction').hidden=!hidden&&!can&&!chest&&!fire&&!logs&&!food&&!berries&&!tree&&!canShop(g);
  $('interaction').querySelector('kbd').textContent=hidden||chest||can||fire||logs||food||berries?'E':tree?'J':'B';$('interaction').querySelector('span').textContent=hidden?'COME OUT OF HIDING':food?'COLLECT FOOD · '+SPECIES[food.kind].food+' RAW':berries?'FORAGE BERRIES · +12 HUNGER':fire?'ADD WOOD TO FIRE · +2:00':logs?'COLLECT '+logs.count+' WOOD':chest?'OPEN GOLDEN CHEST':can?'HIDE IN TRASH CAN':tree?'CHOP TREE · '+tree.hits+' / 3':'RANGER SUPPLY / OPEN';
  $('touchHide').textContent=hidden?'LEAVE':food||berries||logs?'TAKE':fire?'FUEL':chest?'OPEN':'HIDE';$('touchAttack').textContent=g.tool==='axe'?'CHOP':'ATTACK';$('weaponStatus').textContent=weapon(g).name.toUpperCase()+' / '+(hidden?'HIDDEN':g.cooldown>.05?'READY IN '+g.cooldown.toFixed(1)+'s':'READY');
  $('firePanel').classList.toggle('empty',g.fireFuel<=0);$('firePanel').classList.toggle('low',g.fireFuel>0&&g.fireFuel<=45);$('fireTimer').textContent=clock(g.fireFuel);$('fireState').textContent=g.fireFuel<=0?'FIRE OUT · NO CANS':'CAMPFIRE';$('fuelBar').style.width=g.fireFuel/FIRE_MAX*100+'%';$('woodCount').textContent=g.wood;$('axeButton').setAttribute('aria-pressed',g.tool==='axe');$('fireHint').textContent=g.fireFuel<=0?'Add wood at camp to bring the cans back.':'E at fire: 1 wood = +2:00 of protection.';
  $('hungerValue').textContent=Math.ceil(g.hunger);$('hungerBar').style.width=g.hunger+'%';$('foodPanel').classList.toggle('hungry',g.hunger<25);$('rawFood').textContent=g.rawFood;$('mealCount').textContent=g.meals;$('cookButton').textContent=g.cooking>0?'COOKING '+Math.ceil(g.cooking)+'s':'R · COOK';$('cookButton').disabled=!nearFire(g)||g.fireFuel<=0||g.rawFood<1||g.cooking>0;$('eatButton').disabled=g.meals<1||g.hunger>90;
  $('goalList').innerHTML=CAMP_GOALS.map(t=>'<li class="'+(g.taskClaimed.includes(t.id)?'complete':'')+'"><span>'+t.name+'</span><b>'+Math.min(t.target,g.taskCounts[t.id])+'/'+t.target+'</b><small>'+(g.taskClaimed.includes(t.id)?'✓ COMPLETE':'◇ '+t.reward)+'</small></li>').join('');
  const mountain=MOUNTAINS.find(m=>distance(p,m)<m.radius);$('locationLabel').textContent=mountain?mountain.name.toUpperCase()+' · '+Math.round(groundHeight(p.x,p.z))+'m':distance(p,BASE)<12?'BASE CAMP':'PINE HOLLOW FOREST';const degrees=((yaw*180/Math.PI)%360+360)%360;$('bearing').textContent=['N','NW','W','SW','S','SE','E','NE'][Math.round(degrees/45)%8];
  $('hikeHint').hidden=!mountain||g.peaks.includes(mountain.id);$('hikeHint').textContent=mountain?(canHike(g)?'△ '+mountain.name+' SUMMIT · +10 DIAMONDS':g.phase==='night'?'HIKES REOPEN TOMORROW AT 2:00':'HIKE REWARDS OPEN AT 2:00 · '+clock(Math.max(0,HIKE_UNLOCK-g.elapsed))+' TO GO'):'';
  $('chestAlert').hidden=!chestCount(g);$('chestAlertText').textContent=g.pendingRoll?'YOUR GUN PRIZE IS READY':'GOLDEN CHEST AT BASE · '+g.chestReady+' READY';$('chestCount').textContent=chestCount(g);$('rewardChest').hidden=!chestCount(g);
  const warn=g.fireFuel<=0||night&&g.survived===0||!night&&remaining<=30||night&&g.bear.mode==='chase'&&!hidden;$('phaseWarning').hidden=!warn;$('phaseWarning').textContent=g.fireFuel<=0?'FIRE OUT · HIDING CANS GONE · ADD WOOD AT CAMP':night&&g.survived===0?'FIRST NIGHT SAFE · NO BEAR ATTACKS · PRACTICE HUNTING':night?'THE BEAR IS CHASING YOU · FIND A GREEN CAN':'NIGHT IN '+Math.ceil(remaining)+' SECONDS · THE WALLS WILL DISAPPEAR';
  $('shopButton').disabled=!canShop(g);loadout();if(mapVisible)drawMap();
 }
 function play(){
  readLatest();
  if(['won','lost'].includes(g.phase))g=restart(g);
  mode='playing';yaw=g.player.yaw;pitch=g.player.pitch;resetInput();last=performance.now();$('menu').hidden=true;$('overlay').hidden=true;$('hud').hidden=false;follow();hud();save();claimCoins();canvas.focus();
 }
 function result(){
  mode=g.phase;resetInput();releaseMouse();save();claimCoins();$('overlay').hidden=false;$('overlayLabel').textContent=g.phase==='won'?'CENTURY SURVIVOR / EXPEDITION COMPLETE':'EXPEDITION ENDED';$('overlayIcon').textContent=g.phase==='won'?'◇':'△';$('overlayTitle').textContent=g.phase==='won'?'You outlasted the forest.':(g.deathCause==='hunger'?'You ran out of food.':'The bear caught you.');$('overlayText').textContent=g.phase==='won'?'100 full nights. +100 bonus diamonds, on top of your daily rewards. Your next expedition starts with all your gear.':'Hunt for food, cook meals, and keep your campfire burning. All your diamonds and weapons are safe. Your best night stays recorded.';$('resultStats').innerHTML='<div><b>'+g.survived+'</b><span>NIGHTS SURVIVED</span></div><div><b>'+g.diamonds+'</b><span>DIAMONDS</span></div>';$('resume').innerHTML='NEW EXPEDITION <span>↗</span>';tone(g.phase==='won'?'win':'hit');
 }
 function pause(){if(mode!=='playing')return;mode='paused';resetInput();releaseMouse();save();$('overlay').hidden=false;$('overlayLabel').textContent=graphicsLost?'RESTORING GRAPHICS':'EXPEDITION PAUSED';$('overlayIcon').textContent='Ⅱ';$('overlayTitle').textContent='Take a breath.';$('overlayText').textContent=graphicsLost?'The forest is paused while your graphics recover. Your expedition is saved.':'The clock and bear are paused. Your expedition is saved.';$('resultStats').innerHTML='<div><b>'+g.survived+'</b><span>NIGHTS SURVIVED</span></div><div><b>'+g.diamonds+'</b><span>DIAMONDS</span></div>';$('resume').innerHTML='BACK TO THE FOREST <span>↗</span>';$('resume').disabled=graphicsLost;}
 function shopItems(){
  $('shopDiamonds').textContent=g.diamonds;
  $('shopItems').innerHTML=WEAPONS.filter(w=>!w.chestOnly).map(w=>{const owned=g.owned.includes(w.id),selected=g.equipped===w.id;return '<article class="shopItem '+(selected?'equipped':'')+'"><div class="shopArt">'+art(w.id)+'</div><small>'+w.tag+'</small><h3>'+w.name+'</h3><p>'+w.detail+'</p><div class="weaponNumbers"><span>REACH '+w.range+'m</span><span>STUN '+w.stun+'s</span></div><button data-buy="'+w.id+'" '+(selected||!owned&&g.diamonds<w.price?'disabled':'')+'>'+(selected?'EQUIPPED':owned?'EQUIP ↗':'BUY · ◇ '+w.price)+'</button></article>';}).join('');
  $('shopItems').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const result=buyWeapon(g,b.dataset.buy);$('shopStatus').textContent=result.ok?weapon(g).name+' equipped.':result.reason;if(result.ok){tone('buy');save();shopItems();loadout();}});
 }
 function openShop(){
  readLatest();
  if(mode==='shop')return;if(!canShop(g)){if(mode==='playing')notice(g,g.phase==='night'?'Ranger Supply is closed at night. Hide until dawn.':'Visit Ranger Supply at your base to shop.');return;}
  returnMode=mode;mode='shop';resetInput();releaseMouse();save();shopItems();$('shopStatus').textContent='You earn 5 diamonds for each full night survived.';$('shop').showModal();
 }
 function stopRollAnimation(){clearInterval(rollInterval);clearTimeout(rollTimeout);rollInterval=rollTimeout=null;$('chestPrize').classList.remove('rolling');}
 function showChestPrize(reward){
  const w=WEAPONS.find(w=>w.id===reward.id),drop=CHEST_LOOT.find(d=>d.id===reward.id);$('chestPrize').style.setProperty('--rarity',drop.color);$('chestPrize').classList.remove('rolling');$('chestPrizeArt').innerHTML=art(w.id);$('chestRarity').textContent=reward.rarity.toUpperCase();$('chestPrizeName').textContent=w.name;$('chestPrizeText').textContent=reward.duplicate?'Already in your backpack. You received +10 diamonds.':'Yours to keep. This gun is equipped and saved in your backpack.';$('chestRoll').hidden=true;$('chestKeep').hidden=false;$('chestSupply').textContent=g.chestReady+' unopened '+(g.chestReady===1?'chest':'chests')+' remaining';
 }
 function chestView(){
  $('chestOdds').innerHTML=CHEST_LOOT.map(drop=>'<div style="--rarity:'+drop.color+'"><span>'+WEAPONS.find(w=>w.id===drop.id).name+'</span><b>'+drop.chance+'%</b></div>').join('');
  if(g.pendingRoll){showChestPrize(g.pendingRoll);return;}
  $('chestPrize').style.setProperty('--rarity','#edcb76');$('chestRarity').textContent='GOLDEN SUPPLY DROP';$('chestPrizeArt').innerHTML='<span class="chestSymbol">▣</span>';$('chestPrizeName').textContent=g.chestReady?'A gun is waiting.':'Your next drop is coming.';$('chestPrizeText').textContent=g.chestReady?'Open an earned chest for one gun roll. Your diamonds stay yours.':'Survive '+(CHEST_DAYS-g.survived%CHEST_DAYS)+' more '+(CHEST_DAYS-g.survived%CHEST_DAYS===1?'day':'days')+' for another golden chest.';$('chestRoll').hidden=false;$('chestRoll').disabled=!g.chestReady;$('chestKeep').hidden=true;$('chestSupply').textContent=g.chestReady+' unopened '+(g.chestReady===1?'chest':'chests');
 }
 function openChest(){
  if(mode==='chest')return;readLatest();
  if(mode==='playing'&&!nearChest(g)&&!g.pendingRoll){notice(g,chestCount(g)?'Your golden chest is at base. Follow the gold square on your map.':'A golden chest arrives every two survived days.',6);return;}
  chestReturnMode=mode;mode='chest';resetInput();releaseMouse();save();chestView();$('chestDialog').showModal();
 }
 function startChestRoll(){
  if(rollInterval||rollTimeout)return;readLatest();const result=rollChest(g);if(!result.ok){$('chestPrizeText').textContent=result.reason;return;}save();loadout();
  if(result.resumed||matchMedia('(prefers-reduced-motion: reduce)').matches){showChestPrize(result.reward);return;}
  $('chestRoll').disabled=true;$('chestKeep').hidden=true;$('chestPrize').classList.add('rolling');$('chestRarity').textContent='ROLLING…';$('chestPrizeText').textContent='Finding your next ranger gun…';let index=0;
  rollInterval=setInterval(()=>{const drop=CHEST_LOOT[index++%CHEST_LOOT.length],w=WEAPONS.find(w=>w.id===drop.id);$('chestPrizeArt').innerHTML=art(w.id);$('chestPrizeName').textContent=w.name;$('chestPrize').style.setProperty('--rarity',drop.color);},100);
  rollTimeout=setTimeout(()=>{stopRollAnimation();if(g.pendingRoll){showChestPrize(g.pendingRoll);tone('buy');}},2500);
 }
 function hide(){if(mode!=='playing')return;if(g.player.hidden>=0){interact(g);}else if(nearestFood(g)){harvestFood(g);}else if(nearestBerries(g)){forage(g);}else if(nearFire(g)){fuelFire(g);}else if(nearestWood(g)){collectWood(g);}else if(nearChest(g)&&chestCount(g)){openChest();return;}else{interact(g);}tone('hide');save();hud();}
 function axe(){if(mode!=='playing')return;toggleAxe(g);loadout();save();hud();}
 function startScare(){mode='scare';scareTime=0;resetInput();releaseMouse();save();claimCoins();$('hud').hidden=true;$('jumpscare').hidden=false;follow();tone('growl');}
 function finishScare(){$('jumpscare').hidden=true;$('hud').hidden=false;result();}

 function strike(){if(mode==='playing'&&attack(g)){tone('swing');save();hud();}}
 function cook(){if(mode!=='playing')return;cookFood(g);save();hud();}
 function eat(){if(mode!=='playing')return;eatMeal(g);save();hud();}
 function input(dt){
  const turn=(keys.ArrowLeft?1:0)-(keys.ArrowRight?1:0);yaw+=turn*dt*1.9;
  const right=(keys.KeyD?1:0)-(keys.KeyA?1:0)+touch.x,forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-touch.z;
  return {x:right*Math.cos(yaw)-forward*Math.sin(yaw),z:-right*Math.sin(yaw)-forward*Math.cos(yaw),sprint:!!(keys.ShiftLeft||keys.ShiftRight||touch.sprint),jump:queuedJump,yaw,pitch};
 }
 function frame(now){
  requestAnimationFrame(frame);const dt=clamp((now-last)/1000,0,.1);last=now;if(document.hidden||graphicsLost)return;
  if(mode==='playing'){
   const beforeHealth=g.player.health,beforePeaks=g.peaks.length,beforeFuel=g.fireFuel,beforeMeals=g.meals;tick(g,input(dt),dt);queuedJump=false;if(keys.KeyJ)strike();follow();saveTime+=dt;hudTime+=dt;
   if(g.meals!==beforeMeals||g.peaks.length!==beforePeaks||beforeFuel>0&&g.fireFuel<=0){save();tone('buy');hud();}
   if(beforeHealth>g.player.health)tone('hit');
   if(g.phase!==lastPhase){lastPhase=g.phase;if(['night','day'].includes(g.phase))tone(g.phase==='night'?'night':'dawn');save();claimCoins();hud();}
   if(g.eventId!==lastEventId){lastEventId=g.eventId;if(g.bear.mode==='chase'&&g.player.hidden<0)tone('growl');}
   if(saveTime>5){saveTime=0;save();claimCoins();}if(hudTime>.1){hudTime=0;hud();}
   if(g.phase==='lost'){if(g.deathCause==='hunger')result();else startScare();}else if(g.phase==='won')result();
  }else if(mode==='scare'){scareTime+=dt;if(scareTime>(reducedMotion?.75:1.35))finishScare();}else if(mode==='menu')menuCamera();
  world.update(g,now/1000,{flashlight,menu:mode==='menu',scare:mode==='scare'?scareTime:null,reducedMotion});if(cover){world.bear.position.set(0,0,-2.5);world.bear.rotation.y=.2;}
  $('hitFlash').style.opacity=mode==='playing'&&g.player.invulnerable>1.3?Math.min(.17,(g.player.invulnerable-1.3)*.35):0;
  renderer.render(scene,camera);
 }
 $('cookButton').onclick=cook;$('eatButton').onclick=eat;$('huntButton').onclick=()=>{if(mode==='playing'){equip(g,'hunting-rifle');loadout();save();hud();}};
 $('axeButton').onclick=axe;$('skipScare').onclick=finishScare;$('jumpscare').onclick=()=>{if(mode==='scare')finishScare();};
 $('start').onclick=play;$('pause').onclick=pause;$('resume').onclick=()=>{if(graphicsLost)return;if(mode==='paused'){readLatest();if(['won','lost'].includes(g.phase)){result();return;}mode='playing';resetInput();last=performance.now();$('overlay').hidden=true;canvas.focus();}else play();};
 $('backMenu').onclick=()=>{mode='menu';resetInput();releaseMouse();save();refreshMenu();$('overlay').hidden=true;$('hud').hidden=true;$('menu').hidden=false;menuCamera();};
 $('menuShop').onclick=$('shopButton').onclick=openShop;$('closeShop').onclick=()=>$('shop').close();$('shop').addEventListener('close',()=>{mode=returnMode;last=performance.now();resetInput();save();refreshMenu();if(mode==='playing'){follow();hud();canvas.focus();}});
 $('menuChest').onclick=$('chestAlert').onclick=$('rewardChest').onclick=openChest;$('chestRoll').onclick=startChestRoll;$('closeChest').onclick=()=>$('chestDialog').close();$('chestKeep').onclick=()=>{keepChestPrize(g);save();loadout();if(g.chestReady)chestView();else $('chestDialog').close();};
 $('chestDialog').addEventListener('close',()=>{stopRollAnimation();mode=chestReturnMode;last=performance.now();resetInput();save();refreshMenu();$('rewardChest').hidden=!chestCount(g);if(mode==='playing'){follow();hud();canvas.focus();}});
 function help(){helpMode=mode;if(mode==='playing')pause();mode='help';releaseMouse();$('help').showModal();}
 $('helpMenu').onclick=help;$('closeHelp').onclick=$('gotIt').onclick=()=>$('help').close();$('help').addEventListener('close',()=>{mode=helpMode==='playing'?'paused':helpMode;last=performance.now();});
 $('sound').onclick=()=>{sound=!sound;soundUI();tone('hide');try{localStorage.setItem('archerbox-bearwatch-sound',sound?'on':'off');}catch{}};
 function toggleMap(){mapVisible=!mapVisible;$('mapPanel').classList.toggle('collapsed',!mapVisible);$('minimap').hidden=!mapVisible;$('mapPanel').querySelector('small').hidden=!mapVisible;}
 $('mapButton').onclick=toggleMap;
 window.addEventListener('keydown',e=>{
  if(e.code==='Escape'){if(mode==='scare'){finishScare();return;}if($('shop').open||$('help').open||$('chestDialog').open)return;if(mode==='playing')pause();else if(mode==='paused')$('resume').click();return;}
  if(mode!=='playing')return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.repeat)return;
  if(e.code==='Space')queuedJump=true;if(e.code==='KeyX')axe();if(e.code==='KeyR')cook();if(e.code==='KeyV')eat();if(e.code==='KeyH'){equip(g,'hunting-rifle');loadout();save();}if(e.code==='KeyE')hide();if(e.code==='KeyB')openShop();if(e.code==='KeyC')openChest();if(e.code==='KeyF')flashlight=!flashlight;if(e.code==='KeyM')toggleMap();if(/^Digit[0-9]$/.test(e.code)){equip(g,WEAPONS[(+e.code.at(-1)+9)%10].id);loadout();save();}
 });window.addEventListener('keyup',e=>keys[e.code]=false);
 canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=e=>{if(mode!=='playing')return;canvas.focus();canvas.setPointerCapture(e.pointerId);look={id:e.pointerId,x:e.clientX,y:e.clientY,moved:0,button:e.button};};
 canvas.onpointermove=e=>{if(mode!=='playing'||look?.id!==e.pointerId||document.pointerLockElement===canvas)return;const dx=e.clientX-look.x,dy=e.clientY-look.y;look.moved+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.0045;pitch=clamp(pitch-dy*.0036,-1.15,1.15);look.x=e.clientX;look.y=e.clientY;};
 canvas.onpointerup=e=>{if(look?.id===e.pointerId&&look.moved<7&&look.button===0)strike();look=null;};canvas.onpointercancel=()=>look=null;
 canvas.ondblclick=()=>{if(mode==='playing')try{canvas.requestPointerLock?.()?.catch?.(()=>{});}catch{}};
 document.addEventListener('mousemove',e=>{if(mode==='playing'&&document.pointerLockElement===canvas){yaw-=e.movementX*.003;pitch=clamp(pitch-e.movementY*.003,-1.15,1.15);}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();graphicsLost=true;pause();});canvas.addEventListener('webglcontextrestored',()=>{graphicsLost=false;last=performance.now();$('resume').disabled=false;if(mode==='paused'){$('overlayLabel').textContent='GRAPHICS RESTORED';$('overlayText').textContent='Your expedition is ready. Continue when you are.';}});
 const stick=$('stick');function moveStick(e){const b=stick.getBoundingClientRect(),x=(e.clientX-b.left-b.width/2)/34,z=(e.clientY-b.top-b.height/2)/34,n=Math.max(1,Math.hypot(x,z));touch.x=x/n;touch.z=z/n;stick.firstElementChild.style.transform='translate('+touch.x*25+'px,'+touch.z*25+'px)';}
 stick.onpointerdown=e=>{e.preventDefault();stick.setPointerCapture(e.pointerId);moveStick(e);};stick.onpointermove=e=>{if(stick.hasPointerCapture(e.pointerId))moveStick(e);};stick.onpointerup=stick.onpointercancel=()=>{touch.x=touch.z=0;stick.firstElementChild.style.transform='';};
 $('touchSprint').onclick=()=>{touch.sprint=!touch.sprint;$('touchSprint').setAttribute('aria-pressed',touch.sprint);};$('touchHide').onclick=hide;$('touchAttack').onclick=strike;$('touchJump').onclick=()=>queuedJump=true;
 window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',()=>{if(mode==='playing')save();});
 window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;if(mode==='menu')menuCamera();else follow();});
 refreshMenu();soundUI();menuCamera();loadout();claimCoins();requestAnimationFrame(frame);
}
try{boot();}catch(error){console.error(error);$('error').hidden=false;$('error').textContent='The forest could not load. Try a browser with 3D graphics enabled. Your saved expedition has not been deleted.';}
