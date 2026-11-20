import {hoop,arc,stations} from './court.js';

export function paintCourt(ctx) {
  const floor=ctx.createLinearGradient(0,47,900,475);
  floor.addColorStop(0,'#a2552e');
  floor.addColorStop(.48,'#e9a35d');
  floor.addColorStop(1,'#92502e');
  ctx.fillStyle='#192729';
  ctx.fillRect(0,0,900,500);
  for(let x=0;x<900;x+=24) {
    ctx.fillStyle=x%48?'#27383b':'#304042';
    ctx.fillRect(x+1,10,21,24);
  }
  ctx.shadowColor='#0009';
  ctx.shadowBlur=14;
  ctx.fillStyle=floor;
  ctx.fillRect(42,49,816,420);
  ctx.shadowBlur=0;
  for(let y=52;y<465;y+=13) {
    ctx.fillStyle=y%2?'#5b240e21':'#fff4c519';
    ctx.fillRect(44,y,812,12);
    ctx.fillStyle='#61351844';
    for(let x=47+(y*7)%103;x<850;x+=103) ctx.fillRect(x,y,1,12);
  }
  ctx.strokeStyle='#fff2ce';
  ctx.lineWidth=3;
  ctx.strokeRect(55,59,790,401);
  ctx.fillStyle='#246962';
  ctx.fillRect(367,59,166,170);
  ctx.strokeRect(367,59,166,170);
  ctx.beginPath();
  ctx.arc(450,229,55,0,Math.PI);
  ctx.stroke();
  ctx.beginPath();
  const angle=Math.asin((59-hoop.y)/arc);
  ctx.arc(hoop.x,hoop.y,arc,angle,Math.PI-angle);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(450,460,55,Math.PI,Math.PI*2);
  ctx.stroke();
  ctx.textAlign='center';
  ctx.font='900 14px system-ui';
  ctx.fillStyle='#ffe9ad';
  ctx.fillText('A R C H E R B O X   C O U R T',450,492);
}

function oval(ctx,x,y,rx,ry,color) {
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  ctx.fillStyle=color;
  ctx.fill();
}

function drawPlayer(ctx,p,g,t) {
  const home=p.team===0;
  const color=home?'#67e2c9':'#ff9b51';
  const skin=['#bf7850','#8f4f35','#e4ab7a'][(p.index+p.team)%3];
  const step=Math.sin(t*10+p.index)*2;
  oval(ctx,p.x,p.y,17,10,'#35261755');
  if(p===g.you) {
    ctx.strokeStyle='#fbffda';
    ctx.lineWidth=2.5;
    ctx.beginPath();
    ctx.ellipse(p.x,p.y,21,12,0,0,Math.PI*2);
    ctx.stroke();
  }
  oval(ctx,p.x-6,p.y+step,4,6,'#edf0e7');
  oval(ctx,p.x+6,p.y-step,4,6,'#edf0e7');
  oval(ctx,p.x-12,p.y-13,5,7,skin);
  oval(ctx,p.x+12,p.y-13,5,7,skin);
  oval(ctx,p.x,p.y-12,12,12,color);
  oval(ctx,p.x,p.y-24,8,9,skin);
  oval(ctx,p.x,p.y-29,7,4,'#312421');
  ctx.fillStyle='#183032';
  ctx.font='bold 10px system-ui';
  ctx.textAlign='center';
  ctx.fillText(p.index+1+p.team*4,p.x,p.y-10);
  ctx.fillStyle='#101a1ded';
  ctx.fillRect(p.x-22,p.y-51,44,15);
  ctx.fillStyle=p===g.you?'#fffbdc':'#fff';
  ctx.font='bold 10px system-ui';
  ctx.fillText(p.name,p.x,p.y-40);
}

function ball(ctx,x,y,r) {
  oval(ctx,x,y,r,r,'#ff852e');
  ctx.strokeStyle='#6a321d';
  ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);
  ctx.ellipse(x,y,r*.4,r,0,0,Math.PI*2);
  ctx.stroke();
}

export function draw(ctx,background,g,t) {
  ctx.drawImage(background,0,0);
  if(g.mode==='contest') {
    stations.forEach((p,i)=>oval(ctx,p.x,p.y,22,11,i===Math.floor(g.attempts/3)?'#ffdb5d':'#f8e7ba66'));
  }
  [...g.players].sort((a,b)=>a.y-b.y).forEach(p=>drawPlayer(ctx,p,g,t));
  if(g.owner) {
    const {x,y}=g.owner;
    ball(ctx,x+18,y-6-Math.abs(Math.sin(t*9))*10,7);
  }
  ctx.fillStyle='#d5e9e8';
  ctx.fillRect(411,63,78,8);
  ctx.strokeStyle='#ffe6d0';
  ctx.lineWidth=1;
  ctx.beginPath();
  for(let i=-2;i<=2;i++){ctx.moveTo(450+i*6,98);ctx.lineTo(450+i*4,112);}
  ctx.moveTo(442,112);ctx.lineTo(458,112);
  ctx.stroke();
  ctx.strokeStyle='#f86d37';
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.ellipse(450,98,17,6,0,0,Math.PI*2);
  ctx.stroke();
  if(g.flight) {
    const {from,to,duration,elapsed,type}=g.flight;
    const phase=Math.min(1,elapsed/duration);
    const x=from.x+(to.x-from.x)*phase;
    const y=from.y+(to.y-from.y)*phase;
    const height=Math.sin(Math.PI*phase)*(type==='shot'?90:24);
    oval(ctx,x,y+1,8,4,'#25201960');
    ball(ctx,x,y-height,7+Math.sin(Math.PI*phase)*3);
  }
}
