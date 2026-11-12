// Shared keyboard/touch jumping and swept vertical collision in arena units.
export const JUMP_SPEED=11.5,GRAVITY=22,EYE_HEIGHT=1.7,BODY_HEIGHT=1.9;
export function jump(body,speed=JUMP_SPEED){
 if(!body.alive||!body.onGround)return false;
 body.vy=speed;body.onGround=false;return true;
}
export function advanceVertical(arena,body,dt){
 const oldFeet=body.pos.y-EYE_HEIGHT,wasGrounded=body.onGround;
 body.vy-=GRAVITY*dt;let feet=oldFeet+body.vy*dt;body.onGround=false;
 if(feet>oldFeet){const ceiling=arena.ceiling(body.pos.x,body.pos.z,oldFeet+BODY_HEIGHT,feet+BODY_HEIGHT);if(ceiling!==null){feet=ceiling-BODY_HEIGHT;body.vy=0}}
 const floor=arena.support(body.pos.x,body.pos.z,oldFeet+.025);
 let landed=false;
 if(body.vy<=0&&floor!==null&&oldFeet>=floor-.025&&feet<=floor){feet=floor;body.vy=0;body.onGround=true;landed=!wasGrounded}
 body.pos.y=feet+EYE_HEIGHT;
 return {landed,height:floor};
}
