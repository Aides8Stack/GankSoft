import { one, run, required, audit, type Context } from '../../infrastructure/context.ts';
import { targetSeconds } from '../../../shared/assessment.ts';
import { DomainError } from '../../../shared/domain-error.ts';
export function assessmentTarget(ctx: Context, questionId: string): number | null {
  const q = one(ctx, 'SELECT module FROM questions WHERE id=?', questionId);
  if (!q) throw new Error('卡片不存在');
  const own = one(
    ctx,
    'SELECT * FROM question_assessment_policies WHERE question_id=?',
    questionId,
  );
  return own
    ? own.target_seconds
    : (one(ctx, 'SELECT target_seconds FROM deck_assessment_policies WHERE deck_id=?', q.module)
        ?.target_seconds ?? null);
}
export function saveAssessmentPolicy(ctx: Context, p: any) {
  if (!['card', 'deck'].includes(p.scope))
    throw new DomainError('VALIDATION_ERROR', '评估设置范围不合法');
  const key = required(p.id, '评估设置对象');
  if (p.scope === 'card') {
    if (!one(ctx, 'SELECT id FROM questions WHERE id=? AND deleted_at IS NULL', key))
      throw new Error('错题卡不存在或已删除');
    if (!['inherit', 'custom', 'none'].includes(p.mode))
      throw new DomainError('VALIDATION_ERROR', '目标用时继承模式不合法');
    if (p.mode === 'inherit')
      run(ctx, 'DELETE FROM question_assessment_policies WHERE question_id=?', key);
    else {
      const target = p.mode === 'none' ? null : targetSeconds(p.target_seconds);
      if (p.mode === 'custom' && target === null)
        throw new DomainError('VALIDATION_ERROR', '独立目标用时不能为空');
      run(
        ctx,
        'INSERT INTO question_assessment_policies VALUES (?,?,?) ON CONFLICT(question_id) DO UPDATE SET mode=excluded.mode,target_seconds=excluded.target_seconds',
        key,
        p.mode,
        target,
      );
    }
  } else {
    if (
      !one(ctx, "SELECT id FROM decks WHERE id=? AND kind='question' AND deleted_at IS NULL", key)
    )
      throw new Error('错题卡片集不存在');
    const target = targetSeconds(p.target_seconds);
    run(
      ctx,
      'INSERT INTO deck_assessment_policies VALUES (?,?) ON CONFLICT(deck_id) DO UPDATE SET target_seconds=excluded.target_seconds',
      key,
      target,
    );
  }
  audit(ctx, '修改作答效率目标', {
    scope: p.scope,
    id: key,
    mode: p.mode,
    target_seconds: p.target_seconds,
  });
  return { targetSeconds: p.scope === 'card' ? assessmentTarget(ctx, key) : p.target_seconds };
}
