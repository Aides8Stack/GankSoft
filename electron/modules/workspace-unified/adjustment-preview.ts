import { basisHash, targetBasis, treeBasis } from "./adjustment-basis.ts";
import { prepareAdjustmentSelection } from "./adjustment-preflight.ts";
import type { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import yauzl from "yauzl";
import type { Context } from "../../infrastructure/context.ts";
import { openReadSnapshot } from "../../infrastructure/read-snapshot.ts";
import { Manifest } from "../../../shared/protocol/ai-analysis.ts";
import {
  Action,
  Source,
  PreviewScope,
  PreviewPageInput,
  type AdjustmentSource,
  type AdjustmentRow,
  PrepareSelection,
} from "../../../shared/protocol/ai-adjustments.ts";
import {
  readAdjustmentZip,
  safeJson,
  IMPORT_BUDGET,
} from "./adjustment-zip.ts";
import {
  validateAnalysisZip,
  ZIP_BUDGET,
  ENTRY_BUDGET,
} from "./analysis-zip.ts";
import {
  digest,
  publishedCard,
  currentDue,
  schedulePolicy,
} from "../cards-unified/schedule.ts";
import { reviewConfig } from "../review/config-service.ts";
import { currentCardLinks } from "../knowledge-unified/links.ts";
import { Id } from "../../../shared/protocol/data.ts";
import { DomainError } from "../../../shared/domain-error.ts";
export function meta(ctx: Context) {
  const m = ctx.db
    .prepare("SELECT epoch,revision FROM protocol_meta WHERE singleton=1")
    .get()!;
  return { dataEpoch: String(m.epoch), dataRevision: Number(m.revision) };
}
/** Original user-selected W4 archive supplies provenance; no export ledger is invented. */
export async function readSourceZip(path: string) {
  if ((await stat(path)).size > ZIP_BUDGET)
    throw Error("原始分析ZIP超过资源预算");
  const started = Date.now();
  const checkpoint = async () => {
    if (Date.now() - started > IMPORT_BUDGET.milliseconds)
      throw Error("来源校验时间超过安全预算");
  };
  const b = await new Promise<Buffer>((resolve, reject) =>
    yauzl.open(
      path,
      { lazyEntries: true, strictFileNames: true, validateEntrySizes: true },
      (e, zip) => {
        if (e || !zip) {
          reject(e ?? Error("原始分析ZIP无法打开"));
          return;
        }
        let ended = false,
          count = 0;
        const fail = (e: unknown) => {
          if (ended) return;
          ended = true;
          zip.close();
          reject(e);
        };
        const timer = setTimeout(
          () => fail(Error("来源校验时间超过安全预算")),
          IMPORT_BUDGET.milliseconds,
        );
        zip.on("close", () => clearTimeout(timer));
        zip.on("error", fail);
        zip.on("end", () => fail(Error("原始分析ZIP缺少manifest")));
        zip.on("entry", (entry) => {
          void (async () => {
            await checkpoint();
            if (++count > ENTRY_BUDGET) throw Error("来源ZIP目录超预算");
            if (entry.fileName !== "data/manifest.json") {
              zip.readEntry();
              return;
            }
            if (
              entry.uncompressedSize > IMPORT_BUDGET.file ||
              entry.generalPurposeBitFlag & 1
            )
              throw Error("来源manifest超预算或加密");
            const stream = await new Promise<import("node:stream").Readable>(
              (res, rej) =>
                zip.openReadStream(entry, (e, s) =>
                  e || !s ? rej(e ?? Error("来源manifest无法读取")) : res(s),
                ),
            );
            const chunks: Buffer[] = [];
            let bytes = 0;
            try {
              for await (const raw of stream) {
                await checkpoint();
                const b = Buffer.from(raw);
                bytes += b.length;
                if (bytes > IMPORT_BUDGET.file)
                  throw Error("来源manifest实际字节超预算");
                chunks.push(b);
              }
            } finally {
              stream.destroy();
            }
            if (!ended) {
              ended = true;
              zip.close();
              resolve(Buffer.concat(chunks));
            }
          })().catch(fail);
        });
        zip.readEntry();
      },
    ),
  );
  const m = Manifest.parse(safeJson(b));
  if (new Set(m.files.map((f) => f.path)).size !== m.files.length)
    throw Error("来源manifest分片路径重复");
  if (m.files.length > ENTRY_BUDGET) throw Error("来源manifest条目超预算");
  await validateAnalysisZip(path, m.files, b, checkpoint);
  if (
    m.snapshotId !==
    digest({
      exportId: m.exportId,
      epoch: m.dataEpoch,
      revision: m.dataRevision,
    })
  )
    throw Error("来源snapshotId不一致");
  return Source.parse({
    exportId: m.exportId,
    snapshotId: m.snapshotId,
    deckId: m.deckId,
    dataEpoch: m.dataEpoch,
    dataRevision: m.dataRevision,
  });
}
const PREVIEW_BYTES = 64 * 1024 * 1024;
/** All reads use the existing owner-authorized SQLite read snapshot. No mutation method. */
export function buildAdjustmentPreview(
  ctx: Context,
  source: AdjustmentSource,
  actions: unknown[],
) {
  if (
    source.dataEpoch !== meta(ctx).dataEpoch ||
    source.dataRevision !== meta(ctx).dataRevision
  )
    throw Error("来源数据修订已过期，请重新导出分析");
  const config = reviewConfig(ctx, source.deckId),
    now = ctx.now().getTime(),
    rows: AdjustmentRow[] = [],
    ids = new Set<string>(),
    targets = new Map<string, number[]>();
  const started = Date.now();
  let bytes = 0,
    expiresAt = now + 10 * 60 * 1000;
  const charge = (n: number) => {
    if (Date.now() - started > IMPORT_BUDGET.milliseconds)
      throw Error("预览计算时间超过安全预算，未部分接受");
    bytes += n;
    if (bytes > PREVIEW_BYTES)
      throw Error("预览及目标展开超过内存字节预算，未部分接受");
  };
  function claim(key: string, index: number) {
    charge(Buffer.byteLength(key) + 24);
    const old = targets.get(key) ?? [];
    old.push(index);
    targets.set(key, old);
  }
  function card(id: string) {
    return publishedCard(ctx, { cardId: id, deckId: source.deckId });
  }
  function knowledgeCards(id: string, scope: "direct" | "aggregate") {
    const node = ctx.db
      .prepare(
        "SELECT id FROM knowledge WHERE id=? AND module=? AND deleted_at IS NULL",
      )
      .get(id, source.deckId);
    if (!node) throw Error("知识点不存在或不属于来源卡片集");
    const descendants = new Set<string>([id]);
    charge(Buffer.byteLength(id) + 32);
    if (scope === "aggregate") {
      const nodes = ctx.db
        .prepare(
          "SELECT id,parent_id FROM knowledge WHERE module=? AND deleted_at IS NULL",
        )
        .all(source.deckId);
      const children = new Map<string, string[]>();
      for (const n of nodes) {
        charge(
          Buffer.byteLength(String(n.id)) +
            Buffer.byteLength(String(n.parent_id)) +
            48,
        );
        const parent = String(n.parent_id),
          list = children.get(parent) ?? [];
        list.push(String(n.id));
        children.set(parent, list);
      }
      const queue = [id];
      for (let i = 0; i < queue.length; i++)
        for (const child of children.get(queue[i]) ?? [])
          if (!descendants.has(child)) {
            descendants.add(child);
            queue.push(child);
          }
    }
    const result = new Set<string>();
    for (const c of ctx.db
      .prepare(
        "SELECT id,legacy_kind FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL AND current_version_id IS NOT NULL",
      )
      .iterate(source.deckId)) {
      const cid = String(c.id);
      if (
        currentCardLinks(ctx, source.deckId, cid, c.legacy_kind).some((k) =>
          descendants.has(k),
        )
      ) {
        charge(Buffer.byteLength(cid) + 32);
        result.add(cid);
      }
    }
    return result;
  }
  const validated = new Map<
    string,
    {
      action: z.infer<typeof Action>;
      targets: ReturnType<typeof targetBasis>[];
      basis: string;
    }
  >();
  charge(Buffer.byteLength(JSON.stringify(config)) * 2);
  const deckBasis = basisHash(config),
    knowledgeBasis = treeBasis(ctx, source.deckId, charge);
  for (const raw of actions) {
    const index = rows.length;
    const obj =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    const identity = typeof obj.actionId === "string" ? obj.actionId : null;
    if (identity) {
      if (ids.has(identity)) throw Error("actionId重复，整包拒绝");
      ids.add(identity);
      charge(Buffer.byteLength(identity) + 32);
    }
    const row: AdjustmentRow = {
      index,
      actionId: Id.safeParse(identity).success ? identity : null,
      type: typeof obj.type === "string" ? obj.type.slice(0, 200) : "未知动作",
      target: "—",
      reason: typeof obj.reason === "string" ? obj.reason.slice(0, 4000) : "",
      before: "—",
      after: "—",
      affectedCardCount: 0,
      status: "valid",
      rejection: null,
    };
    const parsed = Action.safeParse(raw);
    if (!parsed.success) {
      row.status = "rejected";
      row.rejection =
        "动作结构、字段或参数不符合四类白名单（未知字段与越权内容均拒绝）";
    } else
      try {
        const a = parsed.data;
        const affected: string[] = [];
        if (a.type === "deck.policy.retention.set") {
          if (a.deckId !== source.deckId) throw Error("动作越过来源卡片集");
          row.target = a.deckId;
          row.before = String(config.config.desiredRetention);
          row.after = String(a.value);
          claim("deck:retention:" + a.deckId, index);
        } else if (a.type === "card.schedule.advance_due") {
          const c = card(a.cardId),
            due = currentDue(ctx, c);
          row.target = a.cardId;
          row.before = due.dueAt ?? "尚无到期排期";
          row.after = a.dueAt;
          if (
            !due.dueAt ||
            Date.parse(due.dueAt) <= now ||
            Date.parse(a.dueAt) >= Date.parse(due.dueAt) ||
            due.paused
          )
            throw Error(
              "只允许提前尚未到期且未暂停的复习；已到期/逾期、延后或无排期均拒绝",
            );
          expiresAt = Math.min(expiresAt, Date.parse(due.dueAt));
          affected.push(a.cardId);
          row.affectedCardCount = 1;
          claim("card:due:" + a.cardId, index);
        } else {
          const cards =
            a.type === "card.policy.max_interval.set"
              ? new Set([a.cardId])
              : knowledgeCards(a.knowledgeId, a.scope);
          row.target =
            a.type === "card.policy.max_interval.set"
              ? a.cardId
              : a.knowledgeId + " · " + a.scope;
          if (!cards.size) throw Error("知识点没有可调整的已发布卡片");
          const values = new Map<number, number>();
          for (const id of cards) {
            const max = schedulePolicy(ctx, card(id)).maxIntervalDays;
            values.set(max, (values.get(max) ?? 0) + 1);
          }
          row.before = [...values]
            .sort((a, b) => a[0] - b[0])
            .map(([v, n]) => `${v}天 × ${n}张`)
            .join("；");
          row.after = `${a.value}天 × ${cards.size}张`;
          row.affectedCardCount = cards.size;
          for (const id of cards) {
            affected.push(id);
            claim("card:max:" + id, index);
          }
        }
        const targets = affected.sort().map((id) => {
          charge(Buffer.byteLength(id) + 256);
          return targetBasis(ctx, source.deckId, id);
        });
        const basis = basisHash({
          action: a,
          targets,
          deckBasis,
          knowledgeBasis,
        });
        charge(Buffer.byteLength(JSON.stringify(a)) * 2 + 128);
        validated.set(a.actionId, { action: a, targets, basis });
      } catch (e) {
        row.status = "rejected";
        row.rejection = e instanceof Error ? e.message : String(e);
      }
    charge(Buffer.byteLength(JSON.stringify(row)) * 2 + 128);
    rows.push(row);
  }
  for (const indices of targets.values())
    if (indices.length > 1)
      for (const i of indices)
        if (rows[i].status !== "rejected") {
          rows[i].status = "conflict";
          rows[i].rejection =
            "同一目标字段存在重复或冲突建议，涉及的建议均不可执行";
        }
  const hasher = createHash("sha256").update(JSON.stringify(source));
  for (const row of rows) hasher.update("\n").update(JSON.stringify(row));
  const token = hasher.update(randomBytes(32)).digest("hex");
  return { token, source, rows, expiresAt, validated };
}
export function adjustmentPreviewPlatform(
  current: () => Context,
  choose: (kind: "source" | "actions") => Promise<string | null>,
) {
  let cached: ReturnType<typeof buildAdjustmentPreview> | undefined,
    owner: Context | undefined,
    busy = false;
  function page(input: unknown) {
    const p = PreviewPageInput.parse(input),
      v = cached;
    if (!v || v.token !== p.token || v.source.deckId !== p.deckId)
      throw Error("预览不存在或已取消，请重新导入");
    const m = meta(current()),
      stale =
        owner !== current() ||
        m.dataEpoch !== v.source.dataEpoch ||
        m.dataRevision !== v.source.dataRevision ||
        current().now().getTime() >= v.expiresAt;
    const counts = { valid: 0, conflict: 0, rejected: 0 };
    for (const row of v.rows) counts[row.status]++;
    const rows: AdjustmentRow[] = [];
    let pageBytes = 0;
    for (
      let i = p.offset;
      i < Math.min(v.rows.length, p.offset + p.limit);
      i++
    ) {
      const row = v.rows[i],
        size = JSON.stringify(row).length * 3 + 512;
      if (rows.length && pageBytes + size > 900000) break;
      if (size > 900000) throw Error("单项预览超过传输字节预算");
      rows.push(row);
      pageBytes += size;
    }
    return {
      token: v.token,
      source: v.source,
      total: v.rows.length,
      ...counts,
      offset: p.offset,
      rows,
      stale,
      staleReason: stale
        ? "数据修订、数据库或时间已变化，旧预览失效，请重新导入"
        : null,
    };
  }
  return {
    "learning.aiAdjustment.preview.prepare": async (input: unknown) => {
      const p = PrepareSelection.parse(input),
        view = page({ deckId: p.deckId, token: p.token, offset: 0, limit: 1 });
      if (view.stale || !cached)
        throw new DomainError("AI_PREVIEW_EXPIRED", "预览已失效，请重新导入");
      const ctx = current(),
        snapshot = openReadSnapshot(ctx.db);
      try {
        return prepareAdjustmentSelection(
          { ...ctx, db: snapshot.db },
          cached,
          p,
        );
      } catch (e) {
        throw new DomainError(
          "AI_SELECTION_REJECTED",
          e instanceof Error ? e.message : "执行前校验未完成",
        );
      } finally {
        snapshot.close();
      }
    },
    "learning.aiAdjustment.preview.open": async (input: unknown) => {
      const p = PreviewPageInput.pick({ deckId: true }).parse(input);
      if (busy) throw new DomainError("AI_PREVIEW_BUSY", "正在解析，请等待");
      busy = true;
      cached = undefined;
      owner = undefined;
      try {
        const ctx = current(),
          initial = meta(ctx),
          sourcePath = await choose("source");
        if (!sourcePath) return null;
        const source = await readSourceZip(sourcePath);
        if (source.deckId !== p.deckId)
          throw Error("来源deckId与当前卡片集不一致");
        const path = await choose("actions");
        if (!path) return null;
        const pack = await readAdjustmentZip(path);
        if (digest(pack.source) !== digest(source))
          throw Error(
            "AI返回exportId/snapshotId/deckId或数据修订与原始来源不一致",
          );
        if (ctx !== current() || digest(meta(ctx)) !== digest(initial))
          throw Error("解析期间数据库发生变化，请重新导入");
        const snapshot = openReadSnapshot(ctx.db);
        try {
          cached = buildAdjustmentPreview(
            { ...ctx, db: snapshot.db },
            source,
            pack.actions,
          );
          owner = ctx;
        } finally {
          snapshot.close();
        }
        return page({
          deckId: p.deckId,
          token: cached.token,
          offset: 0,
          limit: 50,
        });
      } catch (e) {
        cached = undefined;
        owner = undefined;
        throw new DomainError(
          "AI_PREVIEW_REJECTED",
          e instanceof Error ? e.message : "建议解析失败",
        );
      } finally {
        busy = false;
      }
    },
    "learning.aiAdjustment.preview.page": async (input: unknown) => page(input),
    "learning.aiAdjustment.preview.close": async (input: unknown) => {
      const p = PreviewScope.parse(input);
      if (cached?.token === p.token && cached.source.deckId === p.deckId) {
        cached = undefined;
        owner = undefined;
      }
      return { closed: true };
    },
  };
}
