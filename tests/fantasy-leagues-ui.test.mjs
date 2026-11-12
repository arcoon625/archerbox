import assert from 'node:assert/strict';
import {fantasyDatabase} from './helpers/fantasy-db.mjs';
import {handleFantasy} from '../server/fantasy.js';
import {handleSocial} from '../server/social.js';
const {db,sqlite}=fantasyDatabase(),origin='https://archerbox.test';
async function backend(user,kind,path,body){return (kind==='social'?handleSocial:handleFantasy)(new Request(origin+'/api/'+kind+'/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':user},body:body===undefined?undefined:JSON.stringify(body)}),db);}
const root={hidden:true,innerHTML:'',scrollTop:0,contains(){return false;},querySelector(){return null;},insertAdjacentHTML(){},setAttribute(){},replaceChildren(){this.innerHTML='';}};
globalThis.document={hidden:false,getElementById:()=>root};
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
let poll,networkFailure=false,deferred=null,hold=false,registers=0;
globalThis.setInterval=fn=>{poll=fn;return 1;};globalThis.clearInterval=()=>{};
globalThis.fetch=async(url,opts={})=>{const [,kind,path]=url.match(/^\/api\/(social|fantasy)\/(.*)$/),body=opts.body?JSON.parse(opts.body):undefined;if(path==='register')registers++;if(networkFailure&&path.startsWith('league/'))throw Error('Connection interrupted');if(hold&&path.startsWith('league/')&&!body)return new Promise(resolve=>{deferred=async()=>resolve(await backend('host',kind,path,body));});return backend('host',kind,path,body);};
const OriginalFormData=globalThis.FormData;globalThis.FormData=class{constructor(form){this.entries=Object.entries(form.values);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}};
const {openFantasy,closeFantasy}=await import('../public/fantasy/app.js');
const settle=()=>new Promise(setImmediate);
async function click(dataset){root.onclick({target:{closest:()=>({dataset,disabled:false})}});await settle();}
async function submit(id,values){root.onsubmit({preventDefault(){},target:{id,values}});await settle();}
await openFantasy({profile:()=>({name:'Archer',color:'#bdf167'}),onBack(){},onPlay(){}});
assert.match(root.innerHTML,/Create league &amp; get code|Create league & get code/);assert(!root.innerHTML.includes('id="f-register"'),'no separate hidden registration step');
await submit('f-create',{name:'Together League',teamName:'Archer United',mode:'nfl',position:'QB'});assert.equal(registers,1);assert.match(root.innerHTML,/Managers <span>1 \/ 14/);assert.match(root.innerHTML,/Copy code/);
let state=await (await backend('host','fantasy','state')).json(),leagueId=state.leagues[0].id;
const saved=await(await backend('host','fantasy','league/'+leagueId)).json(),code=saved.league.code;
await backend('guest','social','profile',{name:'Nova'});await backend('guest','fantasy','register',{position:'WR'});await backend('guest','fantasy','join',{code,teamName:'Nova United'});
await poll();assert.match(root.innerHTML,/Managers <span>2 \/ 14/);assert.match(root.innerHTML,/Nova United/);
networkFailure=true;await poll();assert.match(root.innerHTML,/Reconnecting/);assert.match(root.innerHTML,/Connection interrupted/);networkFailure=false;await poll();assert(!root.innerHTML.includes('Reconnecting'));
await click({do:'home'});await click({do:'joinLeague'});await submit('f-join',{code:'ZZZZZZZZ',teamName:'Keep my team'});assert.match(root.innerHTML,/No league has that code/);assert.match(root.innerHTML,/value="ZZZZZZZZ"/);assert.match(root.innerHTML,/value="Keep my team"/);assert.equal(registers,1);
await submit('f-join',{code:code.toLowerCase(),teamName:'No duplicate seat'});assert.match(root.innerHTML,/Managers <span>2 \/ 14/);assert.match(root.innerHTML,/Archer United/);
// A late refresh cannot reopen a league after the user goes back to My Leagues.
hold=true;const pending=poll();await settle();assert(deferred);await click({do:'home'});assert.match(root.innerHTML,/My leagues/);hold=false;await deferred();await pending;assert(!root.innerHTML.includes('One code. Same league.'));
assert.match(root.innerHTML,/data-league="/);
await click({do:'createLeague'});await submit('f-create',{name:'Just Two',teamName:'Archer United',mode:'archerbox'});
state=await(await backend('host','fantasy','state')).json();const twoId=state.leagues[0].id;
const two=await(await backend('host','fantasy','league/'+twoId)).json();
await backend('guest','fantasy','join',{code:two.league.code,teamName:'Nova United'});await poll();
await click({action:'draftStart'});await backend('guest','fantasy','league/'+twoId,{action:'auto',enabled:true});await click({do:'auto'});
for(let week=1;week<=5;week++){
 if(week===5)assert.match(root.innerHTML,/Start championship/);
 await click({action:'weekStart'});if(week===5)assert.match(root.innerHTML,/Finishing the championship deletes this league/);
 await click({action:'weekFinish'});
}
assert.match(root.innerHTML,/won the championship!/);assert.match(root.innerHTML,/The league was deleted/);
closeFantasy();globalThis.FormData=OriginalFormData;sqlite.close();
console.log('Fantasy league UI passed: integrated signup, create/join handlers, retained error fields, real shared lobby polling, reconnect recovery, saved leagues and stale-response protection.');
