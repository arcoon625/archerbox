export const levels=[
 {name:'Ember Steps',subtitle:'Learn the jumps',theme:'stone',color:0xe49b52,count:12,gap:4.1,width:3.8,rise:.23,zig:2.1,moving:0},
 {name:'Molten Foundry',subtitle:'Cross the moving machinery',theme:'factory',color:0x849ba3,count:14,gap:4.3,width:3.4,rise:.28,zig:2.3,moving:.5},
 {name:'Magma Canyon',subtitle:'Leap between rocky pillars',theme:'canyon',color:0xb87b57,count:15,gap:4.5,width:3.0,rise:.3,zig:2.5,moving:.55},
 {name:'Reactor Run',subtitle:'Climb through the power station',theme:'reactor',color:0x55b8ac,count:16,gap:4.5,width:2.8,rise:.32,zig:2.6,moving:.65},
 {name:'Inferno Ascent',subtitle:'Reach the highest escape gate',theme:'inferno',color:0x9b82ac,count:18,gap:4.6,width:2.6,rise:.35,zig:2.6,moving:.7}
];
export function course(index){
 const config=levels[index],pattern=[0,1,2,1,0,-1,-2,-1];
 return Array.from({length:config.count+1},(_,i)=>({id:i,x:i===0?0:pattern[(i-1)%pattern.length]*config.zig,z:i===0?0:-5-(i-1)*config.gap,y:1+i*config.rise,w:i===0?8:i===config.count?7:i%4===0?4.6:config.width,d:i===0?7:i===config.count?6:i%4===0?4.2:config.width,h:i===0?1.8:1.1,checkpoint:i>0&&i<config.count&&i%4===0,finish:i===config.count,amplitude:config.moving&&i%4===2?config.moving:0,phase:i*.8}));
}
export function platformX(p,time){return p.x+Math.sin(time*.85+p.phase)*p.amplitude}
