import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewPauseController, type PauseSession} from '../src/review/review-pause-controller.ts';

const make=()=>{
  let time=0,started=0,actions:string[]=[];
  let data:PauseSession={deckId:'deck',sessionId:'session',entry:{cardId:'one'},revision:1,stage:'answer',completed:false,paused:false,elapsedSeconds:0,totalSeconds:0};
  const read=()=>({...data,entry:{...data.entry}});
  const transport={
    async change(action:'pause'|'resume'){
      actions.push(action);
      if(action==='pause'&&!data.paused){const delta=Math.floor((time-started)/1000);data={...data,paused:true,elapsedSeconds:data.elapsedSeconds+delta,totalSeconds:data.totalSeconds+delta,revision:data.revision+1};}
      if(action==='resume'&&data.paused){data={...data,paused:false,revision:data.revision+1};started=time;}
      return read();
    },
    async get(){return read();},
  };
  const ctrl=createReviewPauseController({initial:read(),transport,now:()=>time});
  return {ctrl,actions,advance:(ms:number)=>{time+=ms;},replace:(next:PauseSession)=>{data=next;started=time;ctrl.sync(read());},get:read};
};

test('manual pause freezes per-card and total timers, explicit resume restarts',async()=>{
  const d=make();d.advance(5200);assert.equal(d.ctrl.getState().cardSeconds,5);
  await d.ctrl.pause('manual');assert.equal(d.ctrl.getState().blocked,true);
  assert.equal(d.ctrl.getState().cardSeconds,5);
  d.advance(20000);assert.equal(d.ctrl.getState().cardSeconds,5);
  await d.ctrl.resume();assert.equal(d.ctrl.getState().blocked,false);
  d.advance(3100);assert.equal(d.ctrl.getState().cardSeconds,8);
  await d.ctrl.pause('window-blur');assert.equal(d.ctrl.getState().cardSeconds,8);
  assert.deepEqual(d.actions,['pause','resume','pause']);
  d.ctrl.dispose();
});

test('route leave + duplicate auto pause remains one write; returning never auto-resumes',async()=>{
  const d=make();d.advance(2000);await d.ctrl.leave();
  await d.ctrl.pause('window-blur');await d.ctrl.pause('page-hidden');
  assert.equal(d.ctrl.getState().blocked,true);
  assert.equal(d.ctrl.getState().reason,'page-hidden');
  assert.equal(d.actions.length,1);
  d.advance(30000);assert.equal(d.ctrl.getState().totalSeconds,2);
  await d.ctrl.resume();assert.equal(d.ctrl.getState().blocked,false);
  d.ctrl.dispose();
});

test('each new card zeroes its own duration while preserving total and results do not display a pause overlay',async()=>{
  const d=make();d.advance(12000);
  const first=d.ctrl.getState();assert.equal(first.cardSeconds,12);
  d.replace({...first.session,entry:{cardId:'one'},stage:'result',paused:true,elapsedSeconds:12,totalSeconds:12});
  assert.equal(d.ctrl.getState().blocked,false);
  d.replace({...first.session,entry:{cardId:'two'},revision:4,stage:'answer',paused:false,elapsedSeconds:0,totalSeconds:12});
  assert.equal(d.ctrl.getState().cardSeconds,0);assert.equal(d.ctrl.getState().totalSeconds,12);
  d.advance(3200);assert.equal(d.ctrl.getState().cardSeconds,3);assert.equal(d.ctrl.getState().totalSeconds,15);
  d.ctrl.dispose();
});

test('failed pause stays blocked, retry resumes only after authoritative reconciliation',async()=>{
  let attempt=0,session:PauseSession={deckId:'d',sessionId:'s',entry:{cardId:'c'},revision:1,paused:false,completed:false,stage:'answer',elapsedSeconds:0,totalSeconds:0};
  const c=createReviewPauseController({initial:session,transport:{
    change:async(action)=>{if(action==='pause'&&attempt++===0)throw Error('write failed');session={...session,paused:action==='pause',revision:session.revision+1};return session;},
    get:async()=>session
  }});
  await c.pause('manual');assert.equal(c.getState().blocked,true);assert.match(c.getState().error,/暂停未确认/);
  await c.pause('manual');assert.equal(c.getState().error,'');assert.equal(c.getState().session.paused,true);
  await c.resume();assert.equal(c.getState().blocked,false);c.dispose();
});

test('W2 blur during pending resume cannot clear the later pause intent',async()=>{
 let release!:()=>void;let s:PauseSession={deckId:'d',sessionId:'s',entry:{cardId:'c'},revision:1,paused:true,completed:false,stage:'answer',elapsedSeconds:4,totalSeconds:4};
 const c=createReviewPauseController({initial:s,transport:{async change(action){if(action==='resume')await new Promise<void>(r=>release=r);s={...s,paused:action==='pause',revision:s.revision+1};return s;},async get(){return s;}}});
 const resume=c.resume();await Promise.resolve();const pause=c.pause('window-blur');release();await resume;assert.equal(c.getState().blocked,true);await pause;assert.equal(c.getState().session.paused,true);assert.equal(c.getState().blocked,true);c.dispose();
});

test('W2 a failed pause retains the original cutoff through delayed explicit resume',async()=>{
 let time=2300,attempt=0,cutoff='';let s:PauseSession={deckId:'d',sessionId:'s',entry:{cardId:'c'},revision:1,paused:false,completed:false,stage:'answer',elapsedSeconds:0,totalSeconds:0};
 const c=createReviewPauseController({initial:s,now:()=>time,transport:{async change(action,at){if(action==='pause'){if(attempt++===0)throw Error('pause unavailable');cutoff=at!;}s={...s,paused:action==='pause',revision:s.revision+1};return s;},async get(){return s;}}});
 await c.pause('window-blur');time+=10000;await c.resume();assert.equal(cutoff,new Date(2300).toISOString());assert.equal(c.getState().blocked,false);c.dispose();
});
