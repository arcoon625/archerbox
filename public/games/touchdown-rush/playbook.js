// Keys 1–5, P and F keep their original meanings. Receiver keys remain 1–5
// after the snap, independent of which playbook section is open.
export const RUN_PLAYS={
 run:{name:'Inside Run',lane:1.4,runner:5},
 sweepLeft:{name:'Sweep Left',lane:-9,runner:5},
 sweepRight:{name:'Sweep Right',lane:9,runner:5},
 counter:{name:'Counter Run',lane:6,startLane:-3,runner:5},
 qbDraw:{name:'QB Draw',lane:0,runner:0},
 qbSneak:{name:'QB Sneak',lane:0,runner:0,startDepth:1.3}
};
export const PLAYS=[
 {id:'deep',name:'Long Pass',detail:'Receivers race downfield',kind:'pass',key:'1',code:'Digit1'},
 {id:'slant',name:'Quick Slant',detail:'Fast routes across the middle',kind:'pass',key:'2',code:'Digit2'},
 {id:'run',name:'Inside Run',detail:'Follow the line through the middle',kind:'run',key:'3',code:'Digit3'},
 {id:'sweepLeft',name:'Sweep Left',detail:'Follow lead blocks around the left',kind:'run',key:'4',code:'Digit4'},
 {id:'sweepRight',name:'Sweep Right',detail:'Follow lead blocks around the right',kind:'run',key:'5',code:'Digit5'},
 {id:'punt',name:'Punt',detail:'Kick deep · opponent returns',kind:'kick',key:'P',code:'KeyP'},
 {id:'fieldGoal',name:'Field Goal',detail:'Aim between the posts · 3 points',kind:'kick',key:'F',code:'KeyF'},
 {id:'curl',name:'Curl Routes',detail:'Run ahead, turn back for the catch',kind:'pass',key:'6',code:'Digit6',target:3,new:true},
 {id:'corner',name:'Corner Strike',detail:'Break toward the outside corners',kind:'pass',key:'7',code:'Digit7',target:2,new:true},
 {id:'cross',name:'Crossing Routes',detail:'Receivers cross at different depths',kind:'pass',key:'8',code:'Digit8',target:3,new:true},
 {id:'screen',name:'RB Screen',detail:'A short pass to your running back',kind:'pass',key:'9',code:'Digit9',target:5,new:true},
 {id:'counter',name:'Counter Run',detail:'Start left, then cut back right',kind:'run',key:'0',code:'Digit0',new:true},
 {id:'qbDraw',name:'QB Draw',detail:'Keep the ball and run with your QB',kind:'run',key:'Q',code:'KeyQ',new:true},
 {id:'qbSneak',name:'QB Sneak',detail:'Quick snap · follow your center through a gap',kind:'run',key:'R',code:'KeyR',new:true}
];
export const SCRIMMAGE_PLAYS=PLAYS.filter(p=>p.kind!=='kick');
export const playForKey=code=>PLAYS.find(p=>p.code===code);
export function runLane(id,time){const run=RUN_PLAYS[id];return run?.startLane==null?run?.lane:time<.4?run.startLane:run.startLane+(run.lane-run.startLane)*Math.min(1,(time-.4)/.65);}

// Coordinates are yards across the field and yards beyond the line. Shared
// route sampling drives receivers, pass leads, CPU play and friend matches.
export const ROUTES={
 curl:{1:[[-19,0],[-19,10],[-17,7]],2:[[19,0],[19,10],[17,7]],3:[[-10,-.8],[-9,9],[-7,6]],4:[[10,0],[10,8],[8,5]],5:[[2,-7],[5,-1],[8,0]]},
 corner:{1:[[-19,0],[-17,7],[-24,16],[-24,42]],2:[[19,0],[17,7],[24,16],[24,42]],3:[[-10,-.8],[-8,6],[-18,16],[-18,38]],4:[[10,0],[9,6],[18,15],[18,32]],5:[[2,-7],[-4,-1],[-10,1]]},
 cross:{1:[[-19,0],[-16,5],[17,5]],2:[[19,0],[16,9],[-17,9]],3:[[-10,-.8],[-8,2],[16,2]],4:[[10,0],[9,12],[-12,12]],5:[[2,-7],[-6,-1],[-10,1]]},
 screen:{1:[[-19,0],[-21,30]],2:[[19,0],[20,32]],3:[[-10,-.8],[-8,25]],4:[[10,0],[17,8],[21,18]],5:[[2,-7],[9,-4],[13,-3],[13,2]]}
};
export function routePoint(id,receiver,time,speed=7.2){
 const points=ROUTES[id]?.[receiver];if(!points)return null;
 let remaining=Math.max(0,time)*Math.max(0,speed);
 for(let i=1;i<points.length;i++){
  const [x,z]=points[i-1],[tx,tz]=points[i],length=Math.hypot(tx-x,tz-z);
  if(remaining<=length){const t=length?remaining/length:1;return {x:x+(tx-x)*t,depth:z+(tz-z)*t};}remaining-=length;
 }
 const [x,depth]=points.at(-1);return {x,depth};
}
