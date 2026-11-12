import assert from 'node:assert/strict';
import * as f from '../public/fantasy/rules.js';
// In-memory UI harness exercises the actual click handlers without touching any
// saved browser profile or hosted league.
const storage=new Map(),root={hidden:true,scrollTop:0,innerHTML:'',contains(){return false;},querySelector(){return null;},insertAdjacentHTML(){},setAttribute(){},replaceChildren(){this.innerHTML='';}};
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
globalThis.document={getElementById:()=>root};
let poll,online=null,gone=false;
globalThis.setInterval=fn=>{poll=fn;return 1;};globalThis.clearInterval=()=>{};
globalThis.fetch=async(url,opts={})=>{
 if(url==='/api/social/profile')return Response.json({});
 if(url.endsWith('/state'))return Response.json({pool:[],player:null,leagues:online&&!gone?[{id:online.id,name:online.name,phase:online.phase,week:online.week}]:[]});
 if(url.endsWith('/league/'+online?.id)){
  if(gone)return Response.json({error:'League not found.'},{status:404});
  if(opts.method==='POST'){assert.equal(JSON.parse(opts.body).action,'weekFinish');gone=true;return Response.json({deleted:true,league:null,myTeam:null,champion:'Archer Champions'});}
  return Response.json({league:online,myTeam:online.owner});
 }
 throw Error('Unexpected test request: '+url);
};
const {openFantasy,closeFantasy}=await import('../public/fantasy/app.js');
const input={profile:()=>({name:'Archer',color:'#aabbcc'}),onBack(){},onPlay(){}};
async function click(dataset){root.onclick({target:{closest:()=>({dataset,disabled:false})}});await new Promise(setImmediate);}
const keys={archerbox:'archerbox-fantasy-practice-v1',nfl:'archerbox-fantasy-nfl-v1'};
await openFantasy(input);
for(const mode of ['archerbox','nfl']){
 await click({do:mode==='nfl'?'demo':'arcadeDemo'});await click({action:'draftStart'});await click({do:'auto'});
 assert.equal(JSON.parse(storage.get(keys[mode])).phase,'lineup');
 for(let week=1;week<=6;week++){
  await click({action:'weekStart'});assert.equal(JSON.parse(storage.get(keys[mode])).phase,'live');
  if(week===6)assert.match(root.innerHTML,/Finishing the championship deletes this league/);
  await click({action:'weekFinish'});
  if(week<6)assert.equal(JSON.parse(storage.get(keys[mode])).phase,'lineup');
 }
 assert(!storage.has(keys[mode]),mode+' practice season is removed');assert.match(root.innerHTML,/won the championship!/);assert.match(root.innerHTML,/The league was deleted/);assert.match(root.innerHTML,/Try an NFL draft/);
 await click({do:mode==='nfl'?'demo':'arcadeDemo'});const fresh=JSON.parse(storage.get(keys[mode]));assert.equal(fresh.week,0);assert.equal(fresh.phase,'lobby');
 await click({do:'home'});
}
function finalLeague(){const l=f.createLeague({id:'saved-test',managerId:'me',managerName:'Archer',demo:true});f.startDraft(l,[],1);l.teams[0].auto=true;f.tickDraft(l,1);for(let w=1;w<=5;w++){f.startWeek(l,w*10);f.finishWeek(l,w*10+1);}f.startWeek(l,60);return l;}
online=finalLeague();await click({league:online.id});assert.match(root.innerHTML,/Finish Week 6/);await click({action:'weekFinish'});assert.match(root.innerHTML,/Archer Champions won the championship!/);assert.match(root.innerHTML,/Try an NFL draft/);assert(!root.innerHTML.includes('data-league="saved-test"'));
gone=false;online=finalLeague();await click({league:online.id});gone=true;await poll();assert.match(root.innerHTML,/The league was deleted/);assert.match(root.innerHTML,/Try an NFL draft/,'another manager’s old screen returns home when the league disappears');
const complete=finalLeague();f.finishWeek(complete,61);for(const key of Object.values(keys))storage.set(key,JSON.stringify({...complete,demo:true}));closeFantasy();await openFantasy(input);for(const key of Object.values(keys))assert(!storage.has(key),'previously completed practice data is cleared');closeFantasy();
console.log('Fantasy cleanup UI passed: both practice modes, fresh starts, championship notice, saved-league completion, stale-client recovery and old practice cleanup.');
