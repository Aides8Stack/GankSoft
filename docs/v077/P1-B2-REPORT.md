# P1 B2 编辑器、剪贴板与 Markdown 实测报告 — 2026-10-30

状态：IN_PROGRESS（34 条均已实际执行，4 条设施问题未有可信结论）。本轮 B2 执行已结束，下一轮 B3，不自动重开遗留。

| 统计项目 | 结果 |
| --- | --- |
| 计划测试 | 34 |
| 实际首次运行 / 唯一 CASE | 34 / 34 |
| 设施补验 | 14 条各一次 |
| 总尝试次数 | 48 |
| PASS | 28 |
| PRODUCT_FAILURE | 2 |
| TEST_INFRA | 4 |
| BLOCKED | 0 |
| 最终 NOT_RUN | 4 |

4 TEST_INFRA 与 4 NOT_RUN 是同一批 CASE，不双计。没有未启动 CASE；没有执行 B1/B3/P0/P2/Windows 专项，没有重跑继承 PASS 或已确认产品 FAIL。未改生产业务源码、锁文件、版本、CI。

## 来源与复用

- 首轮完整被测 Git SHA：`fdabd07f322ee99bbe592d1b4e78a546a54d23c8`。
- 唯一设施重试完整 Git SHA：`428efee4b16f4ffd55146922c92003bc4b36bfcb`（本地不可变提交；bundle 保留 exact tree；最终远端保存基于另一生产树，不建立虚假的同 tree 映射）。
- 生产构建保存 SHA：`4e2e0fe3e208c7134763332d9d872983538205bc`；首轮与重试源码的构建输入完全相同。生产输入指纹：`807a7b1bb302464f79a34f37eb9d840937a7ab41e70a2ec6e899e5ecf2844412`。
- Node24.22.1 / Linux x64 / Electron44.9.1 / Schema606。依赖和 411 个构建输出逐哈希验证复用，**零安装、零构建**；结束后 environment status 仍 valid。
- 现有四 Worker 调度器未修改。每 CASE 独立 Node/Electron/headless Ozone 后端、临时 SQLite 库、userData 与证据目录；剪贴板在各自 headless 后端进程内隔离，共享只读依赖/构建。生产源码冻结不变，单条失败不阻断其余 CASE。
- Linux 合成原生剪贴板与系统对话框注入不等于 Word/WPS、Win10/11 物理操作或中文字体视觉验收；各 Windows 层原值保持。

## 结果与业务证据

| 模块 | PASS | PRODUCT_FAILURE | TEST_INFRA / NOT_RUN |
| --- | --- | --- | --- |
| EDITOR（17） | 14 | 1 | 2 |
| CLIP（8） | 6 | 0 | 2 |
| MD（9） | 8 | 1 | 0 |

每条可信 PASS 保留 GUI 动作、可见反馈、实际协议/SQLite 只读核对，以及原 CASE 需要的保存、重开、新 Electron PID/文件内容证据；已发布版本保护与数据库完整性检查保留。首次表面 PASS 的 MD-05/CLIP-12 经覆盖审核撤回，分别补上实际新图片粘贴/第二次 Ctrl+V 后才按真实结果判断。MD-05 补验完整通过；CLIP-12 后续受驱动错误阻断，仍 NOT_RUN。

### 新产品问题：1 组症状、2 条失败

`EDITOR-10` / `MD-02`：连续使用原生 Markdown 标题、列表等快捷输入规则，再立即输入后续正文，字符出现错位，并已通过 GUI 保存进数据库。

- EDITOR-10 输入 `列表条目` 实际为 `表条目`；输入 `code one` 实际为 `de one`，`co` 出现在后方其他位置。
- MD-02 输入 `Markdown 列表` 实际为 `arkdown 列表`，`M` 移到后方链接段落附近。
- 最小操作：打开已发布直接记忆卡或知识点正文 → 输入标题/列表快捷语法、Enter 并继续键盘输入 → 保存 → 对照 failure-ui.txt 与 diagnostics 中的 SQLite Markdown。没有 fixture/选择器异常；为实际内容错误，按 PRODUCT_FAILURE 登记，不再重跑。
- 缺陷入口：`AUTO-EDITOR-10-edcae784ef2d`，关联 MD-02；`AUTO-MD-02-85c8380ced32` 标 duplicateOf，避免计两项独立 BUG。**仅按相同症状去重，具体代码根因尚未确认**，待 High 修复阶段诊断。

