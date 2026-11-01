<script setup lang="ts">
// Interactive Vue 3 design preview; MOCK DATA ONLY. No persistence, SQL or ZIP writing.
// B3 production wiring: src/unified/UnifiedCatalogContextMenu.vue and UnifiedWorkspace.vue.
import {computed,ref} from 'vue';

type Item={id:string;kind:'folder'|'deck';name:string;parentId:string|null;count?:number};
type Action='open'|'new-folder'|'new-deck'|'import'|'edit'|'move'|'export'|'delete';
const items=ref<Item[]>([
 {id:'m',kind:'deck',name:'记忆积累',parentId:null,count:2},
 {id:'q',kind:'deck',name:'七二',parentId:null,count:0},
 {id:'r',kind:'deck',name:'错题复盘',parentId:null,count:0},
 {id:'f',kind:'folder',name:'1234',parentId:null},
 {id:'sub',kind:'folder',name:'模拟训练',parentId:'f'},
 {id:'sf',kind:'deck',name:'片段阅读',parentId:'sub',count:8},
]);
const expanded=ref(new Set(['f','sub']));
const current=ref('r');
const menu=ref<{item:Item|null;x:number;y:number}|null>(null);
const dialog=ref<{action:Action;item:Item|null;kind:'deck'|'folder';name:string;parentId:string|null}|null>(null);
const notice=ref('这是 Vue 交互原型，不修改 GankSoft 数据。');
const folders=computed(()=>items.value.filter(x=>x.kind==='folder'));
function descendants(folderId:string,seen=new Set<string>()):string[]{
 if(seen.has(folderId))return [];seen.add(folderId);
 return [folderId,...items.value.filter(x=>x.kind==='folder'&&x.parentId===folderId).flatMap(x=>descendants(x.id,seen))];
}
const rows=computed(()=>{
 const out:{item:Item;depth:number}[]=[];const walk=(parentId:string|null,depth:number)=>{
  for(const item of items.value.filter(x=>x.parentId===parentId)){
   out.push({item,depth});
   if(item.kind==='folder'&&expanded.value.has(item.id))walk(item.id,depth+1);
  }
 };walk(null,0);return out;
});
function openMenu(e:MouseEvent,item:Item|null=null){
 e.preventDefault();e.stopPropagation();menu.value={item,x:e.clientX,y:e.clientY};
}
function menuItems(item:Item|null):{key:Action;name:string;icon:string;danger?:boolean}[]{
 if(!item)return [
  {key:'new-deck',name:'新建卡片集',icon:'▤'},{key:'new-folder',name:'新建文件夹',icon:'▱'},
  {key:'import',name:'导入卡片集 ZIP',icon:'↥'}
 ];
 if(item.kind==='folder')return [
  {key:'open',name:'展开/收起',icon:'▱'},{key:'new-folder',name:'新建子文件夹',icon:'＋'},
  {key:'new-deck',name:'在此新建卡片集',icon:'▤'},{key:'import',name:'导入卡片集 ZIP',icon:'↥'},
  {key:'edit',name:'重命名',icon:'✎'},{key:'move',name:'移动到',icon:'↪'},
  {key:'delete',name:'删除文件夹（内容上移）',icon:'♲',danger:true}
 ];
 return [
  {key:'open',name:'打开卡片集',icon:'▤'},{key:'edit',name:'重命名',icon:'✎'},
  {key:'move',name:'移动到',icon:'↪'},{key:'export',name:'导出卡片集 ZIP',icon:'↧'},
  {key:'delete',name:'移入回收站',icon:'♲',danger:true}
 ];
}
function choose(action:Action){
 const item=menu.value?.item??null;menu.value=null;
 if(action==='open'){if(!item)return;item.kind==='folder'?toggleFolder(item.id):current.value=item.id;return;}
 if(action==='export'){notice.value='预览模式：正式导出需调用 Schema606 内容包 API，不会生成假 ZIP。';return;}
 if(action==='import'){notice.value='预览模式：请在正式应用中选择 ZIP → 预览 → 确认导入。';return;}
 if(action==='delete'){
  if(!item)return;
  const message=item.kind==='folder'?'删除文件夹后，其子文件夹及卡片集将移动到原上级；不会删除这些卡片。':'将卡片集移入回收站，允许从设置恢复。';
  if(!confirm(message))return;
  if(item.kind==='folder')for(const child of items.value.filter(x=>x.parentId===item.id))child.parentId=item.parentId;
  items.value=items.value.filter(x=>x.id!==item.id);
  if(current.value===item.id)current.value='';
  notice.value=item.kind==='folder'?'已模拟删除文件夹，子项上移':'已模拟将卡片集移入回收站';
  return;
 }
 dialog.value={action,item,kind:action==='new-folder'?'folder':action==='new-deck'?'deck':item?.kind??'deck',
  name:action.startsWith('new')?'':item?.name??'',parentId:action.startsWith('new')?(item?.kind==='folder'?item.id:null):item?.parentId??null};
}
function toggleFolder(id:string){const next=new Set(expanded.value);next.has(id)?next.delete(id):next.add(id);expanded.value=next;}
function saveDialog(){
 if(!dialog.value||!dialog.value.name.trim()){notice.value='名称不能为空';return;}
 const d=dialog.value;
 if(d.item?.kind==='folder'&&d.parentId&&descendants(d.item.id).includes(d.parentId)){notice.value='不能把文件夹移到它自己或其子文件夹';return;}
 if(items.value.some(x=>x.id!==d.item?.id&&x.name===d.name.trim()&&x.parentId===d.parentId&&x.kind===d.kind)){notice.value='同一位置已有同名目录项';return;}
 if(d.item){d.item.name=d.name.trim();d.item.parentId=d.parentId;}
 else items.value.push({id:'demo-'+Date.now(),kind:d.kind,name:d.name.trim(),parentId:d.parentId,count:d.kind==='deck'?0:undefined});
 notice.value='已模拟保存目录（不会写入真实数据库）';dialog.value=null;
}
function escape(){menu.value=null;dialog.value=null;}
</script>

