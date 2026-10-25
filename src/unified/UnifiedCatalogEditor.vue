<script setup lang="ts">
import {computed,onMounted,ref,shallowRef} from 'vue';
import {unifiedWorkspace} from '../services';
import type {Input,Output} from '../../shared/protocol/registry';
const props=defineProps<{kind:'folder'|'deck';parentId:string|null;item?:Output<'workspace.catalog'>['items'][number]}>(),emit=defineEmits<{saved:[];cancel:[]}>();
const name=ref(props.item?.name??''),folder=ref<string|null>(props.parentId),catalog=shallowRef<Output<'workspace.catalog'>>(),items=ref<Output<'workspace.catalog'>['items']>([]),busy=ref(false),unknown=ref(false),error=ref('');
const dirty=computed(()=>name.value!==(props.item?.name??'')||folder.value!==props.parentId);
let pending:{payload:Input<'workspace.catalog.save'>;id:string}|null=null;
async function browse(id:string|null,more=false){busy.value=true;error.value='';try{const r=await unifiedWorkspace.catalog({folderId:id,cursor:more?catalog.value?.nextCursor:null});catalog.value=r;items.value=more?[...items.value,...r.items]:r.items;folder.value=id;}catch(e){error.value=String(e);}finally{busy.value=false;}}
async function execute(){if(!pending||busy.value)return;busy.value=true;error.value='';try{await unifiedWorkspace.saveCatalog(pending.payload,pending.id);pending=null;unknown.value=false;emit('saved');}catch(e){unknown.value=!(e as {definitive?:boolean}).definitive;if(!unknown.value)pending=null;error.value=String(e);}finally{busy.value=false;}}
async function save(){pending={id:crypto.randomUUID(),payload:{kind:props.kind,name:name.value,parentId:folder.value,...(props.item?{id:props.item.id,expectedRevision:props.item.revision}:{})}};await execute();}
function close(){return !busy.value&&!unknown.value&&!pending&&(!dirty.value||confirm('放弃尚未保存的目录修改？'));}
function cancel(){if(close())emit('cancel');}
onMounted(()=>browse(props.parentId));defineExpose({close});
</script>
<template><div class="catalog-backdrop"><section role="dialog" aria-modal="true" aria-label="编辑目录项"><h2>{{item?'编辑':'新建'}}{{kind==='deck'?'卡片集':'文件夹'}}</h2><form @submit.prevent="save"><fieldset :disabled="busy||unknown"><label>名称<input aria-label="目录项名称" v-model="name" maxlength="100" required autofocus/></label><p>位置：{{catalog?.breadcrumbs.map(b=>b.name).join(' › ')||'全部卡片集'}}</p><nav aria-label="目标文件夹路径"><button type="button" @click="browse(null)">全部卡片集</button><button type="button" v-for="b in catalog?.breadcrumbs" :key="b.id" @click="browse(b.id)">{{b.name}}</button></nav><div aria-label="目标文件夹"><button type="button" v-for="f in items.filter(i=>i.kind==='folder')" :key="f.id" :disabled="f.id===item?.id" @click="browse(f.id)">{{f.name}}</button><button type="button" v-if="catalog?.nextCursor" @click="browse(folder,true)">更多位置</button></div><button type="submit">保存目录</button><button type="button" @click="cancel">取消</button></fieldset></form><p v-if="error" role="alert">{{error}}</p><button v-if="unknown" :disabled="busy" @click="execute">核对原目录请求</button></section></div></template>
<style scoped>.catalog-backdrop{position:fixed;inset:0;z-index:70;display:grid;place-items:center;background:#172b4b66;padding:20px}section{width:min(600px,100%);max-height:90dvh;overflow:auto;padding:24px;border-radius:12px;background:var(--panel,#fff)}fieldset{border:0;padding:0}button{margin:6px}input{display:block;width:100%;box-sizing:border-box}</style>
