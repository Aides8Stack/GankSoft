<script setup lang="ts">
import {ref,shallowRef} from 'vue';
import {mediaLibrary} from '../services';
import type {EditorAsset} from '../../shared/editor/document';
import type {Output} from '../../shared/protocol/registry';
const props=defineProps<{deckId:string;images:EditorAsset[];locate:(id:string)=>void;insert:(a:EditorAsset)=>void}>();
const viewed=ref(''),error=ref(''),impact=shallowRef<Output<'media.library.impact'>>();
async function inspect(id:string){try{impact.value=await mediaLibrary.impact({deckId:props.deckId,assetId:id});}catch(e){error.value=String(e);}}
</script>
<template><details class="card-image-tools" aria-label="正文图片管理"><summary>正文图片（{{images.length}}）</summary><div v-for="a in images" :key="a.id" class="card-image-row"><button class="button small" @click="viewed=a.id" type="button"><img :src="'app-media://'+a.access+'/'+a.id" alt="放大正文图片"/></button><button class="button small" type="button" @click="locate(a.id)">定位正文图片</button><button class="button small" type="button" @click="insert(a)">重新插入图片</button><button class="button small" type="button" @click="inspect(a.id)">查询实际引用</button></div><p v-if="impact">{{impact.item.references}} 处持久引用。{{impact.reason}} 正文中的删除与撤销请使用原生编辑器；保存后可在卡片集图片资源中安全清理。</p><p v-if="error" role="alert">{{error}}</p><div v-if="viewed" class="inline-image-preview"><img :src="'app-media://asset/'+viewed" alt="正文图片放大预览"/><button class="button small" type="button" @click="viewed=''">关闭正文图片预览</button></div></details></template>
<style scoped>.card-image-tools{margin:8px 12px;padding:8px;border-top:1px solid #e2e8e3}.card-image-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}.card-image-row img{width:60px;height:60px;object-fit:contain}.inline-image-preview img{max-width:100%;max-height:380px;display:block}</style>
