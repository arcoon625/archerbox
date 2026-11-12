import assert from 'node:assert/strict';
import {TEAM_SIZE,PASS_TARGETS,lineup,createGame,snap,step,throwPass,action,endPlay,direction,switchDefender,strikePlaceKick} from '../public/games/touchdown-rush/rules.js';
import {TEAMS,findTeams,jerseyNumber,rosterNumbers,captainNumber,defaultNumbers,teamById} from '../public/games/touchdown-rush/teams.js';
import {ROSTERS,teamRoster,realNumbers} from '../public/games/touchdown-rush/rosters.js';
const advance=(g,seconds,input={})=>{for(let t=0;t<seconds;t+=1/120)step(g,input,1/120)};
function convert(g){advance(g,2.6);assert.equal(g.phase,'placekick-aim');strikePlaceKick(g,0,.8);for(let i=0;i<1000&&g.phase==='placekick-flight';i++)step(g,{},1/120);}
{
 assert.deepEqual(Object.keys(ROSTERS).sort(),TEAMS.map(t=>t.id).sort());
 for(const t of TEAMS){const r=teamRoster(t.id);assert.equal(r.season,2026);for(const unit of ['offense','defense']){assert.equal(r[unit].length,11);assert.equal(new Set(r[unit].map(p=>p.id)).size,11);assert.equal(new Set(r[unit].map(p=>p.number)).size,11);assert(r[unit].every(p=>p.name&&p.shortName&&Number.isInteger(p.number)&&p.number>=0&&p.number<=99))}assert.deepEqual(r.offense.map(p=>p.position),['QB','WR','WR','WR','TE','RB','LT','LG','C','RG','RT']);assert(r.defense.slice(0,4).every(p=>['DE','DT','EDGE'].includes(p.position)));assert(r.defense.slice(4,7).every(p=>p.position==='LB'));assert(r.defense.slice(7,9).every(p=>p.position==='CB'));assert(r.defense.slice(9).every(p=>p.position==='S'))}
 assert.equal(teamRoster('dallas-cowboys').offense[0].name,'Dak Prescott');assert.equal(teamRoster('kansas-city-chiefs').offense[0].name,'Patrick Mahomes');assert.equal(teamRoster('buffalo-bills').offense[0].name,'Josh Allen');
 const custom=captainNumber(realNumbers('dallas-cowboys'),99),g=createGame('rookie',{offenseNumbers:[custom,null]});assert.equal(g.actors[0].name,'Dak Prescott');assert.equal(g.actors[0].jerseyNumber,99);assert.equal(g.actors[1].name,'CeeDee Lamb');assert.equal(g.actors[1].role,'WR');
 snap(g,'run');g.actors[g.carrier].z=-51;step(g,{},.01);convert(g);advance(g,6);assert.equal(g.offense,1);assert.equal(g.actors[g.carrier].name,'Nikko Remigio');endPlay(g,'tackle');advance(g,2.6);assert.equal(g.actors[11].name,'Patrick Mahomes');assert.equal(g.actors[11].role,'QB');assert.equal(g.actors[11].jerseyNumber,15);assert.notEqual(g.actors[0].name,'Dak Prescott');assert.equal(g.actors[0].unit,'defense');assert.equal(g.actors[0].name,teamRoster('dallas-cowboys').defense[0].name);assert.equal(g.actors[0].jerseyNumber,teamRoster('dallas-cowboys').defense[0].number);
 endPlay(g,'tackle');advance(g,3);for(let i=0;i<4;i++){if(g.phase==='ready')snap(g,'deep');endPlay(g,'incomplete');advance(g,3)}assert.equal(g.offense,0);assert.equal(g.actors[0].name,'Dak Prescott');assert.equal(g.actors[0].jerseyNumber,99);
}

