import {XP_REWARDS,levelInfo} from '../public/progression/rules.js';
const xpCase=XP_REWARDS.map(()=> 'WHEN game=? AND event=? THEN amount*?').join(' ');
const xpArgs=XP_REWARDS.flatMap(r=>[r.game,r.event,r.xp]);
export async function playerLevels(db,id,now) {
  // Read the same deduplicated achievements as the leaderboards. This also gives existing
  // players credit for their recorded results without trusting local coin balances.
  const stats=await db.prepare(`SELECT COALESCE(SUM(CASE ${xpCase} ELSE 0 END),0) AS xp,
    COALESCE(SUM(amount),0) AS achievements,COUNT(DISTINCT game) AS gamesPlayed
    FROM chart_scores WHERE user_id=?`).bind(...xpArgs,id).first();
  return {...levelInfo(stats.xp),achievements:stats.achievements,gamesPlayed:stats.gamesPlayed,asOf:now};
}
