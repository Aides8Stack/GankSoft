<script setup lang="ts">
import {onMounted,ref,shallowRef} from 'vue';
import {unifiedWorkspace} from '../services';
import type {Output} from '../../shared/protocol/registry';
import UiIcon from '../components/UiIcon.vue';
type Deck={id:string;name:string;cardCount:number|null};
const emit=defineEmits<{create:[];folder:[];import:[];open:[deck:Deck];study:[deck:Deck];resume:[deck:Deck,sessionId:string];view:[deck:Deck,cardId:string,eventId:string]}>();
const summary=shallowRef<Output<'workspace.dashboard'>>(),error=ref(''),loading=ref(false);
const decks=shallowRef<(Deck&{path:string;dueCount:number})[]>([]);
let request=0;
async function load(){
 const current=++request;loading.value=true;error.value='';summary.value=undefined;decks.value=[];
 try{
  const dashboard=await unifiedWorkspace.dashboard({});
  const items:(Deck&{path:string;dueCount:number})[]=[];
  async function visit(folderId:string|null,path:string[]){
   let cursor:string|null=null;
   do{const page=await unifiedWorkspace.catalog({folderId,cursor});
    for(const item of page.items){
     if(item.kind==='folder')await visit(item.id,[...path,item.name]);
     else{const scoped=await unifiedWorkspace.dashboard({deckId:item.id});items.push({...item,path:path.join(' / ')||'全部卡片集',dueCount:scoped.dueCount});}
    }cursor=page.nextCursor;
   }while(cursor);
  }
  await visit(null,[]);
  if(current===request){summary.value=dashboard;decks.value=items;}
 }catch(e){if(current===request)error.value=String(e);}finally{if(current===request)loading.value=false;}
}
function continueLearning(){const s=summary.value?.sessions[0];if(s)emit('resume',{id:s.deckId,name:s.deckName,cardCount:null},s.sessionId);else{const d=decks.value.find(d=>d.dueCount>0);if(d)emit('study',d);}}
onMounted(load);defineExpose({load});
</script>
<template><section class="r2-overview" aria-label="学习总览页面">
 <div class="page-heading"><div><h1>学习总览</h1><p>以卡片集为单位管理知识与复盘。选择一个卡片集开始学习。</p></div><div class="heading-actions"><button class="button" aria-label="新建卡片集" @click="emit('create')"><UiIcon name="add"/>新建卡片集</button></div></div>
 <p v-if="error" role="alert">{{error}} <button class="button" @click="load">重新读取总览</button></p>
 <div class="summary-strip" aria-label="学习摘要" :aria-busy="loading"><article v-for="m in [{label:'卡片集总数',value:summary?.deckCount,tip:'按主题独立管理'},{label:'卡片总数',value:summary?.cardCount,tip:'错题、问答与直接记忆'},{label:'今日待复盘',value:summary?.dueCount,tip:'含未学习，不含暂停卡片'},{label:'今日已完成',value:summary?.todayCount,tip:'按学习时区统计复盘记录'}]" :key="m.label" class="metric" :class="{emphasis:m.label==='今日待复盘'}"><div class="label">{{m.label}}</div><div class="number tabular">{{m.value??'—'}}</div><div class="tip">{{m.tip}}</div></article></div>
 <div class="split-layout"><section class="surface padded"><div class="section-heading"><h2>我的卡片集</h2><span class="tiny-meta">按知识领域归类 · 不限制卡片类型</span></div>
 <div class="deck-list" :aria-busy="loading"><button v-for="d in decks" :key="d.id" class="deck-row" @click="emit('open',d)"><span class="deck-icon blue"><UiIcon name="folder"/></span><span class="deck-row-main"><strong>{{d.name}}</strong><small>{{d.path}}</small></span><span class="deck-row-meta"><span>{{d.cardCount}} 张</span><strong>{{d.dueCount}} 待学</strong></span><UiIcon name="chevron" class="icon-right"/></button>
 <div v-if="summary&&!decks.length" class="empty-state"><strong>还没有卡片集</strong>创建第一个卡片集，或导入已有内容。</div></div>
 <details class="catalog-management"><summary>文件夹与目录管理</summary><div class="heading-actions"><button class="button small" @click="emit('folder')">新建文件夹</button><button class="button small" @click="emit('import')">导入卡片内容</button></div><slot/></details></section>
 <div><section class="soft-callout" aria-label="继续今天的复盘"><div class="eyebrow">CONTINUE LEARNING</div><h3>继续今天的复盘</h3><p>{{summary?.sessions.length?'从上次停下的地方继续，不需要重新选择卡片。':summary?.dueCount?'选择待学卡片集，开始今天的学习。':'暂无待复盘卡片，可以新建卡片继续积累。'}}</p><button class="button primary" :disabled="!summary||(!summary.sessions.length&&!summary.dueCount)" @click="continueLearning"><UiIcon name="play"/>继续学习</button><details v-if="summary&&summary.sessions.length>1" class="other-sessions"><summary>其他未完成复盘</summary><button v-for="s in summary.sessions.slice(1)" :key="s.sessionId" class="button small" @click="emit('resume',{id:s.deckId,name:s.deckName,cardCount:null},s.sessionId)">{{s.deckName}} · {{Math.min(s.index+1,s.total)}} / {{s.total}}</button></details></section>
 <section class="surface padded margin-top" aria-label="最近学习"><div class="section-heading"><h2>最近学习</h2><span class="tiny-meta">按时间排序</span></div><div v-for="r in summary?.recent.slice(0,3)" :key="r.eventId" class="mini-row"><span class="deck-icon blue compact-icon"><UiIcon name="cards"/></span><div class="mini-row-main no-overflow"><strong class="truncate">{{r.title||'未命名卡片'}}</strong><small>{{r.deckName}} · {{{question:'单选错题',qa:'问答记忆',direct:'直接记忆'}[r.mode]}}</small></div><button class="icon-button" :aria-label="'查看学习记录 '+r.title" @click="emit('view',{id:r.deckId,name:r.deckName,cardCount:null},r.cardId,r.eventId)"><UiIcon name="chevron"/></button></div><div v-if="summary&&!summary.recent.length" class="empty-state"><strong>还没有学习记录</strong>完成复盘后可在这里回看。</div></section></div></div>
</section></template>
