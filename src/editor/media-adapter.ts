import { services } from "../services";
import { Asset, type EditorAsset } from "../../shared/editor/document.ts";
export interface EditorMediaAdapter {
  stageClipboard(): Promise<EditorAsset[]>;
}
// Platform clipboard bytes never cross renderer IPC; host decoder/size checks remain authoritative.
export function electronMediaAdapter(deckId: string,purpose:'question'|'knowledge'='question'): EditorMediaAdapter {
  return {
    async stageClipboard() {
      const result = await services.media.stage(
        deckId,
        purpose,
        "clipboard",
      );
      return result.map((a) =>
        Asset.parse({ id: a.id, mime: a.mime, access: "draft" }),
      );
    },
  };
}
