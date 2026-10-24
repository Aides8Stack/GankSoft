import { createApp,defineComponent,h,shallowRef,Suspense } from 'vue';
import { unifiedLearning } from '../services';
import UnifiedReviewForm from './UnifiedReviewForm.vue';
const q=new URLSearchParams(location.search),scope={sessionId:q.get('sessionId')!,deckId:q.get('deckId')!};
const Shell=defineComponent({async setup(){
  const initial=await unifiedLearning.get(scope),form=shallowRef();
  Object.assign(window,{unifiedReviewSpike:{scope,get form(){return form.value;}}});
  return ()=>h(UnifiedReviewForm,{ref:form,initial,api:unifiedLearning});
}});
createApp({render:()=>h(Suspense,null,{default:()=>h(Shell),fallback:()=>h('p','正在恢复复盘…')})}).mount('#app');
