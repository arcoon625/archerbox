import {PLAYER_SKIN_TONES,APPEARANCE_CHECKED,APPEARANCE_SOURCE,APPEARANCE_SOURCE_OVERRIDES} from './appearance-data.js?v=appearance1';
export {APPEARANCE_CHECKED};

// A cosmetic color, never a rating. Real athletes are looked up by stable ID;
// names, jersey numbers, team colors and on-field actor slots cannot change it.
export const DEFAULT_SKIN_TONE='#b98262';
export function playerAppearance(playerId){
 const id=String(playerId??''),skinTone=PLAYER_SKIN_TONES[id];
 return {playerId:id,skinTone:skinTone||DEFAULT_SKIN_TONE,matched:!!skinTone,source:skinTone?(APPEARANCE_SOURCE_OVERRIDES[id]||APPEARANCE_SOURCE.replace('{id}',id)):null};
}
