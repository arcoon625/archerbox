import {rollWeather,normalizeWeather} from './weather.js?v=seasons1';
export const SEASON_KEY='archerbox-football-season-v1';
export const REGULAR_WEEKS=17;
export function seededRandom(seed) {
 let state=seed>>>0;
 return ()=>{state=(state+0x6D2B79F5)>>>0;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
}
export function makeSchedule(ids,seed) {
 const random=seededRandom(seed),ring=ids.slice();
 for(let i=ring.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ring[i],ring[j]]=[ring[j],ring[i]];}
 const weeks=[];
 for(let week=0;week<REGULAR_WEEKS;week++){
  weeks.push(Array.from({length:ring.length/2},(_,i)=>{const pair=[ring[i],ring[ring.length-1-i]];if((week+i)%2)pair.reverse();return {id:`regular-${seed>>>0}-${week}-${i}`,home:pair[0],away:pair[1],score:null,weather:rollWeather(random)};}));
  ring.splice(1,0,ring.pop());
 }
 return weeks;
}
export function createSeason(teams,teamId,{seed=crypto.getRandomValues(new Uint32Array(1))[0],number=1,titles=0,difficulty='pro'}={}) {
 if(teams.length!==32||!teams.some(t=>t.id===teamId))throw Error('Choose an NFL team for your season.');
 return {version:1,id:`season-${seed>>>0}-${number}`,seed:seed>>>0,number,titles,teamId,difficulty,teams:teams.map(({id,name,shortName,mark,conference})=>({id,name,shortName,mark,conference})),weeks:makeSchedule(teams.map(t=>t.id),seed),week:0,stage:'regular',playoffs:[],seeds:null,champion:null,inProgress:null};
}
export function standings(season,conference) {
 const rows=season.teams.filter(t=>!conference||t.conference===conference).map(t=>({...t,wins:0,losses:0,for:0,against:0})),map=new Map(rows.map(t=>[t.id,t]));
 for(const match of season.weeks.flat())if(match.score){const [h,a]=match.score;for(const [id,pf,pa] of [[match.home,h,a],[match.away,a,h]]){const row=map.get(id);if(row){row.wins+=pf>pa?1:0;row.losses+=pf<pa?1:0;row.for+=pf;row.against+=pa;}}}
 return rows.sort((a,b)=>b.wins-a.wins||(b.for-b.against)-(a.for-a.against)||b.for-a.for||a.id.localeCompare(b.id));
}
export const roundMatches=s=>s.stage==='regular'?s.weeks[s.week]:s.playoffs.at(-1)?.matches||[];
export const currentFixture=s=>s&&!s.champion?roundMatches(s)?.find(m=>!m.score&&(m.home===s.teamId||m.away===s.teamId))||null:null;
export const stageLabel=s=>s.stage==='regular'?`Week ${s.week+1} / ${REGULAR_WEEKS}`:({wildcard:'Wild Card',divisional:'Divisional Round',conference:'Conference Championship',championship:'Championship',complete:'Season Complete'}[s.stage]||'Season');
const winner=m=>m.score[0]>m.score[1]?m.home:m.away;
function playoffMatch(s,stage,index,home,away) {
 return {id:`${s.id}-${stage}-${index}`,home,away,score:null,weather:rollWeather(seededRandom(s.seed+7919*(s.playoffs.length+1)+index*137))};
}
function enterPlayoffs(s) {
 s.seeds=Object.fromEntries(['AFC','NFC'].map(c=>[c,standings(s,c).slice(0,7).map(t=>t.id)]));
 s.stage='wildcard';const matches=[];
 for(const seeds of Object.values(s.seeds))for(const [a,b] of [[1,6],[2,5],[3,4]])matches.push(playoffMatch(s,s.stage,matches.length,seeds[a],seeds[b]));
 s.playoffs.push({stage:s.stage,matches});
}
function nextPlayoffRound(s) {
 const won=s.playoffs.at(-1).matches.map(winner),matches=[];
 if(s.stage==='championship'){s.champion=won[0];s.stage='complete';if(s.champion===s.teamId)s.titles++;return;}
 const next={wildcard:'divisional',divisional:'conference',conference:'championship'}[s.stage];
 if(next==='championship')matches.push(playoffMatch(s,next,0,won[0],won[1]));
 else for(const seeds of Object.values(s.seeds)){
  const remaining=won.filter(id=>seeds.includes(id));if(s.stage==='wildcard')remaining.push(seeds[0]);remaining.sort((a,b)=>seeds.indexOf(a)-seeds.indexOf(b));
  if(remaining.length===4)for(const [a,b] of [[0,3],[1,2]])matches.push(playoffMatch(s,next,matches.length,remaining[a],remaining[b]));
  else matches.push(playoffMatch(s,next,matches.length,remaining[0],remaining[1]));
 }
 s.stage=next;s.playoffs.push({stage:next,matches});
}
function simulate(s,match) {
 let hash=s.seed;for(const char of match.id)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 const r=seededRandom(hash),h=7+Math.floor(r()*29),a=7+Math.floor(r()*29);return [h,a===h?a+3:a];
}
export function advanceSeason(s,score=null,fixtureId=null) {
 if(s.champion)return false;
 const fixture=currentFixture(s);
 if(fixture){
  if(fixtureId!==fixture.id||!Array.isArray(score)||score.length!==2||score.some(n=>!Number.isInteger(n)||n<0||n>200)||score[0]===score[1])return false;
  fixture.score=fixture.home===s.teamId?score.slice():[score[1],score[0]];
 }else if(score!==null)return false;
 for(const match of roundMatches(s))if(!match.score)match.score=simulate(s,match);
 s.inProgress=null;
 if(s.stage==='regular'){if(++s.week===REGULAR_WEEKS)enterPlayoffs(s);}else nextPlayoffRound(s);
 return true;
}
export function restoreSeason(raw,teams) {
 try{
  if(raw?.version!==1||typeof raw.id!=='string'||!Number.isSafeInteger(raw.number)||raw.number<1||!['rookie','pro','allstar'].includes(raw.difficulty)||!teams.some(t=>t.id===raw.teamId)||raw.teams?.length!==32||raw.weeks?.length!==REGULAR_WEEKS||!Array.isArray(raw.playoffs)||raw.playoffs.length>4||!Number.isInteger(raw.week)||raw.week<0||raw.week>REGULAR_WEEKS||!['regular','wildcard','divisional','conference','championship','complete'].includes(raw.stage))return null;
  const ids=new Set(teams.map(t=>t.id));if(raw.teams.some(t=>!ids.has(t.id))||new Set(raw.teams.map(t=>t.id)).size!==32)return null;
  const fixtures=[...raw.weeks.flat(),...raw.playoffs.flatMap(r=>r.matches)];
  if(new Set(fixtures.map(m=>m.id)).size!==fixtures.length||raw.stage==='regular'&&(raw.week>=REGULAR_WEEKS||raw.playoffs.length))return null;
  if(raw.stage!=='regular'){
   if(raw.week!==REGULAR_WEEKS||!raw.seeds||!['AFC','NFC'].every(c=>raw.seeds[c]?.length===7&&new Set(raw.seeds[c]).size===7&&raw.seeds[c].every(id=>teams.some(t=>t.id===id&&t.conference===c))))return null;
   if(raw.playoffs.some((r,i)=>r.stage!==['wildcard','divisional','conference','championship'][i]||r.matches.length!==[6,4,2,1][i]))return null;
   if(raw.stage==='complete'?raw.playoffs.length!==4||!ids.has(raw.champion):raw.playoffs.at(-1)?.stage!==raw.stage)return null;
  }
  if(fixtures.some(m=>!ids.has(m.home)||!ids.has(m.away)||m.home===m.away||m.score&&(!Array.isArray(m.score)||m.score.length!==2||m.score.some(n=>!Number.isInteger(n)||n<0||n>200)||m.score[0]===m.score[1])))return null;
  if(raw.weeks.some(w=>w.length!==16||new Set(w.flatMap(m=>[m.home,m.away])).size!==32))return null;
  for(const m of fixtures)m.weather=normalizeWeather(m.weather);
  return raw;
 }catch{return null;}
}
