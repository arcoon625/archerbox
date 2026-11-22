import {WIDTH,HEIGHT,PLACES} from './town.js?v=realchains1';

function box(ctx,x,y,w,h,r,color){
 ctx.fillStyle=color;
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
function disk(ctx,x,y,r,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
function label(ctx,text,x,y,size,color,weight=800){
 ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.fillText(text,x,y);
}
function tree(ctx,x,y){
 disk(ctx,x+4,y+7,19,'#55776b55');
 box(ctx,x-3,y,6,16,2,'#917452');
 disk(ctx,x,y,16,'#56856c');
 disk(ctx,x-4,y-5,12,'#74a67e');
 disk(ctx,x+5,y-8,8,'#88b48b');
}
function table(ctx,x,y,color){
 for(const [dx,dy] of [[0,-14],[0,14],[-14,0],[14,0]])disk(ctx,x+dx,y+dy,5,'#ae9781');
 disk(ctx,x+2,y+2,11,'#b5a496');
 disk(ctx,x,y,10,color);
 disk(ctx,x,y,3,'#f2dbb0');
}
function building(ctx,place){
 const {x,y,w,h}=place.bounds,mid=place.x,doorY=place.top?y+h-28:y+8;
 box(ctx,x+7,y+11,w,h+4,14,'#152e3544');
 box(ctx,x,y,w,h,13,'#4a5454');
 box(ctx,x+4,y+4,w-8,h-10,10,place.color);
 box(ctx,x+5,y+18,w-10,56,6,'#f4e2bd');
 box(ctx,x+8,y+23,w-16,48,6,'#f9edce');
 box(ctx,x+11,y+26,w-22,41,6,'#244851');
 for(let i=1;i<=4;i++)box(ctx,x+9+i*33,y+27,3,39,0,'#7ba5a4');
 box(ctx,x+15,y+31,w-31,4,1,'#a3ccbe7a');
 box(ctx,x+7,y+68,w-14,20,5,place.color);
 for(let i=0;i<8;i++)box(ctx,x+13+i*20,y+68,9,15,2,place.trim);
 box(ctx,mid-27,doorY,54,26,4,'#293d44');
 box(ctx,mid-22,doorY+3,44,20,3,'#82a9a5');
 box(ctx,mid-1,doorY+3,2,20,0,'#263e45');
 const sign=place.top?y-23:y+h+3;
 box(ctx,mid-74,sign,148,27,7,'#1d343d');
 label(ctx,place.name,mid-4,sign+14,14,'#fff4d8');
 disk(ctx,mid+73,sign-4,19,'#0d293e66');
 disk(ctx,mid+71,sign-7,18,place.color);
 label(ctx,place.icon,mid+71,sign-6,24,'#fff');
}

export function townPainter(canvas){
 const base=document.createElement('canvas');
 base.width=WIDTH;base.height=HEIGHT;
 const map=base.getContext('2d'),ctx=canvas.getContext('2d');
 box(map,0,0,WIDTH,HEIGHT,0,'#a4c5a0');
 for(let y=0;y<HEIGHT;y+=28)for(let x=0;x<WIDTH;x+=28){
  const shade=(x*7+y*11)%15;
  map.fillStyle=shade<4?'#f2e6b41c':'#668e7813';
  map.fillRect(x,y,18+shade,18+shade);
 }
 box(map,35,83,1010,192,24,'#dfcdb0');
 box(map,35,423,1010,185,24,'#dfcdb0');
 box(map,0,279,WIDTH,134,3,'#f1e3c3');
 box(map,0,299,WIDTH,94,2,'#5b7580');
 for(let x=10;x<WIDTH;x+=50){
  box(map,x,344,28,4,2,'#f5ce7e');
  box(map,x,285,36,2,1,'#cdc1a9');
  box(map,x,405,36,2,1,'#cdc1a9');
 }
 for(const crossing of [44,539,1038]){
  for(let y=300;y<391;y+=14)box(map,crossing-13,y,26,6,1,'#eee8d5');
 }
 label(map,'PASSPORT PLAZA',540,37,19,'#355d52');
 box(map,477,57,126,5,3,'#64866b');
 for(const x of [78,283,548,802,1004]){
  tree(map,x,69);tree(map,x+15,620);
 }
 for(const place of PLACES){
  const patio=place.top?place.y+116:place.y-42;
  table(map,place.x-62,patio,place.color);
  table(map,place.x+62,patio,place.color);
  building(map,place);
 }
 let view={scale:1,left:0,top:0,ratio:1};
 function resize(){
  const {clientWidth:w,clientHeight:h}=canvas;
  if(!w||!h)return;
  const ratio=Math.min(devicePixelRatio,2),scale=Math.min(w/WIDTH,h/HEIGHT);
  canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
  view={scale,left:(w-WIDTH*scale)/2,top:(h-HEIGHT*scale)/2,ratio};
 }
 function draw(position,tour,near,steps,moving,time){
  const {scale,left,top,ratio}=view;
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.fillStyle='#a4c5a0';ctx.fillRect(0,0,canvas.width/ratio,canvas.height/ratio);
  ctx.translate(left,top);ctx.scale(scale,scale);
  ctx.drawImage(base,0,0);
  if(steps.length){
   ctx.strokeStyle='#fff4c8';ctx.lineWidth=4;ctx.setLineDash([5,8]);
   ctx.beginPath();ctx.moveTo(position.x,position.y);
   steps.forEach(point=>ctx.lineTo(point.x,point.y));ctx.stroke();ctx.setLineDash([]);
  }
  for(const place of PLACES){
   const {x,y}=place.door;
   const stamped=tour.stamps.includes(place.id),ready=tour.orders.includes(place.id);
   if(near===place){
    ctx.strokeStyle='#fff6c8';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,20+Math.sin(time/250)*2,0,Math.PI*2);ctx.stroke();
   }
   disk(ctx,x,y,14,stamped?'#35765c':ready?'#c77641':'#2e4a53');
   label(ctx,stamped?'✓':ready?'◆':'↗',x,y+.5,15,'#fff7df');
  }
  const {x,y}=position,sway=moving?Math.sin(time/62)*4:0;
  ctx.fillStyle='#2a3c3955';ctx.beginPath();ctx.ellipse(x+3,y+8,12,6,0,0,Math.PI*2);ctx.fill();
  for(const side of [-1,1]){
   box(ctx,x+side*5-3,y+3+side*sway,6,9,2,'#304254');
   disk(ctx,x+side*10,y-2,4,'#e8b28a');
  }
  box(ctx,x-9,y-12,18,18,6,'#336d72');
  box(ctx,x-6,y-10,12,14,4,'#e5a751');
  disk(ctx,x,y-16,9,'#eaaf79');
  disk(ctx,x,y-19,8,'#254954');
  box(ctx,x-8,y-19,16,4,2,'#608c93');
 }
 function mapPoint(clientX,clientY){
  const rect=canvas.getBoundingClientRect();
  return {x:(clientX-rect.left-view.left)/view.scale,y:(clientY-rect.top-view.top)/view.scale};
 }
 return {resize,draw,mapPoint};
}
