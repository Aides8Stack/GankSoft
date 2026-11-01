# GankSoft v0.7.7 — H1 阶段报告

日期：2026-10-30（Asia/Shanghai）。模型：GPT-6.1 Sol / High。分支：feature/v077 → develop。

**H1：BLOCKED。** 第一批6条和补充2条Linux正式Electron操作链全部PASS；但用户原始Windows剪贴板/手动保存来源尚未充分复现，#16/#17/#19不能全部关闭。按用户严格完成条件，不能以8条PASS宣布H1 DONE。不进入M2，不等待CI，不合并或发布。

## 环境、源码与保存

Linux x64 / Node v24.22.1 / npm 11.9.0 / Electron 44.9.1，Playwright锁定依赖，Ozone headless；复用现有M0依赖和生产构建，不重跑npm ci或M0启动核验。所有数据来自独立gank-b2-lifecycle-* / synthetic606合成606库；正式Vue/IPC/SQLite未替换，仅测试host提供传输失败注入。每条场景清理结果均REMOVED_ISOLATED_FIXTURE。

起点远端：`f59caeb3ac4a988f6553b7b1b4809080237b103b`。M0本地API镜像提交与远端tree一致但提交SHA不同，保留本地历史，以detached远端HEAD测试；不重置或强推本地分支。唯一远端写入目标仍为feature/v077。

业务修复提交：`ff6848203ac43ba7c47fb12e00df86362d747b55`（普通文本HTML字面字符安全处理、NEW-12/18与传输夹具）。测试修正提交：`fa308d835ef1488074eb24886281db1c5535aa4a`（持久化转义、历史快照排除预期草稿变更）。最终8条在该精确干净HEAD执行，随后才修改报告/账本；未把工作树运行冒充干净SHA结果。

普通HTTPS push在M0已证实无凭据；本轮复用GitHub API，始终基于真实父tree/parent和expected_sha非强制更新。源码检查点已保存，最终报告检查点由本文件Git历史/远端HEAD解析，不写虚构自身SHA。

## 全部本轮业务 CASE 与真实状态

| CASE ID | 初始基线运行 | 最终精确SHA运行 | 验证范围 |
| --- | --- | --- | --- |
| NEW-01 | PASS | PASS | 新错题卡有意义编辑，自动保存，草稿箱UI打开，新PID恢复，未计入正式卡 |
| NEW-02 | PASS | PASS | 新问答卡相同完整闭环 |
| NEW-03 | PASS | PASS | 新直接记忆卡相同完整闭环 |
| OLD-03 | PASS | PASS | 原cardId，草稿箱/重启恢复，正式内容和历史/评分/FSRS相关表快照不变 |
| CLIP-01 | PASS | PASS | Electron原生clipboard.writeText + 真实Ctrl+V，草稿箱/重启恢复 |
| CLIP-04 | FAIL | PASS | HTML字面文本不执行，Markdown转义存储，重开UI精确还原原文本 |
| NEW-12 | NOT_RUN | PASS | 编辑后立即UI返回（无主动等待保存），返回前flush，草稿箱/重启读回 |
| NEW-18 | NOT_RUN | PASS | draft.save传输故障，error状态，返回被拦截且正文保留，解除故障后点击保存恢复，草稿箱/重启 |
| OLD-01 | NOT_RUN | NOT_RUN | 已发布错题卡专项未新增，不以直接记忆卡替代 |
| CLIP-02 | NOT_RUN | NOT_RUN | Windows网页富文本真实选取/剪贴板不在当前环境执行 |

账本250条：Electron UI PASS=8 / FAIL=0 / BLOCKED=0 / NOT_RUN=242。映射8，未映射242。P0=58/P1=163/P2=29不变。UNIT/API逐CASE未建立专属映射，保持250 NOT_RUN（不把模块43项自动映射为250条PASS）；Windows CI、Win10 Real、Win11 Real各250 NOT_RUN。

