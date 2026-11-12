export const EYE=1.65,SPEED=6.6,JUMP=10.7,GRAVITY=24,RADIUS=.24;
export function makePlayer(platform){return {x:platform.x,y:platform.y,z:platform.z,vy:0,onGround:true,ground:platform.id,coyote:.1}}
export function jump(player){if(!player.onGround&&player.coyote<=0)return false;player.vy=JUMP;player.onGround=false;player.ground=null;player.coyote=0;return true}
export function step(player,platforms,dx,dz,dt){
 const oldFeet=player.y;let landed=null;
 // Box sides are solid; jump high enough to clear them before moving across the top.
 const blocked=(x,z)=>platforms.some(p=>oldFeet<p.y-.025&&oldFeet+1.75>p.y-p.h&&Math.abs(x-p.x)<p.w/2+RADIUS&&Math.abs(z-p.z)<p.d/2+RADIUS);
 if(!blocked(player.x+dx,player.z))player.x+=dx;if(!blocked(player.x,player.z+dz))player.z+=dz;
 player.coyote=player.onGround?.1:Math.max(0,player.coyote-dt);player.vy-=GRAVITY*dt;let next=oldFeet+player.vy*dt;
 player.onGround=false;player.ground=null;
 if(player.vy>0){for(const p of platforms){const bottom=p.y-p.h;if(Math.abs(player.x-p.x)<p.w/2+RADIUS&&Math.abs(player.z-p.z)<p.d/2+RADIUS&&oldFeet+1.75<=bottom&&next+1.75>=bottom){next=bottom-1.75;player.vy=0}}}
 else for(const p of platforms)if(Math.abs(player.x-p.x)<=p.w/2+RADIUS*.45&&Math.abs(player.z-p.z)<=p.d/2+RADIUS*.45&&oldFeet>=p.y-.025&&next<=p.y&&(landed===null||p.y>landed.y))landed=p;
 if(landed){next=landed.y;player.vy=0;player.onGround=true;player.ground=landed.id;player.coyote=.1}player.y=next;return landed;
}
