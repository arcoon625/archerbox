import assert from 'node:assert/strict';
import test from 'node:test';
import {golfRange, aimAt} from '../public/games/mini-golf/rules.js';
import {fullGolfRound} from '../server/golf-match.js';
import {makeRoom, tickRoom, publicRoom, encodeRoom, validGame} from '../server/matches.js';
import {applyRoomCommand} from '../server/room-commands.js';
import {handleSocial} from '../server/social.js';
import {handleCharts} from '../server/charts.js';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';

const players = [{id:'test-a',name:'Ace',color:'#c0f16b'},{id:'test-b',name:'Birdie',color:'#b9a2fb'}];
const clients = [crypto.randomUUID(),crypto.randomUUID()];
const start = 100000;

function command(room, seat, body, at = room.updatedAt) {
  return applyRoomCommand(room, players[seat].id, {...body,clientId:clients[seat]}, at);
}

function startRoom(track = 0) {
  const room = makeRoom(crypto.randomUUID(),...players,track,start,'mini-golf');
  command(room,0,{action:'ready'});
  assert.equal(room.status,'waiting');
  command(room,1,{action:'ready'});
  assert.equal(room.status,'countdown');
  tickRoom(room,room.startAt);
  return room;
}

function advance(room, until) {
  // Serialize while the shot is in flight, as the live room does at each checkpoint.
  for (let i = 0; i < 300 && !until(room); i++) {
    tickRoom(room,room.updatedAt + 60);
    if (i % 11 === 0) room = JSON.parse(encodeRoom(room));
  }
  assert(until(room));
  return room;
}

function shot(room, seat, angle, power, eventSeq, token = room.match.token) {
  command(room,seat,{action:'event',event:'putt',args:{angle,power,token},eventSeq});
  return room;
}

test('friends tee off once each, then the farther ball plays; delayed or duplicate shots do not count',()=>{
  let room = startRoom();
  assert.deepEqual([room.match.start,room.match.end,room.match.turn],[0,6,0]);
  shot(room,1,0,72,1);
  assert.equal(room.match.balls[1].strokes,0);
  shot(room,0,0,101,1);
  assert.equal(room.match.balls[0].strokes,0);
  shot(room,0,0,25,2);
  assert.equal(room.match.phase,'rolling');
  assert.equal(room.match.balls[0].strokes,1);
  shot(room,0,0,25,2,0);
  assert.equal(room.match.balls[0].strokes,1);

  room=advance(room,r=>r.match.phase==='aim');
  assert.equal(room.match.turn,1);
  shot(room,1,0,45,2);
  room=advance(room,r=>r.match.phase==='aim');
  assert.equal(room.match.turn,0,'the player with the shorter initial putt plays first');
  shot(room,0,0,75,3,0);
  assert.equal(room.match.balls[0].strokes,1,'stale turn token rejected even after control returns');
  shot(room,0,0,12,4);
  assert.equal(room.match.balls[0].strokes,2);
  const a=publicRoom(room,players[0].id,clients[0]);
  const b=publicRoom(room,players[1].id,clients[1]);
  assert.equal(a.seat,0);
  assert.equal(b.seat,1);
  assert.deepEqual(a.match,b.match);
  assert(!JSON.stringify(a).includes('test-b'));
});

test('both players finish the hole before advancing and the fewest strokes wins the round',()=>{
  let room=startRoom(1);
  assert.deepEqual(golfRange(1),{start:0,end:2});
  shot(room,0,0,72,1);
  room=advance(room,r=>r.match.phase==='aim');
  assert.deepEqual(room.match.scorecards,[[1],[]]);
  assert.equal(room.match.turn,1);
  assert.equal(room.match.hole,0);
  shot(room,1,0,72,1);
  room=advance(room,r=>r.match.phase==='hole-complete');
  assert.deepEqual(room.match.scorecards,[[1],[1]]);
  assert.equal(room.match.hole,0);
  room=advance(room,r=>r.match.hole===1);
  assert.equal(room.match.turn,0);

  // Put both balls close to the last cup to isolate the scoring and finish path.
  for (const [seat,ball] of room.match.balls.entries()) {
    const [x,z]=ball.hole.cup;
    Object.assign(ball,{x,z:z+.56,strokes:seat===0?2:3});
  }
  shot(room,0,0,10,2);
  room=advance(room,r=>r.match.phase==='aim');
  shot(room,1,0,10,2);
  room=advance(room,r=>r.status==='finished');
  assert.deepEqual(room.match.scorecards,[[1,3],[1,4]]);
  assert.equal(room.match.winner,0);
  assert(!fullGolfRound(room),'practice-size friend rounds do not count as all six holes');

  const tied=startRoom(3);
  tied.match.hole=tied.match.end-1;
  tied.match.scorecards=[[2],[2]];
  for(const ball of tied.match.balls) {
    const [x,z]=ball.hole.cup;
    Object.assign(ball,{x,z:z+.56});
  }
  shot(tied,0,aimAt(tied.match.balls[0].x,tied.match.balls[0].z,...tied.match.balls[0].hole.cup),10,1);
  const other=advance(tied,r=>r.match.phase==='aim');
  shot(other,1,0,10,1);
  const finished=advance(other,r=>r.status==='finished');
  assert.equal(finished.match.winner,null);
});

