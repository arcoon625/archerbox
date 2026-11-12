import assert from 'node:assert/strict';
import {ISLANDS,FRUITS,freshGame,restoreGame,snapshot,acceptQuest,claimQuest,travel,buyFruit,usePower,step,fruitDamage,moveDescription,attack,maxHP} from '../public/games/fruit-seas/rules.js';
function levelUp(g,n){g.quest=null;while(g.level<n){g.island='starter';acceptQuest(g);g.quest.count=5;claimQuest(g);}g.pendingCoins=[];}
function arena(fruit=null,points=0){const g=freshGame();g.x=-72;g.z=26;g.fruit=fruit;g.stats.fruit=points;for(const e of g.enemies){e.hp=0;e.respawn=1000;}const e=g.enemies[1];Object.assign(e,{hp:1e6,maxHp:1e6,x:-72,z:24,homeX:-72,homeZ:24,state:'windup',timer:1000});return {g,e};}
assert.equal(Object.keys(ISLANDS).length,5);assert.equal(FRUITS.length,6);assert.deepEqual(Object.values(ISLANDS).map(i=>i.level),[1,10,20,35,50]);assert.deepEqual(Object.values(ISLANDS).map(i=>i.questMoney),[300,700,1400,2600,4500]);
{
 const g=freshGame();for(const [id,i] of Object.entries(ISLANDS)){assert.equal(g.enemies.filter(e=>e.island===id).length,6);assert(g.enemies.filter(e=>e.island===id).every(e=>e.name===i.enemy&&e.type===i.type));if(i.level>1){levelUp(g,i.level-1);assert(!travel(g,id),'one level below the island is still locked');levelUp(g,i.level);assert(travel(g,id));}else g.island=id;
 g.stats.strength=0;g.x=i.x;g.z=i.z;assert(acceptQuest(g));const before=g.money;for(const e of g.enemies.filter(e=>e.island===id).slice(0,5)){e.x=g.x;e.z=g.z-1;e.hp=18;g.attack=0;assert(attack(g));}assert.equal(g.quest.count,5);assert.equal(g.money,before+5*i.bounty);assert(claimQuest(g));assert.equal(g.money,before+5*i.bounty+i.questMoney);assert(!claimQuest(g),'harder quests still pay only once');}
}
{
 const g=freshGame('legacy');levelUp(g,10);travel(g,'town');g.money=9000;g.fruits=['slow','glacier'];g.fruit='glacier';g.quest={island:'town',count:3};const old=snapshot(g);old.version=1;old.enemies=old.enemies.slice(0,12);delete old.areas;delete old.enemyShots;const r=restoreGame(old);assert.equal(r.island,'town');assert.equal(r.quest.count,3);assert.equal(r.money,9000);assert.deepEqual(r.fruits,['slow','glacier']);assert.equal(r.enemies.length,30,'old saves gain new islands and enemies');assert.equal(r.fruit,'glacier');assert.deepEqual(r.areas,[]);assert.deepEqual(r.enemyShots,[]);
 assert(!buyFruit(r,'ember'),'level-20 fruit cannot be bought at level 10');levelUp(r,50);travel(r,'town');r.money=100000;for(const f of FRUITS)if(!r.fruits.includes(f.id))assert(buyFruit(r,f.id));assert.equal(r.fruits.length,6);const saved=restoreGame(snapshot(r));assert.equal(saved.fruits.length,6);assert.equal(saved.money,r.money);
}
for(const [fruit,baseTotals,ticks] of [['slow',[8,0],[1,0]],['glacier',[50,50],[1,5]],['ember',[40,65],[1,1]],['sand',[35,60],[1,5]],['storm',[70,90],[1,3]],['gravity',[100,40],[1,5]]]){
 for(let i=0;i<2;i++){if(fruit==='slow'&&i===1)continue;const low=arena(fruit),high=arena(fruit,10);assert(usePower(low.g,i));assert(usePower(high.g,i));step(low.g,{},5.3);step(high.g,{},5.3);assert.equal(1e6-low.e.hp,baseTotals[i],fruit+' '+i+' has its advertised base damage');assert.equal(1e6-high.e.hp,baseTotals[i]+ticks[i]*20,fruit+' '+i+' adds two damage per Fruit point on each hit/tick');}
}
{
 const {g,e}=arena('glacier',5);usePower(g,1);step(g,{},.15);assert.equal(e.frostDamage,20);g.stats.fruit=20;step(g,{},5.1);assert.equal(e.hp,1e6-100,'ongoing casts retain their launch damage');assert.equal(fruitDamage(g,50),90);assert(moveDescription(g,FRUITS.find(f=>f.id==='glacier'),0).includes('90 damage'));
}
{
 const {g,e}=arena('gravity');const other=g.enemies[2];Object.assign(other,{hp:500,maxHp:500,x:e.x+4,z:e.z,homeX:e.x+4,homeZ:e.z,state:'windup',timer:1000});usePower(g,1);const initial=other.x;step(g,{},.5);assert(other.x<initial-1,'gravity actually pulls nearby enemies');
 const before=other.hp;step(g,{},.6);assert(other.hp<before,'well deals damage as well as moving enemies');
}
{
 const {g}=arena('slow');g.enemyShots=[{kind:'lead',x:g.x-4,z:g.z,vx:8,vz:0,life:3,damage:16}];assert(usePower(g,1));const shot=structuredClone(g.enemyShots[0]);step(g,{},9.9);assert.deepEqual(g.enemyShots[0],shot,'Time Stop freezes enemy shots too');step(g,{},.7);assert(g.hp<maxHP(g),'enemy shot resumes after time unfreezes');
}
function enemyArena(id){const g=freshGame();levelUp(g,ISLANDS[id].level);travel(g,id);g.x=ISLANDS[id].x;g.z=ISLANDS[id].z;for(const e of g.enemies){e.hp=0;e.respawn=1000;}const e=g.enemies.find(e=>e.island===id);Object.assign(e,{hp:e.maxHp,x:g.x,z:g.z-6,homeX:g.x,homeZ:g.z-6,state:'chase'});return {g,e};}
{
 const {g,e}=enemyArena('marine');step(g,{},1.05);assert(g.enemyShots.some(p=>p.kind==='lead'),'marines fire real ranged projectiles');assert.equal(e.casts,1);const hp=g.hp;step(g,{x:1},.6);assert.equal(g.hp,hp,'moving sideways dodges the marine shot');
}
for(const id of ['ember','storm']){
 const {g,e}=enemyArena(id);e.casts=1;step(g,{},.05);assert.equal(e.state,'windup');const hp=g.hp;assert.equal(e.aimX,g.x);step(g,{x:1},1.1);assert.equal(g.hp,hp,'leaving '+id+' ground warning dodges the fruit attack');
 const still=enemyArena(id);still.e.casts=1;const before=still.g.hp;step(still.g,{},1.1);assert.equal(still.g.hp,before-ISLANDS[id].damage-6,'standing in the warning is dangerous');
}
{
 const g=freshGame();levelUp(g,50);travel(g,'storm');g.stats.fruit=20;g.fruits=['gravity'];g.fruit='gravity';g.x=58;g.z=-72;usePower(g,1);step(g,{},.2);const r=restoreGame(snapshot(g));assert.equal(r.island,'storm');assert.equal(r.areas[0].kind,'gravity');assert.equal(r.areas[0].damage,48);assert.deepEqual(restoreGame(snapshot(r)),r,'new effects and endgame saves restore stably');
}
console.log('Fruit Seas expansion passed: all five quest tiers, level gates, old saves, six fruits, damage scaling on all 11 damaging moves, gravity pulls, marine shots, fruit-fighter warnings, and frozen enemy projectiles.');
