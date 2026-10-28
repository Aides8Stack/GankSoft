// Separate validation build. Only the two public lifecycle awaits receive
// controllable gates; this page is never imported into the production app.
import {h,render} from 'vue';
import MarkdownEditor from '../../../src/editor/MarkdownEditor.vue';
import {createMarkdownEditor} from '../../../src/editor/milkdown-adapter';
const host=document.querySelector<HTMLElement>('#test-root')!;
const gates=new Map<string,{entered:Promise<void>;enter:()=>void;wait:Promise<void>;release:()=>void}>();
function arm(name:string){let enter!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>enter=r),wait=new Promise<void>(r=>release=r);const gate={entered,enter,wait,release};gates.set(name,gate);return gate;}
(window as any).b2Gate=async(name:string)=>{const gate=gates.get(name);if(gate){gates.delete(name);gate.enter();await gate.wait;}};
const assert=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
const initial={encoding:'ganksoft.editor/1' as const,markdown:'原节点的正文\n',assets:[]};
const media={stageClipboard:async()=>{throw Error('NOT_USED');}};
(window as any).b2Lifecycle={
 async unmountedInitialization(){
  const container=document.createElement('div');host.append(container);const gate=arm('create');let changes=0;
  const props={initial,revision:1,documentAdapter:{save:async()=>{throw Error('DISPOSED_OWNER_MUST_NOT_SAVE');}},mediaAdapter:media,onChanged:()=>changes++};
  render(h(MarkdownEditor,{...props,key:'original-node'}),container);await gate.entered;
  const oldRoot=container.querySelector('.editor-body')!;render(null,container);
  const teardown=arm('destroy');gate.release();await teardown.entered;
  const nextContainer=document.createElement('div');host.append(nextContainer);
  function until(test:()=>boolean,root:Node){if(test())return Promise.resolve();return new Promise<void>(resolve=>{const observer=new MutationObserver(()=>{if(test()){observer.disconnect();resolve();}});observer.observe(root,{childList:true,subtree:true,attributes:true});});}
  try{
   render(h(MarkdownEditor,{...props,key:'replacement-node',initial:{...initial,markdown:'替代节点独立正文\n'}}),nextContainer);
   await until(()=>!!nextContainer.querySelector('.gank-editor[aria-busy=false]'),nextContainer);
   const oldWritable=oldRoot.querySelectorAll('[contenteditable=true]').length,newWritable=nextContainer.querySelectorAll('[contenteditable=true]').length;
   assert(oldWritable===0,'unmounted initialization left a writable native owner during teardown');assert(newWritable===1,'replacement editor did not become writable');
   assert(nextContainer.querySelector('.ProseMirror')?.textContent==='替代节点独立正文','replacement received original node body');assert(changes===0,'disposed initialization emitted document changes');
   return {oldWritable,newWritable,changes,scope:'real Vue mount/unmount during pending native create, no unsupported abort option'};
  }finally{teardown.release();render(null,nextContainer);await until(()=>!oldRoot.querySelector('.ProseMirror'),oldRoot);container.remove();nextContainer.remove();}
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
