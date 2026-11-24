export const COURT = {singles: 4.115, doubles: 5.485, baseline: 11.885, service: 6.4, net: .914};
export const SURFACES = [
  {name:'Lakeside Hardcourt', type:'Hard', bounce:.79, carry:.79, color:'#548fba', outside:'#31796d'},
  {name:'Citrus Clay Club', type:'Clay', bounce:.89, carry:.67, color:'#bb674d', outside:'#974f3f'},
  {name:'Meadow Grass Court', type:'Grass', bounce:.66, carry:.86, color:'#557c4b', outside:'#3b6044'},
];
export const LEVELS = {
  rookie:{speed:5.6, reach:1.04, reaction:.27, pace:.89, width:2.55, depth:8.8, name:'Rookie'},
  club:{speed:6.8, reach:1.12, reaction:.19, pace:.79, width:3.15, depth:9.55, name:'Club'},
  pro:{speed:7.8, reach:1.21, reaction:.11, pace:.69, width:3.52, depth:10.15, name:'Pro'},
};
export const BALL_RADIUS=.105;
const GRAVITY=13.5;
const FORWARD=[-1,1], OWN=[1,-1];
export const clamp=(v,low,high)=>Math.min(high,Math.max(low,v));

export function createMatch({surface=0, difficulty='rookie', bestOf=1, practice=false}={}){
  const game={
    surface,difficulty,bestOf,practice,time:0,phase:'serve',server:0,tieServer:null,
    points:[0,0],games:[0,0],sets:[0,0],completed:[],pointsPlayed:0,
    faults:0,latest:'',latestSide:null,notice:'',delay:0,winner:null,practiceHits:0,
    players:[0,1].map(side=>({side,x:0,z:0,vx:0,vz:0,swing:0,lob:false})),
    ball:null,rally:0,bestRally:0,request:null,
  };
  prepareServe(game);
  return game;
}

export function serveBox(game){
  const parity=(game.points[0]+game.points[1])%2;
  return {x:OWN[game.server]*(parity?-1:1),z:FORWARD[game.server]};
}

export function prepareServe(game){
  const s=game.server,receiver=1-s,box=serveBox(game);
  Object.assign(game.players[s],{x:box.x*2.2,z:OWN[s]*(COURT.baseline+.38),vx:0,vz:0});
  Object.assign(game.players[receiver],{x:-box.x*1.72,z:OWN[receiver]*(COURT.baseline-.56),vx:0,vz:0});
  game.ball=null;
  game.rally=0;
  game.request=null;
  game.phase='serve';
  game.delay=s===1?.78:0;
  game.notice=game.faults?'Second serve':s===0?'Your serve':'Opponent serves';
}

export function scoring(game){
  if(game.tieServer!==null)return {left:String(game.points[0]),right:String(game.points[1]),label:'Tiebreak'};
  const [a,b]=game.points;
  if(a>=3&&b>=3){
    if(a===b)return {left:'40',right:'40',label:'Deuce'};
    return a>b?{left:'AD',right:'40',label:'Your advantage'}:{left:'40',right:'AD',label:'Opponent advantage'};
  }
  const names=['0','15','30','40'];
  return {left:names[Math.min(3,a)],right:names[Math.min(3,b)],label:''};
}

export function awardPoint(game, side, reason){
  if(game.phase==='finished')return;
  game.latest=reason;
  game.latestSide=side;
  game.notice=reason;
  game.bestRally=Math.max(game.bestRally,game.rally);
  game.ball=null;
  game.request=null;
  game.faults=0;
  game.phase='point';
  game.delay=1.2;
  if(game.practice){
    if(side===0)game.practiceHits++;
    game.server=0;
    return;
  }
  game.pointsPlayed++;
  game.points[side]++;
  const other=1-side;
  const needed=game.tieServer===null?4:7;
  if(game.points[side]<needed||game.points[side]-game.points[other]<2){
    if(game.tieServer!==null){
      const played=game.points[0]+game.points[1];
      game.server=(game.tieServer+Math.floor((played+1)/2))%2;
    }
    return;
  }
  const wasTie=game.tieServer!==null;
  game.games[side]++;
  game.points=[0,0];
  game.server=wasTie?1-game.tieServer:1-game.server;
  game.tieServer=null;
  if(wasTie||(game.games[side]>=6&&game.games[side]-game.games[other]>=2)){
    game.completed.push(game.games.slice());
    game.sets[side]++;
    if(game.sets[side]===Math.ceil(game.bestOf/2)){
      game.phase='finished';
      game.winner=side;
      return;
    }
    game.games=[0,0];
  } else if(game.games[0]===6&&game.games[1]===6)game.tieServer=game.server;
}

