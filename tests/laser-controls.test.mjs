import assert from 'node:assert/strict';
import {steer,stickTurn,TURN_SPEED} from '../public/games/laser-maze/controls.js';
import {createGame,tick} from '../public/games/laser-maze/rules.js';
for(const fps of [30,60,120]){let yaw=0;for(let i=0;i<fps;i++)yaw=steer(yaw,1,0,1/fps).yaw;assert(Math.abs(yaw+TURN_SPEED)<1e-10,'turn speed is independent of frame rate');const stopped=steer(yaw,0,0,1/60);assert.equal(stopped.yaw,yaw,'releasing a turn stops the camera');}
const right=steer(0,1,-1,.05),left=steer(0,-1,-1,.05);assert(right.yaw<0&&left.yaw>0,'left and right turn toward the requested side');assert.equal(right.x,0,'steering does not secretly strafe');
for(const jitter of [-.11,0,.07,.12])assert.equal(stickTurn(jitter),0,'joystick resting jitter cannot rotate the view');assert.equal(stickTurn(1),1);assert.equal(stickTurn(-1),-1);assert(stickTurn(.5)>0&&stickTurn(.5)<1,'gentle stick input turns slowly');
{
 const g=createGame(),dt=1/120;let yaw=0;const start={x:g.player.x,z:g.player.z};
 for(let i=0;i<196;i++){const input=steer(yaw,0,-1,dt);tick(g,input,dt);yaw=input.yaw}
 assert(g.player.z<start.z-7,'forward movement reaches the first corner');const corner={x:g.player.x,z:g.player.z};
 const turnStep=(Math.PI/2)/TURN_SPEED/120;for(let i=0;i<120;i++){const input=steer(yaw,1,0,turnStep);tick(g,input,turnStep);yaw=input.yaw}
 assert(Math.abs(yaw+Math.PI/2)<1e-10,'a quarter turn faces the next hallway');assert.equal(g.player.x,corner.x);assert.equal(g.player.z,corner.z,'turning in place does not move into a wall');
 tick(g,{...steer(yaw,0,0,dt),pulse:true},dt);for(let i=0;i<160;i++)tick(g,steer(yaw,0,-1,dt),dt);
 assert(g.player.x>corner.x+5,'forward now walks along the newly faced hallway');assert(Math.abs(g.player.z-corner.z)<.01);assert.equal(g.zaps,0,'EMP and beam collision still work while steering');
 const before={x:g.player.x,z:g.player.z};for(let i=0;i<60;i++)tick(g,steer(yaw,0,1,dt),dt);assert(g.player.x<before.x-2,'backward movement follows the same camera heading');
}
for(const input of [[NaN,Infinity,NaN,Infinity],[0,1,-1,-1],[0,0,0,NaN]]){const out=steer(...input);assert(Object.values(out).every(Number.isFinite),'invalid input cannot corrupt the camera');}
console.log('Laser camera controls passed: smooth left/right turns, frame-rate independence, instant release, joystick dead zone, first-corner navigation, forward/backward heading, EMP and collision compatibility.');
