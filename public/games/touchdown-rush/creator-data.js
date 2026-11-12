import {TEAMS,teamById} from './teams.js?v=realism2026';
import {gameRoster} from './classic.js?v=traits1';

export const CREATOR_KEY='archerbox-football-creators-v1';
export const MAX_TEAMS=6,MAX_PLAYERS=12;
export const CRESTS=[{id:'thunder',name:'Thunder'},{id:'shark',name:'Shark'},{id:'dragon',name:'Dragon'},{id:'knight',name:'Knight'}];
export const POSITIONS=[['QB','Quarterback'],['RB','Running back'],['WR','Wide receiver'],['TE','Tight end'],['LT','Left tackle'],['LG','Left guard'],['C','Center'],['RG','Right guard'],['RT','Right tackle'],['DE','Defensive end'],['DT','Defensive tackle'],['LB','Linebacker'],['CB','Cornerback'],['S','Safety'],['K','Kicker'],['P','Punter'],['LS','Long snapper']];
export const SKIN_TONES=['#f1c7a5','#dca681','#bd825f','#986344','#75452e','#4c2e23'];
export const PALETTES=[['Ocean','#087f9c','#ffd166'],['Voltage','#5428a7','#c5f45c'],['Flame','#bd313f','#ffcd70'],['Midnight','#172b4d','#6de3c5'],['Ice','#2273b5','#e5f5ff'],['Royal','#762ea4','#f2b8e2']];
const clean=(v,n)=>String(v??'').replace(/[<>\u0000-\u001f]/g,'').trim().replace(/\s+/g,' ').slice(0,n);
const bounded=(v,a,b,f)=>Number.isFinite(Number(v))?Math.round(Math.max(a,Math.min(b,Number(v)))):f;
const hex=(v,f)=>/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():f;
const customId=(v,prefix)=>typeof v==='string'&&new RegExp('^'+prefix+'-[a-z0-9-]{6,48}$').test(v)?v:null;
export const newId=prefix=>prefix+'-'+crypto.randomUUID();
export const crestUrl=id=>new URL('./creator-logos/'+(CRESTS.some(c=>c.id===id)?id:'thunder')+'.png',import.meta.url).href;
export function normalizeTeam(raw){
 if(!raw||typeof raw!=='object')return null;const id=customId(raw.id,'club'),city=clean(raw.city,24),nickname=clean(raw.nickname,24);if(!id||!city||!nickname)return null;
 const css=hex(raw.css,'#087f9c'),accentCss=hex(raw.accentCss,'#ffd166'),crest=CRESTS.some(c=>c.id===raw.crest)?raw.crest:'thunder';
 const color=parseInt(css.slice(1),16),accent=parseInt(accentCss.slice(1),16),mark=(city.split(' ').map(s=>s[0]).join('')+nickname.replace(/[^a-z0-9]/gi,'')).slice(0,3).toUpperCase()||'CLB';
 return {id,city,nickname,name:city+' '+nickname,shortName:nickname,mark,conference:'CUSTOM',custom:true,crest,css,accentCss,color,accent,helmetColor:color,numberColor:'#ffffff'};
}
export function normalizePlayer(raw,teams=[]){
 if(!raw||typeof raw!=='object')return null;const id=customId(raw.id,'athlete'),name=clean(raw.name,28),position=POSITIONS.some(([p])=>p===raw.position)?raw.position:null,team=teamById(raw.team)||teams.find(t=>t.id===raw.team);
 if(!id||!name||!position||!team)return null;
 return {id,name,position,team:team.id,height:bounded(raw.height,54,90,72),weight:bounded(raw.weight,100,380,220),number:bounded(raw.number,0,99,12),skinTone:SKIN_TONES.includes(raw.skinTone)?raw.skinTone:SKIN_TONES[2],accuracy:position==='QB'?bounded(raw.accuracy,55,99,82):75};
}
export function restoreCreations(raw){
 const teams=[],players=[];
 for(const item of (Array.isArray(raw?.teams)?raw.teams:[]).slice(0,MAX_TEAMS)){const t=normalizeTeam(item);if(t&&!teams.some(x=>x.id===t.id))teams.push(t);}
 for(const item of (Array.isArray(raw?.players)?raw.players:[]).slice(0,MAX_PLAYERS)){const p=normalizePlayer(item,teams);if(p&&!players.some(x=>x.id===p.id))players.push(p);}
 return {teams,players};
}
export function readCreations(storage){try{return restoreCreations(JSON.parse(storage.getItem(CREATOR_KEY)||'{}'));}catch{return restoreCreations({});}}
export function saveCreations(storage,data){const next=restoreCreations(data);storage.setItem(CREATOR_KEY,JSON.stringify(next));return next;}
export const allTeams=data=>[...TEAMS,...(data?.teams||[])];
export const resolveTeam=(id,data)=>teamById(id)||data?.teams?.find(t=>t.id===id);
export function playerProfile(p){const base=['LT','LG','C','RG','RT','DT'].includes(p.position)?315:p.position==='DE'?270:p.position==='LB'||p.position==='TE'?245:215;return {id:p.id,height:p.height,weight:p.weight,face:null,measured:false,custom:true,mass:Math.max(.86,Math.min(1.18,Math.pow(p.weight/base,.42))),heightYards:(p.height+3)/36,skinTone:p.skinTone};}
export function createdTraits(p){return {speed:Math.max(64,Math.min(88,82-Math.round((p.weight-190)/15))),accuracy:p.position==='QB'?bounded(p.accuracy,55,99,82):75,hands:['WR','TE','RB'].includes(p.position)?82:75,finish:78,tackle:['DE','DT','LB','CB','S'].includes(p.position)?82:75,scouted:false,custom:true,notes:['Created athlete · original game abilities.','Build affects size and speed.',...(p.position==='QB'?['Passing accuracy chosen in the player creator.']:[])]};}
const offenseRoles=['QB','WR','WR','WR','TE','RB','LT','LG','C','RG','RT'],defenseRoles=['DE','DT','DT','DE','LB','LB','LB','CB','CB','S','S'];
const first=['Jett','Nova','Blaze','Echo','Axel','Kai','Volt','Ace','Riley','Zane','Sky','Cruz'];
const last=['Stone','Reed','Brooks','Lane','Cross','West','Hayes','Banks','Wells','Cole','King','Fox'];
function fictionalRoster(t){
 let serial=0;const occupied=new Set();
 const person=(position,depthSlot)=>{let number=(serial*7+11)%100;while(occupied.has(number))number=(number+1)%100;occupied.add(number);const i=serial++;return {id:t.id+'-cpu-'+i,name:first[i%12]+' '+last[Math.floor(i/12)%12],shortName:first[i%12][0]+'. '+last[Math.floor(i/12)%12],number,position,depthSlot};};
 const offense=offenseRoles.map((role,i)=>person(role,['qb','wr1','wr2','wr3','te','rb','lt','lg','c','rg','rt'][i]));
 const defense=defenseRoles.map((role,i)=>person(role,'def-'+i));
 const K=person('K','k'),P=person('P','p'),LS=person('LS','ls');
 const reserves={players:[],bySlot:{}};for(const p of [...offense,...defense,K,P,LS]){const backup=person(p.position,p.depthSlot);reserves.players.push(backup);reserves.bySlot[p.depthSlot]=[backup.id];}
 return {offense,defense,specialTeams:{K,P,H:P,LS,KR:offense[1],PR:offense[2],sourcePage:null},reserves,custom:true};
}
export function rosterForTeam(team,data,classicHill=false){
 if(!team)throw Error('Choose a football team.');
 const r=team.custom?fictionalRoster(team):JSON.parse(JSON.stringify(gameRoster(team.id,classicHill)));
 const usedSlots=new Set();
 for(const p of (data?.players||[]).filter(p=>p.team===team.id)){
  const unit=offenseRoles.includes(p.position)?'offense':defenseRoles.includes(p.position)?'defense':'specialTeams';
  const key=unit==='specialTeams'?p.position:r[unit].findIndex((a,i)=>(unit==='offense'?offenseRoles:defenseRoles)[i]===p.position&&!usedSlots.has(unit+':'+i));
  if(key===-1||usedSlots.has(unit+':'+key))continue;usedSlots.add(unit+':'+key);
  const prior=r[unit][key],words=p.name.split(' '),created={...prior,id:p.id,name:p.name,shortName:words.length>1?words[0][0]+'. '+words.slice(1).join(' '):p.name,number:p.number,position:p.position,customProfile:playerProfile(p),customTraits:createdTraits(p),created:true};
  // Swap a conflicting teammate's number so every on-field unit stays unique.
  for(const list of [r.offense,r.defense])for(const other of list)if(other.id!==prior.id&&other.number===p.number)other.number=prior.number;
  r[unit][key]=created;
  for(const role of ['K','P','H','LS','KR','PR'])if(r.specialTeams[role]?.id===prior.id)r.specialTeams[role]=created;
 }
 for(const unit of ['offense','defense']){
  const numbers=new Set();for(const p of [...r[unit]].sort((a,b)=>Number(!!b.created)-Number(!!a.created))){if(numbers.has(p.number)){let n=0;while(numbers.has(n))n++;p.number=n;}numbers.add(p.number);}
 }
 return r;
}
export function validatePlayerSlot(p,data){
 const slots={WR:3,DE:2,DT:2,LB:3,CB:2,S:2};
 const peers=data.players.filter(x=>x.id!==p.id&&x.team===p.team&&x.position===p.position);
 if(peers.length>=(slots[p.position]||1))throw Error('That position is full. Edit your saved player or choose another team or position.');
 if(data.players.some(x=>x.id!==p.id&&x.team===p.team&&x.number===p.number))throw Error('Another created player on this team has that number. Choose a different jersey number.');
}
export function normalizeFootballConfig(raw={}){
 const customTeam=normalizeTeam(raw.customTeam),teams=customTeam?[customTeam]:[],team=resolveTeam(raw.team,{teams})||TEAMS[0];
 const players=restoreCreations({teams,players:raw.createdPlayers}).players.filter(p=>p.team===team.id);
 return {team:team.id,customTeam:team.custom?team:null,createdPlayers:players};
}
