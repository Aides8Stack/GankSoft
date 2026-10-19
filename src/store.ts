import { ref, computed } from 'vue';
import { services } from './services';

import type { Snapshot, Question } from '../shared/types';
export const state = ref<Snapshot | null>(null);
export const notice = ref('');
export const error = ref('');
export const working = ref(false);
export const moduleFilter = ref('全部模块');
export const selectedQuestionId = ref('');
export const selectedKnowledgeId = ref('');
export const liveKnowledge = computed(
  () => state.value?.knowledge.filter((k) => !k.deleted_at) ?? [],
);
export const liveQuestions = computed(
  () =>
    state.value?.questions.filter(
      (q) =>
        !q.deleted_at && liveDecks.value.some((d) => d.id === q.module && d.kind === 'question'),
    ) ?? [],
);
export const dueQuestions = computed(() =>
  liveQuestions.value
    .filter(
      (q) =>
        q.status === 'ready' &&
        /^[A-D]$/.test(q.answer) &&
        !q.paused &&
        q.due_at &&
        new Date(q.due_at).getTime() <= Date.now(),
    )
    .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!)),
);
let refreshGeneration = 0;
export async function refresh() {
  const generation = ++refreshGeneration;
  const result = await services.workspace.read(
    ['catalog', 'content', 'history', 'knowledge', 'sessions', 'policies', 'exchange', 'audits'],
    moduleFilter.value === '全部模块' ? null : moduleFilter.value,
  );
  if (generation === refreshGeneration) state.value = result;
}
export async function task<T>(action: () => Promise<T>, message = ''): Promise<T | undefined> {
  if (working.value) return;
  working.value = true;
  error.value = '';
  notice.value = '';
  try {
    const result = await action();
    try {
      await refresh();
    } catch (e) {
      error.value = '操作已完成，但界面刷新失败，请重新打开页面核对：' + String(e);
      return result;
    }
    notice.value = result === null || result === false ? '操作已取消' : message;
    return result;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    return undefined;
  } finally {
    working.value = false;
  }
}
export const formatDate = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
export const knowledgeName = (id: string) =>
  state.value?.knowledge.find((k) => k.id === id)?.name ?? '已移除知识点';
export const assetUrl = (id: string) => `app-media://asset/${id}`;

export const selectedMemoryId = ref('');
export const liveMemories = computed(
  () => state.value?.memories.filter((m) => !m.deleted_at) ?? [],
);
export const dueMemories = computed(() =>
  liveMemories.value
    .filter((m) => !m.paused && m.due_at && new Date(m.due_at).getTime() <= Date.now())
    .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!)),
);

export const reviewRequest = ref<{
  mode: string;
  knowledgeId?: string;
  questionId?: string;
  sessionId?: string;
  ids?: string[];
  title?: string;
  detail?: string;
  practice?: boolean;
  queueSnapshot?: {ruleVersion:string;configRevision:number;dataRevision:string;seed:string;calculatedAt:string};
} | null>(null);

export const liveDecks = computed(() => state.value?.decks.filter((d) => !d.deleted_at) ?? []);
export const MODULES = computed(() => liveDecks.value.map((d) => d.id));
export const MEMORY_MODULES = computed(() =>
  liveDecks.value.filter((d) => d.kind === 'memory').map((d) => d.id),
);
export const QUESTION_MODULES = computed(() =>
  liveDecks.value.filter((d) => d.kind === 'question').map((d) => d.id),
);
export const isMemoryModule = (key: string) =>
  liveDecks.value.some((d) => d.id === key && d.kind === 'memory');
export const deckName = (key: string) => liveDecks.value.find((d) => d.id === key)?.name ?? key;
export const deckPath = (key: string): string => {
  const d = liveDecks.value.find((d) => d.id === key);
  return d?.folder_id ? folderPath(d.folder_id) + ' / ' + d.name : (d?.name ?? key);
};
export function inDeckScope(key: string, selected = moduleFilter.value): boolean {
  return selected === '全部模块' || key === selected;
}

export const liveFolders = computed(() => state.value?.folders.filter((f) => !f.deleted_at) ?? []);
export function folderPath(key: string): string {
  const f = liveFolders.value.find((f) => f.id === key);
  return f?.parent_id ? folderPath(f.parent_id) + ' / ' + f.name : (f?.name ?? '');
}
export const cardSelection = ref<string[]>([]);
export const cardFilterPreset = ref('all');

export const unsavedMap = ref(false);
export const explorerViews = ref<Record<string, any>>({});

export function resetExplorerView(deckId: string) {
  delete explorerViews.value[deckId];
  cardFilterPreset.value = 'all';
  cardSelection.value = [];
}

export const studyController: { suspend?: () => Promise<boolean>; retire?: () => void } = {};
