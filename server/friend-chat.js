const pageSize=40;
const lengthLimit=400;
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const noFriend=()=>fail('You can only chat with your friends.',403);
const validMessageId=id=>Number.isSafeInteger(id)&&id>0;
const message=(row,user)=>({id:row.id,text:row.body,mine:row.sender===user,created:row.created});

async function assertFriends(db,pair){
 if(!await db.prepare('SELECT a FROM social_friends WHERE a=? AND b=?').bind(...pair).first())noFriend();
}

async function history(db,user,pair,cursor,newer){
 const comparison=newer?'>':'<';
 const order=newer?'ASC':'DESC';
 const rows=(await db.prepare(`SELECT m.id,m.body,m.sender,m.created
  FROM social_friends f LEFT JOIN social_chat_messages m ON m.a=f.a AND m.b=f.b AND m.id${comparison}?
  WHERE f.a=? AND f.b=? ORDER BY m.id ${order} LIMIT ?`).bind(cursor,...pair,pageSize+1).all()).results;
 if(!rows.length)noFriend();
 const messages=rows.filter(row=>row.id!==null).slice(0,pageSize).map(row=>message(row,user));
 if(!newer)messages.reverse();
 return {messages,hasEarlier:!newer&&rows.length>pageSize};
}

async function send(db,user,pair,body){
 const text=typeof body.text==='string'?body.text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim():'';
 const nonce=typeof body.nonce==='string'&&/^[a-f0-9-]{36}$/.test(body.nonce)?body.nonce:null;
 if(!nonce||!text||text.length>lengthLimit)fail('Enter a message of 1–400 characters.');
 const created=Date.now();
 // Check the friendship and send rate in the same statement as the insert.
 await db.prepare(`INSERT INTO social_chat_messages (a,b,sender,nonce,body,created)
  SELECT f.a,f.b,?,?,?,? FROM social_friends f WHERE f.a=? AND f.b=?
  AND (SELECT COUNT(*) FROM social_chat_messages WHERE sender=? AND created>=?)<24
  ON CONFLICT(a,b,sender,nonce) DO NOTHING`).bind(user,nonce,text,created,...pair,user,created-20000).run();
 const saved=await db.prepare(`SELECT m.id,m.body,m.sender,m.created
  FROM social_chat_messages m JOIN social_friends f ON f.a=m.a AND f.b=m.b
  WHERE m.a=? AND m.b=? AND m.sender=? AND m.nonce=?`).bind(...pair,user,nonce).first();
 if(saved)return {message:message(saved,user)};
 await assertFriends(db,pair);
 fail('Wait a moment before sending another message.',429);
}

export async function friendChat(db,user,method,params,body){
 const friend=method==='GET'?params.get('friend'):body.friend;
 if(typeof friend!=='string'||!friend||friend.length>128||friend===user)noFriend();
 const pair=[user,friend].sort();
 if(method==='GET'){
  const newer=params.has('after'),key=newer?'after':'before';
  const cursor=params.has(key)?Number(params.get(key)):Number.MAX_SAFE_INTEGER;
  if(!validMessageId(cursor)&&!(newer&&cursor===0))fail('These messages could not be loaded.');
  return history(db,user,pair,cursor,newer);
 }
 if(body.action==='read'){
  if(!validMessageId(body.through))fail('Choose the latest message to mark as read.');
  await assertFriends(db,pair);
  await db.prepare(`UPDATE social_chat_messages SET read_at=? WHERE a=? AND b=?
   AND sender=? AND read_at IS NULL AND id<=?
   AND EXISTS (SELECT 1 FROM social_friends WHERE a=? AND b=?)`).bind(Date.now(),...pair,friend,body.through,...pair).run();
  return {ok:true};
 }
 return send(db,user,pair,body);
}
