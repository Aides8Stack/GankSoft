import { randomUUID } from "node:crypto";
import { readFileSync, rmSync, statSync } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  ContentPayload,
  ContentVersion,
  MediaReference,
} from "../../../shared/protocol/unified.ts";
import { Id, Name, ProtocolError } from "../../../shared/protocol/data.ts";
import {
  ExportCards,
  ExchangeToken,
  ImportCards,
} from "../../../shared/protocol/card-exchange.ts";
import {
  parsePlacement,
  placementUrl,
} from "../../../shared/editor/document.ts";
import {
  parseMarkedMarkdown,
  serializeMarkedMarkdown,
} from "../../../shared/knowledge/markdown.ts";
import type { Response } from "../../../shared/protocol/registry.ts";
import type { Context } from "../../infrastructure/context.ts";
import { transaction } from "../../infrastructure/database.ts";
import {
  readContainer,
  writeContainer,
  sha256,
} from "../../infrastructure/containers.ts";
import { validateImage } from "../../infrastructure/images.ts";
import { stageImage } from "../media/drafts.ts";
import { getPublishedContent } from "./queries.ts";
import { getCardLinks, replaceCardLinks } from "../knowledge-unified/links.ts";
import {
  readTree,
  markdownBody,
  writeBody,
  orderedNodeIds,
} from "../knowledge-unified/storage.ts";
import { applyTree } from "../knowledge-unified/tree.ts";
import {
  exportMarkdownImages,
  prepareMarkdownImages,
  persistMarkdownImages,
  remapKnowledgeImages,
} from "../knowledge-unified/media.ts";
import { saveUnifiedCatalog } from "../workspace-unified/catalog.ts";
import { requireDraftModel } from "./new-drafts.ts";
import { validateDraftPlacements } from "./draft-service.ts";

// Content exchange is intentionally distinct from database backup/append. It
// carries only current published content and its knowledge/media closure.
const budget = 64 * 1024 * 1024,
  ttl = 300000;
const Image = z.strictObject({
  assetId: Id,
  mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
  base64: z.string().max(44_000_000),
});
const PortableCard = z.strictObject({
  key: Id,
  title: z.string().max(300),
  payload: ContentPayload,
  availability: z.enum(["known", "partial"]),
  mediaRefs: z.array(MediaReference).max(200),
  images: z.array(Image).max(200),
  knowledgeKeys: z.array(Id).max(500),
});
const Package = z.strictObject({
  format: z.literal("ganksoft.cards"),
  version: z.literal(1),
  name: Name,
  cards: z.array(PortableCard).min(1).max(500),
  knowledgeMarkdown: z.string().max(budget),
});
type Document = z.infer<typeof Package>;
type Held = {
  document: Document;
  epoch: string;
  expires: number;
  bytes: number;
  source?: z.infer<typeof ExportCards>;
  revision?: number;
};
const states = new WeakMap<DatabaseSync, Map<string, Held>>();
const fileWrites = new WeakMap<DatabaseSync, string[]>();
const epoch = (ctx: Context) =>
  String(
    ctx.db.prepare("SELECT epoch FROM protocol_meta WHERE singleton=1").get()!
      .epoch,
  );
const revision = (ctx: Context) =>
  Number(
    ctx.db
      .prepare("SELECT revision FROM protocol_meta WHERE singleton=1")
      .get()!.revision,
  );
