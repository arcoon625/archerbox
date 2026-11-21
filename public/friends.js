import {FRIEND_GAMES,friendGame} from './multiplayer/catalog.js';
import {CATEGORIES,itemById,readSavedLook,STORAGE_KEY} from './avatar/catalog.js?v=glitchdrop1';
import {initFriendChat} from './friend-chat.js?v=chat1';
const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function gameChoices(){const meta=friendGame($('friendGame').value);$('friendArena').innerHTML=meta.arenas.map((name,i)=>`<option value="${i}">${escape(name)}</option>`).join('');$('friendModeRow').hidden=meta.id!=='neon-clash';$('friendGameHelp').textContent=meta.detail;}
let state=null,busy=false,polling=false,profile,openRace,currentRoom=null,lastInvite=null,needsProfileSave=false,onProfile,ignoredRooms=new Set();
let chat;
const unreadLabel=count=>count+' unread '+(count===1?'message':'messages');
const badgeText=count=>count>99?'99+':String(count);
export async function socialApi(path,body){
 const response=await fetch('/api/social/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 let data;try{data=await response.json()}catch{throw new Error('Friends needs an online connection. Try again in a moment.')}
 if(!response.ok){const e=new Error(data.error||'Friends could not connect.');e.status=response.status;e.signIn=data.signIn;throw e}return data;
}
let avatarSync=null,lastSharedLook=null;
export function syncFriendAvatar(){
 if(avatarSync)return avatarSync;
 const publish=async()=>{
  const look=readSavedLook();
  if(!look)return;
  const fingerprint=JSON.stringify(look);
  if(fingerprint===lastSharedLook)return;
  await socialApi('avatar',{look});
  lastSharedLook=fingerprint;
 };
 // Read the saved outfit after acquiring the lock so an older tab cannot send a stale look.
 avatarSync=(navigator.locks?.request('archerbox-avatar-sharing',publish)??publish())
  .catch(()=>{}).finally(()=>{avatarSync=null;});
 return avatarSync;
}

let viewedAvatar=null;
async function viewFriendAvatar(friend){
 const dialog=$('friendAvatarDialog'),stage=$('friendAvatarStage'),status=$('friendAvatarStatus');
 const view={id:friend.id,preview:null};
 viewedAvatar=view;
 const isCurrent=()=>viewedAvatar===view&&dialog.open;
 $('friendAvatarTitle').textContent=friend.name+'’s avatar';
 stage.replaceChildren();
 stage.hidden=$('friendAvatarViews').hidden=$('friendAvatarOutfit').hidden=true;
 status.textContent='Loading avatar…';
 status.hidden=false;
 dialog.showModal();
 let look;
 try{({look}=await socialApi('avatar?friend='+encodeURIComponent(friend.id)));}
 catch(error){if(isCurrent())status.textContent=error.message;return;}
 if(!isCurrent())return;
 if(!look){status.textContent='This friend’s saved avatar isn’t available yet.';return;}
 const pieces=CATEGORIES.map(category=>[category.name,itemById(look[category.id])?.name]).filter(([,name])=>name);
 $('friendAvatarItems').innerHTML=pieces.map(([category,name])=>`<div><dt>${escape(category)}</dt><dd>${escape(name)}</dd></div>`).join('');
 $('friendAvatarOutfit').hidden=!pieces.length;
 try{
  const {showFriendPreview}=await import('./avatar/friend-preview.js?v=glitchdrop1');
  if(!isCurrent())return;
  const canvas=document.createElement('canvas');
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label',friend.name+'’s saved 3D avatar');
  stage.replaceChildren(canvas);
  stage.hidden=false;
  view.preview=showFriendPreview(canvas,look);
  $('friendAvatarFront').setAttribute('aria-pressed','true');
  $('friendAvatarBack').setAttribute('aria-pressed','false');
  $('friendAvatarViews').hidden=false;
  status.hidden=true;
 }catch{
  stage.hidden=true;
  status.textContent='The 3D preview couldn’t load.';
 }
}

function message(text,error=false){$('friendStatus').textContent=text;$('friendStatus').classList.toggle('error',error);}
let relationshipKey='',stateRevision=0;
function applyState(next){
 const changed=JSON.stringify(state)!==JSON.stringify(next);state=next;stateRevision++;if(changed)render();
 if(viewedAvatar&&!state.friends.some(f=>f.id===viewedAvatar.id))$('friendAvatarDialog').close();
 chat.refresh(state.friends);
 const key=JSON.stringify([state.friends.map(f=>f.id),state.friendRequests]);
 if(key!==relationshipKey){relationshipKey=key;document.dispatchEvent(new Event('archerbox:social-updated'));}
}
export async function friendAction(path,body){
 if(busy)throw Error('Please wait for your other Friends action to finish.');
 busy=true;
 try{const next=await socialApi(path,body);applyState(next);message(next.message||'Friends updated.');return next;}
 finally{busy=false;}
}
function render(){
 if(!state)return;
 const unread=state.friends.reduce((sum,friend)=>sum+(friend.unread||0),0);
 for(const id of ['profileChatBadge','friendChatTabBadge']){
  const badge=$(id);
  badge.hidden=!unread;
  badge.textContent=unread?badgeText(unread):'';
  badge.setAttribute('aria-label',unreadLabel(unread));
 }
 $('yourFriendCode').textContent=state.profile.code;$('friendCount').textContent=state.friends.length;$('friendsList').innerHTML=state.friends.length?state.friends.map(f=>`<article class="friendRow"><button type="button" class="friendIdentity" data-friend-avatar="${escape(f.id)}" aria-label="View ${escape(f.name)}’s avatar"><span class="friendAvatar" style="--friend-color:${f.color}" aria-hidden="true">${escape(f.name.slice(0,2).toUpperCase())}</span><span class="friendIdentityText"><b>${escape(f.name)}</b><small class="${f.online?'online':''}">● ${f.online?'Online':'Offline'}</small><span>View avatar ↗</span></span></button><button type="button" class="friendChatButton" data-friend-chat="${escape(f.id)}" aria-label="Chat with ${escape(f.name)}${f.unread?', '+unreadLabel(f.unread):''}">Chat${f.unread?`<span class="friendChatBadge" aria-hidden="true">${badgeText(f.unread)}</span>`:''}</button><button type="button" data-invite="${escape(f.id)}">Invite to game ↗</button><button type="button" class="removeFriend" data-remove="${escape(f.id)}" aria-label="Remove ${escape(f.name)} from friends">×</button></article>`).join(''):'<p class="friendsEmpty">Your friends will appear here. Share your code or enter theirs!</p>';
 $('friendsList').querySelectorAll('[data-friend-avatar]').forEach(button=>button.onclick=()=>{
  const friend=state.friends.find(f=>f.id===button.dataset.friendAvatar);
  if(friend)void viewFriendAvatar(friend);
 });
 $('friendsList').querySelectorAll('[data-friend-chat]').forEach(button=>button.onclick=()=>{
  const friend=state.friends.find(f=>f.id===button.dataset.friendChat);
  if(friend)chat.open(friend);
 });
 $('friendsList').querySelectorAll('[data-invite]').forEach(b=>b.onclick=()=>sendInvite(b.dataset.invite));$('friendsList').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>run(()=>socialApi('remove',{friend:b.dataset.remove}),'Friend removed.'));
 const requests=state.friendRequests||{incoming:[],outgoing:[]};
 $('friendRequestCount').textContent=requests.incoming.length?' ('+requests.incoming.length+')':'';
 $('friendRequests').innerHTML=requests.incoming.length?'<h4>Friend requests</h4>'+requests.incoming.map(r=>`<article class="incomingInvite"><b>${escape(r.name)} wants to be friends</b><small>Accept to add each other to your friends lists.</small><div><button type="button" data-friend-accept="${escape(r.id)}">Accept</button><button type="button" data-friend-decline="${escape(r.id)}">Decline</button></div></article>`).join(''):'';
 $('sentFriendRequests').innerHTML=requests.outgoing.length?'<h4>Requests you sent</h4>'+requests.outgoing.map(r=>`<div class="sentFriendRequest"><span><b>${escape(r.name)}</b><small>Request sent · waiting for an answer</small></span><button type="button" data-friend-cancel="${escape(r.id)}">Cancel</button></div>`).join(''):'';
 for(const [attribute,path,accept] of [['data-friend-accept','friend-response',true],['data-friend-decline','friend-response',false],['data-friend-cancel','friend-cancel',false]]){
  $('friendsContent').querySelectorAll('['+attribute+']').forEach(b=>b.onclick=()=>run(()=>socialApi(path,{request:b.getAttribute(attribute),accept})));
 }
 const request=requests.incoming[0];
 $('friendRequestToast').hidden=!request||!!state.incoming.length;
 if(request){$('friendRequestToastText').textContent=request.name+' wants to be your friend!';$('friendRequestAccept').onclick=()=>run(()=>socialApi('friend-response',{request:request.id,accept:true}));$('friendRequestDecline').onclick=()=>run(()=>socialApi('friend-response',{request:request.id,accept:false}));}
 $('incomingInvites').innerHTML=state.incoming.map(i=>`<article class="incomingInvite"><b>${escape(i.name)} invited you!</b><small>${escape(friendGame(i.game).name)} · ${escape(friendGame(i.game).arenas[i.track])} · ${escape(friendGame(i.game).detail)}</small><div><button type="button" data-accept="${i.id}">Accept ▶</button><button type="button" data-decline="${i.id}">Decline</button></div></article>`).join('');
 $('incomingInvites').querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>respond(b.dataset.accept,true));$('incomingInvites').querySelectorAll('[data-decline]').forEach(b=>b.onclick=()=>respond(b.dataset.decline,false));
 $('outgoingInvites').innerHTML=state.outgoing.slice(0,3).map(i=>`<p>${escape(i.name)} · ${i.status==='pending'?'Invite sent — waiting for an answer':i.status==='accepted'?'Accepted!':i.status==='declined'?'Declined this invite':i.status==='expired'?'Invite expired':'Invite cancelled'}</p>`).join('');
 const invite=state.incoming[0];$('inviteToast').hidden=!invite;if(invite){$('inviteToastText').textContent=invite.name+' invited you to '+friendGame(invite.game).name+'!';lastInvite=invite.id;}
 if(state.activeRoom&&!ignoredRooms.has(state.activeRoom)&&state.activeRoom!==currentRoom){currentRoom=state.activeRoom;openRace(state.activeRoom,state.activeGame);}
}
async function run(operation,success=''){if(busy)return;busy=true;$('friendsContent').setAttribute('aria-busy','true');try{const next=await operation();if(next.profile)applyState(next);message(next.message||success)}catch(e){message(e.message,true);if(e.status===401)$('friendsSignIn').hidden=false}finally{busy=false;$('friendsContent').removeAttribute('aria-busy');}}
async function connect(){if(polling||busy)return;polling=true;const before=stateRevision;try{const next=needsProfileSave?await socialApi('profile',{...profile(),update:true}):await socialApi('state');needsProfileSave=false;if(before===stateRevision){applyState(next);onProfile?.(state.profile);$('friendsSignIn').hidden=true;if($('friendStatus').textContent==='Connecting to Friends…'||$('friendStatus').classList.contains('error'))message('');}void syncFriendAvatar();}catch(e){message(e.message,true);if(e.status===401)$('friendsSignIn').hidden=false}finally{polling=false}}
async function respond(invite,accept){await run(()=>socialApi('respond',{invite,accept}),accept?'Joining your friend…':'Invite declined.');}
async function sendInvite(friend){await run(()=>socialApi('invite',{friend,game:$('friendGame').value,track:Number($('friendArena').value),variant:$('friendMode').value}));}
export function initFriends(options){
 chat=initFriendChat(socialApi,connect);
 $('friendGame').innerHTML=FRIEND_GAMES.map(g=>`<option value="${g.id}">${g.name}</option>`).join('');$('friendGame').onchange=gameChoices;gameChoices();
 profile=options.profile;openRace=options.openRace;onProfile=options.onProfile;
 const avatarDialog=$('friendAvatarDialog');
 $('closeFriendAvatar').onclick=()=>avatarDialog.close();
 avatarDialog.addEventListener('close',()=>{
  const view=viewedAvatar;
  viewedAvatar=null;
  view?.preview?.dispose();
  $('friendAvatarStage').replaceChildren();
  if(view&&$('profileDialog').open)$('friendsList').querySelector(`[data-friend-avatar="${CSS.escape(view.id)}"]`)?.focus();
 });
 for(const [button,back] of [[$('friendAvatarFront'),false],[$('friendAvatarBack'),true]])button.onclick=()=>{
  viewedAvatar?.preview?.setBack(back);
  $('friendAvatarFront').setAttribute('aria-pressed',String(!back));
  $('friendAvatarBack').setAttribute('aria-pressed',String(back));
 };
 $('profileTab').onclick=()=>{$('profileForm').hidden=false;$('friendsContent').hidden=true;$('profileTab').setAttribute('aria-selected','true');$('friendsTab').setAttribute('aria-selected','false')};
 $('friendsTab').onclick=()=>{$('profileForm').hidden=true;$('friendsContent').hidden=false;$('profileTab').setAttribute('aria-selected','false');$('friendsTab').setAttribute('aria-selected','true');connect()};
 $('addFriendButton').onclick=async()=>{$('friendCodeBox').hidden=false;await connect();};
 $('copyFriendCode').onclick=async()=>{try{await navigator.clipboard.writeText(state?.profile.code||'');message('Code copied! Send it to your friend.')}catch{message('Your code is shown above. Select it to copy.')}};
 $('enterFriendCode').onclick=async()=>{const code=$('friendCodeInput').value.trim();await run(()=>socialApi('add',{code}));};
 $('friendCodeInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('enterFriendCode').click();}};
 $('toastAccept').onclick=()=>respond(lastInvite,true);$('toastDecline').onclick=()=>respond(lastInvite,false);
 $('friendRefresh').onclick=connect;
 document.addEventListener('archerbox:profile-open',connect);
 document.addEventListener('archerbox:profile-save',()=>{needsProfileSave=true;connect()});
 window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)lastSharedLook=null;});
 document.addEventListener('archerbox:race-left',e=>{if(e.detail?.roomId)ignoredRooms.add(e.detail.roomId);currentRoom=null;});
 setInterval(()=>{if(!document.hidden)connect()},4000);connect();
}
