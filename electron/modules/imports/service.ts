import { createMediaAsset, recoverMediaWrites } from "../media/service.ts";
import {
  live,
  required,
  text,
  invalidate,
  id,
  one,
  all,
  run,
  audit,
  moduleName,
  deckKind,
  type Context,
} from "../../infrastructure/context.ts";
import { transaction } from "../../infrastructure/database.ts";
import { saveKnowledge } from "../knowledge/service.ts";
import {
  saveQuestion,
  saveProjectNote,
  addAsset,
  deleteAsset,
} from "../questions/service.ts";
import { saveMemory } from "../memory/service.ts";
import { validatePackage, digest } from "./protocol.ts";
import type {
  ExchangePackage,
  ArchiveDocument,
} from "../../../shared/import-protocol.ts";
function mappedPackage(ctx: Context, raw: any, options: any = {}) {
  if (!options.targetDeckId) return validatePackage(raw);
  const deck = one(
    ctx,
    "SELECT * FROM decks WHERE id=? AND deleted_at IS NULL",
    options.targetDeckId,
  );
  if (!deck) throw new Error("请选择有效的目标卡片集");
  const pkg = structuredClone(raw);
  const suffix = "-" + digest(deck.id).slice(0, 12);
  pkg.packageId += suffix;
  pkg.namespace += suffix;
  const refs = new Map<string, string>();
  for (const a of pkg.archives ?? []) {
    refs.set(a.archiveId, a.archiveId + suffix);
    a.archiveId += suffix;
    a.subject = deck.id;
  }
  for (const i of pkg.items ?? []) {
    if (i.kind !== deck.kind)
      throw new Error("导入卡片类型与目标卡片集不一致，请分别导入");
    i.subject = deck.id;
    for (const r of i.knowledgeRefs ?? [])
      r.archiveId = refs.get(r.archiveId) ?? r.archiveId + suffix;
  }
  return validatePackage(pkg);
}
// Older targeted imports encoded their owning deck in the package suffix.
export function importBatches(ctx: Context) {
  const decks = all(ctx, "SELECT id FROM decks");
  return all(
    ctx,
    "SELECT * FROM import_batches ORDER BY created_at DESC,rowid DESC",
  ).map((batch) => {
    const report = JSON.parse(batch.report);
    const deck_ids: string[] = Array.isArray(report.deckIds)
      ? report.deckIds
      : decks
          .filter((deck) =>
            batch.package_id.endsWith("-" + digest(deck.id).slice(0, 12)),
          )
          .map((deck) => deck.id);
    return { ...batch, deck_ids };
  });
}
const fields = ["aliases", "principle", "conditions", "method", "traps"];
function revision(ctx: Context) {
  return digest({
    audit: one(ctx, "SELECT max(id) AS n FROM audits").n,
    keys: all(
      ctx,
      "SELECT * FROM knowledge_keys ORDER BY archive_key,node_key",
    ),
  });
}
export function previewImport(ctx: Context, raw: any, options: any = {}) {
  const pkg = mappedPackage(ctx, raw, options),
    checksum = digest(pkg),
    errors: string[] = [],
    warnings: string[] = [];
  for (const item of pkg.items) {
    const d = one(ctx, "SELECT * FROM decks WHERE id=?", item.subject);
    if (d && (d.deleted_at || d.kind !== item.kind))
      errors.push("卡片类型与卡片集不一致");
    if (
      !d &&
      ![
        "政治理论",
        "常识",
        "片段阅读",
        "逻辑填空",
        "资料分析",
        "判断推理",
        "图推",
        "类比推理",
        "数量",
      ].includes(item.subject)
    )
      errors.push("来源卡片集不存在，请指定目标卡片集");
  }
  const imported = one(
    ctx,
    "SELECT * FROM import_batches WHERE package_id=?",
    pkg.packageId,
  );
  if (imported && imported.checksum !== checksum)
    errors.push("相同 packageId 的内容已变化，请为修订包分配新的 packageId");
  const nodePlans: any[] = [],
    mapping: Record<string, string> = {},
    archives = new Map<string, ArchiveDocument>();
  const keyOf = (a: string, k: string) => `${a}/${k}`;
  for (const archive of pkg.archives) {
    archives.set(archive.archiveId, archive);
    const prior = one(
      ctx,
      "SELECT * FROM knowledge_archives WHERE archive_key=? AND version_label=?",
      archive.archiveId,
      archive.version,
    );
    if (prior && prior.checksum !== digest(archive))
      errors.push(
        `${archive.archiveId} 的版本 ${archive.version} 已存档，不允许改写，请使用新版本号`,
      );
    const family = one(
      ctx,
      "SELECT module FROM knowledge_archives WHERE archive_key=? LIMIT 1",
      archive.archiveId,
    );
    if (family && family.module !== archive.subject)
      errors.push("同一 archiveId 不能跨科目使用");
    const visited = new Set<string>();
    const resolve = (nodeKey: string): string => {
      const ref = keyOf(archive.archiveId, nodeKey);
      if (visited.has(nodeKey)) return mapping[ref];
      visited.add(nodeKey);
      const n = archive.nodes.find((n) => n.key === nodeKey)!;
      const parent = n.parentKey ? resolve(n.parentKey) : null;
      const binding = one(
        ctx,
        "SELECT knowledge_id FROM knowledge_keys WHERE archive_key=? AND node_key=?",
        archive.archiveId,
        n.key,
      );
      const selected = options.mapping?.[ref] || binding?.knowledge_id;
      let existing = selected
        ? one(ctx, "SELECT * FROM knowledge WHERE id=?", selected)
        : null;
      if (
        selected &&
        (!existing ||
          existing.deleted_at ||
          existing.module !== archive.subject)
      ) {
        errors.push(`${n.name} 的绑定无效，请手动选择本学科有效知识点`);
        existing = null;
      }
      if (!selected)
        existing = one(
          ctx,
          "SELECT * FROM knowledge WHERE module=? AND coalesce(parent_id,'')=? AND name=? AND deleted_at IS NULL",
          archive.subject,
          parent ?? "",
          n.name,
        );
      const localId =
        existing?.id ??
        `import-${digest([archive.archiveId, n.key]).slice(0, 48)}`;
      mapping[ref] = localId;
      const value: any = {
        id: localId,
        name: n.name,
        module: archive.subject,
        parent_id: parent,
      };
      for (const f of fields) value[f] = (n as any)[f] ?? existing?.[f] ?? "";
      const changed =
        !!existing &&
        Object.keys(value).some(
          (f) => f !== "id" && (existing[f] ?? null) !== (value[f] ?? null),
        );
      const differences = existing
        ? Object.keys(value)
            .filter(
              (f) => f !== "id" && (existing[f] ?? null) !== (value[f] ?? null),
            )
            .map((f) => ({
              field: f,
              before:
                f === "parent_id"
                  ? existing.parent_id
                    ? one(
                        ctx,
                        "SELECT name FROM knowledge WHERE id=?",
                        existing.parent_id,
                      )?.name
                    : "无"
                  : existing[f],
              after:
                f === "parent_id"
                  ? n.parentKey
                    ? archive.nodes.find((v) => v.key === n.parentKey)?.name
                    : "无"
                  : value[f],
            }))
        : [];
      const keepLocal = changed && !options.allowKnowledgeUpdates;
      if (keepLocal) {
        warnings.push(
          `「${n.name}」与当前知识卡不同：保留本地内容和层级，仅对应关联；如需应用来源版本请启用更新`,
        );
        for (const f of Object.keys(value)) value[f] = existing[f];
      }
      nodePlans.push({
        ref,
        incomingName: n.name,
        differences,
        archiveId: archive.archiveId,
        nodeKey: n.key,
        value,
        existing: !!existing,
        action: existing
          ? keepLocal
            ? "keep"
            : changed
              ? "update"
              : "reuse"
          : "create",
        knownBinding: !!binding && binding.knowledge_id === localId,
        before: existing,
      });
      return localId;
    };
    for (const node of archive.nodes) resolve(node.key);
  }
  // A mapping may not collapse distinct incoming nodes into one local node silently.
  const seen = new Map<string, any>();
  for (const n of nodePlans) {
    const previous = seen.get(n.value.id);
    if (
      previous &&
      previous.ref !== n.ref &&
      !(
        previous.knownBinding &&
        n.knownBinding &&
        ["reuse", "keep"].includes(previous.action) &&
        ["reuse", "keep"].includes(n.action)
      )
    )
      errors.push(
        "多个导入知识点对应同一现有节点，请先在存档中合并，或重新选择映射",
      );
    seen.set(n.value.id, n);
  }
  const prospective = new Map<string, any>(
    all(ctx, "SELECT * FROM knowledge WHERE deleted_at IS NULL").map((k) => [
      k.id,
      k,
    ]),
  );
  for (const n of nodePlans) prospective.set(n.value.id, n.value);
  const names = new Set<string>();
  for (const node of prospective.values()) {
    const key = [node.module, node.parent_id ?? "", node.name].join("\0");
    if (names.has(key)) errors.push(`应用后同层知识点「${node.name}」重名`);
    names.add(key);
    const path = new Set([node.id]);
    let parent = node.parent_id;
    while (parent) {
      if (path.has(parent)) {
        errors.push("应用后知识点层级形成循环");
        break;
      }
      path.add(parent);
      const p = prospective.get(parent);
      if (!p) {
        errors.push("应用后父节点不存在");
        break;
      }
      if (p.module !== node.module) errors.push("父子知识点不能跨科目");
      parent = p.parent_id;
    }
  }
  const rows = pkg.items.map((item) => {
    const previous = one(
      ctx,
      "SELECT * FROM import_entries WHERE namespace=? AND entry_key=?",
      pkg.namespace,
      item.key,
    );
    let action = previous
      ? previous.checksum === digest(item)
        ? "skip"
        : options.allowItemUpdates
          ? "update"
          : "conflict"
      : "create";
    const existing = previous
      ? one(
          ctx,
          `SELECT * FROM ${item.kind === "memory" ? "memory_cards" : "questions"} WHERE id=?`,
          previous.local_id,
        )
      : null;
    if (
      previous &&
      (!existing ||
        existing.deleted_at ||
        previous.kind !== item.kind ||
        existing.module !== item.subject)
    ) {
      action = "conflict";
      errors.push("原卡片已删除、移动或类型变化，请先处理冲突：" + item.key);
    }
    const excluded =
      Array.isArray(options.excludedKeys) &&
      options.excludedKeys.includes(item.key);
    if (excluded) action = "excluded";
    if (action === "conflict")
      errors.push(
        `条目 ${item.key} 已导入但内容变化，请使用新条目 key（或取消选中）`,
      );
    if (action === "skip")
      warnings.push(`${item.key} 已导入，跳过；本地修改不会被覆盖`);
    const knowledgeIds: string[] = [];
    for (const ref of item.knowledgeRefs) {
      const archive =
        archives.get(ref.archiveId) ??
        (() => {
          const row = one(
            ctx,
            "SELECT * FROM knowledge_archives WHERE archive_key=? AND version_label=?",
            ref.archiveId,
            ref.version,
          );
          return row ? JSON.parse(row.content) : null;
        })();
      if (
        !archive ||
        archive.version !== ref.version ||
        archive.subject !== item.subject ||
        !archive.nodes.some((n: any) => n.key === ref.nodeKey)
      ) {
        if (!excluded)
          errors.push(`${item.key} 引用的知识点版本不存在或科目不符`);
        continue;
      }
      const local =
        mapping[keyOf(ref.archiveId, ref.nodeKey)] ??
        one(
          ctx,
          "SELECT knowledge_id FROM knowledge_keys WHERE archive_key=? AND node_key=?",
          ref.archiveId,
          ref.nodeKey,
        )?.knowledge_id;
      if (!local || !prospective.has(local)) {
        if (!excluded) errors.push(`${item.key} 的知识点尚未对应到当前图谱`);
      } else knowledgeIds.push(local);
    }
    if (!item.knowledgeRefs.length)
      warnings.push(`${item.key} 未指定知识点，可在导入后补充`);
    if (
      item.kind === "question" &&
      !/^[A-D]$/.test(item.answer ?? "") &&
      !excluded
    )
      errors.push(`${item.key} 缺少有效正确答案，请填写 A—D 后重新导入`);
    if (item.analysisOrigin === "assistant")
      warnings.push(`${item.key} 的解析由 AI 生成，可在学习时核对`);
    if (
      action === "create" &&
      item.kind === "question" &&
      one(
        ctx,
        "SELECT id FROM questions WHERE deleted_at IS NULL AND module=? AND stem=? AND options=?",
        item.subject,
        item.stem ?? "图片题",
        item.options ?? "",
      )
    )
      warnings.push(`${item.key} 与已有题干／选项相同，可能重复，可取消选中`);
    return {
      localId: previous?.local_id,
      localVersion: existing?.version,
      beforeTitle: existing?.title,
      differences: existing
        ? (item.kind === "memory"
            ? ["title", "cue", "content"]
            : ["title", "stem", "options", "answer", "analysis", "project_note"]
          )
            .map((f) => ({
              field: f,
              before: existing[f] ?? "",
              after:
                f === "project_note"
                  ? (item.projectNote ?? existing[f] ?? "")
                  : ((item as any)[f] ?? ""),
            }))
            .filter((d) => d.before !== d.after)
        : [],
      key: item.key,
      title: item.title,
      subject: item.subject,
      kind: item.kind,
      action,
      knowledgeIds: [...new Set(knowledgeIds)],
    };
  });
  if (imported && imported.checksum === checksum) {
    errors.length = 0;
    warnings.unshift("本包已导入，本地数据不会被覆盖");
  }
  return {
    packageId: pkg.packageId,
    namespace: pkg.namespace,
    checksum,
    revision: digest({ local: revision(ctx), options }),
    alreadyImported: !!imported,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    nodes: nodePlans,
    items: rows,
    mapping,
    counts: {
      knowledgeNew: nodePlans.filter((n) => n.action === "create").length,
      knowledgeUpdated: nodePlans.filter((n) => n.action === "update").length,
      itemsNew: rows.filter((r) => r.action === "create").length,
      itemsUpdated: rows.filter((r) => r.action === "update").length,
      itemsSkipped: rows.filter(
        (r) => r.action === "skip" || r.action === "excluded",
      ).length,
    },
  };
}
export function commitImport(
  ctx: Context,
  raw: any,
  options: any,
  expected: any,
) {
  const pkg = mappedPackage(ctx, raw, options),
    preview = previewImport(ctx, raw, options);
  if (
    !expected ||
    expected.checksum !== preview.checksum ||
    expected.revision !== preview.revision
  )
    throw new Error("导入包或本地数据已变化，请重新预览");
  if (preview.errors.length) throw new Error(preview.errors.join("\n"));
  if (preview.alreadyImported)
    return {
      duplicate: true,
      report: JSON.parse(
        one(
          ctx,
          "SELECT report FROM import_batches WHERE package_id=?",
          pkg.packageId,
        ).report,
      ),
    };
  try {
    return transaction(ctx.db, () => {
      audit(ctx, "应用导入知识点版本", {
        nodes: preview.nodes.map((n) => ({
          before: n.before,
          after: n.value,
          ref: n.ref,
        })),
      });
      // Temporary unique names avoid order-dependent rename collisions; final state was validated above.
      for (const n of preview.nodes)
        if (n.action === "update")
          run(
            ctx,
            "UPDATE knowledge SET name=? WHERE id=?",
            `__import_${id()}`,
            n.value.id,
          );
      for (const n of preview.nodes) {
        if (n.action === "create" || n.action === "update")
          saveKnowledge(ctx, {
            ...n.value,
            id: n.existing ? n.value.id : undefined,
          });
        // saveKnowledge assigns UUID to new records; locate it by its unique final path.
        const local = n.existing
          ? n.value.id
          : one(
              ctx,
              "SELECT id FROM knowledge WHERE module=? AND coalesce(parent_id,'')=? AND name=? AND deleted_at IS NULL",
              n.value.module,
              n.value.parent_id ?? "",
              n.value.name,
            )?.id;
        if (!local) throw new Error("知识点写入失败");
        if (local !== n.value.id) {
          const old = n.value.id;
          for (const other of preview.nodes)
            if (other.value.parent_id === old) other.value.parent_id = local;
          for (const row of preview.items)
            row.knowledgeIds = row.knowledgeIds.map((k) =>
              k === old ? local : k,
            );
          preview.mapping[n.ref] = local;
          n.value.id = local;
        }
        run(
          ctx,
          "INSERT INTO knowledge_keys VALUES (?,?,?) ON CONFLICT(archive_key,node_key) DO UPDATE SET knowledge_id=excluded.knowledge_id",
          n.archiveId,
          n.nodeKey,
          local,
        );
      }
      for (const archive of pkg.archives) {
        run(
          ctx,
          "INSERT OR IGNORE INTO knowledge_archives VALUES (?,?,?,?,?,?,?,?)",
          id(),
          archive.archiveId,
          archive.subject,
          archive.version,
          JSON.stringify(archive),
          digest(archive),
          ctx.now().toISOString(),
          archive.note ?? "",
        );
        for (const r of archive.relations) {
          const a = preview.mapping[`${archive.archiveId}/${r.sourceKey}`],
            b = preview.mapping[`${archive.archiveId}/${r.targetKey}`];
          if (a === b) continue;
          const [x, y] = [a, b].sort();
          const existing = one(
            ctx,
            "SELECT id FROM relations WHERE source_id=? AND target_id=? AND kind=?",
            x,
            y,
            r.kind,
          );
          if (existing && !options.allowKnowledgeUpdates) continue;
          importLegacyRelation(ctx, {
            id: existing?.id,
            source_id: a,
            target_id: b,
            kind: r.kind,
            note: r.note ?? "",
          });
        }
      }
      for (const row of preview.items) {
        if (!["create", "update"].includes(row.action)) continue;
        const item = pkg.items.find((i) => i.key === row.key)!;
        const source = [
          item.source?.file,
          item.source?.page ? `页码/位置：${item.source.page}` : "",
          item.analysisOrigin ? `解析来源：${item.analysisOrigin}` : "",
        ]
          .filter(Boolean)
          .join("；");
        let local: string;
        if (item.kind === "memory")
          local = saveMemory(ctx, {
            id: row.localId,
            version: row.localVersion,
            module: item.subject,
            title: item.title,
            cue: item.cue,
            content: item.content,
            source,
            knowledge_ids: row.knowledgeIds,
          });
        else {
          local = saveQuestion(ctx, {
            id: row.localId,
            version: row.localVersion,
            module: item.subject,
            title: item.title,
            stem: item.stem || "图片题",
            options: item.options,
            answer: item.answer,
            analysis: item.analysis,
            material: item.material,
            initial_thought: item.thought,
            source,
            knowledge_ids: row.knowledgeIds,
            status: "ready",
          });
          if (item.projectNote != null)
            saveProjectNote(ctx, { id: local, note: item.projectNote });
          if (row.action === "update" && item.images)
            for (const asset of all(
              ctx,
              "SELECT id FROM assets WHERE question_id=?",
              local,
            ))
              deleteAsset(ctx, { id: asset.id });
          for (const image of item.images ?? []) {
            const assetId = id(),
              resource = createMediaAsset(ctx, Buffer.from(image.base64, "base64"), image.mime),
              name = resource.file_name;
            addAsset(ctx, {
              id: assetId,
              question_id: local,
              role: image.role,
              file_name: name,
              mime: image.mime,
            });
          }
        }
        run(
          ctx,
          "INSERT INTO import_entries VALUES (?,?,?,?,?,?) ON CONFLICT(namespace,entry_key) DO UPDATE SET checksum=excluded.checksum,archive_refs=excluded.archive_refs",
          pkg.namespace,
          item.key,
          item.kind,
          local,
          digest(item),
          JSON.stringify(item.knowledgeRefs),
        );
      }
      const report = {
        ...preview.counts,
        packageId: pkg.packageId,
        namespace: pkg.namespace,
        deckIds: [
          ...new Set([
            ...pkg.items.map((i) => i.subject),
            ...pkg.archives.map((a) => a.subject),
          ]),
        ],
        warnings: preview.warnings,
      };
      run(
        ctx,
        "INSERT INTO import_batches VALUES (?,?,?,?,?)",
        id(),
        pkg.packageId,
        preview.checksum,
        JSON.stringify(report),
        ctx.now().toISOString(),
      );
      audit(ctx, "批量导入", report);
      return { duplicate: false, report };
    });
  } catch (error) {
    // A nested owner may still commit/roll back: only compensate a confirmed outer rollback.
    if (!ctx.db.isTransaction && !(error && typeof error === "object" && "transactionOutcome" in error))
      recoverMediaWrites(ctx);
    throw error;
  }
}

