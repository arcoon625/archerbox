import assert from 'node:assert/strict';
import test from 'node:test';
import {COURT, awardPoint, canHit, createMatch, scoring, serveBox, swing, tick} from '../public/games/tennis-rally/rules.js';

const dt = 1 / 120;
function advance(game, until, input = {}, limit = 15) {
  for (let t = 0; t < limit && !until(game); t += dt) tick(game, input, dt);
  assert(until(game), 'the match reached the expected phase');
}
const score = (game, side, count) => {
  for (let i = 0; i < count; i++) awardPoint(game, side, 'Winner');
};

test('traditional points go through 15, 30, 40, deuce, advantage, and serving switches', () => {
  const game = createMatch();
  score(game, 0, 1);
  assert.equal(scoring(game).left, '15');
  score(game, 0, 1);
  assert.equal(scoring(game).left, '30');
  score(game, 0, 1);
  assert.equal(scoring(game).left, '40');
  score(game, 1, 3);
  assert.equal(scoring(game).label, 'Deuce');
  score(game, 0, 1);
  assert.equal(scoring(game).left, 'AD');
  score(game, 1, 1);
  assert.equal(scoring(game).label, 'Deuce');
  score(game, 1, 2);
  assert.deepEqual(game.games, [0, 1]);
  assert.deepEqual(game.points, [0,0]);
  assert.equal(game.server, 1);
});

test('a 6–6 set has a win-by-two tiebreak with correct server order', () => {
  const game = createMatch({bestOf: 3});
  for (let i=0;i<6;i++) { score(game,0,4); score(game,1,4); }
  assert.deepEqual(game.games,[6,6]);
  assert.equal(scoring(game).label,'Tiebreak');
  const lead=game.server;
  for (let i=0;i<12;i++) {
    assert.equal(game.server,(lead+Math.floor((i+1)/2))%2);
    score(game,i%2,1);
  }
  score(game,0,1);
  assert.equal(game.phase,'point');
  assert.deepEqual(game.points,[7,6]);
  score(game,0,1);
  assert.deepEqual(game.completed,[[7,6]]);
  assert.deepEqual(game.sets,[1,0]);
  assert.equal(game.server,1-lead);
  for(let i=0;i<6;i++)score(game,0,4);
  assert.equal(game.phase,'finished');
  assert.equal(game.winner,0);
  assert.deepEqual(game.completed,[[7,6],[6,0]]);
});

test('a missed diagonal serve earns a second attempt, then a double fault', () => {
  const game=createMatch();
  assert.equal(serveBox(game).x,1);
  assert(swing(game,{x:2.1,z:-4.4}));
  advance(game,g=>g.phase==='point');
  assert.match(game.notice,/Serve out/);
  assert.deepEqual(game.points,[0,0]);
  assert.equal(game.faults,1);
  advance(game,g=>g.phase==='serve');
  assert.equal(serveBox(game).x,1);
  assert(swing(game,{x:-2.1,z:-COURT.service-2}));
  advance(game,g=>g.phase==='point');
  assert.equal(game.notice,'Double fault');
  assert.equal(scoring(game).right,'15');
  advance(game,g=>g.phase==='serve');
  assert.equal(serveBox(game).x,-1);
});

test('serves bounce before a return; clay rebounds higher and grass carries faster', () => {
  const rebound=[];
  for(let surface=0;surface<3;surface++){
    const game=createMatch({surface});
    swing(game);
    advance(game,g=>g.ball?.crossed);
    assert(!canHit(game,1));
    advance(game,g=>g.ball?.bounces===1);
    rebound.push({rise:game.ball.vy,carry:Math.abs(game.ball.vz)});
    advance(game,g=>g.ball?.hitter===1);
    advance(game,g=>canHit(g,0),{assist:true});
    assert(swing(game,null,true));
    tick(game,{assist:true},dt);
    assert.equal(game.ball.hitter,0);
    assert(game.players[0].lob);
    assert.equal(game.rally,3);
  }
  assert(rebound[1].rise>rebound[0].rise&&rebound[0].rise>rebound[2].rise);
  assert(rebound[2].carry>rebound[0].carry&&rebound[0].carry>rebound[1].carry);
});

test('a full match can be won through real serves, returns, and second bounces', () => {
  const game=createMatch();
  for(let i=0;i<120*180&&game.phase!=='finished';i++){
    if(game.phase==='serve'&&game.server===0)swing(game);
    if(canHit(game,0))swing(game,{x:game.players[1].x>=0?-3.8:3.8,z:-10.8});
    tick(game,{assist:true},dt);
  }
  assert.equal(game.phase,'finished');
  assert.equal(game.winner,0);
  assert.deepEqual(game.completed,[[6,0]]);
  assert(game.bestRally>=3);
});
