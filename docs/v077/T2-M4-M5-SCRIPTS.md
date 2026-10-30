# GankSoft v0.7.7 — 最后44条真实GUI自动化脚本补齐

**状态：250/250 CASE 有对应注册的可执行脚本；新44条为 SCRIPT_IMPLEMENTED_NOT_EXECUTED。** 日期：2026-10-30。

## 范围与脚本结构

此轮只填补原始250条账本中尚未有专属处理器的44个CASE；保留之前M1 47 / M2 29 / M3 47 / 已有Windows 8及T1/T2实际结果。来源：`docs/v077/evidence/T2-MERGED-PLAN.json`，禁止追加新的CASE_ID或误算重复。

| 模块 | 新增CASE数 | 脚本 |
|---|---:|---|
| 图片管理 MEDIA-02/04/05/06/07/08 | 6 | `scenarios/m4-media.mjs` |
| 导入导出 EX-01/04/06/07/08/09/10/11/12/13 | 10 | `scenarios/m4-exchange.mjs` |
| 完整备份 BACK-02/08/09/12 | 4 | `scenarios/m4-storage.mjs` |
| 真Windows双端文件对话框 BACK-14 | 1 | `scenarios/win-dialogs.mjs`（扩展既有WIN-07） |
| 回收站 TRASH-01/05/06/07 | 4 | `scenarios/m4-storage.mjs` |
| 故障/安全 FAULT-01/06/07/09/10/11/12/13 | 8 | `scenarios/m4-faults.mjs` |
| 设置 SET-05/06/07/08/09/10/11 | 7 | `scenarios/m4-settings.mjs` |
| 便携Windows WIN-01/02 | 2 | `scenarios/m5-win-package.mjs` |
| 真实Windows缩放及表格拖拽 WIN-03/08 | 2 | `scenarios/m5-win-ui.mjs` |
| **总计** | **44** | **M4 40 + M5余下4** |

通用 `scenarios/m4-support.mjs` 复用隔离Schema606合成数据、正式Electron GUI导航、图片资源列表、内容交换、完整备份、真实SQLite来源的独立合并、回收站、反馈采集、必要的原生文件容器检查和新PID验证。首次创建合成测试前置事实可以在 `fixtureSetup` 调用协议写入；**实际用户操作必须经Playwright/Electron正式界面完成**，结果使用只读IPC/SQLite、系统文件哈希、截图和实际用户提示判定，不能仅以“按钮存在”作为PASS。

### 自动反馈与业务断言

- **MEDIA**：真实粘贴/撤销/重做、复用同一asset的多处placement、图库引用影响与禁用按钮、二次确认取消/受控脱钩、发布/历史不可变、无效 URI 不可执行，备份图片哈希与重启图像加载。
- **EX**：单/多卡导出预览取消，2卡相同ID独立导入、真实 `ganksoft.card-clipboard` 标记协议、跨类型需要明确切换，AI结构化回复仅写草稿、Prompt上下文默认最小化、保存对话框取消无文件，Schema606来源合并取消/确认与历史/排期。
- **BACK/TRASH**：完整备份取消不写入、独立DB合并与重算、迁移目录确认/取消与新PID、整集/知识子树/跨集卡片恢复身份、关联、图片、复盘历史。BACK-14严格要求真实Win10/11原生保存/打开窗口，不允许Linux模拟对话框签核。
- **FAULT**：真实在途保存切换、HTML/JS/URI资源沙箱、截断ZIP拒绝与回滚、缺失媒体身份、确认框Esc、两份session隔离、Schema606路径、过长标题拒绝与旧数据保护。
- **SET**：配置脏态禁止预览、排期预览/确认/撤销、Prompt作用域、待核对操作无重复执行、关于页版本与包版本严格一致、编辑返回与无选中卡片集引导。**关于页旧版文案若不符应报真实产品FAIL，不可放宽断言。**
- **M5**：真Win10/Win11同一个便携ZIP经过PowerShell Expand-Archive及完整文件哈希，顶层仅GankSoft/无安装器；中文空格目录实际启动EXE并保存草稿/重启；物理100%及125%缩放分别核验六页；WIN-08监督真实鼠标拖拽、表格输入及撤销重做。跨主机证据使用 `tools/validation/v077/m5-pair-verify.mjs`；只输出 `READY_FOR_HUMAN_REVIEW_NOT_AUTO_PASS`，绝不自动晋升CASE为PASS。

