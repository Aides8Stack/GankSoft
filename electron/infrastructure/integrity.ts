import { DeckConfig, KnowledgePreference, DiagnosisRule } from "../../shared/review-config.ts";
import { parseAssessment } from '../../shared/assessment.ts';
import type { DatabaseSync } from 'node:sqlite';
export function validateBusinessData(db: DatabaseSync) {
  for(const row of db.prepare('SELECT key,value FROM settings').all()) {
    if(row.key==='studyTimezone'){try{new Intl.DateTimeFormat('en',{timeZone:String(row.value)});}catch{throw new Error('备份学习时区无效');}}
    else if(row.key==='review'){try{const p=JSON.parse(String(row.value));if(!p||typeof p!=='object')throw Error();}catch{throw new Error('备份调度设置损坏');}}
  }
  const parse = (value: unknown, location: string) => {
    try {
      if (typeof value !== 'string') throw new Error();
      const p = JSON.parse(value);
      if (p === null || typeof p !== 'object') throw new Error();
      return p;
    } catch {
      throw new Error('备份业务数据损坏：' + location);
    }
  };
  for (const r of db.prepare('SELECT * FROM study_sessions').all() as any[]) {
    const s = parse(r.payload, 'study_sessions/' + r.deck_id);
    if (
      !Number.isInteger(r.revision) ||
      r.revision < 0 ||
      !Array.isArray(s.ids) ||
      s.ids.length > 5000 ||
      s.ids.some((v: unknown) => typeof v !== 'string') ||
      new Set(s.ids).size !== s.ids.length ||
      !Number.isInteger(s.index) ||
      s.index < 0 ||
      s.index > s.ids.length ||
      !['answer', 'reveal', 'result'].includes(s.stage) ||
      (s.schemaVersion != null && s.schemaVersion !== 1)
    )
      throw new Error('备份会话结构不合法：' + r.deck_id);
    // Legacy drafts remain readable; modern entries must have identity and a valid receipt.
    if (s.schemaVersion === 1) {
      if (
        typeof s.sessionId !== 'string' ||
        !s.sessionId ||
        typeof s.entryId !== 'string' ||
        !s.entryId ||
        !Number.isInteger(s.contentVersion) ||
        s.contentVersion < 0 ||
        (s.seconds != null && (!Number.isInteger(s.seconds) || s.seconds < 0 || s.seconds > 86400))
      )
        throw new Error('备份会话身份不合法：' + r.deck_id);
      if (s.stage === 'result') {
        const receipt = db
          .prepare('SELECT * FROM review_receipts WHERE request_id=?')
          .get(s.entryId) as any;
        const deck = db.prepare('SELECT kind FROM decks WHERE id=?').get(r.deck_id) as any;
        if (
          !receipt ||
          receipt.card_id !== s.ids[s.index] ||
          receipt.kind !== deck?.kind ||
          (s.savedResult &&
            s.savedResult.attemptId !== parse(receipt.response, 'receipt/' + s.entryId).attemptId)
        )
          throw new Error('备份会话缺少对应回执：' + r.deck_id);
      }
      if (s.pendingSubmission) {
        const p = s.pendingSubmission;
        if (
          s.stage !== 'reveal' ||
          s.index >= s.ids.length ||
          typeof p !== 'object' ||
          (p.question_id ?? p.id) !== s.ids[s.index] ||
          (p.request_id != null && p.request_id !== s.entryId) ||
          (p.content_version != null && p.content_version !== s.contentVersion)
        )
          throw new Error('备份会话待提交身份不一致：' + r.deck_id);
      }
    }
  }
  for (const row of db.prepare('SELECT id,assessment_snapshot FROM attempts').all() as any[])
    try {
      parseAssessment(row.assessment_snapshot);
    } catch {
      throw new Error('备份复盘评估快照损坏：' + row.id);
    }
  for (const p of db.prepare('SELECT * FROM question_assessment_policies').all() as any[]) {
    if (
      !['custom', 'none'].includes(p.mode) ||
      (p.mode === 'custom'
        ? !Number.isInteger(p.target_seconds) || p.target_seconds < 1 || p.target_seconds > 86400
        : p.target_seconds !== null)
    )
      throw new Error('备份单卡效率配置损坏');
  }
  for (const [table, schema] of [['deck_review_config_v2',DeckConfig],['knowledge_specialty_prefs',KnowledgePreference],['diagnosis_config',DiagnosisRule]] as const)
    for (const r of db.prepare(`SELECT payload FROM ${table}`).all()) schema.parse(JSON.parse(String(r.payload)));
  for(const r of db.prepare('SELECT * FROM review_due_overrides').all() as any[]) {
    if(!Number.isFinite(Date.parse(r.effective_due))||!['question','memory'].includes(r.kind)||!['policy','snooze'].includes(r.source))throw Error('到期覆盖记录损坏');
    parse(r.anchor,'due_override/anchor');
  }
  for(const r of db.prepare('SELECT * FROM review_config_operations').all() as any[]) parse(r.response,'review_config_operations');
  for(const r of db.prepare('SELECT * FROM attempt_evidence_snapshots').all() as any[]) {
    const ids=JSON.parse(r.knowledge_ids);
    if(!Array.isArray(ids)||ids.some(k=>typeof k!=='string')||new Set(ids).size!==ids.length)throw Error('证据关联快照损坏');
    try {new Intl.DateTimeFormat('en',{timeZone:r.study_timezone});} catch {throw Error('证据学习时区无效');}
  }
  const columns: [string, string][] = [
    ['scheduling', 'data'],
    ['schedule_events', 'before_state'],
    ['schedule_events', 'after_state'],
    ['schedule_events', 'log'],
    ['review_receipts', 'response'],
    ['saved_filters', 'payload'],
    ['knowledge_archives', 'content'],
    ['import_batches', 'report'],
    ['attempts', 'question_snapshot'],
    ['attempts', 'knowledge_snapshot'],
    ['attempts', 'parameters'],
  ];
  for (const [table, column] of columns) {
    for (const r of db
      .prepare('SELECT rowid,' + column + ' AS value FROM ' + table)
      .all() as any[]) {
      if (r.value === '' || r.value == null) continue;
      const location = table + '/' + r.rowid + '/' + column;
      const value = parse(r.value, location);
      if (column === 'knowledge_snapshot') {
        if (
          !Array.isArray(value) ||
          value.some((k) => !k || typeof k.id !== 'string' || typeof k.name !== 'string')
        )
          throw new Error('备份知识点快照结构损坏：' + location);
      } else {
        if (Array.isArray(value)) throw new Error('备份对象结构损坏：' + location);
        if (
          column === 'question_snapshot' &&
          (typeof value.stem !== 'string' ||
            typeof value.options !== 'string' ||
            typeof value.answer !== 'string' ||
            (value.assets != null && !Array.isArray(value.assets)))
        )
          throw new Error('备份题目快照结构损坏：' + location);
      }
    }
  }
  for (const r of db.prepare('SELECT * FROM review_receipts').all() as any[]) {
    const result = parse(r.response, 'review_receipts/' + r.request_id);
    if (
      !['question', 'memory'].includes(r.kind) ||
      typeof result.attemptId !== 'string' ||
      !db
        .prepare(
          'SELECT id FROM ' +
            (r.kind === 'question'
              ? 'attempts WHERE question_id'
              : 'memory_reviews WHERE card_id') +
            '=? AND id=?',
        )
        .get(r.card_id, result.attemptId)
    )
      throw new Error('备份回执与复盘记录不一致：' + r.request_id);
  }
  for (const r of db.prepare('SELECT * FROM scheduling').all() as any[]) {
    const s = parse(r.data, 'scheduling/' + r.card_id);
    if (
      !Number.isFinite(new Date(s.due).getTime()) ||
      !Number.isFinite(s.stability) ||
      !Number.isFinite(s.difficulty)
    )
      throw new Error('备份调度状态不合法：' + r.card_id);
  }
}
