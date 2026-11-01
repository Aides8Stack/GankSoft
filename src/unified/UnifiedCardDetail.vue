<script setup lang="ts">
import {historyEvidence} from '../../shared/cards/history-evidence';
import {computed,onMounted,onBeforeUnmount,ref,shallowRef} from 'vue';
import {dataSync,unifiedCards,unifiedLearning,unifiedKnowledge} from '../services';
import type {Output} from '../../shared/protocol/registry';
import {useDataRefresh} from '../composables/dataRefresh';
import UiIcon from './v37/PrototypeIcon.vue';
import MarkdownContent from '../editor/MarkdownContent.vue';
import ReviewLineChart from '../components/ReviewLineChart.vue';
const props=defineProps<{deckId:string;cardId:string;initialEventId?:string;deckName?:string;backLabel?:string}>();
const emit=defineEmits<{edit:[];study:[];schedule:[];back:[];knowledge:[]}>();
const scope={deckId:props.deckId,cardId:props.cardId},content=shallowRef<Output<'card.getPublishedContent'>>(),history=ref<Output<'learning.history.list'>['items']>([]),cursor=ref<string|null>(null),mastery=shallowRef<Output<'learning.mastery.card'>>(),event=shallowRef<Output<'learning.history.get'>>(),eventContent=shallowRef<Output<'content.getVersion'>>(),knowledge=ref<string[]>([]),error=ref(''),busy=ref(false);let disposed=false,generation=0,selectedRequest=0;let historyStamp:ReturnType<typeof dataSync.snapshot>=null;
const parts=computed(()=>{const p=content.value?.payload;if(!p)return[];if(p.encoding==='question-v1')return[{label:'题干',text:p.fields.material+'\n\n'+p.fields.stem},...p.fields.options.map((o,i)=>({label:'选项 '+(i+1),text:o.markdown})),{label:'答案',text:p.fields.options.find(o=>o.optionId===p.fields.correctOptionId)?.markdown??'未设置'},{label:'解析',text:p.fields.analysis}];if(p.encoding==='qa-v1')return[{label:'问题',text:p.fields.front},{label:'答案',text:p.fields.back},{label:'补充',text:p.fields.supplement}];if(p.encoding==='direct-v1')return[{label:'正文',text:p.fields.body}];return[{label:'题干',text:p.fields.stem},{label:'选项',text:p.fields.options},{label:'答案',text:p.fields.answer},{label:'解析',text:p.fields.analysis}];});
const modeName=computed(()=>content.value?{question:'错题复盘',qa:'问答记忆',direct:'直接记忆'}[content.value.mode]:'');
const records=computed(()=>[...history.value].reverse().map((r,i)=>({id:r.eventId,ordinal:i+1,createdAt:r.createdAt,selfScore:r.scoreTenths===null?null:r.scoreTenths/10,elapsedSeconds:r.elapsedSeconds,correct:r.objectiveCorrect,effective:true})));
const evidence=computed(()=>historyEvidence(event.value,eventContent.value));
async function more(){const token=generation;busy.value=true;try{const p=await unifiedLearning.history({...scope,after:cursor.value});dataSync.assertCurrent(p);const stamp=dataSync.metadata(p)!;if(!historyStamp||stamp.dataEpoch!==historyStamp.dataEpoch||stamp.dataRevision!==historyStamp.dataRevision){await load();return;}if(!disposed&&token===generation){history.value.push(...p.items);cursor.value=p.nextCursor;}}catch(e){if(token===generation){history.value=[];mastery.value=undefined;error.value='历史尚未刷新，请重新读取。'+String(e);}}finally{if(token===generation)busy.value=false;}}
async function select(id:string){const token=++selectedRequest,versionToken=generation;busy.value=true;event.value=undefined;eventContent.value=undefined;try{const result=await unifiedLearning.event({...scope,eventId:id});const version=await unifiedCards.getVersion({...scope,versionId:result.contentVersionId});dataSync.assertCurrent(result,version);if(!disposed&&token===selectedRequest&&versionToken===generation){event.value=result;eventContent.value=version;}}catch(e){if(token===selectedRequest)error.value=String(e);}finally{if(token===selectedRequest)busy.value=false;}}
async function load(){const token=++generation;selectedRequest++;busy.value=true;error.value='';content.value=undefined;history.value=[];mastery.value=undefined;event.value=undefined;eventContent.value=undefined;try{const [c,h,m,links,tree]=await dataSync.batch(()=>Promise.all([unifiedCards.getPublishedContent(scope),unifiedLearning.history(scope),unifiedLearning.mastery(scope),unifiedKnowledge.links(scope),unifiedKnowledge.tree({deckId:props.deckId})]));if(!disposed&&token===generation){content.value=c;history.value=h.items;cursor.value=h.nextCursor;mastery.value=m;historyStamp=dataSync.metadata(h)!;knowledge.value=links.nodeIds.map(id=>tree.nodes.find(n=>n.nodeId===id)?.name??'已失效知识点');if(props.initialEventId)await select(props.initialEventId);}}catch(e){if(token===generation)error.value='详情尚未刷新，请重新读取。'+String(e);}finally{if(token===generation)busy.value=false;}}
useDataRefresh(load,()=>props.deckId);onMounted(load);onBeforeUnmount(()=>{disposed=true;generation++;selectedRequest++;});
defineExpose({selectedEvent:()=>event.value?.eventId??''});

