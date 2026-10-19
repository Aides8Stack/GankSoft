import {
  one,
  all,
  run,
  audit,
  required,
  moduleName,
  type Context,
} from '../../infrastructure/context.ts';
import { saveKnowledge, deleteKnowledge } from './service.ts';
export function saveMap(ctx: Context, p: any) {
  const module = moduleName(p.module, ctx),
    current = all(ctx, 'SELECT * FROM knowledge WHERE module=? AND deleted_at IS NULL', module);
  if (!Array.isArray(p.nodes) || p.nodes.length > 5000 || !p.expected)
    throw new Error('图谱数据不合法');
  if (
    current.length !== Object.keys(p.expected).length ||
    current.some((k) => p.expected[k.id] !== k.version)
  )
    throw new Error('知识点已发生变化，请刷新后重新编辑');
  const incoming = new Map<string, any>();
  for (const n of p.nodes) {
    const key = required(n.id, '节点编号');
    if (incoming.has(key)) throw new Error('节点编号重复');
    incoming.set(key, { ...n, name: required(n.name, '知识点名称') });
  }
  const seenNames = new Set<string>();
  for (const n of incoming.values()) {
    const name = (n.parent_id ?? '') + '\0' + n.name;
    if (seenNames.has(name)) throw new Error('同层知识点名称重复');
    seenNames.add(name);
    const visited = new Set([n.id]);
    let parent = n.parent_id;
    while (parent) {
      if (visited.has(parent)) throw new Error('图谱层级不能循环');
      visited.add(parent);
      const item = incoming.get(parent);
      if (!item) throw new Error('父节点不存在');
      parent = item.parent_id;
    }
    const foreign = one(ctx, 'SELECT module FROM knowledge WHERE id=?', n.id);
    if (foreign && foreign.module !== module) throw new Error('不能覆盖其他卡片集知识点');
  }
  // Release names before renaming or moving whole branches. The transaction restores them on any failure.
  for (const k of current)
    run(ctx, 'UPDATE knowledge SET name=? WHERE id=?', '__map_' + k.id, k.id);
  const mapping = new Map<string, string>();
  function save(key: string): string {
    if (mapping.has(key)) return mapping.get(key)!;
    const n = incoming.get(key),
      old = current.find((k) => k.id === key);
    const parent = n.parent_id ? save(n.parent_id) : null;
    const local = saveKnowledge(ctx, {
      ...old,
      id: old?.id,
      module,
      name: n.name,
      parent_id: parent,
    });
    mapping.set(key, local);
    return local;
  }
  for (const key of incoming.keys()) save(key);
  const removed = current.filter((k) => !incoming.has(k.id));
  let pending = [...removed];
  while (pending.length) {
    const leaves = pending.filter((k) => !pending.some((c) => c.parent_id === k.id));
    if (!leaves.length) throw new Error('旧图谱层级不合法');
    for (const k of leaves) {
      deleteKnowledge(ctx, { id: k.id });
      run(ctx, 'UPDATE knowledge SET name=? WHERE id=?', k.name, k.id);
    }
    pending = pending.filter((k) => !leaves.includes(k));
  }
  audit(ctx, '保存思维导图', { module, nodes: p.nodes.length, removed: removed.length });
  return true;
}
