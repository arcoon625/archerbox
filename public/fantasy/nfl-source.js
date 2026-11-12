// ESPN's appliedTotal from its public non-PPR defaults is the score. Never replace
// missing actuals with a projection, a different season or generated statistics.
export const NFL_SEASON=2026;
export const NFL_FORMAT='STANDARD';
const positions={1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'DEF'};
const round=n=>Math.round(n*100)/100;
export function fantasyUrl(season,week){return `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leaguedefaults/1?view=kona_player_info&scoringPeriodId=${week}`;}
export function scoreboardUrl(season,week){return `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}`;}
export function fantasyFilter(week){return JSON.stringify({players:{limit:2000,sortPercOwned:{sortAsc:false,sortPriority:1},filterStatsForScoringPeriodIds:{value:[week]}}});}
export function parseNflWeek(payload,board,{season=NFL_SEASON,week,checkedAt=new Date().toISOString(),teams={}}={}){
 if(!Number.isInteger(week)||week<1||week>18||!Array.isArray(payload?.players)||payload.players.length<100)throw Error('Incomplete NFL player feed.');
 if(board?.season?.year!==season||board?.season?.type!==2||board?.week?.number!==week||!board.events?.length)throw Error('The NFL schedule does not match this scoring week.');
 const byes=new Set((board.week.teamsOnBye||[]).map(t=>String(t.id))),games=new Map();
 for(const event of board.events)for(const c of event.competitions?.[0]?.competitors||[])games.set(String(c.team.id),event.status?.type);
 const complete=board.events.every(e=>e.status?.type?.completed===true),players=[],results={};let actuals=0;
 for(const row of payload.players){
  const p=row.player||row,position=positions[p.defaultPositionId],teamId=String(p.proTeamId),t=teams[teamId]||{};
  if(!position||!/^\-?\d+$/.test(String(p.id))||!p.fullName||Number(p.proTeamId)<=0||p.active===false)continue;
  const id='nfl-'+p.id,rank=p.draftRanksByRankType?.STANDARD?.rank||Math.round(p.ownership?.averageDraftPosition)||999;
  players.push({id,espnId:String(p.id),name:p.fullName,position,kind:'nfl',nflTeam:t.abbreviation||teamId,teamId,color:/^[a-f\d]{6}$/i.test(t.color||'')?'#'+t.color:'#355437',draftRank:rank,projection:round(1000/(rank+10))});
  const actual=(p.stats||[]).find(s=>s.seasonId===season&&s.statSourceId===0&&s.statSplitTypeId===1&&s.scoringPeriodId===week&&Number.isFinite(s.appliedTotal));
  const game=games.get(String(actual?.proTeamId??p.proTeamId));
  let points=null,status='unreported';
  if(actual){points=round(actual.appliedTotal);status='reported';actuals++;}
  else if(byes.has(teamId)){points=0;status='bye';}
  // An omitted score is not a made-up zero. It contributes no points, and the
  // UI keeps its missing status visible until the provider supplies a result.
  results[id]={points,status,gameFinal:game?.completed===true||status==='bye'};
 }
 if(players.length<100||actuals<30)throw Error('Actual NFL scores are unavailable for this week.');
 return {season,week,format:NFL_FORMAT,checkedAt,complete,source:fantasyUrl(season,week),scheduleSource:scoreboardUrl(season,week),players,results};
}
export function applyNflScores(league,data){
 const w=league.active;if(league.mode!=='nfl'||league.phase!=='live'||!w)return;
 if(data.season!==league.nflSeason||data.week!==w.nflWeek||data.format!==NFL_FORMAT||!data.complete)throw Error('NFL scores do not match this league week.');
 w.source={provider:'ESPN',format:data.format,season:data.season,nflWeek:data.week,checkedAt:data.checkedAt,url:data.source,complete:true,fallback:!!data.fallback};w.results={};
 for(const p of league.pool){const r=data.results[p.id];w.results[p.id]={points:r?.points??null,status:r?.status||'unreported',kind:'nfl',stats:{},games:r?.status==='reported'?1:0};}
 for(const t of league.teams)w.scores[t.id]=round(w.lockedLineups[t.id].reduce((sum,id)=>sum+(w.results[id]?.points??0),0));
}
