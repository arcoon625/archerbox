export const INGREDIENTS=[
 {id:'flour',name:'Flour',icon:'▧',color:'#ead9b3'},
 {id:'sugar',name:'Sugar',icon:'◇',color:'#fff5dd'},
 {id:'butter',name:'Butter',icon:'▰',color:'#f4cb6c'},
 {id:'eggs',name:'Eggs',icon:'●',color:'#eab993'},
 {id:'milk',name:'Milk',icon:'▥',color:'#b9d9d5'},
 {id:'chips',name:'Choc chips',icon:'∴',color:'#805144'},
 {id:'vanilla',name:'Vanilla',icon:'❋',color:'#d9ad73'},
 {id:'cocoa',name:'Cocoa',icon:'▨',color:'#aa7460'},
 {id:'strawberries',name:'Strawberries',icon:'♥',color:'#ef8e91'},
 {id:'blueberries',name:'Blueberries',icon:'⁙',color:'#9796c9'},
 {id:'cinnamon',name:'Cinnamon',icon:'≋',color:'#c29369'},
 {id:'yeast',name:'Yeast',icon:'⋮',color:'#d2b993'},
 {id:'apples',name:'Apples',icon:'●',color:'#b78758'},
 {id:'lemons',name:'Lemons',icon:'◒',color:'#e6c45e'},
 {id:'bananas',name:'Bananas',icon:'☾',color:'#dfbb69'},
 {id:'salt',name:'Salt',icon:'⋰',color:'#ece5d3'},
 {id:'cream',name:'Cream',icon:'▥',color:'#f6e7bd'}
];
export const TOPPINGS=[
 {id:'chocolate',name:'Chocolate drizzle',color:'#664134',icon:'≋'},
 {id:'vanilla',name:'Vanilla icing',color:'#fff1d2',icon:'❋'},
 {id:'strawberry',name:'Strawberry icing',color:'#ec9ca9',icon:'♥'},
 {id:'sugar',name:'Powdered sugar',color:'#ffffff',icon:'✧'}
];
// Game recipes use one scoop of each item. They are intentionally simplified.
export const RECIPES=[
 {id:'cookies',quantity:3,name:'Choc-chip cookies',short:'COOKIES',ingredients:['flour','sugar','butter','eggs','chips'],bake:7,price:18,color:'#d59b57',toppings:['chocolate','sugar']},
 {id:'cupcakes',quantity:3,name:'Vanilla cupcakes',short:'CUPCAKES',ingredients:['flour','sugar','butter','eggs','milk','vanilla'],bake:8,price:23,color:'#e2b36b',toppings:['strawberry','vanilla']},
 {id:'brownies',quantity:4,name:'Chocolate brownies',short:'BROWNIES',ingredients:['flour','sugar','butter','eggs','cocoa'],bake:9,price:24,color:'#674231',toppings:['vanilla','chocolate']},
 {id:'cake',quantity:1,name:'Strawberry cake',short:'CAKE',ingredients:['flour','sugar','butter','eggs','milk','strawberries'],bake:10,price:32,color:'#e1b879',toppings:['strawberry','vanilla']},
 {id:'muffins',quantity:3,name:'Blueberry muffins',short:'MUFFINS',ingredients:['flour','sugar','butter','eggs','milk','blueberries'],bake:8,price:25,color:'#c99b60',toppings:['sugar','vanilla']},
 {id:'rolls',quantity:3,name:'Cinnamon rolls',short:'ROLLS',ingredients:['flour','sugar','butter','milk','cinnamon','yeast'],bake:10,price:29,color:'#c38749',toppings:['vanilla','chocolate']},
 {id:'doughnuts',quantity:3,name:'Baked doughnuts',short:'DOUGHNUTS',ingredients:['flour','sugar','butter','milk','yeast','vanilla'],bake:9,price:27,color:'#d7a262',toppings:['strawberry','chocolate'],new:true},
 {id:'apple-pie',quantity:1,name:'Apple pie',short:'APPLE PIE',ingredients:['flour','sugar','butter','eggs','apples','cinnamon'],bake:11,price:35,color:'#c68b4c',toppings:['sugar','vanilla'],new:true},
 {id:'lemon-bars',quantity:4,name:'Lemon bars',short:'LEMON BARS',ingredients:['flour','sugar','butter','eggs','lemons'],bake:9,price:28,color:'#e9ca61',toppings:['sugar','vanilla'],new:true},
 {id:'banana-bread',quantity:1,unit:'loaf',name:'Banana bread',short:'BANANA BREAD',ingredients:['flour','sugar','butter','eggs','bananas','cinnamon'],bake:10,price:30,color:'#b3844d',toppings:['chocolate','sugar'],new:true},
 {id:'pretzels',quantity:3,name:'Soft pretzels',short:'PRETZELS',ingredients:['flour','butter','milk','yeast','salt'],bake:9,price:24,color:'#b9783d',toppings:['chocolate','sugar'],new:true},
 {id:'eclairs',quantity:3,name:'Cream eclairs',short:'ECLAIRS',ingredients:['flour','sugar','butter','eggs','milk','cream'],bake:10,price:34,color:'#d7a360',toppings:['chocolate','vanilla'],new:true}
];
export function batchLabel(recipe){return recipe.quantity+' '+(recipe.unit?recipe.unit+' of ':'')+recipe.name.toLowerCase();}
export const CUSTOMERS=[
 {name:'Mia',shirt:0x7eaaa3,skin:0xc88f6d,hair:0x493328,style:0},
 {name:'Leo',shirt:0xd8a268,skin:0xe5b38e,hair:0x6a4931,style:1},
 {name:'Nova',shirt:0xb39ac3,skin:0x84563e,hair:0x2f2725,style:2},
 {name:'Axel',shirt:0x769ab8,skin:0xd2a077,hair:0x49372f,style:1},
 {name:'Echo',shirt:0xbc7e77,skin:0x9c6a4d,hair:0x332a28,style:0},
 {name:'Blaze',shirt:0x83a58a,skin:0xf0c5a4,hair:0x925e3d,style:2}
];
export const DAYS=[
 {name:'A sweet beginning',recipes:[0,1,0,2,1]},
 {name:'The morning crowd',recipes:[4,3,5,2,4]},
 {name:'The grand bake',recipes:[5,3,1,4,2]},
 {name:'The doughnut & pie shop',recipes:[6,7,8,6,7]},
 {name:'The bread basket',recipes:[9,10,11,9,10]},
 {name:'The dessert festival',recipes:[11,8,6,7,9]}
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createGame(mode='cozy',day=0){
 return {mode:mode==='rush'?'rush':'cozy',day:clamp(day|0,0,DAYS.length-1),orderIndex:0,coins:0,totalServed:0,perfect:0,missed:0,elapsed:0,phase:'ingredients',selected:[],mixed:0,bakeTime:0,quality:0,topping:null,patience:100,orderTime:0,mistakes:0,notice:'',lastSale:null};
}
export function order(g){const recipe=RECIPES[DAYS[g.day].recipes[g.orderIndex]],customer=CUSTOMERS[(g.orderIndex+g.day*2)%CUSTOMERS.length],topping=TOPPINGS.find(t=>t.id===recipe.toppings[(g.orderIndex+g.day)%recipe.toppings.length]);return {recipe,customer,topping,number:g.orderIndex+1};}
export function windowSize(g){return g.mode==='cozy'?6:2.6;}
export function recipeCheck(g){const wanted=order(g).recipe.ingredients;return {missing:wanted.filter(id=>!g.selected.includes(id)),extra:g.selected.filter(id=>!wanted.includes(id))};}
function say(g,text){g.notice=text;return false;}
export function selectIngredient(g,id){
 if(g.phase!=='ingredients'||!INGREDIENTS.some(i=>i.id===id))return false;
 g.selected=g.selected.includes(id)?g.selected.filter(x=>x!==id):[...g.selected,id];g.notice='';return true;
}
export function mix(g){
 if(g.phase==='ingredients'){
  const check=recipeCheck(g),name=id=>INGREDIENTS.find(i=>i.id===id).name;
  if(check.missing.length||check.extra.length){g.mistakes++;return say(g,[check.extra.length?'Remove '+check.extra.map(name).join(', ')+'.':'',check.missing.length?'Add '+check.missing.map(name).join(', ')+'.':''].filter(Boolean).join(' '));}
  g.phase='mixing';g.mixed=0;g.notice='Tap the whisk six times to mix your batter!';
 }
 if(g.phase!=='mixing')return false;
 g.mixed++;if(g.mixed>=6){g.mixed=6;g.phase='ready';g.notice='Smooth batter! Time for the oven.';}return true;
}
export function bake(g){if(!['ready','undercooked'].includes(g.phase))return false;g.phase='baking';g.notice='Watch the oven. Take it out in the green zone!';return true;}
export function takeOut(g){
 if(g.phase!=='baking')return false;const r=order(g).recipe;
 if(g.bakeTime<r.bake){g.phase='undercooked';return say(g,'Still a little doughy. Put it back to finish baking.');}
 if(g.bakeTime>r.bake+windowSize(g)+3){g.phase='burnt';g.mistakes++;return say(g,'Oops, this batch burned! Try a fresh batch.');}
 g.quality=g.bakeTime<=r.bake+windowSize(g)?1:.65;g.phase='decorate';g.notice=g.quality===1?'Golden and delicious! Add the topping on the ticket.':'A little extra crispy! Add the customer’s topping.';return true;
}
export function decorate(g,id){if(g.phase!=='decorate'||!TOPPINGS.some(t=>t.id===id))return false;g.topping=id;g.notice='Topping added. Ready to serve?';return true;}
export function serve(g){
 if(g.phase!=='decorate')return false;const {recipe,customer,topping}=order(g);
 if(g.topping!==topping.id){g.mistakes++;return say(g,customer.name+' asked for '+topping.name.toLowerCase()+'. Choose it to fix your treat.');}
 const perfect=g.quality===1&&g.mistakes===0,tip=Math.max(1,Math.round((perfect?9:4)*g.quality+(g.mode==='rush'?g.patience/20:0))),earned=recipe.price+tip;
 g.coins+=earned;g.totalServed++;if(perfect)g.perfect++;g.lastSale={earned,tip,perfect,customer:customer.name};g.phase='served';g.notice=perfect?'“Exactly what I wanted. You’re a star!”':'“Thank you! This looks delicious.”';return true;
}
export function freshBatch(g){
 if(['served','missed','complete'].includes(g.phase))return false;
 g.phase='ingredients';g.selected=[];g.mixed=0;g.bakeTime=0;g.quality=0;g.topping=null;g.notice='Fresh bowl, fresh start. Your customer is still waiting.';return true;
}
export function nextOrder(g){
 if(!['served','missed'].includes(g.phase))return false;
 if(g.orderIndex===4){g.phase='complete';g.notice='';return true;}
 g.orderIndex++;g.phase='ingredients';g.selected=[];g.mixed=0;g.bakeTime=0;g.quality=0;g.topping=null;g.patience=100;g.orderTime=0;g.mistakes=0;g.notice='';g.lastSale=null;return true;
}
export function tick(g,dt){
 if(['complete','served','missed'].includes(g.phase))return;
 dt=clamp(Number(dt)||0,0,.1);g.elapsed+=dt;g.orderTime+=dt;
 if(g.mode==='rush'){g.patience=Math.max(0,100-g.orderTime/(95-g.day*8)*100);if(g.patience===0){g.phase='missed';g.missed++;g.notice='This customer had to go. The next order is a fresh start.';return;}}
 if(g.phase==='baking'){g.bakeTime+=dt;if(g.bakeTime>order(g).recipe.bake+windowSize(g)+3){g.phase='burnt';g.mistakes++;g.notice='Oops, this batch burned! Try a fresh batch.';}}
}
