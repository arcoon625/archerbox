import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
export function fantasyDatabase(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of fs.readdirSync(new URL('../../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(new URL('../../drizzle/'+file,import.meta.url),'utf8'));
 const db={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){const r=sqlite.prepare(sql).run(...this.args);return {meta:{changes:r.changes}};}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const q of statements)results.push(await q.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 return {db,sqlite};
}
