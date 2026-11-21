const $=id=>document.getElementById(id);
const stamp=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});

export function initFriendChat(api,onRead){
 const dialog=$('friendChatDialog'),scroll=$('friendChatScroll'),list=$('friendChatMessages');
 const input=$('friendChatInput'),send=$('friendChatSend'),earlier=$('friendChatEarlier');
 const status=$('friendChatStatus'),empty=$('friendChatEmpty');
 let current=null;
 const isOpen=chat=>current===chat&&dialog.open;
 const bottom=()=>{scroll.scrollTop=scroll.scrollHeight;};

 function showError(chat,error){
  if(!isOpen(chat))return;
  if([401,403,428].includes(error.status)){
   chat.blocked=true;
   input.disabled=send.disabled=true;
   list.replaceChildren();
   earlier.hidden=empty.hidden=true;
  }
  status.textContent=error.message||'Chat couldn’t connect. Try again.';
 }

 function addMessages(chat,messages,{prepend=false,follow=false}={}){
  const stayAtBottom=follow||scroll.scrollHeight-scroll.scrollTop-scroll.clientHeight<55;
  const before=scroll.scrollHeight;
  for(const message of messages){
   if(!message.mine)chat.latestIncoming=Math.max(chat.latestIncoming,message.id);
   if(chat.ids.has(message.id))continue;
   chat.ids.add(message.id);
   const line=document.createElement('li');
   line.className=message.mine?'friendChatMine':'friendChatTheirs';
   line.dataset.message=message.id;
   const meta=document.createElement('span');
   meta.className='friendChatMeta';
   const time=document.createElement('time'),date=new Date(message.created);
   time.dateTime=date.toISOString();
   time.textContent=stamp.format(date);
   meta.append(message.mine?'You':chat.friend.name,' · ',time);
   const body=document.createElement('p');
   body.dir='auto';
   body.textContent=message.text;
   line.append(meta,body);
   const next=Number(list.lastElementChild?.dataset.message)>message.id
    ?[...list.children].find(item=>Number(item.dataset.message)>message.id):null;
   list.insertBefore(line,next??null);
  }
  empty.hidden=chat.ids.size>0;
  if(prepend)scroll.scrollTop+=scroll.scrollHeight-before;
  else if(stayAtBottom)bottom();
 }

 async function markRead(chat){
  if(chat.marking||chat.blocked||!isOpen(chat)||document.hidden||chat.latestIncoming<=chat.readThrough)return;
  const through=chat.latestIncoming;
  chat.marking=true;
  try{
   await api('chat',{friend:chat.friend.id,action:'read',through});
   chat.readThrough=through;
   if(isOpen(chat))onRead();
  }catch(error){
   if([401,403,428].includes(error.status))showError(chat,error);
  }finally{chat.marking=false;}
 }

 async function load(chat,loadEarlier=false){
  if(!chat||!isOpen(chat)||chat.loading||chat.blocked||document.hidden)return;
  const initial=chat.newest===null;
  if(!initial&&loadEarlier&&!chat.hasEarlier)return;
  chat.loading=true;
  earlier.disabled=true;
  const query=new URLSearchParams({friend:chat.friend.id});
  if(loadEarlier)query.set('before',list.firstElementChild.dataset.message);
  else if(!initial)query.set('after',chat.newest);
  try{
   const page=await api('chat?'+query);
   if(!isOpen(chat)||chat.blocked)return;
   if(initial||loadEarlier){
    chat.hasEarlier=page.hasEarlier;
    earlier.hidden=!chat.hasEarlier;
   }
   if(!loadEarlier)chat.newest=page.messages.at(-1)?.id??chat.newest??0;
   addMessages(chat,page.messages,{prepend:loadEarlier,follow:initial});
   if(initial){input.disabled=false;send.disabled=false;}
   if(status.textContent==='Loading messages…'||status.textContent===chat.loadError)status.textContent='';
   chat.loadError=null;
   void markRead(chat);
  }catch(error){
   chat.loadError=error.message;
   showError(chat,error);
  }finally{
   chat.loading=false;
   if(isOpen(chat))earlier.disabled=false;
  }
 }

 async function submit(){
  const chat=current,text=input.value.trim();
  if(!chat||!isOpen(chat)||chat.sending||input.disabled||!text)return;
  const draft=chat.draft?.text===text?chat.draft:{text,nonce:crypto.randomUUID()};
  chat.draft=draft;
  chat.sending=true;
  send.disabled=true;
  input.readOnly=true;
  status.textContent='';
  try{
   const result=await api('chat',{friend:chat.friend.id,...draft});
   if(!isOpen(chat)||chat.blocked)return;
   input.value='';
   chat.draft=null;
   addMessages(chat,[result.message],{follow:true});
   void load(chat);
  }catch(error){showError(chat,error);}
  finally{
   chat.sending=false;
   if(isOpen(chat)){
    input.readOnly=false;
    send.disabled=chat.blocked;
    if(!chat.blocked)input.focus({preventScroll:true});
   }
  }
 }

 $('friendChatForm').onsubmit=event=>{event.preventDefault();void submit();};
 input.onkeydown=event=>{
  if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();void submit();}
 };
 earlier.onclick=()=>void load(current,true);
 $('closeFriendChat').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{
  if(dialog.open)return;
  const last=current;
  current=null;
  list.replaceChildren();
  input.value='';
  if(last&&$('profileDialog').open)$('friendsList').querySelector(`[data-friend-chat="${CSS.escape(last.friend.id)}"]`)?.focus();
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load(current);});
 return {
  open(friend){
   if(dialog.open)return;
   current={friend,ids:new Set(),newest:null,latestIncoming:0,readThrough:0};
   $('friendChatTitle').textContent='Chat with '+friend.name;
   list.replaceChildren();
   input.value='';
   input.readOnly=false;
   input.disabled=send.disabled=earlier.hidden=empty.hidden=true;
   status.textContent='Loading messages…';
   dialog.showModal();
   void load(current);
  },
  refresh(friends){
   if(!current||!dialog.open)return;
   const friend=friends.find(entry=>entry.id===current.friend.id);
   if(!friend){dialog.close();return;}
   current.friend=friend;
   void load(current);
  }
 };
}
