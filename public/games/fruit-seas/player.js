import * as THREE from '../../vendor/three.module.js';
import {readSavedLook} from '../../avatar/catalog.js';
import {buildAvatar,disposeAvatar} from '../../avatar/models.js?v=scan2';

// Keep the combat rig and equipped weapon when the player's saved outfit changes.
// The pirate body remains the fallback for players who have not saved an avatar.
export function createPlayer(base,{readLook=readSavedLook,build=buildAvatar,dispose=disposeAvatar}={}){
 const root=new THREE.Group();root.name='Fruit Seas player';root.add(base.root);
 let currentKey;
 const player={...base,root,avatar:null,refresh,animate(time,moving){player.avatar?.userData.animate(time,moving);},dispose(){player.hold.remove(player.weapon);if(player.avatar){root.remove(player.avatar);dispose(player.avatar);player.avatar=null;}}};
 function refresh(){
  let look,key,next=null;
  try{look=readLook();key=JSON.stringify(look);if(key===currentKey)return false;if(look){next=build(look,{pets:true});next.name='Archerbox avatar';next.position.y=-.08;}}
  catch{return false;}
  const previous=player.avatar,rotation=player.hold.rotation.clone();
  let hold=base.hold;
  if(next){hold=new THREE.Group();if(next.userData.handMounts?.[1])hold.position.copy(next.userData.handMounts[1]);else hold.position.set(0,-.62,.04);next.userData.arms[1].add(hold);root.add(next);}
  hold.rotation.copy(rotation);hold.add(player.weapon);
  player.avatar=next;player.hold=hold;player.arms=next?.userData.arms||base.arms;player.legs=next?.userData.legs||base.legs;
  base.root.visible=!next;root.userData.avatarLook=look||null;currentKey=key;
  if(previous){root.remove(previous);dispose(previous);}
  return true;
 }
 refresh();return player;
}
