import { one, all, run, type Context } from '../../infrastructure/context.ts';
import { imageInstance } from '../media/instances.ts';
/** Card-content module owns invalidation; callers do not edit FSRS internals. */
export function resetQuestionContent(ctx: Context, id: string, bumpEditVersion = false) {
  run(
    ctx,
    `UPDATE questions SET content_version=content_version+1,version=version+? WHERE id=?`,
    bumpEditVersion ? 1 : 0,
    id,
  );
  run(ctx, "DELETE FROM scheduling WHERE kind='question' AND card_id=?", id);
  run(
    ctx,
    "INSERT INTO plans VALUES (?,?,0,NULL,0,?,'FSRS') ON CONFLICT(question_id) DO UPDATE SET due_at=excluded.due_at,interval_days=0,mastery=NULL,reason=excluded.reason,algorithm=excluded.algorithm",
    id,
    ctx.now().toISOString(),
    '内容已修改，等待重新验证',
  );
}
export function questionContentSnapshot(ctx: Context, q: any) {
  return {
    schemaVersion: 1,
    id: q.id,
    contentVersion: q.content_version,
    title: q.title,
    stem: q.stem,
    options: q.options,
    answer: q.answer,
    analysis: q.analysis,
    source: q.source,
    material: q.material_id
      ? (one(ctx, 'SELECT content FROM materials WHERE id=?', q.material_id)?.content ?? '')
      : '',
    assets: all(ctx, 'SELECT * FROM assets WHERE question_id=?', q.id).map(a => imageInstance(ctx, a)),
  };
}
export function historicalImageReferences(ctx: Context) {
  return all(ctx, 'SELECT question_snapshot FROM attempts WHERE question_snapshot<>?', '').flatMap(
    (r) => {
      try {
        return JSON.parse(r.question_snapshot).assets ?? [];
      } catch {
        return [];
      }
    },
  );
}
