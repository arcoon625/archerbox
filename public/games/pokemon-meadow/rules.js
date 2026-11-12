import {species,STARTERS,MOVES,TRAINERS,SPAWNS,WIDTH,HEIGHT,CENTER,blocked} from './data.js?v=meadow1';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const number=(n,f=0)=>Number.isFinite(n)?n:f;
export const maxHP=m=>species(m.species).hp+m.level*4;
export const lead=g=>g.team[g.active]||g.team[0];
export const opponent=g=>g.battle?.opponents[g.battle.index];
export function makeMon(id,level=5,uid=globalThis.crypto?.randomUUID?.()||'mon-'+Math.random().toString(36).slice(2)){const m={uid,species:species(id).id,level:clamp(Math.round(level),1,20),xp:0,hp:0};m.hp=maxHP(m);return m;}
export function freshGame(){return {version:1,starter:null,x:20,y:22,facing:0,active:0,team:[],reserve:[],seen:[],caught:[],badges:[],balls:20,potions:6,battle:null,encounters:SPAWNS.map(()=>0),time:0,wins:0,catches:0,pendingCoins:[],championCelebrated:false};}
export function chooseStarter(g,id){if(g.starter||!STARTERS.includes(id))return false;g.starter=id;g.team=[makeMon(id)];g.caught=[id];g.seen=[id];g.active=0;return true;}
export function walk(g,dx,dy,dt){if(!g.starter||g.battle||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);const n=Math.max(1,Math.hypot(dx,dy)),x=g.x+dx/n*3.1*dt,y=g.y+dy/n*3.1*dt;if(!blocked(x,g.y))g.x=x;if(!blocked(g.x,y))g.y=y;g.time+=dt;if(Math.hypot(dx,dy)>.1)g.facing=Math.atan2(dx,dy);}
export function heal(g){if(g.battle)return false;g.team.forEach(m=>m.hp=maxHP(m));g.reserve.forEach(m=>m.hp=maxHP(m));g.balls=Math.max(20,g.balls);g.potions=Math.max(6,g.potions);return true;}
export function nearest(g){
 const items=[{kind:'center',x:17.5,y:21.5,name:'Pokémon Center'},{kind:'lab',x:14.5,y:24.5,name:'Professor Fern’s lab'},...TRAINERS.map(t=>({...t,kind:'trainer'})),...SPAWNS.filter(s=>g.encounters[s.id]<=g.time&&(!s.requiredBadge||g.badges.includes(s.requiredBadge))).map(s=>({...s,kind:'wild',name:species(s.kind).name,species:s.kind}))];
 return items.map(i=>({...i,distance:Math.hypot(i.x-g.x,i.y-g.y)})).filter(i=>i.distance<2.3).sort((a,b)=>a.distance-b.distance)[0]||null;
}
export function startBattle(g,kind,id){
 if(g.battle||!g.starter)return {ok:false};
 if(!g.team.some(m=>m.hp>0)){heal(g);return {ok:false,text:'Your team rested. Everyone is ready again!'};}
 if(lead(g).hp<=0)g.active=g.team.findIndex(m=>m.hp>0);
 let opponents,name;
 if(kind==='wild'){const s=SPAWNS[id];if(!s||g.encounters[id]>g.time||s.requiredBadge&&!g.badges.includes(s.requiredBadge))return {ok:false};opponents=[makeMon(s.kind,s.level,'wild-'+id)];name='Wild '+species(s.kind).name;}
 else{const t=TRAINERS.find(t=>t.id===id);if(!t)return {ok:false};if(id==='iris'&&g.badges.filter(b=>b!=='iris').length<3)return {ok:false,text:'Earn the Leaf, Wave and Stone Badges to challenge Iris.'};opponents=t.team.map(([id,l],i)=>makeMon(id,l,'trainer-'+i));name=t.name;}
 g.battle={kind,id,name,opponents,index:0,turn:0,log:[kind==='wild'?name+' appeared!':name+' challenges you!'],guard:false};for(const m of opponents)if(!g.seen.includes(m.species))g.seen.push(m.species);return {ok:true};
}
const EFFECT={fire:{grass:2,bug:2,water:.5,rock:.5,fire:.5},water:{fire:2,rock:2,grass:.5,water:.5},grass:{water:2,rock:2,fire:.5,grass:.5,flying:.5,bug:.5},electric:{water:2,flying:2,grass:.5,electric:.5,dragon:.5},normal:{rock:.5},flying:{grass:2,bug:2,rock:.5,electric:.5},bug:{grass:2,fire:.5,flying:.5},rock:{fire:2,flying:2},fairy:{dragon:2},dragon:{dragon:2,fairy:.5}};
export const effectiveness=(type,target)=>EFFECT[type]?.[target]||1;
export function damage(attacker,defender,move,random=Math.random){const factor=effectiveness(move.type,species(defender.species).type);return {amount:Math.max(1,Math.round((move.power+attacker.level*.75)*species(attacker.species).attack/species(defender.species).defense*factor*(.88+clamp(random(),0,1)*.12))),factor};}
function gainXP(g,m,amount,lines){m.xp+=amount;while(m.level<20&&m.xp>=m.level*3){m.xp-=m.level*3;m.level++;m.hp=Math.min(maxHP(m),m.hp+8);lines.push(species(m.species).name+' grew to level '+m.level+'!');}const s=species(m.species);if(m.level>=8&&s.evolves){m.species=s.evolves;m.hp=Math.min(maxHP(m),m.hp+10);if(!g.caught.includes(m.species)){g.caught.push(m.species);g.pendingCoins.push('caught:'+m.species);}if(!g.seen.includes(m.species))g.seen.push(m.species);lines.push(s.name+' evolved into '+species(m.species).name+'!');}}
function finish(g,result,lines){const b=g.battle;if(b.kind==='wild')g.encounters[b.id]=g.time+35;if(result==='won'){g.wins++;if(b.kind==='trainer'&&!g.badges.includes(b.id)){g.badges.push(b.id);g.pendingCoins.push('badge:'+b.id);lines.push('You earned the '+TRAINERS.find(t=>t.id===b.id).badge+'!');}}
 if(result==='lost'){g.x=20;g.y=22;g.team.forEach(m=>m.hp=maxHP(m));g.balls=Math.max(g.balls,20);g.potions=Math.max(g.potions,6);lines.push('The Pokémon Center helped your team recover. No Pokémon were lost.');}g.battle=null;return {ok:true,finished:true,result,lines};}
