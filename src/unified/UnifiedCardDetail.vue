<script setup lang="ts">
import { historyEvidence } from '../../shared/cards/history-evidence';
import { computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue';
import { dataSync, unifiedCards, unifiedLearning, unifiedKnowledge } from '../services';
import type { Output } from '../../shared/protocol/registry';
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
const pendingLinkIds = ref<string[]>([]);
const historyPanel = ref<HTMLDetailsElement>();
const knowledgePicker = useKnowledgePicker(() => props.deckId);
let disposed = false;
let generation = 0;
let selectedRequest = 0;
let historyStamp: ReturnType<typeof dataSync.snapshot> = null;

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
  if (!current) return '知识点已失效（' + nodeId.slice(0, 8) + '）';
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

async function readRelations() {
  const [links, tree] = await dataSync.batch(() =>
    Promise.all([
      unifiedKnowledge.links(scope),
      unifiedKnowledge.tree({ deckId: props.deckId }),
    ]),
  );
  linkState.value = links;
  treeState.value = tree;
  return links;
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
  const token = ++generation;
  selectedRequest++;
  busy.value = true;
  error.value = '';
  content.value = undefined;
  history.value = [];
  mastery.value = undefined;
  event.value = undefined;
  eventContent.value = undefined;
  try {
    const [card, page, cardMastery, links, tree] = await dataSync.batch(() =>
      Promise.all([
        unifiedCards.getPublishedContent(scope),
        unifiedLearning.history(scope),
        unifiedLearning.mastery(scope),
        unifiedKnowledge.links(scope),
        unifiedKnowledge.tree({ deckId: props.deckId }),
      ]),
    );
    if (!disposed && token === generation) {
      content.value = card;
      history.value = page.items;
      cursor.value = page.nextCursor;
      mastery.value = cardMastery;
      historyStamp = dataSync.metadata(page)!;
      linkState.value = links;
      treeState.value = tree;
      if (!editingLinks.value) pendingLinkIds.value = [...links.nodeIds];
      if (props.initialEventId) await select(props.initialEventId);
    }
  } catch (value) {
    if (token === generation) error.value = '详情尚未刷新，请重新读取。' + errorMessage(value);
  } finally {
    if (token === generation) busy.value = false;
  }
}

function refreshDetail() {
  if (savingLinks.value || editingLinks.value || pickerOpen.value) {
    refreshPending.value = true;
    return;
  }
  void load();
}
useDataRefresh(refreshDetail, () => props.deckId);

async function modifyLinks() {
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
    pickerOpen.value = false;
    if (refreshPending.value && !editingLinks.value) {
      refreshPending.value = false;
      void load();
    }
  }
}

async function reloadLinkBaseline() {
  const pending = [...pendingLinkIds.value];
  try {
    await readRelations();
    pendingLinkIds.value = pending;
    needsLinkReload.value = false;
    linkError.value = '';
    linkNotice.value = '已重新读取数据库中的当前关联；你的待保存选择仍然保留。';
  } catch (value) {
    linkError.value = '重新读取关联失败：' + errorMessage(value);
  }
}

function discardLinks() {
  pendingLinkIds.value = [...(linkState.value?.nodeIds ?? [])];
  editingLinks.value = false;
  needsLinkReload.value = false;
  linkError.value = '';
  linkNotice.value = '';
  if (refreshPending.value) {
    refreshPending.value = false;
    void load();
  }
}

function acceptVerifiedLinks(links: Output<'knowledge.cardLinks.get'>) {
  linkState.value = links;
  pendingLinkIds.value = [...links.nodeIds];
  editingLinks.value = false;
  needsLinkReload.value = false;
  linkError.value = '';
  linkNotice.value = '关联已保存，并已重新读取数据库验证。';
}

