from pathlib import Path
import shutil,hashlib
ROOT=Path(__file__).resolve().parents[1]
GAMES=['floor-is-lava','baseball-blast'] # Games with shared avatars or friend multiplayer are maintained in public/games.
expected=None
for name in GAMES:
    src=ROOT.parent/name/'dist'
    data=(src/'vendor/three.module.js').read_bytes()
    digest=hashlib.sha256(data).hexdigest()
    if expected is not None and digest!=expected: raise RuntimeError('Three.js versions differ; preserve separate vendor runtimes before syncing.')
    expected=digest
    dst=ROOT/'public/games'/name
    if dst.exists(): shutil.rmtree(dst)
    shutil.copytree(src,dst,ignore=shutil.ignore_patterns('vendor'))
    for path in dst.rglob('*.js'):
        text=path.read_text().replace("'./vendor/three.module.js'","'../../vendor/three.module.js'")
        path.write_text(text)
    index=dst/'index.html'
    html=index.read_text().replace('https://turbo-kart-racing.archer-e-stein.chatgpt.site','../../index.html')
    html=html.replace('</body>','<script type="module" src="../../bridge.js"></script></body>')
    index.write_text(html)
shutil.copyfile(ROOT.parent/GAMES[0]/'dist/vendor/three.module.js',ROOT/'public/vendor/three.module.js')
shutil.copyfile(ROOT.parent/GAMES[0]/'dist/vendor/LICENSE.txt',ROOT/'public/vendor/LICENSE.txt')
print('Bundled two standalone game snapshots with one shared Three.js runtime.')
