import { clampCardToPolicy } from './review/policy.ts';
import { one, all, run, audit, required, type Context } from '../infrastructure/context.ts';
import { deleteQuestion, setPlan } from './questions/service.ts';
import { memoryAction } from './memory/service.ts';
export function bulkCards(ctx: Context, p: any) {
  const deck = one(
    ctx,
    'SELECT * FROM decks WHERE id=? AND deleted_at IS NULL',
    required(p.deck_id, '卡片集'),
  );
  if (!deck) throw new Error('卡片集不存在');
  if (!Array.isArray(p.ids) || !p.ids.length || p.ids.length > 5000)
    throw new Error('请选择1—5000张卡片');
  const memory = deck.kind === 'memory';
  if (!['pause', 'resume', 'delete', 'move'].includes(p.action)) throw new Error('批量操作不合法');
  if (
    p.action === 'move' &&
    !one(
      ctx,
      'SELECT id FROM decks WHERE id=? AND kind=? AND deleted_at IS NULL',
      p.target,
      deck.kind,
    )
  )
    throw new Error('请选择同类型目标卡片集');
  for (const key of new Set<string>(p.ids)) {
    if (
      !one(
        ctx,
        `SELECT id FROM ${memory ? 'memory_cards' : 'questions'} WHERE id=? AND module=? AND deleted_at IS NULL`,
        key,
        deck.id,
      )
    )
      throw new Error('卡片不属于当前卡片集');
    if (p.action === 'move') {
      run(
        ctx,
        `UPDATE ${memory ? 'memory_cards' : 'questions'} SET module=?,version=version+1 WHERE id=?`,
        p.target,
        key,
      );
      if (p.target !== deck.id)
        run(
          ctx,
          `DELETE FROM ${memory ? 'memory_knowledge' : 'question_knowledge'} WHERE ${memory ? 'card_id' : 'question_id'}=?`,
          key,
        );
      clampCardToPolicy(ctx, memory ? 'memory' : 'question', key);
    } else if (memory) memoryAction(ctx, { id: key, action: p.action });
    else if (p.action === 'delete') deleteQuestion(ctx, { id: key });
    else {
      run(
        ctx,
        "INSERT OR IGNORE INTO plans VALUES (?,?,0,NULL,0,?,'FSRS')",
        key,
        ctx.now().toISOString(),
        '待整理卡片的排期状态',
      );
      setPlan(ctx, { id: key, action: p.action });
    }
  }
  audit(ctx, '批量处理卡片', { deck: deck.id, action: p.action, count: p.ids.length });
  return true;
}
