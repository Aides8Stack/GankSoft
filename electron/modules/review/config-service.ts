import {
  DeckConfig,
  KnowledgePreference,
  DiagnosisRule,
} from "../../../shared/review-config.ts";
import {
  all,
  one,
  run,
  audit,
  type Context,
} from "../../infrastructure/context.ts";
import { transaction } from "../../infrastructure/database.ts";
import { deckReviewPolicy, effectiveReviewPolicy } from "./policy.ts";
export function reviewConfig(ctx: Context, deckId: string) {
  if (
    !one(ctx, "SELECT id FROM decks WHERE id=? AND deleted_at IS NULL", deckId)
  )
    throw Error("卡片集不存在或已删除");
  const row = one(
    ctx,
    "SELECT * FROM deck_review_config_v2 WHERE deck_id=?",
    deckId,
  );
  const policy = deckReviewPolicy(ctx, deckId);
  return {
    deckId,
    revision: row?.revision ?? 0,
    config: DeckConfig.parse(row ? JSON.parse(row.payload) : {}),
    dailyLimit: policy.daily_limit,
    maxIntervalDays: policy.max_interval_days,
    knowledge: all(
      ctx,
      "SELECT p.*,k.deleted_at,k.module FROM knowledge_specialty_prefs p LEFT JOIN knowledge k ON k.id=p.knowledge_id WHERE p.deck_id=?",
      deckId,
    ).map((r) => ({
      knowledgeId: r.knowledge_id,
      revision: r.revision,
      preference: KnowledgePreference.parse(JSON.parse(r.payload)),
      orphan: r.module !== deckId || !!r.deleted_at,
    })),
  };
}
export function cardConfig(ctx: Context, kind: string, cardId: string) {
  const effective = effectiveReviewPolicy(ctx, kind, cardId);
  return {
    ...effective,
    kind: kind as "question" | "memory",
    cardId,
    deck: reviewConfig(ctx, effective.deckId),
  };
}
export function saveConfig(
  ctx: Context,
  p: { deckId: string; expectedRevision: number; config: unknown },
) {
  const config = DeckConfig.parse(p.config);
  return transaction(ctx.db, () => {
    const before = reviewConfig(ctx, p.deckId);
    if (before.revision !== p.expectedRevision)
      throw Error("配置已变化，请重新读取；草稿保留");
    run(
      ctx,
      "INSERT INTO deck_review_config_v2 VALUES (?,?,?,?) ON CONFLICT(deck_id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at",
      p.deckId,
      JSON.stringify(config),
      before.revision + 1,
      ctx.now().toISOString(),
    );
    audit(ctx, "修改复习参数 v2", {
      deckId: p.deckId,
      before,
      config,
      revision: before.revision + 1,
    });
    return reviewConfig(ctx, p.deckId);
  });
}
export function setKnowledgePreference(
  ctx: Context,
  p: {
    deckId: string;
    knowledgeId: string;
    expectedRevision: number;
    preference: unknown;
  },
) {
  const preference = KnowledgePreference.parse(p.preference);
  return transaction(ctx.db, () => {
    reviewConfig(ctx, p.deckId);
    if (
      !one(
        ctx,
        "SELECT id FROM knowledge WHERE id=? AND module=? AND deleted_at IS NULL",
        p.knowledgeId,
        p.deckId,
      )
    )
      throw Error("知识点不存在或不属于当前集");
    const before = one(
      ctx,
      "SELECT * FROM knowledge_specialty_prefs WHERE deck_id=? AND knowledge_id=?",
      p.deckId,
      p.knowledgeId,
    );
    if ((before?.revision ?? 0) !== p.expectedRevision)
      throw Error("专项配置已变化，请重新读取");
    run(
      ctx,
      "INSERT INTO knowledge_specialty_prefs VALUES (?,?,?,?,?) ON CONFLICT(deck_id,knowledge_id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at",
      p.deckId,
      p.knowledgeId,
      JSON.stringify(preference),
      p.expectedRevision + 1,
      ctx.now().toISOString(),
    );
    audit(ctx, "知识点专项偏好", { ...p, preference });
    return { revision: p.expectedRevision + 1 };
  });
}
export function diagnosisRule(ctx: Context) {
  const row = one(ctx, "SELECT * FROM diagnosis_config WHERE id=1");
  return {
    revision: row?.revision ?? 0,
    rule: DiagnosisRule.parse(row ? JSON.parse(row.payload) : {}),
  };
}
export function saveDiagnosisRule(
  ctx: Context,
  p: { expectedRevision: number; rule: unknown },
) {
  const rule = DiagnosisRule.parse(p.rule);
  return transaction(ctx.db, () => {
    if (diagnosisRule(ctx).revision !== p.expectedRevision)
      throw Error("诊断规则已变化");
    run(
      ctx,
      "INSERT INTO diagnosis_config VALUES (1,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at",
      JSON.stringify(rule),
      p.expectedRevision + 1,
      ctx.now().toISOString(),
    );
    audit(ctx, "修改诊断规则", { ...p, rule });
    return diagnosisRule(ctx);
  });
}
