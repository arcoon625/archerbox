"""Build a reviewed NFL roster snapshot for the game's fixed 11-player units.
Run with an existing ESPN cache directory, or fetch a fresh snapshot. No browser
runtime network requests or silent roster changes are introduced.
"""
import concurrent.futures, datetime, json, pathlib, sys, urllib.request
BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams'
ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('/tmp/archer-nfl-rosters')
CACHE.mkdir(exist_ok=True)
def read(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)
if not (CACHE / 'teams.json').exists():
    teams = [x['team'] for x in read(BASE + '?limit=100')['sports'][0]['leagues'][0]['teams']]
    (CACHE / 'teams.json').write_text(json.dumps(teams))
teams = json.loads((CACHE / 'teams.json').read_text())
def fetch(t):
    for kind in ['depthcharts', 'roster']:
        path = CACHE / (t['id'] + '-' + kind + '.json')
        if not path.exists():
            path.write_text(json.dumps(read(BASE + '/' + t['id'] + '/' + kind)))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(fetch, teams))
result = {}
for t in teams:
    depth = json.loads((CACHE / (t['id'] + '-depthcharts.json')).read_text())['depthchart']
    raw = json.loads((CACHE / (t['id'] + '-roster.json')).read_text())
    athletes = {a['id']: a for group in raw['athletes'] for a in group['items']}
    offense = next(d['positions'] for d in depth if 'qb' in d['positions'])
    defense = next(d['positions'] for d in depth if 'lcb' in d['positions'])
    def unit(slots):
        used = set()
        players = []
        for slot, position in slots:
            # Only select verified team members with recorded jersey numbers.
            alternatives = {'nt':['nt','lde','rde'], 'lilb':['lilb','rilb','wlb','slb'], 'rilb':['rilb','lilb','slb','wlb']}.get(slot,[slot])
            chosen_slot = slot
            a = None
            for candidate_slot in alternatives:
                choices = defense[candidate_slot]['athletes'] if candidate_slot in defense else offense[candidate_slot]['athletes']
                a = next((athletes[c['id']] for c in choices if c['id'] in athletes and c['id'] not in used and athletes[c['id']].get('jersey', '').isdigit()), None)
                if a is not None:
                    chosen_slot = candidate_slot
                    break
            if a is None:
                raise ValueError(t['displayName'] + ': missing ' + slot)
            used.add(a['id'])
            players.append(dict(id=a['id'], name=a['displayName'], shortName=a['shortName'], number=int(a['jersey']), position=position, depthSlot=chosen_slot))
        assert len(players) == 11 and len({p['number'] for p in players}) == 11, t['displayName']
        assert all(0 <= p['number'] <= 99 for p in players)
        return players
    offensive = [('qb','QB'),('wr1','WR'),('wr2','WR'),('wr3','WR'),('te','TE'),('rb','RB'),('lt','LT'),('lg','LG'),('c','C'),('rg','RG'),('rt','RT')]
    if 'nt' in defense:
        # Adapt a 3-4 chart to the game's four rushers / three linebackers:
        # two outside linebackers rush; a verified reserve inside LB fills slot 7.
        defensive = [('wlb','EDGE'),('nt','DT'),('rde','DT'),('slb','EDGE'),('lilb','LB'),('rilb','LB'),('lilb','LB'),('lcb','CB'),('rcb','CB'),('ss','S'),('fs','S')]
    else:
        defensive = [('lde','DE'),('ldt','DT'),('rdt','DT'),('rde','DE'),('wlb','LB'),('mlb','LB'),('slb','LB'),('lcb','CB'),('rcb','CB'),('ss','S'),('fs','S')]
    result[t['slug']] = dict(season=raw['season']['year'], source=BASE+'/'+t['id']+'/depthcharts', rosterSource=BASE+'/'+t['id']+'/roster', sourcePage='https://www.espn.com/nfl/team/depth/_/name/'+t['abbreviation'].lower(), offense=unit(offensive), defense=unit(defensive))
assert len(result) == 32
out = ROOT / 'public/games/touchdown-rush/rosters.js'
out.write_text("import {SPECIAL_TEAMS} from './special-teams.js?v=specialists1';\nimport {RESERVE_ROSTERS} from './reserves.js?v=injuries1';\n"+'// ESPN depth charts and team rosters; fixed game formations, not a live injury report.\nexport const ROSTER_CHECKED = '+json.dumps(datetime.date.today().isoformat())+';\nexport const ROSTERS = '+json.dumps(result,ensure_ascii=False,indent=1)+';\nfor(const [id,roster] of Object.entries(ROSTERS)){roster.specialTeams=SPECIAL_TEAMS[id];roster.reserves=RESERVE_ROSTERS[id];}\nexport function teamRoster(id){const roster=ROSTERS[id];if(!roster)throw Error("Unknown NFL team roster");return roster}\nexport function realNumbers(id){return teamRoster(id).offense.map(p=>p.number)}\n')
print('Verified 32 teams and 704 player slots; wrote', out)
for id in ['dallas-cowboys','kansas-city-chiefs','buffalo-bills']:
    print(id, [(p['position'],p['name'],p['number']) for p in result[id]['offense']])
