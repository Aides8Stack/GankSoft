import { all, one, type Context } from "../../infrastructure/context.ts";
import { DomainError } from "../../../shared/domain-error.ts";
import {
  StudyFilters,
  filterStudyCards,
  type QueryCard,
} from "../../../shared/study-query.ts";
import { resolveWindow } from "./window.ts";
export function studyQuery(ctx: Context, p: any) {
  const deck = one(
    ctx,
    "SELECT * FROM decks WHERE id=? AND deleted_at IS NULL",
    p.deckId,
  );
  if (!deck) throw new DomainError("DECK_CONFLICT", "卡片集不存在");
  const f = StudyFilters.parse(p.filters),
    memory = deck.kind === "memory",
    nodes = all(
      ctx,
      "SELECT id,name,parent_id FROM knowledge WHERE module=? AND deleted_at IS NULL",
      deck.id,
    ),
    names = new Map(nodes.map((k) => [k.id, k.name]));
  if (f.knowledge.some((id) => !names.has(id)))
    throw new DomainError(
      "DECK_CONFLICT",
      "知识点已移动或删除，请清除失效条件",
    );
  const links = all(
    ctx,
    memory
      ? "SELECT l.card_id AS id,l.knowledge_id FROM memory_knowledge l JOIN memory_cards c ON c.id=l.card_id WHERE c.module=?"
      : "SELECT l.question_id AS id,l.knowledge_id FROM question_knowledge l JOIN questions c ON c.id=l.question_id WHERE c.module=?",
    deck.id,
  );
  const linkMap = new Map<string, string[]>();
  for (const l of links) {
    const list = linkMap.get(l.id) ?? [];
    if (names.has(l.knowledge_id)) list.push(l.knowledge_id);
    linkMap.set(l.id, list);
  }
  const rs = all(
      ctx,
      memory
        ? "SELECT r.card_id AS question_id,r.created_at,r.effective,r.score FROM memory_reviews r JOIN memory_cards c ON c.id=r.card_id WHERE c.module=? ORDER BY r.created_at DESC,r.rowid DESC"
        : "SELECT r.question_id,r.created_at,r.effective,r.correct,r.score FROM attempts r JOIN questions c ON c.id=r.question_id WHERE c.module=? ORDER BY r.created_at DESC,r.rowid DESC",
      deck.id,
    ),
    reviews = new Map<string, any[]>();
  for (const r of rs) {
    const list = reviews.get(r.question_id) ?? [];
    list.push(r);
    reviews.set(r.question_id, list);
  }
  const rows = all(
    ctx,
    memory
      ? "SELECT c.*,p.due_at,coalesce(p.paused,0) AS paused FROM memory_cards c LEFT JOIN memory_plans p ON p.card_id=c.id WHERE c.module=? AND c.deleted_at IS NULL"
      : "SELECT c.*,p.due_at,coalesce(p.paused,0) AS paused FROM questions c LEFT JOIN plans p ON p.question_id=c.id WHERE c.module=? AND c.deleted_at IS NULL",
    deck.id,
  );
  const cards: QueryCard[] = rows.map((c) => {
    const r = reviews.get(c.id) ?? [],
      effective = r.filter((a) => a.effective),
      failed = (a: any) => (memory ? a.score <= 1 : !a.correct),
      ks = linkMap.get(c.id) ?? [];
    return {
      id: c.id,
      title: c.title,
      text: [
        c.title,
        c.stem ?? c.cue,
        c.analysis ?? c.content,
        c.source,
        ...ks.map((id) => names.get(id) ?? ""),
      ].join(" "),
      knowledgeIds: ks,
      paused: !!c.paused,
      ready: memory || /^[A-D]$/.test(c.answer),
      dueAt: c.due_at ?? null,
      createdAt: c.created_at ?? null,
      firstReviewAt: r.at(-1)?.created_at ?? null,
      lastReviewAt: r[0]?.created_at ?? null,
      reviewCount: effective.length,
      totalReviews: r.length,
      failures: effective.filter(failed).length,
      lastFailed: !!effective[0] && failed(effective[0]),
      repeated: effective.slice(0, 3).filter(failed).length >= 2,
      uncertain: !memory && effective.some((a) => a.correct && a.score === 2),
    };
  });
  const timeZone =
      one(ctx, "SELECT value FROM settings WHERE key='studyTimezone'")?.value ||
      "Asia/Shanghai",
    window = resolveWindow(f.date, ctx.now(), timeZone);
  return {
    matched: filterStudyCards(cards, f, nodes, window, ctx.now()).map(
      (c) => c.id,
    ),
    eligible: filterStudyCards(cards, f, nodes, window, ctx.now(), true).map(
      ({ text, ...c }) => c,
    ),
    window,
  };
}
export function studyPreflight(ctx: Context, p: any) {
  const deck = one(
    ctx,
    "SELECT kind FROM decks WHERE id=? AND deleted_at IS NULL",
    p.deckId,
  );
  if (!deck) throw new DomainError("DECK_CONFLICT", "卡片集不存在");
  const memory = deck.kind === "memory",
    rows = all(
      ctx,
      `SELECT c.id,${memory ? "'A' AS answer" : "c.answer"},p.paused FROM ${memory ? "memory_cards" : "questions"} c LEFT JOIN ${memory ? "memory_plans" : "plans"} p ON p.${memory ? "card_id" : "question_id"}=c.id WHERE c.module=? AND c.deleted_at IS NULL`,
      p.deckId,
    ),
    ready = new Set(
      rows
        .filter(
          (c) => /^[A-D]$/.test(c.answer) && (p.includePaused || !c.paused),
        )
        .map((c) => c.id),
    );
  return { ids: [...new Set<string>(p.ids)].filter((id) => ready.has(id)) };
}