function enemyTurn(g,lines,random){const m=lead(g),e=opponent(g),moves=MOVES(e),move=moves[random()>.4?1:0];if(random()>move.accuracy){lines.push(species(e.species).name+' missed!');g.battle.guard=false;return;}
 const hit=damage(e,m,move,random),amount=g.battle.guard?Math.max(1,Math.round(hit.amount*.4)):hit.amount;g.battle.guard=false;m.hp=Math.max(0,m.hp-amount);lines.push(species(e.species).name+' used '+move.name+'. −'+amount+' HP.');if(m.hp===0){lines.push(species(m.species).name+' fainted.');const next=g.team.findIndex(m=>m.hp>0);if(next>=0){g.active=next;lines.push('Go, '+species(lead(g).species).name+'!');}}}
export function act(g,action,value=0,random=Math.random){
 if(!g.battle)return {ok:false,lines:[]};const b=g.battle,m=lead(g),e=opponent(g),lines=[];
 if(action==='run'){if(b.kind!=='wild')return {ok:false,lines:['Finish the trainer battle first.']};lines.push('You got away safely.');return finish(g,'ran',lines);}
 if(action==='catch'){
  if(b.kind!=='wild')return {ok:false,lines:['Trainer Pokémon cannot be caught.']};if(g.balls<1)return {ok:false,lines:['Visit the Pokémon Center for more Poké Balls.']};if(g.team.length+g.reserve.length>=60)return {ok:false,lines:['Your collection is full. You can still battle and explore.']};
  g.balls--;const chance=clamp(.24+(1-e.hp/maxHP(e))*.64-(e.species==='dratini'?.1:0),.12,.93);lines.push('You threw a Poké Ball…');
  if(random()<chance){const caught=makeMon(e.species,e.level);caught.hp=Math.max(1,e.hp);if(g.team.length<6)g.team.push(caught);else g.reserve.push(caught);g.catches++;if(!g.caught.includes(e.species)){g.caught.push(e.species);g.pendingCoins.push('caught:'+e.species);}lines.push('Gotcha! '+species(e.species).name+' joined your '+(g.team.includes(caught)?'team':'reserve')+'!');gainXP(g,m,6,lines);return finish(g,'caught',lines);}lines.push(species(e.species).name+' broke free! Weaken it before trying again.');
 }else if(action==='potion'){
  if(g.potions<1||m.hp>=maxHP(m))return {ok:false,lines:[g.potions<1?'No potions left. Rest at the Pokémon Center.':'Your partner already has full HP.']};g.potions--;const amount=Math.min(35,maxHP(m)-m.hp);m.hp+=amount;lines.push('Potion restored '+amount+' HP.');
 }else if(action==='switch'){
  if(!Number.isInteger(value)||!g.team[value]||value===g.active||g.team[value].hp<=0)return {ok:false,lines:['Choose a different healthy Pokémon.']};g.active=value;lines.push('Go, '+species(lead(g).species).name+'!');
 }else if(action==='move'){
  const move=MOVES(m)[value];if(!move||move.level&&m.level<move.level)return {ok:false,lines:['This move unlocks at level 7.']};
  if(move.guard){b.guard=true;lines.push(species(m.species).name+' is guarding!');}else if(random()>move.accuracy)lines.push(species(m.species).name+' missed!');else{const hit=damage(m,e,move,random);e.hp=Math.max(0,e.hp-hit.amount);lines.push(species(m.species).name+' used '+move.name+'. −'+hit.amount+' HP.');if(hit.factor>1)lines.push('It’s super effective!');if(hit.factor<1)lines.push('It’s not very effective.');
   if(e.hp===0){lines.push(species(e.species).name+' fainted.');gainXP(g,m,b.kind==='trainer'?15:9,lines);if(b.index<b.opponents.length-1){b.index++;lines.push(b.name+' sent out '+species(opponent(g).species).name+'!');b.turn++;b.log=lines;return {ok:true,finished:false,lines};}else return finish(g,'won',lines);}
  }
 }else return {ok:false,lines:['Choose an action.']};
 b.turn++;enemyTurn(g,lines,random);if(!g.team.some(m=>m.hp>0))return finish(g,'lost',lines);b.log=lines;return {ok:true,finished:false,lines};
}
export function setLead(g,index){if(g.battle||!g.team[index]||g.team[index].hp<=0)return false;g.active=index;return true;}
export function reserveToTeam(g,index){if(g.battle||!g.reserve[index])return false;const m=g.reserve.splice(index,1)[0];if(g.team.length===6)g.reserve.push(g.team.pop());g.team.push(m);if(g.active>=g.team.length)g.active=0;return true;}
export function restoreGame(raw){
 const g=freshGame();if(raw?.version!==1||!STARTERS.includes(raw.starter))return g;g.starter=raw.starter;const valid=new Set();
 const parse=(r,i)=>{if(!r||!species(r.species)||species(r.species).id!==r.species)return null;const m=makeMon(r.species,clamp(number(r.level,5),1,20),typeof r.uid==='string'&&/^[\w-]{1,60}$/.test(r.uid)?r.uid:'restored-'+i);if(valid.has(m.uid))return null;valid.add(m.uid);m.xp=clamp(Math.floor(number(r.xp)),0,m.level*3-1);m.hp=clamp(number(r.hp,maxHP(m)),0,maxHP(m));return m;};
 g.team=(Array.isArray(raw.team)?raw.team:[]).map(parse).filter(Boolean).slice(0,6);if(!g.team.length)g.team=[makeMon(g.starter)];g.reserve=(Array.isArray(raw.reserve)?raw.reserve:[]).map((r,i)=>parse(r,i+6)).filter(Boolean).slice(0,54);g.active=clamp(Math.round(number(raw.active)),0,g.team.length-1);
 for(const key of ['seen','caught'])g[key]=[...new Set((Array.isArray(raw[key])?raw[key]:[]).filter(id=>species(id).id===id))];for(const m of [...g.team,...g.reserve]){if(!g.caught.includes(m.species))g.caught.push(m.species);if(!g.seen.includes(m.species))g.seen.push(m.species);}
 g.badges=[...new Set((Array.isArray(raw.badges)?raw.badges:[]).filter(id=>TRAINERS.some(t=>t.id===id)))];for(const key of ['balls','potions','wins','catches'])g[key]=clamp(Math.floor(number(raw[key],g[key])),0,99999);
 g.x=clamp(number(raw.x,20),1,WIDTH-1);g.y=clamp(number(raw.y,22),1,HEIGHT-1);if(blocked(g.x,g.y)){g.x=20;g.y=22;}g.facing=number(raw.facing);g.time=clamp(number(raw.time),0,1e8);g.encounters=SPAWNS.map((_,i)=>clamp(number(raw.encounters?.[i]),0,g.time+35));
 g.pendingCoins=[...new Set((Array.isArray(raw.pendingCoins)?raw.pendingCoins:[]).filter(s=>typeof s==='string'&&/^(caught|badge):[a-z-]+$/.test(s)))];g.championCelebrated=raw.championCelebrated===true;
 const b=raw.battle;if(b&&['wild','trainer'].includes(b.kind)&&(b.kind==='wild'?SPAWNS[b.id]:TRAINERS.some(t=>t.id===b.id))){const foes=(Array.isArray(b.opponents)?b.opponents:[]).map((r,i)=>parse({...r,uid:'foe-'+i},100+i)).filter(Boolean).slice(0,2);const index=clamp(Math.round(number(b.index)),0,Math.max(0,foes.length-1));if(foes.length&&foes[index].hp>0&&g.team.some(m=>m.hp>0)){g.battle={kind:b.kind,id:b.id,name:typeof b.name==='string'?b.name.slice(0,24):'Opponent',opponents:foes,index,turn:clamp(Math.round(number(b.turn)),0,10000),guard:false,log:Array.isArray(b.log)?b.log.filter(x=>typeof x==='string').slice(-5).map(x=>x.slice(0,160)):['Battle resumed.']};if(lead(g).hp<=0)g.active=g.team.findIndex(m=>m.hp>0);}}
 return g;
}
