import * as f from '../public/fantasy/rules.js';
import {getNflWeek} from './nfl-fantasy.js';
import {applyNflScores} from '../public/fantasy/nfl-source.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
const getPlayer=(db,user)=>db.prepare('SELECT f.*,p.name,p.color FROM fantasy_players f JOIN social_profiles p ON p.id=f.user_id WHERE f.user_id=?').bind(user).first();
const publicPlayer=p=>({id:p.public_id,name:p.name,color:p.color,position:p.position,kind:'human',rating:null,projection:0});
async function pool(db){return (await db.prepare('SELECT f.public_id,f.position,p.name,p.color FROM fantasy_players f JOIN social_profiles p ON p.id=f.user_id ORDER BY f.created LIMIT 200').all()).results.map(publicPlayer);}
async function records(db,l,end=l.active?.end){if(!l.active)return [];const query=end==null?db.prepare('SELECT player_id,stats,completed FROM fantasy_results WHERE completed>=? ORDER BY completed LIMIT 2000').bind(l.active.start):db.prepare('SELECT player_id,stats,completed FROM fantasy_results WHERE completed>=? AND completed<? ORDER BY completed LIMIT 2000').bind(l.active.start,end);return (await query.all()).results.map(r=>({player:r.player_id,stats:JSON.parse(r.stats),completed:r.completed}));}
async function memberLeagues(db,managerId){
 const rows=(await db.prepare("SELECT id,data,version FROM fantasy_leagues WHERE EXISTS (SELECT 1 FROM json_each(fantasy_leagues.data,'$.teams') WHERE json_extract(value,'$.managerId')=?) ORDER BY updated DESC").bind(managerId).all()).results,leagues=[];
 for(const row of rows){const l=JSON.parse(row.data);if(f.championshipFinished(l)){await db.prepare('DELETE FROM fantasy_leagues WHERE id=? AND version=?').bind(row.id,row.version).run();}else leagues.push(l);}
 return leagues;
}
async function deleteFinished(db,l,version){
 const result=await db.prepare('DELETE FROM fantasy_leagues WHERE id=? AND version=?').bind(l.id,version).run();
 return result.meta.changes?{deleted:true,league:null,myTeam:null,champion:f.team(l,l.champion).name}:null;
}
async function checkLeagueLimit(db,managerId){
 const leagues=await memberLeagues(db,managerId);
 if(leagues.length>=12)f.fail('You can join up to twelve leagues. Finish an existing league first.');
}
async function updateLeague(db,id,me,action,nflProvider){
 for(let attempt=0;attempt<5;attempt++){
  const row=await db.prepare('SELECT * FROM fantasy_leagues WHERE id=?').bind(id).first();if(!row)f.fail('League not found.',404);const l=JSON.parse(row.data),t=l.teams.find(t=>t.managerId===me.public_id);if(!t)f.fail('Join this league with its code first.',403);
  if(f.championshipFinished(l)){const deleted=await deleteFinished(db,l,row.version);if(deleted)return deleted;continue;}
  const now=Date.now();f.manualWeeks(l);f.tickDraft(l,now);f.processWaivers(l,now);if(l.mode==='nfl'&&l.phase==='live'){try{applyNflScores(l,await nflProvider(l.active.nflWeek));}catch{if(l.active.source)l.active.source.fallback=true;}}else f.refreshScores(l,await records(db,l));if(action)await action(l,t,now);
  if(f.championshipFinished(l)){const deleted=await deleteFinished(db,l,row.version);if(deleted)return deleted;continue;}
  f.tickDraft(l,now);const result=await db.prepare('UPDATE fantasy_leagues SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(l),now,id,row.version).run();if(result.meta.changes)return {league:l,myTeam:t.id};
 }f.fail('Another manager just made a move. Please try again.',409);
}
export async function recordFantasyResult(db,room){
 if(room.game!=='touchdown-rush'||room.status!=='finished'||!room.match?.ended||!room.match.multiplayer)return;
 const keys=['passingYards','passingTouchdowns','rushingYards','rushingTouchdowns','receivingYards','receivingTouchdowns','passes','interceptionsThrown','tackles','interceptions','sacks','fieldGoals','extraPoints','returnTouchdowns'];
 const statements=[];for(let seat=0;seat<2;seat++){const profile=await getPlayer(db,room.players[seat].id);if(!profile)continue;const source=room.match.statsByTeam?.[seat]||{},stats={};for(const key of keys)stats[key]=Math.max(-500,Math.min(5000,Number(source[key])||0));stats.win=room.match.scores[seat]>room.match.scores[1-seat]?1:0;statements.push(db.prepare('INSERT OR IGNORE INTO fantasy_results (room_id,player_id,stats,completed) VALUES (?,?,?,?)').bind(room.id,profile.public_id,JSON.stringify(stats),Date.now()));}
 if(statements.length)await db.batch(statements);
}
export async function handleFantasy(request,db,{nflProvider=getNflWeek}={}){try{
 const url=new URL(request.url),parts=url.pathname.replace(/^\/api\/fantasy\/?/,'').split('/'),user=request.headers.get('oai-authenticated-user-id');
 if(!user)return json({error:'Sign in to save leagues and play with friends.',signIn:'/signin-with-chatgpt?return_to=/#fantasy'},401);if(!db)f.fail('Fantasy is starting up. Try again shortly.',503);
 if(!['GET','POST'].includes(request.method))f.fail('Use GET or POST.',405);
 let body={};if(request.method==='POST'){if(request.headers.get('Origin')!==url.origin)f.fail('Open Fantasy from Archerbox.',403);if(!request.headers.get('content-type')?.startsWith('application/json'))f.fail('Send JSON.',415);if(Number(request.headers.get('content-length'))>4096)f.fail('That message is too large.',413);const raw=await request.text();if(raw.length>4096)f.fail('That message is too large.',413);try{body=JSON.parse(raw);}catch{f.fail('Invalid message.');}if(!body||typeof body!=='object'||Array.isArray(body))f.fail('Invalid message.');}
 if(parts[0]==='nfl'&&request.method==='GET'){try{return json({week:await nflProvider(Number(url.searchParams.get('week')||1),{refresh:url.searchParams.get('refresh')==='1'})});}catch(e){f.fail(e.message,503);}}
 const social=await db.prepare('SELECT name,color FROM social_profiles WHERE id=?').bind(user).first();if(!social)f.fail('Save an Archerbox profile first.',428);
 let me=await getPlayer(db,user);
 if(parts[0]==='register'&&request.method==='POST'){
  if(!f.POSITIONS.includes(body.position))f.fail('Choose your fantasy position.');
  if(!me)await db.prepare('INSERT OR IGNORE INTO fantasy_players (user_id,public_id,position,created) VALUES (?,?,?,?)').bind(user,crypto.randomUUID(),body.position,Date.now()).run();
  me=await getPlayer(db,user);return json({player:publicPlayer(me)});
 }
 if(parts[0]==='state'&&request.method==='GET'){
  const leagues=me?(await memberLeagues(db,me.public_id)).slice(0,12).map(l=>({id:l.id,name:l.name,phase:l.phase,week:l.week,mode:l.mode||'archerbox'})):[];
  return json({player:me?publicPlayer(me):null,pool:await pool(db),leagues});
 }
 if(!me)f.fail('Join the player pool to create or join a league.',428);
 if(parts[0]==='create'&&request.method==='POST'){
  await checkLeagueLimit(db,me.public_id);
  for(let i=0;i<5;i++){const code=Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join(''),l=f.createLeague({id:crypto.randomUUID(),code,name:body.name,managerId:me.public_id,managerName:me.name,teamName:body.teamName,mode:body.mode||'archerbox'});try{await db.prepare('INSERT INTO fantasy_leagues (id,code,data,version,updated) VALUES (?,?,?,0,?)').bind(l.id,l.code,JSON.stringify(l),Date.now()).run();return json({league:l,myTeam:l.owner});}catch(e){if(!String(e).includes('UNIQUE'))throw e;}}
  f.fail('Try creating the league again.',503);
 }
 if(parts[0]==='join'&&request.method==='POST'){
  const code=String(body.code||'').trim().toUpperCase();if(!/^[A-Z0-9]{8}$/.test(code))f.fail('Enter the eight letters and numbers in the league code.');const row=await db.prepare('SELECT id FROM fantasy_leagues WHERE code=?').bind(code).first();if(!row)f.fail('No league has that code.',404);
  for(let attempt=0;attempt<5;attempt++){
   const r=await db.prepare('SELECT * FROM fantasy_leagues WHERE id=?').bind(row.id).first();if(!r)f.fail('This league has finished and was deleted. Ask for a new code.',404);
   const l=JSON.parse(r.data),existing=l.teams.find(t=>t.managerId===me.public_id);
   if(f.championshipFinished(l)){if(existing)await deleteFinished(db,l,r.version);f.fail('This league has finished. Ask for a new code.',404);}
   if(!existing)await checkLeagueLimit(db,me.public_id);
   f.joinLeague(l,{managerId:me.public_id,managerName:me.name,teamName:body.teamName},Date.now());
   const saved=await db.prepare('UPDATE fantasy_leagues SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(l),Date.now(),r.id,r.version).run();if(saved.meta.changes)return json({league:l,myTeam:l.teams.find(t=>t.managerId===me.public_id).id});
  }f.fail('The league is busy. Please retry.',409);
 }
 if(parts[0]==='league'&&parts[1])return json(await updateLeague(db,parts[1],me,request.method==='GET'?null:async(l,t,now)=>{
  const owner=()=>{if(t.id!==l.owner)f.fail('Only the league creator can do that.',403);};
  switch(body.action){
   case 'draftStart':owner();f.startDraft(l,await pool(db),now);break;
   case 'pick':f.pick(l,t.id,body.player,now);break;
   case 'auto':t.auto=body.enabled===true;break;
   case 'lineup':f.setLineup(l,t.id,body.lineup);break;
   case 'optimize':if(l.phase!=='lineup')f.fail('Lineups are locked.');f.autoLineup(l,t);break;
   case 'add':f.acquire(l,t.id,body.player,body.drop,now);break;
   case 'trade':f.offerTrade(l,t.id,body.to,body.give,body.get,now);break;
   case 'respondTrade':f.respondTrade(l,t.id,body.trade,body.accept===true,now);break;
   case 'weekStart':{owner();if(l.mode==='nfl'){const week=Number(body.nflWeek||f.nextNflWeek(l));let data;try{data=await nflProvider(week);}catch(e){f.fail(e.message,503);}f.startWeek(l,now,{nflWeek:week,nflData:data});}else f.startWeek(l,now);break;}
   case 'nflRefresh':if(l.mode!=='nfl'||l.phase!=='live')f.fail('Start an NFL scoring week first.');try{applyNflScores(l,await nflProvider(l.active.nflWeek,{refresh:true}));}catch(e){f.fail(e.message,503);}break;
   case 'weekFinish':owner();if(l.phase!=='live')f.fail('Start a week before finishing it.');if(l.mode==='nfl'){try{applyNflScores(l,await nflProvider(l.active.nflWeek,{refresh:true}));}catch{f.fail('NFL points could not be checked. Refresh them, then finish the week.',503);}}else f.refreshScores(l,await records(db,l,now));f.finishWeek(l,now);break;
   default:f.fail('Unknown fantasy action.');
  }
 },nflProvider));
 f.fail('Fantasy page not found.',404);
 }catch(e){const status=e.status||500;if(status===500)console.error('Fantasy API:',e);return json({error:status===500?'Fantasy could not connect. Please try again.':e.message},status);}}
