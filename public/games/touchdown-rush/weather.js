export const WEATHER = {
 clear:{name:'Clear',icon:'☀',detail:'Good visibility. Normal passing and kicking.'},
 rain:{name:'Rain',icon:'☂',detail:'Wet football: passes are less accurate for both teams.'},
 snow:{name:'Snow',icon:'❄',detail:'Snow and low visibility make distant receivers harder to see.'},
 wind:{name:'Wind',icon:'➜',detail:'Crosswind bends field goals and extra points. Adjust your aim.'}
};
export function normalizeWeather(raw) {
 const kind=Object.hasOwn(WEATHER,raw?.kind)?raw.kind:'clear';
 return {kind,windX:kind==='wind'?Math.max(-7,Math.min(7,Number(raw.windX)||4.5)):0,windZ:kind==='wind'?Math.max(-1.4,Math.min(1.4,Number(raw.windZ)||0)):0};
}
export function rollWeather(random=Math.random) {
 const bucket=Math.min(7,Math.max(0,Math.floor(random()*8)));
 return normalizeWeather({kind:['rain','snow','wind'][bucket]||'clear',windX:(random()<.5?-1:1)*(4+random()*2),windZ:(random()-.5)*2.4});
}
export const rainSpread=(weather,spread)=>weather?.kind==='rain'?spread*1.5+1.45:spread;
export function windLabel(weather,direction=-1) {
 if(weather?.kind!=='wind')return '';
 const x=weather.windX*(-direction),head=weather.windZ*direction;
 return `${Math.round(Math.abs(weather.windX)*4)} MPH ${x<0?'← LEFT':'RIGHT →'}${Math.abs(head)>.45?(head<0?' · HEADWIND':' · TAILWIND'):''}`;
}
