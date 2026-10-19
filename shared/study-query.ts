import { z } from "zod";
import { DateSelection } from "./workspace-contracts.ts";
import { inDateRange } from "./date-range.ts";
export const StudyFilters = z.strictObject({
  query: z.string().max(10000).default(""),
  knowledge: z.array(z.string()).max(500).default([]),
  includeChildren: z.boolean().default(true),
  match: z.enum(["any", "all"]).default("any"),
  state: z
    .enum(["all", "due", "ready", "new", "learned", "unlinked"])
    .default("all"),
  performance: z
    .enum(["all", "last-failed", "ever-failed", "repeated", "uncertain"])
    .default("all"),
  paused: z.enum(["all", "active", "paused"]).default("active"),
  minReviews: z.number().int().min(0).default(0),
  date: DateSelection.default({ range: "all" }),
  dateField: z
    .enum(["lastReviewAt", "firstReviewAt", "createdAt"])
    .default("lastReviewAt"),
  sort: z
    .enum(["default", "lastReviewDesc", "errorCountDesc", "reviewCountAsc"])
    .default("default"),
});
export type StudyFilter = z.infer<typeof StudyFilters>;
export interface QueryCard {
  id: string;
  title: string;
  text: string;
  knowledgeIds: string[];
  paused: boolean;
  ready: boolean;
  dueAt: string | null;
  createdAt: string | null;
  firstReviewAt: string | null;
  lastReviewAt: string | null;
  reviewCount: number;
  totalReviews: number;
  failures: number;
  lastFailed: boolean;
  repeated: boolean;
  uncertain: boolean;
}
export function knowledgeGroups(
  ids: string[],
  nodes: { id: string; parent_id: string | null }[],
  children: boolean,
): Set<string>[] {
  const parents = new Map(nodes.map((n) => [n.id, n.parent_id]));
  const roots = children
    ? ids.filter((id) => {
        let p = parents.get(id);
        const seen = new Set<string>();
        while (p && !seen.has(p)) {
          if (ids.includes(p)) return false;
          seen.add(p);
          p = parents.get(p);
        }
        return true;
      })
    : ids;
  return roots.map((id) => {
    const scope = new Set([id]);
    if (children) {
      let n = -1;
      while (n !== scope.size) {
        n = scope.size;
        for (const k of nodes)
          if (k.parent_id && scope.has(k.parent_id)) scope.add(k.id);
      }
    }
    return scope;
  });
}
export function toggleKnowledgeSelection(
  selected: string[],
  id: string,
  nodes: { id: string; parent_id: string | null }[],
  children: boolean,
): string[] {
  const scope = (k: string) => knowledgeGroups([k], nodes, children)[0],
    covered = new Set(
      knowledgeGroups(selected, nodes, children).flatMap((g) => [...g]),
    ),
    sub = scope(id);
  if ([...sub].every((k) => covered.has(k)))
    return [...covered].filter(
      (k) => !sub.has(k) && ![...scope(k)].some((c) => sub.has(c)),
    );
  return [...new Set([...selected.filter((k) => !sub.has(k)), id])];
}
export function filterStudyCards(
  cards: QueryCard[],
  f: StudyFilter,
  nodes: { id: string; parent_id: string | null }[],
  window: { start: string | null; end: string | null; timeZone: string },
  now: Date,
  ignoreKnowledge = false,
): QueryCard[] {
  const groups = knowledgeGroups(f.knowledge, nodes, f.includeChildren),
    q = f.query.trim().toLowerCase();
  return cards
    .filter((c) => {
      if (
        (f.paused === "active" && c.paused) ||
        (f.paused === "paused" && !c.paused)
      )
        return false;
      if (q && !c.text.toLowerCase().includes(q)) return false;
      if (
        (f.state === "due" && (!c.dueAt || Date.parse(c.dueAt) > +now)) ||
        (f.state === "new" && c.totalReviews > 0) ||
        (f.state === "learned" && !c.totalReviews) ||
        (f.state === "ready" && !c.ready) ||
        (f.state === "unlinked" && c.knowledgeIds.length)
      )
        return false;
      if (c.reviewCount < f.minReviews) return false;
      if (
        (f.performance === "last-failed" && !c.lastFailed) ||
        (f.performance === "ever-failed" && !c.failures) ||
        (f.performance === "repeated" && !c.repeated) ||
        (f.performance === "uncertain" && !c.uncertain)
      )
        return false;
      if (
        window.start &&
        window.end &&
        (!c[f.dateField] ||
          !inDateRange(
            c[f.dateField]!,
            window.start,
            window.end,
            window.timeZone,
          ))
      )
        return false;
      if (!ignoreKnowledge && groups.length) {
        const matches = (g: Set<string>) =>
          c.knowledgeIds.some((id) => g.has(id));
        if (f.match === "all" ? !groups.every(matches) : !groups.some(matches))
          return false;
      }
      return true;
    })
    .sort((a, b) =>
      f.sort === "lastReviewDesc"
        ? (b.lastReviewAt ?? "").localeCompare(a.lastReviewAt ?? "") ||
          a.id.localeCompare(b.id)
        : f.sort === "errorCountDesc"
          ? b.failures - a.failures || a.id.localeCompare(b.id)
          : f.sort === "reviewCountAsc"
            ? a.reviewCount - b.reviewCount || a.id.localeCompare(b.id)
            : (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
              a.id.localeCompare(b.id),
    );
}
export function randomKnowledgeCandidates(
  scope: "eligible" | "visible" | "checked",
  eligible: Pick<QueryCard, "knowledgeIds">[],
  visible: Pick<QueryCard, "knowledgeIds">[],
  checked: string[],
): string[] {
  const ids = [
    ...new Set(
      (scope === "visible" ? visible : eligible).flatMap((c) => c.knowledgeIds),
    ),
  ];
  return scope === "checked" ? ids.filter((id) => checked.includes(id)) : ids;
}
export function sampleKnowledge(
  ids: string[],
  count: number,
  weights?: Map<string, number>,
  rng = Math.random,
): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 20)
    throw Error("抽取数量须为1—20的整数");
  const pool = [...new Set(ids)],
    out: string[] = [];
  if (!weights) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }
  while (pool.length && out.length < count) {
    const ws = pool.map((id) => Math.max(0.000001, weights.get(id) ?? 1));
    let x = rng() * ws.reduce((a, b) => a + b, 0),
      i = 0;
    while (i < pool.length - 1 && (x -= ws[i]) >= 0) i++;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