{
 assert.equal(TEAMS.length,32);assert.equal(new Set(TEAMS.map(t=>t.id)).size,32);assert.equal(new Set(TEAMS.map(t=>t.name)).size,32);
 assert.equal(TEAMS.filter(t=>t.conference==='AFC').length,16);assert.equal(TEAMS.filter(t=>t.conference==='NFC').length,16);
 for(const t of TEAMS){assert(t.name.endsWith(t.shortName));assert.match(t.css,/^#[0-9a-f]{6}$/);assert.match(t.accentCss,/^#[0-9a-f]{6}$/);assert(t.mark.length<=3);assert(Number.isInteger(t.helmetColor))}
 assert.deepEqual(findTeams(' seattle ').map(t=>t.name),['Seattle Seahawks']);assert.equal(findTeams('49ers')[0].id,'san-francisco-49ers');assert.equal(findTeams('KC')[0].name,'Kansas City Chiefs');assert.equal(findTeams('no such team').length,0);
 assert.equal(teamById('dallas-cowboys').name,'Dallas Cowboys');assert.equal(teamById('unknown'),undefined);assert.equal(jerseyNumber('0'),0);assert.equal(jerseyNumber('99'),99);
 for(const invalid of ['','-1','100','1.5','1e1','hello'])assert.throws(()=>jerseyNumber(invalid));
 const originals=defaultNumbers(),swapped=captainNumber(originals,7);assert.equal(swapped[0],7);assert.equal(swapped[1],12);assert.equal(new Set(swapped).size,11);assert.equal(originals[0],12);
 assert.equal(captainNumber(originals,99)[0],99);assert.throws(()=>rosterNumbers([1,2]));assert.throws(()=>rosterNumbers(Array(11).fill(7)));assert.deepEqual(rosterNumbers(Array.from({length:11},(_,i)=>i)),Array.from({length:11},(_,i)=>i));
 const game=createGame('rookie',{teamNames:['Dallas Cowboys','Kansas City Chiefs']});game.scores[0]=14;snap(game,'run');game.actors[5].z=-51;step(game,{},.01);convert(game);assert.equal(game.event,'DALLAS COWBOYS WIN!');assert(game.detail.includes('Kansas City Chiefs'));
 const cpu=createGame('rookie',{teamNames:['Seattle Seahawks','Buffalo Bills']});cpu.offense=1;cpu.line=-30;lineup(cpu);snap(cpu,'run');cpu.actors[cpu.carrier].z=51;step(cpu,{},.01);assert.equal(cpu.event,'BUFFALO BILLS TOUCHDOWN');
}
{
 const g=createGame();assert.equal(g.difficulty,'pro');assert.equal(g.actors.filter(a=>a.team===0).length,11);assert.equal(g.actors.filter(a=>a.team===1).length,11);
 assert.equal(new Set(g.actors.map(a=>a.name)).size,22);assert.equal(g.actors.filter(a=>['LT','LG','C','RG','RT'].includes(a.role)).length,5);
 assert.equal(g.actors.filter(a=>a.role==='S').length,2);assert.equal(g.actors.filter(a=>a.role==='CB').length,2);
 snap(g,'deep');assert(!throwPass(g,6),'linemen cannot receive a pass');assert(!throwPass(g,TEAM_SIZE+1),'opponents cannot be targeted');
 for(const target of PASS_TARGETS){const h=createGame('rookie');snap(h,'deep');for(const a of h.actors.filter(a=>a.team===1)){a.x=25;a.z=-45}assert(throwPass(h,target));advance(h,1.5,{z:-1});assert.equal(h.carrier,target);assert.equal(h.control,target)}
}
{
 const times=[];
 for(const mode of ['rookie','pro','allstar']){const g=createGame(mode);snap(g,'deep');let t=0;while(g.phase!=='dead'&&t<15){step(g,{},1/120);t+=1/120}assert.equal(g.event,'SACKED!');times.push(t)}
 assert(times[2]<times[1]&&times[1]<times[0],'CPU quarterback pressure gets stronger at each difficulty');
 const scores=[];for(const mode of ['rookie','pro','allstar']){const g=createGame(mode);snap(g,'deep');throwPass(g,1);advance(g,10,{z:-1,sprint:true});scores.push(g.scores[0])}
 assert.equal(scores[0],6);assert.equal(scores[1],0);assert.equal(scores[2],0,'elite defense stops the old straight pass-and-sprint touchdown');
 for(const mode of ['rookie','pro','allstar'])for(const play of ['deep','slant','run']){
  const g=createGame(mode);g.offense=1;g.line=-30;g.goal=-20;lineup(g);advance(g,2.1);assert.equal(g.phase,'live');advance(g,8);for(const a of g.actors){assert(Number.isFinite(a.x)&&Number.isFinite(a.z));assert(Math.abs(a.x)<=25.3&&Math.abs(a.z)<=58)}assert(g.clock<180,'CPU plays advance the match');
 }
}
{
 const g=createGame('rookie');assert.equal(g.phase,'ready');assert.equal(g.actors.length,22);snap(g,'deep');advance(g,1.5);assert(throwPass(g,1));advance(g,1.5);assert.equal(g.phase,'live');assert.equal(g.control,1);assert.equal(g.carrier,1);assert.equal(g.stats.passes,1);
}
{
 const g=createGame('rookie');snap(g,'run');assert.equal(g.control,5);assert.equal(g.carrier,5);action(g);assert(g.actors[5].juke>0);const startZ=g.actors[5].z,before=g.actors[5].stamina;advance(g,.5,{z:-1,sprint:true});assert(g.actors[5].stamina<before);assert(g.actors[5].z<startZ);
}
{
 const g=createGame('rookie');snap(g,'run');g.actors[5].z=19;endPlay(g,'tackle');assert.equal(g.event,'FIRST DOWN!');advance(g,3);assert.equal(g.down,1);assert.equal(g.line,19);assert.equal(g.goal,9);
 for(let i=0;i<4;i++){snap(g,'deep');endPlay(g,'incomplete');advance(g,3)}assert.equal(g.offense,1);assert.equal(g.down,1);assert.equal(g.line,19);assert.equal(g.goal,29);
}
{
 const g=createGame('rookie');snap(g,'run');g.actors[5].x=25.3;advance(g,.01);assert.equal(g.event,'OUT OF BOUNDS');assert.equal(g.phase,'dead');
}
{
 const g=createGame('rookie');snap(g,'deep');g.carrier=TEAM_SIZE+1;g.actors[TEAM_SIZE+1].z=12;endPlay(g,'interception');advance(g,3);assert.equal(g.offense,1);assert.equal(g.line,12);assert.equal(g.goal,22);
}
{
 const g=createGame('rookie');snap(g,'run');g.actors[5].z=-50.2;advance(g,.01);assert.equal(g.scores[0],6);assert.equal(g.stats.touchdowns,1);convert(g);assert.equal(g.scores[0],7);advance(g,2.6);assert.equal(g.phase,'kick');assert.equal(g.ball.kind,'kickoff');advance(g,3.2);assert.equal(g.offense,1);assert.equal(g.phase,'live');assert.equal(g.returnPlay.kind,'kickoff');
 switchDefender(g);const c=g.actors[g.control],r=g.actors[g.carrier];c.x=r.x;c.z=r.z;c.cooldown=0;r.juke=0;action(g);assert.equal(g.phase,'dead');assert.equal(g.stats.tackles,1);
}
{
 const g=createGame('rookie');g.scores[0]=14;snap(g,'run');g.actors[g.carrier].z=-50.2;advance(g,.01);assert(!g.ended);convert(g);assert(g.ended);assert.equal(g.scores[0],21);assert.equal(g.phase,'finished');
 const overtime=createGame('rookie');overtime.clock=.01;snap(overtime,'run');advance(overtime,.02);endPlay(overtime,'tackle');assert(!overtime.ended);advance(overtime,3);snap(overtime,'run');overtime.actors[overtime.carrier].z=direction(overtime.offense)*51;advance(overtime,.01);convert(overtime);assert(overtime.ended);
 const lead=createGame('rookie');lead.scores[0]=6;lead.clock=.01;snap(lead,'run');advance(lead,.02);endPlay(lead,'tackle');assert(lead.ended);
}
console.log('Football rules passed: catches, carrier control, sprint/juke, first downs, turnovers, boundaries, CPU snaps, tackles, scoring and overtime.');
