import assert from 'node:assert/strict';
import {Box3} from '../public/vendor/three.module.js';
import {MOUNTAINS,CHEST_LOOT,WEAPONS,CANS,SHOP,groundHeight,freshGame,restoreGame,restart,tick,hikeReward,rollChest,keepChestPrize,chestCount,buyWeapon} from '../public/games/bearwatch/rules.js';
import {makeMountain,makeWeapon,dispose} from '../public/games/bearwatch/scene.js';

assert.equal(groundHeight(0,15),0,'the existing camp stays flat');
for(const m of MOUNTAINS){
 const g=freshGame();g.elapsed=120;g.player.x=m.x;g.player.z=m.z+m.radius-.05;let previous=groundHeight(g.player.x,g.player.z),steps=0;
 while(!g.peaks.includes(m.id)&&steps++<200){tick(g,{z:-1},1/30);const h=groundHeight(g.player.x,g.player.z);assert(h>=previous-1e-6,'the uphill approach has a continuous slope');previous=h;}
 assert(g.peaks.includes(m.id),m.name+' can actually be hiked by walking');assert.equal(g.diamonds,10);assert(groundHeight(g.player.x,g.player.z)>m.height-.4);
 assert.equal(hikeReward(g),null);tick(g,{},3);assert.equal(g.diamonds,10,'staying at the summit cannot farm diamonds');
 g.player.z=m.z+m.radius;tick(g,{z:-1},2);assert.equal(g.diamonds,10,'returning to an already claimed peak does not pay twice');
 const restored=restoreGame(JSON.parse(JSON.stringify(g)));assert(restored.peaks.includes(m.id));assert.equal(restored.diamonds,10);
 const reset=restart(g);assert.deepEqual(reset.peaks,[]);assert.equal(reset.diamonds,10,'new expeditions retain earned diamonds');
 const model=makeMountain(m);model.updateMatrixWorld(true);const bounds=new Box3().setFromObject(model);assert(Math.abs(bounds.max.y-m.height-.012)<.01,'rendered summit agrees with the physics height');dispose(model);
}
const hidden=freshGame();Object.assign(hidden.player,{x:MOUNTAINS[0].x,z:MOUNTAINS[0].z,hidden:0});assert.equal(hikeReward(hidden),null,'hiding cannot claim a summit remotely');
const campaign=freshGame();campaign.player.hidden=0;campaign.player.x=CANS[0].x;campaign.player.z=CANS[0].z;
for(let day=1;day<=100;day++){campaign.fireFuel=480;campaign.hunger=100;tick(campaign,{},240);assert.equal(campaign.chestReady,Math.floor((day-1)/2),'no chest appears before the full second survival');tick(campaign,{},120);assert.equal(campaign.chestReady,Math.floor(day/2));if(day%2===0&&day<100)assert(campaign.event.includes('GOLDEN CHEST ARRIVED'));}
assert.equal(campaign.chestReady,50);assert.equal(restart(campaign).chestReady,50,'unopened rewards survive a new expedition');
const legacy={...freshGame(),survived:10,best:10};delete legacy.chestReady;delete legacy.chestsOpened;delete legacy.peaks;delete legacy.pendingRoll;assert.equal(restoreGame(legacy).chestReady,5,'existing saved expeditions receive their earned two-day drops');
assert.equal(CHEST_LOOT.reduce((n,x)=>n+x.chance,0),100);
for(const [sample,id] of [[0,'trail-pistol'],[.3499,'trail-pistol'],[.35,'carbine'],[.6499,'carbine'],[.65,'tranquilizer'],[.8499,'tranquilizer'],[.85,'flare'],[.9499,'flare'],[.95,'gold-rifle'],[.999999,'gold-rifle']]){
 const g=freshGame({diamonds:7});g.chestReady=1;const result=rollChest(g,()=>sample);assert(result.ok);assert.equal(result.reward.id,id);assert(g.owned.includes(id));assert.equal(g.equipped,id);assert.equal(g.diamonds,7,'new prizes never spend diamonds');assert.equal(g.chestReady,0);assert.equal(chestCount(g),1,'a prize waiting to be revealed stays visible');
 const restored=restoreGame(JSON.parse(JSON.stringify(g))),before=JSON.stringify(restored);assert(rollChest(restored,()=>.999).resumed);assert.equal(JSON.stringify(restored),before,'refreshing resumes the same prize without rerolling or granting it again');assert(keepChestPrize(restored));assert.equal(chestCount(restored),0);assert(!rollChest(restored).ok);
}
const duplicate=freshGame();duplicate.chestReady=2;rollChest(duplicate,()=>0);keepChestPrize(duplicate);const prize=rollChest(duplicate,()=>0);assert(prize.reward.duplicate);assert.equal(prize.reward.diamonds,10);assert.equal(duplicate.diamonds,10);assert.equal(duplicate.owned.filter(id=>id==='trail-pistol').length,1);assert.equal(duplicate.chestReady,0);assert.equal(duplicate.chestsOpened,2);
rollChest(duplicate,()=>.99);assert.equal(duplicate.diamonds,10,'double-clicks and reopen attempts do not duplicate compensation');
assert.equal(restart(duplicate).pendingRoll.id,'trail-pistol','closing or restarting cannot lose an already rolled prize');
for(const id of ['trail-pistol','carbine','gold-rifle']){const g=freshGame({diamonds:10000});Object.assign(g.player,{x:SHOP.x-3,z:SHOP.z-1});assert(!buyWeapon(g,id).ok);assert(!g.owned.includes(id));const m=makeWeapon(id);assert(m.children.length>=5);dispose(m);}
const corrupt=restoreGame({...freshGame(),chestReady:-9,peaks:['fake','pinecrest','pinecrest'],pendingRoll:{id:'not-a-gun'},chestsOpened:Infinity});assert.equal(corrupt.chestReady,0);assert.deepEqual(corrupt.peaks,['pinecrest']);assert.equal(corrupt.pendingRoll,null);
console.log('Bearwatch expeditions passed: all three real uphill routes and matching terrain, daily summit diamonds, 50 two-day chest drops, old-save migration, every weighted roll boundary, permanent usable guns, duplicate compensation, no paid rolls, interrupted reveal recovery, and death/restart persistence.');
