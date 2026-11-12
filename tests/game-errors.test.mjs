import assert from 'node:assert/strict';
import {isLayoutWarning,isNonFatalBrowserNotice,createFrameRecovery,createReloadNotice} from '../public/game-errors.js';

for(const message of ['ResizeObserver loop limit exceeded','ResizeObserver loop completed with undelivered notifications.'])assert(isLayoutWarning({message}));
for(const message of ['Cannot read properties of undefined','THREE renderer failed','ResizeObserver is not defined','Script error.'])assert(!isLayoutWarning({message}),'real errors are not discarded');
const detachedObserver="Uncaught TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'.";
assert(isNonFatalBrowserNotice({message:detachedObserver,filename:''}));
assert(!isNonFatalBrowserNotice({message:detachedObserver,filename:'/games/touchdown-rush/game.js'}),'app errors stay visible even with a similar message');
let faults=0,recovered=0;
const recovery=createFrameRecovery({onFault:()=>faults++,onRecovered:()=>recovered++});
assert(!recovery.fault({message:'ResizeObserver loop limit exceeded'}));assert.equal(faults,0);
assert(recovery.fault({message:'Temporary callback error'}));assert(recovery.pending);
assert(!recovery.frameSucceeded());assert(!recovery.frameSucceeded());assert(recovery.frameSucceeded());assert(!recovery.pending);assert.equal(recovered,1);
assert(!recovery.frameSucceeded());assert.equal(recovered,1);
recovery.fault({message:'Persistent render error'});recovery.frameSucceeded();recovery.frameSucceeded();recovery.fault({message:'Persistent render error'});assert(!recovery.frameSucceeded());assert(recovery.pending,'each repeated failure resets the healthy-frame count');

let clock=0,serial=0,shown=0,hidden=0;const jobs=new Map();
const schedule=(fn,delay)=>{const id=++serial;jobs.set(id,{fn,at:clock+delay});return id;},cancel=id=>jobs.delete(id);
const advance=ms=>{clock+=ms;for(const [id,job] of [...jobs])if(job.at<=clock){jobs.delete(id);job.fn();}};
const notice=createReloadNotice({show:()=>shown++,hide:()=>hidden++,schedule,cancel});
notice.fault(true);advance(1000);assert.equal(shown,0,'a transient football error does not block the match');notice.recovered();advance(2000);assert.equal(shown,0,'successful frames cancel the pending reload notice');
notice.fault(true);notice.fault(true);assert.equal(jobs.size,1);advance(1600);assert.equal(shown,1,'an unrecovered failure is still visible');notice.recovered();assert.equal(hidden,2,'a recovered game clears an existing warning');
notice.fault(true);notice.reset();advance(2000);assert.equal(shown,1,'leaving a game cancels its stale error timer');
notice.fault(false);assert.equal(shown,2,'games without recovery keep their existing failure handling');
console.log('Game error handling passed: known layout notices, real faults, three successful-frame recovery, repeated failures, delayed prompts, cancellation, stale-game cleanup and existing game behavior.');
