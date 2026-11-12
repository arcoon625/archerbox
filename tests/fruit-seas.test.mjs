import assert from 'node:assert/strict';
import {freshGame,restoreGame,snapshot,step,acceptQuest,claimQuest,spendStat,maxHP,buyWeapon,equipWeapon,buyFruit,eatFruit,travel,usePower,attack,WEAPONS,FRUITS,SAVE_KEY,nearestPlace} from '../public/games/fruit-seas/rules.js';
import {award,restoreWallet} from '../public/economy/rules.js';
const arena=()=>{const g=freshGame('test-voyage');g.x=-72;g.z=26;for(const e of g.enemies){e.x=e.homeX;e.z=e.homeZ;e.hp=0;e.respawn=1000;}Object.assign(g.enemies[1],{x:-72,z:24,homeX:-72,homeZ:24,hp:500,maxHp:500,respawn:0});return g;};
const enemy=g=>g.enemies[1];
assert.equal(SAVE_KEY,'archerbox-fruit-seas-v2');assert.deepEqual(WEAPONS.map(w=>[w.id,w.price]),[['cutlass',0],['slingshot',400],['flintlock',1000],['sniper',5000]]);
{
 const g=freshGame();assert.equal(g.level,1);assert.equal(g.island,'starter');assert(g.owned.includes('cutlass'));assert.equal(g.money,0);assert.equal(g.enemies.filter(e=>e.island==='starter'&&e.hp>0).length,6);assert(!travel(g,'town'));assert(!claimQuest(g));assert(acceptQuest(g));assert(!acceptQuest(g));
 g.x=-72;g.z=26;for(let n=0;n<5;n++){const e=g.enemies[n];Object.assign(e,{x:g.x,z:g.z-1,hp:18});g.attack=0;assert(attack(g));assert.equal(g.quest.count,n+1);}
 assert.equal(g.money,100);assert.equal(g.level,1,'kills alone do not claim quests');assert(claimQuest(g));assert.equal(g.level,2);assert.equal(g.money,400);assert.equal(g.points,3);assert.equal(g.completed,1);assert(!claimQuest(g));assert.equal(g.money,400,'quest can only be paid once');assert.equal(g.pendingCoins.length,1);
 assert(!spendStat(g,'__proto__'));assert(spendStat(g,'defense'));assert.equal(maxHP(g),110);assert.equal(g.hp,110);assert(spendStat(g,'strength'));assert(spendStat(g,'gun'));assert(!spendStat(g,'fruit'));assert.equal(g.points,0);
 const wallet=restoreWallet(null),ticket=g.pendingCoins[0];assert.equal(award(wallet,{game:'fruit-seas',event:'quest',run:'discovery:'+ticket,progress:1}).amount,1);assert.equal(award(wallet,{game:'fruit-seas',event:'quest',run:'discovery:'+ticket,progress:1}).amount,0);
}
{
 const g=freshGame();for(let i=0;i<9;i++){assert(acceptQuest(g));g.quest.count=5;assert(claimQuest(g));}assert.equal(g.level,10);assert.equal(g.points,27);assert.equal(g.money,2700);assert(travel(g,'town'));assert.equal(g.island,'town');assert(nearestPlace(g));assert(!buyWeapon(g,'sniper'));assert(buyWeapon(g,'slingshot'));assert.equal(g.money,2300);assert(!buyWeapon(g,'slingshot'));assert(buyWeapon(g,'flintlock'));assert.equal(g.money,1300);assert.equal(g.weapon,'flintlock');assert(!equipWeapon(g,'sniper'));assert(buyFruit(g,'slow'));assert.equal(g.money,700);assert.equal(g.fruit,null);assert(eatFruit(g,'slow'));assert(!eatFruit(g,'glacier'));assert(!buyFruit(g,'slow'));g.money=10000;assert(buyFruit(g,'glacier'));assert(eatFruit(g,'glacier'));assert.equal(g.fruit,'glacier');assert(eatFruit(g,'slow'),'owned fruits can be re-eaten without buying again');assert(travel(g,'starter'));assert(!buyWeapon(g,'sniper'),'weapons can only be bought on the town island');
}
{
 const g=arena();g.fruits=['slow'];g.fruit='slow';assert(usePower(g,0));step(g,{},.3);assert(enemy(g).slow>5.5);const moved=enemy(g).z;step(g,{},.5);assert(enemy(g).z-moved<.5,'slowed opponent moves at 30 percent speed');assert(!usePower(g,0),'power has a cooldown');
}
{
 const g=arena();g.fruits=['slow'];g.fruit='slow';Object.assign(enemy(g),{state:'windup',timer:.7,slow:6,frost:5,frostTick:1});g.enemies[0].respawn=9;const initial={x:enemy(g).x,z:enemy(g).z,hp:enemy(g).hp,playerHP:g.hp};assert(usePower(g,1));assert.equal(g.freeze,10);step(g,{x:1},9.9);assert(Math.abs(g.freeze-.1)<1e-7);assert.equal(enemy(g).x,initial.x);assert.equal(enemy(g).z,initial.z);assert.equal(enemy(g).hp,initial.hp);assert.equal(enemy(g).timer,.7);assert.equal(enemy(g).slow,6);assert.equal(enemy(g).frost,5);assert.equal(g.enemies[0].respawn,9,'respawn clocks stay frozen');assert(g.x>-60,'player moves during Time Stop');assert(g.hp>=initial.playerHP);step(g,{},.1);assert(g.freeze<1e-7);step(g,{},.2);assert(enemy(g).frost<5,'enemy clocks resume after ten active seconds');assert(!usePower(g,1));
}
{
 const g=arena();g.fruits=['glacier'];g.fruit='glacier';enemy(g).state='windup';enemy(g).timer=100;assert(usePower(g,0));const before=enemy(g).hp;step(g,{},.89);assert.equal(enemy(g).hp,before);assert(g.icebergs.length);step(g,{},.02);assert.equal(enemy(g).hp,before-50);step(g,{},1);assert.equal(enemy(g).hp,before-50,'iceberg hits once');assert.equal(g.icebergs.length,0);
}
{
 const a=arena();a.fruits=['glacier'];a.fruit='glacier';enemy(a).timer=100;enemy(a).state='windup';assert(usePower(a,1));assert.equal(enemy(a).frost,0,'frost waits for projectile contact');step(a,{},.1);assert(enemy(a).frost>4.9);const hp=enemy(a).hp;step(a,{},.9);assert.equal(enemy(a).hp,hp);const b=restoreGame(snapshot(a)); // Restore normalizes a test enemy's hp to its real maximum.
 for(let i=0;i<42;i++)step(a,{},.1);assert.equal(enemy(a).hp,hp-50,'five ticks of ten damage');step(a,{},3);assert.equal(enemy(a).hp,hp-50,'no sixth tick');assert(enemy(b).frost>0,'in-flight effects survive saves');
 const c=arena();c.fruit='glacier';usePower(c,1);step(c,{},5.2);assert.equal(enemy(c).hp,450,'large and small frame steps produce the same five ticks');
}
{
 const g=arena();g.fruit='slow';g.fruits=['slow'];g.stats.fruit=10;assert(usePower(g,1));assert.equal(g.freeze,10,'mastery never lengthens Time Stop');assert.equal(g.cooldowns[1],24,'mastery reduces cooldowns');g.cooldowns=[0,0];g.fruit='glacier';g.stats.fruit=100;usePower(g,0);assert.equal(g.cooldowns[0],4.5,'cooldown bonus caps at 50 percent');
}
{
 const g=freshGame('saved-voyage');for(let i=0;i<9;i++){acceptQuest(g);g.quest.count=5;claimQuest(g);}travel(g,'town');g.money=6000;buyWeapon(g,'sniper');buyFruit(g,'slow');eatFruit(g,'slow');usePower(g,1);step(g,{},2);const r=restoreGame(snapshot(g));assert.equal(r.level,10);assert.equal(r.island,'town');assert.equal(r.money,400);assert.equal(r.weapon,'sniper');assert.equal(r.fruit,'slow');assert(Math.abs(r.freeze-8)<1e-7);assert.equal(r.pendingCoins.length,9);assert.equal(r.points,27);assert.equal(r.enemies.filter(e=>e.hp>0).length,30);assert.deepEqual(restoreGame(snapshot(r)),r,'save normalization is stable');
 const bad=restoreGame({version:1,completed:-3,level:99,money:Infinity,x:1e50,z:NaN,points:99,stats:{strength:999},owned:['fake'],fruit:'fake',island:'town',quest:{island:'fake'},projectiles:[{kind:'bad'}],pendingCoins:['fake']});assert.equal(bad.level,1);assert.equal(bad.points,0);assert.equal(bad.money,0);assert.equal(bad.island,'starter');assert.equal(bad.quest,null);assert.deepEqual(bad.owned,['cutlass']);assert.equal(bad.fruit,null);assert.deepEqual(bad.projectiles,[]);assert(Number.isFinite(bad.x));assert.doesNotThrow(()=>restoreGame({version:1,owned:{},fruits:{},enemies:[null],projectiles:[null],icebergs:[null]}));
}
{
 const g=arena();const hp=g.hp;step(g,{},.6);assert.equal(g.hp,hp,'bandits telegraph attacks before contact');step(g,{},1);assert(g.hp<hp,'bandits can hit');g.hp=1;g.hurt=0;enemy(g).state='windup';enemy(g).timer=.01;enemy(g).x=g.x;enemy(g).z=g.z-1;g.money=77;g.quest={island:'starter',count:3};step(g,{},.05);assert.equal(g.x,-72);assert.equal(g.z,49);assert.equal(g.money,77);assert.equal(g.quest.count,3);assert.equal(g.hp,maxHP(g),'defeated players respawn without losing progress');
}
console.log('Fruit Seas passed: five-bandit quests, level-10 gate, exact shop prices, all stats, saves, coin deduplication, telegraphed combat, 10-second Time Stop, 50-damage Iceberg and five Frostbite ticks.');
