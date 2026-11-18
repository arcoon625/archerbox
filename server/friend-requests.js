const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const pair=(a,b)=>[a,b].sort();

export async function friendRequests(db,id){
 const incoming=(await db.prepare("SELECT r.id,p.name,p.color,p.public_id AS playerId FROM social_friend_requests r JOIN social_profiles p ON p.id=r.sender WHERE r.recipient=? AND r.status='pending' ORDER BY r.created DESC").bind(id).all()).results;
 const outgoing=(await db.prepare("SELECT r.id,p.name,p.color,p.public_id AS playerId FROM social_friend_requests r JOIN social_profiles p ON p.id=r.recipient WHERE r.sender=? AND r.status='pending' ORDER BY r.created DESC").bind(id).all()).results;
 return {incoming,outgoing};
}

export async function requestFriend(db,id,playerId){
 if(typeof playerId!=='string'||! /^[a-f0-9]{32}$/.test(playerId))fail('Choose a player from the leaderboard.');
 const other=await db.prepare('SELECT id,name FROM social_profiles WHERE public_id=?').bind(playerId).first();
 if(!other)fail('This player could not be found.',404);
 if(other.id===id)fail('That is you! Choose another player.');
 const [a,b]=pair(id,other.id),t=Date.now();
 if(await db.prepare('SELECT a FROM social_friends WHERE a=? AND b=?').bind(a,b).first())return 'You are already friends!';
 const previous=await db.prepare('SELECT * FROM social_friend_requests WHERE a=? AND b=?').bind(a,b).first();
 if(previous?.status==='pending')return previous.sender===id?'Friend request already sent.':'This player already sent you a request. Tap Accept to become friends.';
 if(previous&&t-previous.updated<60000)fail('Wait a minute before sending this player another request.',429);
 const pending=await db.prepare("SELECT COUNT(*) AS total FROM social_friend_requests WHERE sender=? AND status='pending'").bind(id).first();
 if(pending.total>=50)fail('You have 50 requests waiting. Cancel one in Profile → Friends first.',429);
 // The pair is unique. Simultaneous and crossed requests keep the original recipient's consent.
 await db.prepare(`INSERT INTO social_friend_requests (id,a,b,sender,recipient,status,created,updated)
 VALUES (?,?,?,?,?,'pending',?,?) ON CONFLICT(a,b) DO UPDATE SET id=excluded.id,sender=excluded.sender,recipient=excluded.recipient,status='pending',created=excluded.created,updated=excluded.updated
 WHERE social_friend_requests.status!='pending' AND social_friend_requests.updated<=? AND NOT EXISTS (SELECT 1 FROM social_friends WHERE a=? AND b=?)`).bind(crypto.randomUUID(),a,b,id,other.id,t,t,t-60000,a,b).run();
 return 'Friend request sent to '+other.name+'!';
}

export async function answerFriendRequest(db,id,request,accept){
 if(typeof accept!=='boolean')fail('Choose Accept or Decline.');
 const row=await db.prepare('SELECT * FROM social_friend_requests WHERE id=? AND recipient=?').bind(String(request||''),id).first();
 if(!row)fail('This friend request was not sent to you.',404);
 if(row.status==='accepted'&&accept&&await db.prepare('SELECT a FROM social_friends WHERE a=? AND b=?').bind(row.a,row.b).first())return 'You are now friends!';
 if(row.status!=='pending')fail('This friend request is no longer waiting for an answer.',410);
 const t=Date.now();
 if(!accept){await db.prepare("UPDATE social_friend_requests SET status='declined',updated=? WHERE id=? AND recipient=? AND status='pending'").bind(t,row.id,id).run();return 'Friend request declined.';}
 // Both statements are atomic. A cancelled, declined, or removed request cannot create a friendship.
 await db.batch([
  db.prepare("INSERT OR IGNORE INTO social_friends (a,b,created) SELECT a,b,? FROM social_friend_requests WHERE id=? AND recipient=? AND status='pending'").bind(t,row.id,id),
  db.prepare("UPDATE social_friend_requests SET status='accepted',updated=? WHERE id=? AND recipient=? AND status='pending' AND EXISTS (SELECT 1 FROM social_friends WHERE a=? AND b=?)").bind(t,row.id,id,row.a,row.b)
 ]);
 const accepted=await db.prepare("SELECT id FROM social_friend_requests WHERE id=? AND status='accepted'").bind(row.id).first();
 if(!accepted)fail('This friend request is no longer available.',410);
 return 'You and '+(await db.prepare('SELECT name FROM social_profiles WHERE id=?').bind(row.sender).first()).name+' are now friends!';
}

export async function cancelFriendRequest(db,id,request){
 const result=await db.prepare("UPDATE social_friend_requests SET status='cancelled',updated=? WHERE id=? AND sender=? AND status='pending'").bind(Date.now(),String(request||''),id).run();
 if(!result.meta.changes)fail('This request is no longer waiting or does not belong to you.',410);
 return 'Friend request cancelled.';
}
