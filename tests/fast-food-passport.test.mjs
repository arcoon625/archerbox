import assert from 'node:assert/strict';
import {test} from 'node:test';
import {INGREDIENTS,RESTAURANTS,HEAT,pantry} from '../public/games/fast-food-passport/menus.js';
import {TICKETS,restore,emptyProfile,newShift,customer,ticket,takeOrder,togglePart,startCooking,stopCooking,setPacked,serve,nextCustomer} from '../public/games/fast-food-passport/rules.js';
import {START,LIMITS,STATIONS,nearStation,move,relative,turnToward} from '../public/games/fast-food-passport/space.js';

test('all ten kitchens can prepare, cook, and serve every order in a complete shift',()=>{
 assert.deepEqual(RESTAURANTS.map(site=>site.id),['mcd','taco','subway','chick','chipotle','wendys','king','dominos','popeyes','in-n-out']);
 for(const restaurant of RESTAURANTS){
  let profile=emptyProfile();
  let shift=profile.shifts[restaurant.id]=newShift(restaurant.id,'perfect-'+restaurant.id);
  assert.equal(restaurant.menu.length,3);
  assert.equal(new Set(restaurant.menu.map(meal=>meal.name)).size,3);
  const guests=new Set(),seen=new Set();
  for(let index=0;index<TICKETS.length;index++){
   assert.equal(shift.index,index);
   guests.add(customer(shift).name);
   assert(!serve(shift,1000),'take the ticket before serving');
   assert(takeOrder(shift,1000));
   assert(!takeOrder(shift,1000),'avoid taking the same ticket twice');
   for(const [slot,meal] of ticket(shift).entries()){
    seen.add(meal.name);
    assert(!setPacked(shift,slot,true));
    for(const part of meal.parts){
     assert(INGREDIENTS[part]);
     assert(togglePart(shift,slot,part));
    }
    if(meal.heat){
     const {from,to}=HEAT[meal.heat];
     assert(!setPacked(shift,slot,true),'cook the hot food before packing');
     assert(startCooking(shift,slot,1500));
     assert(stopCooking(shift,slot,1500+(from+to)*500));
    }
    assert(setPacked(shift,slot,true));
    assert(!togglePart(shift,slot,meal.parts[0]),'packed dishes must be unpacked before editing');
   }
   profile=restore(JSON.parse(JSON.stringify(profile)));
   shift=profile.shifts[restaurant.id];
   assert(serve(shift,10000));
   assert.equal(shift.feedback.stars,5);
   assert.equal(shift.feedback.tip,4);
   assert(!serve(shift,11000),'a replayed serve must not pay again');
   assert(nextCustomer(profile,shift));
  }
  assert.equal(guests.size,TICKETS.length);
  assert.equal(seen.size,3);
  assert.equal(shift.phase,'finished');
  assert.equal(shift.ordersPerfect,6);
  assert.equal(shift.tips,24);
  assert.deepEqual(profile.pending,[shift.id]);
  assert.equal(profile.completed,1);
  assert(!nextCustomer(profile,shift));
 }
});

test('feedback identifies wrong ingredients, cooking mistakes, and missing items',()=>{
 const shift=newShift('mcd','practice');
 takeOrder(shift,1000);
 assert(pantry(RESTAURANTS[0]).includes('tomato'));
 assert(!togglePart(shift,0,'unknown-ingredient'));
 togglePart(shift,0,'double');
 togglePart(shift,0,'tomato');
 startCooking(shift,0,2000);
 assert(!togglePart(shift,0,'salt'),'ingredients cannot change while cooking');
 stopCooking(shift,0,2300);
 assert.equal(shift.dishes[0].heat,'early');
 startCooking(shift,0,4000);
 stopCooking(shift,0,11000);
 assert.equal(shift.dishes[0].heat,'burnt');
 assert(!serve(shift,12000),'pack the order first');
 setPacked(shift,0,true);
 serve(shift,12000);
 assert.equal(shift.feedback.stars,1);
 assert.equal(shift.feedback.tip,0);
 assert.match(shift.feedback.items[0].problems.join(', '),/Missing sesame bun/);
 assert.match(shift.feedback.items[0].problems.join(', '),/Didn’t order tomato/);
 assert(shift.feedback.items[0].problems.includes('Cooked too long'));
});

test('each station can be reached at eye level with camera-relative walking',()=>{
 assert.equal(relative(0,0,1).z,1);
 assert.equal(relative(0,1,0).x,-1);
 for(const station of STATIONS){
  const pos={...START};
  for(let frame=0;!nearStation(pos)&&frame<120;frame++)move(pos,station.x-pos.x,station.z-pos.z,1/60,4.9);
  assert.equal(nearStation(pos)?.id,station.id);
 }
 const pos={...START};
 move(pos,0,1,10);
 assert.equal(pos.z,LIMITS.front);
 assert(turnToward(Math.PI-.1,-Math.PI+.1,.2)>Math.PI);
});

test('a cook in progress and an outgoing review survive reload',()=>{
 let profile=emptyProfile();
 let shift=profile.shifts.dominos=newShift('dominos','oven-save');
 takeOrder(shift,1000);
 for(const part of ticket(shift)[0].parts)togglePart(shift,0,part);
 startCooking(shift,0,3000);
 profile=restore(JSON.parse(JSON.stringify(profile)));
 shift=profile.shifts.dominos;
 assert.equal(shift.dishes[0].cookAt,3000);
 stopCooking(shift,0,6100);
 setPacked(shift,0,true);
 serve(shift,9000);
 const restored=restore(JSON.parse(JSON.stringify(profile)));
 assert.deepEqual(restored.shifts.dominos.feedback,shift.feedback);
});
