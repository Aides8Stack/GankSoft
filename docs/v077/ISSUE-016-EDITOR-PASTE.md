# GankSoft v0.7.7 — Windows 编辑器粘贴异常记录

- **GitHub Issue**：[ #16 — Windows 卡片题干粘贴触发 UNSUPPORTED_HTML ](https://github.com/Aides8Stack/GankSoft/issues/16)
- **本任务分支**：`feature/v077`
- **基线**：`develop` merge commit `b7997325d9134d60027fa5b5c056f6e6c8acab4b`（v0.7.6）
- **发现日期**：2026-10-29；来自用户在 Windows 便携版上的实机操作与截图。
- **状态**：`NOT_STARTED`（v0.7.7 修复尚未开始）；本文件是问题归档，不是缺陷已解决的证据。
- **本轮范围**：v0.7.7 先记录多模块问题与验收清单；未修改生产代码、数据库、Schema 或流水线。
- **优先级**：高，核心编辑文字粘贴和可靠保存路径；不按非关键 UI 像素误差处理。
- **其他已发现问题**：保存草稿与草稿箱显示失败详见 [#17](https://github.com/Aides8Stack/GankSoft/issues/17)；v0.7.7 为全应用缺陷修复版，详见 [统一问题与验收清单](./ISSUES-AND-ACCEPTANCE.md)。

## 确认的症状

用户在 Windows GankSoft 的「记忆积累」卡片集中新建/编辑「错题复盘」卡片，在「题干」Markdown 富文本编辑区域粘贴内容时出现红色消息：

```text
Error: UNSUPPORTED_HTML
```

用户明确确认「粘贴的时候会出现」。截图中已有部分文字显示，但**草稿持久化、发布和重启后的内容完整性尚未验证**。剪贴板来源、粘贴的确切原始格式和发生频率仍未知；不能凭用户截图断言一定来自网页/Word 或已经导致数据丢失。

## 相关代码线索（待证实）

1. `src/editor/milkdown-adapter.ts`：`transform()` 拒绝不在白名单的 Markdown HTML 节点并抛 `UNSUPPORTED_HTML`；`handlePaste` 从剪贴板读取 `text/plain` / `text/html` 后解析文字；`serializeSnapshot()` 可能触发同一验证。
2. `src/editor/MarkdownEditor.vue`：错误回调 `failure()` 调用 `SaveController.invalidate()`；报错后可能阻止后续草稿保存，应在修复时重点验证并保护已有内容。
3. 不能通过接受任意 HTML、绕过保存校验、禁用媒体安全检查、吞掉异常或把失败标记 PASS 来消除提示。

上述仅为代码线索；**真正触发路径和根因仍是待办**。

## 最小复现、修复与验收边界

1. 在正式编辑器及相同保存适配器中重现：分别复制记事本纯文本、浏览器富文本、类似 Word 的富文本、字面 HTML、中文和换行文本。记录 `text/plain` / `text/html` 的类型与最小复现，不收集用户敏感剪贴板内容。
2. 复用 Milkdown/Crepe 原生文字粘贴能力；需要时对富文本**安全降级为纯文本**，保留选择、撤销/重做、段落和表格，不能执行非受信 HTML/脚本或任意外部媒体引用。
3. 验证报错后的恢复：原内容/草稿不得丢失，正确提示且可重试。粘贴成功后确认草稿保存、关闭重开读回、发布后读回一致。
4. 覆盖图片粘贴、媒体身份、颜色扩展、编辑器销毁和保存冲突的受影响回归；真实 Windows 物理剪贴板/中文输入法与 Linux/Windows CI 分别记录，未执行保持 `NOT_RUN`。
5. v0.7.7 整体修复计划见 [统一问题清单](./ISSUES-AND-ACCEPTANCE.md)，本问题只覆盖粘贴；不回滚 v0.7.6，不重新开发 UI/Schema606，不放宽安全和业务门禁。代码改动应留在本分支，经独立 PR 审核后才考虑合并 `develop`。
6. 新开发任务开始时依 `AGENTS.md` / `docs/development/STANDARDS.md` 恢复或初始化本分支任务文件，核实 HEAD；版本号在实际开发和发布流程中按 `package.json` 与仓库规则更新，不因创建分支就冒称已构建 v0.7.7。

## 用户暂行措施

在问题修复前，可尝试先复制到 Windows 记事本再复制进 GankSoft，检查是否仍报错；**这只是待验证的绕行建议，不保证成功**。出现报错时先将正文备份到外部文本文件，并核对保存及重新打开后的内容，避免丢失。

## 本次记录的验收

- [x] 用户问题已记录为 GitHub Issue #16
- [x] 新建独立 v0.7.7 分支（基于当前 `develop`）
- [ ] 修复正式粘贴逻辑（`NOT_STARTED`）
- [ ] 复现和回归测试（`NOT_RUN`）
- [ ] Windows 真人物理剪贴板验收（`NOT_RUN`）
- [ ] PR、合并和 v0.7.7 构建/发布（`NOT_STARTED`）