## BUG、根因、修复与测试修正

### 真实业务BUG：普通文本HTML字面字符被当作HTML导入拒绝

初始CLIP-04真实Ctrl+V输入`纯文本字面HTML：<b>bold</b> <script>noop()</script>`，失败截图可见红色`Error: UNSUPPORTED_HTML`，无有效草稿落盘；awaitDraft超时`DRAFT_NOT_DURABLY_READABLE ... not returned`。被测SHA为起点f59caeb3ac4a988f6553b7b1b4809080237b103b。

调用链：编辑器handlePaste先调用Milkdown parserCtx(text) → gank-safe-markdown transform把html AST拒绝 → failure回调，未插入文本 → 无正文保存。已检查锁定7.22.3的node_modules/@milkdown/plugin-clipboard/src/index.ts：原生插件对无HTML输入同样会尝试Markdown解析；单纯删掉前置校验仍会失败。

修复仅在**没有text/html且解析因UNSUPPORTED_HTML失败**时，使用ProseMirror公开handlePaste第三参数（已按schema解析的纯文本Slice）replaceSelection；保留光标事务和原生其他处理。Markdown序列化将`<`转义，重开显示原字面字符。富HTML路径、其他解析错误、链接、图片/媒体验证和安全transform均保留。未换组件、未改Schema/协议/SQLite。

原始用户Windows剪贴板来源未知，此修复证明一类同症状原因，不能宣布#16全面FIXED。#17原始Windows手动保存失败未在Linux复现，未改草稿生产源码；#19已有控制器逻辑在所测路径通过，不宣称所有模式/平台完整验收。

### 测试夹具/断言问题（均不计为业务BUG）

- 新v077故障host的launcher首次遗漏app.capabilities，造成四条测试读API报“请先读取应用能力”；补回握手后恢复。只在test host注入draft.save传输异常，不替代正常业务写入。
- OLD-03新增快照误包含learning_card_drafts，正常创建草稿导致FAIL；排除该表，继续保留learning_cards、版本、复盘/评分/调度相关表不变断言。
- CLIP-04原断言要求Markdown包含未经转义的字面文本，修复后安全转义导致FAIL；改为落盘检查转义、重开UI仍检查原文，不削弱用户可见内容断言。

中间运行只标测试失败，未晋升PASS。首次失败和最终证据摘要如下，保留历史而不覆盖初始FAIL：

- `2026-10-30T04-32-30-424Z-14`：sourceSha=f59caeb3ac4a988f6553b7b1b4809080237b103b；PASS=5 / FAIL=1 / BLOCKED=0 / NOT_RUN=0。
- `2026-10-30T04-34-09-742Z-9`：sourceSha=f59caeb3ac4a988f6553b7b1b4809080237b103b；PASS=0 / FAIL=4 / BLOCKED=0 / NOT_RUN=0。前序SHA加测试/业务工作树，仅定位，不晋升账本。
- `2026-10-30T04-34-36-059Z-6`：sourceSha=f59caeb3ac4a988f6553b7b1b4809080237b103b；PASS=6 / FAIL=2 / BLOCKED=0 / NOT_RUN=0。前序SHA加测试/业务工作树，仅定位，不晋升账本。
- `2026-10-30T04-36-44-715Z-22`：sourceSha=fa308d835ef1488074eb24886281db1c5535aa4a；PASS=8 / FAIL=0 / BLOCKED=0 / NOT_RUN=0。

## 模块回归与命令

