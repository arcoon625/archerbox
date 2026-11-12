"""Refresh only the game's special teams snapshot from ESPN depth charts.

An optional cache directory reuses downloaded roster/depth-chart JSON. Every
selection must be a named member of that team's roster with a jersey number;
holders and returners come from their own chart slots, never position guesses.
"""
import concurrent.futures
import datetime
import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams'
CACHE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('/tmp/archer-special-teams-' + datetime.date.today().isoformat())
CACHE.mkdir(exist_ok=True)

def fetch(path, url):
    if not path.exists():
        with urllib.request.urlopen(url, timeout=35) as response:
            path.write_text(json.dumps(json.load(response)))
    return json.loads(path.read_text())

teams = fetch(CACHE / 'teams.json', BASE + '?limit=100')
if isinstance(teams, dict):
    teams = [entry['team'] for entry in teams['sports'][0]['leagues'][0]['teams']]

def snapshot(team):
    base = BASE + '/' + team['id']
    raw = fetch(CACHE / (team['id'] + '-roster.json'), base + '/roster')
    charts = fetch(CACHE / (team['id'] + '-depthcharts.json'), base + '/depthcharts')['depthchart']
    athletes = {a['id']: a for group in raw['athletes'] for a in group['items']}
    special = next(chart['positions'] for chart in charts if 'pk' in chart['positions'])
    result = dict(season=raw['season']['year'], source=base + '/depthcharts', rosterSource=base + '/roster', sourcePage='https://www.espn.com/nfl/team/depth/_/name/' + team['abbreviation'].lower())
    for slot, role in [('pk', 'K'), ('p', 'P'), ('h', 'H'), ('ls', 'LS'), ('kr', 'KR'), ('pr', 'PR')]:
        entry = special[slot]['athletes'][0]
        athlete = athletes[entry['id']]
        assert athlete.get('jersey', '').isdigit(), (team['slug'], slot)
        result[role] = dict(id=athlete['id'], name=athlete['displayName'], shortName=athlete['shortName'], number=int(athlete['jersey']), position=athlete['position']['abbreviation'], depthSlot=slot)
    assert len({result[role]['id'] for role in ['K', 'P', 'LS']}) == 3
    return team['slug'], result

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    result = dict(pool.map(snapshot, teams))
assert len(result) == 32
out = ROOT / 'public/games/touchdown-rush/special-teams.js'
out.write_text('// Listed specialists, checked against each team roster; a dated snapshot, not a live injury report.\nexport const SPECIAL_TEAMS_CHECKED = ' + json.dumps(datetime.date.today().isoformat()) + ';\nexport const SPECIAL_TEAMS = ' + json.dumps(result, ensure_ascii=False, indent=1) + ';\n')
print('Verified 192 special teams roles across 32 NFL teams; wrote', out)
