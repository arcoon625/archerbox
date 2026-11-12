import {JERSEYS,TEAM_SIZE} from './rules.js?v=realism2026';
// Team names: https://www.nfl.com/teams/ . Colors are game approximations.
// Titans use the light-blue home look introduced in March 2026.
const hex=c=>'#'+c.toString(16).padStart(6,'0');
const team=(id,name,shortName,mark,conference,color,accent,helmetColor)=>({id,name,shortName,mark,conference,color,accent,helmetColor,css:hex(color),accentCss:hex(accent),numberColor:'#ffffff'});
export const TEAMS=[
 team('arizona-cardinals','Arizona Cardinals','Cardinals','ARI','NFC',0x97233f,0xffb612,0xffffff),
 team('atlanta-falcons','Atlanta Falcons','Falcons','ATL','NFC',0xa71930,0x0,0x111111),
 team('baltimore-ravens','Baltimore Ravens','Ravens','BAL','AFC',0x241773,0x9e7c0c,0x111111),
 team('buffalo-bills','Buffalo Bills','Bills','BUF','AFC',0x338d,0xc60c30,0xffffff),
 team('carolina-panthers','Carolina Panthers','Panthers','CAR','NFC',0x101820,0x85ca,0xbfc0bf),
 team('chicago-bears','Chicago Bears','Bears','CHI','NFC',0xb162a,0xc83803,0xb162a),
 team('cincinnati-bengals','Cincinnati Bengals','Bengals','CIN','AFC',0xfb4f14,0x111111,0xfb4f14),
 team('cleveland-browns','Cleveland Browns','Browns','CLE','AFC',0x311d00,0xff3c00,0xff3c00),
 team('dallas-cowboys','Dallas Cowboys','Cowboys','DAL','NFC',0x3594,0x869397,0xb0b7bc),
 team('denver-broncos','Denver Broncos','Broncos','DEN','AFC',0xfb4f14,0x2244,0x2244),
 team('detroit-lions','Detroit Lions','Lions','DET','NFC',0x76b6,0xb0b7bc,0xb0b7bc),
 team('green-bay-packers','Green Bay Packers','Packers','GB','NFC',0x203731,0xffb612,0xffb612),
 team('houston-texans','Houston Texans','Texans','HOU','AFC',0x3202f,0xa71930,0x3202f),
 team('indianapolis-colts','Indianapolis Colts','Colts','IND','AFC',0x2c5f,0xffffff,0xffffff),
 team('jacksonville-jaguars','Jacksonville Jaguars','Jaguars','JAX','AFC',0x6778,0xd7a22a,0x111111),
 team('kansas-city-chiefs','Kansas City Chiefs','Chiefs','KC','AFC',0xe31837,0xffb81c,0xe31837),
 team('las-vegas-raiders','Las Vegas Raiders','Raiders','LV','AFC',0x101010,0xa5acaf,0xa5acaf),
 team('los-angeles-chargers','Los Angeles Chargers','Chargers','LAC','AFC',0x80c6,0xffc20e,0xffffff),
 team('los-angeles-rams','Los Angeles Rams','Rams','LAR','NFC',0x3594,0xffd100,0x3594),
 team('miami-dolphins','Miami Dolphins','Dolphins','MIA','AFC',0x8e97,0xfc4c02,0xffffff),
 team('minnesota-vikings','Minnesota Vikings','Vikings','MIN','NFC',0x4f2683,0xffc62f,0x4f2683),
 team('new-england-patriots','New England Patriots','Patriots','NE','AFC',0x2244,0xc60c30,0xb0b7bc),
 team('new-orleans-saints','New Orleans Saints','Saints','NO','NFC',0x101820,0xd3bc8d,0xd3bc8d),
 team('new-york-giants','New York Giants','Giants','NYG','NFC',0xb2265,0xa71930,0xb2265),
 team('new-york-jets','New York Jets','Jets','NYJ','AFC',0x125740,0xffffff,0x125740),
 team('philadelphia-eagles','Philadelphia Eagles','Eagles','PHI','NFC',0x4c54,0xa5acaf,0x4c54),
 team('pittsburgh-steelers','Pittsburgh Steelers','Steelers','PIT','AFC',0x101820,0xffb612,0x101820),
 team('san-francisco-49ers','San Francisco 49ers','49ers','SF','NFC',0xaa0000,0xb3995d,0xb3995d),
 team('seattle-seahawks','Seattle Seahawks','Seahawks','SEA','NFC',0x2244,0x69be28,0x2244),
 team('tampa-bay-buccaneers','Tampa Bay Buccaneers','Buccaneers','TB','NFC',0xd50a0a,0xb1babf,0x665c51),
 team('tennessee-titans','Tennessee Titans','Titans','TEN','AFC',0x4b92db,0xc8102e,0xffffff),
 team('washington-commanders','Washington Commanders','Commanders','WAS','NFC',0x5a1414,0xffb612,0x5a1414),
];
export const DEFAULT_TEAM_ID='dallas-cowboys',DEFAULT_OPPONENT_ID='kansas-city-chiefs';
export function findTeams(query=''){const q=query.trim().toLowerCase();return TEAMS.filter(t=>(t.name+' '+t.mark+' '+t.conference).toLowerCase().includes(q))}
export function jerseyNumber(value){const s=String(value).trim();if(!/^\d{1,2}$/.test(s))throw Error('Choose a whole jersey number from 0 to 99.');return Number(s)}
export function rosterNumbers(values){if(!Array.isArray(values)||values.length!==TEAM_SIZE)throw Error('Give all 11 players a jersey number.');const numbers=values.map(jerseyNumber);if(new Set(numbers).size!==TEAM_SIZE)throw Error('Each player on your team needs a different number.');return numbers}
export function captainNumber(numbers,value){const next=jerseyNumber(value),result=rosterNumbers(numbers),old=result[0],other=result.indexOf(next);if(other>0)result[other]=old;result[0]=next;return result}
export function defaultNumbers(){return JERSEYS.slice(0,TEAM_SIZE)}
export function teamById(id){return TEAMS.find(t=>t.id===id)}