<template>
 <div class="preview-layout" @keydown.esc="escape">
  <aside class="preview-rail" aria-label="GankSoft 卡片集管理预览">
   <div class="brand"><b class="logo">G</b><div><strong>GankSoft</strong><small>知识 · 记忆 · 复盘</small></div></div>
   <button class="home">⌂　学习总览</button>
   <div class="rail-head"><span>卡片集</span><button class="add" aria-label="新建目录项" title="新建卡片集 / 文件夹 / 导入" @click="openMenu($event)">＋</button></div>
   <div v-for="{item,depth} in rows" :key="item.id" class="item-row" @contextmenu="openMenu($event,item)">
    <button class="item-name" :style="{paddingLeft:(16+depth*14)+'px'}" :class="{current:current===item.id}" :title="item.name" @click="item.kind==='folder'?toggleFolder(item.id):current=item.id">
     <span class="symbol">{{item.kind==='folder'?'▱':'•'}}</span><span class="name">{{item.name}}</span>
     <small v-if="item.kind==='deck'">{{item.count}}</small><span v-else>{{expanded.has(item.id)?'⌄':'›'}}</span>
    </button>
    <button class="dots" :aria-label="'管理'+item.name" :title="'管理 '+item.name" @click="openMenu($event,item)">⋯</button>
   </div>
   <div class="rail-bottom">● 数据保存在本机<br/>⚙ 设置</div>
  </aside>
  <main class="panel">
   <h2>卡片集目录管理 · Vue 3 交互预览</h2>
   <p>左栏保持紧凑宽度。点击 <b>＋</b> 新建；悬停某行点 <b>⋯</b> 或直接右键管理；卡片集才有 ZIP 导出。</p>
   <div class="hint">{{notice}}</div>
   <div class="sample">当前卡片集：{{items.find(x=>x.id===current)?.name??'未选择'}}</div>
   <p>此预览内的新建、移动和删除仅修改临时 Vue 数组；不会写入 SQLite、生成 ZIP 或修改你现有的数据。</p>
  </main>
  <template v-if="menu">
   <div class="dismiss" @click="menu=null"></div>
   <div class="popup" role="menu" :style="{left:'min('+menu.x+'px,calc(100vw - 238px))',top:'min('+menu.y+'px,calc(100vh - 324px))'}">
    <button v-for="option in menuItems(menu.item)" :key="option.key" role="menuitem" :class="{danger:option.danger}" @click="choose(option.key)">
     <span class="menu-icon">{{option.icon}}</span>{{option.name}}
    </button>
   </div>
  </template>
  <div v-if="dialog" class="veil" @click.self="dialog=null">
   <form class="dialog" @submit.prevent="saveDialog">
    <h3>{{dialog.action==='move'?'移动':dialog.item?'编辑':'新建'}}{{dialog.kind==='folder'?'文件夹':'卡片集'}}</h3>
    <label>名称<input v-model="dialog.name" maxlength="100" autofocus/></label>
    <label>目标位置<select v-model="dialog.parentId"><option :value="null">卡片集根目录</option><option v-for="f in folders.filter(f=>f.id!==dialog?.item?.id)" :key="f.id" :value="f.id">{{f.name}}</option></select></label>
    <div class="actions"><button type="button" @click="dialog=null">取消</button><button class="primary" type="submit">保存目录</button></div>
   </form>
  </div>
 </div>
