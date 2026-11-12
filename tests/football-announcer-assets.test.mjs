import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STUDIO_CLIPS} from '../public/games/touchdown-rush/studio-clips.js';
import {CALLS} from '../public/games/touchdown-rush/commentary.js';

// Every observed football outcome has a packaged, complete recording and the
// exact caption spoken in it. No partial phrase/name splicing is needed.
const files=new Set();let total=0;
for(const kind of Object.keys(CALLS)){
 assert(STUDIO_CLIPS[kind]?.length>=4,kind+' has at least four recordings');
 const texts=new Set();
 for(const clip of STUDIO_CLIPS[kind]){
  assert(!/[{}]/.test(clip.text));assert(clip.text.length<160);assert(!texts.has(clip.text));texts.add(clip.text);
  assert(clip.duration>.4&&clip.duration<12);assert(!files.has(clip.file));files.add(clip.file);
  const url=new URL('../public/games/touchdown-rush/'+clip.file,import.meta.url);
  assert(fs.statSync(url).size>2000,'nonempty packaged recording');
  assert(fs.readFileSync(url).subarray(0,3).toString()==='ID3','MP3 header');total++;
 }
}
assert(total>=190);

console.log(total+' packaged recordings cover every observed football outcome.');
