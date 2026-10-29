<script setup lang="ts">
import { computed,nextTick,onBeforeUnmount,onMounted,ref,shallowRef,watch } from 'vue';
import type { Input,Output } from '../../shared/protocol/registry';
import { ReviewAnswerDraft } from '../../shared/protocol/review-details';
import { ReviewSessionView } from '../../shared/protocol/unified-review';
import type { unifiedLearning } from '../services';
import MarkdownContent from '../editor/MarkdownContent.vue';

const props=defineProps<{initial:Output<'learning.session.get'>;api:typeof unifiedLearning}>();
const session=shallowRef(ReviewSessionView.parse(props.initial)),draft=ref(ReviewAnswerDraft.parse(props.initial.draft));
const busy=ref(false),error=ref(''),message=ref(''),dirty=ref(false),composing=ref(false),now=ref(Date.now());
const reviewRoot=ref<HTMLElement>(),errorFeedback=ref<HTMLElement>();
watch(()=>session.value.stage,async(stage,previous)=>{if(stage!=='reveal'||previous!=='answer')return;await nextTick();reviewRoot.value?.querySelector<HTMLElement>('.review-answer,.review-assessment')?.scrollIntoView({block:'start'});});
watch(error,async value=>{if(!value)return;await nextTick();errorFeedback.value?.scrollIntoView({block:'nearest'});errorFeedback.value?.focus({preventScroll:true});});
const committed=shallowRef<Output<'learning.review.submit'>|null>(null);
type Pending={method:'change';input:Input<'learning.session.change'>;requestId:string}|{method:'submit';input:Input<'learning.review.submit'>;requestId:string};
const pending=shallowRef<Pending|null>(null);
const locked=computed(()=>busy.value||!!pending.value||!!committed.value||session.value.stage==='result'||session.value.completed);
const scope={sessionId:props.initial.sessionId,deckId:props.initial.deckId};
let timer:ReturnType<typeof setTimeout>|undefined,interval:ReturnType<typeof setInterval>,receivedAt=Date.now(),applying=false,disposed=false,closing=false,wantsPause=false;
let running:Promise<boolean>|undefined;
const payload=computed(()=>session.value.content.payload);
const correctOptionText=computed(()=>{const p=payload.value;return p?.encoding==='question-v1'?p.fields.options.find(o=>o.optionId===p.fields.correctOptionId)?.markdown??'':'';});
const seconds=computed(()=>session.value.totalSeconds+(session.value.paused||session.value.stage==='result'?0:Math.max(0,Math.floor((now.value-receivedAt)/1000))));
const faults=computed({get:()=>draft.value.faults.join('\n'),set:(v:string)=>draft.value.faults=v.split('\n').map(s=>s.trim()).filter(Boolean)});
function receive(value:Output<'learning.session.get'>) {
  applying=true;session.value=value;draft.value=ReviewAnswerDraft.parse(value.draft);dirty.value=false;receivedAt=Date.now();
  // Watch runs synchronously so replacing a saved snapshot cannot resave itself.
  applying=false;
}
function failure(e:unknown) {
  const known=e as {message?:string;outcome?:string};error.value=known.message??String(e);
  if(known.outcome==='rejected')pending.value=null;
}
async function change(action:Input<'learning.session.change'>['action']='save') {
  if(running)return running;
  clearTimeout(timer);
  if(pending.value?.method==='submit'||committed.value)return false;
  running=(async()=>{
    if(!pending.value)pending.value={method:'change',input:{...scope,expectedRevision:session.value.revision,action,
      ...(session.value.stage!=='result'?{draft:ReviewAnswerDraft.parse(draft.value)}:{})},requestId:crypto.randomUUID()};
    const request=pending.value;if(request.method!=='change')return false;
    busy.value=true;error.value='';
    try {const value=await props.api.change(request.input,request.requestId);pending.value=null;receive(value);return true;}
    catch(e){failure(e);return false;}
    finally {busy.value=false;}
  })();
  try{return await running;}finally{running=undefined;if(wantsPause&&!pending.value&&!session.value.paused&&session.value.stage!=='result'){wantsPause=false;void change('pause');}}
}
async function refreshResult() {
  busy.value=true;error.value='';
  try{receive(await props.api.get(scope));committed.value=null;message.value='复盘已保存';}
  catch(e){error.value='复盘已保存，但页面刷新失败。请重新读取结果，无需重新作答。';}
  finally{busy.value=false;}
}
async function submit() {
  if(busy.value||composing.value||committed.value)return;
  if(!pending.value) {
    if(session.value.stage!=='reveal'||draft.value.scoreTenths===null)return;
    if(!await change('save')||pending.value||busy.value||session.value.paused)return;
    pending.value={method:'submit',requestId:crypto.randomUUID(),input:{...scope,expectedRevision:session.value.revision,eventId:session.value.entry.eventId,
      scoreTenths:draft.value.scoreTenths!,faults:[...draft.value.faults],gaps:draft.value.gaps,reflection:draft.value.reflection,practice:draft.value.practice}};
  }
  const request=pending.value;if(request.method!=='submit')return;
  busy.value=true;error.value='';message.value='';
  try{committed.value=await props.api.submit(request.input,request.requestId);pending.value=null;message.value='复盘已保存';}
  catch(e){failure(e);}
  finally{busy.value=false;}
  if(committed.value)await refreshResult();
}
function retry(){return pending.value?.method==='submit'?submit():change();}
function pause(){if(busy.value){wantsPause=true;return;}if(!session.value.paused&&session.value.stage!=='result')void change('pause');}
async function close(){clearTimeout(timer);if(running)await running;if(pending.value||committed.value||composing.value)return false;return session.value.completed||session.value.stage==='result'||session.value.paused&&!dirty.value||await change('pause');}
function beforeUnload(e:BeforeUnloadEvent){if(closing||session.value.completed)return;e.preventDefault();e.returnValue='';void close().then(ok=>{if(ok){closing=true;window.close();}});}
function keys(e:KeyboardEvent){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(!composing.value&&!locked.value)void change();}}
watch(draft,()=>{if(applying||disposed)return;dirty.value=true;clearTimeout(timer);if(!locked.value&&!composing.value)timer=setTimeout(()=>void change(),500);},{deep:true,flush:'sync'});
onMounted(()=>{interval=setInterval(()=>now.value=Date.now(),500);window.addEventListener('keydown',keys);window.addEventListener('blur',pause);window.addEventListener('beforeunload',beforeUnload);});
onBeforeUnmount(()=>{disposed=true;clearTimeout(timer);clearInterval(interval);window.removeEventListener('keydown',keys);window.removeEventListener('blur',pause);window.removeEventListener('beforeunload',beforeUnload);});
defineExpose({close,session,pending,draft,submit});
</script>
<template>
  <main ref="reviewRoot" class="unified-review review-container r4-review" @compositionstart="composing=true" @compositionend="composing=false;if(dirty&&!locked)void change()">
    <header class="review-top"><div class="review-progress-label">本轮进度 <strong>{{session.index+1}} / {{session.total}}</strong><span>剩余 {{Math.max(0,session.total-session.index-1)}} 张</span></div><div class="review-clock">总计时 {{Math.floor(seconds/60).toString().padStart(2,'0')}}:{{(seconds%60).toString().padStart(2,'0')}}
      <button class="button small" v-if="!session.completed&&session.stage!=='result'" :disabled="locked" @click="change(session.paused?'resume':'pause')">{{session.paused?'继续计时':'暂停计时'}}</button>
    </div></header><div class="review-bar" role="progressbar" aria-label="本轮复盘进度" :aria-valuenow="session.index+(session.stage==='result'?1:0)" :aria-valuemax="session.total" aria-valuemin="0"><span :style="{width:((session.index+(session.stage==='result'?1:0))/session.total*100)+'%'}"/></div>
    <p v-if="error" ref="errorFeedback" class="review-error" role="alert" tabindex="-1">{{error}}</p>
    <div class="review-card"><div class="section-heading"><span class="pill">{{{question:'单选错题',qa:'问答记忆',direct:'直接记忆'}[session.content.mode]}}</span><output data-testid="review-save-state" class="tiny-meta">{{pending?'待核对保存结果':busy?'正在保存':dirty?'草稿未保存':'草稿已保存'}}</output></div><h1 class="review-title">{{session.content.title}}</h1>
    <section v-if="payload?.encoding==='question-v1'" aria-label="单选错题">
      <MarkdownContent :key="session.entry.versionId+':stem'" :markdown="[payload.fields.material,payload.fields.stem].filter(Boolean).join('\n\n')" :media-refs="session.content.mediaRefs"/>
      <fieldset class="review-options" :disabled="locked||session.stage!=='answer'"><legend>请选择一个选项</legend>
        <label v-for="(option,index) in [...payload.fields.options].sort((a,b)=>a.position-b.position)" :key="option.optionId" class="review-option" :class="{'correct-option':session.stage!=='answer'&&option.optionId===payload.fields.correctOptionId,'wrong-option':session.stage!=='answer'&&draft.selectedOptionId===option.optionId&&option.optionId!==payload.fields.correctOptionId}">
          <input type="radio" name="option" :value="option.optionId" v-model="draft.selectedOptionId" :aria-label="option.markdown"/>
          <span class="option-letter letter">{{String.fromCharCode(65+index)}}</span><MarkdownContent :markdown="option.markdown" :media-refs="session.content.mediaRefs"/>
        </label><details class="review-thought" :open="session.stage==='answer'"><summary>本次独立思路 <span>揭示前必填</span></summary><label>独立思路<textarea v-model="draft.thought" class="review-note" placeholder="先记录自己的判断依据，再查看答案"/></label></details>
      </fieldset>
      <section v-if="session.stage!=='answer'" class="review-answer" aria-label="答案解析"><p class="objective-result">{{draft.selectedOptionId===payload.fields.correctOptionId?'本次客观结果：答对':'本次客观结果：答错'}}</p><strong>正确答案：{{correctOptionText}}</strong>
        <MarkdownContent :markdown="payload.fields.analysis" :media-refs="session.content.mediaRefs"/></section>
    </section>
    <section v-else-if="payload?.encoding==='qa-v1'" aria-label="问答记忆">
      <MarkdownContent :markdown="payload.fields.front" :media-refs="session.content.mediaRefs"/>
      <div v-if="session.stage!=='answer'" class="review-answer" aria-label="记忆答案"><MarkdownContent :markdown="payload.fields.back+'\n\n'+payload.fields.supplement" :media-refs="session.content.mediaRefs"/></div>
    </section>
    <section class="reading-content" v-else-if="payload?.encoding==='direct-v1'" aria-label="直接记忆"><MarkdownContent :markdown="payload.fields.body" :media-refs="session.content.mediaRefs"/></section>
    <div class="review-bottom" v-if="session.stage==='answer'"><span class="tiny-meta">{{session.content.mode==='question'?'选择答案并填写本次独立思路':'回忆或阅读完成后记录掌握程度'}}</span><button class="primary" :disabled="locked||composing" @click="change('reveal')">揭示答案</button></div>
    <fieldset class="review-assessment" v-else-if="session.stage==='reveal'" :disabled="locked"><legend>本次自评</legend>
      <label class="score-label"><span class="score-row">本次自评分 <output>{{draft.scoreTenths===null?'尚未自评':(draft.scoreTenths/10).toFixed(1)}} <small>/ 10</small></output></span>
        <input type="range" min="0" max="100" step="1" v-model.number="draft.scoreTenths" :aria-valuetext="draft.scoreTenths===null?'尚未自评':(draft.scoreTenths/10).toFixed(1)+' 分'"/>
      </label><div class="score-guide"><span>完全不会</span><span>比较熟悉</span><span>非常熟练</span></div><p class="score-contract">0.0–10.0 分，每格 0.1。自评与客观正误分别保存。</p>
      <details class="r4-review-extra"><summary>错误原因与知识漏洞（可选）</summary><label>错因（每行一项）<textarea v-model="faults"/></label><label>知识漏洞<textarea v-model="draft.gaps"/></label></details><label>反思（可选）<textarea v-model="draft.reflection"/></label>
      <details class="r4-review-extra review-schedule-options" :open="draft.practice"><summary>排期选项 <span>{{draft.practice?'本次仅练习':'本次更新排期'}}</span></summary><label><input type="checkbox" v-model="draft.practice" :disabled="session.practiceMode"/>仅练习，不更新排期</label></details>
      <div class="review-bottom"><span class="tiny-meta">本次记录独立进入学习历史</span><button class="primary" :disabled="draft.scoreTenths===null||composing" @click="submit">保存本次复盘</button></div>
    </fieldset>
    <section v-if="session.result" role="status"><p>复盘已保存 · 自评 {{((session.result.scoreTenths??0)/10).toFixed(1)}} · {{session.result.objectiveCorrect===null?'记忆自评':session.result.objectiveCorrect?'客观答对':'客观答错'}} · {{session.result.rating}}</p>
      <p v-if="session.result.native?.schedule.outcome!=='updated'">{{session.result.native?.schedule.outcome==='practice'?'练习记录不更新排期':'本次旧版本记录已归档，现行排期保持不变。'}}</p>
      <button v-if="!session.completed" :disabled="busy||!!pending" @click="change('next')">{{session.index+1===session.total?'完成复盘':'下一张'}}</button><p v-else>本次复盘已完成</p>
    </section>
    </div><p v-if="message" role="status">{{message}}</p>
    <button v-if="pending||error&&!committed" :disabled="busy" @click="retry">{{pending?.method==='submit'?'重试核对提交':'重试保存草稿'}}</button>
    <button v-if="committed" :disabled="busy" @click="refreshResult">重新读取已保存结果</button>
  </main>
</template>
<style scoped>
.unified-review{max-width:960px;margin:24px auto;padding:0 24px;font-family:system-ui}
header{display:flex;flex-wrap:wrap;align-items:center;gap:12px}header h1{flex-basis:100%;margin-bottom:0}
fieldset{border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin:16px 0}
label{display:block;margin:10px 0}textarea{display:block;width:100%;min-height:64px;font:inherit;box-sizing:border-box}
.review-option{display:flex;align-items:center;gap:8px;border-bottom:1px solid #e2e8f0}
.review-option>input[type=radio]{flex:0 0 auto;width:auto;margin:0}
.review-option>.gank-content{flex:1;min-width:0}
input[type=checkbox]{display:inline-block;width:auto;margin:0 8px 0 0;vertical-align:middle}
button{padding:8px 14px;margin:4px;font:inherit}input[type=range]{display:block;width:100%}[role=alert]{color:#b91c1c}
</style>
