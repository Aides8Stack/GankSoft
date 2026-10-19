import { historicalImageReferences } from './questions/content.ts';
import { createHash } from 'node:crypto';
import { all, one, run, audit, invalidate, type Context } from '../infrastructure/context.ts';
import { folderAction } from './folders.ts';
import { deckAction } from './decks.ts';
import { restoreKnowledge } from './knowledge/service.ts';
import { restoreQuestion } from './questions/service.ts';
import { memoryAction } from './memory/service.ts';
import { importBatches } from './imports/service.ts';

const tables = {
  folder: 'folders',
  deck: 'decks',
  knowledge: 'knowledge',
  question: 'questions',
  memory: 'memory_cards',
} as const;
type Kind = keyof typeof tables;
type Item = { kind: Kind; id: string };
function selection(ctx: Context, input: unknown): Item[] {
  if (!Array.isArray(input) || !input.length || input.length > 10000)
    throw new Error('请选择1至10000条回收站记录');
  const found = new Map<string, Item>();
  for (const item of input) {
    if (!item || !Object.hasOwn(tables, item.kind) || typeof item.id !== 'string')
      throw new Error('回收站记录不合法');
    const kind = item.kind as Kind;
    if (!one(ctx, `SELECT id FROM ${tables[kind]} WHERE id=? AND deleted_at IS NOT NULL`, item.id))
      throw new Error('所选记录已恢复或删除，请刷新回收站');
    found.set(kind + ':' + item.id, { kind, id: item.id });
  }
  return [...found.values()];
}
function scope(ctx: Context, items: Item[]) {
  const sets: Record<Kind, Set<string>> = {
    folder: new Set(),
    deck: new Set(),
    knowledge: new Set(),
    question: new Set(),
    memory: new Set(),
  };
  for (const item of items) sets[item.kind].add(item.id);
  const folders = all(ctx, 'SELECT * FROM folders WHERE deleted_at IS NOT NULL');
  let size = -1;
  while (size !== sets.folder.size) {
    size = sets.folder.size;
    for (const f of folders) if (sets.folder.has(f.parent_id)) sets.folder.add(f.id);
  }
  for (const d of all(ctx, 'SELECT * FROM decks WHERE deleted_at IS NOT NULL'))
    if (sets.folder.has(d.folder_id)) sets.deck.add(d.id);
  for (const kind of ['question', 'memory', 'knowledge'] as Kind[])
    for (const row of all(ctx, `SELECT * FROM ${tables[kind]} WHERE deleted_at IS NOT NULL`))
      if (sets.deck.has(row.module)) sets[kind].add(row.id);
  // Never remove a live child implicitly, even if an old or edited database is inconsistent.
  for (const kind of ['question', 'memory', 'knowledge'] as Kind[])
    if (
      all(ctx, `SELECT module FROM ${tables[kind]} WHERE deleted_at IS NULL`).some((r) =>
        sets.deck.has(r.module),
      )
    )
      throw new Error('所选卡片集仍有有效内容，请先恢复并移动内容');
  return sets;
}
export function previewTrash(ctx: Context, p: any) {
  const items = selection(ctx, p.items),
    sets = scope(ctx, items);
  const counts = Object.fromEntries(Object.entries(sets).map(([k, ids]) => [k, ids.size]));
  const history =
    all(ctx, 'SELECT question_id FROM attempts').filter((r) => sets.question.has(r.question_id))
      .length +
    all(ctx, 'SELECT card_id FROM memory_reviews').filter((r) => sets.memory.has(r.card_id)).length;
  const revision = createHash('sha256')
    .update(
      JSON.stringify({
        items,
        audit: one(ctx, 'SELECT max(id) AS n FROM audits').n,
        rows: Object.entries(sets).map(([kind, ids]) =>
          [...ids]
            .sort()
            .map((id) => one(ctx, `SELECT * FROM ${tables[kind as Kind]} WHERE id=?`, id)),
        ),
      }),
    )
    .digest('hex');
  return { counts, history, total: Object.values(counts).reduce((a, b) => a + b, 0), revision };
}
function restore(ctx: Context, items: Item[], name?: string) {
  // Parent containers go first. A parent's restore may already restore a selected child.
  const depth = (item: Item) => {
    let row = one(ctx, `SELECT * FROM ${tables[item.kind]} WHERE id=?`, item.id),
      n = 0;
    const seen = new Set<string>();
    while (row?.parent_id && !seen.has(row.parent_id)) {
      seen.add(row.parent_id);
      n++;
      row = one(ctx, `SELECT * FROM ${tables[item.kind]} WHERE id=?`, row.parent_id);
    }
    return n;
  };
  items.sort(
    (a, b) =>
      Object.keys(tables).indexOf(a.kind) - Object.keys(tables).indexOf(b.kind) ||
      depth(a) - depth(b),
  );
  for (const item of items) {
    if (
      !one(
        ctx,
        `SELECT id FROM ${tables[item.kind]} WHERE id=? AND deleted_at IS NOT NULL`,
        item.id,
      )
    )
      continue;
    if (item.kind === 'folder') folderAction(ctx, { id: item.id, action: 'restore' });
    else if (item.kind === 'deck') deckAction(ctx, { id: item.id, action: 'restore' });
    else if (item.kind === 'knowledge')
      restoreKnowledge(ctx, { id: item.id, name: items.length === 1 ? name : undefined });
    else if (item.kind === 'question') restoreQuestion(ctx, { id: item.id });
    else memoryAction(ctx, { id: item.id, action: 'restore' });
  }
}
export function manageTrash(ctx: Context, p: any) {
  const items = selection(ctx, p.items);
  if (p.action === 'restore') {
    restore(ctx, items, p.name);
    audit(ctx, '批量恢复回收站', { items });
    return { count: items.length, attachments: [] as string[] };
  }
  if (p.action !== 'purge') throw new Error('回收站操作不合法');
  const preview = previewTrash(ctx, p);
  if (!p.expected || p.expected !== preview.revision) throw new Error('删除范围已变化，请重新确认');
  const sets = scope(ctx, items),
    attachments: string[] = [];
  const namespaces = new Set<string>();
  for (const entry of all(ctx, 'SELECT * FROM import_entries')) {
    if (
      (entry.kind === 'question' && sets.question.has(entry.local_id)) ||
      (entry.kind === 'memory' && sets.memory.has(entry.local_id))
    ) {
      namespaces.add(entry.namespace);
      run(
        ctx,
        'DELETE FROM import_entries WHERE namespace=? AND entry_key=?',
        entry.namespace,
        entry.entry_key,
      );
    }
  }
  // Remove affected package receipts so an intentional later import can recreate purged cards.
  for (const batch of importBatches(ctx)) {
    const report = JSON.parse(batch.report);
    if (namespaces.has(report.namespace) || batch.deck_ids.some((id: string) => sets.deck.has(id)))
      run(ctx, 'DELETE FROM import_batches WHERE id=?', batch.id);
  }
  for (const id of sets.question) {
    const q = one(ctx, 'SELECT * FROM questions WHERE id=?', id);
    for (const r of all(ctx, 'SELECT question_snapshot FROM attempts WHERE question_id=?', id)) {
      try {
        for (const asset of JSON.parse(r.question_snapshot || '{}').assets ?? [])
          attachments.push(asset.file_name);
      } catch {}
    }
    for (const a of all(ctx, 'SELECT file_name FROM assets WHERE question_id=?', id))
      attachments.push(a.file_name);
    run(ctx, 'DELETE FROM assets WHERE question_id=?', id);
    run(ctx, 'DELETE FROM question_knowledge WHERE question_id=?', id);
    run(
      ctx,
      'DELETE FROM attempt_faults WHERE attempt_id IN (SELECT id FROM attempts WHERE question_id=?)',
      id,
    );
    run(ctx, "DELETE FROM review_due_overrides WHERE kind='question' AND card_id=?", id);
    run(ctx, 'DELETE FROM attempts WHERE question_id=?', id);
    run(ctx, 'DELETE FROM plans WHERE question_id=?', id);
    run(ctx, 'UPDATE memory_cards SET legacy_question_id=NULL WHERE legacy_question_id=?', id);
    run(ctx, 'DELETE FROM questions WHERE id=?', id);
    if (q.material_id)
      run(
        ctx,
        'DELETE FROM materials WHERE id=? AND NOT EXISTS (SELECT 1 FROM questions WHERE material_id=?)',
        q.material_id,
        q.material_id,
      );
  }
  for (const id of sets.memory) {
    run(ctx, 'DELETE FROM memory_knowledge WHERE card_id=?', id);
    run(ctx, "DELETE FROM review_due_overrides WHERE kind='memory' AND card_id=?", id);
    run(ctx, 'DELETE FROM memory_reviews WHERE card_id=?', id);
    run(ctx, 'DELETE FROM memory_plans WHERE card_id=?', id);
    run(ctx, 'DELETE FROM memory_cards WHERE id=?', id);
  }
  for (const kind of ['question', 'memory'] as const)
    for (const id of sets[kind]) {
      run(ctx, 'DELETE FROM card_review_policies WHERE kind=? AND card_id=?', kind, id);
      run(ctx, 'DELETE FROM scheduling WHERE kind=? AND card_id=?', kind, id);
      run(ctx, 'DELETE FROM schedule_events WHERE kind=? AND card_id=?', kind, id);
      run(ctx, 'DELETE FROM review_receipts WHERE kind=? AND card_id=?', kind, id);
    }
  for (const id of sets.knowledge) {
    run(ctx, 'DELETE FROM question_knowledge WHERE knowledge_id=?', id);
    run(ctx, 'DELETE FROM memory_knowledge WHERE knowledge_id=?', id);
    run(ctx, 'UPDATE attempt_faults SET knowledge_id=NULL WHERE knowledge_id=?', id);
    run(ctx, 'DELETE FROM relations WHERE source_id=? OR target_id=?', id, id);
    run(ctx, 'DELETE FROM analyses WHERE knowledge_id=?', id);
    run(ctx, 'DELETE FROM knowledge_keys WHERE knowledge_id=?', id);
    run(ctx, 'UPDATE knowledge SET parent_id=NULL WHERE parent_id=?', id);
    run(ctx, 'DELETE FROM knowledge WHERE id=?', id);
  }
  for (const id of sets.deck) {
    run(ctx, 'DELETE FROM study_sessions WHERE deck_id=?', id);
    run(ctx, 'DELETE FROM saved_filters WHERE deck_id=?', id);
    run(ctx, 'DELETE FROM knowledge_archives WHERE module=?', id);
    run(ctx, 'UPDATE decks SET parent_id=NULL WHERE parent_id=?', id);
    run(ctx, 'DELETE FROM decks WHERE id=?', id);
  }
  for (const id of sets.folder) {
    run(ctx, 'UPDATE folders SET parent_id=NULL WHERE parent_id=?', id);
    run(ctx, 'UPDATE decks SET folder_id=NULL WHERE folder_id=?', id);
    run(ctx, 'DELETE FROM folders WHERE id=?', id);
  }
  // Purged descendants must never be referenced by a later container restore.
  for (const batch of all(ctx, 'SELECT * FROM recycle_batches')) {
    if (
      (batch.kind === 'folder' && sets.folder.has(batch.item_id)) ||
      (batch.kind === 'deck' && sets.deck.has(batch.item_id))
    ) {
      run(ctx, 'DELETE FROM recycle_batches WHERE kind=? AND item_id=?', batch.kind, batch.item_id);
      continue;
    }
    const data = JSON.parse(batch.payload);
    const mapping: Record<string, Kind> = {
      folders: 'folder',
      decks: 'deck',
      questions: 'question',
      memory_cards: 'memory',
      knowledge: 'knowledge',
    };
    for (const key of Object.keys(data))
      if (mapping[key] && Array.isArray(data[key]))
        data[key] = data[key].filter((id: string) => !sets[mapping[key]].has(id));
    run(
      ctx,
      'UPDATE recycle_batches SET payload=? WHERE kind=? AND item_id=?',
      JSON.stringify(data),
      batch.kind,
      batch.item_id,
    );
  }
  const removed = new Set([...sets.question, ...sets.memory]);
  for (const row of all(ctx, 'SELECT rowid,* FROM study_sessions')) {
    const s = JSON.parse(row.payload);
    const oldErrors = Array.isArray(s.errorIds) ? s.errorIds : [];
    s.errorIds = oldErrors.filter((id: string) => !sets.knowledge.has(id));
    if (!Array.isArray(s.ids) || !s.ids.some((id: string) => removed.has(id))) {
      if (oldErrors.length !== s.errorIds.length)
        run(
          ctx,
          'UPDATE study_sessions SET payload=?,revision=revision+1 WHERE rowid=?',
          JSON.stringify(s),
          row.rowid,
        );
      continue;
    }
    const currentRemoved = removed.has(s.ids[s.index]);
    s.index = s.ids.slice(0, s.index).filter((id: string) => !removed.has(id)).length;
    s.ids = s.ids.filter((id: string) => !removed.has(id));
    if (!s.ids.length) {
      run(ctx, 'DELETE FROM study_sessions WHERE rowid=?', row.rowid);
      continue;
    }
    if (currentRemoved)
      Object.assign(s, {
        stage: 'answer',
        answer: '',
        thought: '',
        basis: 'independent',
        understanding: 2,
        improvement: '',
        faults: [],
        errorIds: [],
        faultDetail: '',
        note: '',
        seconds: 0,
      });
    run(
      ctx,
      'UPDATE study_sessions SET payload=?,revision=revision+1 WHERE rowid=?',
      JSON.stringify(s),
      row.rowid,
    );
  }
  invalidate(ctx);
  audit(ctx, '彻底删除回收站', { items, counts: preview.counts, history: preview.history });
  return {
    count: preview.total,
    attachments: [...new Set(attachments)].filter(
      (name) =>
        !one(ctx, 'SELECT id FROM assets WHERE file_name=?', name) &&
        !historicalImageReferences(ctx).some((a) => a.file_name === name),
    ),
  };
}
