import assert from 'node:assert/strict';
import {Box3,Vector3,Matrix4} from '../public/vendor/three.module.js';
import {makeStadiumBowl,updateStadiumBowl} from '../public/games/touchdown-rush/stadium.js';
import {STADIUMS,dispose} from '../public/games/touchdown-rush/scene.js';
import {createGame} from '../public/games/touchdown-rush/rules.js';
import {scoreboardState} from '../public/games/touchdown-rush/scoreboard.js';
import {FIELD} from '../public/games/touchdown-rush/field.js';
import {TEAMS} from '../public/games/touchdown-rush/teams.js';
import {teamLogoUrl} from '../public/games/touchdown-rush/team-branding.js';
import {makeRoom,readyPlayer,publicRoom} from '../server/matches.js';
import fs from 'node:fs';

const teams=[{name:'Cowboys',color:0x003594},{name:'Chiefs',color:0xe31837}];
for(const [i,cfg] of STADIUMS.entries()){
 const homeIndex=i%2,bowl=makeStadiumBowl(i,cfg,teams,homeIndex),g=createGame(),before=JSON.stringify(g),matrix=new Matrix4(),p=new Vector3();let draws=0,triangles=0,logoCount=0,homeLogos=0;
 assert(bowl.userData.fanCount>8500,'each stadium has a full crowd');
 assert.equal(bowl.userData.homeIndex,homeIndex);
 assert.equal(bowl.userData.homeFanCount,Math.round(bowl.userData.fanCount*.95),'95% quota uses occupied seats, not a random probability');
 assert.equal(bowl.userData.homeFanCount+bowl.userData.awayFanCount,bowl.userData.fanCount);
 bowl.traverse(mesh=>{
  if(!mesh.isMesh)return;draws++;const geometry=mesh.geometry,positions=geometry.attributes.position;
  for(const x of positions.array)assert(Number.isFinite(x),'finite stadium geometry');
  triangles+=(geometry.index?.count??positions.count)/3*(mesh.count??1);
  if(mesh.name.includes('shirt logos')){logoCount+=mesh.count;if(mesh.userData.teamIndex===homeIndex)homeLogos+=mesh.count;}
  if(mesh.name.startsWith('Crowd '))for(let n=0;n<mesh.count;n++){
   mesh.getMatrixAt(n,matrix);p.setFromMatrixPosition(matrix);
   assert(Math.abs(p.x)>32||Math.abs(p.z)>66,'every fan stays outside the playing field');
  }
 });
 assert.equal(logoCount,bowl.userData.fanCount,'every spectator wears their team logo');assert.equal(homeLogos,bowl.userData.homeFanCount,'home shirts use home logos even when the CPU hosts');
 assert(draws<=45,'large crowd and architecture remain instanced');assert(triangles<3500000,'spectator detail stays within the stadium triangle budget');
 const bounds=new Box3().setFromObject(bowl);assert(bounds.min.x<-60&&bounds.max.x>60&&bounds.min.z<-95&&bounds.max.z>95);assert(bounds.max.y>=39,'stadium includes floodlight towers');
 updateStadiumBowl(bowl,1,g);assert.equal(JSON.stringify(g),before,'cosmetic stadium does not mutate match state');
 g.scores[0]=3;updateStadiumBowl(bowl,2,g);assert.equal(bowl.userData.uniform.energy.value,1,'points trigger cheering');
 updateStadiumBowl(bowl,10,g);assert.equal(bowl.userData.uniform.energy.value,0,'crowd returns to normal');
 g.scores[1]=6;updateStadiumBowl(bowl,11,g,true);assert.equal(bowl.userData.uniform.time.value,0);assert.equal(bowl.userData.uniform.energy.value,0,'reduced motion freezes crowd');
 updateStadiumBowl(bowl,0,createGame());assert.equal(bowl.userData.uniform.energy.value,0,'new match resets crowd reaction');
 let textureDisposed=false,geometryDisposed=false,instances=0,released=0;const mesh=bowl.children.find(m=>m.isMesh);mesh.geometry.addEventListener('dispose',()=>geometryDisposed=true);
 bowl.traverse(m=>{if(m.isInstancedMesh){instances++;m.addEventListener('dispose',()=>released++);}});
 const texture=bowl.userData.scoreboard.texture;if(texture)texture.addEventListener('dispose',()=>textureDisposed=true);
 dispose(bowl);assert(geometryDisposed);assert.equal(released,instances,'changing stadium frees every instance buffer');if(texture)assert(textureDisposed);
 console.log(`${cfg.name}: ${bowl.userData.fanCount} fans, ${draws} stadium draws, ${Math.round(triangles/1000)}k triangles; safe bounds, score reactions and reduced motion passed.`);
}
for(const team of TEAMS){const path=new URL(teamLogoUrl(team));assert(fs.statSync(path).size>1000,'all 32 logos are bundled locally');assert.equal(fs.readFileSync(path).subarray(1,4).toString(),'PNG');}
assert.equal(FIELD.width,160/3);assert.equal(FIELD.length,120);assert.equal(FIELD.hashInner*2*3,18.5);assert.equal(FIELD.hashLength*3,2);
const g=createGame();let board=scoreboardState(g,1);assert.equal(board.homeIndex,1);assert.equal(board.clock,'3:00');assert.equal(board.toGo,'10');assert.equal(board.ballOn,'OWN 20');
g.scores=[7,3];g.offense=1;g.line=22;g.goal=32;g.down=3;g.clock=89.2;board=scoreboardState(g,1);assert.deepEqual(board.scores,[7,3]);assert.equal(board.clock,'1:30');assert.equal(board.down,'3RD');assert.equal(board.ballOn,'OPP 28');assert.equal(board.offense,1);
g.goal=50;assert.equal(scoreboardState(g).toGo,'GOAL');g.placeKick={kind:'extraPoint'};assert.equal(scoreboardState(g).status,'EXTRA POINT');g.ended=true;assert.equal(scoreboardState(g).clock,'FINAL');
for(const homeSide of [0,1]){
 const r=makeRoom('stadium-test',{id:'host',name:'Archer',color:'#123456'},{id:'guest',name:'Echo',color:'#654321'},0,100,'touchdown-rush');
 readyPlayer(r,'host',{team:'san-francisco-49ers',homeSide},100);readyPlayer(r,'guest',{team:'kansas-city-chiefs',homeSide:1-homeSide},100);
 const expected=homeSide===0?'san-francisco-49ers':'kansas-city-chiefs';assert.equal(r.match.homeTeamId,expected);assert.equal(publicRoom(r,'host').match.homeTeamId,expected);assert.equal(publicRoom(r,'guest').match.homeTeamId,expected,'friends see the same home branding after scores and teams swap perspective');
}
console.log('Home/away selection, all team logos, exact crowd quota, NFL field spacing, live scoreboard and friend venue agreement passed.');
