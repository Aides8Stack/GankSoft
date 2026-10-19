export const MODULES = [
  '政治理论',
  '常识',
  '片段阅读',
  '逻辑填空',
  '资料分析',
  '判断推理',
  '图推',
  '类比推理',
  '数量',
] as const;
export const FAULTS = [
  '知识缺失',
  '条件识别错误',
  '题意理解错误',
  '方法与推理错误',
  '计算错误',
  '选项辨析错误',
  '时间与策略问题',
  '操作疏漏',
] as const;
export interface Knowledge {
  id: string;
  name: string;
  module: string;
  parent_id: string | null;
  aliases: string;
  principle: string;
  conditions: string;
  method: string;
  traps: string;
  deleted_at: string | null;
  version: number;
}
export interface Relation {
  id: string;
  source_id: string;
  target_id: string;
  kind: string;
  note: string;
}
export interface Asset {
  instanceId?: string;
  assetId?: string;
  layout?: import('./image-node.ts').ImageLayout;
  id: string;
  question_id: string;
  role: import('./image-node.ts').ImageRole;
  file_name: string;
  mime: string;
}
export interface Question {
  content_version: number;
  project_note: string;
  id: string;
  title: string;
  module: string;
  stem: string;
  options: string;
  answer: string;
  analysis: string;
  source: string;
  initial_thought: string;
  material: string;
  material_id: string | null;
  status: string;
  deleted_at: string | null;
  version: number;
  created_at: string;
  knowledge_ids: string[];
  assets: Asset[];
  mastery: number | null;
  due_at: string | null;
  interval_days: number | null;
  paused: number;
  reason: string | null;
}
export interface Attempt {
  self_score: number | null;
  content_version: number;
  fault_detail: string;
  question_snapshot: string;
  knowledge_snapshot: string;
  answer_snapshot: string;
  id: string;
  question_id: string;
  created_at: string;
  answer: string;
  correct: number;
  basis: string;
  understanding: number;
  score: number;
  effective: number;
  elapsed_seconds: number | null;
  thought: string;
  improvement: string;
  faults: string;
  knowledge_names: string;
  error_knowledge_ids: string;
  mastery_after: number | null;
}
export interface Audit {
  id: number;
  action: string;
  detail: string;
  created_at: string;
}
export interface Deck {
  id: string;
  name: string;
  kind: 'memory' | 'question';
  parent_id: string | null;
  folder_id: string | null;
  sort_order: number;
  deleted_at: string | null;
  version: number;
}
export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  deleted_at: string | null;
  version: number;
}
export interface Snapshot {
  deckReviewPolicies: import('./review-contract.ts').DeckReviewPolicy[];
  assessmentPolicies: import('./assessment.ts').AssessmentPolicyRow[];
  deckAssessmentPolicies: import('./assessment.ts').DeckAssessmentPolicyRow[];
  reviewPolicies: { kind: 'question' | 'memory'; card_id: string; max_interval_days: number }[];
  folders: Folder[];
  scheduling: { kind: string; card_id: string; data: string; updated_at: string }[];
  scheduleEvents: {
    id: string;
    kind: string;
    card_id: string;
    rating: number;
    before_state: string;
    after_state: string;
    log: string;
    created_at: string;
  }[];
  sessions: { deck_id: string; payload: string; updated_at: string; revision: number }[];
  savedFilters: { id: string; deck_id: string; name: string; payload: string; revision: number }[];
  decks: Deck[];
  knowledge: Knowledge[];
  relations: Relation[];
  questions: Question[];
  attempts: Attempt[];
  analyses: {
    id: string;
    knowledge_id: string;
    content: string;
    stale: number;
    created_at: string;
  }[];
  memories: MemoryCard[];
  memoryReviews: MemoryReview[];
  archives: KnowledgeArchive[];
  importEntries: {
    namespace: string;
    entry_key: string;
    kind: string;
    local_id: string;
    archive_refs: string;
  }[];
  importBatches: {
    id: string;
    package_id: string;
    report: string;
    created_at: string;
    deck_ids: string[];
  }[];
  audits: Audit[];
  settings: { dailyLimit: number; maxInterval: number; algorithm: string; studyTimezone:string };
  meta: { schemaVersion: number; appVersion: string; dataPath: string; pageHasMore?: boolean; dataRevision?: number };
}
export interface Api {
  protocol(request: unknown): Promise<unknown>;
}
declare global {
  interface Window {
    gank: Api;
  }
}

export const MEMORY_MODULES = ['政治理论', '常识'] as const;
export const QUESTION_MODULES = MODULES.filter(
  (m) => !(MEMORY_MODULES as readonly string[]).includes(m),
);
export const isMemoryModule = (module: string) =>
  (MEMORY_MODULES as readonly string[]).includes(module);
export interface MemoryAsset extends Omit<Asset, 'question_id'> { card_id: string; }
export interface MemoryCard {
  assets?: MemoryAsset[];
  learning_version: number;
  id: string;
  module: string;
  title: string;
  cue: string;
  content: string;
  source: string;
  version: number;
  deleted_at: string | null;
  knowledge_ids: string[];
  due_at: string;
  mastery: number | null;
  paused: number;
  reason: string;
  interval_days: number;
}
export interface MemoryReview {
  id: string;
  card_id: string;
  created_at: string;
  score: number;
  effective: number;
  mastery_after: number | null;
  note: string;
}
export interface KnowledgeArchive {
  id: string;
  archive_key: string;
  module: string;
  version_label: string;
  content: string;
  checksum: string;
  created_at: string;
  note: string;
}

export const SUBJECT_KEYS: Record<string, string> = {
  政治理论: 'politics',
  常识: 'general',
  片段阅读: 'reading',
  逻辑填空: 'cloze',
  资料分析: 'data-analysis',
  判断推理: 'reasoning',
  图推: 'figures',
  类比推理: 'analogy',
  数量: 'math',
};
export const defaultArchiveId = (subject: string) =>
  'subject-' + (SUBJECT_KEYS[subject] ?? subject);

export interface KnowledgeInsight {
 node:Knowledge;
 linked:{id:string;title:string}[];
 memories:Pick<MemoryCard,'id'|'module'|'title'|'cue'|'content'|'source'|'version'|'learning_version'|'deleted_at'>[];
 memoryEvidence:(MemoryReview&{title:string})[];
 evidence:{id:string;question_id:string;created_at:string;score:number;effective:number;title:string;category:string;detail:string}[];
 verifiedQuestions:number;
 effectiveAttempts:number;
 categories:Record<string,number>;
 summary:string;
 suggestion:string;
}
