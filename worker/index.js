import {handleSocial} from '../server/social.js';
import {handleFantasy} from '../server/fantasy.js';
import {handleCharts} from '../server/charts.js';

const COOKIE = 'archerbox_session';
const LIFETIME = 365 * 24 * 60 * 60;
const json = (body, status) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
const cookieValue = request => (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
const tokenHash = async token => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), n => n.toString(16).padStart(2, '0')).join('');

async function browserIdentity(request, db, create) {
  const token = cookieValue(request), now = Date.now();
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const row = await db.prepare('SELECT user_id FROM browser_sessions WHERE token_hash=? AND expires>?').bind(await tokenHash(token), now).first();
    if (row) return {id: row.user_id};
  }
  if (!create) return {};
  const fresh = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare('DELETE FROM browser_sessions WHERE expires<=?').bind(now),
    db.prepare('INSERT INTO browser_sessions (token_hash,user_id,expires) VALUES (?,?,?)').bind(await tokenHash(fresh), id, now + LIFETIME * 1000)
  ]);
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return {id, cookie: `${COOKIE}=${fresh}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${LIFETIME}${secure}`};
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Compatibility links open the browser-profile screen; no external sign-in.
    if (['/signin-with-chatgpt', '/signout-with-chatgpt'].includes(url.pathname)) {
      return Response.redirect(new URL('/#profile', url), 302);
    }
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!['GET', 'POST'].includes(request.method)) return json({error:'Use GET or POST.'},405);
    if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) return json({error:'Open Archerbox to make changes.'},403);
    if (!env.DB) return json({error:'The online database is not connected yet.'},503);
    const handler = url.pathname.startsWith('/api/social/') ? handleSocial
      : url.pathname.startsWith('/api/fantasy/') ? handleFantasy
      : url.pathname.startsWith('/api/charts/') ? handleCharts : null;
    if (!handler) return json({error:'Unknown API route.'},404);
    try {
      const identity = await browserIdentity(request, env.DB, request.method === 'POST' && url.pathname === '/api/social/profile');
      // Never trust identity headers supplied by an internet visitor.
      const headers = new Headers(request.headers);
      for (const name of [...headers.keys()]) if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
      if (identity.id) headers.set('oai-authenticated-user-id', identity.id);
      const result = await handler(new Request(request, {headers}), env.DB);
      const response = new Response(result.body, result);
      response.headers.set('Cache-Control','private, no-store');
      response.headers.set('X-Content-Type-Options','nosniff');
      if (identity.cookie) response.headers.append('Set-Cookie', identity.cookie);
      return response;
    } catch (error) {
      console.error('Archerbox API:', error);
      return json({error:'Online features could not connect. Please try again.'},500);
    }
  }
};
