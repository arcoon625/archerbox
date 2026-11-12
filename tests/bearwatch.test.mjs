import assert from 'node:assert/strict';
import {DAY_SECONDS,NIGHT_SECONDS,DAILY_DIAMONDS,CENTURY_DIAMONDS,CANS,SHOP,WEAPONS,freshGame,restoreGame,restart,tick,interact,canShop,buyWeapon,equip,attack,wallsUp,distance} from '../public/games/bearwatch/rules.js';
import {makeBear,animateBear,makeWeapon,dispose} from '../public/games/bearwatch/scene.js';
import {Box3} from '../public/vendor/three.module.js';
import {restoreWallet,award} from '../public/economy/rules.js';

assert.equal(DAY_SECONDS,240);assert.equal(NIGHT_SECONDS,120);assert.equal(DAILY_DIAMONDS,5);
const g=freshGame({runId:'test-expedition'});g.fireFuel=480;assert(wallsUp(g));
Object.assign(g.player,{x:CANS[0].x+1.5,z:CANS[0].z});assert(interact(g));assert.equal(g.player.hidden,0);
tick(g,{},239.9);assert.equal(g.phase,'day');assert.equal(g.diamonds,0,'partial daylight does not earn a reward');
tick(g,{},.1);assert.equal(g.phase,'night');assert(!wallsUp(g));assert.equal(g.diamonds,0,'nightfall does not earn the reward yet');
tick(g,{x:1,z:1,jump:true},119.9);assert.equal(g.phase,'night');assert.equal(g.player.health,100,'a can is safe for the full hunt');assert.equal(g.player.x,CANS[0].x,'hidden player cannot move');
tick(g,{},.1);assert.equal(g.phase,'day');assert(wallsUp(g));assert.equal(g.survived,1);assert.equal(g.diamonds,5);assert.equal(g.coinTickets.length,1);
assert(interact(g));assert.equal(g.player.hidden,-1);assert(distance(g.player,CANS[0])>=1.4,'exiting places the player outside the solid can');
Object.assign(g.player,{x:SHOP.x-3,z:SHOP.z-1});assert(canShop(g));
assert.equal(buyWeapon(g,'crossbow').ok,false);assert.equal(g.diamonds,5,'insufficient purchases cannot spend diamonds');assert(buyWeapon(g,'bat').ok);assert.equal(g.diamonds,0);assert(g.owned.includes('bat'));assert.equal(g.equipped,'bat');assert(buyWeapon(g,'bat').owned,'owned weapons equip for free');assert(!equip(g,'flare'));
g.phase='night';assert(!canShop(g));assert.equal(buyWeapon(g,'stick').ok,false,'shop is closed all night');
g.player.x=0;g.player.z=0;g.player.yaw=0;g.player.pitch=-.18;g.bear.x=0;g.bear.z=-2;g.bear.retreat=0;g.bear.stun=0;g.cooldown=0;
assert(attack(g));assert(g.bear.health<100);assert(g.bear.stun>0);const health=g.bear.health;assert(!attack(g));assert.equal(g.bear.health,health,'cooldown blocks repeated hits');
g.cooldown=0;g.player.yaw=Math.PI;assert(attack(g));assert.equal(g.bear.health,health,'looking away misses');
for(const w of WEAPONS){const a=freshGame({diamonds:1000,owned:WEAPONS.map(w=>w.id)});a.phase='night';a.survived=1;equip(a,w.id);Object.assign(a.player,{x:0,z:0,yaw:0,pitch:-.15});Object.assign(a.bear,{x:0,z:-2,retreat:0});assert(attack(a));assert(a.bear.stun>=w.stun-.01,w.name+' really stuns');}
const caught=freshGame();caught.phase='night';caught.survived=1;caught.player.x=caught.player.z=0;caught.bear.x=0;caught.bear.z=-1.5;tick(caught,{},5);assert.equal(caught.phase,'lost');assert.equal(caught.player.health,0);const frozen=JSON.stringify(caught);tick(caught,{x:1},100);assert.equal(JSON.stringify(caught),frozen,'a lost run freezes');
const daytime=freshGame();daytime.bear.x=daytime.player.x;daytime.bear.z=daytime.player.z;tick(daytime,{},20);assert.equal(daytime.player.health,100,'bear cannot hurt the player during daylight');
const wallDay=freshGame();Object.assign(wallDay.player,{x:7,z:8});tick(wallDay,{x:1},.7);assert(wallDay.player.x<7.5,'daytime base walls have solid collision');
const wallNight=freshGame();wallNight.phase='night';wallNight.bear.stun=10;Object.assign(wallNight.player,{x:7,z:8});tick(wallNight,{x:1},.7);assert(wallNight.player.x>8.5,'the same wall truly disappears at night, including collision');
for(const can of CANS){const a=freshGame();Object.assign(a.player,{x:can.x+1.5,z:can.z});assert(interact(a),'every can is reachable for interaction');assert.equal(a.player.hidden,can.id);assert(interact(a),'every can has an exit');}
const saved=restoreGame(JSON.parse(JSON.stringify(g)));assert.equal(saved.diamonds,g.diamonds);assert(saved.owned.includes('bat'));assert.equal(saved.survived,1);assert.equal(saved.elapsed,g.elapsed);assert.equal(saved.runId,g.runId);
const corrupt=restoreGame({version:1,diamonds:-100,phase:'anything',owned:['fake'],player:{x:Infinity,z:NaN,health:999,hidden:999}});assert.equal(corrupt.diamonds,0);assert.deepEqual(corrupt.owned,['stick','hunting-rifle']);assert(Number.isFinite(corrupt.player.x));assert.equal(corrupt.player.health,100);
const long=freshGame({runId:'century-test'});Object.assign(long.player,{x:CANS[0].x+1.5,z:CANS[0].z});interact(long);
for(let n=0;n<100;n++){long.fireFuel=480;long.hunger=100;tick(long,{},DAY_SECONDS);assert.equal(long.phase,'night');tick(long,{},NIGHT_SECONDS);assert.equal(long.survived,n+1);assert.equal(long.phase,n===99?'won':'day');}
assert.equal(long.diamonds,100*5+CENTURY_DIAMONDS);assert.equal(long.wins,1);assert.equal(new Set(long.coinTickets).size,100);
const wallet=restoreWallet(null);for(const ticket of long.coinTickets){const input={game:'bearwatch',event:'survive',run:'discovery:'+ticket,progress:1};assert.equal(award(wallet,input).amount,1);assert.equal(award(wallet,input).amount,0);}assert.equal(wallet.balance,100,'one real Archerbox coin per survived night; reloading cannot claim twice');
tick(long,{},360);assert.equal(long.diamonds,600,'the championship reward is once');
const again=restart(long);assert.equal(again.survived,0);assert.equal(again.diamonds,600);assert.equal(again.best,100);assert.equal(again.wins,1);assert.notEqual(again.runId,long.runId);assert.equal(restoreGame(long).phase,'won');
const bear=makeBear();assert.equal(bear.userData.legs.length,4,'the bear has four articulated legs');for(const mode of ['chase','prowl','stunned','search'])animateBear(bear,{x:0,z:0,yaw:.5,walk:4,mode},3);bear.updateMatrixWorld(true);const bounds=new Box3().setFromObject(bear);assert(bounds.max.y>2&&bounds.min.y>-.3);dispose(bear);
for(const w of WEAPONS){const model=makeWeapon(w.id);assert(model.children.length>1);dispose(model);}
console.log('Bearwatch passed: exact 4/2-minute phases, vanished walls, every hiding can and exit, invulnerability while hidden, bear attacks, all weapons, shop restrictions, saved progress, 100 full nights, diamonds and duplicate-proof coins, and four-legged animated bear.');
