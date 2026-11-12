export const SAVE_KEY='archerbox-pokemon-meadow-v1';
export const TYPES={grass:{color:'#5b9461',icon:'✿'},fire:{color:'#df7648',icon:'♨'},water:{color:'#4f94bc',icon:'≈'},electric:{color:'#d4a63c',icon:'ϟ'},normal:{color:'#a7987e',icon:'●'},flying:{color:'#8a9ab6',icon:'➶'},bug:{color:'#8c9c43',icon:'❧'},rock:{color:'#a18a61',icon:'◆'},fairy:{color:'#d48fa8',icon:'✧'},dragon:{color:'#8a79b0',icon:'✦'}};
const row=(id,name,type,hp,attack,defense,move,description,evolves=null)=>({id,name,type,hp,attack,defense,move,description,evolves});
export const SPECIES=[
 row('bulbasaur','Bulbasaur','grass',37,1,1.1,'Vine Whip','A gentle partner with a growing bulb on its back.','ivysaur'),
 row('charmander','Charmander','fire',34,1.12,.95,'Ember','A curious little fire Pokémon with a glowing tail.','charmeleon'),
 row('squirtle','Squirtle','water',38,.98,1.18,'Water Gun','A playful partner protected by a sturdy shell.','wartortle'),
 row('pikachu','Pikachu','electric',32,1.15,.94,'Thunder Shock','Watch for yellow ears and sparks in the meadow.'),
 row('eevee','Eevee','normal',37,1.05,1.03,'Swift','A bright-eyed explorer with a wonderfully fluffy collar.'),
 row('pidgey','Pidgey','flying',30,1,1,'Gust','This little bird likes the open paths near town.'),
 row('caterpie','Caterpie','bug',33,.9,.92,'Bug Bite','A tiny leaf-loving Pokémon with a red antenna.'),
 row('oddish','Oddish','grass',34,1.02,1,'Absorb','Its leafy head peeks out of the meadow grass.'),
 row('psyduck','Psyduck','water',38,1.03,1,'Water Pulse','A puzzled yellow Pokémon often found beside the lake.'),
 row('geodude','Geodude','rock',37,1.13,1.2,'Rock Throw','A rocky Pokémon with a surprisingly strong pair of arms.'),
 row('vulpix','Vulpix','fire',32,1.08,.97,'Flame Burst','Follow its curled tails along the sunny ridge.'),
 row('jigglypuff','Jigglypuff','fairy',45,.94,.9,'Disarming Voice','A round pink Pokémon with an unforgettable voice.'),
 row('dratini','Dratini','dragon',34,1.15,1.08,'Dragon Breath','A rare discovery waiting near the blue-water cove.'),
 row('ivysaur','Ivysaur','grass',44,1.17,1.2,'Razor Leaf','Your Bulbasaur has grown a beautiful flower bud.'),
 row('charmeleon','Charmeleon','fire',41,1.3,1.07,'Flamethrower','Your Charmander has become a fiery, confident partner.'),
 row('wartortle','Wartortle','water',46,1.12,1.3,'Aqua Tail','Your Squirtle now has feathery ears and a curled tail.'),
 row('dragonite','Dragonite','dragon',51,1.3,1.22,'Dragon Pulse','A powerful, warm-hearted dragon. The champion’s partner.')
];
export const species=id=>SPECIES.find(s=>s.id===id)||SPECIES[0];
export const STARTERS=['bulbasaur','charmander','squirtle'];
export const MOVES=m=>[{name:'Tackle',type:'normal',power:9,accuracy:1},{name:species(m.species).move,type:species(m.species).type,power:13,accuracy:.96},{name:'Power '+(species(m.species).type==='water'?'Wave':species(m.species).type==='fire'?'Flare':'Strike'),type:species(m.species).type,power:20,accuracy:.84,level:7},{name:'Guard',guard:true,type:'normal',power:0,accuracy:1}];
export const TRAINERS=[
 {id:'luca',name:'Luca',title:'Meadow Scout',x:7,y:6,badge:'Leaf Badge',color:'#6f9c61',team:[['caterpie',5],['oddish',5]],line:'A good trainer learns from every battle.'},
 {id:'maya',name:'Maya',title:'Cove Captain',x:28,y:18,badge:'Wave Badge',color:'#5b9fbc',team:[['psyduck',6],['squirtle',7]],line:'Find your rhythm, just like the waves.'},
 {id:'rowan',name:'Rowan',title:'Ridge Ranger',x:27,y:5,badge:'Stone Badge',color:'#c59c6c',team:[['geodude',7],['vulpix',8]],line:'Even the strongest team starts small.'},
 {id:'iris',name:'Iris',title:'Meadow Champion',x:18,y:3,badge:'Champion Star',color:'#b9a5d1',team:[['pikachu',8],['dragonite',10]],line:'Your adventure brought you here. Show me your team!'}
];
export const SPAWNS=[
 ['pidgey',13,17,3],['caterpie',6,14,3],['oddish',6,9,4],['pikachu',11,6,4],['eevee',12,11,5],['jigglypuff',3,5,4],['pidgey',15,8,4],
 ['psyduck',23,20,5],['squirtle',28,23,5],['dratini',31,17,6],['psyduck',31,22,5],
 ['geodude',25,8,5],['vulpix',30,5,6],['geodude',31,10,6],['charmander',25,3,6],['bulbasaur',4,3,5],['dragonite',32,19,9,'iris']
].map(([kind,x,y,level,requiredBadge],id)=>({id,kind,x,y,level,requiredBadge}));
export const WIDTH=36,HEIGHT=28,CENTER={x:17,y:20},LAB={x:15,y:23};
export function tile(x,y){x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=WIDTH||y>=HEIGHT)return 'edge';if(x>23&&y>11&&y<17)return x>=27&&x<=28?'bridge':'water';if(x>32&&y>18&&y<24)return 'water';if(y===19&&x>1&&x<23||x>=16&&x<=18&&y>=5&&y<=25||y>=7&&y<=8&&x>11&&x<31||x===28&&y>=9&&y<=23||y>=22&&y<=23&&x>=18&&x<=31)return 'path';if(x>=13&&x<=21&&y>=17&&y<=25)return 'town';if(x>22&&y<12)return 'ridge';if(x>21&&y>=17)return 'coast';return 'grass';}
export const BUILDINGS=[{id:'center',x:16,y:20,w:3,h:2,name:'POKÉMON CENTER',color:'#d77b65'},{id:'lab',x:13,y:23,w:3,h:2,name:'FIELD LAB',color:'#829c78'}];
export const TREES=Array.from({length:95},(_,i)=>({x:((i*29+7)%35)+.5,y:((i*17+3)%27)+.5,size:.85+(i%4)*.12})).filter(t=>tile(t.x,t.y)==='grass'&&!SPAWNS.some(s=>Math.hypot(s.x-t.x,s.y-t.y)<1.7)&&!TRAINERS.some(s=>Math.hypot(s.x-t.x,s.y-t.y)<2)&&Math.hypot(t.x-18,t.y-3)>3);
export function blocked(x,y){const t=tile(x,y);return t==='edge'||t==='water'||BUILDINGS.some(b=>x>b.x-.35&&x<b.x+b.w+.25&&y>b.y-1&&y<b.y+.65)||TREES.some(t=>Math.hypot(t.x-x,t.y-y)<.38);}
export const region=(x,y)=>x>22?(y<13?'SUNSTONE RIDGE':'AZURE COVE'):y>16?'WILLOW TOWN':'CLOVER MEADOW';
