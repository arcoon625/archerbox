const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
export async function resetConfirmation(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('Confirm your restart with JSON.',415);
  if(Number(request.headers.get('Content-Length'))>1024)fail('That restart request is too large.',413);
  const raw=await request.text();if(raw.length>1024)fail('That restart request is too large.',413);
  let body;try{body=JSON.parse(raw)}catch{fail('Confirm that you want to restart everything.')}
  if(body?.confirm!==true)fail('Confirm that you want to restart everything.');
}
// Remove this manager while keeping the other managers' shared season playable.
export function forgetFantasyPlayer(league,publicId,username){
  const own=(league.teams||[]).filter(t=>t.managerId===publicId),remaining=(league.teams||[]).filter(t=>!t.cpu&&t.managerId!==publicId);
  if(own.length&&!remaining.length)return null;
  const labels=[username,...own.map(t=>t.name)].filter(Boolean),ownedIds=new Set(own.map(t=>t.id));
  if(ownedIds.has(league.owner)&&labels.some(label=>String(league.name).includes(label)))league.name='Community League';
  if(league.phase==='lobby'&&own.length){
    const owner=league.owner,ids=new Map();league.teams=league.teams.filter(t=>!ownedIds.has(t.id));
    league.teams.forEach((t,i)=>{ids.set(t.id,'team-'+(i+1));t.id='team-'+(i+1)});
    league.owner=ids.get(owner)||league.teams.find(t=>!t.cpu)?.id;
  }else{
    for(const t of own){t.managerId='cpu-retired-'+t.id;t.managerName='CPU manager';t.name='CPU Team '+t.id.replace('team-','');t.cpu=true;t.auto=true}
    if(ownedIds.has(league.owner))league.owner=remaining[0]?.id;
  }
  league.trades=(league.trades||[]).filter(t=>!ownedIds.has(t.from)&&!ownedIds.has(t.to));
  league.claims=(league.claims||[]).filter(t=>!ownedIds.has(t.team));
  league.activity=(league.activity||[]).filter(entry=>!labels.some(label=>String(entry.text).includes(label)));
  const replacement='cpu-retired-player-'+crypto.randomUUID();
  const source=league.pool?.find(p=>p.id===publicId);
  if(source)Object.assign(source,{id:replacement,name:'CPU Prospect',kind:'cpu',color:'#bdf167',rating:75,projection:source.projection||10});
  function scrub(value){
    if(typeof value==='string')return value===publicId?replacement:value;
    if(Array.isArray(value))return value.map(scrub);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k===publicId?replacement:k,scrub(v)]));
    return value;
  }
  return scrub(league);
}
async function leaveLeagues(db,publicId,username){
  if(!publicId)return true;
  const rows=(await db.prepare(`SELECT id FROM fantasy_leagues WHERE EXISTS (SELECT 1 FROM json_each(data,'$.teams') WHERE json_extract(value,'$.managerId')=?) OR EXISTS (SELECT 1 FROM json_each(data,'$.pool') WHERE json_extract(value,'$.id')=?) LIMIT 8`).bind(publicId,publicId).all()).results;
  for(const {id} of rows){
    let saved=false;
    for(let attempt=0;attempt<6;attempt++){
      const row=await db.prepare('SELECT data,version FROM fantasy_leagues WHERE id=?').bind(id).first();if(!row){saved=true;break}
      const next=forgetFantasyPlayer(JSON.parse(row.data),publicId,username);
      const result=next?await db.prepare('UPDATE fantasy_leagues SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(next),Date.now(),id,row.version).run():await db.prepare('DELETE FROM fantasy_leagues WHERE id=? AND version=?').bind(id,row.version).run();
      if(result.meta.changes){saved=true;break}
    }
    if(!saved)fail('A shared league is updating. Try finishing your restart again.',409);
  }
  return !await db.prepare(`SELECT id FROM fantasy_leagues WHERE EXISTS (SELECT 1 FROM json_each(data,'$.teams') WHERE json_extract(value,'$.managerId')=?) OR EXISTS (SELECT 1 FROM json_each(data,'$.pool') WHERE json_extract(value,'$.id')=?) LIMIT 1`).bind(publicId,publicId).first();
}
export async function resetPlayer(db,user,rooms){
  const profile=await db.prepare('SELECT name FROM social_profiles WHERE id=?').bind(user).first();
  if(!profile)return true;
  await db.batch([db.prepare('UPDATE browser_sessions SET resetting=1 WHERE user_id=?').bind(user),db.prepare('DELETE FROM social_invites WHERE sender=? OR recipient=?').bind(user,user),db.prepare('DELETE FROM social_friends WHERE a=? OR b=?').bind(user,user)]);
  const fantasy=await db.prepare('SELECT public_id FROM fantasy_players WHERE user_id=?').bind(user).first();
  const matches=(await db.prepare('SELECT id FROM social_rooms WHERE host=? OR guest=? LIMIT 12').bind(user,user).all()).results;
  if(rooms)for(let offset=0;offset<matches.length;offset+=4){
    const results=await Promise.allSettled(matches.slice(offset,offset+4).map(async({id})=>{
      const stub=rooms.get(rooms.idFromName(id)),response=await stub.fetch(new Request('https://match.internal/_restart/'+id,{method:'POST',headers:{'oai-authenticated-user-id':user}}));
      if(!response.ok&&response.status!==404&&response.status!==410)throw Error('Match cleanup failed.');
    }));
    if(results.some(r=>r.status==='rejected'))fail('A match could not finish restarting. Please try again.',503);
  }
  if(matches.length)await db.prepare(`DELETE FROM social_rooms WHERE (host=? OR guest=?) AND id IN (${matches.map(()=>'?').join(',')})`).bind(user,user,...matches.map(r=>r.id)).run();
  if(await db.prepare('SELECT id FROM social_rooms WHERE host=? OR guest=? LIMIT 1').bind(user,user).first())return false;
  if(!await leaveLeagues(db,fantasy?.public_id,profile.name))return false;
  const statements=[];
  if(fantasy)statements.push(db.prepare('DELETE FROM fantasy_results WHERE player_id=?').bind(fantasy.public_id));
  for(const table of ['chart_scores','chart_progress','chart_plays','chart_sessions','fantasy_players','browser_sessions'])statements.push(db.prepare(`DELETE FROM ${table} WHERE user_id=?`).bind(user));
  statements.push(db.prepare('DELETE FROM social_friend_requests WHERE sender=? OR recipient=?').bind(user,user),db.prepare('DELETE FROM social_friends WHERE a=? OR b=?').bind(user,user),db.prepare('DELETE FROM social_invites WHERE sender=? OR recipient=?').bind(user,user),db.prepare('DELETE FROM social_rooms WHERE host=? OR guest=?').bind(user,user),db.prepare('DELETE FROM social_profiles WHERE id=?').bind(user));
  await db.batch(statements);
  return true;
}
