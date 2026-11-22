export const WIDTH=1080, HEIGHT=650;
export const START={x:540,y:350};
export const PLACES=[
 {id:'stack',name:'Stack Stop',dish:'Double Smash Burger',icon:'🍔',color:'#d87943',price:5,pay:6,
  job:{type:'stack',title:'Build a burger',steps:['Bun','Smash Patty','Pickles'],extra:'Tomato'}},
 {id:'taco',name:'Crunch Cantina',dish:'Crispy Taco',icon:'🌮',color:'#dd9e47',price:4,pay:5,
  job:{type:'stack',title:'Fill a taco',steps:['Taco Shell','Chicken','Corn Salsa'],extra:'Guacamole'}},
 {id:'fries',name:'Fry Way',dish:'Loaded Fries',icon:'🍟',color:'#eab94b',price:4,pay:5,
  job:{type:'timing',title:'Pull a fry basket',tip:'Tap when the marker reaches the green zone.',zone:[.52,.83]}},
 {id:'pizza',name:'Pizza Pit Stop',dish:'Pepperoni Slice',icon:'🍕',color:'#c77568',price:5,pay:6,
  job:{type:'match',title:'Find the right pizza order',ticket:'Two pepperoni slices and one cheese slice',
   choices:['One pepperoni and two cheese','Two pepperoni and one cheese','Three pepperoni'],answer:1}},
 {id:'nuggets',name:'Nugget Lane',dish:'Crispy Nuggets',icon:'🍗',color:'#d99156',price:4,pay:5,
  job:{type:'match',title:'Pack a nugget order',ticket:'Six nuggets with smoky barbecue sauce',
   choices:['Six nuggets with smoky barbecue','Six nuggets with ranch','Four nuggets with smoky barbecue'],answer:0}},
 {id:'shake',name:'Swirl Shack',dish:'Strawberry Milkshake',icon:'🥤',color:'#d883a6',price:5,pay:6,
  job:{type:'timing',title:'Blend a milkshake',tip:'Tap when the marker reaches the green zone.',zone:[.32,.64]}},
 {id:'sub',name:'Sub Station',dish:'Toasted Club Sub',icon:'🥪',color:'#6baf93',price:5,pay:6,
  job:{type:'stack',title:'Stack a sandwich',steps:['Toasted Roll','Turkey','Lettuce'],extra:'Onions'}},
 {id:'donut',name:'Glaze Garage',dish:'Chocolate Donut',icon:'🍩',color:'#a68bd3',price:3,pay:5,
  job:{type:'match',title:'Pick the right donut',ticket:'Chocolate frosting with rainbow sprinkles',
   choices:['Vanilla frosting with rainbow sprinkles','Chocolate frosting with cookie crumbs','Chocolate frosting with rainbow sprinkles'],answer:2}},
].map((place,index)=>{
 const x=165+250*(index%4),top=index<4;
 const y=top?143:482;
 return {...place,x,y,top,door:{x,y:top?248:440},bounds:{x:x-92,y:y-24,w:184,h:103}};
});
export const placeById=id=>PLACES.find(place=>place.id===id);
export const nearPlace=({x,y})=>PLACES.find(place=>Math.hypot(x-place.door.x,y-place.door.y)<46);
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
