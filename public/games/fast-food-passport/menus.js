const parts=[
 ['sesame','Sesame bun','#edb66d'],['bun','Toasted bun','#dfa762'],['subroll','Sub roll','#dbac64'],
 ['tortilla','Flour tortilla','#efd8a8'],['shell','Crunchy shell','#f3ba55'],['dough','Pizza dough','#edc29a'],
 ['patty','Beef patty','#80543e'],['double','Two beef patties','#80543e'],['chicken','Chicken','#e59a50'],
 ['spicy','Spicy chicken','#d57b43'],['steak','Steak','#975943'],['nuggets','Chicken pieces','#dc9f55'],
 ['tenders','Chicken tenders','#ce8747'],['chickenfries','Chicken fries','#dd9a51'],['bacon','Bacon','#ba6350'],
 ['lettuce','Lettuce','#78ad64'],['tomato','Tomato','#de6757'],['pickle','Pickles','#8baa58'],
 ['cheese','Cheese','#f3c744'],['mozz','Mozzarella','#fff2cc'],['pepperoni','Pepperoni','#be594b'],
 ['marinara','Marinara','#c9674e'],['meatballs','Meatballs','#9a6547'],['turkey','Turkey','#daa582'],
 ['cucumber','Cucumber','#81b878'],['pepper','Peppers','#a9b05b'],['onion','Onions','#dfb6c5'],
 ['mayo','Mayo','#fff0d0'],['mac','Big Mac sauce','#eda97a'],['spread','Burger spread','#eaa673'],
 ['sauce','Creamy sauce','#ecd0a0'],['beans','Beans','#935f4a'],['rice','Rice','#faebc7'],
 ['beef','Seasoned beef','#8f5c3d'],['salsa','Salsa','#da785a'],['guac','Guacamole','#8bb664'],
 ['fries','Cut potatoes','#f2c36c'],['waffle','Waffle-cut potatoes','#efb869'],['salt','Salt','#fff7e1'],
 ['cajun','Cajun seasoning','#c86b44'],['bites','Bread dough bites','#edbc81'],['parmesan','Parmesan','#f5dda0'],
];
export const INGREDIENTS=Object.fromEntries(parts.map(([id,name,color])=>[id,{name,color}]));
const dish=(name,icon,shape,heat,parts)=>({name,icon,shape,heat,parts:parts.split(' ')});
export const RESTAURANTS=[
 {id:'mcd',name:"McDonald's",color:'#dd5142',accent:'#ffe087',menu:[
  dish('Big Mac','🍔','burger','grill','sesame double mac lettuce pickle cheese'),
  dish('McChicken','🍗','burger','fryer','bun chicken mayo lettuce'),
  dish('World Famous Fries','🍟','fries','fryer','fries salt'),
 ]},
 {id:'taco',name:'Taco Bell',color:'#8564ad',accent:'#ebd6ff',menu:[
  dish('Crunchy Taco','🌮','taco',null,'shell beef lettuce cheese'),
  dish('Bean Burrito','🌯','wrap',null,'tortilla beans cheese onion salsa'),
  dish('Cheese Quesadilla','🧀','pizza','grill','tortilla cheese sauce'),
 ]},
 {id:'subway',name:'Subway',color:'#469b6c',accent:'#ffdc80',menu:[
  dish('Oven-Roasted Turkey','🥪','sub',null,'subroll turkey lettuce tomato mayo'),
  dish('Meatball Marinara','🥖','sub','oven','subroll meatballs marinara mozz'),
  dish('Veggie Delite','🥬','sub',null,'subroll lettuce tomato cucumber pepper onion'),
 ]},
 {id:'chick',name:'Chick-fil-A',color:'#d35863',accent:'#fce5dc',menu:[
  dish('Chicken Sandwich','🥪','burger','fryer','bun chicken pickle'),
  dish('Chick-fil-A Nuggets','🍗','pieces','fryer','nuggets'),
  dish('Waffle Potato Fries','🍟','fries','fryer','waffle salt'),
 ]},
 {id:'chipotle',name:'Chipotle',color:'#9e473d',accent:'#ffcea4',menu:[
  dish('Chicken Burrito','🌯','wrap',null,'tortilla chicken rice beans salsa'),
  dish('Steak Burrito Bowl','🥗','bowl',null,'steak rice beans lettuce salsa'),
  dish('Veggie Tacos','🌮','taco',null,'tortilla beans salsa lettuce guac'),
 ]},
 {id:'wendys',name:"Wendy's",color:'#cc4b53',accent:'#e5f4f5',menu:[
  dish("Dave's Single",'🍔','burger','grill','bun patty cheese lettuce tomato pickle onion mayo'),
  dish('Baconator','🥓','burger','grill','bun double cheese bacon mayo'),
  dish('Spicy Chicken Sandwich','🍗','burger','fryer','bun spicy mayo lettuce tomato'),
 ]},
 {id:'king',name:'Burger King',color:'#dd813b',accent:'#ffe4a0',menu:[
  dish('Whopper','🍔','burger','grill','sesame patty tomato lettuce mayo pickle onion'),
  dish('Double Cheeseburger','🍔','burger','grill','sesame double cheese pickle'),
  dish('Chicken Fries','🍗','pieces','fryer','chickenfries'),
 ]},
 {id:'dominos',name:"Domino's",color:'#4c8fb7',accent:'#ffdcce',menu:[
  dish('Pepperoni Pizza','🍕','pizza','oven','dough marinara mozz pepperoni'),
  dish('Cheese Pizza','🧀','pizza','oven','dough marinara mozz'),
  dish('Parmesan Bread Bites','🥖','pieces','oven','bites parmesan'),
 ]},
 {id:'popeyes',name:'Popeyes',color:'#e3873e',accent:'#ffddab',menu:[
  dish('Classic Chicken Sandwich','🥪','burger','fryer','bun chicken mayo pickle'),
  dish('Chicken Tenders','🍗','pieces','fryer','tenders sauce'),
  dish('Cajun Fries','🍟','fries','fryer','fries cajun'),
 ]},
 {id:'in-n-out',name:'In-N-Out Burger',color:'#dc6149',accent:'#ffe17d',menu:[
  dish('Double-Double','🍔','burger','grill','bun double cheese lettuce tomato spread'),
  dish('Cheeseburger','🍔','burger','grill','bun patty cheese lettuce tomato spread'),
  dish('French Fries','🍟','fries','fryer','fries salt'),
 ]},
];
export const restaurantById=id=>RESTAURANTS.find(restaurant=>restaurant.id===id);
export const pantry=restaurant=>[...new Set([...restaurant.menu.flatMap(dish=>dish.parts),'tomato','salt','lettuce'])];
export const HEAT={
 grill:{name:'Grill',from:1.6,to:5.2},
 fryer:{name:'Fryer',from:1.9,to:5.7},
 oven:{name:'Oven',from:2.4,to:6.3},
};
