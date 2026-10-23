import test from "node:test";
import assert from "node:assert/strict";
import {
  copyCardContent,
  parseCardContent,
  previewCardPaste,
  confirmCardPaste,
} from "../shared/cards/clipboard.ts";
import { buildExternalPrompt, PromptOptions } from "../shared/cards/prompt.ts";
const fields = {
  title: "原题",
  payload: {
    encoding: "qa-v1" as const,
    mode: "qa" as const,
    fields: {
      front: "问题 # 标题",
      back: "答案 $x^2$",
      supplement: "```js\nconst x=1\n```",
      source: "来源",
    },
  },
  mediaRefs: [],
};
test("T14 copy is content only; CRLF round trip; preview/cancel/confirm and stale edits are explicit", () => {
  const text = copyCardContent(fields);
  assert.deepEqual(parseCardContent(text.replace(/\n/g, "\r\n")), fields);
  assert.ok(!text.includes("cardId"));
  assert.ok(!text.includes("cycleId"));
  assert.ok(!text.includes("knowledgeIds"));
  const changed = { ...fields, title: "新标题" },
    preview = previewCardPaste(copyCardContent(changed), fields);
  assert.deepEqual(preview.overwrites, ["title"]);
  assert.deepEqual(confirmCardPaste(preview, fields, false), fields);
  assert.deepEqual(confirmCardPaste(preview, fields, true), changed);
  assert.throws(
    () => confirmCardPaste(preview, { ...fields, title: "之后编辑" }, true),
    /CLIPBOARD_PREVIEW_EXPIRED/,
  );
});
test("T14 cross-mode paste requires the normal explicit type-switch flow and never creates identities", () => {
  const direct = {
    title: "记忆",
    payload: {
      encoding: "direct-v1" as const,
      mode: "direct" as const,
      fields: { body: "正文", source: "" },
    },
    mediaRefs: [],
  };
  const p = previewCardPaste(copyCardContent(direct), fields);
  assert.equal(p.switchRequired, true);
  assert.throws(
    () => confirmCardPaste(p, fields, true),
    /MODE_SWITCH_CONFIRM_REQUIRED/,
  );
  for (const key of [
    "cardId",
    "knowledgeIds",
    "reviewEvents",
    "fsrs",
    "history",
  ]) {
    const body = JSON.parse(
      copyCardContent(fields).split("\n").slice(1).join("\n"),
    );
    body[key] = "unexpected";
    assert.throws(() =>
      parseCardContent("<!-- ganksoft-card:1 -->\n" + JSON.stringify(body)),
    );
  }
  assert.throws(() =>
    parseCardContent(
      "<!-- ganksoft-card:1 -->\n" +
        JSON.stringify({
          format: "ganksoft.card-clipboard",
          version: 2,
          fields,
        }),
    ),
  );
  assert.throws(
    () => parseCardContent("x".repeat(900001)),
    /CLIPBOARD_TOO_LARGE/,
  );
});
for (const catalog of [false, true])
  for (const confirmed of [false, true])
    test(`T15 Prompt independent options ${catalog}/${confirmed}, scope isolation and source unchanged`, () => {
      const ctx = {
        deckId: "deck",
        catalog: [
          { nodeId: "candidate", deckId: "deck", path: ["根", "候选"] },
          { nodeId: "foreign", deckId: "other", path: ["外部绝不泄露"] },
        ],
        confirmed: [
          { nodeId: "linked", deckId: "deck", path: ["根", "当前关联"] },
        ],
      };
      const before = structuredClone(fields),
        prompt = buildExternalPrompt(fields, ctx, {
          includeDeckKnowledgeCatalog: catalog,
          includeConfirmedKnowledgePaths: confirmed,
        });
      assert.equal(prompt.includes("候选知识点目录（仅供匹配）"), catalog);
      assert.equal(
        prompt.includes("已人工确认的本卡知识点关联及父级路径"),
        confirmed,
      );
      assert.equal(prompt.includes("外部绝不泄露"), false);
      assert.deepEqual(fields, before);
      assert.ok(prompt.includes("不得声称已建立关联"));
    });
test("T15 defaults both off; template replacement never evaluates input; large source rejected without truncation", () => {
  assert.deepEqual(PromptOptions.parse({}), {
    includeDeckKnowledgeCatalog: false,
    includeConfirmedKnowledgePaths: false,
  });
  const ctx = { deckId: "deck", catalog: [], confirmed: [] };
  assert.ok(
    !buildExternalPrompt(fields, ctx).includes("候选知识点目录（仅供匹配）"),
  );
  const malicious = {
    ...fields,
    title: "{{catalog}} <script>not executed</script>",
  };
  assert.ok(buildExternalPrompt(malicious, ctx).includes(malicious.title));
  assert.throws(
    () => buildExternalPrompt(fields, ctx, {}, "missing placeholder"),
    /PROMPT_TEMPLATE_INVALID/,
  );
});
