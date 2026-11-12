import assert from 'node:assert/strict';
import {CELEBRATIONS,CELEBRATION_DURATION,celebrationById,celebrationPose} from '../public/games/touchdown-rush/celebrations.js';
import {createGame,snap,step,strikePlaceKick} from '../public/games/touchdown-rush/rules.js';
assert.equal(CELEBRATIONS.length,5);
assert.equal(new Set(CELEBRATIONS.map(c=>c.id)).size,5);
assert.equal(celebrationById('bad saved preference').id,'spike');
const numbers=value=>typeof value==='number'?[value]:typeof value==='object'?Object.values(value).flatMap(numbers):[];
for(const c of CELEBRATIONS){
 for(let t=0;t<=CELEBRATION_DURATION;t+=1/120){const p=celebrationPose(c.id,t);assert(numbers(p).every(Number.isFinite),c.name+' has finite animation transforms');assert(p.ball.y>=.2,'the ball stays above the turf');assert.equal(p.arms.length,2);assert.equal(p.legs.length,2);}
 const landed=celebrationPose(c.id,CELEBRATION_DURATION);
 for(const k of ['x','y','z','rx','ry','rz'])assert.equal(Math.abs(landed[k]),0,c.name+' returns to a neutral player pose');
}
assert.equal(new Set(CELEBRATIONS.map(c=>JSON.stringify(celebrationPose(c.id,1.5)))).size,5,'all five moves are different');
assert(celebrationPose('spike',.65).ball.y>1.8,'spike raises the ball overhead');
assert(celebrationPose('spike',1.03).ball.y<.3,'spike reaches the turf');
assert(celebrationPose('backflip',1.5).y>3,'backflip clears the turf');
assert(celebrationPose('backflip',1.5).rx>3,'backflip actually rotates the player');
// Animation sampling never advances or modifies the simulation, including a winning TD.
for(const team of [0,1])for(const winning of [false,true]){
 const g=createGame('rookie');if(team===1){g.offense=1;const {lineup}=await import('../public/games/touchdown-rush/rules.js');lineup(g)}
 if(winning)g.scores[team]=14;snap(g,'run');g.actors[g.carrier].z=team===0?-51:51;step(g,{},1/120);
 assert.equal(g.scores[team],winning?20:6);assert.equal(g.ended,false,'the try follows the touchdown celebration');
 const snapshot=JSON.stringify(g);for(const c of CELEBRATIONS)for(let t=0;t<6;t+=.1)celebrationPose(c.id,t);assert.equal(JSON.stringify(g),snapshot);
 for(let t=0;t<2.6;t+=1/120)step(g,{},1/120);assert.equal(g.phase,'placekick-aim');strikePlaceKick(g,0,.8);for(let t=0;t<8&&g.phase==='placekick-flight';t+=1/120)step(g,{},1/120);assert.equal(g.ended,winning);assert.equal(g.scores[team],winning?21:7);
 if(!winning){for(let t=0;t<2.6;t+=1/120)step(g,{},1/120);assert.equal(g.phase,'kick');assert.equal(g.ball.kind,'kickoff');for(let t=0;t<3.2;t+=1/120)step(g,{},1/120);assert.equal(g.offense,1-team);assert.equal(g.returnPlay.kind,'kickoff');}
}
console.log('Five celebrations passed: finite full animations, ball spike, airborne flip, neutral endings, both scoring teams and winning touchdowns.');
