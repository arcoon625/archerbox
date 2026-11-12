import {NFL_DATA} from '../public/fantasy/nfl-data.js';
import {NFL_SEASON,parseNflWeek,fantasyUrl,scoreboardUrl,fantasyFilter} from '../public/fantasy/nfl-source.js';

// Public sports data only. No account cookies, manager IDs or league codes are
// sent to ESPN. A dated verified snapshot survives temporary provider outages.
export function createNflProvider({fetcher=(...args)=>fetch(...args),now=()=>Date.now(),snapshot=NFL_DATA}={}){
 const cache=new Map(),pending=new Map();
 return async function getNflWeek(week,{refresh=false}={}){
  if(!Number.isInteger(week)||week<1||week>18)throw Error('Choose an NFL week from 1 to 18.');
  const existing=cache.get(week),age=now()-(existing?.at||0);
  if(existing&&age<(refresh?60000:15*60000))return existing.data;
  if(pending.has(week))return pending.get(week);
  const work=(async()=>{
   try{
    async function get(url,headers={}){const r=await fetcher(url,{headers,signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('NFL provider unavailable.');return r.json();}
    const [points,board]=await Promise.all([get(fantasyUrl(NFL_SEASON,week),{'X-Fantasy-Filter':fantasyFilter(week)}),get(scoreboardUrl(NFL_SEASON,week))]);
    const data=parseNflWeek(points,board,{season:NFL_SEASON,week,checkedAt:new Date(now()).toISOString(),teams:snapshot.teams});delete data.players;
    cache.set(week,{at:now(),data});return data;
   }catch(error){
    const saved=existing?.data||snapshot.weeks[week];
    if(!saved)throw Error('NFL points could not be checked. Try again shortly.');
    const data={...saved,fallback:true};cache.set(week,{at:now(),data});return data;
   }finally{pending.delete(week);}
  })();pending.set(week,work);return work;
 };
}
export const getNflWeek=createNflProvider();
