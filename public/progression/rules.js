// XP comes from completed game achievements, never purchases or time spent in a menu.
export const XP_REWARDS = [
  ['fruit-seas','quest',50], ['pokemon-meadow','discovery',20],
  ['bearwatch','survive',100], ['poop-panic','knockout',10],
  ['jurassic-island','mission',50], ['snowball-showdown','round-win',60],
  ['disaster-island','survive',50], ['laser-maze','finish',75],
  ['battle-arena','round-win',40], ['touchdown-rush','touchdown',50],
  ['baseball-blast','home-run',25], ['neon-clash','elimination',10],
  ['turbo-kart-racing','finish',75], ['shark-racing','finish',75],
  ['alpine-rush','finish',60], ['ninja-rooftops','finish',75],
  ['floor-is-lava','finish',50], ['color-rush','round',15],
  ['hide-and-seek','find',10], ['hide-and-seek','survive',50],
  ['bakery-rush','serve',25], ['creature-vault','discovery',15]
].map(([game,event,xp])=>Object.freeze({game,event,xp}));
export const LEVEL_TITLES = [
  {level:1,title:'Rookie'}, {level:5,title:'Explorer'},
  {level:10,title:'Challenger'}, {level:20,title:'All-Star'},
  {level:35,title:'Champion'}, {level:50,title:'Legend'},
  {level:75,title:'Mythic'}, {level:100,title:'Archerbox Icon'}
];
export const xpFor = (game,event) => XP_REWARDS.find(r=>r.game===game&&r.event===event)?.xp||0;
// Level 1 starts at 0 XP. The first level needs 100 XP; each following level needs 50 more.
export const levelThreshold = level => 25*(level-1)*(level+2);
export function levelInfo(value=0) {
  const totalXP=Number.isSafeInteger(value)&&value>=0?value:0;
  let level=Math.max(1,Math.floor((Math.sqrt(9+4*totalXP/25)-3)/2)+1);
  while(levelThreshold(level+1)<=totalXP)level++;
  while(levelThreshold(level)>totalXP)level--;
  const levelStartXP=levelThreshold(level),nextLevelXP=levelThreshold(level+1);
  const earnedXP=totalXP-levelStartXP,neededXP=nextLevelXP-levelStartXP;
  return {level,totalXP,title:LEVEL_TITLES.findLast(t=>level>=t.level).title,
    levelStartXP,nextLevelXP,earnedXP,neededXP,remainingXP:nextLevelXP-totalXP,
    percent:Math.min(100,Math.floor(earnedXP/neededXP*100))};
}
