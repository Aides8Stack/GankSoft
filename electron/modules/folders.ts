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
import { deckAction } from './decks.ts';
export function saveFolder(ctx: Context, p: any) {
  const old = p.id
    ? one(ctx, 'SELECT * FROM folders WHERE id=? AND deleted_at IS NULL', p.id)
    : null;
  if (p.id && !old) throw new Error('文件夹不存在');
  if (old) checkVersion(old, p.version);
  const key = old?.id ?? id(),
    name = required(p.name, '文件夹名称'),
    parent = p.parent_id || null;
  if (name.length > 100) throw new Error('名称不能超过100字');
  let ancestor = parent;
  const seen = new Set([key]);
  while (ancestor) {
    if (seen.has(ancestor)) throw new Error('文件夹层级不能循环');
    seen.add(ancestor);
    const row = one(ctx, 'SELECT * FROM folders WHERE id=? AND deleted_at IS NULL', ancestor);
    if (!row) throw new Error('父文件夹不存在');
    ancestor = row.parent_id;
  }
  if (
    one(
      ctx,
      "SELECT id FROM folders WHERE coalesce(parent_id,'')=? AND name=? AND deleted_at IS NULL AND id<>?",
      parent ?? '',
      name,
      key,
    )
  )
    throw new Error('同层文件夹名称重复');
  if (old)
    run(
      ctx,
      'UPDATE folders SET name=?,parent_id=?,sort_order=?,version=version+1 WHERE id=?',
      name,
      parent,
      Number(p.sort_order) || 0,
      key,
    );
  else
    run(
      ctx,
      'INSERT INTO folders(id,name,parent_id,sort_order) VALUES (?,?,?,?)',
      key,
      name,
      parent,
      Number(p.sort_order) || 0,
    );
  audit(ctx, '保存文件夹', { id: key, name });
  return key;
}
export function folderAction(ctx: Context, p: any) {
  const folder = one(ctx, 'SELECT * FROM folders WHERE id=?', required(p.id, '文件夹'));
  if (!folder) throw new Error('文件夹不存在');
  if (p.action === 'delete') {
    if (folder.deleted_at) throw new Error('文件夹已删除');
    const ids = new Set<string>([folder.id]);
    const fs = all(ctx, 'SELECT * FROM folders WHERE deleted_at IS NULL');
    let size = -1;
    if (p.cascade)
      while (size !== ids.size) {
        size = ids.size;
        for (const f of fs) if (ids.has(f.parent_id)) ids.add(f.id);
      }
    const decks = p.cascade
      ? all(ctx, 'SELECT * FROM decks WHERE deleted_at IS NULL').filter((d) => ids.has(d.folder_id))
      : [];
    for (const d of decks) deckAction(ctx, { id: d.id, action: 'delete' });
    if (!p.cascade) {
      run(
        ctx,
        'UPDATE folders SET parent_id=?,version=version+1 WHERE parent_id=? AND deleted_at IS NULL',
        folder.parent_id,
        folder.id,
      );
      run(
        ctx,
        'UPDATE decks SET folder_id=?,version=version+1 WHERE folder_id=? AND deleted_at IS NULL',
        folder.parent_id,
        folder.id,
      );
    }
    for (const key of ids)
      run(
        ctx,
        'UPDATE folders SET deleted_at=?,version=version+1 WHERE id=?',
        ctx.now().toISOString(),
        key,
      );
    run(
      ctx,
      'INSERT OR REPLACE INTO recycle_batches VALUES (?,?,?)',
      'folder',
      folder.id,
      JSON.stringify({ folders: [...ids], decks: decks.map((d) => d.id) }),
    );
  } else if (p.action === 'restore') {
    const row = one(
      ctx,
      "SELECT payload FROM recycle_batches WHERE kind='folder' AND item_id=?",
      folder.id,
    );
    const data = row ? JSON.parse(row.payload) : { folders: [folder.id], decks: [] };
    for (const key of data.folders)
      run(ctx, 'UPDATE folders SET deleted_at=NULL,version=version+1 WHERE id=?', key);
    for (const key of data.folders) {
      const f = one(ctx, 'SELECT * FROM folders WHERE id=?', key);
      if (
        f.parent_id &&
        !one(ctx, 'SELECT id FROM folders WHERE id=? AND deleted_at IS NULL', f.parent_id)
      )
        run(ctx, 'UPDATE folders SET parent_id=NULL WHERE id=?', key);
    }
    for (const key of data.decks) deckAction(ctx, { id: key, action: 'restore' });
    run(ctx, "DELETE FROM recycle_batches WHERE kind='folder' AND item_id=?", folder.id);
  } else throw new Error('无效操作');
  audit(ctx, '调整文件夹', { id: folder.id, action: p.action });
  return true;
}
