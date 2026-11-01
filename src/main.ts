import {createApp,h,Fragment} from 'vue';
import KnowledgePicker from './components/KnowledgePicker.vue';
import {createKnowledgePicker,knowledgePickerKey} from './composables/knowledgePicker';
import {unifiedWorkspace,unifiedKnowledge,services} from './services';
import './style.css';
import './workspace.css';
import './workspace-v071.css';
import './theme.css';
import './study-workbench.css';
// Read the actual active model. This never migrates or enables a database.
async function start(){
 try{
  const catalog=await unifiedWorkspace.catalog({});
  const {default:Root}=catalog.model==='unified'?await import('./unified/UnifiedWorkspace.vue'):await import('./App.vue');
  const picker=createKnowledgePicker(async deckId=>catalog.model==='unified'
    ?(await unifiedKnowledge.tree({deckId})).nodes
    :(await services.workspace.read(['knowledge'],deckId)).knowledge.filter(n=>!n.deleted_at).map((n,position)=>({nodeId:n.id,parentId:n.parent_id,name:n.name,aliases:n.aliases,position})));
  const app=createApp({render:()=>h(Fragment,[h(Root,catalog.model==='unified'?{initialCatalog:catalog}:{}),h(KnowledgePicker)])});
  app.provide(knowledgePickerKey,picker);app.mount('#app');
 }catch(e){
  const container=document.getElementById('app');if(!container)return;
  const app=createApp({render:()=>h('main',{class:'startup-error'},[h('h1','无法读取学习数据'),h('p',{role:'alert'},e instanceof Error?e.message:String(e)),h('button',{onClick:()=>{app.unmount();void start();}},'重新读取')])});app.mount(container);
 }
}
void start();
