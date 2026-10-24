import { z } from "zod";
import { DraftFields } from "../protocol/card-draft.ts";
export { PromptOptions, PromptContext } from "../protocol/card-transfer.ts";
import { PromptOptions, PromptContext } from "../protocol/card-transfer.ts";
export const DEFAULT_PROMPT =
  "你是学习卡片结构化整理助手。仅整理提供的原文，不臆造选项、正确答案或学习历史。无法确定的字段需人工确认。\n当前内容：\n{{card}}\n{{catalog}}\n{{confirmed}}\n请返回 ganksoft.card-clipboard 版本1的结构化JSON，前置 <!-- ganksoft-card:1 --> 标记。知识点仅可建议，不得声称已建立关联，不输出SQL或API调用。";
export function buildExternalPrompt(
  fields: z.infer<typeof DraftFields>,
  context: z.infer<typeof PromptContext>,
  options: Partial<z.infer<typeof PromptOptions>> = {},
  template = DEFAULT_PROMPT,
) {
  const card = DraftFields.parse(fields),
    ctx = PromptContext.parse(context),
    opts = PromptOptions.parse(options);
  if (!template.includes("{{card}}") || template.length > 20_000)
    throw Error("PROMPT_TEMPLATE_INVALID");
  const paths = (rows: typeof ctx.catalog) =>
    rows
      .filter((row) => row.deckId === ctx.deckId)
      .map((row) => ({ nodeId: row.nodeId, path: row.path }));
  const parts: Record<string, string> = {
    card: JSON.stringify(
      { format: "ganksoft.card-clipboard", version: 1, fields: card },
      null,
      2,
    ),
    catalog: opts.includeDeckKnowledgeCatalog
      ? "候选知识点目录（仅供匹配）：\n" +
        JSON.stringify(paths(ctx.catalog), null, 2)
      : "",
    confirmed: opts.includeConfirmedKnowledgePaths
      ? "已人工确认的本卡知识点关联及父级路径：\n" +
        JSON.stringify(paths(ctx.confirmed), null, 2)
      : "",
  };
  const text = template.replace(
    /\{\{(card|catalog|confirmed)\}\}/g,
    (_all, key: string) => parts[key],
  );
  if (text.length > 900_000) throw Error("PROMPT_TOO_LARGE");
  return text;
}
