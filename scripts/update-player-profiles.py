"""Bundle dated roster measurements and source headshots for 3D face projection.
Requires the existing temporary headshot cache and extract-player-faces.swift.
No face identification or demographic classification is performed.
"""
import concurrent.futures,json,pathlib,subprocess,urllib.request,urllib.error,time,re,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=pathlib.Path('/tmp/archer-player-appearance')
raw=subprocess.check_output(['node','--input-type=module','-e',"import {ROSTERS} from './public/games/touchdown-rush/rosters.js';console.log(JSON.stringify(Object.values(ROSTERS).flatMap(r=>[...r.offense,...r.defense,...r.reserves.players,...['K','P','H','LS','KR','PR'].map(k=>r.specialTeams[k])])));"],cwd=ROOT,text=True)
players={p['id']:p for p in json.loads(raw)}
players['3116406']={'id':'3116406','name':'Tyreek Hill','position':'WR'}
starters=set(json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {ROSTERS} from './public/games/touchdown-rush/rosters.js';console.log(JSON.stringify(Object.values(ROSTERS).flatMap(r=>r.offense.slice(0,6).map(p=>p.id))))"],cwd=ROOT,text=True)))|{'3116406'}
measurements={}
for file in pathlib.Path('/tmp/archer-injury-rosters-2026-10-19').glob('*-roster.json'):
 for group in json.loads(file.read_text()).get('athletes',[]):
  for p in group['items']:
   if p['id'] in players and 60<=p.get('height',0)<=90 and 140<=p.get('weight',0)<=420:
    measurements[p['id']]=[p['height'],p['weight']]
for player_id in set(players)-set(measurements):
 data=json.load(urllib.request.urlopen('https://site.api.espn.com/apis/common/v3/sports/football/nfl/athletes/'+player_id,timeout=20))['athlete']
 feet,inches=map(int,re.findall(r'\d+',data['displayHeight']));height=feet*12+inches
 weight=float(re.findall(r'\d+',data['displayWeight'])[0])
 assert 60<=height<=90 and 140<=weight<=420,data.get('displayName')
 measurements[player_id]=[height,weight]

out=ROOT/'public/games/touchdown-rush/faces';out.mkdir(exist_ok=True)
def download(player_id):
 file=out/(player_id+('.jpg' if player_id=='5344782' else '.png'))
 if player_id in starters and (CACHE/(player_id+'.png')).exists():
  shutil.copyfile(CACHE/(player_id+'.png'),file);return
 if file.exists():return
 # Official CDN resizing keeps the source face intact. The mesh uses source UVs;
 # no generated face, identity swap, or per-frame external request is involved.
 url='https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/'+player_id+'.png&w=256&h=186'
 if player_id=='5344782':
  file.write_bytes((CACHE/(player_id+'.png')).read_bytes());return
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=20) as response:data=response.read()
   assert data.startswith(b'\x89PNG') and len(data)>500,player_id
   file.write_bytes(data);return
  except Exception:
   if attempt==2:raise
   time.sleep(.4)
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
 for i,_ in enumerate(pool.map(download,players),1):
  if i%300==0:print('Prepared',i,'portraits',flush=True)
print('Prepared',len(players),'portraits and real measurements',flush=True)
# Face bounds are produced independently by the offline Vision geometry tool.
bounds=json.loads((CACHE/'face-bounds.json').read_text())
profiles={}
missing=[]
for player_id,p in players.items():
 h,w=measurements[player_id];b=bounds.get(player_id)
 if not b:missing.append((player_id,p['name']))
 profiles[player_id]={'height':h,'weight':w,'face':None if not b else [round(x,5) for x in b]}
(ROOT/'public/games/touchdown-rush/player-profiles.js').write_text('// 2026 roster measurements in inches/pounds; source headshot UV rectangles. Cosmetic only.\nexport const PROFILE_SEASON=2026;\nexport const PROFILE_CHECKED="2026-10-20";\nexport const PLAYER_PROFILES='+json.dumps(dict(sorted(profiles.items())),separators=(',',':'))+';\n')
print('Wrote',len(profiles),'profiles. Procedural face fallbacks:',missing,flush=True)
subprocess.run(['node','scripts/compress-player-faces.mjs'],cwd=ROOT,check=True)
