import assert from 'node:assert/strict';
import {test} from 'node:test';
import worker from '../worker/index.js';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';

test('browser profiles persist, isolate players, and reject forged identities', async () => {
  const {db, sqlite} = fantasyDatabase();
  const env = {DB:db, ASSETS:{fetch:async()=>new Response('asset')}};
  async function call(path, {cookie, body, origin='https://arcade.test', extra={}}={}) {
    return worker.fetch(new Request('https://arcade.test'+path, {
      method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...extra},
      ...(body?{body:JSON.stringify(body)}:{})
    }),env);
  }
  assert.equal(await (await call('/')).text(),'asset');
  assert.equal((await call('/api/social/state',{extra:{'oai-authenticated-user-id':'forged'}})).status,401);
  assert.equal((await call('/api/social/profile',{body:{name:'One'},origin:'https://other.test'})).status,403);
  assert.equal(sqlite.prepare('SELECT count(*) n FROM browser_sessions').get().n,0);
  const first=await call('/api/social/profile',{body:{name:'One',color:'#abcdef'}});
  assert.equal(first.status,200);
  const code=(await first.json()).profile.code, setCookie=first.headers.get('Set-Cookie'), cookie=setCookie.split(';')[0];
  for(const flag of ['HttpOnly','Secure','SameSite=Strict']) assert(setCookie.includes(flag));
  assert.equal(sqlite.prepare('SELECT token_hash FROM browser_sessions').get().token_hash.length,64);
  assert(!sqlite.prepare('SELECT token_hash FROM browser_sessions').get().token_hash.includes(cookie.split('=')[1]));
  const again=await call('/api/social/state',{cookie});assert.equal((await again.json()).profile.code,code);
  assert.equal(again.headers.get('Set-Cookie'),null);
  const second=await call('/api/social/profile',{body:{name:'Two'},extra:{'oai-authenticated-user-id':'forged'}});
  assert.notEqual((await second.json()).profile.code,code);
  assert.equal((await call('/api/social/state',{cookie:'archerbox_session='+'a'.repeat(64)})).status,401);
  sqlite.exec('UPDATE browser_sessions SET expires=0');
  assert.equal((await call('/api/social/state',{cookie})).status,401);
  assert.equal((await call('/api/unknown')).status,404);
  assert.equal((await worker.fetch(new Request('https://arcade.test/api/charts/trending'),{})).status,503);
  sqlite.close();
});