</template>

<style scoped>
.preview-layout{display:flex;min-height:610px;min-width:620px;background:#f7f9f7;color:#25392f;font:13px/1.5 "Segoe UI","Microsoft Yahei",sans-serif}
.preview-rail{width:213px;min-width:213px;min-height:610px;display:flex;flex-direction:column;background:#fff;border-right:1px solid #e3eae5;padding:0 10px;box-sizing:border-box}
.brand{height:73px;border-bottom:1px solid #e5eae7;display:flex;gap:10px;align-items:center;padding:0 12px}.brand small{display:block;color:#80958a;font-size:10px}.logo{display:grid;place-items:center;width:34px;height:34px;background:#28765c;border-radius:10px;color:white;font-size:20px}
.home{border:0;background:white;text-align:left;padding:15px 12px;font-weight:650;color:#284537}
.rail-head{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;color:#89958e;font-size:11px;font-weight:650}
.add{width:24px;height:24px;font-size:19px}.item-row{position:relative;height:36px}.item-name{border:0;background:transparent;border-radius:7px;display:flex;align-items:center;gap:8px;width:100%;height:36px;text-align:left;padding-right:27px;color:#355345;font-size:12px}.item-name.current{background:#e4f1e9;color:#136342;font-weight:700}.item-name:hover{background:#edf5f0}.symbol{color:#75a58c}.name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.item-name small{font-size:10px;color:#82958c}
.dots{position:absolute;right:5px;top:4px;border:0;width:27px;height:27px;border-radius:5px;background:transparent;opacity:0}.item-row:hover .dots,.dots:focus-visible{opacity:1;background:#e2ede6}
.rail-bottom{margin-top:auto;border-top:1px solid #e7ede8;padding:16px 12px;font-size:11px;color:#879a8e;line-height:2}
.panel{flex:1;padding:30px 36px}.panel h2{font-size:19px}.panel p{max-width:660px;color:#677d6f}.hint{background:#e4f1e9;padding:12px 14px;border-radius:9px}.sample{margin-top:24px;background:white;border:1px solid #e3eae5;padding:18px;border-radius:10px}
.dismiss{position:fixed;inset:0;z-index:100}.popup{position:fixed;z-index:101;background:#fff;min-width:216px;padding:5px;box-shadow:0 12px 34px #1d3b292b;border:1px solid #dce8df;border-radius:9px}
.popup button{width:100%;display:flex;align-items:center;gap:10px;border:0;border-radius:6px;background:#fff;text-align:left;padding:8px;font-size:12px}.popup button:hover{background:#edf5f0}.popup .danger{color:#ba514b}.menu-icon{width:19px;text-align:center}
.veil{position:fixed;inset:0;background:#182a2380;display:grid;place-items:center;z-index:120}.dialog{width:min(440px,90vw);background:white;border-radius:13px;padding:22px;box-shadow:0 18px 55px #243a2b2b}
.dialog h3{margin-top:0}.dialog label{display:block;margin-top:16px}.dialog input,.dialog select{width:100%;box-sizing:border-box;margin-top:5px;padding:9px;border:1px solid #d4dfd7;border-radius:7px;background:#fff}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.actions button{padding:8px 15px;border:1px solid #d4dfd7;border-radius:7px;background:#fff}.actions .primary{background:#28765c;color:#fff;border-color:#28765c}
button{cursor:pointer;color:inherit;font-family:inherit}
</style>
