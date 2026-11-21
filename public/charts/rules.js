export const DAY=86400000;
export const PERIODS=[{id:'all-time',name:'All-time'},{id:'monthly',name:'Monthly'},{id:'weekly',name:'Weekly'},{id:'daily',name:'Daily'}];
export const METRICS=[
 ['fruit-seas','Quests completed',{quest:1},20,3],['pokemon-meadow','Pokémon discovered',{discovery:1},120,30],
 ['bearwatch','Nights survived',{survive:1},4,2],['poop-panic','Knockouts',{knockout:1},120,12],
 ['jurassic-island','Missions completed',{mission:1},30,5],['snowball-showdown','Rounds won',{'round-win':1},30,5],
 ['disaster-island','Disasters survived',{survive:1},10,3],['laser-maze','Mazes escaped',{finish:1},20,3],
 ['battle-arena','Rounds won',{'round-win':1},60,8],['touchdown-rush','Touchdowns',{touchdown:1},60,8],
 ['baseball-blast','Home runs',{'home-run':1},120,12],['neon-clash','Kills',{elimination:1},180,12],
 ['turbo-kart-racing','Races finished',{finish:1},12,2],['shark-racing','Races finished',{finish:1},20,3],
 ['alpine-rush','Trails finished',{finish:1},20,3],['ninja-rooftops','Courses finished',{finish:1},20,3],
 ['floor-is-lava','Levels escaped',{finish:1},30,5],['color-rush','Rounds survived',{round:1},60,10],
 ['hide-and-seek','Hide & seek points',{find:1,survive:5},60,10],['bakery-rush','Customers served',{serve:1},60,8],
 ['creature-vault','Creatures discovered',{discovery:1},120,30]
].map(([game,label,events,perMinute,burst])=>({game,label,events,perMinute,burst}));
const byGame=new Map(METRICS.map(m=>[m.game,m]));
export const metricFor=game=>byGame.get(game)||null;
export function periodStart(period,now=Date.now()){
 const d=new Date(now);if(!Number.isFinite(d.getTime())||!PERIODS.some(p=>p.id===period))throw Error('Choose a valid time period.');
 if(period==='all-time')return 0;d.setUTCHours(0,0,0,0);
 if(period==='monthly')d.setUTCDate(1);
 if(period==='weekly')d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
 return d.getTime();
}
export const validRun=run=>typeof run==='string'&&/^[A-Za-z0-9:._/-]{1,160}$/.test(run);
export function scoreEvent(game,event,progress){const metric=metricFor(game),weight=metric&&Object.hasOwn(metric.events,event)?metric.events[event]:0;return weight&&Number.isSafeInteger(progress)&&progress>0&&progress<=1000000?{metric,weight}:null;}