const historyPanel=ref<HTMLDetailsElement>();
const questionPayload = computed(() => {
  const payload = content.value?.payload;
  return payload?.encoding === 'question-v1' ? payload : undefined;
});
const qaPayload = computed(() => {
  const payload = content.value?.payload;
  return payload?.encoding === 'qa-v1' ? payload : undefined;
});
const directPayload = computed(() => {
  const payload = content.value?.payload;
  return payload?.encoding === 'direct-v1' ? payload : undefined;
});
const correctOption = computed(() =>
  questionPayload.value?.fields.options.find(
    option => option.optionId === questionPayload.value?.fields.correctOptionId,
  ),
);
const correctOptionLetter = computed(() => {
  const index = questionPayload.value?.fields.options.findIndex(
    option => option.optionId === questionPayload.value?.fields.correctOptionId,
  ) ?? -1;
  return index >= 0 ? String.fromCharCode(65 + index) : '未设置';
});
</script>
<template>
  <article aria-label="卡片详情" class="card-detail-page r3-detail w6-detail" :aria-busy="busy">
    <p v-if="error" role="alert" class="w6-detail-error">
      {{ error }}
      <button class="button" @click="load">重新读取详情</button>
      <button class="button" @click="emit('back')">{{ backLabel ?? '返回列表' }}</button>
    </p>

    <template v-if="content">
      <div class="page-heading">
        <div>
          <h1>卡片详情</h1>
          <p>{{ deckName ?? '当前卡片集' }} / {{ modeName }}</p>
        </div>
        <div class="heading-actions">
          <button class="button" @click="emit('back')">
            <UiIcon name="back" />{{ backLabel ?? '返回列表' }}
          </button>
          <button class="button primary" @click="emit('edit')">
            <UiIcon name="cards" :size="15" />编辑卡片
          </button>
        </div>
      </div>

      <section class="surface padded w6-card-heading">
        <div class="section-heading">
          <div>
            <h2>{{ content.title || '未命名卡片' }}</h2>
            <p class="small-muted">{{ content.payload?.fields.source || '未填写来源' }}</p>
          </div>
          <span class="mode-label"><span class="dot" />{{ modeName }}</span>
        </div>
      </section>

      <section v-if="questionPayload" class="surface padded margin-top w6-content-panel" aria-label="题目与选项">
        <div class="section-heading">
          <h2>题目与选项</h2>
          <span class="tiny-meta">单选题</span>
        </div>
        <div v-if="questionPayload.fields.material.trim()" class="w6-material">
          <h3>材料</h3>
          <MarkdownContent :markdown="questionPayload.fields.material" :media-refs="content.mediaRefs" />
        </div>
        <div class="w6-stem">
          <MarkdownContent :markdown="questionPayload.fields.stem" :media-refs="content.mediaRefs" />
        </div>
        <div class="w6-option-grid">
          <div v-for="(option, index) in questionPayload.fields.options" :key="option.optionId" class="w6-option-row">
            <span class="w6-option-letter">{{ String.fromCharCode(65 + index) }}</span>
            <div class="w6-option-copy">
              <MarkdownContent :markdown="option.markdown" :media-refs="content.mediaRefs" />
            </div>
          </div>
        </div>
      </section>

      <section v-if="questionPayload" class="surface padded margin-top w6-answer-analysis" aria-label="答案与解析">
        <div class="section-heading"><h2>答案与解析</h2></div>
        <div class="w6-correct-answer">
          <span>正确答案 {{ correctOptionLetter }}</span>
          <div v-if="correctOption">
            <MarkdownContent :markdown="correctOption.markdown" :media-refs="content.mediaRefs" />
          </div>
          <p v-else>尚未设置正确答案。</p>
        </div>
        <div v-if="questionPayload.fields.initialThought" class="w6-analysis-copy"><h3>初始思路</h3><MarkdownContent :markdown="questionPayload.fields.initialThought" :media-refs="content.mediaRefs" /></div>
        <div class="w6-analysis-copy">
          <h3>解析</h3>
          <MarkdownContent :markdown="questionPayload.fields.analysis" :media-refs="content.mediaRefs" />
        </div>
      </section>

      <section v-else-if="qaPayload" class="surface padded margin-top w6-content-panel" aria-label="问题与答案">
        <div class="section-heading"><h2>问题与答案</h2></div>
        <div class="w6-qa-grid">
          <div><h3>问题</h3><MarkdownContent :markdown="qaPayload.fields.front" :media-refs="content.mediaRefs" /></div>
          <div><h3>答案</h3><MarkdownContent :markdown="qaPayload.fields.back" :media-refs="content.mediaRefs" /></div>
        </div>
        <div v-if="qaPayload.fields.supplement" class="w6-analysis-copy">
          <h3>补充说明</h3>
          <MarkdownContent :markdown="qaPayload.fields.supplement" :media-refs="content.mediaRefs" />
        </div>
      </section>

      <section v-else-if="directPayload" class="surface padded margin-top w6-content-panel" aria-label="直接记忆正文">
        <div class="section-heading"><h2>正文</h2></div>
        <MarkdownContent :markdown="directPayload.fields.body" :media-refs="content.mediaRefs" />
      </section>

      <section v-if="!questionPayload && !qaPayload && !directPayload" class="surface padded margin-top" aria-label="原始卡片内容"><section v-for="(part,index) in parts" :key="index"><h3>{{part.label}}</h3><MarkdownContent :markdown="part.text" :media-refs="content.mediaRefs" /></section></section>
      <section class="surface padded margin-top"><h2>已关联知识点</h2><p>{{knowledge.join(' / ')||'尚未关联知识点'}}</p><button class="button small" @click="emit('knowledge')">关联知识点</button></section>

      <section class="surface padded margin-top w6-statistics" aria-label="学习统计">
        <div class="section-heading">
          <div>
            <h2>学习统计</h2>
            <p class="small-muted">累计记录、趋势、最近学习和完整历史</p>
          </div>
          <button class="text-button" @click="historyPanel && (historyPanel.open = true)">全部历史 →</button>
        </div>

        <div class="w6-stat-metrics">
          <div><span>累计复盘</span><strong>{{ mastery?.historyCount ?? '—' }} 次</strong></div>
          <div><span>最近自评</span><strong>{{ history[0]?.scoreTenths == null ? '未记录' : (history[0].scoreTenths / 10).toFixed(1) + ' / 10' }}</strong></div>
          <div><span>当前周期观察</span><strong>{{ mastery?.status === 'pending' ? '待评估' : mastery?.status === 'unseen' ? '未复盘' : mastery?.observations == null ? '未记录' : mastery.observations + ' 次' }}</strong></div>
          <div><span>记录状态</span><strong>{{ mastery?.historyCount == null ? '未记录' : mastery.historyCount > 0 ? '完整保留' : '暂无记录' }}</strong></div>
        </div>

        <div class="w6-stat-columns">
          <section class="w6-trend">
            <div class="section-heading">
              <h3>单卡学习趋势</h3>
              <span class="tiny-meta">已加载记录 · 自评分 / 用时</span>
            </div>
            <ReviewLineChart :records="records" metric="selfScore" title="已加载记录 · 自评分" :selected-id="event?.eventId ?? ''" unified neutral @select="select" />
            <details class="w6-time-trend">
              <summary>查看用时趋势</summary>
              <ReviewLineChart :records="records" metric="elapsedSeconds" title="已加载记录 · 用时" :selected-id="event?.eventId ?? ''" unified neutral @select="select" />
            </details>
          </section>

          <section class="w6-recent">
            <div class="section-heading"><h3>最近三次学习</h3></div>
            <div v-for="record in history.slice(0, 3)" :key="record.eventId" class="history-row">
              <span class="score-token">{{ record.scoreTenths == null ? '—' : (record.scoreTenths / 10).toFixed(1) }}</span>
              <div class="history-row-main">
                <strong>{{ new Date(record.createdAt).toLocaleDateString('zh-CN') }}</strong>
                <small>{{ record.elapsedSeconds ?? '未记录' }} 秒 · {{ record.objectiveCorrect === null ? '主观自评' : record.objectiveCorrect ? '回答正确' : '回答错误' }}</small>
              </div>
              <button class="text-button" :disabled="busy" @click="select(record.eventId)">查看</button>
            </div>
            <div v-if="!history.length" class="empty-state">还没有学习记录</div>
          </section>
        </div>

        <details ref="historyPanel" class="w6-history-panel" :open="!!event">
          <summary>复盘趋势与完整历史</summary>
          <div class="detail-history-list">
            <button v-for="record in history" :key="record.eventId" :disabled="busy" @click="select(record.eventId)">
              {{ new Date(record.createdAt).toLocaleString('zh-CN') }} · {{ record.scoreTenths === null ? '未记录' : (record.scoreTenths / 10).toFixed(1) }} 分 · {{ record.elapsedSeconds ?? '未记录' }} 秒
            </button>
          </div>
          <button v-if="cursor" :disabled="busy" @click="more">更多历史记录</button>
          <section v-if="event" aria-label="当次复盘证据" class="w6-event-evidence">
            <h3>{{ new Date(event.createdAt).toLocaleString('zh-CN') }}</h3>
            <p>自评 {{ event.scoreTenths === null ? '未记录' : (event.scoreTenths / 10).toFixed(1) }} · 客观{{ event.objectiveCorrect === null ? '不适用' : event.objectiveCorrect ? '正确' : '错误' }} · 评级 {{ event.rating ?? '未记录' }}</p>
            <p>当时选择：{{ evidence.choice }}</p>
            <p>原始思路：{{ evidence.thought || '未记录' }}</p>
            <p>错因：{{ evidence.faults.join('；') || '未记录' }}</p>
            <p>知识漏洞：{{ evidence.gaps || '未记录' }}</p>
            <p>反思：{{ evidence.reflection || '未记录' }}</p>
            <p>当时知识点：{{ event.native?.knowledge.map(item => item.path.join(' › ')).join('、') || (event.knowledgeSnapshot ? '旧记录保留了知识快照，未提供统一父级路径' : '无') }}</p>
            <details v-if="event.knowledgeSnapshot && !event.native">
              <summary>当时的原始知识快照</summary>
              <pre>{{ event.knowledgeSnapshot }}</pre>
            </details>
          </section>
        </details>

        <div class="compact-actions margin-top">
          <button class="button small" @click="emit('study')"><UiIcon name="play" :size="15" />复盘此卡片</button>
          <button class="button small" @click="historyPanel && (historyPanel.open = true)"><UiIcon name="clock" />查看学习历史</button>
          <button class="button small" @click="emit('schedule')">单卡调度</button>
        </div>
      </section>
    </template>

    <p v-else-if="!error">正在读取当前内容…</p>
  </article>
</template>
