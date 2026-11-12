"""Dated regular-season production inputs for original arcade traits.
Public numeric stats only. Does not alter rosters or fetch anything at runtime.
"""
import concurrent.futures,datetime,json,pathlib,subprocess,sys,urllib.request,urllib.error,argparse
ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('cache',nargs='?');parser.add_argument('--season',type=int,choices=[2025,2026],default=2026);args=parser.parse_args()
CACHE=pathlib.Path(args.cache) if args.cache else pathlib.Path('/tmp/archer-player-traits-'+str(args.season)+'-2026-10-20')
CACHE.mkdir(exist_ok=True)
raw=subprocess.check_output(['node','--input-type=module','-e',"import {ROSTERS} from './public/games/touchdown-rush/rosters.js';console.log(JSON.stringify(Object.values(ROSTERS).flatMap(r=>[...r.offense,...r.defense,...r.reserves.players])))"],cwd=ROOT,text=True)
players={p['id']:p for p in json.loads(raw) if p['position'] in ['QB','RB','FB','WR','TE','LB','ILB','OLB','DE','EDGE','DT','NT','CB','DB','S','FS','SS']}
players['3116406']={'id':'3116406','name':'Tyreek Hill','position':'WR'}
KEYS=['gamesPlayed','passingAttempts','completions','completionPct','interceptions','rushingAttempts','rushingYards','rushingTouchdowns','receptions','receivingTargets','receivingYards','receivingYardsAfterCatch','totalTackles','sacks','passesDefended']
URL='https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/'+str(args.season)+'/types/2/athletes/{id}/statistics/0?lang=en&region=us'
def fetch(p):
 file=CACHE/(p['id']+'.json')
 if not file.exists():
  try:
   with urllib.request.urlopen(URL.format(id=p['id']),timeout=18) as response:data=json.load(response)
  except urllib.error.HTTPError as e:
   if e.code!=404:raise
   data={}
  file.write_text(json.dumps(data))
 data=json.loads(file.read_text());stats={}
 for c in data.get('splits',{}).get('categories',[]):
  for s in c['stats']:
   if s['name'] in KEYS:stats[s['name']]=round(s.get('value',0),3)
 if not stats:return None
 return p['id'],dict(name=p['name'],position=p['position'],stats=stats)
result={};failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=14) as pool:
 futures={pool.submit(fetch,p):p for p in players.values()}
 for count,f in enumerate(concurrent.futures.as_completed(futures),1):
  try:
   item=f.result()
   if item:result[item[0]]=item[1]
  except Exception as e:failures.append((futures[f]['name'],str(e)))
  if count%200==0:print('Checked',count,'of',len(players),'athletes',flush=True)
if failures:raise RuntimeError('Unverified requests: '+str(failures[:8]))
assert len(result)>700,len(result)
out=ROOT/('public/games/touchdown-rush/season-stats.js' if args.season==2026 else 'public/games/touchdown-rush/trait-stats.js')
prefix='export const CURRENT_SEASON=2026;\nexport const CURRENT_CHECKED=' if args.season==2026 else 'export const TRAITS_CHECKED='
name='CURRENT_STATS' if args.season==2026 else 'TRAIT_STATS'
out.write_text('// Public '+str(args.season)+' regular-season production; original arcade ratings are derived in traits.js.\n'+prefix+json.dumps(datetime.date.today().isoformat())+';\nexport const '+name+'='+json.dumps(dict(sorted(result.items())),separators=(',',':'))+';\n')
print('Wrote',len(result),'dated athlete stat lines to',out,flush=True)
