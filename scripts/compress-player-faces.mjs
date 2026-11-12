// Asset encoding only: retain each source portrait's dimensions and identity.
// WebP keeps the 2026 source update below the host's Git receive-pack limit.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const directory=new URL('../public/games/touchdown-rush/faces/',import.meta.url);
const files=(await fs.readdir(directory)).filter(f=>/\.(png|jpg)$/.test(f));
let cursor=0,totalBefore=0,totalAfter=0;
async function worker(){
 while(cursor<files.length){
  const file=files[cursor++],input=new URL(file,directory),output=new URL(path.parse(file).name+'.webp',directory);
  const before=await fs.stat(input),metadata=await sharp(fileURLToPath(input)).metadata();
  await sharp(fileURLToPath(input)).webp({quality:88,alphaQuality:95,effort:5}).toFile(fileURLToPath(output));
  const result=await sharp(fileURLToPath(output)).metadata();
  if(result.width!==metadata.width||result.height!==metadata.height)throw Error('Portrait dimensions changed: '+file);
  totalBefore+=before.size;totalAfter+=(await fs.stat(output)).size;
  await fs.unlink(input);
 }
}
await Promise.all(Array.from({length:4},worker));
console.log(`${files.length} portraits encoded without resizing: ${(totalBefore/1048576).toFixed(1)} → ${(totalAfter/1048576).toFixed(1)} MB.`);
