<script setup lang="ts">
import {computed,nextTick,onMounted,onUnmounted,ref,shallowRef} from 'vue';
import {unifiedWorkspace} from '../services';
import {CatalogSave} from '../../shared/protocol/workspace-unified';
import type {Input,Output} from '../../shared/protocol/registry';
import type {CatalogItem} from './catalog-management';
const props=withDefaults(defineProps<{kind:'folder'|'deck';parentId:string|null;item?:CatalogItem;action?:'edit'|'move'|'delete'}>(),{action:'edit'});
const emit=defineEmits<{saved:[change:{kind:'folder'|'deck';id:string;name:string;parentId:string|null;action:'save'|'delete'}];cancel:[]}>();
const name=ref(props.item?.name??''),folder=ref(props.parentId),catalog=shallowRef<Output<'workspace.catalog'>>(),items=ref<CatalogItem[]>([]),busy=ref(false),unknown=ref(false),error=ref(''),dialog=ref<HTMLElement>();
const title=computed(()=>(props.action==='delete'?'删除':props.action==='move'?'移动':props.item?'重命名':'新建')+(props.kind==='deck'?'卡片集':'文件夹'));
const dirty=computed(()=>name.value!==(props.item?.name??'')||folder.value!==props.parentId);
const origin=document.activeElement as HTMLElement|null;
let pending:({kind:'save';payload:Input<'workspace.catalog.save'>}|{kind:'folder-delete';payload:Input<'catalog.folder.action'>}|{kind:'deck-delete';payload:Input<'workspace.decks.batch'>})&{id:string}|null=null;
async function browse(id:string|null,more=false){
 if(busy.value||pending)return;busy.value=true;error.value='';
 try{const r=await unifiedWorkspace.catalog({folderId:id,cursor:more?catalog.value?.nextCursor:null});catalog.value=r;items.value=more?[...items.value,...r.items]:r.items;folder.value=id;}catch(e){error.value=String(e);}finally{busy.value=false;}
}
const blockedFolder=computed(()=>props.kind==='folder'&&!!props.item&&(folder.value===props.item.id||catalog.value?.breadcrumbs.some(b=>b.id===props.item!.id)));
async function execute(){
 if(!pending||busy.value)return;busy.value=true;error.value='';
 try{
  const p=pending;let id=props.item?.id??'';
  if(p.kind==='save')id=(await unifiedWorkspace.saveCatalog(p.payload,p.id)).id;
  else if(p.kind==='folder-delete')await unifiedWorkspace.folderAction(p.payload,p.id);
  else await unifiedWorkspace.batchDecks(p.payload,p.id);
  const change={kind:props.kind,id,name:name.value.trim(),parentId:folder.value,action:p.kind==='save'?'save' as const:'delete' as const};
  pending=null;unknown.value=false;emit('saved',change);
 }catch(e){unknown.value=!(e as {definitive?:boolean}).definitive;if(!unknown.value)pending=null;error.value=String(e);}
 finally{busy.value=false;}
}
async function save(){
 if(busy.value||pending||unknown.value)return;
 if(props.action==='delete'&&props.item){pending=props.kind==='folder'?{kind:'folder-delete',id:crypto.randomUUID(),payload:{id:props.item.id,expectedRevision:props.item.revision,action:'delete',cascade:false}}:{kind:'deck-delete',id:crypto.randomUUID(),payload:{action:'delete',decks:[{id:props.item.id,expectedRevision:props.item.revision}]}};await execute();return;}
 const checked=CatalogSave.safeParse({kind:props.kind,name:name.value,parentId:folder.value,...(props.item?{id:props.item.id,expectedRevision:props.item.revision}:{})});
 if(!checked.success){error.value='名称不能为空、不能全部为空格，且最多100个字符。';return;}
 if(blockedFolder.value){error.value='不能把文件夹移动到自身或子文件夹。';return;}
 pending={kind:'save',id:crypto.randomUUID(),payload:checked.data};await execute();
}
function close(){return !busy.value&&!unknown.value&&!pending&&(!dirty.value||confirm('放弃尚未保存的目录修改？'));}
function cancel(){if(close())emit('cancel');}
function keys(e:KeyboardEvent){
 if(e.key==='Escape'){e.preventDefault();cancel();}
 if(e.key==='Tab'){const nodes=Array.from(dialog.value!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)'));const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
}
onMounted(async()=>{if(props.action!=='delete')await browse(props.parentId);await nextTick();dialog.value?.querySelector<HTMLElement>('input:not(:disabled),button:not(:disabled)')?.focus();});
onUnmounted(()=>{if(origin?.isConnected)origin.focus();});defineExpose({close});
</script>
<template><Teleport to="body"><div class="catalog-backdrop" @click.self="cancel"><section ref="dialog" role="dialog" aria-modal="true" :aria-label="title" @keydown="keys"><h2>{{title}}</h2>
 <form @submit.prevent="save"><fieldset :disabled="busy||unknown">
  <template v-if="action==='delete'"><p>确认处理「{{item?.name}}」？</p><p v-if="kind==='folder'">仅删除文件夹本身。全部直接子文件夹和卡片集将移至原上级，内部卡片、草稿、图片和复盘记录不会删除；上级重名时会拒绝操作。</p><p v-else>卡片集及其中 {{item?.cardCount}} 张卡片、{{item?.knowledgeCount}} 个知识点将移入回收站。草稿、图片、学习历史保留，可在设置中的回收站恢复。</p></template>
  <template v-else><label>名称<input aria-label="目录项名称" v-model="name" maxlength="100" :readonly="action==='move'"/></label><p>位置：{{catalog?.breadcrumbs.map(b=>b.name).join(' › ')||'全部卡片集'}}</p><nav aria-label="目标文件夹路径"><button type="button" @click="browse(null)">全部卡片集</button><button type="button" v-for="b in catalog?.breadcrumbs" :key="b.id" @click="browse(b.id)">{{b.name}}</button></nav><div aria-label="目标文件夹"><button type="button" v-for="f in items.filter(i=>i.kind==='folder')" :key="f.id" :disabled="f.id===item?.id" @click="browse(f.id)">{{f.name}}</button><button type="button" v-if="catalog?.nextCursor" @click="browse(folder,true)">更多位置</button></div><p v-if="blockedFolder" role="alert">不能把文件夹移动到自身或子文件夹。</p></template>
  <div class="actions"><button type="button" @click="cancel">取消</button><button type="submit" :disabled="blockedFolder&&action!=='delete'" :class="{danger:action==='delete'}">{{action==='delete'?'确认删除':action==='move'?'确认移动':'保存目录'}}</button></div>
 </fieldset></form><p v-if="busy" role="status">正在处理目录…</p><p v-if="error" role="alert">{{error}}<span v-if="!unknown"> 可保留输入调整后重试；修订冲突请取消并重新打开最新目录项。</span></p><button v-if="unknown" :disabled="busy" @click="execute">核对原目录请求</button></section></div></Teleport></template>
<style scoped>.catalog-backdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:#172b4b66;padding:20px}section{width:min(560px,100%);box-sizing:border-box;max-height:90dvh;overflow:auto;padding:24px;border-radius:12px;background:var(--panel,#fff);color:var(--text,#25392f)}fieldset{border:0;padding:0}button{margin:6px;padding:8px 12px}input{display:block;width:100%;box-sizing:border-box;padding:10px;margin:6px 0}p{line-height:1.7}.actions{display:flex;justify-content:flex-end;margin-top:16px}.danger{color:#ba514b}</style>
