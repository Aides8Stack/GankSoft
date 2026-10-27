import { createApp,defineComponent,h,shallowRef } from 'vue';
import MindMapWorkspace from '../components/MindMapWorkspace.vue';
import { error } from '../store';
import '../style.css';
import '../workspace.css';
import '../workspace-v071.css';
const deckId=new URLSearchParams(location.search).get('deckId')!;
const Shell=defineComponent({setup(){const workspace=shallowRef();Object.assign(window,{knowledgeSpike:{get workspace(){return workspace.value;}}});return()=>h('main',[error.value?h('p',{role:'alert'},error.value):null,h(MindMapWorkspace,{ref:workspace,unifiedDeckId:deckId,expanded:true})]);}});
createApp(Shell).mount('#app');
