export const ELEMENTS=[
 {id:'ember',name:'Ember',symbol:'✹',color:'#e8a16d'},
 {id:'tide',name:'Tide',symbol:'≈',color:'#76ccdc'},
 {id:'grove',name:'Grove',symbol:'❧',color:'#9bcea3'},
 {id:'storm',name:'Storm',symbol:'ϟ',color:'#efce75'},
 {id:'frost',name:'Frost',symbol:'❄',color:'#b3ddec'},
 {id:'cosmic',name:'Cosmic',symbol:'✦',color:'#c4a9f5'}
];
export const RARITIES=[
 {id:'common',name:'Common',rank:0,symbol:'●',color:'#a9bab5',dust:5,cost:30},
 {id:'uncommon',name:'Uncommon',rank:1,symbol:'◆',color:'#93cba4',dust:10,cost:60},
 {id:'rare',name:'Rare',rank:2,symbol:'✧',color:'#8cc5ef',dust:20,cost:120},
 {id:'epic',name:'Epic',rank:3,symbol:'✦',color:'#c3a3f5',dust:50,cost:250},
 {id:'legendary',name:'Legendary',rank:4,symbol:'✶',color:'#f4ce7e',dust:100,cost:500}
];
const families=[
 [['Cinderkit','Spark Pounce','It saves a little sunshine in the tip of its tail.'],['Torchlynx','Ember Dash','Its pawprints glow until the first rain.'],['Pyrocrest','Flare Roar','A rumble from its mane wakes the sleeping volcano.'],['Solmane','Solar Crown','At sunrise, even the stars bow to its golden mane.']],
 [['Bubblefin','Bubble Burst','It blows tiny bubbles whenever it makes a new friend.'],['Reefjaw','Coral Rush','A living coral reef follows wherever it swims.'],['Tiderex','Wave Breaker','Its fins can split a towering ocean wave.'],['Abyssal Crown','Deepwater Throne','The quiet ruler of the ocean’s hidden kingdoms.']],
 [['Sproutbandit','Leaf Tumble','It plants a tiny seed beside every berry it finds.'],['Bramblepaw','Fern Whirl','Its leafy tail is a cozy home for fireflies.'],['Thornwarden','Bark Shield','No lost traveler stays lost in its forest.'],['Verdant Titan','Ancient Bloom','A thousand springs sleep within its living armor.']],
 [['Flickerwing','Static Peep','The fluffier its feathers, the bigger the spark.'],['Zapglide','Lightning Loop','It draws bright ribbons across the evening sky.'],['Tempest Roc','Thunder Dive','Every beat of its wings sounds like distant thunder.'],['Thunderplume','Stormheart','It carries a whole thunderstorm beneath its wings.']],
 [['Snowpuff','Snowball Roll','It keeps a perfect snowflake tucked behind one ear.'],['Icewhisk','Frost Slide','The frozen river is its favorite playground.'],['Glacifang','Crystal Guard','Its ice crystals sing softly in the northern wind.'],['Auroriver','Polar Lights','The aurora follows the trail of its silver tail.']],
 [['Stardrop','Twinkle Splash','It thinks every star is a tiny, faraway friend.'],['Moonveil','Lunar Ripple','Moonlight turns its flowing gills to silver.'],['Nebulisk','Galaxy Coil','It swims through constellations as if they were streams.'],['Astralune','Celestial Bloom','A gentle dragon that dreams new stars into the sky.']]
];
export const CARDS=families.flatMap((family,e)=>family.map(([name,move,flavor],stage)=>{
 const rarity=stage===3?(e<2?'legendary':'epic'):RARITIES[stage].id,id='cv-'+String(e*4+stage+1).padStart(3,'0');
 return {id,number:e*4+stage+1,name,element:ELEMENTS[e].id,stage,rarity,move,flavor,hp:[60,100,150,e<2?230:200][stage]+(e%3)*5,power:[25,55,95,e<2?160:130][stage]+e*3};
}));
export const PACKS=[
 {id:'wildwood',name:'Wildwood',subtitle:'MOSS, MAGIC & MOUNTAIN AIR',elements:['grove','frost'],color:'#a4c7a0',art:'grove',stage:3,description:'Forest guardians and creatures of the frozen north.'},
 {id:'ocean-spark',name:'Ocean Spark',subtitle:'DEEP BLUE. HIGH VOLTAGE.',elements:['tide','storm'],color:'#88cfd8',art:'tide',stage:3,description:'Ocean wonders meet thunder from the skies.'},
 {id:'starforge',name:'Starforge',subtitle:'BORN OF FIRE. FULL OF STARS.',elements:['ember','cosmic'],color:'#cfb1ed',art:'ember',stage:3,description:'Sunlit legends and friends from distant galaxies.'}
];
export const cardById=id=>CARDS.find(c=>c.id===id);
export const rarityOf=card=>RARITIES.find(r=>r.id===card.rarity);
export const freshCollection=()=>({version:1,inventory:{},packs:0,dust:0,sinceLegend:0,showcase:[],favorites:[],pending:null});
const int=(v,max=100000000)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
const finishRank={standard:0,holo:1,prism:2};
export function restoreCollection(raw){
 const s=freshCollection();if(!raw||typeof raw!=='object'||Array.isArray(raw))return s;
 for(const c of CARDS){const saved=raw.inventory?.[c.id];if(saved&&int(saved.copies)>0)s.inventory[c.id]={copies:int(saved.copies),finish:Object.hasOwn(finishRank,saved.finish)?saved.finish:'standard'};}
 s.packs=int(raw.packs);s.dust=int(raw.dust);s.sinceLegend=int(raw.sinceLegend,11);s.showcase=[...new Set(Array.isArray(raw.showcase)?raw.showcase:[])].filter(id=>cardById(id)&&Object.hasOwn(s.inventory,id)).slice(0,3);s.favorites=[...new Set(Array.isArray(raw.favorites)?raw.favorites:[])].filter(id=>cardById(id)&&Object.hasOwn(s.inventory,id));
 const p=raw.pending;if(p&&PACKS.some(k=>k.id===p.pack)&&Array.isArray(p.cards)&&p.cards.length===5&&p.cards.every(c=>c&&typeof c==='object'&&cardById(c.id)&&s.inventory[c.id]&&Object.hasOwn(finishRank,c.finish)&&typeof c.isNew==='boolean'&&typeof c.revealed==='boolean'))s.pending={pack:p.pack,cards:p.cards.map(c=>({id:c.id,finish:c.finish,isNew:c.isNew,upgrade:!!c.upgrade,dust:int(c.dust,100),revealed:c.revealed}))};
 return s;
}
const roll=rng=>Math.max(0,Math.min(.999999999,Number(rng())||0));
const choose=(items,rng)=>items[Math.floor(roll(rng)*items.length)];
function pickCard(rarity,pack,rng){const pool=CARDS.filter(c=>c.rarity===rarity),local=pool.filter(c=>pack.elements.includes(c.element));return choose(local.length&&roll(rng)<.80?local:pool,rng);}
export function openPack(s,packId,rng=Math.random){
 if(s.pending)return null;const pack=PACKS.find(p=>p.id===packId);if(!pack)return null;
 const pulls=[];for(let i=0;i<5;i++){
  const r=roll(rng);let rarity=i<3?(r<.72?'common':'uncommon'):i===3?(r<.35?'common':r<.8?'uncommon':'rare'):(s.sinceLegend>=11?'legendary':r<.70?'rare':r<.95?'epic':'legendary');
  const c=pickCard(rarity,pack,rng),f=roll(rng),finish=rarity==='legendary'?'prism':rarity==='epic'?(f<.2?'prism':'holo'):rarity==='rare'?(f<.05?'prism':f<.5?'holo':'standard'):rarity==='uncommon'&&f<.15?'holo':'standard',owned=s.inventory[c.id],isNew=!owned,upgrade=!!owned&&finishRank[finish]>finishRank[owned.finish],dust=owned?rarityOf(c).dust:0;
  s.inventory[c.id]={copies:(owned?.copies||0)+1,finish:!owned||finishRank[finish]>finishRank[owned.finish]?finish:owned.finish};s.dust+=dust;pulls.push({id:c.id,finish,isNew,upgrade,dust,revealed:false});
 }
 s.packs++;s.sinceLegend=pulls.some(p=>cardById(p.id).rarity==='legendary')?0:Math.min(11,s.sinceLegend+1);s.pending={pack:pack.id,cards:pulls};return s.pending;
}
export function revealCard(s,index){if(!s.pending||!Number.isInteger(index)||index<0||index>=5)return false;const c=s.pending.cards[index];if(c.revealed)return false;c.revealed=true;return true;}
export function revealAll(s){if(!s.pending)return false;s.pending.cards.forEach(c=>c.revealed=true);return true;}
export function finishPack(s){if(!s.pending||s.pending.cards.some(c=>!c.revealed))return false;s.pending=null;return true;}
export function craftCard(s,id){const c=cardById(id);if(!c||s.pending||s.inventory[id])return false;const cost=rarityOf(c).cost;if(s.dust<cost)return false;s.dust-=cost;s.inventory[id]={copies:1,finish:c.rarity==='legendary'?'prism':c.rarity==='epic'?'holo':'standard'};return true;}
export function favoriteCard(s,id){if(!cardById(id)||!Object.hasOwn(s.inventory,id))return false;s.favorites=s.favorites.includes(id)?s.favorites.filter(x=>x!==id):[...s.favorites,id];return true;}
export function showcaseCard(s,id){if(!cardById(id)||!Object.hasOwn(s.inventory,id))return false;if(s.showcase.includes(id)){s.showcase=s.showcase.filter(x=>x!==id);return true;}if(s.showcase.length>=3)return false;s.showcase.push(id);return true;}
export function filterCards(s,{query='',element='all',rarity='all',view='all',sort='number'}={}){
 let cards=CARDS.filter(c=>(element==='all'||c.element===element)&&(rarity==='all'||c.rarity===rarity)&&(!query.trim()||(c.name+' '+c.element+' '+c.move+' '+c.rarity).toLowerCase().includes(query.trim().toLowerCase()))&&(view==='all'||view==='owned'&&s.inventory[c.id]||view==='missing'&&!s.inventory[c.id]||view==='favorites'&&s.favorites.includes(c.id)));
 if(sort==='rarity')cards.sort((a,b)=>rarityOf(b).rank-rarityOf(a).rank||a.number-b.number);else if(sort==='power')cards.sort((a,b)=>b.power-a.power);return cards;
}
export function stats(s){const owned=CARDS.filter(c=>s.inventory[c.id]);return {unique:owned.length,copies:owned.reduce((a,c)=>a+s.inventory[c.id].copies,0),shiny:owned.filter(c=>s.inventory[c.id].finish!=='standard').length,legends:owned.filter(c=>c.rarity==='legendary').length,complete:owned.length===CARDS.length};}
