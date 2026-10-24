<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import type { z } from 'zod';
import type { MediaReference } from '../../shared/protocol/unified';
import type { MarkdownEditorHandle } from './milkdown-adapter';
const props=defineProps<{markdown:string;mediaRefs:z.infer<typeof MediaReference>[]} >();
const root=ref<HTMLElement>(),error=ref('');
let queue=Promise.resolve();
let generation=0,handle:MarkdownEditorHandle|undefined,disposed=false;
function render() {
  const current=++generation;
  queue=queue.then(async()=>{
  if(disposed||current!==generation)return;
  error.value='';
  if(handle){const old=handle;handle=undefined;await old.destroy();}
  if(disposed||current!==generation||!root.value)return;
  try {
    const {createMarkdownEditor}=await import('./milkdown-adapter');
    if(disposed||current!==generation||!root.value)return;
    const assets=[...new Map(props.mediaRefs.map(r=>[r.assetId,{id:r.assetId,mime:r.mime,access:'asset' as const}])).values()];
    const next=await createMarkdownEditor(root.value,{encoding:'ganksoft.editor/1',markdown:props.markdown,assets},
      {stageClipboard:async()=>{throw Error('READ_ONLY_CONTENT');}},()=>{},message=>{if(current===generation)error.value=message;},{readOnly:true});
    if(disposed||current!==generation)await next.destroy();else handle=next;
  } catch(e){if(current===generation)error.value=String(e);}
  });
  return queue;
}
onMounted(render);watch(()=>JSON.stringify([props.markdown,props.mediaRefs]),render);
onBeforeUnmount(()=>{disposed=true;generation++;void handle?.destroy();});
</script>
<template><div class="gank-content"><div ref="root"/><p v-if="error" role="alert">{{error}}</p></div></template>
<style>
.gank-content .milkdown .ProseMirror{padding:12px 16px;min-height:0;outline:none}
.gank-content img[data-gank-placement]{display:inline-block;max-width:100%;vertical-align:middle}
.gank-content .crepe-placeholder{display:none}
</style>
