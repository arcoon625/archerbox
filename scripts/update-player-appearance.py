"""Build cosmetic skin colors from the visible cheeks in public ESPN headshots.

This stores RGB appearance only, never racial/ethnic labels or gameplay ratings.
Photos stay in a temporary cache and are not redistributed by the game. Review
the generated contact sheets before publication; lighting makes colors estimates.
"""
import concurrent.futures
import datetime
import io
import json
import pathlib
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.request
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('/tmp/archer-player-appearance')
CACHE.mkdir(exist_ok=True)
raw = subprocess.check_output(['node', '--input-type=module', '-e', "import {ROSTERS} from './public/games/touchdown-rush/rosters.js';console.log(JSON.stringify(Object.values(ROSTERS).flatMap(r=>[...r.offense,...r.defense,...r.reserves.players,...['K','P','H','LS','KR','PR'].map(k=>r.specialTeams[k])])));"], cwd=ROOT, text=True)
players = {str(p['id']): p for p in json.loads(raw)}
players['3116406'] = dict(id='3116406', name='Tyreek Hill', position='WR')
HEADSHOT = 'https://a.espncdn.com/i/headshots/nfl/players/full/{id}.png'
overrides_file = ROOT / 'scripts/player-appearance-overrides.json'
overrides = json.loads(overrides_file.read_text()) if overrides_file.exists() else {}

def download(player_id):
    file = CACHE / (player_id + '.png')
    if file.exists():
        return file
    for attempt in range(3):
        try:
            url = overrides.get(player_id, {}).get('photoSource') or HEADSHOT.format(id=player_id)
            with urllib.request.urlopen(url, timeout=20) as response:
                data = response.read()
            image = Image.open(io.BytesIO(data))
            assert image.width >= 200 and image.height >= 150, 'No usable portrait'
            file.write_bytes(data)
            return file
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            if attempt == 2:
                raise
        except (TimeoutError, OSError):
            if attempt == 2:
                raise
        time.sleep(.25 * (attempt + 1))

def sample(file):
    image = Image.open(file).convert('RGBA').resize((600, 436))
    # Standardized headshots: small cheek patches below the eyes, above the
    # smile/beard, away from hair, jersey and transparent background. Median
    # rejects small highlights/shadows; no whole-image/background averaging.
    pixels = []
    for left, top, right, bottom in [(263, 171, 282, 194), (318, 171, 337, 194)]:
        for r, g, b, a in image.crop((left, top, right, bottom)).getdata():
            if a >= 250 and r >= g and g >= b * .9 and 35 < r < 249 and r - b > 10:
                pixels.append((r, g, b))
    if len(pixels) < 100:
        return None
    rgb = tuple(round(statistics.median(p[c] for p in pixels)) for c in range(3))
    return '#%02x%02x%02x' % rgb

colors = {}
missing = []
errors = []
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    futures = {pool.submit(download, player_id): player_id for player_id in players}
    for count, future in enumerate(concurrent.futures.as_completed(futures), 1):
        player_id = futures[future]
        try:
            file = future.result()
            color = sample(file) if file else None
            if color:
                colors[player_id] = color
            else:
                missing.append(player_id)
        except Exception as error:
            errors.append((player_id, str(error)))
        if count % 300 == 0:
            print('Checked', count, 'of', len(players), 'headshots', flush=True)
if errors:
    raise RuntimeError('Unverified requests: ' + str(errors[:12]))

# Explicit, reviewed corrections are separate from automated sampling. Missing
# photos remain visibly documented instead of invented name/number hashes.
for player_id, entry in overrides.items():
    assert player_id in players and entry.get('source') and entry.get('note')
    assert len(entry['color']) == 7 and entry['color'].startswith('#')
    int(entry['color'][1:], 16)
    colors[player_id] = entry['color']
missing = sorted(set(players) - set(colors))

# Review sheets show source portraits beside their actual model RGB swatches.
review = sorted(players.values(), key=lambda p: (p['position'] != 'QB', p['name']))
for page, offset in enumerate(range(0, len(review), 120), 1):
    sheet = Image.new('RGB', (1440, 1320), '#e5e3db')
    draw = ImageDraw.Draw(sheet)
    for i, p in enumerate(review[offset:offset + 120]):
        player_id = str(p['id'])
        x, y = i % 12 * 120, i // 12 * 132
        file = CACHE / (player_id + '.png')
        if file.exists():
            portrait = Image.open(file).convert('RGBA')
            portrait.thumbnail((118, 90))
            sheet.paste(portrait, (x, y), portrait)
        color = colors.get(player_id, '#808080')
        draw.rectangle((x + 3, y + 91, x + 32, y + 112), fill=color)
        draw.text((x + 36, y + 92), color, fill='#111111')
        draw.text((x + 3, y + 116), p['name'][:19], fill='#111111')
    sheet.save(CACHE / ('review-%02d.jpg' % page))

out = ROOT / 'public/games/touchdown-rush/appearance-data.js'
checked = datetime.datetime.now(datetime.timezone.utc).astimezone().date().isoformat()
out.write_text('// Cosmetic RGB approximations from public ESPN headshots. No gameplay attributes.\n'
               + 'export const APPEARANCE_CHECKED=' + json.dumps(checked) + ';\n'
               + 'export const APPEARANCE_SOURCE=' + json.dumps(HEADSHOT) + ';\n'
               + 'export const APPEARANCE_SOURCE_OVERRIDES=' + json.dumps({i:e['source'] for i,e in overrides.items() if e['source'] != HEADSHOT.format(id=i)}, separators=(',', ':')) + ';\n'
               + 'export const PLAYER_SKIN_TONES=' + json.dumps(dict(sorted(colors.items())), separators=(',', ':')) + ';\n')
(CACHE / 'report.json').write_text(json.dumps(dict(total=len(players), matched=len(colors), missing=[players[i] for i in missing]), indent=2))
print('Wrote', len(colors), 'appearance colors;', len(missing), 'unresolved. Review sheets:', CACHE, flush=True)
if missing:
    print('Unresolved:', [(i, players[i]['name']) for i in missing], flush=True)