所有新CASE通过 `executeCase` 标准封装 `observe(ctx)` / `evidence(ctx)` 保存可见反馈Trace、CASE步骤、屏幕截图、数据库/文件检查结果。没有Windows原生来源或没有第二平台/第二缩放比例证据时，明确BLOCKED；不把环境问题冒充产品FAIL。必要的GUI选择器、异步时序及夹具预置**仍需在真实Node24+Electron首次运行中核验**。静态编写、脚本注册与真实功能通过严格分开。

## 精确覆盖校验与执行方法

新建 `tests/v077-m4-m5-handler-coverage.test.ts`：校验250个原有CASE全部映射到存在的脚本，44个原缺失CASE唯一注册/执行分支，模块GUI/反馈/断言/证据检查，原生Windows平台门禁；对新增模块执行Node `--check`。该测试在本轮只完成文件保存与远端静态源文本复核，尚未在完整Node24运行或Electron实际跑44条。

在真实工作树上验证：

```bash
node --experimental-strip-types --test tests/v077-m4-m5-handler-coverage.test.ts
node tools/validation/v077/phase.mjs audit
```

**已有83 PASS和5 FAIL不重复运行。** 运行时从最新 `E2E-RESULTS.json` 自动筛选 `electronUi=NOT_RUN` 且 `registry` 已注册的CASE，再调用 `run.mjs run --ids <选定真实CASE_ID>`，不要运行整个250条，也不要盲目将旧PASS的阶段再次执行。真正执行得来的 `summary.json`、`case.json` 经过 `collect.mjs` dry-run、必要的write与 `promote.mjs` 严格证据晋升；FAIL区分TEST_INFRA与PRODUCT_FAILURE，绝不因脚本存在修改PASS账本。

Windows 物理核验：

```powershell
$env:GANKSOFT_WIN_SUPERVISED = "1"
$env:GANKSOFT_WIN_PORTABLE_ZIP = "实际已下载同一构建制品路径"
$env:GANKSOFT_WIN_PORTABLE_EXE = "实际已解压GankSoft.exe完整路径"
# Windows物理显示缩放时按100/125分别设置：
$env:GANKSOFT_WIN_EXPECT_SCALE = "100"
node tools/validation/v077/run.mjs run --ids WIN-01,WIN-02,WIN-03,WIN-08,BACK-14
```

上面环境变量为说明占位符，**运行前必须填写真实路径，不可原样执行**。WIN-01及BACK-14需Win10/Win11两端，WIN-03需实际100%/125%两次，实机报告离线配对：

```powershell
node tools/validation/v077/m5-pair-verify.mjs WIN-01 "win10-host-proof.json" "win11-host-proof.json" "paired-review.json"
node tools/validation/v077/m5-pair-verify.mjs WIN-03 "100percent-host-proof.json" "125percent-host-proof.json" "paired-review.json"
node tools/validation/v077/m5-pair-verify.mjs BACK-14 "win10-dialog.json" "win11-dialog.json" "paired-review.json"
```

这些命令不会替代人工原始GUI证据核对。现有 `WIN-09` 的双Win验收仍按 `win09-verify.mjs`；上次3条BLOCKED保留直至Windows真机补验。

## 本轮不改变测试结果

同期另一Work完成91条优先精准验收，远端最新有效权威账本目前：**83 PASS / 5 FAIL / 3 BLOCKED / 159 NOT_RUN**，且优先91已完成78PASS/5FAIL/3BLOCKED/5NOT_RUN。此轮只写脚本与报告、**不覆盖同期Work已经晋升的真实证据**。要以GitHub实际最新 `E2E-RESULTS.json` 为准；源码脚本和账本可在同树持续演进。

### 仍需实际实测的风险边界

1. 首次在Windows/完整Node24上校验所有新增脚本的模块导入、IPC参数、选择器和Electron实际交互；静态检查不保证运行成功。
2. 新CASE可能真实暴露业务缺陷，特别是已知版本文案差异、图片引用/撤销、合并数据冲突。记录实际FAIL而不为测试全绿降低断言。
3. 工具脚本错误仅定向修测试设施和重新执行受影响未取得真实结果的CASE；已有PASS/FAIL无须重复跑。
4. 在真实Windows交互桌面不可用时，先完成非Windows M4；平台专项保留NOT_RUN/BLOCKED，禁止假截图或合成IME冒充。
5. Windows原生多主机比对只签发待人工验收文件，工具不会也不应直接修改 `win10Real` / `win11Real` / CASE PASS。

本轮没有修改 `src/`、`electron/`、`shared/`、锁文件或生产业务源码；没有创建新分支、强推、合并、发布或等待CI。
