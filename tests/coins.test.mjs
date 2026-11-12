import assert from 'node:assert/strict';
import {REWARDS,PRICES,priceOf,restoreWallet,award,purchase,canWear} from '../public/economy/rules.js';
import {readWallet,transactWallet,createCoinRun,WALLET_KEY} from '../public/economy/wallet.js';
import {ALL_ITEMS,CATEGORIES,DEFAULT_LOOK} from '../public/avatar/catalog.js';
import {GAMES} from '../public/catalog.js';
import * as football from '../public/games/touchdown-rush/rules.js';
import * as bakery from '../public/games/bakery-rush/rules.js';
import * as vault from '../public/games/creature-vault/rules.js';
import fs from 'node:fs';
function memoryStorage(){const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}}
function serialLocks(){let queue=Promise.resolve();return {request(key,fn){const work=queue.then(fn);queue=work.catch(()=>{});return work}}}
function tracker(game,storage=memoryStorage(),room=null){let serial=0;const options={storage,locks:serialLocks(),notify:()=>{}};const write=data=>transactWallet(wallet=>award(wallet,data),options);return {run:createCoinRun(game,{room,write,newId:()=>`test-${++serial}`}),storage,write,options}}
assert.deepEqual([...new Set(REWARDS.map(r=>r.game))].sort(),GAMES.map(g=>g.id).sort());
assert.equal(Object.keys(PRICES).length,24);assert.equal(ALL_ITEMS.filter(i=>!priceOf(i.id)).length,276);
for(const [id,price] of Object.entries(PRICES)){assert(ALL_ITEMS.some(i=>i.id===id));assert([3,5,8,12].includes(price));}
for(const c of CATEGORIES){assert.equal(ALL_ITEMS.filter(i=>i.category===c.id&&priceOf(i.id)).length,4);assert(!priceOf(DEFAULT_LOOK[c.id]));}
assert.equal(priceOf('toString'),0);assert.equal(priceOf('__proto__'),0);
{
 const wallet=restoreWallet(null);for(const row of REWARDS){const event={game:row.game,event:row.event,run:'round-1',progress:1};assert.equal(award(wallet,event).amount,1);assert.equal(award(wallet,event).amount,0);}
 assert.equal(wallet.balance,REWARDS.length);assert.deepEqual(restoreWallet(JSON.parse(JSON.stringify(wallet))),wallet);
 const before=structuredClone(wallet);for(const value of [NaN,Infinity,-1,0,1.5,'2',Number.MAX_SAFE_INTEGER+1])assert(!award(wallet,{game:'touchdown-rush',event:'touchdown',run:'bad',progress:value}).ok);
 assert(!award(wallet,{game:'fake',event:'finish',run:'bad',progress:1}).ok);assert.deepEqual(wallet,before);
 assert.equal(award(wallet,{game:'touchdown-rush',event:'touchdown',run:'round-1',progress:4}).amount,3);
 assert.equal(award(wallet,{game:'touchdown-rush',event:'touchdown',run:'round-1',progress:2}).amount,0);
}
{
 const wallet=restoreWallet(null);const before=structuredClone(wallet);assert.equal(purchase(wallet,'head-29').reason,'insufficient');assert.deepEqual(wallet,before);assert(!purchase(wallet,'not-real').ok);assert(!purchase(wallet,'head-01').ok);
 award(wallet,{game:'touchdown-rush',event:'touchdown',run:'game',progress:3});assert(purchase(wallet,'head-29').ok);assert.equal(wallet.balance,0);assert.equal(wallet.spent,3);assert.equal(wallet.earned,3);assert(canWear(wallet,'head-29'));assert.equal(purchase(wallet,'head-29').amount,0);assert.equal(wallet.balance,0);assert(!canWear(wallet,'head-33'));assert(canWear(wallet,'head-01'));
 assert.equal(restoreWallet({version:1,balance:-4}).balance,0);assert.equal(restoreWallet({version:1,balance:100,earned:4,spent:0}).balance,0);
}
{
 const legacy={look:{head:'head-33'},outfits:[{look:{pet:'pet-47',face:'face-20'}}]};const wallet=restoreWallet(null,legacy);assert.deepEqual(wallet.owned.sort(),['face-20','head-33','pet-47']);assert.equal(wallet.balance,0);assert(!canWear(wallet,'head-29'));
 assert(!canWear(restoreWallet(wallet,{look:{head:'head-29'}}),'head-29'),'migration is once, so editing an outfit cannot unlock future purchases');
}
{
 const t=tracker('touchdown-rush');t.run.begin();const g=football.createGame('rookie');football.snap(g,'run');g.actors[g.carrier].z=-51;football.step(g,{},.01);assert.equal(g.stats.touchdowns,1);await t.run.counter('touchdown',g.stats.touchdowns);await t.run.counter('touchdown',g.stats.touchdowns);assert.equal(readWallet(t.storage).balance,1);
 const cpu=football.createGame('rookie');cpu.offense=1;cpu.line=-30;football.lineup(cpu);football.snap(cpu,'run');cpu.actors[cpu.carrier].z=51;football.step(cpu,{},.01);assert.equal(cpu.scores[1],6);assert.equal(cpu.stats.touchdowns,0);await t.run.counter('touchdown',cpu.stats.touchdowns);assert.equal(readWallet(t.storage).balance,1,'opponent touchdowns pay nothing');
}
{
 const t=tracker('bakery-rush');t.run.begin();const g=bakery.createGame();assert(!bakery.serve(g));await t.run.counter('serve',g.totalServed);assert.equal(readWallet(t.storage).balance,0);
 const order=bakery.order(g);for(const id of order.recipe.ingredients)bakery.selectIngredient(g,id);for(let i=0;i<6;i++)bakery.mix(g);bakery.bake(g);for(let time=0;time<order.recipe.bake+1;time+=.1)bakery.tick(g,.1);bakery.takeOut(g);assert(!bakery.serve(g),'wrong topping is not a completed order');bakery.decorate(g,order.topping.id);assert(bakery.serve(g));await t.run.counter('serve',g.totalServed);assert(g.coins>1);assert.equal(readWallet(t.storage).balance,1,'bakery sales points do not become Archerbox coins');assert(!bakery.serve(g));
}
{
 const t=tracker('creature-vault'),g=vault.freshCollection();vault.openPack(g,'starforge',()=>.5);const discoveries=g.pending.cards.filter(p=>p.isNew);await Promise.all(discoveries.map(p=>t.run.unique('discovery',p.id)));assert.equal(readWallet(t.storage).balance,new Set(discoveries.map(p=>p.id)).size);
 const balance=readWallet(t.storage).balance;t.run.begin();await Promise.all(discoveries.map(p=>t.run.unique('discovery',p.id)));assert.equal(readWallet(t.storage).balance,balance,'discovery reward persists across sessions');
}
{
 const t=tracker('turbo-kart-racing',memoryStorage(),'friends-room');await t.run.once('finish');await t.run.once('finish');t.run.begin();await t.run.once('finish');const again=tracker('turbo-kart-racing',t.storage,'friends-room');await again.run.once('finish');assert.equal(readWallet(t.storage).balance,1,'reconnecting to a finished friend race cannot award twice');
 const offline=tracker('turbo-kart-racing',t.storage);assert.equal(offline.run.once('finish'),undefined,'menu and demo do not award');offline.run.begin();await offline.run.once('finish');offline.run.begin();await offline.run.once('finish');assert.equal(readWallet(t.storage).balance,3,'new offline races earn again');
}
{
 const storage=memoryStorage(),options={storage,locks:serialLocks(),notify:()=>{}};await transactWallet(w=>award(w,{game:'neon-clash',event:'elimination',run:'match',progress:5}),options);
 const results=await Promise.all([transactWallet(w=>purchase(w,'head-29'),options),transactWallet(w=>purchase(w,'shirt-07'),options)]);assert.equal(results.filter(r=>r.ok).length,1);assert.equal(readWallet(storage).balance,2,'simultaneous purchases cannot overspend');
 const original=storage.getItem(WALLET_KEY);const broken={getItem:storage.getItem,setItem(){throw Error('quota')}};assert.equal((await transactWallet(w=>purchase(w,'head-29'),{...options,storage:broken})).reason,'storage');assert.equal(storage.getItem(WALLET_KEY),original);
 const noRead={getItem(){throw Error('blocked')},setItem(){assert.fail('must not write after an unreadable balance')}};assert.equal((await transactWallet(w=>purchase(w,'head-29'),{...options,storage:noRead})).reason,'storage');
 const noticeError=await transactWallet(w=>award(w,{game:'color-rush',event:'round',run:'notice-test',progress:1}),{...options,notify(){throw Error('UI unavailable')}});assert(noticeError.ok,'a notification error cannot reverse a saved transaction');
 const lots=await Promise.all(Array.from({length:30},(_,i)=>transactWallet(w=>award(w,{game:'baseball-blast',event:'home-run',run:'game-'+i,progress:1}),options)));assert(lots.every(r=>r.ok));assert.equal(readWallet(storage).balance,33,'concurrent game rewards are not lost');
}
// Catch missing entry-point wiring or syntax in any of the 21 shipped games.
for(const g of GAMES){const source=fs.readFileSync(new URL('../public/games/'+g.id+'/game.js',import.meta.url),'utf8');assert(source.includes(`createCoinRun('${g.id}')`));assert(source.includes('coinRun.counter(')||source.includes('coinRun.once(')||source.includes('coinRun.unique('));}
console.log('Coins passed: all 21 games, real touchdown and bakery outcomes, discovery deduplication, replay protection, purchases, legacy outfits, storage failure and concurrent wallet updates.');
