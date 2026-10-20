import { ImageRole, imageLayout } from "../../../shared/image-node.ts";
import { DomainError } from "../../../shared/domain-error.ts";
import { validateImage } from "../../infrastructure/images.ts";
import { createHash } from "node:crypto";
import { MODULES, isMemoryModule } from "../../../shared/types.ts";
import type {
  ExchangePackage,
  ArchiveDocument,
} from "../../../shared/import-protocol.ts";
const str = (v: any, label: string, limit = 200000) => {
  if (typeof v !== "string" || !v.trim() || v.length > limit)
    throw new Error(`${label}缺失或过长`);
  return v;
};
function key(v: any, label: string) {
  str(v, label, 150);
  if (!/^[a-zA-Z0-9_:.\-]+$/.test(v))
    throw new Error(`${label}仅允许英文字母、数字及 _ : . -`);
}
function subject(s: any) {
  str(s, "卡片集", 150);
}
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export const digest = (value: any) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
export function validateArchive(a: ArchiveDocument) {
  if (!a || typeof a !== "object") throw new Error("知识点存档格式错误");
  if (a.note != null && (typeof a.note !== "string" || a.note.length > 5000))
    throw new Error("版本说明应为5000字以内的文字");
  key(a.archiveId, "archiveId");
  str(a.version, "知识点版本", 80);
  subject(a.subject);
  if (
    !Array.isArray(a.nodes) ||
    a.nodes.length > 5000 ||
    !Array.isArray(a.relations) ||
    a.relations.length > 20000
  )
    throw new Error("知识点节点或关系数量超限");
  const nodes = new Map<string, any>();
  for (const n of a.nodes) {
    key(n.key, "知识点 key");
    str(n.name, "知识点名称", 200);
    if (n.name !== n.name.trim()) throw new Error("知识点名称首尾不能有空格");
    if (nodes.has(n.key)) throw new Error("存档内知识点 key 重复");
    nodes.set(n.key, n);
    for (const f of ["aliases", "principle", "conditions", "method", "traps"])
      if (
        n[f as keyof typeof n] != null &&
        typeof n[f as keyof typeof n] !== "string"
      )
        throw new Error(`知识点字段 ${f} 必须为文字`);
  }
  const siblings = new Set<string>();
  for (const n of a.nodes) {
    if (n.parentKey && !nodes.has(n.parentKey))
      throw new Error("父知识点不存在");
    const name = (n.parentKey ?? "") + "\0" + n.name;
    if (siblings.has(name)) throw new Error("同层知识点重名");
    siblings.add(name);
    const seen = new Set<string>([n.key]);
    let p = n.parentKey;
    while (p) {
      if (seen.has(p)) throw new Error("存档父子关系形成循环");
      seen.add(p);
      p = nodes.get(p)?.parentKey;
    }
  }
  const edges = new Set<string>();
  for (const r of a.relations) {
    if (
      !nodes.has(r.sourceKey) ||
      !nodes.has(r.targetKey) ||
      r.sourceKey === r.targetKey
    )
      throw new Error("存档连线端点错误");
    str(r.kind, "关系类型", 50);
    const edge = [r.sourceKey, r.targetKey].sort().join("\0") + "\0" + r.kind;
    if (edges.has(edge)) throw new Error("存档连线重复");
    edges.add(edge);
    if (r.note != null && typeof r.note !== "string")
      throw new Error("关系说明必须为文字");
  }
}
export function validatePackage(input: any): ExchangePackage {
  if (
    !input ||
    input.format !== "ganksoft.content" ||
    input.schemaVersion !== "2.0"
  )
    throw new Error("请使用 ganksoft.content 2.0 协议");
  if (Buffer.byteLength(JSON.stringify(input)) > 128 * 1024 * 1024)
    throw new Error("导入包不能超过128 MB，请拆分文件");
  if (input.collection != null) {
    str(input.collection.name, "卡片集名称", 100);
    if (!["question", "memory"].includes(input.collection.kind))
      throw Error("卡片集类型不合法");
    if (input.items?.some((i: any) => i.kind !== input.collection.kind))
      throw Error("卡片集内条目类型不一致");
  }
  key(input.packageId, "packageId");
  key(input.namespace, "namespace");
  if (
    !Array.isArray(input.archives) ||
    input.archives.length > 30 ||
    !Array.isArray(input.items) ||
    input.items.length > 2000
  )
    throw new Error("导入包 archives/items 格式或数量错误");
  const archives = new Map<string, ArchiveDocument>();
  for (const a of input.archives) {
    validateArchive(a);
    if (archives.has(a.archiveId))
      throw new Error("同一包中每个知识库只允许一个版本");
    archives.set(a.archiveId, a);
  }
  const entries = new Set<string>();
  let images = 0;
  for (const item of input.items) {
    key(item.key, "条目 key");
    if (entries.has(item.key)) throw new Error("条目 key 重复");
    entries.add(item.key);
    subject(item.subject);
    str(item.title, "条目标题", 300);
    if (item.kind !== "question" && item.kind !== "memory")
      throw new Error("条目 kind 必须为 question 或 memory");

    if (item.images != null && !Array.isArray(item.images))
      throw new Error("images 必须为数组");
    if (item.kind === "memory") {
      str(item.cue, "记忆提示");
      str(item.content, "记忆内容");
    } else {
      if (!item.stem && !item.images?.some((im: any) => im.role === "question"))
        throw new Error("错题缺少题干或题图");
      if (item.answer && !/^[A-D]$/.test(item.answer))
        throw new Error("答案应为A—D，未知请留空");
    }
    for (const f of [
      "stem",
      "options",
      "analysis",
      "thought",
      "projectNote",
      "cue",
      "content",
      "material",
    ])
      if (
        item[f] != null &&
        (typeof item[f] !== "string" || item[f].length > 200000)
      )
        throw new Error(`条目字段 ${f} 类型或长度错误`);
    if (
      item.analysisOrigin &&
      !["source", "assistant", "mixed"].includes(item.analysisOrigin)
    )
      throw new Error("analysisOrigin 不合法");
    if (item.needsReview != null && typeof item.needsReview !== "boolean")
      throw new Error("needsReview 必须为布尔值");
    if (item.source) {
      str(item.source.file, "来源文件", 1000);
      if (item.source.page != null && typeof item.source.page !== "string")
        throw new Error("来源页码请使用字符串");
    }
    if (!Array.isArray(item.knowledgeRefs))
      throw new Error("每个条目必须有 knowledgeRefs 数组");
    for (const ref of item.knowledgeRefs) {
      key(ref.archiveId, "知识库 ID");
      key(ref.nodeKey, "知识点引用 key");
      str(ref.version, "引用版本", 80);
      const a = archives.get(ref.archiveId);
      if (
        a &&
        (a.subject !== item.subject ||
          a.version !== ref.version ||
          !a.nodes.some((n) => n.key === ref.nodeKey))
      )
        throw new Error("知识点引用与存档的科目、版本或节点不对应");
    }
    if (item.images != null && !Array.isArray(item.images))
      throw new Error("images 必须为数组");
    if ((item.images?.length ?? 0) > 40) throw Error("每张卡片图片最多40张");
    for (const [imageIndex, image] of (item.images ?? []).entries()) {
      if (!image || typeof image !== "object" || Object.keys(image).some(k => !["role", "mime", "base64", "layout", "sha256"].includes(k))) throw Error("图片字段不合法");
      if (image.layout !== undefined) imageLayout(image.layout);
      if (item.kind === "memory" && !["question", "analysis"].includes(image.role)) throw Error("记忆图片用途不合法");
      if (
        !ImageRole.safeParse(image.role).success ||
        !["image/png", "image/jpeg", "image/webp"].includes(image.mime) ||
        typeof image.base64 !== "string" ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(image.base64)
      )
        throw new Error("图片格式错误");
      const b = Buffer.from(image.base64, "base64");
      if (image.sha256 !== undefined && (!/^[a-f0-9]{64}$/.test(image.sha256) || createHash("sha256").update(b).digest("hex") !== image.sha256)) throw Error("图片哈希不一致");
      if (!b.length || b.length > 20 * 1024 * 1024)
        throw new Error("图片为空或超过20 MB");
      if (
        (image.mime === "image/png" &&
          b.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") ||
        (image.mime === "image/jpeg" &&
          b.subarray(0, 3).toString("hex") !== "ffd8ff") ||
        (image.mime === "image/webp" &&
          (b.subarray(0, 4).toString() !== "RIFF" ||
            b.subarray(8, 12).toString() !== "WEBP"))
      )
        throw new Error("图片内容与 MIME 不符");
      try {
        validateImage(b, image.mime);
      } catch (error) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "条目 " +
            item.key +
            " 图片 " +
            (imageIndex + 1) +
            "：" +
            (error as Error).message,
          {
            ["items." + item.key + ".images." + imageIndex]:
              "图片不可解码或格式不合法",
          },
        );
      }
      if (++images > 1000) throw new Error("单个导入包图片最多1000张");
    }
  }
  return input;
}
