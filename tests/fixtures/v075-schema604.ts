import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Transformer } from '@napi-rs/image';
import { DeckConfig, DiagnosisRule } from '../../shared/review-config.ts';

/** Frozen old DDL + entirely synthetic evidence; never call the evolving openDatabase. */
export function schema604Fixture() {
  const root = mkdtempSync(join(tmpdir(), 'gank075-604-'));
  const dataDir = join(root, 'source');
  mkdirSync(join(dataDir, 'attachments'), { recursive: true });
  const databasePath = join(dataDir, 'ganksoft.sqlite');
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
  // Git Windows CRLF checkout must not alter the frozen sqlite_master SQL identity.
  db.exec(readFileSync(new URL('./schema604.sql', import.meta.url), 'utf8').replace(/\r\n?/g, '\n'));
  const uuid = (n: number) => `10000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;
  const ids = {
    folder: uuid(1), qDeck: uuid(2), mDeck: uuid(3), trashDeck: uuid(4),
    question: uuid(10), memory: uuid(11), trashQuestion: uuid(12),
    root1: uuid(20), root2: uuid(21), child1: uuid(22), child2: uuid(23),
    memoryNode: uuid(24), deletedNode: uuid(25),
    attempt1: uuid(30), attempt2: uuid(31), memoryReview1: uuid(32), memoryReview2: uuid(33),
    currentImage: uuid(40), historicalImage: uuid(41), responseImage: uuid(42), unboundImage: uuid(43),
  };
  const at = '2026-10-18T02:00:00.000Z';
  const insert = (table: string, row: Record<string, unknown>) => {
    const keys = Object.keys(row);
    db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`)
      .run(...Object.values(row) as (string | number | null)[]);
  };
  insert('settings', { key: 'studyTimezone', value: 'Asia/Shanghai' });
  insert('settings', { key: 'review', value: '{"dailyLimit":15,"maxInterval":365}' });
  insert('folders', { id: ids.folder, name: '合成考试目录' });
  for (const [id, kind, name] of [
    [ids.qDeck,'question','合成错题'], [ids.mDeck,'memory','合成记忆'], [ids.trashDeck,'question','合成已删集'],
  ]) {
    insert('decks', { id, name, kind, folder_id: ids.folder, deleted_at: id === ids.trashDeck ? at : null });
    insert('deck_review_policies', { deck_id: id, daily_limit: 15, max_interval_days: 180 });
  }
  insert('deck_review_config_v2', { deck_id: ids.qDeck, payload: JSON.stringify(DeckConfig.parse({ desiredRetention: .95 })), revision: 2, updated_at: at });
  insert('diagnosis_config', { id: 1, payload: JSON.stringify(DiagnosisRule.parse({})), revision: 1, updated_at: at });
  for (const [id, parent, module, name, deleted] of [
    [ids.root1,null,ids.qDeck,'合成根甲',null], [ids.root2,null,ids.qDeck,'合成根乙',null],
    [ids.child1,ids.root1,ids.qDeck,'同名子节点',null], [ids.child2,ids.root2,ids.qDeck,'同名子节点',null],
    [ids.memoryNode,null,ids.mDeck,'记忆节点',null], [ids.deletedNode,ids.root1,ids.qDeck,'旧节点',at],
  ]) insert('knowledge', { id, parent_id: parent, module, name, principle: '保留原理 # 正文标题', conditions: '条件原文', method: '方法原文', traps: '陷阱原文', created_at: at, updated_at: at, deleted_at: deleted });
  insert('materials', { id: uuid(50), content: '仅用于测试的公共材料' });
  insert('questions', { id: ids.question, module: ids.qDeck, title: '合成旧题', stem: '现期150，增长25%', options: 'A.100\nB.120\nC.130\nD.150', answer: 'B', analysis: '150/1.25', initial_thought: '首次错因原文', material_id: uuid(50), content_version: 2, created_at: at, updated_at: at });
  insert('questions', { id: ids.trashQuestion, module: ids.trashDeck, title: '回收站旧题', stem: '不能遗失', answer: 'A', deleted_at: at, created_at: at, updated_at: at });
  insert('memory_cards', { id: ids.memory, module: ids.mDeck, title: '合成旧问答', cue: '旧问题', content: '旧答案', learning_version: 2, legacy_question_id: ids.question, created_at: at, updated_at: at });
  for (const k of [ids.child1,ids.child2]) insert('question_knowledge', { question_id: ids.question, knowledge_id: k });
  insert('memory_knowledge', { card_id: ids.memory, knowledge_id: ids.memoryNode });
  insert('relations', { id: uuid(51), source_id: ids.child1, target_id: ids.child2, kind: '同层', note: '合成关系' });
  const image = Transformer.fromRgbaPixels(Buffer.from([15, 40, 90, 255]), 1, 1).pngSync();
  for (const id of [ids.currentImage,ids.historicalImage,ids.responseImage,ids.unboundImage])
    writeFileSync(join(dataDir, 'attachments', id + '.png'), image);
  insert('assets', { id: ids.currentImage, question_id: ids.question, role: 'question', file_name: ids.currentImage + '.png', mime: 'image/png', sort_order: 0 });
  for (const [id, purpose] of [[ids.responseImage,'response'],[ids.unboundImage,'analysis']])
    insert('settings', { key: 'media-draft:' + id, value: JSON.stringify({ id, purpose, deckId: ids.qDeck, file_name: id + '.png', mime: 'image/png' }) });
  for (const [id, correct, score, self, snapshot] of [
    [ids.attempt1,1,4,9.3,JSON.stringify({ schemaVersion: 1, id: ids.question, contentVersion: 1, title: '历史旧题', stem: '历史120增长20%', options: 'A.80\nB.100\nC.120\nD.144', answer: 'B', assets: [ids.historicalImage,ids.responseImage].map((a, i) => ({ id: a, file_name: a + '.png', mime: 'image/png', role: i ? 'response' : 'analysis' })) })],
    [ids.attempt2,0,0,null,''],
  ] as const) insert('attempts', { id, question_id: ids.question, created_at: at, answer: correct ? 'B' : 'A', correct, basis: 'independent', understanding: 2, score, effective: correct, thought: '合成原始思路', improvement: '合成原始反思', fault_detail: '原始错因', algorithm: 'legacy-fixture', parameters: '{"legacyScale":"0-4"}', question_version: 1, answer_snapshot: 'B', content_version: 1, question_snapshot: snapshot, knowledge_snapshot: JSON.stringify([{ id: ids.child1, name: '旧节点名' }]), self_score: self, elapsed_seconds: 0, elapsed_value: null, elapsed_source: 'legacy_unknown' });
  insert('attempt_faults', { id: uuid(52), attempt_id: ids.attempt2, knowledge_id: ids.child1, knowledge_snapshot: '当时名称', category: '知识缺失', detail: '不可改写' });
  for (const [id, score, snapshot] of [[ids.memoryReview1,4,JSON.stringify({ id: ids.memory, cue: '历史问题', content: '历史答案', contentVersion: 1 })],[ids.memoryReview2,0,'']] as const)
    insert('memory_reviews', { id, card_id: ids.memory, created_at: at, score, effective: score ? 1 : 0, content_snapshot: '历史答案', card_version: 1, algorithm: 'legacy-memory-0-4', note: '原始笔记', card_snapshot: snapshot });
  const state = JSON.stringify({ due: '2026-11-01T02:00:00.000Z', stability: 10, difficulty: 5, elapsed_days: 1, scheduled_days: 14, reps: 2, lapses: 0, state: 2, last_review: at });
  for (const [kind, card, event] of [['question',ids.question,ids.attempt1],['memory',ids.memory,ids.memoryReview1]]) {
    insert('scheduling', { kind, card_id: card, data: state, updated_at: at });
    insert('schedule_events', { id: event, kind, card_id: card, rating: 4, before_state: state, after_state: state, log: '{"source":"legacy-fixture"}', created_at: at });
    insert('review_receipts', { request_id: 'fixture-' + kind, kind, card_id: card, payload_hash: 'retained-raw-hash', response: JSON.stringify({ attemptId: event, score: 4, effective: true }), created_at: at });
  }
  insert('plans', { question_id: ids.question, due_at: '2026-11-01T02:00:00.000Z', interval_days: 14, mastery: null, paused: 0, reason: '原排期', algorithm: 'FSRS' });
  insert('memory_plans', { card_id: ids.memory, due_at: '2026-11-01T02:00:00.000Z', interval_days: 14, mastery: null, paused: 1, reason: '原暂停' });
  insert('card_review_policies', { kind: 'question', card_id: ids.question, max_interval_days: 30 });
  insert('attempt_evidence_snapshots', { attempt_id: ids.attempt1, deck_id: ids.qDeck, knowledge_ids: JSON.stringify([ids.child1]), link_revision: 'original-link-revision', study_timezone: 'Asia/Shanghai', practice: 0 });
  insert('study_sessions', { deck_id: ids.qDeck, payload: JSON.stringify({ schemaVersion: 1, sessionId: uuid(60), entryId: uuid(61), ids: [ids.question], index: 0, stage: 'answer', contentVersion: 2, thought: '未提交草稿原文', responseImages: [ids.responseImage], totalSeconds: 123, seconds: 17, timerPaused: true }), updated_at: at, revision: 3 });
  insert('recycle_batches', { kind: 'deck', item_id: ids.trashDeck, payload: JSON.stringify({ questions: [ids.trashQuestion], knowledge: [], memory_cards: [] }) });
  insert('saved_filters', { id: uuid(62), deck_id: ids.qDeck, name: '保留筛选', payload: '{"mode":"all"}', revision: 1 });
  insert('audits', { action: '合成数据标记', detail: '{"synthetic":true}', created_at: at });
  insert('protocol_meta', { singleton: 1, epoch: uuid(70), revision: 7, schema_version: 1 });
  insert('protocol_receipts', { epoch: uuid(70), request_id: uuid(71), method: 'messages.read', digest: createHash('sha256').update('synthetic').digest('hex'), response: JSON.stringify({ ok: true, requestId: uuid(71), dataEpoch: uuid(70), dataRevision: 7, data: true }) });
  insert('platform_operations', { request_id: uuid(72), epoch: uuid(70), method: 'maintenance.backup', digest: 'synthetic-pending', state: 'pending', created_at: at });
  return { root, dataDir, databasePath, db, ids, at, insert, close() { db.close(); rmSync(root, { recursive: true, force: true }); } };
}
