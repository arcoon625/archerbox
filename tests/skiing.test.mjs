import assert from 'node:assert/strict';
import {TRAILS,createRace,tick,sample,rampLift,order,recover} from '../public/games/alpine-rush/rules.js';
const run=(g,input,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)tick(g,input,1/60);};
function racing(){const g=createRace();run(g,{},3.1);assert.equal(g.phase,'racing');return g;}
assert.equal(TRAILS.length,3);
for(let i=0;i<3;i++){
 const g=createRace(i,2,'easy','Archer');assert.equal(g.racers.length,6);assert.equal(g.racers[0].name,'Archer');assert.equal(g.racers[0].outfit,2);assert(g.racers.slice(1).every(r=>r.name&&r.id>0));
 let last=sample(g.course,0).p;for(let s=10;s<g.course.config.length;s+=10){const a=sample(g.course,s);assert(a.p.y<last.y);assert(Math.abs(Math.hypot(a.t.x,a.t.y,a.t.z)-1)<1e-8);assert(a.right.x>0);last=a.p;}
 run(g,{tuck:true},130);assert.equal(g.phase,'finished');assert(g.racers[0].finished);assert(Number.isFinite(g.racers[0].time));assert(g.racers[0].time>20&&g.racers[0].time<100);assert(g.place>=1&&g.place<=6);assert(g.racers.slice(1).every(r=>r.s>100));const final=JSON.stringify(g);tick(g,{steer:1},.05);assert.equal(JSON.stringify(g),final,'a finished race stays final');
}
const coast=racing(),tuck=racing(),brake=racing();run(coast,{},5);run(tuck,{tuck:true},5);run(brake,{brake:true},5);assert(tuck.racers[0].s>coast.racers[0].s);assert(coast.racers[0].s>brake.racers[0].s);
const steer=racing();run(steer,{steer:1},3);assert(steer.racers[0].lane>0);run(steer,{steer:1},10);assert(steer.racers[0].lane<=steer.course.config.width/2);recover(steer);assert.equal(steer.racers[0].lane,0);
const gate=racing(),r=gate.racers[0],a=gate.course.gates[0];r.s=a.s-.1;r.lane=a.lane;r.speed=22;tick(gate,{},.05);assert.equal(r.gates,1);assert(r.boost>0);tick(gate,{},.05);assert.equal(r.gates,1,'a gate scores once');
const miss=racing();miss.racers[0].s=a.s-.1;miss.racers[0].lane=8;miss.racers[0].speed=22;tick(miss,{},.05);assert.equal(miss.racers[0].gates,0);assert.equal(miss.phase,'racing','missing a gate does not end the game');
const jump=racing();tick(jump,{jump:true,spin:1},.05);assert(jump.racers[0].height>0);run(jump,{jump:true,spin:1},1);assert.equal(jump.racers[0].height,0);assert(jump.racers[0].tricks>=150);run(jump,{jump:true},.1);assert.equal(jump.racers[0].height,0,'holding jump does not auto-repeat');tick(jump,{},.05);tick(jump,{jump:true},.05);assert(jump.racers[0].height>0);
const ramp=racing(),ramp0=ramp.course.ramps[0];assert(rampLift(ramp.course,ramp0.s-2,ramp0.lane)>.5);ramp.racers[0].s=ramp0.s-.1;ramp.racers[0].lane=ramp0.lane;ramp.racers[0].speed=25;tick(ramp,{},.05);assert(ramp.racers[0].height>ramp0.height);assert(ramp.racers[0].vy>5);
const bump=racing(),rock=bump.course.rocks[0];Object.assign(bump.racers[0],{s:rock.s-.1,lane:rock.lane,speed:25});tick(bump,{},.05);assert.equal(bump.racers[0].crashes,1);assert(bump.racers[0].speed<15);assert(bump.racers[0].bump>0);
const easy=racing(),pro=createRace(0,0,'pro');run(pro,{},3.1);run(easy,{},10);run(pro,{},10);assert(pro.racers[1].s>easy.racers[1].s,'Pro CPUs are faster');
const ranked=order([{id:0,s:100,finished:false},{id:1,s:1000,finished:true,time:40},{id:2,s:1000,finished:true,time:38}]);assert.deepEqual(ranked.map(r=>r.id),[2,1,0]);
console.log('Skiing passed: all three trails finish, real CPU progress, slopes and course frames, tuck/brake/steer/recovery, gate hit/miss, jump edge input, airborne spins and landing, ramp lift, rock bumps, difficulty, stable finish and standings.');
