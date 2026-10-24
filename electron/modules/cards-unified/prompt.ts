import { currentCardLinks } from '../knowledge-unified/links.ts';
import type { z } from "zod";
import { PromptContext } from "../../../shared/protocol/card-transfer.ts";
import { DraftScope } from "../../../shared/protocol/card-draft.ts";
import { ProtocolError } from "../../../shared/protocol/data.ts";
import type { Context } from "../../infrastructure/context.ts";
import { draftCard } from "./draft-service.ts";
export function getPromptContext(
  ctx: Context,
  input: z.infer<typeof DraftScope>,
) {
  const p = DraftScope.parse(input),
    card = draftCard(ctx, p);
  const nodes = ctx.db
    .prepare(
      "SELECT id,parent_id,name FROM knowledge WHERE module=? AND deleted_at IS NULL ORDER BY id LIMIT 10001",
    )
    .all(p.deckId);
  if (nodes.length > 10000)
    throw new ProtocolError("PROMPT_TOO_LARGE", "知识目录过大，请缩小范围");
  const byId = new Map(nodes.map((n) => [String(n.id), n]));
  const catalog = nodes.map((n) => {
    const path: string[] = [],
      seen = new Set<string>();
    let row: typeof n | undefined = n;
    while (row) {
      const id = String(row.id);
      if (seen.has(id) || path.length >= 100)
        throw new ProtocolError("TREE_CYCLE", "知识点路径循环或层级过深");
      seen.add(id);
      path.unshift(String(row.name));
      if (row.parent_id && !byId.has(String(row.parent_id)))
        throw new ProtocolError(
          "KNOWLEDGE_PARENT_MISSING",
          "知识点父路径缺失，请先修复图谱",
        );
      row = row.parent_id ? byId.get(String(row.parent_id)) : undefined;
    }
    return { nodeId: String(n.id), deckId: p.deckId, path };
  });
  const ids = new Set(currentCardLinks(ctx,p.deckId,p.cardId,card.legacy_kind));
  return PromptContext.parse({
    deckId: p.deckId,
    catalog,
    confirmed: catalog.filter((n) => ids.has(n.nodeId)),
  });
}