async function saveLinks() {
  if (!linkState.value || !hasLinkChanges.value || needsLinkReload.value || savingLinks.value) return;
  const nextIds = [...new Set(pendingLinkIds.value)];
  if (nextIds.length > 500) {
    linkError.value = '单张卡片最多关联 500 个知识点。';
    return;
  }

  savingLinks.value = true;
  linkError.value = '';
  linkNotice.value = '';
  try {
    try {
      await unifiedKnowledge.setLinks({
        ...scope,
        nodeIds: nextIds,
        expectedRevision: linkState.value.revision,
      });
    } catch (value) {
      if (errorCode(value) === 'REVISION_CONFLICT') {
        needsLinkReload.value = true;
        linkError.value = '当前关联已被其他操作修改。你的选择已保留，请重新读取当前关联后再决定是否保存。';
        return;
      }
      if (unknownOutcome(value)) {
        try {
          const persisted = await readRelations();
          if (sameIds(persisted.nodeIds, nextIds)) {
            acceptVerifiedLinks(persisted);
          } else {
            needsLinkReload.value = true;
            linkError.value = '保存请求结果暂时无法确认，数据库读回与待保存选择不一致。没有重复发送写请求；请检查当前关联。';
          }
        } catch (readError) {
          needsLinkReload.value = true;
          linkError.value = '保存结果未知，且数据库读回失败。请重新读取关联；系统不会自动重复写入。' + errorMessage(readError);
        }
        return;
      }
      linkError.value = '保存关联失败：' + errorMessage(value);
      return;
    }

    try {
      const persisted = await readRelations();
      if (!sameIds(persisted.nodeIds, nextIds)) {
        needsLinkReload.value = true;
        linkError.value = '保存请求已返回，但数据库读回关系与提交内容不一致。请检查当前关联，不会自动覆盖。';
        return;
      }
      acceptVerifiedLinks(persisted);
    } catch (value) {
      needsLinkReload.value = true;
      linkError.value = '保存请求已成功返回，但数据库读回验证失败。请重新读取关联后确认。' + errorMessage(value);
    }
  } finally {
    savingLinks.value = false;
    if (refreshPending.value && !editingLinks.value) {
      refreshPending.value = false;
      void load();
    }
  }
}
onMounted(() => void load());
onBeforeUnmount(() => {
  disposed = true;
  generation++;
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
        <div v-if="questionPayload.fields.material" class="w6-material">
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

      <section class="surface padded margin-top w6-knowledge-links" aria-label="已关联知识点">
        <div class="section-heading">
          <div>
            <h2>已关联知识点</h2>
            <p class="small-muted">显示当前卡片的持久化关联及完整层级路径</p>
          </div>
          <button class="button small" :disabled="busy || savingLinks || pickerOpen" @click="modifyLinks">
            <UiIcon name="brain" />修改关联
          </button>
        </div>

        <div v-if="linkState && knowledgeItems.length" class="w6-link-chips">
          <span v-for="item in knowledgeItems" :key="item.id" class="w6-link-chip" :class="{ invalid: !item.valid }">
            {{ item.path }}
          </span>
        </div>
        <p v-else-if="linkState" class="empty-state">当前尚未关联知识点。</p>
        <p v-else class="empty-state">正在读取知识点关联…</p>

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
          <div v-if="addedKnowledgeItems.length || removedKnowledgeItems.length" class="w6-link-diff">
            <p v-if="addedKnowledgeItems.length"><strong>待新增：</strong>{{ addedKnowledgeItems.map(item => item.path).join('；') }}</p>
            <p v-if="removedKnowledgeItems.length"><strong>待断开：</strong>{{ removedKnowledgeItems.map(item => item.path).join('；') }}</p>
          </div>
          <p v-if="needsLinkReload" class="w6-link-warning" role="status">
            当前关联版本已变化。请先重新读取，再检查待保存选择。
          </p>
          <div class="w6-link-actions">
            <button v-if="needsLinkReload" class="button small" :disabled="savingLinks" @click="reloadLinkBaseline">重新读取当前关联</button>
            <button class="button small primary" :disabled="savingLinks || !hasLinkChanges || needsLinkReload" @click="saveLinks">
              {{ savingLinks ? '正在保存并验证…' : '保存关联' }}
            </button>
            <button class="button small" :disabled="savingLinks" @click="discardLinks">放弃修改</button>
          </div>
        </div>
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
          <div><span>当前周期观察</span><strong>{{ mastery?.status === 'pending' ? '待评估' : mastery?.status === 'unseen' ? '未复盘' : (mastery?.observations ?? 0) + ' 次' }}</strong></div>
          <div><span>记录状态</span><strong>{{ (mastery?.historyCount ?? 0) > 0 ? '完整保留' : '暂无记录' }}</strong></div>
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