- `npm run build`：PASS（修复后），仅chunk体积提示。后续只改测试断言/文档，生产构建未再变，不重复构建。
- `node --experimental-strip-types --test --test-concurrency=1 tests/card-drafts-v075.test.ts tests/card-draft-controller-v075.test.ts tests/editor-v075.test.ts tests/unified-card-lifecycle-v075.test.ts`：43/43 PASS，包含并发保存、未知回执/冲突与生命周期保护。
- `npm run build:editor-spike && node tools/smoke-editor-v075.mjs`：成功退出0。17个标记status=PASS的顶层检查；另有11个异步图片边界及3个原生剪贴板子检查PASS，不将父子计数混加。包含列表/表格/公式/项目颜色标记、Tab/ShiftTab、合成组合输入/撤销重做、图片资源与异步插入、实例销毁、保存失败重试、重启、6项危险Markdown拒绝。native-crepe-color-probe为诊断（hasSemanticColorMark=false），不是PASS；项目自定义颜色路径仍由T07验证。合成IME及图片注入不等于Windows真机。
- `node --experimental-strip-types --test tests/v077-e2e-runner.test.ts`：最终7/7 PASS。
- 最终命令：`node tools/validation/v077/run.mjs run --ids NEW-01,NEW-02,NEW-03,OLD-03,CLIP-01,CLIP-04,NEW-12,NEW-18`：8/8 PASS，退出0，sourceSha匹配最终被测SHA。后续仅报告/账本更改。
- `promote.mjs <最终summary.json> --dry-run`及显式晋升：updated=8，passed=8，不触碰Windows或人工结果。

未修改公共内容转换规则、IPC协议或数据库事务，因此未扩展全量npm run check；安全与媒体边界由上述编辑器专项复验。未等待/查询Windows CI。

## 精简永久证据

原始case.json、console.log、截图在gitignored `validation-results/v077/runs/<run-id>/`，原始编辑器回归输出本机`/tmp/h1-editor-smoke.log`；这些本地路径不承诺跨Work可用。此报告保留最终每条PID、清理结果及摘要，账本保留sourceSha/runId/steps；不向GitHub批量上传PNG/数据库。

| CASE | 状态 | 旧PID → 新PID | 清理 |
| --- | --- | --- | --- |
| NEW-01 | PASS | 43 → 114 | REMOVED_ISOLATED_FIXTURE |
| NEW-02 | PASS | 196 → 267 | REMOVED_ISOLATED_FIXTURE |
| NEW-03 | PASS | 350 → 423 | REMOVED_ISOLATED_FIXTURE |
| NEW-12 | PASS | 505 → 575 | REMOVED_ISOLATED_FIXTURE |
| NEW-18 | PASS | 661 → 734 | REMOVED_ISOLATED_FIXTURE |
| OLD-03 | PASS | 818 → 889 | REMOVED_ISOLATED_FIXTURE |
| CLIP-01 | PASS | 968 → 1040 | REMOVED_ISOLATED_FIXTURE |
| CLIP-04 | PASS | 1123 → 1195 | REMOVED_ISOLATED_FIXTURE |

首次错误截图SHA256：`61e260e821824985fd9f0a7af4b6a49cf0894eba62c3d070d765d3b2d8ad5038`；已在本轮目视确认UNSUPPORTED_HTML。

## Issue更新、阻断与下一入口

#16/#17/#18/#19均已追加真实进度评论，保持OPEN；#20不在本轮范围。索引同步，不以局部PASS关闭用户原始问题。

剩余H1准入项：Windows原始Ctrl+V来源、Word/WPS/物理剪贴板和手动保存故障复现；已发布错题/问答卡覆盖尚缺OLD-01等。Windows CI与真机未运行，不能代签。没有已确认仍复现的Linux核心路径业务FAIL；状态BLOCKED表示原始问题证据不足，非八条最终测试失败。无需X4升级（没有同根因两次业务修复失败；中间两类为测试问题）。

下一计划阶段M2 / GPT-6.1 Sol / Medium，但必须先由H1续验补齐上述准入证据再进入。恢复先读本报告、RECOVERY-NEXT.md、ISSUES-AND-ACCEPTANCE.md；不重做M0，不全量读取250条。H1续验建议GPT-6.1 Sol / High，仅补原始Windows来源和OLD-01，不重跑无影响的已通过范围。用户未授权本轮进入M2。
