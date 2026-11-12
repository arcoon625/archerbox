// ResizeObserver delivers these notices when layout settles on another frame.
// They are browser layout notifications, not a failed game simulation.
export function isLayoutWarning(event){return /^ResizeObserver loop (?:limit exceeded|completed with undelivered notifications\.?)$/.test(String(event?.message||''));}
export function isNonFatalBrowserNotice(event){
 if(isLayoutWarning(event))return true;
 // Page-inspection code can observe a node after it has been detached. No game
 // module uses MutationObserver; keep errors attributed to app files visible.
 return !event?.filename&&/Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'\.?/.test(String(event?.message||''));
}

export function createFrameRecovery({onFault=()=>{},onRecovered=()=>{},frames=3}={}){
 let pending=false,healthy=0;
 return {
  get pending(){return pending;},
  fault(event){if(isNonFatalBrowserNotice(event))return false;pending=true;healthy=0;onFault(event);return true;},
  frameSucceeded(){if(!pending)return false;if(++healthy<frames)return false;pending=false;healthy=0;onRecovered();return true;}
 };
}

// A running football frame can recover before a reload prompt is needed.
// Actual failures still surface when no successful frames follow the error.
export function createReloadNotice({show,hide,schedule=setTimeout,cancel=clearTimeout,delay=1600}){
 let timer=null,revision=0;
 const clear=()=>{revision++;if(timer!==null)cancel(timer);timer=null;};
 return {
  fault(recoverable=false){if(timer!==null)return;if(!recoverable){clear();show();return;}const rev=++revision;timer=schedule(()=>{if(rev!==revision)return;timer=null;show();},delay);},
  recovered(){clear();hide();},
  reset(){clear();hide();}
 };
}
