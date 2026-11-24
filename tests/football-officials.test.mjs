import assert from 'node:assert/strict';
import test from 'node:test';
import {makeOfficials} from '../public/games/touchdown-rush/officials.js';
import {createGame,endPlay,practicePlaceKicks,snap} from '../public/games/touchdown-rush/rules.js';

test('seven officials cover the field and follow the world direction without changing the match',()=>{
 const game=createGame(),{group,update}=makeOfficials();
 assert.equal(group.children.length,7);
 const [referee,umpire,downJudge,lineJudge,sideJudge,fieldJudge,backJudge]=group.children;
 const before=JSON.stringify(game);
 update(game,0,0,{reset:true});
 assert(referee.position.z>game.line&&umpire.position.z>game.line);
 assert(downJudge.position.x<-26.7&&lineJudge.position.x>26.7);
 assert(sideJudge.position.z<game.line&&fieldJudge.position.z<game.line&&backJudge.position.z<sideJudge.position.z);
 assert.equal(JSON.stringify(game),before);
 game.offense=0;game.viewDirection=1;
 update(game,0,0,{reset:true});
 assert(referee.position.z<game.line&&backJudge.position.z>game.line,'remapped guest teams preserve the direction of the field');
 snap(game,'run');game.actors[game.carrier].z=game.line+14;
 const oldZ=lineJudge.position.z;
 for(let frame=1;frame<=45;frame++)update(game,frame/60,1/60);
 assert(lineJudge.position.z>oldZ,'line judge runs down the sideline to cover the play');
});

test('officials under both uprights raise their arms for a good kick and wave off a miss',()=>{
 const game=createGame(),{group,update}=makeOfficials();
 assert(practicePlaceKicks(game));
 update(game,0,0,{reset:true});
 const judges=group.children.slice(5);
 assert(judges[0].position.x>0&&judges[1].position.x<0);
 assert(judges.every(judge=>Math.abs(game.placeKick.goalZ-judge.position.z)<2));
 game.phase='dead';game.ball={finished:true};game.event='FIELD GOAL GOOD!';
 update(game,1,0);
 update(game,1.5,0);
 assert(judges.every(judge=>judge.userData.arms.every(arm=>arm.rotation.x>2.9)));
 game.event='NO GOOD · WIDE LEFT';
 update(game,2,0);
 update(game,2.4,0);
 assert(judges.every(judge=>judge.userData.arms.every(arm=>Math.abs(arm.rotation.z)>1)));
});

test('officials can turn toward the goal on a first down and leave the spotlight clear',()=>{
 const game=createGame(),{group,update}=makeOfficials();
 update(game,0,0,{reset:true});
 assert(snap(game,'run'));
 game.actors[game.carrier].z=game.goal-1;
 endPlay(game,'tackle');
 assert.equal(game.event,'FIRST DOWN!');
 update(game,.1,.1);
 update(game,.6,.1);
 assert(group.children[0].userData.arms.every(arm=>arm.rotation.x>1.4));
 update(game,1,.1,{visible:false});
 assert.equal(group.visible,false);
});
