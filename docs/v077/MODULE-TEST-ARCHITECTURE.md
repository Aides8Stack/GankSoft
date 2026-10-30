# GankSoft v0.7.7 — 模块功能测试组织与集中修复流程

> 当前阶段仅**重组测试设计、环境、目录与问题收集工具**；不得将设计、脚本或旧历史证据写成新功能 PASS。参考 [20 组功能反馈矩阵](./MODULE-BASELINE-SMOKE-AND-FEEDBACK.md)、[250 条完整用例](./E2E-FULL-OPERATION-CHAINS.md)、[唯一状态账本](./E2E-RESULTS.json)。

## 1. 固定执行顺序：先查完整模块，再统一修

| 阶段 | 模型推理 | 动作 | 阶段结束产物 |
| --- | --- | --- | --- |
| D0 设计和环境冻结 | GPT-6.1 Sol / Medium | 逐模块梳理正常/异常操作路径、五态反馈、期望数据；固定夹具和环境复用条件 | 本文件、modules.mjs、fixture、环境指令 |
| T1 基础功能全面模拟 | GPT-6.1 Sol / Medium | 按模块运行最短 GUI 操作链，**不修业务代码**；保留 PASS/FAIL/BLOCKED/NOT_RUN 和真实错误提示 | 按模块结果 + 证据 + 未测项 |
| T2 各模块反馈/取消/异常路径 | GPT-6.1 Sol / Medium 或 High（仅定位难点） | 检查错误可理解、空态、取消零写、重启读回、重复点击；先记录失败不做生产修复 | 全模块缺陷收集完整性及可复现步骤 |
| I3 统一分类和去重 | GPT-6.1 Sol / High | 合并相同根因、判定业务/测试脚本/环境、按数据安全优先级排序；未复现不冒认根因 | DEFECT-INBOX.json 最终待修批次 + 修复依赖顺序 |
| F4 分批集中修复 | GPT-6.1 Sol / High；疑难才 Extra High | 一批只处理 1–3 组同根因问题；每批原失败 CASE+邻接模块回归；保存检查点 | 实际源码修复/Issue/复验 |
| R5 Windows/便携核验 | GPT-6.1 Sol / Medium + High 终审 | 完整主链+备份/回收/Windows CI/实机/ZIP，严守门禁与批准 | 最终可用候选版评估 |

**执行冻结**：T1/T2 阶段原则上禁止业务源码修改，避免前后用例处于不同代码基线。遇 P0 数据损坏类真实 FAIL，立即在隔离库停止该危险路径、采证并标记阻断；其他不受影响模块仍可继续测试。全部模块的首轮问题收齐后再进入 I3/F4。工作环境级失败不归因于业务代码。

## 2. 模块边界与已有 CASE ID

配置源 [`tools/validation/v077/modules.mjs`](../../tools/validation/v077/modules.mjs)。按**12 个业务模块**归纳原有 **20 组 / 250 条**原始 CASE，不迁移或重命名任何 ID。每个模块有 `groups`、`baseline`、`negative`、`flow`、`feedback`、`persist`；前者对应正式用户最常见路径，后者对应失败/取消/校验。12 模块合起来覆盖所有 250 项，但本轮先执行 baseline，后续再逐项扩展。

| 模块参数 | 关联的原功能组 | 最先验证的业务路径 |
| --- | --- | --- |
| `app` | ENV HOME | 启动→首页→关闭重启 |
| `catalog` | CAT | 新建/改名卡片集→进入→重启 |
| `cards` | NEW OLD LIST | 三种新卡→草稿箱→发布→旧卡修改→列表 |
| `editor` | EDITOR CLIP | 编辑题干/选项→Ctrl+V→保存重开 |
| `learning` | PLAN REVIEW | 选择队列→作答→评分→复盘历史/FSRS |
| `analytics` | AN | 复盘→学习分析核对 |
| `knowledge` | KNOW MD | 知识点→关联卡→Markdown内容 |
| `media` | MEDIA | 粘贴图片→保存→资源库→重开 |
| `exchange` | EX | 内容导出→隔离副本导入 |
| `settings` | SET | 设置导航→主题保存/重启 |
| `storage` | BACK TRASH | 备份/隔离恢复→回收站删除恢复 |
| `reliability` | FAULT WIN | 保存失败/重复点击→Windows同包核验 |

模块文件仅放 `tools/validation/v077/scenarios/`；当前 `drafts.mjs` 和 `clipboard.mjs` 继续沿用，后续可按上述业务模块新增 `catalog.mjs`、`learning.mjs` 等，不为每条用例创建文件。正式代码入口只看 `src/main.ts` 对统一模型的加载，旧 R4–R7 用例仅参考，不得升级为 v077 当轮 PASS。

