import type { Context } from "../../infrastructure/context.ts";
import {
  Prompt,
  SavePrompt,
  DEFAULT_ANALYSIS_PROMPT,
} from "../../../shared/protocol/ai-analysis.ts";
import { ProtocolError } from "../../../shared/protocol/data.ts";
const key = "ai-analysis-prompt";
export function getAnalysisPrompt(ctx: Context) {
  const row = ctx.db.prepare("SELECT value FROM settings WHERE key=?").get(key);
  if (!row)
    return Prompt.parse({
      format: "ganksoft.ai-analysis-prompt/1",
      text: DEFAULT_ANALYSIS_PROMPT,
      revision: 0,
    });
  const parsed = Prompt.safeParse(JSON.parse(String(row.value)));
  if (!parsed.success)
    throw new ProtocolError(
      "PROMPT_VERSION_UNSUPPORTED",
      "Prompt 版本不兼容或已损坏，请先检查配置",
    );
  return parsed.data;
}
export function saveAnalysisPrompt(ctx: Context, input: unknown) {
  const p = SavePrompt.parse(input),
    old = getAnalysisPrompt(ctx);
  if (old.revision !== p.expectedRevision)
    throw new ProtocolError(
      "REVISION_CONFLICT",
      "Prompt 已变化，请重新读取；编辑内容已保留",
    );
  const value = Prompt.parse({
    format: p.format,
    text: p.text,
    revision: old.revision + 1,
  });
  ctx.db
    .prepare(
      "INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .run(key, JSON.stringify(value));
  return value;
}
