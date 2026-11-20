export const hoop = {x:450,y:98};
export const arc = 223;
export const stations = [{x:208,y:125},{x:270,y:265},{x:450,y:340},{x:630,y:265},{x:692,y:125}];
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const contest = game => game.mode === 'contest';
const rookie = game => game.difficulty === 'rookie';
const rivals = (game,player) => game.players.filter(other => other.team !== player.team);
const nearest = (players,target) => players.reduce((best,p) => !best || distance(p,target)<distance(best,target)?p:best,null);

export function shotGrade(power, easy) {
  const error = Math.abs(power-.72);
  if (error <= (easy ? .105:.073)+1e-9) return 'Perfect';
  if (error <= (easy ? .215:.155)+1e-9) return power<.72?'Early':'Late';
  return power<.72?'Too early':'Too late';
}

export function newGame(mode,difficulty) {
  const size = mode==='teams'?3:1;
  const roster = (team,names) => names.slice(0,size).map((name,index)=>({team,name,index,x:450,y:300,think:0,cooldown:0}));
  const home = roster(0,['You','Nova','Juno']);
  const away = mode==='contest'?[]:roster(1,['Ace','Rio','Sky']);
  const game = {mode,difficulty,home,away,players:[...home,...away],you:home[0],score:[0,0],clock:120,
    attempts:0,makes:0,baskets:0,flight:null,owner:null,protectedFor:0,finished:false,message:'',event:''};
  setupPossession(game,0);
  game.message = contest(game)?'Hold Shoot and release in the green zone.':'Your ball. Get open and time your shot!';
  return game;
}

function setupPossession(g,team) {
  g.protectedFor = .8;
  if (contest(g)) {
    Object.assign(g.you,stations[Math.min(4,Math.floor(g.attempts/3))]);
    g.owner = g.you;
    return;
  }
  const offense = team===0?g.home:g.away;
  const defense = team===0?g.away:g.home;
  offense.forEach((p,i)=>Object.assign(p,{x:[450,205,695][i],y:[373,286,286][i],think:0}));
  defense.forEach((p,i)=>Object.assign(p,{x:[450,254,646][i],y:[277,213,213][i],think:0}));
  g.owner = offense[0];
}

export function move(p,dx,dy,speed,dt) {
  const factor = speed*dt/Math.max(1,Math.hypot(dx,dy));
  p.x = clamp(p.x+dx*factor,67,833);
  p.y = clamp(p.y+dy*factor,108,453);
}
function approach(p,target,speed,dt) {
  const d=distance(p,target);
  if(d>1) move(p,target.x-p.x,target.y-p.y,Math.min(speed,d/dt),dt);
}

export function shoot(g,p,power,random=Math.random) {
  if (!p || g.finished || g.flight || g.owner!==p) return false;
  const range = distance(p,hoop);
  const pressure = nearest(rivals(g,p),p);
  const covered = !!pressure && distance(pressure,p)<52 && pressure.y<p.y+15;
  const grade = shotGrade(power,rookie(g));
  const perfect = grade==='Perfect';
  let chance = perfect ? .97:grade.startsWith('Too') ? .06:rookie(g) ? .68:.52;
  if (range>360) chance*=.37;
  if (covered) chance*=perfect ? .81:.56;
  const value = contest(g)?(g.attempts%3===2?2:1):range>=arc?3:2;
  g.flight = {type:'shot',shooter:p,from:{x:p.x,y:p.y},to:hoop,elapsed:0,duration:.54+range/850,
    hit:(perfect&&!covered&&range<=360)||random()<chance,team:p.team,value,grade,covered};
  if (p===g.you) g.message = grade+(covered?' · contested':'');
  g.owner = null;
  return true;
}

export function pass(g) {
  if (g.finished || g.flight || g.owner?.team!==0 || g.home.length<2) return false;
  const target = g.owner===g.you
    ? g.home.slice(1).reduce((best,p)=>distance(nearest(g.away,p),p)>distance(nearest(g.away,best),best)?p:best)
    : g.you;
  g.flight = {type:'pass',from:{x:g.owner.x,y:g.owner.y},to:target,target,elapsed:0,duration:.29};
  g.owner = null;
  g.message = 'Pass to '+target.name;
  return true;
}

export function steal(g,p) {
  const target = g.owner;
  if (g.finished || contest(g) || !target || target.team===p.team || p.cooldown>0) return false;
  p.cooldown=.72;
  if (g.protectedFor>0 || distance(target,p)>34) {
    if(p===g.you) g.message='Get closer to steal.';
    return false;
  }
  g.owner=p;
  g.protectedFor=1.25;
  p.think=0;
  g.message=p===g.you?'Steal! Your ball.':p.name+' steals the ball!';
  g.event='steal';
  return true;
}

function finishFlight(g) {
  const shot=g.flight;
  g.flight=null;
  if(shot.type==='pass') {
    g.owner=shot.target;
    g.owner.think=0;
    g.protectedFor=.65;
    return;
  }
  if(shot.hit) {
    g.score[shot.team]+=shot.value;
    if(shot.team===0) {
      g.baskets++;
      g.event='basket';
    } else g.event='cpu-basket';
  }
  g.message=shot.hit?((shot.team===0?'In! ': 'CPU scores! ')+'+'+shot.value):'Off the rim!';
  if(contest(g)) {
    g.attempts++;
    if(shot.hit) g.makes++;
    g.finished=g.attempts===15;
  } else {
    g.finished=g.score[shot.team]>=15 || (g.clock<=0 && g.score[0]!==g.score[1]);
  }
  if(!g.finished) setupPossession(g,1-shot.team);
}

export function tick(g,dt,controls,random=Math.random) {
  g.event='';
  if(g.finished) return;
  g.protectedFor=Math.max(0,g.protectedFor-dt);
  if(!contest(g)) {
    g.clock=Math.max(0,g.clock-dt);
    if(!g.flight && g.clock===0 && g.score[0]!==g.score[1]) {
      g.finished=true;
      return;
    }
    move(g.you,controls.x,controls.y,g.owner===g.you?180:197,dt);
  }
  if(g.flight) {
    g.flight.elapsed+=dt;
    if(g.flight.elapsed>=g.flight.duration) finishFlight(g);
    return;
  }
  if(contest(g)) return;

  const owner=g.owner;
  const easy=rookie(g);
  for(const p of g.players) {
    p.cooldown=Math.max(0,p.cooldown-dt);
    if(p===g.you) continue;
    if(p===owner) {
      p.think+=dt;
      const targetX=p.index===2?590:p.index===1?310:525;
      approach(p,{x:targetX,y:easy?174:192},easy?105:137,dt);
      const delay=p.team===0?1.8:easy?2.7:1.7;
      if(p.think>delay && distance(p,hoop)<270) {
        const power=p.team===0 ? .59+random()*.24:easy ? .46+random()*.38:.59+random()*.25;
        shoot(g,p,power,random);
        break;
      }
    } else if(p.team===owner.team) {
      approach(p,{x:p.index===2?678:p.index===1?222:450,y:p.index?246:340},114,dt);
    } else {
      const mark=(owner.team===0?g.home:g.away)[p.index];
      const primary=owner.index===p.index;
      const target=primary?owner:mark;
      const gap=primary?(easy?37:26):49;
      approach(p,{x:target.x,y:target.y-gap},primary?(easy?124:158):112,dt);
      if(primary && distance(p,owner)<34 && p.cooldown<=0 && g.protectedFor<=0) {
        if(random()<dt*(easy ? .48:1.75) && steal(g,p)) break;
      }
    }
  }
}
