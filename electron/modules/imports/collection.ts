import type { Context } from "../../infrastructure/context.ts";
import { saveDeck } from "../decks.ts";
import { validatePackage } from "./protocol.ts";
import { previewImport, commitImport } from "./service.ts";
export function describeCollection(raw: unknown) {
  const pkg = validatePackage(raw),
    kinds = new Set(pkg.items.map((i) => i.kind));
  const kind =
    pkg.collection?.kind || (kinds.size === 1 ? [...kinds][0] : null);
  if (!kind || kinds.size > 1 || pkg.items.some((i) => i.kind !== kind))
    throw Error("卡片集ZIP须只包含一种卡片类型，空集须有collection类型信息");
  return {
    name: pkg.collection?.name || "导入的卡片集",
    kind,
    items: pkg.items.length,
    knowledge: pkg.archives.reduce((n, a) => n + a.nodes.length, 0),
  };
}
export function importCollection(
  ctx: Context,
  p: { package: unknown; name: string; folderId: string | null },
) {
  const meta = describeCollection(p.package);
  const id = saveDeck(ctx, {
    name: p.name || meta.name,
    kind: meta.kind,
    folder_id: p.folderId,
  });
  const options = { targetDeckId: id },
    preview = previewImport(ctx, p.package, options);
  if (preview.errors.length) throw Error(preview.errors.join("；"));
  commitImport(ctx, p.package, options, {
    checksum: preview.checksum,
    revision: preview.revision,
  });
  return id;
}
