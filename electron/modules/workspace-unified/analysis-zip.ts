import { openReadSnapshot } from "../../infrastructure/read-snapshot.ts";
import { randomUUID, createHash } from "node:crypto";
import {
  createWriteStream,
  createReadStream,
  lstatSync,
  readFileSync,
} from "node:fs";
import { statfs, rename, rm, open } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { Readable } from "node:stream";
import { pipeline, finished } from "node:stream/promises";
import { crc32 } from "node:zlib";
import yazl from "yazl";
import yauzl from "yauzl";
import { z } from "zod";
import type { Context } from "../../infrastructure/context.ts";
import {
  ExportAnalysis,
  Manifest,
  AI_ANALYSIS_FORMAT,
  FileEntry,
  type ExportAnalysisInput,
} from "../../../shared/protocol/ai-analysis.ts";
import {
  ContentVersion,
  ReviewEvent,
} from "../../../shared/protocol/unified.ts";
import { currentCardLinks } from "../knowledge-unified/links.ts";
import { requireTree, markdownBody } from "../knowledge-unified/storage.ts";
import { knowledgePlacements } from "../../../shared/knowledge/media.ts";
import {
  readSchedule,
  publishedCard,
  policySnapshot,
  currentDue,
  digest,
} from "../cards-unified/schedule.ts";
import { reviewConfig } from "../review/config-service.ts";
import { draftImage } from "../media/drafts.ts";
import { validateImage } from "../../infrastructure/images.ts";
import { getAnalysisPrompt } from "./ai-prompt.ts";
import { analysisSummary } from "./analysis-summary.ts";
import { finishMetrics } from "./analytics-metrics.ts";
export const SHARD_BYTES = 256 * 1024,
  TARGET_BYTES = 128 * 1024;
export const ZIP_BUDGET = 2 * 1024 * 1024 * 1024,
  ENTRY_BUDGET = 100000,
  IMAGE_BUDGET = 20 * 1024 * 1024;
