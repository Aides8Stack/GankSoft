import { DomainError } from '../../../shared/domain-error.ts';
import { required, one, run, type Context } from '../../infrastructure/context.ts';
import { digest } from '../imports/protocol.ts';
import { submitReview } from './service.ts';
import { reviewMemory } from '../memory/service.ts';
import type { CardKind, SessionPort, ReviewResult } from '../../../shared/review-contract.ts';
/** Coordinator: Application owns the transaction; communication with Sessions uses an explicit port. */
export function submitReliableReview(
  ctx: Context,
  kind: CardKind,
  p: any,
  sessions: SessionPort,
): ReviewResult {
  if (p.protocol_version != null && ![1, 2].includes(p.protocol_version))
    throw new Error('不支持的复盘协议版本');
  if (p.practice != null && typeof p.practice !== 'boolean') throw new Error('练习标记不合法');
  for (const field of ['faults', 'error_knowledge_ids'])
    if (
      p[field] != null &&
      (!Array.isArray(p[field]) || p[field].some((x: unknown) => typeof x !== 'string'))
    )
      throw new Error('错因和知识点列表格式不合法');
  if (kind === 'question' && p.protocol_version === 2 && typeof p.self_score !== 'number')
    throw new DomainError('VALIDATION_ERROR', '请填写本次自评分', { self_score: '必填数值' });
  const requestId = p.request_id == null ? crypto.randomUUID() : required(p.request_id, '请求编号');
  if (requestId.length > 150) throw new Error('请求编号过长');
  const hash = digest({ kind, payload: { ...p, request_id: requestId } });
  const receipt = one(ctx, 'SELECT * FROM review_receipts WHERE request_id=?', requestId);
  if (receipt) {
    if (receipt.payload_hash !== hash || receipt.kind !== kind)
      throw new Error('请求编号已用于其他作答，请勿修改原提交');
    return JSON.parse(receipt.response);
  }
  sessions.validateSubmission(kind, { ...p, request_id: requestId });
  const result = kind === 'question' ? submitReview(ctx, p) : reviewMemory(ctx, p);
  const response = { ...result };
  run(
    ctx,
    'INSERT INTO review_receipts VALUES (?,?,?,?,?,?)',
    requestId,
    kind,
    kind === 'question' ? p.question_id : p.id,
    hash,
    JSON.stringify(response),
    ctx.now().toISOString(),
  );
  sessions.recordSaved({ ...p, request_id: requestId }, response);
  return response;
}
