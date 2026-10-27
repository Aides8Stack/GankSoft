# 2026-10-27 R0：12 节点基线与 24 项复核 — IN_PROGRESS

起始远端 `2235c62feea38dff74528bbd5277121195fadf45`，与本地暂存树一致，父 `a0fdba13b772b9507291773e16591d974f8bb75b`；PR #15 Draft。沿用已保存审计及回归，不重装依赖或重做全量测试。本轮仅 R0。

24 条原动态 NOT_RUN 行已逐条归类并记录事件、正式组件/DOM、typed API、数据源、候选测试、差异责任和下一步，见 `STATE-SEMANTIC-MAP.json` 的 `closureReview` 及 `R0-24-STATE-REVIEW.md`：14 BUSINESS_ADAPTED、10 MISSING_IN_PRODUCTION；类别不代表动态测试 PASS。另将三个 review-result 原型脚本注入别名标为 UNREACHABLE_IN_PROTOTYPE；其正式业务结果有独立证据。复盘固定演示、实际知识森林 12/4/3/2/3 与标示数字不同、设置 general/about 缺失及 operations/ai 必须保留的责任沿用 `SEMANTIC-GAPS.md`。

新工具 `tools/validation/r0/visual-12.ts` 复用已有隔离策略：冻结 HTML 两根森林，真实 typed IPC 创建并读取 Schema606 12 节点，逐项断言名称、父子及正文一致；选中语境分析、开启详情，采集原型与生产 Electron 的 1500×900、1366×900、900×900 PNG 和 DOM/computed-CSS 快照。首次执行因新脚本语法错误退出 1，修正后退出 0；证据 `evidence/visual-12/commands.txt` 和 `manifest.json`。截图采集 PASS 不等于视觉一致。

**R0 Gate：IN_PROGRESS。** 12 节点数据及选择经核验，但严格视觉同语义条件仍未全部满足：已通过 CDP 采集：原型图谱三宽均 100%，生产 1500/1366 宽为 100%、900 宽 `scaleFit` 为 70.9321%；所选中文节点字形两侧均为 Noto Sans CJK SC Regular（CSS 栈不同，未宣称所有字形一致）；逐节点展开状态未独立断言，生产截屏存在遮挡；原型还展示固定关联卡片数，隔离库没有对应关联。两侧均为浅色但颜色不同。截图显示生产合成展示根、左右图谱、右侧面板和工具栏与原型不同，后续 R5 负责 UI 差异；本轮不改生产实现。Windows、物理图片剪贴板、真实中文 IME 和视觉一致性 NOT_RUN，不把截图收集或静态分类称为测试 PASS。R1/R2 仍 NOT_STARTED。

继承上次 12 节点只读链路 5/5、未注入生产 Electron 18/18、37 项关联测试 PASS，详情见既有证据；本轮未重新运行。起始完整 SHA 的 pr-trust 为 failure（run 40483074386），需要所有者独立审核，不自行批准或绕过；当前检查点 SHA 由 Git 历史读取。下一轮关键任务：用同一节点集补齐 900 宽图谱缩放、展开状态及关联数语义，使三宽对照达到严格可比，再重新判断 R0 Gate。

---

# 2026-10-27 R0 收尾核验：IN_PROGRESS

本轮起始远端 `a0fdba13b772b9507291773e16591d974f8bb75b`，PR #15 为 Draft；本地树与该远端树一致。确认 `milkdown-adapter.ts` 仅过滤序列化前后相同的通知，保留真实变更回调。继承上轮 12 节点隔离 Schema606 A–E 修复后 5/5、未注入生产 Electron 18/18，以及真实编辑、导出不写入与 Electron 重启读回证据（`evidence/readonly-matrix/`）；不把历史修复前失败删除，也不重新声称旧视觉截图在新源码指纹下通过。

本轮补测：`node --experimental-strip-types --test --test-concurrency=1 tests/card-draft-controller-v075.test.ts tests/card-drafts-v075.test.ts tests/knowledge-markdown-media-v075.test.ts` 退出 0，37/37 PASS，覆盖自动保存排队、失败重试、CAS 冲突、关闭前未保存错误、图片数据库及重开；`npm run build:editor-spike` 退出 0；`node tools/smoke-editor-v075.mjs` 退出 0，17 个记录项 PASS（另有一个无状态颜色探针），覆盖编辑器自动保存/失败重试、注入剪贴板图片、Markdown、真实 IPC 及资源、异步粘贴目标和编辑器销毁重建。该 spike 图片走注入剪贴板、重启使用 JSON 夹具与真实暂存资源，不能冒充系统剪贴板或 Schema606 UI 端到端；详细证据 `evidence/closure-a0fd/`。原有 Schema606 数据服务与真实 Electron 重启证据独立继承。

**Gate：IN_PROGRESS。** 52 条状态源码/责任映射已保存，旧统计中的两条关联原失败已被修复后对应链路证据替代，但其余 24 条未运行/缺失能力并未因本轮回归变成动态 PASS；须逐项完成可执行状态与事件闭环、对不可达或未实现状态明确责任。严格同语义视觉基线仍只部分可比：28 节点规模夹具不等于原型 12 节点森林；既有 overview/editor/settings 差异归后续 UI 阶段，不要求在 R0 修复，但必须建立可比证据。系统图片剪贴板、Windows 实机与真实中文 IME 为 NOT_RUN；不可将注入路径或截图采集视为通过。R1/R2 均 NOT_STARTED。

