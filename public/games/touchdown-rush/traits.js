import {TRAIT_STATS} from './trait-stats.js?v=traits1';
import {CURRENT_STATS,CURRENT_SEASON,CURRENT_CHECKED} from './season-stats.js?v=realism2026';
export const TRAITS_CHECKED=CURRENT_CHECKED;
export const TRAITS_SEASON=CURRENT_SEASON;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const score=n=>Math.round(clamp(n,55,99));
export const NEUTRAL_TRAITS=Object.freeze({speed:75,accuracy:75,hands:75,finish:75,tackle:75,scouted:false,notes:['Balanced starting point · limited position-specific data']});
// Original arcade speed estimates informed by public NFL tracking/combine reports.
// A combine sprint is not an exact present-day in-pads game speed.
const SPEED={
 '3116406':{value:99,note:'Classic speedster · NFL tracking reports',source:'https://www.nfl.com/news/next-gen-stats-leaders-who-s-fastest-who-s-most-efficient-0ap3000000756630'},
 '4683062':{value:99,note:'4.21-second combine 40 (2024)',source:'https://www.nfl.com/videos/xavier-worthy-runs-official-4-21-second-40-yard-dash-at-2024-combine'},
 '4047650':{value:96,note:'4.33-second combine 40 (2019)',source:'https://www.seahawks.com/news/dk-metcalf-just-a-dominant-player-in-seahawks-win-over-49ers'},
 '3117251':{value:88,note:'4.48-second combine 40 (2017)',source:'https://www.vikings.com/news/prospect-profile-stanford-rb-christian-mccaffrey-18711100'},
 '3916387':{value:95,note:'Explosive rushing QB · NFL tracking report',source:'https://www.nfl.com/_amp/lamar-jackson-dalvin-cook-among-nfl-s-10-most-explosive-runners'}
};
export function playerTraits(id,position=''){
 const current=CURRENT_STATS[id],currentRole=position||current?.position||TRAIT_STATS[id]?.position||'',cs=current?.stats||{};
 const enough=currentRole==='QB'?(cs.passingAttempts||0)>=40:['WR','TE'].includes(currentRole)?(cs.receivingTargets||0)>=15:['RB','FB'].includes(currentRole)?(cs.rushingAttempts||0)>=30&&(cs.gamesPlayed||0)>=4:(cs.gamesPlayed||0)>=4;
 const record=enough?current:TRAIT_STATS[id],season=enough?CURRENT_SEASON:2025,s=record?.stats||{},r={...NEUTRAL_TRAITS,notes:[],dataSeason:record?season:null},role=position||record?.position||'',gp=s.gamesPlayed||0,att=s.passingAttempts||0,targets=s.receivingTargets||0,rush=s.rushingAttempts||0;
 if(record&&season===2025)r.notes.push('2025 baseline · limited 2026 sample');
 if(role==='QB'&&att>=40){
  const completion=((s.completions||0)+.65*150)/(att+150);r.accuracy=score(75+(completion-.65)*300);r.scouted=true;r.notes.push(`${season}: ${((s.completions||0)/att*100).toFixed(1)}% completions · ${att} attempts`);
  if(gp>=4){r.speed=score(70+Math.min(25,(s.rushingYards||0)/gp*.65));r.notes.push('QB mobility estimated from rushing production');}
 }
 if(targets>=15){
  const expected=role==='RB'||role==='FB'?.75:role==='TE'?.68:.62;
  const reliability=((s.receptions||0)+expected*35)/(targets+35);
  r.hands=score(75+(reliability-expected)*130);r.scouted=true;r.notes.push(`${season}: ${s.receptions||0} catches / ${targets} targets`);
 }
 if((role==='RB'||role==='FB'||role==='QB')&&rush>=30&&gp>=4){
  const ypc=(s.rushingYards||0)/rush,production=((s.rushingYards||0)+(s.receivingYards||0))/gp,expected=role==='QB'?25:65;
  r.finish=score(75+(ypc-4.3)*5+(production-expected)*.22);r.scouted=true;r.notes.push(`${season}: ${ypc.toFixed(1)} rush average · ${rush} carries`);
 }
 if(['DE','DT','EDGE','LB','ILB','OLB','CB','DB','S','FS','SS'].includes(role)&&gp>=(season===2026?4:8)){
  const expected=['DE','DT','EDGE'].includes(role)?2.5:['CB','DB'].includes(role)?3:4.5;
  r.tackle=score(75+(((s.totalTackles||0)/gp)-expected)*3+Math.min(5,(s.sacks||0)/gp*4));r.scouted=true;r.notes.push(`${season}: ${s.totalTackles||0} tackles · ${gp} games`);
 }
 // McCaffrey's all-purpose production supports a finishing/receiving strength;
 // the extra-yard mechanic is an original game estimate, not measured contact yards.
 if(String(id)==='3117251'){r.finish=Math.max(r.finish,92);r.hands=Math.max(r.hands,90);r.notes.push('All-purpose finisher · 2025 production');}
 const speed=SPEED[id];if(speed){r.speed=speed.value;r.speedSource=speed.source;r.scouted=true;r.notes.push(speed.note);}
 if(!r.notes.length)r.notes=[...NEUTRAL_TRAITS.notes];
 r.source=record?'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/'+season+'/types/2/athletes/'+id+'/statistics/0':speed?.source||null;
 return r;
}
export const speedFactor=a=>1+((a?.traits?.speed??75)-75)*.0045;
export const accuracyFactor=a=>clamp(1+(75-(a?.traits?.accuracy??75))*.018,.6,1.4);
export const tackleFactor=a=>clamp(1+((a?.traits?.tackle??75)-75)*.0025,.95,1.06);
export function catchReach(a,base){return base*clamp(1+((a?.traits?.hands??75)-75)*.003,.94,1.06);}
export function traitRoll(serial,id,salt=0){let x=(Number(id)||1)^Math.imul((serial||0)+1,2654435761)^Math.imul(salt+1,1597334677);x=Math.imul(x^(x>>>16),2246822507);x=Math.imul(x^(x>>>13),3266489909);return ((x^(x>>>16))>>>0)/4294967296;}
export function dropsPass(g,receiver,pass){
 if(g.playerTraits===false)return false;const hands=receiver.traits?.hands??75;
 // Only below-baseline reliability adds a drop risk; ordinary reach/coverage still apply.
 const chance=clamp((75-hands)*.005,0,.1);return traitRoll(pass.id,receiver.playerId,37)<chance;
}
export function finishYards(g,carrier,defender){
 const finish=carrier.traits?.finish??75;if(g.playerTraits===false||finish<84)return 0;
 const chance=clamp(.3+(finish-84)*.025-((defender.traits?.tackle??75)-75)*.008,.12,.65);
 const roll=traitRoll(g.snapSerial,carrier.playerId,Number(defender.playerId)||defender.id);return roll<chance?1+Math.floor(traitRoll(g.snapSerial,carrier.playerId,91)*3):0;
}
export function traitStrengths(r){return Object.entries({Speed:r.speed,Accuracy:r.accuracy,Hands:r.hands,Finish:r.finish,Tackling:r.tackle}).filter(([,v])=>v>=84).map(([name])=>name);}
export function traitWeaknesses(r){return Object.entries({Speed:r.speed,Accuracy:r.accuracy,Hands:r.hands,Finish:r.finish,Tackling:r.tackle}).filter(([,v])=>v<70).map(([name])=>name);}
