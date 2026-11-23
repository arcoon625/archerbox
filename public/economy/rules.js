// Every reward is earned by playing. Avatar items and Ranger Supply purchases share one wallet.
export const REWARDS=[
 ['ice-hockey-rush','Ice Hockey Rush','win','Hockey match won','Win a full 3v3 match against CPU skaters.',24],
 ['mini-golf','Mini Golf Mayhem','finish','Golf round completed','Play all six holes in a full round.',20],
 ['fast-food-passport','Fast Food Shift','finish','Food challenge completed','Serve six customers to finish a restaurant shift.',24],
 ['fruit-seas','Fruit Seas','quest','Pirate quest','Complete a five-enemy island quest and collect your reward from its captain.',24],
 ['pokemon-meadow','Pokémon: Meadow Quest','discovery','New Pokémon','Catch or evolve a Pokémon species for the first time.',17],
 ['pokemon-meadow','Pokémon: Meadow Quest','badge','Trainer badge','Earn a badge or Champion Star for the first time.',4],
 ['bearwatch','Survive 100 Days in a Forest','survive','Night survived','Survive a full night in Pine Hollow. Earn 5 in-game diamonds, too.',30],
 ['poop-panic','Poop Panic','knockout','Poop Panic knockout','Knock out a CPU with a poop blast during a real run.',105],
 ['jurassic-island','Jurassic Island','mission','Park mission completed','Finish a dinosaur park mission and check in at ranger base.',18],
 ['snowball-showdown','Snowball Showdown','round-win','Snowball round won','Win a round with your Glacier snowball team.',45],
 ['disaster-island','Disaster Island','survive','Disaster survived','Survive a full disaster round on the island.',24],
 ['laser-maze','Laser Maze','finish','Maze escaped','Collect both keycards and reach the maze exit.',30],
 ['battle-arena','Battle Arena','round-win','Battle round won','Win a duel round, team round, or survival wave.',54],
 ['touchdown-rush','Touchdown Rush','touchdown','Touchdown','Score a touchdown with your team.',75],
 ['baseball-blast','Baseball Blast','home-run','Home run','Hit a home run.',60],
 ['neon-clash','Rivals','elimination','Elimination','Eliminate an opponent yourself.',180],
 ['turbo-kart-racing','Turbo Kart Racing','finish','Race finished','Cross the finish line after all three laps.',24],
 ['shark-racing','Shark Racing','finish','Race finished','Finish a shark race.',27],
 ['alpine-rush','Alpine Rush','finish','Trail finished','Finish a ski trail.',24],
 ['ninja-rooftops','Ninja Rooftops','finish','Course finished','Reach the end of a rooftop course.',24],
 ['floor-is-lava','Floor Is Lava','finish','Level finished','Escape a lava level.',36],
 ['color-rush','Color Rush','round','Round survived','Stay alive through a color round.',75],
 ['hide-and-seek','Hide and Seek','find','Hider found','Find a hider as the seeker.',90],
 ['hide-and-seek','Hide and Seek','survive','Hidden to the end','Win a round as a hider.',24],
 ['bakery-rush','Bakery Rush','serve','Happy customer','Successfully bake and serve an order.',90],
 ['creature-vault','Creature Vault','discovery','New creature','Discover a creature for the first time.',24]
].map(([game,name,event,label,description,step])=>({game,name,event,label,description,step}));
export const PRICES=Object.freeze(Object.fromEntries(Object.entries({
 head:[29,33,43,44],face:[20,32,47,50],shirt:[7,9,39,50],bottom:[12,13,47,50],shoes:[18,32,34,36],pet:[14,16,38,47]
}).flatMap(([category,indices])=>indices.map((index,i)=>[`${category}-${String(index).padStart(2,'0')}`,[8,14,24,40][i]]))));
export const FOREST_COIN_PRICES=Object.freeze({bat:3,slingshot:5,crossbow:8,tranquilizer:12,flare:18});
export const forestCoinPrice=id=>Object.hasOwn(FOREST_COIN_PRICES,id)?FOREST_COIN_PRICES[id]:0;
const rewardByKey=new Map(REWARDS.map(reward=>[reward.game+'/'+reward.event,reward]));
export const priceOf=id=>typeof id==='string'&&Object.hasOwn(PRICES,id)?PRICES[id]:0;
export const canWear=(wallet,id)=>!priceOf(id)||wallet.owned.includes(id);
const safeInt=n=>Number.isSafeInteger(n)&&n>=0;
export function restoreWallet(raw,legacy=null){
 const valid=raw?.version===1&&safeInt(raw.balance)&&safeInt(raw.earned)&&safeInt(raw.spent)&&raw.earned>=raw.spent&&raw.balance===raw.earned-raw.spent;
 const wallet=valid?{version:1,balance:raw.balance,earned:raw.earned,spent:raw.spent,owned:[...new Set((Array.isArray(raw.owned)?raw.owned:[]).filter(id=>priceOf(id)))],progress:{},legacyMigrated:raw.legacyMigrated===true}:{version:1,balance:0,earned:0,spent:0,owned:[],progress:{},legacyMigrated:false};
 wallet.milestones={};
 wallet.forestGear=valid&&Array.isArray(raw.forestGear)?[...new Set(raw.forestGear.filter(id=>typeof id==='string'&&forestCoinPrice(id)))]:[];
 if(valid&&raw.milestones&&typeof raw.milestones==='object')for(const [key,value] of Object.entries(raw.milestones)){
  if(rewardByKey.has(key)&&safeInt(value))wallet.milestones[key]=value;
 }
 if(valid&&raw.progress&&typeof raw.progress==='object')for(const [key,value] of Object.entries(raw.progress))if(key.length<240&&safeInt(value)&&value>0)wallet.progress[key]=value;
 // Preserve premium items in looks saved before coins were introduced.
 if(!wallet.legacyMigrated){for(const look of [legacy?.look,...(Array.isArray(legacy?.outfits)?legacy.outfits.map(o=>o?.look):[])])if(look&&typeof look==='object')for(const id of Object.values(look))if(priceOf(id)&&!wallet.owned.includes(id))wallet.owned.push(id);wallet.legacyMigrated=true;}
 return wallet;
}
export function award(wallet,{game,event,run,progress}){
 const milestone=game+'/'+event,reward=rewardByKey.get(milestone);
 if(!reward||typeof run!=='string'||!run||run.length>160||!safeInt(progress)||progress<1)return {ok:false,reason:'invalid',amount:0};
 const key=game+'/'+run+'/'+event,previous=wallet.progress[key]||0;
 if(progress<=previous)return {ok:true,amount:0};
 const before=wallet.milestones[milestone]||0,after=before+(progress-previous);
 const amount=Math.floor(after/reward.step)-Math.floor(before/reward.step);
 if(!safeInt(after)||!safeInt(wallet.earned+amount))return {ok:false,reason:'limit',amount:0};
 wallet.progress[key]=progress;
 wallet.milestones[milestone]=after;
 wallet.balance+=amount;
 wallet.earned+=amount;
 return {ok:true,amount,label:reward.label+' milestone'};
}
export function purchaseForestWeapon(wallet,id){
 const price=forestCoinPrice(id);
 if(!price)return {ok:false,reason:'not-for-sale'};
 if(wallet.forestGear.includes(id))return {ok:true,amount:0,alreadyOwned:true};
 if(wallet.balance<price)return {ok:false,reason:'insufficient',needed:price-wallet.balance};
 wallet.balance-=price;
 wallet.spent+=price;
 wallet.forestGear.push(id);
 return {ok:true,amount:price};
}
export function purchase(wallet,id){
 const price=priceOf(id);if(!price)return {ok:false,reason:'not-for-sale'};
 if(wallet.owned.includes(id))return {ok:true,amount:0,alreadyOwned:true};
 if(wallet.balance<price)return {ok:false,reason:'insufficient',needed:price-wallet.balance};
 wallet.balance-=price;wallet.spent+=price;wallet.owned.push(id);return {ok:true,amount:price};
}
