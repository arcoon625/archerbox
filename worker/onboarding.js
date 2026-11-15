import {usernameChoice} from '../public/onboarding/rules.js';
export const privateResponse=response=>{
  const copy=new Response(response.body,response);
  copy.headers.set('Cache-Control','private, no-store');
  copy.headers.set('Vary','Cookie');
  copy.headers.set('X-Content-Type-Options','nosniff');
  return copy;
};
export async function savedPlayer(db,id) {
  if(!db||!id)return null;
  const row=await db.prepare('SELECT name,color,code FROM social_profiles WHERE id=?').bind(id).first();
  return row?{name:row.name,color:row.color,code:row.code}:null;
}
export async function registrationBody(request) {
  const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('Send your username as JSON.',415);
  if(Number(request.headers.get('Content-Length'))>4096)fail('That username request is too large.',413);
  const raw=await request.text();if(raw.length>4096)fail('That username request is too large.',413);
  let body;try{body=JSON.parse(raw)}catch{fail('Enter a username to continue.')}
  if(!body||typeof body!=='object'||Array.isArray(body))fail('Enter a username to continue.');
  const choice=usernameChoice(body.username);if(choice.error)fail(choice.error);
  return {name:choice.name,color:'#c0f16b'};
}
export async function gateDocument(request,env,getIdentity) {
  const asset=await env.ASSETS.fetch(request);
  let contentType=asset.headers.get('Content-Type');
  if(asset.status===304&&!contentType){
    const headers=new Headers(request.headers);
    for(const name of ['If-None-Match','If-Modified-Since','Range'])headers.delete(name);
    const metadata=await env.ASSETS.fetch(new Request(request,{method:'HEAD',headers}));
    contentType=metadata.headers.get('Content-Type');
  }
  // A 304 still asks the browser to use a cached HTML page. Check the profile
  // before authorizing that cached page, just as for a fresh 200 response.
  if((asset.status!==304&&(asset.status<200||asset.status>=300))||!contentType?.toLowerCase().includes('text/html'))return asset;
  // Inspect the actual asset type rather than trusting URL spelling, extensions, or
  // browser headers. Extensionless and URL-encoded game documents get the same gate.
  if(!env.DB)return privateResponse(new Response('Archerbox is reconnecting. Reload to choose your username and play.',{status:503}));
  const identity=await getIdentity(),profile=await savedPlayer(env.DB,identity.id),url=new URL(request.url);
  if(profile){
    if(url.pathname.startsWith('/onboarding'))return privateResponse(Response.redirect(new URL('/',url),303));
    return privateResponse(asset);
  }
  let path=url.pathname;try{path=decodeURIComponent(path)}catch{}
  const game=path.replace(/\/{2,}/g,'/').match(/^\/games\/([a-z0-9-]+)(?:\/|$)/)?.[1];
  if(game){
    const target=new URL('/',url);target.hash='play/'+game+url.search;
    return privateResponse(Response.redirect(target,303));
  }
  const welcome=new URL('/onboarding/index.html',url);
  return privateResponse(await env.ASSETS.fetch(new Request(welcome,{method:request.method==='HEAD'?'HEAD':'GET'})));
}
