import {XP_REWARDS,levelInfo} from '../public/progression/rules.js';

// Keep XP from achievements saved before these games left the catalog.
const historicXP=[
  ['outpost-maze','finish',75],
  ['basketball-stars','basket',15]
];
const xpRates=[...XP_REWARDS.map(({game,event,xp})=>[game,event,xp]),...historicXP];
const xpCase=xpRates.map(()=> 'WHEN game=? AND event=? THEN amount*?').join(' ');
const xpArgs=xpRates.flat();
const currentGames=[...new Set(XP_REWARDS.map(({game})=>game))];
const gamePlaceholders=currentGames.map(()=>'?').join(',');
export async function playerLevels(db,id,now) {
  // Read the same deduplicated achievements as the leaderboards. This also gives existing
  // players credit for their recorded results without trusting local coin balances.
  const stats=await db.prepare(`SELECT COALESCE(SUM(CASE ${xpCase} ELSE 0 END),0) AS xp,
    COALESCE(SUM(amount),0) AS achievements,
    COUNT(DISTINCT CASE WHEN game IN (${gamePlaceholders}) THEN game END) AS gamesPlayed
    FROM chart_scores WHERE user_id=?`).bind(...xpArgs,...currentGames,id).first();
  return {...levelInfo(stats.xp),achievements:stats.achievements,gamesPlayed:stats.gamesPlayed,asOf:now};
}
