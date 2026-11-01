/** Preview-ready front-end API; the existing learning session remains the timer's source of truth. */
export type PauseReason = 'manual'|'window-blur'|'page-hidden'|'navigation'|'restored';
export type PauseAction = 'pause'|'resume';
export interface PauseSession {
  deckId:string; sessionId:string; entry:{cardId:string}; revision:number;
  paused:boolean; completed:boolean; stage:'answer'|'reveal'|'result';
  elapsedSeconds:number; totalSeconds:number;
}
export interface PauseTransport<S extends PauseSession> {
  /** Reuse the caller's existing serial learning.session.change API, not a new IPC. */
  change(action:PauseAction):Promise<S>;
  get():Promise<S>;
}
export interface PauseView<S extends PauseSession> {
  session:S; blocked:boolean; busy:boolean; reason:PauseReason|null; error:string;
  cardSeconds:number; totalSeconds:number; canContinue:boolean;
}
export function createReviewPauseController<S extends PauseSession>(options:{initial:S;transport:PauseTransport<S>;now?:()=>number}) {
  let session=options.initial,hold=session.paused,reason:PauseReason|null=hold?'restored':null;
  let error='',pending=0,disposed=false,anchor=(options.now??Date.now)();
  let frozenCard=session.elapsedSeconds,frozenTotal=session.totalSeconds;
  let tail:Promise<void>=Promise.resolve();
  const now=options.now??Date.now,listeners=new Set<(v:PauseView<S>)=>void>();
  const done=()=>session.completed||session.stage==='result';
  const clock=()=>{const extra=!hold&&!session.paused&&!done()?Math.max(0,Math.floor((now()-anchor)/1000)):0;
    return {cardSeconds:(hold?frozenCard:session.elapsedSeconds)+extra,totalSeconds:(hold?frozenTotal:session.totalSeconds)+extra};};
  const getState=():PauseView<S>=>({session,blocked:!done()&&(hold||session.paused),busy:pending>0,reason,error,
    ...clock(),canContinue:(hold||session.paused)&&pending===0&&!done()});
  const emit=()=>{if(!disposed)for(const fn of listeners)fn(getState());};
  const sync=(next:S)=>{session=next;anchor=now();frozenCard=next.elapsedSeconds;frozenTotal=next.totalSeconds;
    if(session.paused&&!hold){hold=true;reason='restored';}if(done()){hold=false;reason=null;}emit();};
  const serialize=(task:()=>Promise<void>)=>{pending++;emit();const run=tail.then(async()=>{if(!disposed)await task();});
    tail=run.catch(()=>{});return run.finally(()=>{pending--;emit();});};
  const reconcile=async()=>{try{sync(await options.transport.get());}catch{ /* unknown result stays blocked */ }};
  const pause=(why:PauseReason='manual')=>{if(disposed||done())return Promise.resolve();
    if(!hold){const t=clock();frozenCard=t.cardSeconds;frozenTotal=t.totalSeconds;}
    hold=true;reason=why;error='';emit();
    return serialize(async()=>{try{if(!session.paused)sync(await options.transport.change('pause'));
      if(!session.paused)throw Error('暂停未被确认');}catch(e){await reconcile();if(!session.paused)error='暂停未确认：'+String(e);}emit();});};
  const resume=()=>{if(disposed||done()||(!hold&&!session.paused))return Promise.resolve();
    return serialize(async()=>{error='';emit();try{if(session.paused)sync(await options.transport.change('resume'));
      if(session.paused)throw Error('继续未被确认');hold=false;reason=null;anchor=now();}
      catch(e){hold=true;await reconcile();error='继续失败，仍保持暂停：'+String(e);}emit();});};
  const subscribe=(fn:(v:PauseView<S>)=>void)=>{listeners.add(fn);fn(getState());return()=>listeners.delete(fn);};
  return {getState,pause,resume,sync,subscribe,leave:()=>pause('navigation'),dispose:()=>{disposed=true;listeners.clear();}};
}
export function bindReviewAutoPause(
  controller:{pause:(reason:PauseReason)=>Promise<void>},
  targetWindow:Pick<Window,'addEventListener'|'removeEventListener'>,
  documentTarget:Pick<Document,'addEventListener'|'removeEventListener'|'hidden'>,
){const onBlur=()=>{void controller.pause('window-blur');};
  const onHidden=()=>{if(documentTarget.hidden)void controller.pause('page-hidden');};
  targetWindow.addEventListener('blur',onBlur);documentTarget.addEventListener('visibilitychange',onHidden);
  return()=>{targetWindow.removeEventListener('blur',onBlur);documentTarget.removeEventListener('visibilitychange',onHidden);};
}
