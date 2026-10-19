import { all, type Context } from "../../infrastructure/context.ts";

export interface MediaReference {
  ownerType: "question" | "draft" | "history";
  ownerId: string;
  instanceId: string;
  fileName: string;
}
/** Domain records are the source of truth; there is no drifting cached refcount. */
export function mediaReferences(ctx: Context): MediaReference[] {
  const refs: MediaReference[] = all(ctx, "SELECT id,question_id,file_name FROM assets")
    .map(a => ({ ownerType: "question", ownerId: a.question_id, instanceId: a.id, fileName: a.file_name }));
  for (const row of all(ctx, "SELECT key,value FROM settings WHERE key LIKE 'media-draft:%'")) {
    const m = JSON.parse(row.value);
    if (!m || typeof m.id !== "string" || typeof m.file_name !== "string")
      throw Error("图片草稿损坏，拒绝推断资源可以删除");
    refs.push({ ownerType: "draft", ownerId: m.deckId, instanceId: m.id, fileName: m.file_name });
  }
  for (const row of all(ctx, "SELECT id,question_snapshot FROM attempts WHERE question_snapshot<>''")) {
    const snapshot = JSON.parse(row.question_snapshot);
    if (!snapshot || (snapshot.assets !== undefined && !Array.isArray(snapshot.assets)))
      throw Error("历史图片引用损坏，拒绝清理资源");
    for (const a of snapshot.assets ?? []) {
      if (typeof a.id !== "string" || typeof a.file_name !== "string")
        throw Error("历史图片引用损坏，拒绝清理资源");
      refs.push({ ownerType: "history", ownerId: row.id, instanceId: a.id, fileName: a.file_name });
    }
  }
  return refs;
}
export function mediaFileReferenced(ctx: Context, fileName: string) {
  return mediaReferences(ctx).some(r => r.fileName === fileName);
}
