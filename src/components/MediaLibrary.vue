<script setup lang="ts">
import {ref,onMounted,shallowRef} from 'vue';
import {mediaLibrary} from '../services';
import type {Output,Input} from '../../shared/protocol/registry';
const props=defineProps<{deckId:string}>();
const page=shallowRef<Output<'media.library.list'>>(),impact=shallowRef<Output<'media.library.impact'>>();
const query=ref(''),busy=ref(false),error=ref(''),confirming=ref(false),view=ref(''),notice=ref('');
const pending=shallowRef<{payload:Input<'media.library.delete'>;requestId:string}|null>(null);
async function load(offset=0){busy.value=true;try{page.value=await mediaLibrary.list({deckId:props.deckId,query:query.value,offset});}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function inspect(assetId:string){busy.value=true;confirming.value=false;error.value='';try{impact.value=await mediaLibrary.impact({deckId:props.deckId,assetId});}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function remove(){if(!impact.value||busy.value)return;pending.value??={requestId:crypto.randomUUID(),payload:{deckId:props.deckId,assetId:impact.value.item.assetId,expectedHash:impact.value.hash,detach:impact.value.refs.length>0}};busy.value=true;error.value='';try{await mediaLibrary.remove(pending.value.payload,pending.value.requestId);pending.value=null;impact.value=undefined;confirming.value=false;notice.value='资源已安全退役。文件在提交回执后清理；失败的文件清理会保留字节并于后续操作重试。';await load();}catch(e){if((e as {definitive?:boolean}).definitive)pending.value=null;error.value=String(e);}finally{busy.value=false;}}
onMounted(()=>load());defineExpose({close:async()=>!busy.value&&!pending.value&&!confirming.value});
</script>
<template><section class="media-library" aria-label="卡片集图片资源">
 <h1>图片资源</h1><p>仅当前卡片集。已发布版本、历史及回收内容的引用受到保护。</p>
 <form @submit.prevent="load()"><input v-model="query" aria-label="搜索图片与引用" :disabled="!!pending||busy" placeholder="搜索资源 ID、格式、引用标题"/><button :disabled="!!pending||busy">搜索图片</button><button type="button" :disabled="!!pending||busy" @click="load()">刷新资源</button></form>
 <p v-if="page">{{page.total}} 张图片</p><div class="resource-grid"><article v-for="item in page?.items" :key="item.assetId" :data-resource="item.assetId"><button class="resource-thumbnail" @click="view=item.assetId"><img :src="'app-media://asset/'+item.assetId" alt="放大图片"/></button><code>{{item.assetId}}</code><p>{{item.mime}} · {{item.bytes}} 字节 · {{item.references}} 处引用</p><p>{{item.references?'被引用': '未引用'}}{{item.blocked?' · 历史/发布保护':''}}</p><button :disabled="busy||!!pending" @click="inspect(item.assetId)">引用与删除预览</button></article></div>
 <button v-if="page?.nextOffset!==null&&page?.nextOffset!==undefined" @click="load(page.nextOffset)">下一页图片</button>
 <section v-if="impact" class="resource-impact" aria-label="图片实际影响范围"><h2>引用与删除预览</h2><p>{{impact.item.assetId}}</p><p>{{impact.reason}}</p><ul><li v-for="(r,i) in impact.refs" :key="i">{{r.kind}} · {{r.label}} · {{r.placements}} 处 · {{r.mutable?'可变正文':'保护内容'}}</li></ul><p v-if="impact.truncated">引用未完整展示，禁止删除。</p>
 <button :disabled="busy||!!pending||impact.item.blocked||impact.truncated" @click="confirming=true">{{impact.refs.length?'删除引用与资源':'安全删除未引用资源'}}</button><button :disabled="busy||!!pending" @click="impact=undefined;confirming=false">关闭预览</button>
 <div v-if="confirming" role="group" aria-label="二次确认删除图片"><p>确认移除以上全部可变正文引用并退役资源？此操作不会修改任何已发布版本或历史。</p><button :disabled="busy" @click="remove">{{pending?'核对原删除请求':'确认删除图片'}}</button><button :disabled="busy||!!pending" @click="confirming=false">取消删除</button></div></section>
 <dialog :open="!!view" class="resource-lightbox" aria-label="图片放大预览"><img :src="'app-media://asset/'+view" alt="原图预览"/><button @click="view=''">关闭图片预览</button></dialog>
 <p v-if="error" role="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p>
</section></template>
<style scoped>
.media-library{padding:24px;max-width:1200px;margin:auto}.media-library form{display:flex;gap:8px;flex-wrap:wrap}.resource-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin:20px 0}.resource-grid article,.resource-impact{border:1px solid var(--border,#dde5df);padding:16px;border-radius:10px;background:var(--surface,#fff);overflow-wrap:anywhere}.resource-grid code{font-size:11px}.resource-thumbnail{display:block;width:100%;height:120px}.resource-thumbnail img{max-width:100%;max-height:100px;object-fit:contain}.resource-lightbox{position:fixed;inset:8vh 10vw;z-index:120;max-width:80vw}.resource-lightbox img{max-width:65vw;max-height:65vh}.resource-impact{margin-top:20px}.resource-impact button{margin:8px}
</style>
