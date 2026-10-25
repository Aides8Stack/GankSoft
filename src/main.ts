import {createApp,h} from 'vue';
import {unifiedWorkspace} from './services';
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
  createApp(Root,catalog.model==='unified'?{initialCatalog:catalog}:{}).mount('#app');
 }catch(e){
  const container=document.getElementById('app');if(!container)return;
  const app=createApp({render:()=>h('main',{class:'startup-error'},[h('h1','无法读取学习数据'),h('p',{role:'alert'},e instanceof Error?e.message:String(e)),h('button',{onClick:()=>{app.unmount();void start();}},'重新读取')])});app.mount(container);
 }
}
void start();
