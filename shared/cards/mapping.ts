import type { z } from "zod";
import type { CardMode, ContentVersionDTO } from "../protocol/unified.ts";
import {
  DraftFields,
  DraftOrigin,
  publicationIssues,
  type DraftPayloadDTO,
} from "../protocol/card-draft.ts";

const section = (title: string, text: string) =>
  text ? `## ${title}\n\n${text}` : "";
const join = (...s: string[]) => s.filter(Boolean).join("\n\n");
/** No database side effects, generated answers, associations or learning evidence. */
function mapFields(
  source: { title: string; payload: DraftPayloadDTO | null; mediaRefs: ContentVersionDTO["mediaRefs"] },
  target: z.infer<typeof CardMode>,
) {
  if (!source.payload) throw Error("CONTENT_VERSION_NOT_AVAILABLE");
  const p = source.payload;
  let payload: DraftPayloadDTO;
  const warnings: string[] = [];
  if (p.mode === target) payload = structuredClone(p);
  else if (p.mode === "question") {
    const f = p.fields;
    const answer =
      p.encoding === "question-v1"
        ? p.fields.options.find((o) => o.optionId === p.fields.correctOptionId)?.markdown ?? ""
        : p.fields.answer;
    // Legacy raw options are preserved as reference, never split into guessed identities.
    const options =
      p.encoding === "legacy-question-604"
        ? p.fields.options
        : [...p.fields.options]
            .sort((a, b) => a.position - b.position)
            .map((o) => o.markdown)
            .join("\n\n");
    const initial = "initialThought" in f ? String(f.initialThought) : "";
    if (target === "qa")
      payload = {
        encoding: "qa-v1",
        mode: "qa",
        fields: {
          front: join(f.material, f.stem),
          back: join(section("正确答案", answer), section("解析", f.analysis)),
          supplement: join(
            section("原题选项", options),
            section("首次错误思路", initial),
          ),
          source: f.source,
        },
      };
    else
      payload = {
        encoding: "direct-v1",
        mode: "direct",
        fields: {
          body: join(
            section("题目背景", join(f.material, f.stem)),
            section("原题选项", options),
            section("关键结论", answer),
            section("解析", f.analysis),
            section("误区", initial),
          ),
          source: f.source,
        },
      };
    if (p.encoding === "legacy-question-604")
      warnings.push("旧题答案保留原始标记与原选项，请人工核对显示文本。");
  } else if (target === "question") {
    payload = {
      encoding: "question-v1",
      mode: "question",
      fields: {
        stem: p.mode === "qa" ? p.fields.front : p.fields.body,
        material: "",
        analysis:
          p.mode === "qa"
            ? join(p.fields.back, p.fields.supplement)
            : p.fields.body,
        source: p.fields.source,
        initialThought: "",
        options: [],
        correctOptionId: null,
      },
    };
    warnings.push("需要人工填写选项并指定正确答案；未生成虚假选项。");
  } else if (p.mode === "qa") {
    payload = {
      encoding: "direct-v1",
      mode: "direct",
      fields: {
        body: join(
          section("问题", p.fields.front),
          section("答案", p.fields.back),
          section("补充", p.fields.supplement),
        ),
        source: p.fields.source,
      },
    };
  } else {
    payload = {
      encoding: "qa-v1",
      mode: "qa",
      fields: {
        front: "",
        back: p.fields.body,
        supplement: "",
        source: p.fields.source,
      },
    };
    warnings.push("需要人工填写问题；正文仅作为答案候选。");
  }
  return {
    fields: DraftFields.parse({
      title: source.title,
      payload,
      mediaRefs: structuredClone(source.mediaRefs),
    }),
    requiredFields: publicationIssues(payload),
    warnings,
  };
}
export function mapPublishedContent(source: ContentVersionDTO, target: z.infer<typeof CardMode>, restored = false) {
  return { ...mapFields(source, target), origin: DraftOrigin.parse({
    versionId: source.versionId, mode: source.mode, strategy: restored ? "published-target" : "first-mapping", mappingVersion: "six-way/1",
  }) };
}
export function mapUnpublishedContent(source: z.infer<typeof DraftFields>, target: z.infer<typeof CardMode>) {
  return { ...mapFields(source,target), origin: DraftOrigin.parse({
    versionId: null, mode: source.payload.mode, strategy: "unpublished", mappingVersion: "six-way/1",
  }) };
}
/** User-confirmed legacy normalization preserves raw options/answer for manual
 * transcription, never inventing a stable option or guessing the correct ID. */
export function normalizeLegacyQuestionDraft(source: z.infer<typeof DraftFields>) {
  if (source.payload.encoding !== "legacy-question-604") throw Error("LEGACY_QUESTION_REQUIRED");
  const f=source.payload.fields;
  return DraftFields.parse({ title:source.title,mediaRefs:structuredClone(source.mediaRefs),payload:{
    encoding:"question-v1",mode:"question",fields:{ stem:f.stem,material:f.material,source:f.source,
      initialThought:f.initialThought,analysis:join(f.analysis,section("整理前的原始选项（请人工核对）",f.options),section("整理前的答案标记",f.answer)),
      options:[],correctOptionId:null,
    },
  } });
}
