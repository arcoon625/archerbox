import {makeRoom,tickRoom,readyPlayer,safeInput,publicRoom,validGame,event,encodeRoom} from './matches.js';
import {recordFantasyResult} from './fantasy.js';
const alphabet='23456789abcdefghjkmnpqrstuvwxyz';
const now=()=>Date.now(),pair=(a,b)=>[a,b].sort();
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
const cleanName=n=>typeof n==='string'?n.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,16):'';
const cleanColor=n=>/^#[a-f0-9]{6}$/i.test(n||'')?n:'#c0f16b';
export function codeDistance(a,b){return [...a].reduce((n,c,i)=>n+(c!==b[i]?1:0),0)}
export function randomCode(){return Array.from(crypto.getRandomValues(new Uint8Array(10)),n=>alphabet[n%alphabet.length]).join('');}
async function getProfile(db,id){return db.prepare('SELECT * FROM social_profiles WHERE id=?').bind(id).first();}
async function ensureProfile(db,id,body){
 let p=await getProfile(db,id);const name=cleanName(body.name),color=cleanColor(body.color),t=now();
 if(p){const update=body.update===true&&name;if(update)await db.prepare('UPDATE social_profiles SET name=?,color=?,seen=? WHERE id=?').bind(name,color,t,id).run();else await db.prepare('UPDATE social_profiles SET seen=? WHERE id=?').bind(t,id).run();return {...p,name:update?name:p.name,color:update?color:p.color,seen:t};}
 if(!name)fail('Choose an arcade name in your profile first.');
 // Check at least three different characters, not just exact uniqueness. UNIQUE is the final collision guard.
 const differences=Array.from({length:10},(_,i)=>`(substr(code,${i+1},1) != substr(?,${i+1},1))`).join('+');
 for(let tries=0;tries<30;tries++){
  const code=randomCode(),near=await db.prepare(`SELECT id FROM social_profiles WHERE (${differences})<3 LIMIT 1`).bind(...Array(10).fill(code)).first();if(near)continue;
  try{const inserted=await db.prepare(`INSERT INTO social_profiles (id,code,name,color,seen,created) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM social_profiles WHERE (${differences})<3)`).bind(id,code,name,color,t,t,...Array(10).fill(code)).run();if(!inserted.meta.changes)continue;return {id,code,name,color,seen:t};}catch(error){p=await getProfile(db,id);if(p)return p;if(!String(error).includes('UNIQUE'))throw error;}
 }
 fail('Could not make a new code. Please try again.',503);
}
async function areFriends(db,a,b){return db.prepare('SELECT a FROM social_friends WHERE a=? AND b=?').bind(...pair(a,b)).first();}
async function socialState(db,id){
 const t=now(),profile=await getProfile(db,id);
 const friends=(await db.prepare('SELECT p.id,p.name,p.color,p.seen FROM social_friends f JOIN social_profiles p ON p.id=CASE WHEN f.a=? THEN f.b ELSE f.a END WHERE f.a=? OR f.b=? ORDER BY p.name').bind(id,id,id).all()).results;
 const incoming=(await db.prepare("SELECT i.id,i.track,i.game,i.variant,i.expires,p.name,p.color FROM social_invites i JOIN social_profiles p ON p.id=i.sender WHERE i.recipient=? AND i.status='pending' AND i.expires>? ORDER BY i.created DESC").bind(id,t).all()).results;
 const outgoing=(await db.prepare("SELECT i.id,i.status,i.expires,i.track,i.game,p.name FROM social_invites i JOIN social_profiles p ON p.id=i.recipient WHERE i.sender=? AND i.created>? ORDER BY i.created DESC LIMIT 10").bind(id,t-300000).all()).results;
 const rooms=(await db.prepare('SELECT id,data FROM social_rooms WHERE (host=? OR guest=?) AND updated>? ORDER BY updated DESC LIMIT 5').bind(id,id,t-900000).all()).results;
 const active=rooms.find(r=>!['left','finished'].includes(JSON.parse(r.data).status));
 return {profile:{name:profile.name,color:profile.color,code:profile.code},friends:friends.map(f=>({id:f.id,name:f.name,color:f.color,online:t-f.seen<16000})),incoming,outgoing:outgoing.map(i=>({...i,status:i.status==='pending'&&i.expires<=t?'expired':i.status})),activeRoom:active?.id||null,activeGame:active?JSON.parse(active.data).game||'turbo-kart-racing':null};
}
async function editRoom(db,id,user,connection,edit){
 for(let retry=0;retry<5;retry++){
  const row=await db.prepare('SELECT * FROM social_rooms WHERE id=?').bind(id).first();if(!row)fail('This race could not be found.',404);if(row.host!==user&&row.guest!==user)fail('This race belongs to other players.',403);
  const room=JSON.parse(row.data),t=now();tickRoom(room,t);await edit(room,t);
  const result=await db.prepare('UPDATE social_rooms SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(encodeRoom(room),t,id,row.version).run();if(result.meta.changes){await recordFantasyResult(db,room);return publicRoom(room,user,connection);}
 }
 fail('The race is catching up. Please retry.',409);
}
export async function handleSocial(request,db){
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/social\/?/,'').split('/'),method=request.method,id=request.headers.get('oai-authenticated-user-id');
  if(!id)return json({error:'Sign in to use Friends.',signIn:'/signin-with-chatgpt?return_to=/'},401);
  if(!db)fail('Friends is starting up. Please try again shortly.',503);
  if(!['GET','POST'].includes(method))fail('Use GET or POST.',405);
  if(method==='POST'){
   if(request.headers.get('Origin')!==url.origin)fail('Open Friends from Archerbox.',403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))fail('Please send JSON.',415);
   if(Number(request.headers.get('content-length'))>4096)fail('That message is too large.',413);
  }
  const raw=method==='POST'?await request.text():'';if(raw.length>4096)fail('That message is too large.',413);
  let body={};try{body=raw?JSON.parse(raw):{}}catch{fail('Invalid message.');}if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid message.');
  if(path[0]==='profile'&&method==='POST'){await ensureProfile(db,id,body);return json(await socialState(db,id));}
  const me=await getProfile(db,id);if(!me)fail('Save your profile to turn on Friends.',428);
  if(path[0]==='state'&&method==='GET'){await db.prepare('UPDATE social_profiles SET seen=? WHERE id=?').bind(now(),id).run();return json(await socialState(db,id));}
  if(path[0]==='add'&&method==='POST'){
   const code=typeof body.code==='string'?body.code.trim().toLowerCase():'';if(!/^[a-z0-9]{10}$/.test(code))fail('Enter the 10 letters and numbers from your friend’s code.');
   const friend=await db.prepare('SELECT * FROM social_profiles WHERE code=?').bind(code).first();if(!friend)fail('No player has that code. Check it and try again.',404);if(friend.id===id)fail('That is your code! Ask your friend for theirs.');
   const [a,b]=pair(id,friend.id);await db.prepare('INSERT OR IGNORE INTO social_friends (a,b,created) VALUES (?,?,?)').bind(a,b,now()).run();return json({message:'You and '+friend.name+' are now friends!',...await socialState(db,id)});
  }
  if(path[0]==='remove'&&method==='POST'){
   const other=String(body.friend||'');await db.batch([db.prepare('DELETE FROM social_friends WHERE a=? AND b=?').bind(...pair(id,other)),db.prepare("UPDATE social_invites SET status='cancelled' WHERE status='pending' AND ((sender=? AND recipient=?) OR (sender=? AND recipient=?))").bind(id,other,other,id)]);return json(await socialState(db,id));
  }
  if(path[0]==='invite'&&method==='POST'){
   const other=String(body.friend||'');if(!await areFriends(db,id,other))fail('Add this player as a friend first.',403);
   const game=body.game||'turbo-kart-racing',meta=validGame(game),track=body.track,variant=body.variant==='coop'?'coop':'versus';if(!meta||!Number.isInteger(track)||track<0||track>=meta.arenas.length)fail('Choose a game and one of its arenas.');
   const t=now(),recent=await db.prepare('SELECT id FROM social_invites WHERE sender=? AND created>? LIMIT 1').bind(id,t-3000).first();if(recent)fail('Wait a moment before sending another invite.',429);
   const invite=crypto.randomUUID();await db.batch([db.prepare("UPDATE social_invites SET status='cancelled' WHERE sender=? AND recipient=? AND status='pending'").bind(id,other),db.prepare("INSERT INTO social_invites (id,sender,recipient,status,track,game,variant,created,expires) VALUES (?,?,?,'pending',?,?,?,?,?)").bind(invite,id,other,track,game,variant,t,t+120000)]);return json({message:'Invite sent to '+(await getProfile(db,other)).name+'.',...await socialState(db,id)});
  }
  if(path[0]==='respond'&&method==='POST'){
   const invite=await db.prepare('SELECT * FROM social_invites WHERE id=? AND recipient=?').bind(String(body.invite||''),id).first();if(!invite)fail('This invite was not sent to you.',404);
   if(invite.status==='accepted')return json({roomId:invite.id,...await socialState(db,id)});
   if(invite.status!=='pending'||invite.expires<=now())fail('This invite expired or was cancelled. Ask for a new one.',410);
   if(body.accept!==true){await db.prepare("UPDATE social_invites SET status='declined' WHERE id=? AND status='pending'").bind(invite.id).run();return json({message:'Invite declined.',...await socialState(db,id)});}
   if(!await areFriends(db,id,invite.sender))fail('This friendship has been removed.',403);
   const host=await getProfile(db,invite.sender),room=makeRoom(invite.id,host,me,invite.track,now(),invite.game,invite.variant);
   // The insert's SELECT and conditional invite update run atomically; cancelled/expired invites cannot make rooms.
   await db.batch([db.prepare("INSERT OR IGNORE INTO social_rooms (id,host,guest,data,version,updated) SELECT id,sender,recipient,?,0,? FROM social_invites WHERE id=? AND status='pending' AND expires>?").bind(JSON.stringify(room),now(),invite.id,now()),db.prepare("UPDATE social_invites SET status='accepted' WHERE id=? AND status='pending' AND expires>? AND EXISTS (SELECT 1 FROM social_rooms WHERE id=?)").bind(invite.id,now(),invite.id)]);
   const made=await db.prepare('SELECT id FROM social_rooms WHERE id=?').bind(invite.id).first();if(!made)fail('This invite is no longer available.',410);return json({roomId:invite.id,...await socialState(db,id)});
  }
  if(path[0]==='room'&&path[1]&&method==='POST'){
   const connection=typeof body.clientId==='string'&&/^[a-f0-9-]{36}$/.test(body.clientId)?body.clientId:null;
   if(body.action!=='leave'&&!connection)fail('Reconnect to the race.',400);
   const room=await editRoom(db,path[1],id,connection,(r,t)=>{
    const p=r.players.find(p=>p.id===id);
    if(!p.connection||body.action==='claim'||(body.action==='ready'&&r.status==='waiting')){p.connection=connection;p.seq=-1;}
    const controlling=p.connection===connection;if(controlling)p.seen=t;
    if(body.action==='leave'){r.status='left';r.message=p.name+' left the race.';return;}
    if(body.action==='ready'&&controlling)readyPlayer(r,id,r.game&&r.game!=='turbo-kart-racing'?body.config:body.kart,t);
    if(body.action==='recover'&&controlling&&r.status==='racing'){const kart=r.racers.find(k=>k.playerId===id);if(kart&&!kart.finished){kart.lane=0;kart.heading=0;kart.speed=Math.min(kart.speed,7);kart.air=kart.vy=0;}}
    if(body.action==='input'&&controlling&&Number.isSafeInteger(body.seq)&&body.seq>p.seq){p.seq=body.seq;p.input=safeInput(body.input,r.game);}
    if(body.action==='event'&&controlling&&Number.isSafeInteger(body.eventSeq)&&body.eventSeq>(p.eventSeq??-1)){p.eventSeq=body.eventSeq;event(r,r.players.indexOf(p),String(body.event||''),body.args&&typeof body.args==='object'?body.args:{},t);}
   });return json(room);
  }
  fail('This Friends page could not be found.',404);
 }catch(error){const status=error.status||500;if(status===500)console.error('Friends API:',error);return json({error:status===500?'Friends could not connect. Please try again.':error.message},status);}
}
