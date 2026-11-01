import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { crc32 } from "node:zlib";
import yauzl from "yauzl";
import {
  ActionManifest,
  SmallPackage,
  Part,
} from "../../../shared/protocol/ai-adjustments.ts";
export const IMPORT_BUDGET = {
  compressed: 32 * 1024 * 1024,
  expanded: 64 * 1024 * 1024,
  file: 8 * 1024 * 1024,
  entries: 4096,
  directory: 2 * 1024 * 1024,
  depth: 24,
  ratio: 200,
  milliseconds: 15000,
};
export const sha256 = (b: Buffer) =>
  createHash("sha256").update(b).digest("hex");
/** Inspect lexical nesting and duplicate object keys before JSON.parse can collapse them. */
export function safeJson(b: Buffer): unknown {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(b),
    stack: Array<{ kind: string; keys: Set<string> }> = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const start = i++;
      for (; i < text.length; i++) {
        if (text[i] === "\\") {
          i++;
          continue;
        }
        if (text[i] === '"') break;
      }
      if (i >= text.length) throw Error("JSON字符串不完整");
      let j = i + 1;
      while (/\s/.test(text[j] ?? "") && j < text.length) j++;
      if (text[j] === ":") {
        const key = JSON.parse(text.slice(start, i + 1)),
          top = stack.at(-1);
        if (
          !top ||
          top.kind !== "{" ||
          top.keys.has(key) ||
          ["__proto__", "constructor", "prototype"].includes(key)
        )
          throw Error("JSON重复或危险字段");
        top.keys.add(key);
      }
    } else if (c === "{" || c === "[") {
      stack.push({ kind: c, keys: new Set() });
      if (stack.length > IMPORT_BUDGET.depth)
        throw Error("JSON深度超过安全预算");
    } else if (c === "}" || c === "]") stack.pop();
  }
  return JSON.parse(text);
}
/** Never extract to disk. Stream actual bytes, CRC and expansion budgets before parsing. */
export async function readAdjustmentZip(path: string) {
  if ((await stat(path)).size > IMPORT_BUDGET.compressed)
    throw Error("ZIP压缩字节超过安全预算，未部分接受");
  const started = Date.now(),
    files = new Map<string, Buffer>();
  await new Promise<void>((resolve, reject) =>
    yauzl.open(
      path,
      { lazyEntries: true, strictFileNames: true, validateEntrySizes: true },
      (err, zip) => {
        if (err || !zip) {
          reject(err ?? Error("ZIP无法打开"));
          return;
        }
        let total = 0,
          entries = 0,
          directory = 0,
          ended = false;
        const fail = (e: unknown) => {
          if (ended) return;
          ended = true;
          zip.close();
          reject(e);
        };
        const deadline = setTimeout(
          () => fail(Error("ZIP解析时间超过安全预算")),
          IMPORT_BUDGET.milliseconds,
        );
        const check = () => {
          if (ended || Date.now() - started > IMPORT_BUDGET.milliseconds)
            throw Error("ZIP解析时间超过安全预算");
        };
        zip.on("error", fail);
        zip.on("close", () => clearTimeout(deadline));
        zip.on("end", () => {
          if (!ended) {
            ended = true;
            clearTimeout(deadline);
            resolve();
          }
        });
        zip.on("entry", (entry) => {
          void (async () => {
            check();
            const name = entry.fileName;
            directory +=
              Buffer.byteLength(name) +
              entry.extraFieldLength +
              entry.fileCommentLength +
              46;
            if (
              !/^(ai-adjustments\.json|manifest\.json|adjustments\/part-\d{4,}\.json)$/.test(
                name,
              ) ||
              files.has(name)
            )
              throw Error("ZIP路径非法、重复或包含未知文件");
            if (
              entry.generalPurposeBitFlag & 1 ||
              ![0, 8].includes(entry.compressionMethod) ||
              ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000
            )
              throw Error("ZIP加密、链接或压缩方法不受支持");
            if (
              ++entries > IMPORT_BUDGET.entries ||
              directory > IMPORT_BUDGET.directory ||
              entry.uncompressedSize > IMPORT_BUDGET.file ||
              total + entry.uncompressedSize > IMPORT_BUDGET.expanded ||
              entry.uncompressedSize >
                Math.max(1, entry.compressedSize) * IMPORT_BUDGET.ratio
            )
              throw Error("ZIP展开资源预算超限，未部分接受");
            const stream = await new Promise<import("node:stream").Readable>(
              (res, rej) =>
                zip.openReadStream(entry, (e, s) =>
                  e || !s ? rej(e ?? Error("ZIP无法读取")) : res(s),
                ),
            );
            const chunks: Buffer[] = [];
            let bytes = 0,
              crc = 0;
            try {
              for await (const raw of stream) {
                check();
                const b = Buffer.from(raw);
                bytes += b.length;
                total += b.length;
                if (
                  bytes > IMPORT_BUDGET.file ||
                  total > IMPORT_BUDGET.expanded
                )
                  throw Error("ZIP实际展开资源预算超限");
                crc = crc32(b, crc);
                chunks.push(b);
              }
            } finally {
              stream.destroy();
            }
            if (bytes !== entry.uncompressedSize || crc !== entry.crc32)
              throw Error("ZIP实际字节数或CRC不一致");
            files.set(name, Buffer.concat(chunks));
            zip.readEntry();
          })().catch(fail);
        });
        zip.readEntry();
      },
    ),
  );
  if (files.has("ai-adjustments.json")) {
    if (files.size !== 1) throw Error("小包不得混合manifest或分片");
    const p = SmallPackage.parse(safeJson(files.get("ai-adjustments.json")!));
    return { source: p.source, actions: p.actions };
  }
  const raw = files.get("manifest.json");
  if (!raw) throw Error("缺少manifest.json");
  const m = ActionManifest.parse(safeJson(raw));
  files.delete("manifest.json");
  const names = new Set<string>(),
    actions: unknown[] = [];
  for (const f of m.files) {
    if (names.has(f.path)) throw Error("manifest分片路径重复");
    names.add(f.path);
    const b = files.get(f.path);
    if (!b || b.length !== f.bytes || sha256(b) !== f.sha256)
      throw Error("分片缺失、SHA256或实际字节数错误");
    const p = Part.parse(safeJson(b));
    if (p.actions.length !== f.count) throw Error("分片建议数量不一致");
    for (const a of p.actions) actions.push(a);
    files.delete(f.path);
  }
  if (files.size || actions.length !== m.actionCount)
    throw Error("分片集合或总建议数量不完整");
  return { source: m.source, actions };
}
