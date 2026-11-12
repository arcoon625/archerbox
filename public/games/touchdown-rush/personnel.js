// The listed specialists use their actual jobs. The other spots are a fixed
// arcade protection/coverage unit of teammates, not a claimed NFL game-day unit.
export function specialTeamUnit(roster,kind,kicking){
 const s=roster.specialTeams,place=kind==='fieldGoal'||kind==='extraPoint';
 const fixed=kicking?(place?{0:['K',s.K],5:['H',s.H],8:['LS',s.LS]}:kind==='punt'?{0:['P',s.P],8:['LS',s.LS]}:{0:['K',s.K]}):{1:[kind==='punt'?'PR':'KR',kind==='punt'?s.PR:s.KR]};
 const base=place||kind==='punt'&&kicking?roster.offense:roster.defense;
 const pool=[...base,...roster.defense,...roster.offense];
 const used=new Set(Object.values(fixed).map(([,p])=>p.id)),numbers=new Set(Object.values(fixed).map(([,p])=>p.number));
 const allowed=p=>!used.has(p.id)&&!numbers.has(p.number)&&p.position!=='QB';
 return Array.from({length:11},(_,i)=>{
  if(fixed[i]){const [specialRole,p]=fixed[i];return {...p,specialRole};}
  const p=allowed(base[i])?base[i]:pool.find(allowed);
  if(!p)throw Error('Not enough distinct teammates for the special teams unit');
  used.add(p.id);numbers.add(p.number);return {...p,specialRole:null};
 });
}
