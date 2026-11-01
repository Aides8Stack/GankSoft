<script setup lang="ts">
import { historyEvidence } from '../../shared/cards/history-evidence';
import { computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue';
import { client, dataSync, unifiedCards, unifiedLearning, unifiedKnowledge } from '../services';
import type { Request, Output } from '../../shared/protocol/registry';
import { useDataRefresh } from '../composables/dataRefresh';
import { useKnowledgePicker } from '../composables/knowledgePicker';
import UiIcon from './v37/PrototypeIcon.vue';
import MarkdownContent from '../editor/MarkdownContent.vue';
import ReviewLineChart from '../components/ReviewLineChart.vue';

const props = defineProps<{ deckId: string; cardId: string; initialEventId?: string; deckName?: string; backLabel?: string }>();
const emit = defineEmits<{ edit: []; study: []; schedule: []; back: [] }>();
const scope = { deckId: props.deckId, cardId: props.cardId };
const content = shallowRef<Output<'card.getPublishedContent'>>();
const history = ref<Output<'learning.history.list'>['items']>([]);
const cursor = ref<string | null>(null);
const mastery = shallowRef<Output<'learning.mastery.card'>>();
const event = shallowRef<Output<'learning.history.get'>>();
const eventContent = shallowRef<Output<'content.getVersion'>>();
const linkState = shallowRef<Output<'knowledge.cardLinks.get'>>();
const treeState = shallowRef<Output<'knowledge.tree.read'>>();
const error = ref('');
const busy = ref(false);
const linkError = ref('');
const linkNotice = ref('');
const editingLinks = ref(false);
const pickerOpen = ref(false);
const savingLinks = ref(false);
const needsLinkReload = ref(false);
const refreshPending = ref(false);
const readingLinks = ref(false);
// An unresolved original command blocks new writes; rereads never resubmit it.
const pendingOperation = shallowRef<{request?: Request<'knowledge.cardLinks.set'>; nodeIds:string[]; committed:boolean}>();
let relationGeneration = 0;
let pageEpoch: string | undefined;
let recoveringEpoch = false;
const pendingLinkIds = ref<string[]>([]);
const historyPanel = ref<HTMLDetailsElement>();
const knowledgePicker = useKnowledgePicker(() => props.deckId);
let disposed = false;
let generation = 0;
let selectedRequest = 0;
let historyStamp: ReturnType<typeof dataSync.snapshot> = null;

const parts=computed(()=>{const p=content.value?.payload;if(!p)return[];if(p.encoding==='question-v1')return[{label:'题干',text:p.fields.material+'\n\n'+p.fields.stem},...p.fields.options.map((o,i)=>({label:'选项 '+(i+1),text:o.markdown})),{label:'答案',text:p.fields.options.find(o=>o.optionId===p.fields.correctOptionId)?.markdown??'未设置'},{label:'解析',text:p.fields.analysis}];if(p.encoding==='qa-v1')return[{label:'问题',text:p.fields.front},{label:'答案',text:p.fields.back},{label:'补充',text:p.fields.supplement}];if(p.encoding==='direct-v1')return[{label:'正文',text:p.fields.body}];return[{label:'题干',text:p.fields.stem},{label:'选项',text:p.fields.options},{label:'答案',text:p.fields.answer},{label:'解析',text:p.fields.analysis}];});

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
const modeName = computed(() => {
  if (!content.value) return '';
  return { question: '错题复盘', qa: '问答记忆', direct: '直接记忆' }[content.value.mode];
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
const records = computed(() =>
  [...history.value].reverse().map((record, index) => ({
    id: record.eventId,
    ordinal: index + 1,
    createdAt: record.createdAt,
    selfScore: record.scoreTenths === null ? null : record.scoreTenths / 10,
    elapsedSeconds: record.elapsedSeconds,
    correct: record.objectiveCorrect,
    effective: true,
  })),
);
const evidence = computed(() => historyEvidence(event.value, eventContent.value));

function sameIds(left: readonly string[], right: readonly string[]) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
function errorCode(value: unknown) {
  return value && typeof value === 'object' && 'code' in value
    ? String((value as { code?: unknown }).code ?? '')
    : '';
}
function unknownOutcome(value: unknown) {
  return !!value && typeof value === 'object' &&
    'outcome' in value && (value as { outcome?: unknown }).outcome === 'unknown';
}
function errorMessage(value: unknown) {
  return value instanceof Error ? value.message : String(value);
}
function nodePath(nodeId: string) {
  const nodes = treeState.value?.nodes ?? [];
  const byId = new Map(nodes.map(node => [node.nodeId, node]));
  let current = byId.get(nodeId);
  if (!current) return '知识点已失效（' + nodeId + '）';
  const names: string[] = [];
  const seen = new Set<string>();
  while (current && !seen.has(current.nodeId)) {
    seen.add(current.nodeId);
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names.join(' / ');
}
const knowledgeItems = computed(() =>
  (linkState.value?.nodeIds ?? []).map(id => ({
    id,
    path: nodePath(id),
    valid: (treeState.value?.nodes ?? []).some(node => node.nodeId === id),
  })),
);
const pendingKnowledgeItems = computed(() =>
  pendingLinkIds.value.map(id => ({
    id,
    path: nodePath(id),
    valid: (treeState.value?.nodes ?? []).some(node => node.nodeId === id),
  })),
);
const addedKnowledgeItems = computed(() =>
  pendingKnowledgeItems.value.filter(item => !linkState.value?.nodeIds.includes(item.id)),
);
const removedKnowledgeItems = computed(() =>
  knowledgeItems.value.filter(item => !pendingLinkIds.value.includes(item.id)),
);
const hasLinkChanges = computed(() =>
  !!linkState.value && !sameIds(linkState.value.nodeIds, pendingLinkIds.value),
);

const keptKnowledgeItems = computed(() => pendingKnowledgeItems.value.filter(item => linkState.value?.nodeIds.includes(item.id)));
function isCurrent(token:number) { return !disposed && token === relationGeneration; }
async function readRelations() {
  const token = ++relationGeneration;
  readingLinks.value = true;
  try {
    const [links, tree] = await dataSync.batch(() => Promise.all([
      unifiedKnowledge.links(scope), unifiedKnowledge.tree({deckId:props.deckId}),
    ]));
    if (!isCurrent(token)) throw Error('关联读取已失效，请重新读取');
    dataSync.assertCurrent(links, tree);
    linkState.value = links; treeState.value = tree;
    if (!editingLinks.value && !pendingOperation.value) pendingLinkIds.value = [...links.nodeIds];
    return links;
  } finally { if (isCurrent(token)) readingLinks.value = false; }
}
function clearReferences() {
  generation++; selectedRequest++; relationGeneration++;
  knowledgePicker.cancel();
  content.value=undefined;history.value=[];cursor.value=null;mastery.value=undefined;
  event.value=undefined;eventContent.value=undefined;historyStamp=null;
  linkState.value=undefined;treeState.value=undefined;pendingLinkIds.value=[];
  pendingOperation.value=undefined;editingLinks.value=false;needsLinkReload.value=false;
  linkError.value='';linkNotice.value='数据库已切换，旧页面引用已清除。';
  readingLinks.value=false;savingLinks.value=false;pickerOpen.value=false;refreshPending.value=false;
}
async function recoverEpoch() {
  if (disposed || recoveringEpoch) return;
  recoveringEpoch=true;clearReferences();
  try { await dataSync.revalidate(); if (!disposed) await load(); }
  catch(value) { if (!disposed) error.value='数据库切换后读取失败：'+errorMessage(value); }
  finally { recoveringEpoch=false; }
}

async function more() {
  const token = generation;
  busy.value = true;
  try {
    const page = await unifiedLearning.history({ ...scope, after: cursor.value });
    dataSync.assertCurrent(page);
    const stamp = dataSync.metadata(page)!;
    if (!historyStamp || stamp.dataEpoch !== historyStamp.dataEpoch || stamp.dataRevision !== historyStamp.dataRevision) {
      await load();
      return;
    }
    if (!disposed && token === generation) {
      history.value.push(...page.items);
      cursor.value = page.nextCursor;
    }
  } catch (value) {
    if (token === generation) {
      history.value = [];
      mastery.value = undefined;
      error.value = '历史尚未刷新，请重新读取。' + errorMessage(value);
    }
  } finally {
    if (token === generation) busy.value = false;
  }
}

async function select(id: string) {
  const token = ++selectedRequest;
  const versionToken = generation;
  busy.value = true;
  event.value = undefined;
  eventContent.value = undefined;
  try {
    const result = await unifiedLearning.event({ ...scope, eventId: id });
    const version = await unifiedCards.getVersion({ ...scope, versionId: result.contentVersionId });
    dataSync.assertCurrent(result, version);
    if (!disposed && token === selectedRequest && versionToken === generation) {
      event.value = result;
      eventContent.value = version;
      if (historyPanel.value) historyPanel.value.open = true;
    }
  } catch (value) {
    if (token === selectedRequest) error.value = String(value);
  } finally {
    if (token === selectedRequest) busy.value = false;
  }
}

async function load() {
  const token=++generation;selectedRequest++;busy.value=true;error.value='';
  // Relation errors do not hide the card or misrepresent an empty set.
  try {
    const [card,page,cardMastery]=await dataSync.batch(()=>Promise.all([
      unifiedCards.getPublishedContent(scope),unifiedLearning.history(scope),unifiedLearning.mastery(scope),
    ]));
    if(disposed||token!==generation)return;
    content.value=card;history.value=page.items;cursor.value=page.nextCursor;
    mastery.value=cardMastery;historyStamp=dataSync.metadata(page)!;pageEpoch=historyStamp?.dataEpoch;
    if(!editingLinks.value&&!savingLinks.value&&!pickerOpen.value&&!pendingOperation.value){
      try { await readRelations();if(token===generation)linkError.value=''; }
      catch(value){if(token===generation)linkError.value='知识点关联读取失败：'+errorMessage(value);}
    }
    if(!disposed&&token===generation&&props.initialEventId)await select(props.initialEventId);
  } catch(value) {
    if(token===generation){
      if(errorCode(value)==='DATA_EPOCH_CHANGED'){void recoverEpoch();return;}
      error.value='详情尚未刷新，请重新读取。'+errorMessage(value);
    }
  } finally {if(token===generation)busy.value=false;}
}
function refreshDetail() {
  if(disposed||recoveringEpoch)return;
  const current=dataSync.snapshot();
  if(pageEpoch&&(!current||current.dataEpoch!==pageEpoch)){void recoverEpoch();return;}
  if(savingLinks.value||editingLinks.value||pickerOpen.value||pendingOperation.value){refreshPending.value=true;return;}
  void load();
}
useDataRefresh(refreshDetail,()=>props.deckId);

async function modifyLinks() {
  const token=generation;
  if (savingLinks.value||readingLinks.value||pendingOperation.value) return;
  if (!linkState.value) {
    try {
      await readRelations();
    } catch (value) {
      linkError.value = '当前关联读取失败：' + errorMessage(value);
      return;
    }
  }
  if (!linkState.value) return;
  const revisionAtOpen = linkState.value.revision;
  linkError.value = '';
  linkNotice.value = '';
  pickerOpen.value = true;
  try {
    const result = await knowledgePicker.open({
      deckId: props.deckId,
      initialSelectedIds: [...(editingLinks.value ? pendingLinkIds.value : linkState.value.nodeIds)],
      purpose: 'association',
      allowSelectDescendants: true,
    });
    if(disposed||token!==generation)return;
    if (result.status === 'confirmed') {
      pendingLinkIds.value = [...result.nodeIds];
      editingLinks.value = true;
      needsLinkReload.value = refreshPending.value || linkState.value.revision !== revisionAtOpen;
      if (needsLinkReload.value) {
        linkError.value = '打开选择器期间数据发生变化。请先重新读取当前关联，再确认保存。';
      }
    }
  } catch (value) {
    linkError.value = '无法打开知识点选择器：' + errorMessage(value);
  } finally {
    if(disposed||token!==generation)return;
    pickerOpen.value = false;
    if (refreshPending.value && !editingLinks.value) {
      refreshPending.value = false;
      void load();
    }
  }
}

async function reloadLinkBaseline() {
  if(savingLinks.value||readingLinks.value)return;
  if(pendingOperation.value){await verifyOperation();return;}
  const token=generation;
  try {
    await readRelations();if(disposed||token!==generation)return;
    needsLinkReload.value=false;linkError.value='';refreshPending.value=false;
    linkNotice.value='已重新读取当前关联；待保存选择保留。请核对差异，再点击保存关联。';
  } catch(value) {if(token===generation)linkError.value='重新读取关联失败：'+errorMessage(value);}
}
async function discardLinks() {
  if(savingLinks.value||readingLinks.value||pendingOperation.value)return;
  const token=generation;
  try {
    // Restore the current database set, including concurrent changes, never a stale baseline.
    const links=await readRelations();if(disposed||token!==generation)return;
    pendingLinkIds.value=[...links.nodeIds];editingLinks.value=false;needsLinkReload.value=false;
    linkError.value='';linkNotice.value='已放弃修改，并读取数据库当前关联。';
    if(refreshPending.value){refreshPending.value=false;void load();}
  } catch(value) {if(token===generation)linkError.value='无法确认数据库当前关联，暂存选择已保留：'+errorMessage(value);}
}
function acceptVerifiedLinks(links:Output<'knowledge.cardLinks.get'>) {
  pendingLinkIds.value=[...links.nodeIds];pendingOperation.value=undefined;
  editingLinks.value=false;needsLinkReload.value=false;linkError.value='';
  linkNotice.value='关联已保存，并已重新读取数据库验证。';
}
async function verifyOperation() {
  const op=pendingOperation.value;if(!op||savingLinks.value)return;
  const token=generation;savingLinks.value=true;linkNotice.value='';
  try {
    if(!op.committed){
      if(!op.request)throw Error('缺少原请求回执，不能发起新写入；请返回后重新读取当前关联。');
      const status=await client.call('operation.status',{requestId:op.request.requestId,method:op.request.method,payload:op.request.payload});
      if(disposed||token!==generation)return;
      if(status.state==='rejected'){
        pendingOperation.value=undefined;needsLinkReload.value=true;
        await readRelations();linkError.value='原保存请求已拒绝；暂存内容保留，请重新读取并确认。';return;
      }
      if(status.state!=='committed')throw Error('原请求尚未取得确定回执；没有重复发送写请求。');
      const response=status.response as {ok?:boolean;requestId?:string;dataEpoch?:string}|null;
      if(!response?.ok||response.requestId!==op.request.requestId||response.dataEpoch!==op.request.dataEpoch)throw Error('原请求回执身份不一致');
      client.acceptReceipt(op.request,status.response);op.committed=true;
    }
    const links=await readRelations();if(disposed||token!==generation)return;
    if(!sameIds(links.nodeIds,op.nodeIds)||op.nodeIds.some(id=>!treeState.value?.nodes.some(n=>n.nodeId===id))){
      pendingOperation.value=undefined;needsLinkReload.value=true;
      linkError.value='保存回执已确认，但读回关联与提交内容不一致或节点失效。请重新读取后核对差异。';return;
    }
    acceptVerifiedLinks(links);
  } catch(value) {
    if(token!==generation||disposed)return;
    if(errorCode(value)==='DATA_EPOCH_CHANGED'){void recoverEpoch();return;}
    needsLinkReload.value=true;
    linkError.value=op.committed?'保存已返回，但读回验证失败；请重新核验，不能重复保存。'+errorMessage(value):'保存结果未知；请核验原请求回执，不能重复保存。'+errorMessage(value);
  } finally {
    if(token===generation&&!disposed){savingLinks.value=false;if(refreshPending.value&&!editingLinks.value){refreshPending.value=false;void load();}}
  }
}
async function saveLinks() {
  if(!linkState.value||!hasLinkChanges.value||needsLinkReload.value||savingLinks.value||readingLinks.value||pendingOperation.value)return;
  const token=generation,nextIds=[...new Set(pendingLinkIds.value)];
  if(nextIds.length>500){linkError.value='单张卡片最多关联500个知识点。';return;}
  savingLinks.value=true;linkError.value='';linkNotice.value='';
  // Invalidate relation reads begun before this write.
  relationGeneration++;
  try {
    await unifiedKnowledge.setLinks({...scope,nodeIds:nextIds,expectedRevision:linkState.value.revision});
    if(disposed||token!==generation)return;
    pendingOperation.value={nodeIds:nextIds,committed:true};
  } catch(value) {
    if(disposed||token!==generation)return;
    if(errorCode(value)==='DATA_EPOCH_CHANGED'){void recoverEpoch();return;}
    if(errorCode(value)==='REVISION_CONFLICT'){
      needsLinkReload.value=true;
      try {await readRelations();} catch { /* Keep pending and the conflict visible; explicit reload can recover. */ }
      if(token===generation)linkError.value='当前关联已被其他操作修改。暂存内容保留，已尝试读取最新关联；请重新读取并确认后再保存。';
    } else if(unknownOutcome(value)){
      const request=(value as {request?:Request<'knowledge.cardLinks.set'>}).request;
      pendingOperation.value={request,nodeIds:nextIds,committed:false};
    } else linkError.value='保存关联失败，暂存内容已保留：'+errorMessage(value);
  } finally {if(token===generation&&!disposed)savingLinks.value=false;}
  if(token===generation&&!disposed&&pendingOperation.value)await verifyOperation();
}
onMounted(() => void load());
onBeforeUnmount(() => {
  disposed = true;
  generation++;
  relationGeneration++;
  selectedRequest++;
});
defineExpose({ selectedEvent: () => event.value?.eventId ?? '' });
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
      <section class="surface padded margin-top w6-knowledge-links" aria-label="已关联知识点">
        <div class="section-heading">
          <div>
            <h2>已关联知识点</h2>
            <p class="small-muted">显示当前卡片的持久化关联及完整层级路径</p>
          </div>
          <button class="button small" :disabled="busy || readingLinks || savingLinks || pickerOpen || !!pendingOperation" @click="modifyLinks">
            <UiIcon name="brain" />修改关联
          </button>
        </div>

        <p v-if="readingLinks" role="status">正在读取知识点关联…</p>
        <div v-if="linkState && knowledgeItems.length" class="w6-link-chips">
          <span v-for="item in knowledgeItems" :key="item.id" class="w6-link-chip" :class="{ invalid: !item.valid }">
            {{ item.path }}
          </span>
        </div>
        <p v-else-if="linkState" class="empty-state">当前尚未关联知识点。</p>
        <p v-else-if="!linkError && !readingLinks" class="empty-state">正在读取知识点关联…</p>

        <div v-if="editingLinks" class="w6-link-editor">
          <div class="w6-link-editor-heading">
            <strong>待保存的关联</strong>
            <span v-if="!hasLinkChanges" class="tiny-meta">尚未修改</span>
            <span v-else class="tiny-meta">有未保存的变更</span>
          </div>
          <div class="w6-link-chips">
            <span v-for="item in pendingKnowledgeItems" :key="item.id" class="w6-link-chip pending" :class="{ invalid: !item.valid }">
              {{ item.path }}
            </span>
            <span v-if="!pendingKnowledgeItems.length" class="tiny-meta">保存后将清空当前关联。</span>
          </div>
          <div class="w6-link-diff">
            <p v-if="addedKnowledgeItems.length"><strong>待新增：</strong>{{ addedKnowledgeItems.map(item => item.path).join('；') }}</p>
            <p v-if="removedKnowledgeItems.length"><strong>待断开：</strong>{{ removedKnowledgeItems.map(item => item.path).join('；') }}</p>
            <p><strong>待保留：</strong>{{keptKnowledgeItems.map(item=>item.path).join('；')||'无'}}</p>
          </div>
          <p v-if="needsLinkReload" class="w6-link-warning" role="status">
            {{pendingOperation?'保存结果尚未核验，已阻止新的写请求。':'当前关联版本需要确认，请先重新读取，再检查待保存选择。'}}
          </p>
          <div class="w6-link-actions">
            <button v-if="needsLinkReload || pendingOperation" class="button small" :disabled="savingLinks || readingLinks" @click="reloadLinkBaseline">{{pendingOperation?'核验保存结果':'重新读取当前关联'}}</button>
            <button class="button small primary" :disabled="savingLinks || readingLinks || !!pendingOperation || !hasLinkChanges || needsLinkReload" @click="saveLinks">
              {{ savingLinks ? '正在保存并验证…' : '保存关联' }}
            </button>
            <button class="button small" :disabled="savingLinks || readingLinks || !!pendingOperation" @click="discardLinks">放弃修改</button>
          </div>
        </div>
        <button v-if="!editingLinks && linkError" class="button small" :disabled="readingLinks" @click="reloadLinkBaseline">重新读取当前关联</button>
        <p v-if="linkError" class="w6-link-error" role="alert">{{ linkError }}</p>
        <p v-if="linkNotice" class="w6-link-notice" role="status">{{ linkNotice }}</p>
      </section>

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
