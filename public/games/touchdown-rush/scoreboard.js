import * as THREE from '../../vendor/three.module.js';
import {teamLogoImage,drawTeamLogo} from './team-branding.js?v=creators1';

export function scoreboardState(game,homeIndex=0){
 const g=game||{},scores=g.scores||[0,0],offense=g.offense??0,d=g.viewDirection??(offense===0?-1:1),line=g.line??30,goal=g.goal??20;
 const seconds=Math.max(0,Math.ceil(g.clock??180)),down=Math.max(1,Math.min(4,g.down??1));
 return {scores,homeIndex,offense,clock:g.practiceKicks?'PRACTICE':g.injuryTraining?'TRAINING':g.ended?'FINAL':seconds===0?'OT':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'),
  down:['','1ST','2ND','3RD','4TH'][down],toGo:goal*d>=50?'GOAL':String(Math.max(0,Math.ceil((goal-line)*d))),
  ballOn:line===0?'50':(line*d<0?'OWN ':'OPP ')+Math.round(50-Math.min(50,Math.abs(line))),
  status:g.placeKick?(g.placeKick.kind==='extraPoint'?'EXTRA POINT':g.placeKick.distance+' YARD FIELD GOAL'):g.returnPlay?'RETURN':g.phase==='ready'?'READY TO SNAP':g.phase==='dead'?'END OF PLAY':g.phase==='finished'?'FINAL':g.event||'FIRST TO 21 · 11 VS 11'};
}
export function makeScoreboard(teams,homeIndex,isDisposed){
 if(typeof document==='undefined')return {texture:null,context:null,logos:[],revision:0};
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=640;
 const board={context:canvas.getContext('2d'),texture:new THREE.CanvasTexture(canvas),logos:[],revision:0};board.texture.colorSpace=THREE.SRGBColorSpace;board.texture.anisotropy=8;
 teams.forEach((t,i)=>teamLogoImage(t).then(image=>{if(image&&!isDisposed()){board.logos[i]=image;board.revision++;}}));return board;
}
export function drawScoreboard(bowl,game){
 const {scoreboard:board,teams,homeIndex}=bowl.userData,c=board.context;if(!c)return;
 const s=scoreboardState(game,homeIndex),key=JSON.stringify(s)+board.revision;if(key===bowl.userData.lastBoard)return;bowl.userData.lastBoard=key;
 c.clearRect(0,0,1536,640);c.fillStyle='#081016';c.fillRect(0,0,1536,640);
 const home=teams[homeIndex],awayIndex=1-homeIndex;
 c.fillStyle='#'+new THREE.Color(home.color).getHexString();c.fillRect(0,0,1536,64);c.fillStyle='#fff';c.textAlign='center';c.font='bold 27px Arial';c.fillText((home.shortName||home.name).toUpperCase()+'  /  HOME FIELD',768,42,1000);
 for(const [slot,i] of [awayIndex,homeIndex].entries()){
  const x=slot?1010:24,w=502,team=teams[i];c.fillStyle='#111e27';c.fillRect(x,79,w,358);c.fillStyle='#'+new THREE.Color(team.color).getHexString();c.fillRect(x,79,w,12);
  c.textAlign='left';c.fillStyle='#acbbc2';c.font='bold 20px Arial';c.fillText(slot?'HOME':'VISITOR',x+22,121);
  drawTeamLogo(c,board.logos[i],x+22,142,114,114);c.fillStyle='#f8f8ef';c.font='bold 37px Arial';c.fillText((team.shortName||team.name).toUpperCase(),x+155,184,w-170);
  c.font='bold 194px monospace';c.textAlign='center';c.fillText(String(s.scores[i]),x+w/2,398,370);
  if(s.offense===i){c.fillStyle='#ffe298';c.beginPath();c.moveTo(x+170,414);c.lineTo(x+190,404);c.lineTo(x+190,424);c.closePath();c.fill();c.font='bold 17px Arial';c.fillText('POSSESSION',x+277,421);}
 }
 c.fillStyle='#000508';c.fillRect(546,80,444,357);c.fillStyle='#9baeb5';c.font='bold 21px Arial';c.textAlign='center';c.fillText('GAME CLOCK',768,132);
 c.fillStyle='#ffce6b';c.font='bold '+(s.clock.length>5?'59':'112')+'px monospace';c.fillText(s.clock,768,263,420);c.font='bold 20px Arial';c.fillStyle='#a3b7bb';c.fillText('ARCHERBOX 2026',768,344);c.font='18px Arial';c.fillText('FIRST TO 21',768,385);
 const values=[['DOWN',s.down],['TO GO',s.toGo],['BALL ON',s.ballOn],['BALL',teams[s.offense]?.mark||teams[s.offense]?.shortName||'HOME']];
 values.forEach(([label,value],i)=>{const x=24+i*378;c.fillStyle='#1a2830';c.fillRect(x,454,354,112);c.fillStyle='#91a7b1';c.font='bold 18px Arial';c.fillText(label,x+177,482);c.fillStyle='#f4f6e8';c.font='bold 49px monospace';c.fillText(value,x+177,543,330);});
 c.fillStyle='#d1cbaa';c.font='bold 22px Arial';c.fillText(String(s.status).toUpperCase(),768,612,1450);
 // Subtle LED pixel structure on the physical screen, without obscuring text.
 c.fillStyle='#00000016';for(let y=66;y<640;y+=6)c.fillRect(0,y,1536,1);
 board.texture.needsUpdate=true;
}