function importLegacyRelation(ctx: Context, p: any) {
  const source = live(ctx, "knowledge", p.source_id),
    target = live(ctx, "knowledge", p.target_id);
  if (source.id === target.id) throw new Error("不能关联知识点自身");
  if (source.module !== target.module)
    throw new Error("各学科图谱独立，相关关系只能建立在同一科目内");
  const [a, b] = [source.id, target.id].sort();
  const kind = required(p.kind, "关系类型");
  if (kind.length > 50) throw new Error("关系类型过长");
  if (p.id && !one(ctx, "SELECT id FROM relations WHERE id=?", p.id))
    throw new Error("关系不存在");
  const duplicate = one(
    ctx,
    "SELECT id FROM relations WHERE source_id=? AND target_id=? AND kind=? AND id<>?",
    a,
    b,
    kind,
    p.id ?? "",
  );
  if (duplicate) throw new Error("该关系已存在");
  const key = p.id ?? id();
  if (p.id)
    run(
      ctx,
      "UPDATE relations SET source_id=?,target_id=?,kind=?,note=? WHERE id=?",
      a,
      b,
      kind,
      text(p.note),
      key,
    );
  else
    run(
      ctx,
      "INSERT INTO relations VALUES (?,?,?,?,?)",
      key,
      a,
      b,
      kind,
      text(p.note),
    );
  invalidate(ctx);
  audit(ctx, "保存知识点关系", { id: key, source: a, target: b, kind });
  return key;
}
