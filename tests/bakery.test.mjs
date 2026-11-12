import assert from 'node:assert/strict';
import {RECIPES,INGREDIENTS,TOPPINGS,DAYS,createGame,order,selectIngredient,mix,bake,takeOut,decorate,serve,nextOrder,freshBatch,tick,windowSize} from '../public/games/bakery-rush/rules.js';
const wait=(g,seconds)=>{for(let t=0;t<seconds-.0001;t+=.05)tick(g,.05);};
const prepare=g=>{for(const id of order(g).recipe.ingredients)selectIngredient(g,id);for(let n=0;n<6;n++)mix(g);assert.equal(g.phase,'ready');bake(g);};
const seen=new Set();
for(const mode of ['cozy','rush'])for(let day=0;day<DAYS.length;day++){
 const g=createGame(mode,day);
 for(let n=0;n<5;n++){
  const o=order(g);seen.add(o.recipe.id);prepare(g);wait(g,o.recipe.bake+.4);assert.equal(g.phase,'baking');assert(takeOut(g));assert.equal(g.quality,1);assert.equal(g.phase,'decorate');decorate(g,o.topping.id);assert(serve(g));assert.equal(g.phase,'served');const money=g.coins;assert.equal(serve(g),false);assert.equal(g.coins,money,'repeated serving cannot duplicate coins');nextOrder(g);
 }
 assert.equal(g.phase,'complete');assert.equal(g.totalServed,5);assert.equal(g.perfect,5);assert(g.coins>=100);assert.equal(g.missed,0);const frozen=JSON.stringify(g);wait(g,5);assert.equal(JSON.stringify(g),frozen,'completed days stop the timers');assert.equal(nextOrder(g),false);
}
assert.equal(RECIPES.length,12);assert.equal(INGREDIENTS.length,17);assert.equal(DAYS.length,6);assert.equal(seen.size,RECIPES.length,'all recipes appear in customer orders');
assert.equal(createGame('cozy',99).day,5);assert.equal(createGame('cozy',-1).day,0);
assert.equal(new Set(RECIPES.map(r=>r.id)).size,RECIPES.length);
for(const id of ['doughnuts','apple-pie','lemon-bars','banana-bread','pretzels','eclairs'])assert(seen.has(id));
for(const r of RECIPES){assert.equal(r.ingredients.length,new Set(r.ingredients).size);assert(r.ingredients.every(id=>INGREDIENTS.some(i=>i.id===id)));assert(r.toppings.every(id=>TOPPINGS.some(t=>t.id===id)));}
const wrong=createGame();selectIngredient(wrong,'milk');assert.equal(mix(wrong),false);assert.equal(wrong.phase,'ingredients');assert(wrong.notice.includes('Remove Milk'));assert(wrong.notice.includes('Add Flour'));assert.equal(bake(wrong),false);assert.equal(serve(wrong),false);selectIngredient(wrong,'milk');assert.equal(wrong.selected.length,0);assert.equal(selectIngredient(wrong,'invalid'),false);
const early=createGame();prepare(early);wait(early,2);assert.equal(takeOut(early),false);assert.equal(early.phase,'undercooked');assert.equal(decorate(early,'sugar'),false);bake(early);wait(early,order(early).recipe.bake-1);takeOut(early);assert.equal(early.phase,'decorate');assert.equal(early.quality,1);decorate(early,'vanilla');assert.equal(serve(early),false);assert.equal(early.totalServed,0);assert(early.notice.includes('chocolate drizzle'));decorate(early,'chocolate');serve(early);assert.equal(early.totalServed,1);assert.equal(early.perfect,0,'fixed mistakes remain valid orders without a perfect bonus');
const crispy=createGame();prepare(crispy);wait(crispy,order(crispy).recipe.bake+windowSize(crispy)+.5);takeOut(crispy);assert.equal(crispy.phase,'decorate');assert.equal(crispy.quality,.65);
const burnt=createGame();prepare(burnt);wait(burnt,20);assert.equal(burnt.phase,'burnt');assert.equal(serve(burnt),false);assert(freshBatch(burnt));assert.equal(burnt.phase,'ingredients');assert.equal(burnt.bakeTime,0);assert.equal(burnt.selected.length,0);assert.equal(burnt.orderIndex,0);assert(burnt.mistakes>0);
const cozy=createGame();wait(cozy,150);assert.equal(cozy.phase,'ingredients');assert.equal(cozy.patience,100,'cozy customers always wait');
const rush=createGame('rush');wait(rush,40);const before=rush.patience;freshBatch(rush);assert.equal(rush.patience,before,'fresh batches do not reset customer patience');wait(rush,70);assert.equal(rush.phase,'missed');assert.equal(rush.missed,1);const elapsed=rush.elapsed;wait(rush,10);assert.equal(rush.elapsed,elapsed);nextOrder(rush);assert.equal(rush.orderIndex,1);assert.equal(rush.patience,100);
console.log('Bakery Rush: all 60 orders across six days in both modes, every recipe, coins, perfect bonuses, mistake recovery, early/over/burned bakes, correct toppings, cozy patience, rush timeouts, and frozen results passed.');