const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
export type Progress = {
  phase:
    | "idle"
    | "choosing"
    | "writing"
    | "validating"
    | "done"
    | "cancelled"
    | "failed";
  cardCount: number;
  eventCount: number;
  bytes: number;
};
export interface ExportControl {
  cancelled: boolean;
  progress: Progress;
  checkpoint?: () => void | Promise<void>;
  availableBytes?: () => Promise<number>;
}
/** Items remain bounded by bytes; counts are packing targets, never total-card limits. */
export class JsonSharder {
  private items: string[] = [];
  private bytes = 12;
  private part = 1;
  private prefix: string;
  private count: number;
  private write: (name: string, b: Buffer) => Promise<void>;
  constructor(
    prefix: string,
    count: number,
    write: (name: string, b: Buffer) => Promise<void>,
  ) {
    this.prefix = prefix;
    this.count = count;
    this.write = write;
  }
  path() {
    return `data/${this.prefix}-${String(this.part).padStart(4, "0")}.json`;
  }
  async add(item: unknown) {
    const value = JSON.stringify(item),
      size = Buffer.byteLength(value);
    if (size + 12 > SHARD_BYTES)
      throw Error(
        "单条内容超过256KiB安全分片预算，未截断；请检查异常长正文或学习事件",
      );
    if (
      this.items.length &&
      (this.bytes + size + 1 > SHARD_BYTES ||
        this.bytes >= TARGET_BYTES ||
        this.items.length >= this.count)
    )
      await this.flush();
    const location = { path: this.path(), position: this.items.length };
    this.items.push(value);
    this.bytes += size + 1;
    return location;
  }
  async flush() {
    if (!this.items.length) return;
    const b = Buffer.from('{"items":[' + this.items.join(",") + "]}");
    if (b.length > SHARD_BYTES) throw Error("分片字节预算超限");
    await this.write(this.path(), b);
    this.items = [];
    this.bytes = 12;
    this.part++;
  }
}
/** Stream every ZIP member, checking actual expansion bytes, CRC, SHA and descriptors. */
export async function validateAnalysisZip(
  path: string,
  expected: z.infer<typeof FileEntry>[],
  manifestBytes: Buffer,
  checkpoint: () => Promise<void> = async () => {},
) {
  const files = new Map(expected.map((f) => [f.path, f]));
  files.set("data/manifest.json", {
    path: "data/manifest.json",
    bytes: manifestBytes.length,
    sha256: hash(manifestBytes),
  });
  return new Promise<void>((resolve, reject) =>
    yauzl.open(
      path,
      { lazyEntries: true, strictFileNames: true, validateEntrySizes: true },
      (err, zip) => {
        if (err || !zip) {
          reject(err ?? Error("ZIP无法打开"));
          return;
        }
        let total = 0,
          count = 0,
          ended = false;
        const fail = (e: unknown) => {
          if (ended) return;
          ended = true;
          zip.close();
          reject(e);
        };
        zip.on("error", fail);
        zip.on("end", () => {
          if (ended) return;
          ended = true;
          if (files.size) reject(Error("ZIP文件缺失"));
          else resolve();
        });
        zip.on("entry", (entry) => {
          void (async () => {
            await checkpoint();
            const f = files.get(entry.fileName);
            if (
              !f ||
              entry.generalPurposeBitFlag & 1 ||
              ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000 ||
              entry.uncompressedSize !== f.bytes ||
              ++count > ENTRY_BUDGET
            )
              throw Error("ZIP目录、路径或字节数校验失败");
            files.delete(entry.fileName);
            const stream = await new Promise<NodeJS.ReadableStream>(
              (res, rej) =>
                zip.openReadStream(entry, (e, s) =>
                  e || !s ? rej(e ?? Error("ZIP无法读取")) : res(s),
                ),
            );
            let bytes = 0,
              crc = 0;
            const sha = createHash("sha256");
            for await (const raw of stream) {
              const b = Buffer.from(raw);
              bytes += b.length;
              total += b.length;
              if (total > ZIP_BUDGET || bytes > f.bytes)
                throw Error("ZIP实际展开预算超限");
              sha.update(b);
              crc = crc32(b, crc);
              await checkpoint();
            }
            if (
              bytes !== f.bytes ||
              sha.digest("hex") !== f.sha256 ||
              crc !== entry.crc32
            )
              throw Error("ZIP SHA256/CRC/字节数校验失败");
            zip.readEntry();
          })().catch(fail);
        });
        zip.readEntry();
      },
    ),
  );
}
export async function writeAnalysisZip(
  source: Context,
  input: ExportAnalysisInput,
  destination: string,
  control: ExportControl,
) {
  const p = ExportAnalysis.parse(input),
    location = source.db.location();
  if (!location) throw Error("导出需要可信的文件数据库快照");
  const snapshot = openReadSnapshot(source.db),
    db = snapshot.db,
    ctx: Context = {
      ...source,
      db,
      now: (() => {
        const now = source.now();
        return () => new Date(now);
      })(),
    },
    temp = destination + ".writing-" + randomUUID();
  const zip = new yazl.ZipFile(),
    output = createWriteStream(temp, { flags: "wx" }),
    files: z.infer<typeof FileEntry>[] = [];
  let total = 0,
    manifestMemory = 0,
    streamError: unknown,
    meta: Record<string, unknown> | undefined;
  const writing = pipeline(zip.outputStream, output).catch((e) => {
    streamError = e;
  });
  zip.on("error", (e) => output.destroy(e));
  async function checkpoint() {
    if (control.cancelled) throw Error("导出已取消");
    if (streamError) throw streamError;
    await new Promise<void>((r) => setImmediate(r));
    await control.checkpoint?.();
    if (control.cancelled) throw Error("导出已取消");
  }
  async function space(bytes: number) {
    const available = control.availableBytes
      ? await control.availableBytes()
      : await statfs(dirname(destination)).then((s) => s.bavail * s.bsize);
    if (available < bytes + 16 * 1024 * 1024)
      throw Error("磁盘可用空间不足，至少需保留16MiB余量");
  }
  async function add(name: string, b: Buffer, listed = true) {
    await checkpoint();
    if (
      !/^(data|prompt)\/[A-Za-z0-9_./-]+$/.test(name) ||
      name.split("/").some((n) => n === "." || n === "..")
    )
      throw Error("ZIP路径不安全");
    if (total + b.length > ZIP_BUDGET || files.length >= ENTRY_BUDGET - 1)
      throw Error("导出超过2GiB展开量或ZIP条目安全预算，未裁剪任何卡片");
    await space(b.length);
    total += b.length;
    control.progress.bytes = total;
    if (listed) {
      const f = { path: name, bytes: b.length, sha256: hash(b) };
      manifestMemory += Buffer.byteLength(JSON.stringify(f));
      if (manifestMemory > 16 * 1024 * 1024)
        throw Error("ZIP目录超过16MiB工作内存预算");
      files.push(f);
    }
    const read = Readable.from([b]);
    const done = finished(read);
    zip.addReadStreamLazy(name, { size: b.length, compress: true }, (cb) =>
      cb(null, read),
    );
    await Promise.race([
      done,
      writing.then(() => {
        if (streamError) throw streamError;
      }),
    ]);
  }
  try {
    meta = snapshot.meta;
    requireTree(ctx, p.deckId);
    if (Number(db.prepare("PRAGMA user_version").get()!.user_version) !== 606)
      throw Error("仅支持Schema606");
    // Reject abnormal single records before parsing/allocating their JSON bodies.
    for (const table of ["learning_content_versions", "learning_review_events"])
      if (
        db
          .prepare(
            `SELECT 1 FROM ${table} v JOIN learning_cards c ON c.id=v.card_id WHERE c.deck_id=? AND c.deleted_at IS NULL AND length(CAST(v.document AS BLOB))>? LIMIT 1`,
          )
          .get(p.deckId, SHARD_BYTES)
      )
        throw Error("单条正文或事件超过256KiB安全预算，未截断");
    control.progress.phase = "writing";
    const prompt = getAnalysisPrompt(ctx),
      exportId = randomUUID(),
      snapshotId = digest({
        exportId,
        epoch: meta.epoch,
        revision: meta.revision,
      }),
      summary = await analysisSummary(ctx, p, checkpoint);
    const nodes = summary.nodes;
    await add("data/summary.json", json({ ...summary, nodes: undefined }));
    await add(
      "data/deck.json",
      json({
        deckId: p.deckId,
        name: db.prepare("SELECT name FROM decks WHERE id=?").get(p.deckId)!
          .name,
        policy: reviewConfig(ctx, p.deckId),
      }),
    );
    const images = new Set<string>();
    let imageMemory = 0;
    async function image(assetId: string, fileName?: string, mime?: string) {
      if (!p.includeImages) return;
      let metaImage;
      if (fileName && mime) {
        metaImage = {
          file_name: fileName,
          mime,
          sha256: undefined as string | undefined,
        };
        const stored = db
          .prepare("SELECT value FROM settings WHERE key=?")
          .get("media-draft:" + assetId);
        if (stored) {
          const m = JSON.parse(String(stored.value));
          if (
            m.id !== assetId ||
            m.deckId !== p.deckId ||
            m.file_name !== fileName ||
            m.mime !== mime
          )
            throw Error("图片引用身份或范围损坏");
          metaImage.sha256 = m.sha256;
        }
      } else metaImage = draftImage(ctx, assetId, p.deckId);
      if (!/^[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(metaImage.file_name))
        throw Error("图片引用路径不安全");
      const path = join(ctx.dataDir, "attachments", metaImage.file_name),
        st = lstatSync(path);
      if (!st.isFile() || st.isSymbolicLink() || st.size > IMAGE_BUDGET)
        throw Error("图片缺失、路径不安全或超过20MiB预算");
      const b = readFileSync(path);
      validateImage(b, metaImage.mime);
      const sha = hash(b);
      if (metaImage.sha256 && metaImage.sha256 !== sha)
        throw Error("图片文件哈希不一致");
      // Asset identity is retained in the filename; repeated placements reuse the same entry.
      const name =
        "data/images/" +
        assetId +
        "." +
        (metaImage.mime === "image/jpeg"
          ? "jpg"
          : metaImage.mime === "image/png"
            ? "png"
            : "webp");
      if (images.has(name)) return;
      images.add(name);
      imageMemory += Buffer.byteLength(name) + 64;
      if (imageMemory > 8 * 1024 * 1024)
        throw Error("图片索引超过8MiB工作内存预算");
      await add(name, b);
    }
    const knowledge = new JsonSharder("knowledge/nodes", 50, add);
    const kh = createHash("sha256");
    for (const n of db
      .prepare(
        "SELECT id,name,parent_id,version FROM knowledge WHERE module=? AND deleted_at IS NULL ORDER BY id",
      )
      .iterate(p.deckId)) {
      const nodeId = String(n.id),
        body = markdownBody(ctx, p.deckId, nodeId),
        refs = knowledgePlacements(body);
      for (const ref of refs) await image(ref.assetId);
      const value = {
        nodeId,
        name: n.name,
        parentId: n.parent_id,
        revision: n.version,
        markdown: body,
        materialIncomplete: refs.length > 0 && !p.includeImages,
        statistics: {
          direct: finishMetrics(nodes.get(nodeId)!.direct),
          aggregate: finishMetrics(nodes.get(nodeId)!.aggregate),
        },
      };
      kh.update(JSON.stringify(value));
      await knowledge.add(value);
    }
    await knowledge.flush();
    const cards = new JsonSharder("cards/cards", 50, add),
      reviews = new JsonSharder("reviews/reviews", 40, add),
      index = new JsonSharder("index/cards", 100, add);
    let cardCount = 0,
      eventCount = 0;
    for (const c of db
      .prepare(
        "SELECT * FROM learning_cards WHERE deck_id=? AND deleted_at IS NULL ORDER BY id",
      )
      .iterate(p.deckId)) {
      await checkpoint();
      const cardId = String(c.id),
        card = publishedCard(ctx, { cardId, deckId: p.deckId }),
        content = ContentVersion.parse(
          JSON.parse(
            String(
              db
                .prepare(
                  "SELECT document FROM learning_content_versions WHERE id=?",
                )
                .get(c.current_version_id)!.document,
            ),
          ),
        ),
        schedule = readSchedule(ctx, card),
        knowledgeIds = currentCardLinks(
          ctx,
          p.deckId,
          cardId,
          c.legacy_kind,
        ).filter((n) => nodes.has(n));
      for (const ref of content.mediaRefs)
        await image(ref.assetId, ref.fileName, ref.mime);
      const cardLocation = await cards.add({
        cardId,
        contentVersionId: card.versionId,
        cycleId: card.cycleId,
        revision: c.revision,
        content,
        knowledgeIds,
        schedule,
        policy: policySnapshot(ctx, card),
        due: currentDue(ctx, card),
        materialIncomplete:
          content.availability !== "known" ||
          (!p.includeImages && content.mediaRefs.length > 0),
      });
      let historyCount = 0;
      for (const e of db
        .prepare(
          "SELECT * FROM learning_review_events WHERE card_id=? ORDER BY created_at,id",
        )
        .iterate(cardId)) {
        const event = ReviewEvent.parse(JSON.parse(String(e.document)));
        if (event.cardId !== cardId || event.eventId !== e.id)
          throw Error("学习事件身份不一致");
        const raw = db
          .prepare("SELECT * FROM schedule_events WHERE id=?")
          .get(event.eventId);
        const historyContent = ContentVersion.parse(
          JSON.parse(
            String(
              db
                .prepare(
                  "SELECT document FROM learning_content_versions WHERE id=?",
                )
                .get(event.contentVersionId)!.document,
            ),
          ),
        );
        for (const ref of historyContent.mediaRefs)
          await image(ref.assetId, ref.fileName, ref.mime);
        const eventLocation = await reviews.add({
          cardId,
          eventId: event.eventId,
          event,
          content: historyContent,
          scheduleEvent: raw
            ? Object.fromEntries(
                Object.entries(raw).map(([k, v]) => [
                  k,
                  typeof v === "string" &&
                  ["before_state", "after_state", "log"].includes(k)
                    ? JSON.parse(v)
                    : v,
                ]),
              )
            : null,
          materialIncomplete:
            historyContent.availability !== "known" ||
            (!p.includeImages && historyContent.mediaRefs.length > 0),
        });
        await index.add({
          type: "event",
          cardId,
          eventId: event.eventId,
          ...eventLocation,
        });
        historyCount++;
        eventCount++;
        control.progress.eventCount = eventCount;
      }
      await index.add({
        type: "card",
        cardId,
        contentVersionId: card.versionId,
        cycleId: card.cycleId,
        scheduleHash: schedule.hash,
        eventCount: historyCount,
        knowledgeIds,
        ...cardLocation,
      });
      cardCount++;
      control.progress.cardCount = cardCount;
    }
    await cards.flush();
    await reviews.flush();
    await index.flush();
    await add("prompt/analysis-prompt.md", Buffer.from(prompt.text));
    const manifest = Manifest.parse({
      format: AI_ANALYSIS_FORMAT,
      schema: 606,
      exportId,
      snapshotId,
      deckId: p.deckId,
      createdAt: ctx.now().toISOString(),
      dataEpoch: meta.epoch,
      dataRevision: meta.revision,
      knowledgeVersion: kh.digest("hex"),
      scheduleVersion: digest(reviewConfig(ctx, p.deckId)),
      promptRevision: prompt.revision,
      date: p.date,
      includeImages: p.includeImages,
      cardCount,
      eventCount,
      knowledgeCount: nodes.size,
      totalDataBytes: files
        .filter((f) => f.path.startsWith("data/"))
        .reduce((n, f) => n + f.bytes, 0),
      files,
      indexFormat: "card-event-locations/1",
      privacy:
        "包含题目、答案、全部学习事件及反思；仅保存本地，由用户自行决定是否交给外部AI。图片未附时不得猜测内容。",
      limits: {
        normalShardBytes: SHARD_BYTES,
        totalBytes: ZIP_BUDGET,
        entries: ENTRY_BUDGET,
      },
    });
    const mb = Buffer.from(JSON.stringify(manifest));
    await add("data/manifest.json", mb, false);
    zip.end();
    await writing;
    if (streamError) throw streamError;
    control.progress.phase = "validating";
    await validateAnalysisZip(temp, files, mb, checkpoint);
    await checkpoint();
    await space(0);
    const handle = await open(temp, "r+");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await checkpoint();
    await rename(temp, destination);
    control.progress.phase = "done";
    return {
      saved: true,
      name: basename(destination),
      cardCount,
      eventCount,
      snapshotId,
    };
  } catch (e) {
    control.progress.phase = control.cancelled ? "cancelled" : "failed";
    (zip.outputStream as Readable).destroy();
    output.destroy();
    await writing;
    throw new Error(
      (e as NodeJS.ErrnoException).code === "ENOSPC"
        ? "磁盘空间不足，导出未完成"
        : e instanceof Error
          ? e.message
          : String(e),
    );
  } finally {
    snapshot.close();
    await rm(temp, { force: true });
  }
}
function json(value: unknown) {
  const b = Buffer.from(JSON.stringify(value));
  if (b.length > SHARD_BYTES)
    throw Error("摘要或配置超过256KiB安全预算，未截断；请缩小日期范围");
  return b;
}
