// Keys 1–5, P and F keep their original meanings. Receiver keys remain 1–5
// after the snap, independent of which playbook section is open.
export const RUN_PLAYS={
 run:{name:'Inside Run',lane:1.4,runner:5},
 sweepLeft:{name:'Sweep Left',lane:-9,runner:5},
 sweepRight:{name:'Sweep Right',lane:9,runner:5},
 counter:{name:'Counter Run',lane:6,startLane:-3,runner:5},
 qbDraw:{name:'QB Draw',lane:0,runner:0},
 qbSneak:{name:'QB Sneak',lane:0,runner:0,startDepth:1.3},
 zoneLeft:{name:'Inside Zone Left',lane:-3.5,startLane:-1.5,runner:5},
 zoneRight:{name:'Inside Zone Right',lane:3.5,startLane:1.5,runner:5},
 stretchLeft:{name:'Outside Zone Left',lane:-13,startLane:-4,runner:5},
 stretchRight:{name:'Outside Zone Right',lane:13,startLane:4,runner:5},
 powerLeft:{name:'Power Left',lane:-5,startLane:-2,runner:5},
 powerRight:{name:'Power Right',lane:5,startLane:2,runner:5},
 draw:{name:'RB Draw',lane:0,startLane:1.5,runner:5,startDepth:6.5},
 trap:{name:'Trap Run',lane:-2.1,runner:5,startDepth:2.9},
 qbPower:{name:'QB Power',lane:4,startLane:1,runner:0,startDepth:2.7},
 qbSweep:{name:'QB Sweep',lane:-10.5,startLane:-2,runner:0,startDepth:4}
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
export const OFFENSE_FORMATION=[
 ['QB',0,-5],['WR',-19,0],['WR',19,0],['WR',-10,-.8],['TE',10,0],['RB',2,-7],
 ['LT',-5.6,-.7],['LG',-2.8,-.7],['C',0,-.7],['RG',2.8,-.7],['RT',5.6,-.7]
].map(([role,x,depth])=>({role,x,depth}));
const receiverStarts=OFFENSE_FORMATION.slice(1,6).map(({x,depth})=>[x,depth]);
const routeSet = (...paths)=>Object.fromEntries(paths.map((path,i)=>[i+1,[receiverStarts[i],...path]]));
const outs = routeSet([[-19,6],[-25,6]],[[19,6],[25,6]],[[-10,6],[-16,6]],[[10,6],[16,6]],[[0,-1],[0,4]]);
const stretch = routeSet([[-20,24]],[[19,6],[25,9]],[[-10,11],[8,11]],[[10,13],[23,17]],[[8,-3],[19,0]]);
const mirrorRoutes = routes=>Object.fromEntries([2,1,4,3,5].map((slot,i)=>[i+1,[receiverStarts[i],...routes[slot].slice(1).map(([x,z])=>[-x,z])]]));
export const ROUTES={
 curl:{1:[[-19,0],[-19,10],[-17,7]],2:[[19,0],[19,10],[17,7]],3:[[-10,-.8],[-9,9],[-7,6]],4:[[10,0],[10,8],[8,5]],5:[[2,-7],[5,-1],[8,0]]},
 corner:{1:[[-19,0],[-17,7],[-24,16],[-24,42]],2:[[19,0],[17,7],[24,16],[24,42]],3:[[-10,-.8],[-8,6],[-18,16],[-18,38]],4:[[10,0],[9,6],[18,15],[18,32]],5:[[2,-7],[-4,-1],[-10,1]]},
 cross:{1:[[-19,0],[-16,5],[17,5]],2:[[19,0],[16,9],[-17,9]],3:[[-10,-.8],[-8,2],[16,2]],4:[[10,0],[9,12],[-12,12]],5:[[2,-7],[-6,-1],[-10,1]]},
 screen:{1:[[-19,0],[-21,30]],2:[[19,0],[20,32]],3:[[-10,-.8],[-8,25]],4:[[10,0],[17,8],[21,18]],5:[[2,-7],[9,-4],[13,-3],[13,2]]},
 quickOut:outs,
 stick:routeSet([[-21,25]],[[21,20]],[[-10,5],[-7,5]],[[9,6],[13,6]],[[8,-1],[15,2]]),
 mesh:routeSet([[-17,4],[13,4]],[[17,5],[-13,5]],[[-10,7],[-10,18]],[[12,13],[22,20]],[[7,-3],[14,0]]),
 spacing:routeSet([[-18,6],[-22,6]],[[19,6],[23,6]],[[-10,5],[-5,4]],[[10,5],[5,4]],[[0,-1],[-1,4]]),
 levels:routeSet([[-20,20]],[[19,8],[-2,8]],[[-9,3],[12,3]],[[10,14],[-6,15]],[[8,-2],[13,1]]),
 drive:routeSet([[-18,4],[18,4]],[[21,30]],[[-8,12],[12,12]],[[9,11],[16,21]],[[1,-1],[-6,1]]),
 floodRight:stretch,
 floodLeft:mirrorRoutes(stretch),
 verticals:routeSet([[-22,43]],[[22,43]],[[-8,42]],[[8,41]],[[1,-1],[3,4]]),
 postWheel:routeSet([[-19,13],[-3,33]],[[21,24]],[[-16,2],[-21,8],[-21,33]],[[8,8],[5,17]],[[8,-1],[14,1]]),
 dagger:routeSet([[-19,14],[2,15]],[[20,32]],[[-9,13],[-8,37]],[[12,7],[17,8]],[[2,-1],[-6,1]]),
 smash:routeSet([[-19,5],[-21,4]],[[19,5],[21,4]],[[-10,9],[-22,21]],[[10,9],[22,21]],[[2,0],[0,3]]),
 teSeam:routeSet([[-21,29]],[[21,29]],[[-11,6],[-20,9]],[[8,7],[8,34]],[[7,-2],[11,1]]),
 rbAngle:routeSet([[-21,21]],[[21,24]],[[-10,5],[-17,7]],[[10,8],[12,15]],[[8,-2],[8,1],[-4,10]])
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


const pass=(id,name,detail,target)=>({id,name,detail,target,kind:'pass',new:true});
const run=(id,detail)=>({id,name:RUN_PLAYS[id].name,detail,kind:'run'});
export const OFFENSE_PLAYS=[...PLAYS,
 pass('quickOut','Quick Outs','Break toward the sideline for a short gain',1),
 pass('stick','Stick','Slot receiver settles just past the line',3),
 pass('mesh','Mesh','Two receivers cross underneath the defense',1),
 pass('spacing','Spacing','Find a pocket between nearby defenders',3),
 pass('levels','Levels','Read the shallow and intermediate crossing routes',2),
 pass('drive','Drive','Pair a shallow cross with a deeper dig',3),
 pass('floodLeft','Flood Left','Three routes at different depths on the left',3),
 pass('floodRight','Flood Right','Three routes at different depths on the right',3),
 pass('verticals','Four Verticals','Send both wideouts and both inside receivers deep',4),
 pass('postWheel','Post Wheel','Read the deep post or the wheel up the sideline',3),
 pass('dagger','Dagger','Clear the middle for a deep in-breaking route',1),
 pass('smash','Smash','Read the short hitch or the corner route',4),
 pass('teSeam','TE Seam','Send your tight end straight up the seam',4),
 pass('rbAngle','RB Angle','The running back breaks outside, then cuts in',5),
 run('zoneLeft','Find the crease just left of center'),
 run('zoneRight','Find the crease just right of center'),
 run('stretchLeft','Push outside left and cut upfield'),
 run('stretchRight','Push outside right and cut upfield'),
 run('powerLeft','Hit the gap off the left guard'),
 run('powerRight','Hit the gap off the right guard'),
 run('draw','Start deeper and run straight up the middle'),
 run('trap','Quick handoff through an inside gap'),
 run('qbPower','Keep it with the QB and follow the right-side blocks'),
 run('qbSweep','Keep it with the QB and race outside left')
];
const byId=new Map(OFFENSE_PLAYS.map(play=>[play.id,play]));
export const playById=id=>byId.get(id);

// Run/pass mix and 20+ yard completions, 2026 regular season, checked Nov. 24, 2026.
// https://www.nfl.com/stats/team-stats/offense/passing/2026/reg/all
// https://www.nfl.com/stats/team-stats/offense/rushing/2026/reg/all
// Each row lists pass attempts, rush attempts, and completions of 20+ yards.
const teamTendencies={
 'san-francisco-49ers':[291,288,35],
 'chicago-bears':[335,336,36],
 'cincinnati-bengals':[380,211,35],
 'buffalo-bills':[303,320,40],
 'denver-broncos':[322,257,25],
 'cleveland-browns':[323,256,31],
 'tampa-bay-buccaneers':[273,322,17],
 'arizona-cardinals':[408,258,22],
 'los-angeles-chargers':[282,288,21],
 'kansas-city-chiefs':[338,275,33],
 'indianapolis-colts':[355,300,24],
 'washington-commanders':[334,269,34],
 'dallas-cowboys':[420,287,38],
 'miami-dolphins':[275,261,23],
 'philadelphia-eagles':[324,239,16],
 'atlanta-falcons':[299,278,29],
 'new-york-giants':[343,284,31],
 'jacksonville-jaguars':[309,284,38],
 'new-york-jets':[333,291,30],
 'detroit-lions':[334,293,30],
 'green-bay-packers':[370,219,43],
 'carolina-panthers':[373,256,36],
 'new-england-patriots':[309,278,35],
 'las-vegas-raiders':[390,270,35],
 'los-angeles-rams':[375,288,29],
 'baltimore-ravens':[333,302,28],
 'new-orleans-saints':[386,248,24],
 'seattle-seahawks':[305,293,28],
 'pittsburgh-steelers':[366,236,29],
 'houston-texans':[350,256,37],
 'tennessee-titans':[317,234,21],
 'minnesota-vikings':[299,263,26],
};

const quickCalls=['slant','quickOut','stick','spacing','mesh','rbAngle','screen'];
const deepCalls=['deep','verticals','postWheel','dagger','teSeam','corner','smash'];
const intermediateCalls=['levels','drive','floodLeft','floodRight','curl','cross'];
const insideCalls=['run','zoneLeft','zoneRight','powerLeft','powerRight','trap','draw'];
const outsideCalls=['sweepLeft','sweepRight','stretchLeft','stretchRight','counter'];

export function teamPlaybook(teamId='',qbSpeed=75){
 const stats=Object.hasOwn(teamTendencies,teamId)?teamTendencies[teamId]:null;
 const [passAttempts,rushAttempts,longPasses]=stats||[55,45,5];
 const passShare=passAttempts/(passAttempts+rushAttempts);
 const vertical=stats&&longPasses/passAttempts>=.095;
 const style=passShare<.515?'Run leaning':passShare>=.585?(vertical?'Downfield passing':'Pass leaning'):'Balanced';
 const passCalls=vertical?[...deepCalls,...intermediateCalls,...quickCalls]:[...quickCalls,...intermediateCalls,...deepCalls];
 const runCalls=qbSpeed>=86?['qbPower','qbSweep','qbDraw',...insideCalls,...outsideCalls]:[...insideCalls,...outsideCalls];
 return {style,passShare,fromStats:!!stats,passCalls,runCalls};
}

export function recommendedPlays(book,down,yards){
 if(yards<=2)return ['qbSneak',...book.runCalls.slice(0,3),'stick','quickOut'];
 if(down>=2&&yards>=8)return [...new Set([...book.passCalls.slice(0,4),'drive','draw'])];
 const passCount=book.passShare>=.585?4:book.passShare<.515?2:3;
 return [...book.passCalls.slice(0,passCount),...book.runCalls.slice(0,6-passCount)];
}

export function cpuPlay(book,down,yards,clock){
 const gameTick=Math.floor(clock)*23+down*11;
 const running=yards<=2||((gameTick%100)/100>book.passShare&&(down===1||yards<=7));
 if(running&&yards<=1)return 'qbSneak';
 const calls=running?book.runCalls:yards<=4?quickCalls:book.passCalls;
 return calls[(gameTick+Math.floor(clock/10))%Math.min(8,calls.length)];
}
