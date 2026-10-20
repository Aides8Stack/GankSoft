import {
  id,
  one,
  all,
  required,
  type Context,
} from "../infrastructure/context.ts";
import { readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { imageInstance } from "./media/instances.ts";
import { digestImage, managedName } from "./media/repository.ts";
import { digest, validatePackage } from "./imports/protocol.ts";
export function exportDeck(ctx: Context, key: string, cardIds?: string[]) {
  const deck = one(
    ctx,
    "SELECT * FROM decks WHERE id=? AND deleted_at IS NULL",
    required(key, "卡片集"),
  );
  if (!deck) throw new Error("卡片集不存在");
  const memory = deck.kind === "memory";
  let cards = all(
    ctx,
    `SELECT * FROM ${memory ? "memory_cards" : "questions"} WHERE module=? AND deleted_at IS NULL`,
    key,
  );
  if (cardIds) {
    const ids = new Set(cardIds);
    if (
      !ids.size ||
      ids.size !== cardIds.length ||
      cards.filter((c) => ids.has(c.id)).length !== ids.size
    )
      throw Error("导出卡片必须存在且属于当前卡片集");
    cards = cards.filter((c) => ids.has(c.id));
  }
  const links = all(
    ctx,
    `SELECT * FROM ${memory ? "memory_knowledge" : "question_knowledge"}`,
  );
  const nodes = all(ctx, "SELECT * FROM knowledge WHERE deleted_at IS NULL");
  const selected = new Set<string>(
    cardIds ? [] : nodes.filter((k) => k.module === key).map((k) => k.id),
  );
  for (const c of cards)
    for (const l of links.filter(
      (l) => (memory ? l.card_id : l.question_id) === c.id,
    ))
      selected.add(l.knowledge_id);
  let size = -1;
  while (size !== selected.size) {
    size = selected.size;
    for (const k of nodes)
      if (selected.has(k.id) && k.parent_id) selected.add(k.parent_id);
  }
  const archiveId = "deck-" + digest(key).slice(0, 20),
    version = ctx.now().toISOString();
  const archive = {
    archiveId,
    version,
    subject: key,
    nodes: nodes
      .filter((k) => selected.has(k.id))
      .map((k) => ({
        key: k.id,
        name: k.name,
        parentKey: selected.has(k.parent_id) ? k.parent_id : null,
        aliases: k.aliases,
        principle: k.principle,
        conditions: k.conditions,
        method: k.method,
        traps: k.traps,
      })),
    relations: all(ctx, "SELECT * FROM relations")
      .filter((r) => selected.has(r.source_id) && selected.has(r.target_id))
      .map((r) => ({
        sourceKey: r.source_id,
        targetKey: r.target_id,
        kind: r.kind,
        note: r.note,
      })),
  };
  const pkg = {
    format: "ganksoft.content",
    schemaVersion: "2.0",
    collection: { name: deck.name, kind: deck.kind },
    packageId: "export-" + id(),
    namespace: "export-" + digest(key).slice(0, 20),
    archives: [archive],
    items: cards.map((c) => {
      const common = {
        key: c.id,
        kind: deck.kind,
        subject: key,
        title: c.title,
        source: { file: c.source || deck.name },
        knowledgeRefs: links
          .filter(
            (l) =>
              (memory ? l.card_id : l.question_id) === c.id &&
              selected.has(l.knowledge_id),
          )
          .map((l) => ({ archiveId, version, nodeKey: l.knowledge_id })),
      };
      const images = all(
        ctx,
        memory ? "SELECT * FROM memory_assets WHERE card_id=? ORDER BY sort_order" : "SELECT * FROM assets WHERE question_id=? ORDER BY sort_order",
        c.id,
      ).map((a) => {
        if (basename(a.file_name) !== a.file_name)
          throw new Error("附件路径错误");
        const bytes = readFileSync(join(ctx.dataDir, "attachments", a.file_name)), sha256 = digestImage(bytes);
        if (managedName.test(a.file_name) && a.file_name.split(".")[0] !== sha256) throw Error("原图哈希不一致，拒绝导出");
        return {
          layout: imageInstance(ctx, a).layout, sha256,
          role: a.role,
          mime: a.mime,
          base64: bytes.toString("base64"),
        };
      });
      if (memory) return { ...common, cue: c.cue, content: c.content, images };
      return {
        ...common,
        stem: c.stem,
        options: c.options,
        answer: c.answer,
        analysis: c.analysis,
        thought: c.initial_thought,
        projectNote: c.project_note,
        material: c.material_id
          ? one(ctx, "SELECT content FROM materials WHERE id=?", c.material_id)
              ?.content
          : "",
        needsReview: false,
        images,
      };
    }),
  };
  return validatePackage(pkg);
}
