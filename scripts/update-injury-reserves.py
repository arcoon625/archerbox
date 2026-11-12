"""Build real, active reserve-player options without changing the starting units."""
import concurrent.futures
import datetime
import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHECKED = datetime.date.today().isoformat()
CACHE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('/tmp/archer-injury-rosters-' + CHECKED)
CACHE.mkdir(exist_ok=True)
BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams'

def read(path, url):
    if not path.exists():
        with urllib.request.urlopen(url, timeout=35) as response:
            path.write_text(json.dumps(json.load(response)))
    return json.loads(path.read_text())

raw = read(CACHE / 'teams.json', BASE + '?limit=100')
teams = [entry['team'] for entry in raw['sports'][0]['leagues'][0]['teams']] if isinstance(raw, dict) else raw

def snapshot(t):
    base = BASE + '/' + t['id']
    roster = read(CACHE / (t['id'] + '-roster.json'), base + '/roster')
    charts = read(CACHE / (t['id'] + '-depthcharts.json'), base + '/depthcharts')['depthchart']
    players = {}
    for group in roster['athletes']:
        if group['position'] not in ['offense', 'defense', 'specialTeam']:
            continue
        for a in group['items']:
            if not a.get('jersey', '').isdigit() or a.get('status', {}).get('type') not in ['active', 'day-to-day']:
                continue
            players[a['id']] = dict(id=a['id'], name=a['displayName'], shortName=a['shortName'], number=int(a['jersey']), position=a['position']['abbreviation'])
    by_slot = {}
    for chart in charts:
        for slot, data in chart['positions'].items():
            by_slot[slot] = [a['id'] for a in data['athletes'] if a['id'] in players]
    assert any(p['position'] == 'QB' for p in players.values()), t['slug']
    return t['slug'], dict(checked=CHECKED, source=base + '/depthcharts', rosterSource=base + '/roster', players=list(players.values()), bySlot=by_slot)

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    snapshots = dict(pool.map(snapshot, teams))
assert len(snapshots) == 32
out = ROOT / 'public/games/touchdown-rush/reserves.js'
out.write_text('// Active roster members and depth-chart order; excludes IR, suspended and practice-squad groups.\nexport const RESERVE_ROSTERS = ' + json.dumps(snapshots, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('Verified', sum(len(r['players']) for r in snapshots.values()), 'active roster identities across 32 teams; wrote', out)
