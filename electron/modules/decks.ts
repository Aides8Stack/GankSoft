import {applyCardBatch,restoreCards} from './cards-unified/lifecycle.ts';
import {
  id,
  required,
  one,
  all,
  run,
  audit,
  checkVersion,
  type Context,
} from '../infrastructure/context.ts';
export function saveDeck(ctx: Context, p: any) {
  const before = p.id
    ? one(ctx, 'SELECT * FROM decks WHERE id=? AND deleted_at IS NULL', p.id)
    : null;
  if (p.id && !before) throw new Error('卡片集不存在');
  if (before) checkVersion(before, p.version);
  if (p.parent_id) throw new Error('卡片集不能包含子集，请移动到文件夹');
  const key = before?.id ?? id(),
    name = required(p.name, '卡片集名称'),
    kind = p.kind ?? before?.kind;
  if (name.length > 100 || !['memory', 'question'].includes(kind))
    throw new Error('卡片集名称或类型不合法');
  if (before && before.kind !== kind) throw new Error('已有卡片集不能更改类型');
  const folder = p.folder_id || null;
  if (folder && !one(ctx, 'SELECT id FROM folders WHERE id=? AND deleted_at IS NULL', folder))
    throw new Error('目标文件夹不存在');
  if (
    one(
      ctx,
      "SELECT id FROM decks WHERE coalesce(folder_id,'')=? AND name=? AND deleted_at IS NULL AND id<>?",
      folder ?? '',
      name,
      key,
    )
  )
    throw new Error('同文件夹卡片集名称重复');
  if (before)
    run(
      ctx,
      'UPDATE decks SET name=?,folder_id=?,sort_order=?,version=version+1 WHERE id=?',
      name,
      folder,
      Number(p.sort_order) || 0,
      key,
    );
  else
    run(
      ctx,
      'INSERT INTO decks(id,name,kind,folder_id,sort_order) VALUES (?,?,?,?,?)',
      key,
      name,
      kind,
      folder,
      Number(p.sort_order) || 0,
    );
  run(ctx, 'INSERT OR IGNORE INTO deck_review_policies VALUES (?,15,365)', key);
  audit(ctx, '保存卡片集', { id: key, before, name });
  return key;
}
export function deckAction(ctx: Context, p: any) {
  const d = one(ctx, 'SELECT * FROM decks WHERE id=?', required(p.id, '卡片集'));
  if (!d) throw new Error('卡片集不存在');
  if (p.action === 'delete') {
    if (d.deleted_at) throw new Error('卡片集已删除');
    const records: Record<string, string[]> = {};
    const now = ctx.now().toISOString();
    if(Number(ctx.db.prepare('PRAGMA user_version').get()?.user_version)===606){
      const cards=ctx.db.prepare('SELECT id AS cardId,revision AS expectedRevision FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL ORDER BY id').all(d.id) as {cardId:string;expectedRevision:number}[];
      records.learning_cards=cards.map(c=>c.cardId);
      for(let offset=0;offset<cards.length;offset+=500)applyCardBatch(ctx,{deckId:d.id,action:'delete',cards:cards.slice(offset,offset+500)});
    }
    for (const table of ['questions', 'memory_cards', 'knowledge']) {
      records[table] = all(
        ctx,
        `SELECT id FROM ${table} WHERE module=? AND deleted_at IS NULL`,
        d.id,
      ).map((r) => r.id);
      run(
        ctx,
        `UPDATE ${table} SET deleted_at=?,version=version+1 WHERE module=? AND deleted_at IS NULL`,
        now,
        d.id,
      );
    }
    run(
      ctx,
      'INSERT OR REPLACE INTO recycle_batches VALUES (?,?,?)',
      'deck',
      d.id,
      JSON.stringify(records),
    );
    run(ctx, 'UPDATE decks SET deleted_at=?,version=version+1 WHERE id=?', now, d.id);
  } else if (p.action === 'restore') {
    const record = one(
      ctx,
      "SELECT payload FROM recycle_batches WHERE kind='deck' AND item_id=?",
      d.id,
    );
    let folder = d.folder_id;
    if (folder && !one(ctx, 'SELECT id FROM folders WHERE id=? AND deleted_at IS NULL', folder))
      folder = null;
    let name = d.name;
    while (
      one(
        ctx,
        "SELECT id FROM decks WHERE coalesce(folder_id,'')=? AND name=? AND deleted_at IS NULL AND id<>?",
        folder ?? '',
        name,
        d.id,
      )
    )
      name += '（恢复）';
    run(
      ctx,
      'UPDATE decks SET deleted_at=NULL,folder_id=?,name=?,version=version+1 WHERE id=?',
      folder,
      name,
      d.id,
    );
    if (record)
      for (const [table, ids] of Object.entries(JSON.parse(record.payload)) as [
        string,
        string[],
      ][]) {
        if(table==='learning_cards'&&Number(ctx.db.prepare('PRAGMA user_version').get()?.user_version)===606){
          const cards=ids.map(cardId=>{const row=ctx.db.prepare('SELECT revision,deleted_at,deck_id FROM learning_cards WHERE id=?').get(cardId);
            if(!row||row.deck_id!==d.id||!row.deleted_at)throw new Error('卡片集回收清单已变化，请刷新后核对');return {cardId,expectedRevision:Number(row.revision)};});
          for(let offset=0;offset<cards.length;offset+=500)restoreCards(ctx,{deckId:d.id,cards:cards.slice(offset,offset+500)});
          continue;
        }
        if (!['questions', 'memory_cards', 'knowledge'].includes(table))
          throw new Error('恢复清单不合法');
        for (const key of ids)
          run(ctx, `UPDATE ${table} SET deleted_at=NULL,version=version+1 WHERE id=?`, key);
      }
    run(ctx, "DELETE FROM recycle_batches WHERE kind='deck' AND item_id=?", d.id);
  } else throw new Error('无效操作');
  audit(ctx, '调整卡片集', { id: d.id, action: p.action });
  return true;
}
