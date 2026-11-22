import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLACES,START,canWalk,firstPersonVector,nearPlace,routeTo,turnToward,walk} from '../public/games/fast-food-passport/town.js';
import {restore,status,placeOrder,eatOrder,payJob,replay,complete,jobChoices,checkChoice,timingHit} from '../public/games/fast-food-passport/rules.js';

test('eye-view movement follows the camera and turns the shortest way toward a stop',()=>{
 const south=firstPersonVector(0,0,1),right=firstPersonVector(0,1,0);
 assert.equal(south.y,1);
 assert.equal(right.x,-1);
 const west=firstPersonVector(-Math.PI/2,0,1);
 assert(west.x<-.999&&Math.abs(west.y)<1e-8);
 const position={...START};
 walk(position,west.x,west.y,.2);
 assert(position.x<START.x);
 assert(Math.abs(position.y-START.y)<1e-8);
 const heading=turnToward(Math.PI-.1,-Math.PI+.1,.15);
 assert(heading>Math.PI&&heading<Math.PI+.1);
});

test('every restaurant has a walkable route from the plaza and all other doors',()=>{
 assert.equal(PLACES.length,8);
 for(const from of [START,{x:45,y:49},{x:1027,y:619},...PLACES.map(place=>place.door)]){
  for(const place of PLACES){
   const position={...from};
   const route=routeTo(position,place.door);
   assert(route.length,place.name+' has a route');
   for(const goal of route){
    let budget=80;
    while(Math.hypot(goal.x-position.x,goal.y-position.y)>=4&&budget-->0){
     const x=goal.x-position.x,y=goal.y-position.y;
     walk(position,x,y,Math.min(1/60,Math.hypot(x,y)/270),270);
    }
    assert(budget>0,place.name+' route is unobstructed');
    if(canWalk(goal.x,goal.y))Object.assign(position,goal);
   }
   assert.equal(nearPlace(position),place);
  }
 }
 const {bounds}=PLACES[0];
 assert(!canWalk(bounds.x+bounds.w/2,bounds.y+bounds.h/2));
});

test('order prices, wages, stamps, resume, completion, and replay apply once per visit',()=>{
 let profile=restore(null,'tour-one');
 assert.equal(profile.tour.cash,12);
 assert(!eatOrder(profile,PLACES[0].id));
 assert(!replay(profile,'tour-two'));
 let paid=0,spent=0;
 for(const place of PLACES){
  const {id}=place;
  assert(payJob(profile,id));
  assert(!payJob(profile,id));
  paid+=place.pay;
  assert(placeOrder(profile,id));
  assert(!placeOrder(profile,id));
  spent+=place.price;
  assert.equal(status(profile.tour,id),'ready');
  profile=restore(JSON.parse(JSON.stringify(profile)),'unsaved');
  assert.equal(profile.tour.id,'tour-one');
  assert(eatOrder(profile,id));
  assert.equal(status(profile.tour,id),'stamped');
  assert(!eatOrder(profile,id));
 }
 assert.equal(profile.tour.cash,12+paid-spent);
 assert.equal(profile.completed,1);
 assert(complete(profile.tour));
 assert.deepEqual(profile.pending,['tour-one']);
 assert(replay(profile,'tour-two'));
 assert.equal(profile.tour.cash,12);
 assert.equal(profile.tour.stamps.length,0);
 assert.equal(profile.completed,1);
 assert.deepEqual(profile.pending,['tour-one']);
 const short=restore(null,'short');
 short.tour.cash=1;
 assert(!placeOrder(short,'stack'));
 assert(payJob(short,'stack'));
 assert(placeOrder(short,'stack'));
});

test('every counter job has a correct solution and permits a retry',()=>{
 assert.deepEqual(new Set(PLACES.map(place=>place.job.type)),new Set(['stack','timing','match']));
 for(const {job} of PLACES){
  if(job.type==='timing'){
   assert(!timingHit(job,0));
   assert(timingHit(job,(job.zone[0]+job.zone[1])*600));
  }else if(job.type==='match'){
   assert(checkChoice(job,0,job.answer));
   assert(!checkChoice(job,0,(job.answer+1)%job.choices.length));
  }else{
   const choices=jobChoices(job);
   for(const [step,name] of job.steps.entries()){
    assert(checkChoice(job,step,choices.indexOf(name)));
    assert(!checkChoice(job,step,choices.indexOf(job.extra)));
   }
  }
 }
});
