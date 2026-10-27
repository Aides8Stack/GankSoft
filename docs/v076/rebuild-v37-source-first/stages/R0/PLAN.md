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

# 本轮R0：知识只读写入修复，阶段仍 IN_PROGRESS

起始远端b3ba983bf16d78391c40dab7f9eaf40a71b71eca，父08893a4eb328bcc72589c4da8e8a8bb65f922870；同一历史未覆盖。隔离12节点五场景中修复前C/E发生无用户编辑的revision/hash/正文变化；确认Milkdown新旧序列化字符串相同却通知changed，后续dirty/flush提交CAS。已针对无变化回调作最小修复，未改Schema606/FSRS。

诊断构建A–E修复后5/5 PASS，真实编辑保存、导出预览无写和关闭重启读回PASS；不含诊断注入的生产构建重跑原18场景18/18 PASS；关联24项编辑器/知识/Markdown测试24/24 PASS。完整命令、前后原始字节/修订/hash与调用堆栈见stages/R0/evidence/readonly-matrix。新旧生产源码指纹不同，旧截图及测试只保留为历史证据，不声称本轮重新通过。Windows、全量视觉及所有剩余状态NOT_RUN；R0 IN_PROGRESS，R1/R2 NOT_STARTED。

下一轮先审查新修复对其他编辑/媒体路径及R0剩余动态状态的影响，按实际代码变更补必要回归，再完成同语义视觉基线和阶段Gate。起始b3ba983的pr-trust仍failure/run40480180171，需要所有者对相应完整SHA独立审核；不自批、不改门禁、不合并不发布。当前检查点自身SHA由Git历史解析。

---

# R0 恢复与剩余任务

本轮已核验源映射52行、复盘/知识/设置语义，并以18个小型实际场景补证。保留旧索引、依赖、59项有效测试及42图，未扩大生产UI改造。

1. 下一轮从真实知识只读写入失败恢复：用完整12节点/选择/大纲/MD预览路径追踪editor初始化、markdownUpdated、dirty、flush和CAS，比较缩小3节点未复现路径。不要直接假定简单规范化就是唯一根因。
2. 最小修复前明确公开组件API与持久化边界；保留tree/revision/hash和正文严格断言。修复后重跑失败及受影响编辑器/知识专项，必要才扩大回归。不得删断言、改Schema/FSRS或重拍图掩盖失败。
3. STATE-SEMANTIC-MAP中24条本轮动态NOT_RUN分别补具体证据，已有display/API证据可继承；MISSING条目由对应R3-R6责任实现，不可伪造入口。
4. 知识精确12节点和规模28节点分轨；复盘answer/reveal/真实result分别取状态，原型result枚举别名不是可达事件；设置general/about缺失留明确责任，operations/ai不删除。
5. 所有R0退出条件满足才DONE并允许R1。当前R0 IN_PROGRESS，R1/R2 NOT_STARTED；本轮保存核验后退出。