## 设施问题与重试上限

- **EDITOR-11**：First: ambiguous table selector. Retry: Control+Home selected the empty leading paragraph, so the color assertion never exercised a non-empty selection; formula/table saved, remaining color/reopen chain unverified.
- **EDITOR-12**：First: ambiguous table selector/nonexistent text menu. Retry: actual hover handle added a row, column handle was not revealed; remaining add/delete/undo/restart chain unverified.
- **CLIP-10**：First: native clipboard normalized source JPEG/WebP to PNG, contrary to script MIME-preservation assumption. Retry: Electron44 clipboard.availableFormats API is absent. No reliable complete format chain; not a product failure.
- **CLIP-12**：First: inserted one image then reinserted via resource manager instead of a second paste. Retry: two real Ctrl+V created 2 assets/placements, but driver incorrectly required asset-ID deduplication before width/restart checks. Original CASE does not demand asset reuse; no product FAIL conclusion.

以上四条均已使用首轮 + 唯一一次设施补验，保持 NOT_RUN；不做第三次测试，不以已完成的局部操作冒称全链 PASS，不将设施断言转为产品 FAIL。

其余修正只在测试设施：展开材料折叠区（含重开后）、不把已选正确答案的无变化点击当作新草稿、颜色 fill 已自带 input 不重复触发 toggling、正确比较知识树层级而保留正文修订变化、在关闭进程前关闭交换工作区、失效导入在预览阶段读取错误、未知回执在修改前注入并临时阻断对应 operation.status。MD-11 验证保存只增加一次 revision、原 requestId 重放和重启后正文一致。没有生产写入替代用户 GUI 动作。

## 收集、晋升与核验

两轮均执行原 collect.mjs dry-run/write 和 promote.mjs dry-run/晋升；首轮仅经审核的 18 PASS + 2 FAIL，补验 10 PASS。保留原始 summary/case/console/diagnostics/截图与 reviewed-summary，混合 SHA 的批次聚合表不直接 promote。每轮脚本哈希与构建身份在 P1-B2-RESULTS.json 中，完整原始记录在独立证据包。

调度器自检 4/4 PASS；6 个修改脚本语法检查通过。附加旧 M2/M3 注册测试 11 项中 8 PASS、3 FAIL：旧静态测试硬编码“注册后全部 NOT_RUN”，与已实际晋升的权威账本冲突（EDITOR-01/PLAN-01 等），属于过时测试前提；未改断言制造通过、未扩展修复这些旧测试。此处不是新增业务失败。

冻结基线本地经严格 promote 后，30 条 B2 CASE 有可信结论（其余216条对象逐条不变）；该本地账本仅作为旧源码证据留在原始包，**不覆盖最新权威账本**。

### 并发保存冲突与来源失效

保存前远端前移到 `02b1c7b5fa41543abb2c446fb39585fecd0b38ed`，另一 Work 已修复 FAULT-05，修改了生产 media-adapter、milkdown-adapter、服务/协议和后台媒体资源链，并新增 transport holdAfter 设施。此生产树与 B2 固定构建身份不一致；本轮没有重建/重跑，不把28条旧基线PASS或两条旧基线FAIL冒充新HEAD验证。**本轮30条可信结论只保存独立报告，未晋升最新 E2E-RESULTS.json。**

最新权威250条账本原样保留：**118 PASS / 2 FAIL / 3 BLOCKED / 127 NOT_RUN**（FAULT-05 已由并行 Work 晋升PASS；本轮新发现的两条旧基线失败尚未写入新基线FAIL总数）。B1与F1–F3、FAULT-05修复和Windows证据均保留。恢复文档在远端新文档上追加；host.cjs按字段保留 holdAfter 并合入本轮 drop-unknown，合并后的驱动仅静态检查，未冒称新生产实测。

保留每个CASE的实测SHA、脚本哈希、构建指纹和全部运行/重试记录；最新源码上的B2回归需另获授权，不能擅自在本轮启动第三次设施尝试或重跑已测CASE。

## 下一轮

入口为 **B3：PLAN / REVIEW / KNOW**，沿用五批计划与四 Worker 调度器。先确认远端最新 HEAD、environment status，再 list/run B3；不自动重试 B1/B2 已耗尽设施次数的项目。B2 原始证据和具体失败路径已保存；没有进入 B3、不等待 CI、不合并、不发布。
