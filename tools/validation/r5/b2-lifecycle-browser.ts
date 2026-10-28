// Separate validation build. Only the two public lifecycle awaits receive
// controllable gates; this page is never imported into the production app.
import {createMarkdownEditor} from '../../../src/editor/milkdown-adapter';
const host=document.querySelector<HTMLElement>('#test-root')!;
const gates=new Map<string,{entered:Promise<void>;enter:()=>void;wait:Promise<void>;release:()=>void}>();
function arm(name:string){let enter!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>enter=r),wait=new Promise<void>(r=>release=r);const gate={entered,enter,wait,release};gates.set(name,gate);return gate;}
(window as any).b2Gate=async(name:string)=>{const gate=gates.get(name);if(gate){gates.delete(name);gate.enter();await gate.wait;}};
const assert=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
const initial={encoding:'ganksoft.editor/1' as const,markdown:'原节点的正文\n',assets:[]};
const media={stageClipboard:async()=>{throw Error('NOT_USED');}};
(window as any).b2Lifecycle={
 async abortInitialization(){
  const root=document.createElement('div');host.append(root);const gate=arm('create'),owner=new AbortController();let changes=0,editor:any;
  const pending=createMarkdownEditor(root,initial,media,()=>changes++,message=>{throw Error(message);},{signal:owner.signal} as any);
  try{await gate.entered;owner.abort();gate.release();let cancelled=false;
   try{editor=await pending;}catch(e){cancelled=(e as Error).name==='AbortError';}
   assert(cancelled,'disposed initialization returned an active editor instead of AbortError');
   assert(root.querySelectorAll('[contenteditable=true]').length===0,'aborted owner left writable native editor');assert(changes===0,'aborted owner emitted document changes');
   return {cancelled,changes,writable:root.querySelectorAll('[contenteditable=true]').length};
  }finally{gate.release();await editor?.destroy();root.remove();}
 },
 async disableBeforeAsyncDestroy(){
  const root=document.createElement('div');host.append(root);const editor=await createMarkdownEditor(root,initial,media,()=>{},message=>{throw Error(message);});
  assert(root.querySelectorAll('[contenteditable=true]').length===1,'initial native editor is not writable');const gate=arm('destroy'),destroying=editor.destroy();
  try{await gate.entered;const writable=root.querySelectorAll('[contenteditable=true]').length;
   // The old root remains attached deliberately. A replacement may now mount.
   const nextRoot=document.createElement('div');host.append(nextRoot);const next=await createMarkdownEditor(nextRoot,{...initial,markdown:'新节点独立正文\n'},media,()=>{},()=>{});
   try{assert(writable===0,'native editor stayed writable during asynchronous destroy');assert(host.querySelectorAll('[contenteditable=true]').length===1,'overlapping writable native instances');return {oldWritable:writable,totalWritable:host.querySelectorAll('[contenteditable=true]').length};}
   finally{await next.destroy();nextRoot.remove();}
  }finally{gate.release();await destroying;root.remove();}
 }
};