test('friends can invite each other to the selected course and only a completed six-hole room counts for XP',async()=>{
  const {db,sqlite}=fantasyDatabase();
  const profile=sqlite.prepare('INSERT INTO social_profiles(id,code,name,color,seen,created) VALUES (?,?,?,?,?,?)');
  players.forEach((player,i)=>profile.run(player.id,'testcode0'+i,player.name,player.color,start,start));
  sqlite.prepare('INSERT INTO social_friends(a,b,created) VALUES (?,?,?)').run(...players.map(player=>player.id),start);
  const call=(service,seat,path,body)=>service(new Request('https://arcade.test/api/'+path,{
    method:body?'POST':'GET',headers:{'oai-authenticated-user-id':players[seat].id,'Content-Type':'application/json',Origin:'https://arcade.test'},
    body:body?JSON.stringify(body):undefined,
  }),db);
  const social=(seat,path,body)=>call(handleSocial,seat,'social/'+path,body);
  const chart=(seat,path,body)=>call(handleCharts,seat,'charts/'+path,body);
  assert.equal(validGame('mini-golf').arenas[3],'Moon Station');
  assert.equal((await social(0,'invite',{friend:players[1].id,game:'mini-golf',track:4})).status,400);
  const invite=await social(0,'invite',{friend:players[1].id,game:'mini-golf',track:0});
  assert.equal(invite.status,200);
  const guest=await (await social(1,'state')).json();
  const id=guest.incoming[0].id;
  assert.equal(guest.incoming[0].game,'mini-golf');
  const accepted=await (await social(1,'respond',{invite:id,accept:true})).json();
  assert.equal(accepted.activeRoom,id);
  for (const [seat,clientId] of clients.entries()) {
    const ready=await (await social(seat,'room/'+id,{action:'ready',clientId})).json();
    assert.equal(ready.status,seat===0?'waiting':'countdown');
  }
  const {session}=await (await chart(0,'play',{game:'mini-golf'})).json();
  const credit={game:'mini-golf',event:'finish',run:'room:'+id,progress:1,session};
  assert.equal((await chart(0,'progress',credit)).status,400);

  const room=JSON.parse(sqlite.prepare('SELECT data FROM social_rooms WHERE id=?').get(id).data);
  room.startAt=room.updatedAt=Date.now()-20;
  let data=await (await social(0,'room/'+id,{action:'claim',clientId:clients[0]})).json();
  assert.equal(data.status,'countdown','the stored room is still counting down before time is advanced');
  sqlite.prepare('UPDATE social_rooms SET data=? WHERE id=?').run(encodeRoom(room),id);
  data=await (await social(0,'room/'+id,{action:'event',event:'putt',eventSeq:1,args:{angle:0,power:72,token:0},clientId:clients[0]})).json();
  assert.equal(data.match.phase,'rolling');
  assert.equal(data.match.balls[0].strokes,1);
  room.status='finished';
  room.match.phase='finished';
  sqlite.prepare('UPDATE social_rooms SET data=? WHERE id=?').run(encodeRoom(room),id);
  assert.equal((await chart(0,'progress',{...credit,progress:2})).status,400);
  assert.equal((await (await chart(0,'progress',credit)).json()).added,1);
  assert.equal((await (await chart(0,'progress',credit)).json()).added,0);
  sqlite.close();
});
