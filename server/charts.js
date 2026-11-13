import {DAY,METRICS,metricFor,periodStart,scoreEvent,validRun} from '../public/charts/rules.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
const previousProgress='COALESCE((SELECT progress FROM chart_progress WHERE user_id=? AND game=? AND run=? AND event=?),0)';
const boardCTE=`WITH totals AS (SELECT s.user_id,SUM(s.points) AS score,MAX(s.created) AS reached FROM chart_scores s WHERE s.game=? AND s.created>=? GROUP BY s.user_id), ranked AS (SELECT user_id,score,ROW_NUMBER() OVER (ORDER BY score DESC,reached ASC,user_id ASC) AS rank FROM totals WHERE score>0)`;
async function leaderboard(db,game,period,id,t){
 const start=periodStart(period,t),args=[game,start];
 const rows=(await db.prepare(`${boardCTE} SELECT r.rank,r.score,p.name,p.color,r.user_id=? AS you FROM ranked r JOIN social_profiles p ON p.id=r.user_id ORDER BY r.rank LIMIT 50`).bind(...args,id||'').all()).results;
 const total=await db.prepare(`${boardCTE} SELECT COUNT(*) AS count FROM ranked`).bind(...args).first();
 const own=id?await db.prepare(`${boardCTE} SELECT r.rank,r.score,p.name,p.color,1 AS you FROM ranked r JOIN social_profiles p ON p.id=r.user_id WHERE r.user_id=?`).bind(...args,id).first():null;
 const clean=r=>r?{rank:r.rank,score:r.score,name:r.name,color:/^#[a-f0-9]{6}$/i.test(r.color)?r.color:'#c0f16b',you:!!r.you}:null;
 return {game,period,metric:metricFor(game).label,start,asOf:t,totalPlayers:total.count,signedIn:!!id,entries:rows.map(clean),yourEntry:clean(own)};
}
async function trending(db,t){
 const end=Math.floor(t/DAY)*DAY,start=end-6*DAY,previous=start-7*DAY;
 const rows=(await db.prepare(`SELECT game,COUNT(DISTINCT CASE WHEN day>=? THEN user_id END) AS players,COUNT(DISTINCT CASE WHEN day<? THEN user_id END) AS previous FROM chart_plays WHERE day>=? GROUP BY game`).bind(start,start,previous).all()).results;
 const days=(await db.prepare('SELECT game,day,COUNT(*) AS players FROM chart_plays WHERE day>=? GROUP BY game,day').bind(start).all()).results;
 const games=METRICS.map((m,order)=>{const row=rows.find(r=>r.game===m.game);return {game:m.game,players:row?.players||0,previous:row?.previous||0,order,daily:Array.from({length:7},(_,i)=>days.find(d=>d.game===m.game&&d.day===start+i*DAY)?.players||0)}}).sort((a,b)=>b.players-a.players||a.order-b.order).map(({order,...g})=>g);
 return {asOf:t,start,end:end+DAY,games};
}
async function checkRoom(db,id,game,run,progress,getRoomScore){
 if(!run.startsWith('room:'))return;
 if(getRoomScore){
  const live=await getRoomScore(id,run.slice(5));
  if(live.game!==game)fail('That match is for another game.');
  if(game==='neon-clash'&&progress>live.kills)fail('Those kills are not in this match yet.');
  return;
 }
 const row=await db.prepare('SELECT host,guest,data FROM social_rooms WHERE id=?').bind(run.slice(5)).first();
 if(!row||(row.host!==id&&row.guest!==id))fail('That match does not belong to you.',403);
 const room=JSON.parse(row.data);if((room.game||'turbo-kart-racing')!==game)fail('That match is for another game.');
 if(game==='neon-clash'){
  const seat=room.players.findIndex(p=>p.id===id),actor=room.match?.actors?.find(a=>a.seat===seat&&a.human);
  if(!actor||progress>actor.kills)fail('Those kills are not in this match yet.');
 }
}
async function progress(db,id,body,t,getRoomScore){
 const {game,event,run,progress:incoming,session}=body,rule=scoreEvent(game,event,incoming);
 if(!rule||!validRun(run)||typeof session!=='string'||session.length>80)fail('Choose a valid achievement.');
 const active=await db.prepare('SELECT * FROM chart_sessions WHERE id=? AND user_id=? AND game=?').bind(session,id,game).first();
 if(!active)fail('Open this game to start tracking.',403);
 if(t-active.started>12*60*60*1000)fail('Start a fresh tracking session.',410);
 await checkRoom(db,id,game,run,incoming,getRoomScore);
 const keys=[id,game,run,event],old=await db.prepare('SELECT progress FROM chart_progress WHERE user_id=? AND game=? AND run=? AND event=?').bind(...keys).first();
 if(incoming<=(old?.progress||0))return {ok:true,added:0};
 // Generous sanity limits for browser-reported solo results. Friend Rivals kills also use the saved match above.
 const allowance=Math.floor(rule.metric.burst+Math.max(0,t-active.started)/60000*rule.metric.perMinute),hourly=rule.metric.perMinute*60+rule.metric.burst;
 const eventId=crypto.randomUUID();
 const inserted=db.prepare(`INSERT INTO chart_scores (id,user_id,game,session_id,event,run,progress,amount,points,created)
 SELECT ?,?,?,?,?,?,?,delta,delta*?,? FROM (SELECT ?-${previousProgress} AS delta)
 WHERE delta>0 AND delta+COALESCE((SELECT SUM(amount) FROM chart_scores WHERE session_id=?),0)<=?
 AND delta+COALESCE((SELECT SUM(amount) FROM chart_scores WHERE user_id=? AND game=? AND created>=?),0)<=?`).bind(eventId,id,game,session,event,run,incoming,rule.weight,t,incoming,...keys,session,allowance,id,game,t-3600000,hourly);
 // D1 batch is a transaction. Re-read cumulative progress inside INSERT so concurrent retries cannot double-count.
 const advance=db.prepare(`INSERT INTO chart_progress (user_id,game,run,event,progress) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM chart_scores WHERE id=?) ON CONFLICT(user_id,game,run,event) DO UPDATE SET progress=MAX(chart_progress.progress,excluded.progress)`).bind(...keys,incoming,eventId);
 await db.batch([inserted,advance]);
 const added=await db.prepare('SELECT points FROM chart_scores WHERE id=?').bind(eventId).first();
 if(added)return {ok:true,added:added.points};
 const latest=await db.prepare('SELECT progress FROM chart_progress WHERE user_id=? AND game=? AND run=? AND event=?').bind(...keys).first();
 if(incoming<=(latest?.progress||0))return {ok:true,added:0};
 fail('Your results are catching up. They will retry shortly.',429);
}
export async function handleCharts(request,db,{now=()=>Date.now(),getRoomScore}={}){
 try{
  if(!db)fail('Charts are starting up. Try again shortly.',503);
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/charts\/?/,''),method=request.method,id=request.headers.get('oai-authenticated-user-id'),t=now();
  if(method==='GET'){
   if(path==='trending')return json(await trending(db,t));
   if(path==='leaderboard'){
    const game=url.searchParams.get('game'),period=url.searchParams.get('period')||'all-time';
    if(!metricFor(game))fail('Choose a game.');periodStart(period,t);
    return json(await leaderboard(db,game,period,id,t));
   }
   fail('This chart could not be found.',404);
  }
  if(method!=='POST')fail('Use GET or POST.',405);
  if(!id)return json({error:'Sign in to join the rankings.',signIn:'/signin-with-chatgpt?return_to=/#charts'},401);
  if(request.headers.get('Origin')!==url.origin)fail('Open Charts from Archerbox.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail('Please send JSON.',415);
  if(Number(request.headers.get('content-length'))>4096)fail('That message is too large.',413);
  const raw=await request.text();if(raw.length>4096)fail('That message is too large.',413);
  let body;try{body=JSON.parse(raw)}catch{fail('Invalid message.')}
  if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid message.');
  const me=await db.prepare('SELECT id FROM social_profiles WHERE id=?').bind(id).first();if(!me)fail('Set up your arcade profile first.',428);
  if(path==='play'){
   if(!metricFor(body.game))fail('Choose a game.');
   const count=await db.prepare('SELECT COUNT(*) AS count FROM chart_sessions WHERE user_id=? AND started>=?').bind(id,t-3600000).first();
   if(count.count>=120)fail('Too many game starts. Try again shortly.',429);
   const session=crypto.randomUUID();await db.batch([
    db.prepare('INSERT INTO chart_sessions (id,user_id,game,started) VALUES (?,?,?,?)').bind(session,id,body.game,t),
    db.prepare('INSERT OR IGNORE INTO chart_plays (user_id,game,day,created) VALUES (?,?,?,?)').bind(id,body.game,Math.floor(t/DAY)*DAY,t)
   ]);return json({session,game:body.game});
  }
  if(path==='progress')return json(await progress(db,id,body,t,getRoomScore));
  fail('This chart could not be found.',404);
 }catch(error){const status=error.status||(error.message==='Choose a valid time period.'?400:500);if(status===500)console.error('Charts API:',error);return json({error:status===500?'Charts could not connect. Please try again.':error.message},status)}
}