复盘固定答案和 08:42 为演示、result 为不可达注入别名；知识点原型真实森林分别为 12/4/3/2/3 而非显示数字；设置 general/about 缺失，operations/ai 必须保留，详见 `SEMANTIC-GAPS.md` 与状态映射。不要修改 FSRS、Schema606 或生产数据以适配原型。起始完整 SHA 的 pr-trust 为 failure，run 40482172698；既有原因 CI_POLICY_REVIEW_REQUIRED，需所有者独立审核新完整 SHA；未自行批准或绕过。

下一轮关键任务：针对 24 条未闭环映射补可执行动态证据并标清不可达/缺失项，建立 12 节点同语义视觉比较；在可用系统剪贴板/Windows 环境补真实图片粘贴验收。无须重复已有效基础索引或全部测试。最终远端提交以本文件 Git 历史为准。

---

# R0 基线证据 — Linux 实际采集，视觉未验收

源码生产指纹与本地parent `c074dfa33dc4786fdd77e6215b470baae1433c4f`、已核实远端 `acc977dc1ddf7583617995d96157066300e11a05` 见 `evidence/matched-v1/manifest.json`。本地parent与起始远端 bccf6ff9 的 tree 完全相同；本轮未改 src/electron/shared/锁文件，采集脚本属于WIP。脚本最终版本在此检查点提交，命令和失败演进见 TEST_REPORT.md。

`node --experimental-strip-types tools/validation/r0/capture.ts` 最终退出0：3组验证、36张PNG，原型与production606各6页×1500/1366/900宽、高900、deviceScaleFactor=1、zoom=1。同Electron44.9.1、字体栈和宿主Noto Sans CJK SC。所有图的SHA256、实际inner/outer尺寸、BrowserWindow bounds/contentBounds、displayScaleFactor、字体状态、DOM与匹配CSS规则均保存。`collect.py` 核验后保留36张原像素、36个gzip DOM/CSS快照、18张无缩放并排WebP和diff.json。

真实生产入口 `electron/main.ts → src/main.ts → UnifiedWorkspace.vue`，页面URL断言 `gank-app://ui/index.html`。数据为隔离Schema606真实服务生成；不是前端mock。原型仍是冻结只读HTML，未改源码、DOM遮罩或强行替换数值。

## 状态与数据等效边界

| 页面 | 已匹配/实际采集 | 待核语义与差异 | 责任 |
|---|---|---|---|
| overview | 真实5集/242卡/53到期/18今日，与原型四数字一致；真实暂停会话 | 原型显示五集，正式中部显示两文件夹；最近学习条目/顺序不同；侧栏原型显示due、正式显示total | R0补语义映射；R1/R2实现 |
| deck | 言语理解真实86卡/24到期/28知识；计划与快捷入口 | 原型76%与真实累计复盘/平均自评不同；原型近期卡片固定样例，正式按真实时间/ID排序 | R0明确等效策略；R2 |
| editor | 同一question标题、题干、四选项、答案与解析；正式Crepe | 标题/所属集行、正文宽度、选项行密度、固定底部发布区差异；qa/direct等状态另验 | R4 |
| review | 同集question、answer、真实暂停会话 | 原型reviewQuestion自身固定题干与editor不同；正式按真实内容；计时/按钮/区域需进一步归一 | R0/R4 |
| knowledge | 真实28节点/正文/关系、原型图谱都已拍 | 原型实际小树节点数与其显示28不自洽；正式全屏与原型普通态不等价；须补普通/全屏成对状态 | R0/R5 |
| settings | 两版各自默认设置实际拍摄 | 原型general和正式appearance非同分类；通用/关于缺UI、回收站位置、横/纵导航结构差异 | R0/R6 |

因此**采集 PASS，严格同状态视觉验收不是 PASS**。已检查1366px overview/editor/settings并排和1500px真实图谱，有明确MAJOR/BLOCKER差异；未审全图为NOT_RUN。diff.json不使用像素阈值伪造接受结论。

额外 `reference-states.mjs` 枚举52个原型DOM状态，涵盖13主路由/三模式/复盘阶段/6设置分类/15弹层/图谱视图与传输步骤。其PASS只表示原型DOM生成和弹层存在，不能替代生产交互/端到端验收。

首轮图片因宿主缺中文字体被拒为最终证据，补字体后重新采集。字体下载来源和SHA256见font-environment.json；字体文件不入仓。Windows/Win10/Win11/IME/缩放人工验收 NOT_RUN。

## 补充同状态参考（未替换旧证据）

reference-states最终脚本额外采集6张PNG：settings-appearance与knowledge-map-fullscreen各三宽，另建6张无缩放并排图；metadata/hash见supplemental-reference.json。与生产既有appearance和全屏图谱配对，避免将默认分类或普通/全屏差异混成布局结论。原型知识实际小树与显示总数不一致、review内容/暂停/揭示等严格等效边界仍需核实。原36图及其manifest不覆盖、不重命名冒充新图。

## 本轮语义有效性补证

旧103个二进制证据哈希/生产指纹全部相同，未重拍。18个新增语义场景17PASS/1FAIL，见semantic-v1/result.json。精确原型森林实际为12节点；旧28节点图只能作为规模证据，不能标图谱同数据逐节点视觉PASS。原型三个result枚举是非answer分支别名，不是可达提交结果；正式独立result必须另行标注。设置缺项和额外功能已逐项核对。只读知识路径会产生序列化文字/修订变化，仍阻断R0；缩小路径未复现不等于修复。
