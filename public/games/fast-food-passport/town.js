export const WIDTH=1080, HEIGHT=650;
export const START={x:540,y:350};
export const START_HEADING=Math.atan2(-125,-110);
export const PLACES=[
 {id:'stack',name:"McDonald's",dish:'Big Mac',icon:'🍔',color:'#d45040',trim:'#ffd56b',price:5,pay:6,
  job:{type:'stack',title:'Build a Big Mac',steps:['Sesame Seed Bun','Beef Patties','Big Mac Sauce'],extra:'Bacon'}},
 {id:'taco',name:'Taco Bell',dish:'Crunchy Taco',icon:'🌮',color:'#855fa4',trim:'#e0cbf2',price:4,pay:5,
  job:{type:'stack',title:'Fill a Crunchy Taco',steps:['Crunchy Taco Shell','Seasoned Beef','Cheddar Cheese'],extra:'Guacamole'}},
 {id:'fries',name:'Five Guys',dish:'Little Fries',icon:'🍟',color:'#c74c4a',trim:'#fff2e7',price:4,pay:5,
  job:{type:'timing',title:'Pull a fry basket',tip:'Tap when the marker reaches the green zone.',zone:[.52,.83]}},
 {id:'pizza',name:'Pizza Hut',dish:'Pepperoni Pizza',icon:'🍕',color:'#b63c45',trim:'#f8b0a0',price:5,pay:6,
  job:{type:'match',title:'Find the right pizza order',ticket:'Pepperoni pizza on Personal Pan crust',
   choices:['Cheese Personal Pan Pizza','Pepperoni Personal Pan Pizza',"Pepperoni Thin ’N Crispy Pizza"],answer:1}},
 {id:'nuggets',name:'Chick-fil-A',dish:'8-count Nuggets',icon:'🍗',color:'#d36b71',trim:'#fff2e7',price:4,pay:5,
  job:{type:'match',title:'Pack a nugget order',ticket:'Eight nuggets with Chick-fil-A Sauce',
   choices:['Eight nuggets with Chick-fil-A Sauce','Eight nuggets with ranch','Twelve nuggets with Chick-fil-A Sauce'],answer:0}},
 {id:'shake',name:'Shake Shack',dish:'Strawberry Shake',icon:'🥤',color:'#678f59',trim:'#cbdd9e',price:5,pay:6,
  job:{type:'timing',title:'Blend a milkshake',tip:'Tap when the marker reaches the green zone.',zone:[.32,.64]}},
 {id:'sub',name:'Subway',dish:'Oven-Roasted Turkey Sub',icon:'🥪',color:'#41886b',trim:'#f7cf66',price:5,pay:6,
  job:{type:'stack',title:'Stack a turkey sub',steps:['Artisan Italian Bread','Oven-Roasted Turkey','Lettuce'],extra:'Bacon'}},
 {id:'donut',name:'Krispy Kreme',dish:'Chocolate Iced Doughnut with Sprinkles',icon:'🍩',color:'#66a995',trim:'#fff0eb',price:3,pay:5,
  job:{type:'match',title:'Pick the right donut',ticket:'Chocolate frosting with rainbow sprinkles',
   choices:['Vanilla frosting with rainbow sprinkles','Chocolate frosting with cookie crumbs','Chocolate frosting with rainbow sprinkles'],answer:2}},
].map((place,index)=>{
 const x=165+250*(index%4),top=index<4;
 const y=top?143:482;
 return {...place,x,y,top,door:{x,y:top?248:440},bounds:{x:x-92,y:y-24,w:184,h:103}};
});
export const placeById=id=>PLACES.find(place=>place.id===id);
export const nearPlace=({x,y})=>PLACES.find(place=>Math.hypot(x-place.door.x,y-place.door.y)<46);
export function firstPersonVector(heading,side,forward){
 const sin=Math.sin(heading),cos=Math.cos(heading);
 return {x:sin*forward-cos*side,y:cos*forward+sin*side};
}
export function turnToward(current,target,seconds){
 const distance=target-current;
 return current+Math.atan2(Math.sin(distance),Math.cos(distance))*(1-Math.exp(-seconds*12));
}
export function canWalk(x,y){
 if(x<22||y<30||x>WIDTH-22||y>HEIGHT-22)return false;
 return PLACES.every(({bounds:b})=>x<b.x-13||x>b.x+b.w+13||y<b.y-13||y>b.y+b.h+13);
}
export function walk(position,x,y,seconds,speed=235){
 const length=Math.hypot(x,y);
 if(length<.01)return;
 const dx=x/length*seconds*speed,dy=y/length*seconds*speed;
 if(canWalk(position.x+dx,position.y))position.x+=dx;
 if(canWalk(position.x,position.y+dy))position.y+=dy;
}

// Routes can start anywhere on the map, including the paths behind the shops.
export function routeTo(position,dest){
 const tile=16,cols=Math.floor(WIDTH/tile),rows=Math.floor(HEIGHT/tile);
 const size=cols*rows,previous=new Int32Array(size).fill(-1);
 const point=id=>({x:id%cols*tile+8,y:Math.floor(id/cols)*tile+8});
 const node=({x,y})=>Math.floor(y/tile)*cols+Math.floor(x/tile);
 const source=node(position),end=node(dest),queue=[source];
 previous[source]=source;
 for(let i=0;i<queue.length;i++){
  const id=queue[i];
  if(id===end){
   const path=[dest];
   for(let at=id;at!==source;at=previous[at])path.push(point(at));
   return path.reverse();
  }
  const col=id%cols,row=Math.floor(id/cols);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=col+dx,y=row+dy,next=y*cols+x;
   if(x<0||x>=cols||y<0||y>=rows||previous[next]!==-1)continue;
   const nextPoint=point(next);
   if(!canWalk(nextPoint.x,nextPoint.y))continue;
   previous[next]=id;
   queue.push(next);
  }
 }
 return [];
}
