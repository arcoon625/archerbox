// Pointer lock owns mouse input. Pointer capture is only needed for touch drags.
// Browsers can be transitioning into lock before pointerLockElement updates.
export function capturePointer(target,pointerId){
 if(target.ownerDocument?.pointerLockElement)return false;
 try{target.setPointerCapture(pointerId);return true}catch(error){
  if(error?.name==='InvalidStateError'||error?.name==='NotFoundError')return false;
  throw error;
 }
}
export function bindAimControls(canvas,{isPlaying,onThrow,onAim,onLook,onUnlock}){
 const doc=canvas.ownerDocument,win=doc.defaultView;let drag=null,wasLocked=false;
 const reset=()=>{drag=null;onThrow(false);onAim(false)};
 canvas.oncontextmenu=e=>e.preventDefault();
 canvas.onpointerdown=e=>{
  if(!isPlaying())return;canvas.focus();
  if(e.pointerType==='mouse'){
   if(e.button===0){onThrow(true);if(!doc.pointerLockElement){
    try{canvas.requestPointerLock?.()?.catch?.(()=>{})}catch{/* Drag aiming remains available. */}
   }}
   if(e.button===2)onAim(true);
  }
  if(!doc.pointerLockElement){
   // Never capture the mouse here: its lock request may already be in progress.
   if(e.pointerType!=='mouse')capturePointer(canvas,e.pointerId);
   drag={id:e.pointerId,x:e.clientX,y:e.clientY};
  }
 };
 doc.addEventListener('mousemove',e=>{
  if(isPlaying()&&doc.pointerLockElement===canvas)onLook(-e.movementX*.0025,-e.movementY*.0022);
 });
 win.addEventListener('pointermove',e=>{
  if(!isPlaying()||doc.pointerLockElement||drag?.id!==e.pointerId)return;
  onLook(-(e.clientX-drag.x)*.004,-(e.clientY-drag.y)*.003);drag.x=e.clientX;drag.y=e.clientY;
 });
 win.addEventListener('pointerup',reset);win.addEventListener('pointercancel',reset);
 doc.addEventListener('pointerlockchange',()=>{
  const locked=doc.pointerLockElement===canvas;
  if(locked){drag=null;wasLocked=true;return}
  const lost=wasLocked;wasLocked=false;reset();if(lost)onUnlock();
 });
 return reset;
}
