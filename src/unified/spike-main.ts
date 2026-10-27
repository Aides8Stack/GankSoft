import {createApp,defineComponent,h,shallowRef} from 'vue';
import UnifiedWorkspace from './UnifiedWorkspace.vue';
import '../style.css';
import '../workspace.css';
import '../workspace-v071.css';
const Shell=defineComponent({setup(){const workspace=shallowRef();Object.assign(window,{unifiedWorkspaceSpike:{get workspace(){return workspace.value;}}});return()=>h(UnifiedWorkspace,{ref:workspace});}});
createApp(Shell).mount('#app');
