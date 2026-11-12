import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAMES,CATEGORIES,findGames} from '../public/catalog.js';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
assert.equal(GAMES.length,21);assert.equal(new Set(GAMES.map(g=>g.id)).size,21);
for(const g of GAMES){const dir=path.join(dist,'games',g.id),html=fs.readFileSync(path.join(dir,'index.html'),'utf8');assert(html.includes('../../bridge.js'));assert(fs.existsSync(path.join(dist,g.image)));assert(g.controls.length>3);assert(!html.includes('.chatgpt.site'),'game links stay inside Archerbox');
 for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.js'))){const file=path.join(dir,f),source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){const imported=path.resolve(dir,match[1].split('?')[0]);assert(imported.startsWith(dist+path.sep),'imports stay in packaged assets');assert(fs.existsSync(imported),g.name+' missing '+match[1])}assert(!source.includes("'./vendor/three.module.js'"),'all games use the shared vendor runtime')}
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const target=match[1];if(target.startsWith('data:')||target.startsWith('https:'))continue;assert(fs.existsSync(path.resolve(dir,target.split('?')[0])),g.name+' missing '+target)}
 console.log(g.name+': complete entry point, local modules and lobby bridge.');
}
assert(fs.existsSync(path.join(dist,'vendor/LICENSE.txt')));assert.equal(findGames({query:'baseball'})[0].id,'baseball-blast');assert.equal(findGames({query:'RACING'}).length,2);assert.equal(findGames({query:'unknown-game'}).length,0);assert.equal(findGames({query:'  color  '})[0].id,'color-rush');assert.equal(findGames({view:'favorites',favorites:['neon-clash']})[0].id,'neon-clash');assert.deepEqual(findGames({view:'recent',recent:['baseball-blast','floor-is-lava','missing']}).map(g=>g.id),['baseball-blast','floor-is-lava']);assert.equal(findGames({view:'recent',recent:['baseball-blast','floor-is-lava'],category:'Sports'}).length,1);for(const c of CATEGORIES.slice(1))assert.equal(findGames({category:c}).length,c==='Adventure'?2:c==='Sports'?3:c==='Action'?6:c==='Obby'?3:c==='Racing'?2:c==='Party'?3:1);assert.equal(findGames({query:'football'})[0].id,'touchdown-rush');
assert.equal(findGames({query:'shark'})[0].id,'shark-racing');
console.log('Search, all categories, favorites and recent-game ordering passed.');

assert.equal(findGames({query:'ski'})[0].id,'alpine-rush');

assert.equal(findGames({query:'ninja'})[0].id,'ninja-rooftops');

assert.equal(findGames({query:'bakery'})[0].id,'bakery-rush');

assert.equal(findGames({query:'creature'})[0].id,'creature-vault');

assert.equal(findGames({query:'sword'})[0].id,'battle-arena');

assert.equal(findGames({query:'laser'})[0].id,'laser-maze');

assert.equal(findGames({query:'disaster'})[0].id,'disaster-island');

assert.equal(findGames({query:'snowball'})[0].id,'snowball-showdown');

assert.equal(findGames({query:'jurassic'})[0].id,'jurassic-island');

assert.equal(findGames({query:'poop'})[0].id,'poop-panic');

assert.equal(findGames({query:'bear'})[0].id,'bearwatch');

assert.equal(findGames({query:'pokemon'})[0].id,'pokemon-meadow');

assert.equal(findGames({query:'pirate'})[0].id,'fruit-seas');