function cache(ctx: Context) {
  let s = states.get(ctx.db);
  if (!s) {
    s = new Map();
    states.set(ctx.db, s);
  }
  for (const [k, v] of s) if (v.expires < +ctx.now()) s.delete(k);
  return s;
}
function imageBytes(image: z.infer<typeof Image>) {
  if (image.base64.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.base64))
    throw new ProtocolError("MEDIA_REFERENCE_INVALID", "图片编码不规范");
  const bytes = Buffer.from(image.base64, "base64");
  if (bytes.toString("base64") !== image.base64)
    throw new ProtocolError("MEDIA_REFERENCE_INVALID", "图片编码不规范");
  validateImage(bytes, image.mime);
  return bytes;
}
function checked(raw: unknown) {
  const doc = Package.parse(raw),
    bytes = Buffer.byteLength(JSON.stringify(doc));
  if (bytes > budget)
    throw new ProtocolError(
      "EXCHANGE_TOO_LARGE",
      "本批内容超过64MiB，请减少选择",
    );
  if (new Set(doc.cards.map((c) => c.key)).size !== doc.cards.length)
    throw new ProtocolError("EXCHANGE_INVALID", "卡片来源身份重复");
  const nodes = doc.knowledgeMarkdown
      ? parseMarkedMarkdown(doc.knowledgeMarkdown)
      : [],
    ids = new Set(nodes.map((n) => n.key));
  // Parse images before any SQL/file writes, including knowledge Base64 data.
  const knowledgeImages = new Map();
  for (const n of nodes) prepareMarkdownImages(n.markdown, knowledgeImages);
  for (const card of doc.cards) {
    validateDraftPlacements(card);
    const assets = new Map(card.images.map((i) => [i.assetId, i]));
    if (
      assets.size !== card.images.length ||
      assets.size !== new Set(card.mediaRefs.map((r) => r.assetId)).size ||
      new Set(card.mediaRefs.map((r) => r.placementId)).size !==
        card.mediaRefs.length
    )
      throw new ProtocolError(
        "MEDIA_REFERENCE_INVALID",
        "图片资源/放置缺失或重复",
      );
    for (const r of card.mediaRefs)
      if (assets.get(r.assetId)?.mime !== r.mime)
        throw new ProtocolError(
          "MEDIA_REFERENCE_INVALID",
          "图片格式或资源闭包不一致",
        );
    for (const image of assets.values()) imageBytes(image);
    if (
      new Set(card.knowledgeKeys).size !== card.knowledgeKeys.length ||
      card.knowledgeKeys.some((k) => !ids.has(k))
    )
      throw new ProtocolError(
        "INVALID_KNOWLEDGE_SCOPE",
        "知识关联在导出图谱中缺失或重复",
      );
  }
  return { doc, bytes, nodes };
}
function hold(
  ctx: Context,
  document: Document,
  source?: z.infer<typeof ExportCards>,
) {
  const { doc, bytes, nodes } = checked(document),
    s = cache(ctx),
    token = randomUUID();
  s.set(token, {
    document: doc,
    epoch: epoch(ctx),
    expires: +ctx.now() + ttl,
    bytes,
    source,
    revision: source ? revision(ctx) : undefined,
  });
  while (s.size > 4) s.delete(s.keys().next().value!);
  const modes = { question: 0, qa: 0, direct: 0 };
  for (const c of doc.cards) modes[c.payload.mode]++;
  return {
    token,
    count: doc.cards.length,
    modes,
    knowledgeCount: nodes.length,
    bytes,
    warnings: [
      "仅当前发布内容及关联知识和图片；不含草稿、学习历史、排期或单卡配置。",
      "导入时新建独立卡片集与身份；旧题文本选项保持原样，不猜测转换。",
    ],
  };
}
function held(ctx: Context, token: string) {
  requireDraftModel(ctx);
  const v = cache(ctx).get(token);
  if (!v || v.epoch !== epoch(ctx) || v.expires < +ctx.now())
    throw new ProtocolError(
      "PREVIEW_EXPIRED",
      "内容预览已过期，请重新选择或导出",
    );
  return v;
}
function exportSelection(ctx: Context, p: z.infer<typeof ExportCards>) {
  for (const c of p.cards) {
    const row = ctx.db
      .prepare(
        "SELECT revision FROM learning_cards WHERE id=? AND deck_id=? AND deleted_at IS NULL",
      )
      .get(c.cardId, p.deckId);
    if (!row)
      throw new ProtocolError("CARD_SCOPE_CONFLICT", "所选卡片已移动或删除");
    if (row.revision !== c.expectedRevision)
      throw new ProtocolError(
        "REVISION_CONFLICT",
        "所选卡片已变化，请重新选择",
      );
  }
}
export function previewCardExport(
  ctx: Context,
  input: z.infer<typeof ExportCards>,
) {
  requireDraftModel(ctx);
  const p = ExportCards.parse(input);
  return transaction(ctx.db, () => {
    if(p.expectedDataRevision!==undefined&&p.expectedDataRevision!==revision(ctx))
      throw new ProtocolError('DATA_REVISION_CHANGED','卡片内容已变化，请重新收集并导出');
    exportSelection(ctx, p);
    const tree = readTree(ctx, p.deckId),
      selected = new Set<string>();
    let total = 0;
    const cards = p.cards.map((c) => {
      const content = getPublishedContent(ctx, {
        deckId: p.deckId,
        cardId: c.cardId,
      });
      if (!content.payload || content.availability === "unknown")
        throw new ProtocolError(
          "CONTENT_UNAVAILABLE",
          "所选卡片正文不可用，无法导出",
        );
      const knowledgeKeys = getCardLinks(ctx, {
        deckId: p.deckId,
        cardId: c.cardId,
      }).nodeIds.filter((id) => tree.nodes.some((n) => n.nodeId === id));
      for (const id of knowledgeKeys) selected.add(id);
      const images = [
        ...new Map(content.mediaRefs.map((r) => [r.assetId, r])).values(),
      ].map((r) => {
        const path = join(ctx.dataDir, "attachments", r.fileName);
        total += (statSync(path).size * 4) / 3;
        if (total > budget)
          throw new ProtocolError(
            "EXCHANGE_TOO_LARGE",
            "图片总量超过64MiB，请减少选择",
          );
        return {
          assetId: r.assetId,
          mime: r.mime,
          base64: readFileSync(path).toString("base64"),
        };
      });
      total += Buffer.byteLength(JSON.stringify(content.payload));
      if (total > budget)
        throw new ProtocolError(
          "EXCHANGE_TOO_LARGE",
          "正文总量超过64MiB，请减少选择",
        );
      return {
        key: c.cardId,
        title: content.title,
        payload: content.payload,
        availability: content.availability,
        mediaRefs: content.mediaRefs,
        images,
        knowledgeKeys,
      };
    });
    for (const id of [...selected]) {
      let parent = tree.nodes.find((n) => n.nodeId === id)!.parentId;
      const seen = new Set<string>();
      while (parent) {
        if (seen.has(parent))
          throw new ProtocolError("TREE_CYCLE", "知识路径循环");
        seen.add(parent);
        selected.add(parent);
        const node = tree.nodes.find((n) => n.nodeId === parent);
        if (!node)
          throw new ProtocolError("TREE_PARENT_MISSING", "知识路径缺少父节点");
        parent = node.parentId;
      }
    }
    const positions = new Map<string | null, number>();
    const nodes = tree.nodes
      .filter((n) => selected.has(n.nodeId))
      .map((n) => {
        const position = positions.get(n.parentId) ?? 0;
        positions.set(n.parentId, position + 1);
        return {
          key: n.nodeId,
          parentKey: n.parentId,
          name: n.name,
          position,
          line: 1,
          markdown: exportMarkdownImages(
            ctx,
            p.deckId,
            markdownBody(ctx, p.deckId, n.nodeId),
          ),
        };
      });
    const name = String(
      ctx.db.prepare("SELECT name FROM decks WHERE id=?").get(p.deckId)!.name,
    );
    const knowledgeMarkdown = nodes.length
      ? serializeMarkedMarkdown(nodes)
      : "";
    // Marked Markdown deliberately regenerates source keys by preorder, so card
    // associations must use those portable keys instead of database identities.
    const order = orderedNodeIds(
        nodes.map((n) => ({
          nodeId: n.key,
          parentId: n.parentKey,
          position: n.position,
        })),
      ),
      keys = new Map(order.map((id, i) => [id, "md:" + i]));
    return hold(
      ctx,
      Package.parse({
        format: "ganksoft.cards",
        version: 1,
        name,
        cards: cards.map((c) => ({
          ...c,
          knowledgeKeys: c.knowledgeKeys.map((k) => keys.get(k)!),
        })),
        knowledgeMarkdown,
      }),
      p,
    );
  });
}
export function preparedCardExport(
  ctx: Context,
  input: z.infer<typeof ExchangeToken>,
) {
  const p = ExchangeToken.parse(input),
    h = held(ctx, p.token);
  if (!h.source || h.revision !== revision(ctx))
    throw new ProtocolError("PREVIEW_EXPIRED", "数据已变化，请重新预览导出");
  exportSelection(ctx, h.source);
  return h.document;
}
export async function writeCardPackage(destination: string, document: unknown) {
  const { doc } = checked(document),
    bytes = Buffer.from(JSON.stringify(doc));
  await writeContainer(
    destination,
    new Map([
      ["cards.json", bytes],
      [
        "manifest.json",
        Buffer.from(
          JSON.stringify({
            format: "ganksoft.cards.container",
            version: 1,
            size: bytes.length,
            checksum: sha256(bytes),
          }),
        ),
      ],
    ]),
  );
}
export async function readCardPackage(path: string) {
  if ((await stat(path)).size > budget)
    throw new ProtocolError("EXCHANGE_TOO_LARGE", "内容包超过64MiB");
  const files = await readContainer(path),
    body = files.get("cards.json");
  const manifest = z
    .strictObject({
      format: z.literal("ganksoft.cards.container"),
      version: z.literal(1),
      size: z.number().int().nonnegative().max(budget),
      checksum: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .parse(JSON.parse(files.get("manifest.json")?.toString() ?? "null"));
  if (
    files.size !== 2 ||
    !body ||
    body.length !== manifest.size ||
    sha256(body) !== manifest.checksum
  )
    throw new ProtocolError("EXCHANGE_INVALID", "内容包条目或校验失败");
  return checked(JSON.parse(body.toString("utf8"))).doc;
}
const importedKey = (doc: Document) =>
  "native-content-import:" + sha256(Buffer.from(JSON.stringify(doc)));
export function stageCardPackage(ctx: Context, raw: unknown) {
  requireDraftModel(ctx);
  const { doc } = checked(raw),
    preview = hold(ctx, doc);
  const old = ctx.db
    .prepare("SELECT value FROM settings WHERE key=?")
    .get(importedKey(doc));
  return { ...preview, name: doc.name, previouslyImported: !!old };
}
export function importCardPackage(
  ctx: Context,
  input: z.infer<typeof ImportCards>,
) {
  const p = ImportCards.parse(input),
    h = held(ctx, p.token);
  if (h.source)
    throw new ProtocolError("EXCHANGE_INVALID", "请先打开要导入的内容包");
  const { doc, nodes } = checked(h.document);
  return transaction(ctx.db, () => {
    const previous = ctx.db
      .prepare("SELECT value FROM settings WHERE key=?")
      .get(importedKey(doc));
    if (previous && !p.allowDuplicate) {
      const deckId = String(previous.value);
      if (
        ctx.db
          .prepare("SELECT 1 FROM decks WHERE id=? AND deleted_at IS NULL")
          .get(deckId)
      )
        return { deckId, count: doc.cards.length, skipped: true };
      throw new ProtocolError(
        "EXCHANGE_PREVIOUS_DELETED",
        "此前导入的卡片集已删除，请恢复或显式另导一份",
      );
    }
    const deck = saveUnifiedCatalog(ctx, {
        kind: "deck",
        name: p.name,
        parentId: p.parentId,
      }),
      deckId = deck.id,
      nodeIds = new Map(nodes.map((n) => [n.key, randomUUID()]));
    const images = new Map();
    const bodies = nodes.map((n) => ({
      id: nodeIds.get(n.key)!,
      markdown: prepareMarkdownImages(n.markdown, images),
    }));
    if (nodes.length)
      applyTree(ctx, {
        deckId,
        expectedTreeHash: readTree(ctx, deckId).treeHash,
        nodes: nodes.map((n) => ({
          nodeId: nodeIds.get(n.key)!,
          parentId: n.parentKey ? nodeIds.get(n.parentKey) : null,
          name: n.name,
          position: n.position,
        })),
      });
    const mappedKnowledge = persistMarkdownImages(ctx, deckId, images);
    for (const b of bodies)
      writeBody(ctx, {
        encoding: "ganksoft.knowledge-body/1",
        deckId,
        nodeId: b.id,
        markdown: remapKnowledgeImages(b.markdown, mappedKnowledge),
      });
    for (const c of doc.cards) {
      const cardId = randomUUID(),
        versionId = randomUUID(),
        cycleId = randomUUID(),
        staged = new Map(
          c.images.map((image) => {
            const a = stageImage(
              ctx,
              deckId,
              "question",
              imageBytes(image),
              image.mime,
              (file) => {
                const list = fileWrites.get(ctx.db);
                if (!list) throw Error("文件回滚协调器未连接");
                list.push(join(ctx.dataDir, "attachments", file));
              },
            );
            return [image.assetId, a];
          }),
        );
      const refs = c.mediaRefs.map((r) => {
          const a = staged.get(r.assetId)!;
          return {
            ...r,
            placementId: randomUUID(),
            assetId: a.id,
            fileName:
              a.id +
              (a.mime === "image/jpeg"
                ? ".jpg"
                : a.mime === "image/webp"
                  ? ".webp"
                  : ".png"),
          };
        }),
        placements = new Map(
          c.mediaRefs.map((r, i) => [r.placementId, refs[i]]),
        );
      function remap(value: unknown): unknown {
        if (typeof value === "string")
          return value.replace(/gank-asset:\/\/[^\s)<>"']+/g, (raw) => {
            const old = parsePlacement(raw),
              r = placements.get(old.placementId);
            if (
              !r ||
              r.assetId !== staged.get(old.assetId)?.id ||
              r.width !== old.width
            )
              throw new ProtocolError(
                "MEDIA_REFERENCE_INVALID",
                "图片放置引用不一致",
              );
            return placementUrl({
              assetId: r.assetId,
              placementId: r.placementId,
              width: old.width,
            });
          });
        if (Array.isArray(value)) return value.map(remap);
        if (value && typeof value === "object")
          return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, remap(v)]),
          );
        return value;
      }
      const payload = ContentPayload.parse(remap(c.payload)),
        now = ctx.now().toISOString();
      validateDraftPlacements({ payload, mediaRefs: refs });
      const content = ContentVersion.parse({
        versionId,
        cardId,
        mode: payload.mode,
        title: c.title,
        availability: c.availability,
        payload,
        mediaRefs: refs,
        publishedAt: now,
        source: {
          schema: 606,
          kind: "published",
          key: cardId,
          ordinal: null,
          wireToken: null,
          rawJson: null,
        },
      });
      ctx.db
        .prepare("INSERT INTO learning_cards VALUES(?,?,?,?,?,?,1,NULL,NULL)")
        .run(cardId, deckId, c.title, payload.mode, versionId, cycleId);
      ctx.db
        .prepare(
          "INSERT INTO learning_study_cycles VALUES(?,?,?,'explicit-relearn',NULL)",
        )
        .run(cycleId, cardId, now);
      ctx.db
        .prepare("INSERT INTO learning_content_versions VALUES(?,?,?,?)")
        .run(versionId, cardId, payload.mode, JSON.stringify(content));
      ctx.db
        .prepare("INSERT INTO learning_published_modes VALUES(?,?,?)")
        .run(cardId, payload.mode, versionId);
      replaceCardLinks(
        ctx,
        {
          deckId,
          cardId,
          nodeIds: c.knowledgeKeys.map((k) => nodeIds.get(k)!),
        },
        null,
      );
    }
    ctx.db
      .prepare(
        "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(importedKey(doc), deckId);
    ctx.db
      .prepare("INSERT INTO audits(action,detail,created_at) VALUES(?,?,?)")
      .run(
        "导入原生卡片内容",
        JSON.stringify({
          deckId,
          count: doc.cards.length,
          reason: "content-exchange-new-identities",
        }),
        ctx.now().toISOString(),
      );
    return { deckId, count: doc.cards.length, skipped: false };
  });
}
/** SQL output/receipt failures roll back first; only this call's UUID files are
 * removed on definitive rejection. Unknown outcomes keep recoverable media. */
export function executeCardExchange(ctx: Context, action: () => Response) {
  const paths: string[] = [];
  fileWrites.set(ctx.db, paths);
  try {
    const r = action();
    if (!r.ok && r.error.outcome !== "unknown")
      for (const p of paths) rmSync(p, { force: true });
    return r;
  } finally {
    fileWrites.delete(ctx.db);
  }
}
