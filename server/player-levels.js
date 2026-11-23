import {XP_REWARDS,levelInfo} from '../public/progression/rules.js';

// Keep XP from achievements saved before these games left the catalog.
const historicXP=[
  ['outpost-maze','finish',75],
  ['basketball-stars','basket',15]
];
const xpRates=new Map([
  ...XP_REWARDS.map(({game,event,xp})=>[game+'/'+event,xp]),
  ...historicXP.map(([game,event,xp])=>[game+'/'+event,xp])
]);
const currentGames=new Set(XP_REWARDS.map(({game})=>game));
export async function playerLevels(db,id,now) {
  // Read the same deduplicated achievements as the leaderboards. This also gives existing
  // players credit for their recorded results. Group first so the query stays the same
  // size as the catalog grows, and only one row per game and event comes back from D1.
  const {results}=await db.prepare(`SELECT game,event,SUM(amount) AS amount
    FROM chart_scores WHERE user_id=? GROUP BY game,event`).bind(id).all();
  let xp=0,achievements=0;
  const played=new Set();
  for(const {game,event,amount} of results){
    xp+=amount*(xpRates.get(game+'/'+event)||0);
    achievements+=amount;
    if(currentGames.has(game))played.add(game);
  }
  return {...levelInfo(xp),achievements,gamesPlayed:played.size,asOf:now};
}