## 3. 统一的用户交互反馈验收

每个基础场景同时断言：
1. **触发**：真实点击/输入/键盘操作可达，必要的字段校验及时提示。
2. **中间态**：保存中/发布中或其它异步处理中可见，重复点击不会多次写入。
3. **结果**：成功有可靠后端回执+清晰 UI 提示；失败/冲突/未知结果有具体原因、仍可恢复；取消和空列表有明确状态。
4. **状态同步**：在列表、详情、草稿箱或回收站能找到刚才操作的对象，必要时能返回/继续编辑。
5. **持久化**：涉及写操作的新进程重启后内容/ID/版本/调度/历史与只读查询一致。

报错须具体区分：`UI_NO_RESPONSE`、`FALSE_SUCCESS`、`PERSIST_FAILED`、`STALE_LIST`、`VALIDATION_FEEDBACK`、`TEST_INFRA`、`UNKNOWN`；不得用固定 sleep、后台直接创建对象或只看 toast 冒充 PASS。对用户实报的“保存草稿/发布卡片无反应”，必须分别覆盖 `NEW-14` 与 `NEW-17`，再覆盖 `NEW-16` 缺必填字段的明确反馈。

## 4. 缺陷统一收集/归档

- 初始用户已报告问题保留在 [`DEFECT-INBOX.json`](./DEFECT-INBOX.json)，**仅代表报告，未必已经在当前 v077 复现**。
- T1/T2 运行结果先输出到 `validation-results/v077/runs/`，再由 `collect.mjs` 以 CASE ID/原始错误摘要形成观察项；异常与环境阻断分开，严禁未经审核自动确定根因或关闭 Issue。
- 每个问题记录 `module`、`caseId`、`sourceSha`、`OS`、`expectedUi`、`actualUi`、`persisted`、`impact`、`reproduction`、`evidence`、`issue`、`status`。摘要去除私人路径/敏感字段；原始截图、数据库不提交 Git。
- I3 才按**实际根因**归并缺陷与排序；F4 集中修复，原 FAIL 的 CASE 必须重新通过才可改验收账本，Linux PASS 不冒充 Windows CI 或 Win10/11 真机。
- 保存操作、发布、复盘历史、备份、删除恢复 P0 失败阻断“已可用”或“准备发布”的判断。其它 P1/P2 可按风险说明，不虚报已验收。

## 5. 跨 Work 复用的环境与最小测试数据

详见 [`ENVIRONMENT-REUSE.md`](./ENVIRONMENT-REUSE.md) 和 [`tests/fixtures/ganksoft/v077-minimal.json`](../../tests/fixtures/ganksoft/v077-minimal.json)。

- GitHub **版本化保存**源码/依赖锁、Node 24/Electron 版本要求、12 模块清单、合成场景值、夹具生成器、CLI、精简测试证据。
- Git **不上传** node_modules、dist、真实或运行中的 SQLite、用户图片及大日志。每次必须生成独立临时 Schema606 库；不可共享上次 Work 的可写数据库。
- `environment.mjs status/prepare/seal`：有通过来源指纹和文件 SHA 校验的生产构建时跳过 `npm run build`，缺依赖才 `npm ci`；源码或锁变更则正常重建，绝不能用旧缓存冒充验证。
- 当 `feature/v077` 存在 PR 且 CI 成功后，既有 PR quality 可上传**按源码 SHA/OS 命名的**可复用生产构建 Artifact（不是 ZIP 用户正式交付包）；新的 Work 可先下载相同平台的合法 Artifact 后运行 `status/prepare`。Artifact 按保留期可能到期，失效则自动构建。
- 没有已生成的 Artifact 之前，只能复用当前工作区现存的已验证构建；**首次全新 Work 环境不会凭 GitHub 中的配置文件自动拥有 node_modules/编译产物**。不要承诺永久零构建。

## 6. 本轮可执行指令与验收边界

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs list
node tools/validation/v077/module-plan.mjs show cards
node tools/validation/v077/run.mjs list --module cards
node tools/validation/v077/run.mjs run --module cards --mapped-only
# T1/T2 后才人工审核错误集并记录：
node tools/validation/v077/collect.mjs --summary validation-results/v077/runs/<RUN_ID>/summary.json --dry-run
```

现有 `E2E-RESULTS.json` 是唯一实际逐用例结果；首次模块设计/环境调整**不得将任何 NOT_RUN 改为 PASS**。本轮只完成 D0 的结构、脚本与归档；未来 T1/T2 运行后先收集问题，不直接展开 F4。阶段报告必须保存 `docs/v077/` 并核实远端 SHA。

