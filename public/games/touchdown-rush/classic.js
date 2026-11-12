import {teamRoster} from './rosters.js?v=injuries1';
export const CLASSIC_HILL={id:'3116406',name:'Tyreek Hill',shortName:'T. Hill',number:10,position:'WR',depthSlot:'wr1',classic:true};
// Optional, clearly labeled guest star. The dated current roster stays intact.
export function gameRoster(id,classicHill=false){
 const r=teamRoster(id);if(id!=='miami-dolphins'||!classicHill)return r;
 const offense=r.offense.map((p,i)=>i===1?{...CLASSIC_HILL}:p);
 if(offense.some((p,i)=>i!==1&&p.number===10))return r;
 return {...r,offense,classicHill:true};
}