function fault(game, reason){
  game.ball=null;
  game.request=null;
  if(game.faults===1){
    awardPoint(game,1-game.server,'Double fault');
    return;
  }
  game.faults=1;
  game.phase='point';
  game.notice=reason;
  game.delay=.82;
}

function humanTarget(game, side, lob){
  const other=game.players[1-side];
  const change=(game.rally+game.pointsPlayed)%2?-1:1;
  return {x:(Math.abs(other.x)>.6?-Math.sign(other.x):change)*(lob?2.3:2.85),z:FORWARD[side]*(lob?9.4:9.85)};
}

export function targetFor(game, aim=null, lob=false){
  if(aim)return {x:clamp(aim.x,-6.8,6.8),z:clamp(aim.z,-14,14)};
  if(game.phase==='serve'&&game.server===0){
    const box=serveBox(game);
    return {x:-box.x*2.45,z:box.z*4.85};
  }
  return humanTarget(game,0,lob);
}

function cpuTarget(game, serving=false){
  const settings=LEVELS[game.difficulty];
  const cycle=(game.pointsPlayed+game.rally*3)%9;
  if(serving){
    const box=serveBox(game);
    return {x:-box.x*(game.difficulty==='rookie' ? 1.48 : 2.15+cycle*.115),z:box.z*(4.05+cycle*.155)};
  }
  const human=game.players[0],side=Math.abs(human.x)>.65?-Math.sign(human.x):cycle%2?1:-1;
  if(cycle===2||cycle===6)return {x:side*(settings.width-.6),z:game.difficulty==='rookie'?6.5:5.6};
  return {x:side*settings.width,z:settings.depth+(cycle%3)*.31};
}

function flight(game, side, aim, serving, lob){
  const player=game.players[side];
  const ball=game.ball;
  const x=serving?player.x:(ball?.x??player.x);
  const z=serving?player.z+FORWARD[side]*.34:ball.z;
  const y=serving?2.48:Math.max(.34,ball.y);
  const distance=Math.hypot(aim.x-x,aim.z-z);
  const base=serving?.85:side===0?.77:LEVELS[game.difficulty].pace;
  const duration=clamp(base+distance*.023+(lob?.44:0),serving?1.13:.79,1.94);
  player.swing=serving?.39:.29;
  player.lob=lob;
  game.ball={
    x,y,z,vx:(aim.x-x)/duration,vz:(aim.z-z)/duration,vy:(BALL_RADIUS-y+.5*GRAVITY*duration*duration)/duration,
    hitter:side,serving,bounces:0,crossed:false,netCord:false,age:0,
    targetX:aim.x,targetZ:aim.z,
  };
  game.phase='flight';
  game.rally++;
  game.notice='';
}

export function canHit(game, side){
  const b=game.ball,p=game.players[side];
  if(game.phase!=='flight'||b.hitter===side||!b.crossed||b.serving&&!b.bounces)return false;
  const reach=side===0?(game.difficulty==='rookie'?1.62:1.38):LEVELS[game.difficulty].reach;
  return b.z*OWN[side]>.04&&b.y>=.20&&b.y<=2.23&&Math.hypot(p.x-b.x,p.z-b.z)<reach;
}

export function swing(game, aim, lob=false){
  if(game.phase==='serve'&&game.server===0){
    flight(game,0,targetFor(game,aim),true,false);
    return true;
  }
  if(game.phase!=='flight')return false;
  game.request={aim:targetFor(game,aim,lob),lob,until:game.time+.34};
  return true;
}

function advanceFlight(game, dt){
  const ball=game.ball, prevZ=ball.z, prevY=ball.y;
  ball.x+=ball.vx*dt;
  ball.z+=ball.vz*dt;
  ball.y+=ball.vy*dt-.5*GRAVITY*dt*dt;
  ball.vy-=GRAVITY*dt;
  ball.age+=dt;
  if(!ball.crossed&&prevZ*OWN[ball.hitter]>=0&&ball.z*OWN[ball.hitter]<0){
    const f=prevZ/(prevZ-ball.z);
    const height=prevY+(ball.y-prevY)*f;
    const x=ball.x-ball.vx*dt*(1-f);
    const tape=COURT.net+.14*(Math.min(Math.abs(x),5.8)/5.8)**2;
    if(Math.abs(x)<5.84&&height<tape-BALL_RADIUS*.65){
      if(ball.serving)fault(game,'Serve hit the net');
      else awardPoint(game,1-ball.hitter,'Into the net');
      return;
    }
    ball.crossed=true;
    ball.netCord=Math.abs(x)<5.84&&height<tape+BALL_RADIUS;
  }
  if(ball.y>BALL_RADIUS)return;
  const t=clamp((prevY-BALL_RADIUS)/Math.max(.0001,prevY-ball.y),0,1);
  ball.x-=ball.vx*dt*(1-t);
  ball.z-=ball.vz*dt*(1-t);
  ball.y=BALL_RADIUS;
  if(ball.bounces){
    awardPoint(game,ball.hitter,'Second bounce');
    return;
  }
  const landing=ball.z*FORWARD[ball.hitter];
  if(ball.serving){
    const box=serveBox(game);
    const across=-ball.x*box.x;
    if(!ball.crossed||landing<0||landing>COURT.service+.036||across<-.025||across>COURT.singles+.036){
      fault(game,'Serve out');
      return;
    }
    if(ball.netCord){
      game.ball=null;
      game.rally=0;
      game.phase='point';
      game.notice='Let · replay the serve';
      game.delay=.86;
      return;
    }
  }else if(!ball.crossed||landing<0||landing>COURT.baseline+.036||Math.abs(ball.x)>COURT.singles+.036){
    awardPoint(game,1-ball.hitter,'Ball out');
    return;
  }
  const surface=SURFACES[game.surface];
  ball.bounces=1;
  ball.vy=Math.max(1.5,-ball.vy*surface.bounce);
  ball.vx*=surface.carry;
  ball.vz*=surface.carry;
}

