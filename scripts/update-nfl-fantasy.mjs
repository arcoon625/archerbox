import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NFL_SEASON,NFL_FORMAT,parseNflWeek,fantasyUrl,scoreboardUrl,fantasyFilter} from '../public/fantasy/nfl-source.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=process.argv[2]||'/tmp/archerbox-nfl-fantasy-standard';await fs.mkdir(cache,{recursive:true});
async function read(name,url,headers={}){
 const file=path.join(cache,name);try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{}
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`NFL source returned ${response.status}: ${await response.text()}`);
 const data=await response.json();await fs.writeFile(file,JSON.stringify(data));return data;
}
const rawTeams=await read('teams.json','https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=100');
const teams=Object.fromEntries(rawTeams.sports[0].leagues[0].teams.map(({team:t})=>[t.id,{name:t.displayName,abbreviation:t.abbreviation,color:t.color}]));
const checkedAt=new Date().toISOString(),weeks={};let players=[];
// Import complete games only. An in-progress week never becomes a final score.
for(let week=1;week<=18;week++){
 const board=await read(`schedule-${week}.json`,scoreboardUrl(NFL_SEASON,week));
 if(board.season?.year!==NFL_SEASON||board.week?.number!==week||!board.events?.length||!board.events.every(e=>e.status?.type?.completed))break;
 const payload=await read(`points-${week}.json`,fantasyUrl(NFL_SEASON,week),{'X-Fantasy-Filter':fantasyFilter(week)});
 const data=parseNflWeek(payload,board,{season:NFL_SEASON,week,checkedAt,teams});
 players=data.players;delete data.players;weeks[week]=data;
 console.log(`Verified ${NFL_SEASON} NFL Week ${week}: ${Object.keys(data.results).length} players/defenses`,Object.values(data.results).filter(r=>r.status==='reported').length,'reported scores');
}
if(Object.keys(weeks).length<1)throw Error('No complete NFL week could be verified.');
for(const p of players){const photo=`games/touchdown-rush/faces/${p.espnId}.webp`;try{await fs.access(path.join(root,'public',photo));p.photo=photo;}catch{}}
const data={season:NFL_SEASON,format:NFL_FORMAT,checkedAt,teams,players,weeks};
await fs.writeFile(path.join(root,'public/fantasy/nfl-data.js'),'// Verified ESPN actual non-PPR totals, not projections. Run scripts/update-nfl-fantasy.mjs.\nexport const NFL_DATA='+JSON.stringify(data)+';\n');
console.log('Saved',players.length,'NFL draft choices and',Object.keys(weeks).length,'completed scoring weeks.');
