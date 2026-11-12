// Original arcade estimates, not individual medical predictions. Research notes
// and the observed Bills/Chiefs substitutions live in docs/football-injuries.md.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const FAMILY={QB:['QB'],WR:['WR'],RB:['RB'],TE:['TE'],LT:['T','OT','G','C'],RT:['T','OT','G','C'],LG:['G','C','T','OT'],RG:['G','C','T','OT'],C:['C','G','T','OT'],DE:['DE','LB','OLB','EDGE'],EDGE:['DE','LB','OLB','EDGE'],DT:['DT','NT','DE'],LB:['LB','ILB','OLB'],CB:['CB','DB'],S:['S','FS','SS','DB'],PK:['PK','K'],K:['PK','K'],P:['P'],LS:['LS']};
export const INJURY_TYPES={ankle:{label:'Ankle knock',plays:3},shoulder:{label:'Shoulder knock',plays:2},strain:{label:'Leg strain',plays:null},head:{label:'Head evaluation',plays:null}};
export function initMedical(g,options={}){g.medical={enabled:options.injuries!==false,state:(options.injurySeed??crypto.getRandomValues(new Uint32Array(1))[0])>>>0||1,serial:0,lastResolved:-1,plays:0,lastInjury:-10,events:[],notice:null,revision:0};}
function random(m){let x=m.state;x^=x<<13;x^=x>>>17;x^=x<<5;m.state=x>>>0;return m.state/4294967296;}
export function startMedicalPlay(g){if(g.medical)g.medical.serial++;}
export const isUnavailable=(g,team,id)=>g.medical?.events.some(e=>e.team===team&&e.playerId===id&&e.status!=='returned')||false;
function currentInjury(g,team,id){return g.medical?.events.find(e=>e.team===team&&e.playerId===id&&e.status!=='returned');}
function reserveData(g,team){return g.teamRosters[team].reserves;}
function replacement(g,a){
 const roster=g.teamRosters[a.team],data=reserveData(g,a.team);if(!data)return null;
 const reserved=new Set([...roster.offense,...roster.defense].map(p=>p.id));
 for(const b of g.actors)if(b.team===a.team)reserved.add(b.playerId);
 for(const p of Object.values(roster.specialTeams||{}))if(p?.id)reserved.add(p.id);
 for(const e of g.medical.events)if(e.team===a.team)reserved.add(e.replacement.id);
 const numbers=new Set([...roster.offense,...roster.defense].map(p=>p.number));for(const b of g.actors)if(b.team===a.team)numbers.add(b.jerseyNumber);for(const n of g.offenseNumbers[a.team]||[])numbers.add(n);
 for(const e of g.medical.events)if(e.team===a.team)numbers.add(e.replacement.number);
 const family=a.specialRole==='KR'||a.specialRole==='PR'?['WR','RB','CB','DB','S']:a.specialRole==='H'?['P','QB']:FAMILY[a.specialRole||a.role]||FAMILY[a.position]||[a.position];
 const order=data.bySlot[a.depthSlot]||[],candidates=[...order.map(id=>data.players.find(p=>p.id===id)),...data.players].filter(Boolean);
 return candidates.find(p=>family.includes(p.position)&&!reserved.has(p.id)&&!numbers.has(p.number)&&!isUnavailable(g,a.team,p.id))||null;
}
function notice(g,e,type){const m=g.medical;m.revision++;m.notice={id:m.revision,team:e.team,type,name:e.name,number:e.number,label:e.label,replacement:e.replacement.name,replacementNumber:e.replacement.number,status:e.status};}
export function createInjury(g,actor,type){
 const m=g.medical,a=typeof actor==='number'?g.actors[actor]:actor,definition=INJURY_TYPES[type];
 if(!m?.enabled||!a||!definition||g.practiceKicks||g.ended||m.events.length>=3||m.events.some(e=>e.team===a.team&&e.playerId===a.playerId))return null;
 const backup=replacement(g,a);if(!backup)return null;
 const e={id:m.events.length+1,team:a.team,playerId:a.playerId,name:a.name,shortName:a.shortName,number:a.jerseyNumber,position:a.position,type,label:definition.label,status:definition.plays?'sideline':'out',atPlay:m.plays,returnAt:definition.plays?m.plays+definition.plays:null,replacement:{...backup}};
 m.events.push(e);m.lastInjury=m.plays;notice(g,e,'injury');return e;
}
export function injuryChance(g,carrier,tackler){if(!tackler)return 0;const relative=Math.hypot((carrier.vx||0)-(tackler.vx||0),(carrier.vz||0)-(tackler.vz||0));return clamp(.012+clamp(relative/16,0,1)*.016+(g.returnPlay?.kind ? .0015 : 0),.012,.03);}
export function completeMedicalPlay(g,reason,tackler=null){
 const m=g.medical;if(!m||m.lastResolved===m.serial)return;m.lastResolved=m.serial;m.plays++;
 for(const e of m.events)if(e.status==='sideline'&&m.plays>=e.returnAt){e.status='returned';notice(g,e,'return');}
 if(!m.enabled||g.practiceKicks||g.injuryTraining||g.ended||!['tackle','sack'].includes(reason)||!tackler||m.events.length>=3||m.plays-m.lastInjury<4)return;
 const carrier=g.actors[g.carrier];if(random(m)>=injuryChance(g,carrier,tackler))return;
 const candidates=[carrier,tackler];for(const a of g.actors)if(a.blocking!=null&&a.id!==carrier.id&&a.id!==tackler.id&&Math.hypot(a.x-carrier.x,a.z-carrier.z)<5){candidates.push(a);break;}
 const who=random(m),a=candidates[who<.55?0:who<.9||candidates.length===2?1:2],severity=random(m);
 createInjury(g,a,severity<.4?'ankle':severity<.75?'shoulder':severity<.94?'strain':'head');
}
export function substituteUnit(g,team,plans){
 return plans.map(plan=>{
  let p=plan.player,original=p;for(let i=0;i<3;i++){const e=currentInjury(g,team,p.id);if(!e)break;p=e.replacement;}
  return p===original?plan:{...plan,player:{...p,position:plan.player.position},number:p.number,backupFor:original.name};
 });
}
export function injuryTraining(g){
 if(g.multiplayer)return false;g.medical.enabled=true;g.injuryTraining=true;g.medical.plays=1;
 const e=[5,1,0,4].map(id=>g.actors[id]).reduce((found,a)=>found||createInjury(g,a,'shoulder'),null);if(!e)return false;
 g.phase='dead';g.phaseTime=0;g.nextOffense=g.offense;g.nextLine=g.line;g.nextGoal=g.goal;g.nextDown=1;g.event='SUBSTITUTION PRACTICE';g.detail=e.name+' sits out two plays. '+e.replacement.name+' comes in at the next whistle.';return true;
}