function chase(game, side, speed){
  const b=game.ball,p=game.players[side],surface=SURFACES[game.surface];
  if(!b||b.hitter===side)return {x:0,z:OWN[side]*9.8};
  let x=b.x,y=b.y,z=b.z,vy=b.vy,vx=b.vx,vz=b.vz,bounced=b.bounces;
  let fallback={x:clamp(b.targetX,-5.4,5.4),z:clamp(b.targetZ+OWN[side]*1.25,-13.15,13.15)};
  const dt=.045;
  for(let t=0;t<2.25;t+=dt){
    if(z*OWN[side]>.08&&Math.abs(z)<13.6&&Math.abs(x)<6.3&&y>=.24&&y<2.12&&(!b.serving||bounced)){
      const goal={x,z};
      fallback=goal;
      if(Math.hypot(x-p.x,z-p.z)<speed*(t+.1)+.72)return goal;
    }
    x+=vx*dt;z+=vz*dt;y+=vy*dt-.5*GRAVITY*dt*dt;vy-=GRAVITY*dt;
    if(y<=BALL_RADIUS){
      if(bounced)break;
      bounced=true;y=BALL_RADIUS;vy=-vy*surface.bounce;vx*=surface.carry;vz*=surface.carry;
    }
  }
  return fallback;
}

function move(player, x, z, pace, dt){
  const n=Math.max(1,Math.hypot(x,z)),mix=1-Math.exp(-12*dt);
  player.vx+=(x/n*pace-player.vx)*mix;
  player.vz+=(z/n*pace-player.vz)*mix;
  player.x=clamp(player.x+player.vx*dt,-6.45,6.45);
  player.z=OWN[player.side]*clamp(OWN[player.side]*(player.z+player.vz*dt),.65,13.9);
}

export function tick(game, input, dt){
  game.time+=dt;
  for(const player of game.players)player.swing=Math.max(0,player.swing-dt);
  if(game.phase==='finished')return;
  if(game.phase==='point'){
    game.delay-=dt;
    if(game.delay<=0)prepareServe(game);
    return;
  }
  const user=game.players[0],cpu=game.players[1],settings=LEVELS[game.difficulty];
  if(game.phase==='serve'&&game.server===0){
    const box=serveBox(game);
    user.x=box.x*clamp(box.x*(user.x+(input.x||0)*dt*4.3),.65,3.9);
    return;
  }
  const chaseUser=input.assist&&!input.x&&!input.z&&game.phase==='flight'&&game.ball.hitter===1;
  const pace=input.sprint?9.1:7.65;
  const assist=chaseUser?chase(game,0,pace):null;
  move(user,assist?(assist.x-user.x)*3:input.x||0,assist?(assist.z-user.z)*3:input.z||0,pace,dt);
  if(game.phase==='serve'){
    game.delay-=dt;
    if(game.delay<=0)flight(game,1,cpuTarget(game,true),true,false);
    return;
  }
  if(game.ball.age>settings.reaction||game.ball.hitter===1){
    const goal=chase(game,1,settings.speed);
    move(cpu,(goal.x-cpu.x)*3,(goal.z-cpu.z)*3,settings.speed,dt);
  }
  if(game.request?.until<game.time)game.request=null;
  if(game.request&&canHit(game,0)){
    const {aim,lob}=game.request;
    game.request=null;
    flight(game,0,aim,false,lob);
  }else if(canHit(game,1)&&(game.ball.bounces||game.difficulty==='pro')){
    flight(game,1,cpuTarget(game),false,false);
  }
  advanceFlight(game,dt);
}
