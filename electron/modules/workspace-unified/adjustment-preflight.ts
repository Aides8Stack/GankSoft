import { randomBytes, createHash } from "node:crypto";
import type { z } from "zod";
import type { Context } from "../../infrastructure/context.ts";
import {
  Action,
  PrepareSelection,
} from "../../../shared/protocol/ai-adjustments.ts";
import { basisHash } from "./adjustment-basis.ts";
import { buildAdjustmentPreview, meta } from "./adjustment-preview.ts";
import { IMPORT_BUDGET } from "./adjustment-zip.ts";
/** A validated group has no mutation method. B must recheck inside its write transaction. */
export function resolveAdjustmentSelection(
  ctx: Context,
  preview: ReturnType<typeof buildAdjustmentPreview>,
  input: z.infer<typeof PrepareSelection>,
) {
  const p = PrepareSelection.parse(input),
    started = Date.now();
  if (
    p.token !== preview.token ||
    p.deckId !== preview.source.deckId ||
    basisHash(p.source) !== basisHash(preview.source)
  )
    throw Error("预览token、deckId或来源身份不一致");
  const m = meta(ctx);
  if (
    m.dataEpoch !== p.source.dataEpoch ||
    m.dataRevision !== p.source.dataRevision ||
    ctx.now().getTime() >= preview.expiresAt
  )
    throw Error("预览修订或有效时间已变化，请重新解析");
  const available = new Map(preview.rows.map((r) => [r.actionId, r]));
  const requested =
    p.selection.mode === "explicit"
      ? p.selection.actionIds
      : p.selection.excludedActionIds;
  const unique = new Set(requested);
  if (unique.size !== requested.length)
    throw Error("选中或排除的actionId重复，整组拒绝");
  for (const id of unique)
    if (!available.has(id)) throw Error("选择包含未知actionId，整组拒绝");
  const ids =
    p.selection.mode === "explicit"
      ? requested
      : preview.rows
          .filter(
            (r) =>
              r.status === "valid" && r.actionId && !unique.has(r.actionId),
          )
          .map((r) => r.actionId!);
  if (!ids.length) throw Error("没有选中的合法建议");
  const originals = ids.map((id) => {
    const row = available.get(id),
      v = preview.validated.get(id);
    if (row?.status !== "valid" || !v)
      throw Error("选中组含冲突或拒绝建议，整组拒绝");
    return v;
  });
  const actions = originals.map((v) => Action.parse(v.action));
  // Reuse the one canonical resolver: reparse actions, expand knowledge and fingerprint
  // version/cycle/schedule/links/config again; no display string enters this path.
  const fresh = buildAdjustmentPreview(ctx, p.source, actions);
  const statuses = new Map(fresh.rows.map((r) => [r.actionId, r.status]));
  let bytes = 0;
  const targets = new Set<string>(),
    h = createHash("sha256").update(preview.token).update(basisHash(p.source));
  for (const original of originals) {
    if (Date.now() - started > IMPORT_BUDGET.milliseconds)
      throw Error("整组执行前校验时间超预算，未部分接受");
    const next = fresh.validated.get(original.action.actionId);
    if (
      !next ||
      next.basis !== original.basis ||
      statuses.get(original.action.actionId) !== "valid"
    )
      throw Error("目标版本、cycle、排期、知识关联或配置已变化，请重新解析");
    bytes += Buffer.byteLength(JSON.stringify(next));
    if (bytes > 64 * 1024 * 1024)
      throw Error("整组执行前校验字节超预算，未部分接受");
    h.update(next.basis);
    for (const target of next.targets) targets.add(target.cardId);
  }
  const summary = {
    preparationToken: h.update(randomBytes(32)).digest("hex"),
    previewToken: preview.token,
    source: preview.source,
    selectedCount: ids.length,
    targetCardCount: targets.size,
    expiresAt: new Date(preview.expiresAt).toISOString(),
    executable: false as const,
  };
  return { summary, records: originals, selection: p };
}

export function prepareAdjustmentSelection(
  ...args: Parameters<typeof resolveAdjustmentSelection>
) {
  return resolveAdjustmentSelection(...args).summary;
}
