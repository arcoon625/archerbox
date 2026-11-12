import assert from 'node:assert/strict';
import {createPlayback} from '../public/multiplayer/playback.js';
import {createPollLoop} from '../public/multiplayer/poll-loop.js';

// Reproduce the stop/start bug with packets every 120 ms and a 60 Hz display.
const playback=createPlayback(),positions=[];
let current;
for(let t=0;t<=1200;t+=20){
 if(t%120===0){current={actors:[{x:t/100,z:0,y:0,yaw:0,alive:true}]};playback.receive(current,t,'playing');}
 playback.frame(t);positions.push(current.actors[0].x);
}
for(let i=8;i<positions.length;i++)assert(Math.abs(positions[i]-positions[i-1]-.2)<1e-8,'movement continues every frame, including when a packet arrives');
playback.frame(10000);const bounded=current.actors[0].x;playback.frame(11000);assert.equal(current.actors[0].x,bounded,'do not keep moving forever after a disconnect');

// Packet timing jitter must not cause reverse movement or giant corrections.
const jitter=createPlayback();let next=0,display,previous=-Infinity;
for(let now=0;now<1600;now+=10){
 if(now>=next){display={actors:[{x:now/200,y:0,z:0,alive:true}]};jitter.receive(display,now,'playing');next=now+(now%3===0?150:100);}
 jitter.frame(now);
 assert(display.actors[0].x>=previous-1e-8,'steady movement stays forward during packet jitter');previous=display.actors[0].x;
}

// Equal nicknames still belong to different actors; do not merge their poses.
const sameNames=createPlayback();sameNames.receive({actors:[{name:'Archer',x:0},{name:'Archer',x:10}]},0,'playing');
const names={actors:[{name:'Archer',x:1},{name:'Archer',x:11}]};sameNames.receive(names,120,'playing');sameNames.frame(180);assert.equal(names.actors[0].x,.5);assert.equal(names.actors[1].x,10.5);

// Snap intentional teleports, hidden players and completed matches immediately.
const snap=createPlayback();snap.receive({actors:[{x:0,z:0,alive:true,hidden:null}]},0,'playing');
const hidden={actors:[{x:0,z:0,alive:true,hidden:-1}]};snap.receive(hidden,120,'playing');snap.frame(180);assert.equal(hidden.actors[0].x,0);
const teleported={actors:[{x:50,z:0,alive:true,hidden:-1}]};snap.receive(teleported,240,'playing');snap.frame(300);assert.equal(teleported.actors[0].x,50);
const done={actors:[{x:60,z:0,alive:false}]};snap.receive(done,360,'finished');snap.frame(400);assert.equal(done.actors[0].x,60);
const rotation=createPlayback();rotation.receive({actors:[{x:0,yaw:Math.PI-.1}]},0,'playing');const turn={actors:[{x:0,yaw:-Math.PI+.1}]};rotation.receive(turn,120,'playing');rotation.frame(180);assert(Math.abs(turn.actors[0].yaw-Math.PI)<1e-9,'turn across the angle boundary by the short route');

// A delayed request must never overlap another request, and input changes must
// be sent promptly after its reply rather than waiting for a polling interval.
let clock=0,id=0,pending=new Map(),finish,calls=0,errors=0;
const schedule=(fn,delay)=>{pending.set(++id,{fn,at:clock+delay});return id;},cancel=id=>pending.delete(id);
const loop=createPollLoop(()=>{calls++;return new Promise(resolve=>finish=resolve)},{now:()=>clock,schedule,cancel,onError:()=>errors++});
async function advance(time){clock=time;for(const [id,task]of [...pending])if(task.at<=clock){pending.delete(id);task.fn();}await Promise.resolve();await Promise.resolve();}
loop.request();await advance(0);assert.equal(calls,1);loop.request();await advance(200);assert.equal(calls,1,'only one request in flight');finish();await Promise.resolve();await advance(200);assert.equal(calls,2,'queued controls run immediately after a slow reply');loop.stop();finish();await Promise.resolve();await advance(2000);assert.equal(calls,2,'leaving stops requests, even with an in-flight reply');assert.equal(errors,0);
console.log('Multiplayer playback: smooth frame-by-frame movement, jitter, disconnect bounds, duplicate names, hidden states, teleports, angle wrap, and serialized responsive polling passed.');
