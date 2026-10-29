# 2026-10-29 R7.4 最终落实（当前状态）

M01/B01/N02 DONE；M02–M07/N01/N03继承DONE。M08原生安全执行已实现，但旧历史外键/版本化知识存档/未知共享恢复范围BLOCKED。B02移交R8 NOT_RUN。R7.4/R7.3/R1/R7 IN_PROGRESS，严格整体验收BLOCKED；R7.5/R8 NOT_STARTED。

检查点一249ed83dfc01fc3db92cf5df775542f176c73a7c（13文件）；检查点二6b7d220929e88440f31dec7dc9cea2641dba9035（21文件），各自parent/完整tree/变更blob独立读回一致。最终文档提交SHA由Git历史及分支HEAD解析，禁止为填写自身SHA无限提交。

安全专项15/15、正式删除Electron6组/三类三宽9检查、图谱最终3组及前序受影响A4组、协议21项/边界/类型/160方法导出、生产构建PASS。全量业务537/537曾在本轮通过；之后只增加6项安全专项与精确影响计数/存档依赖/中文标签，受影响项复验PASS，未宣称最终543项全量重跑。Windows、性能及物理输入NOT_RUN。

当前权威记录R7.4-FINAL.md与R7.4-NATIVE-PURGE-DESIGN.md；恢复入口docs/development/RECOVERY-NEXT.md。旧“历史销毁/单根/图片入口待用户决定”已被本轮明确授权替代，不再作为授权阻断。原型静态数值差异B01及导航扩展N02关闭，B02移交Windows。R7.5-ENTRY.md仅定义下一阶段Gate。

---

## 以下为历史状态（当前以本页开头和FINAL记录为准）

## 2026-10-28 精简保存及证据去重（当前规则）

已停止PNG/ZIP二进制Blob上传、49152/98304分块导出及新增采集；进程检查未发现运行中的补采/导出任务。原待提交159文件共16,433,120字节：111 PNG（14,312,334）、24 gzip快照（1,472,110）、24文本（648,676）。运行目录587文件/117,324,295字节含失败重试/接触表/合成缓存，不是提交范围。

111图按旧manifest哈希及状态来源分类：73缺失状态补证、28受夹具/状态修正影响的重采、10与旧manifest哈希相同的重复原型参考图。111内部重复哈希为0；10重复参考图不计新增独立证据。5图仅作诊断（与上述分类交叉），其中原生恢复背景不能当原生确认框验收。旧66原图不可读取，未作跨批逐像素人工复核；只核对manifest哈希及状态来源。原33对/66图和45检查继续继承，未重跑R7.1/R7.2。

全部原159文件和逐文件SHA-256索引已保存为独立检查点备份GankSoft-R73-20261028-checkpoint.tar（16,803,840字节，SHA-256 0670b09ed2a7e22b940ec66bd3f9a7bb42fba342f6f8e2dde93e6fd3feaa57fd）；独立取回备份并验证159文件哈希PASS。恢复标识及分类见supplemental-20261028/export-audit.json。全部本地成果保留，未删除旧图/运行记录；不创建新ZIP或Git Bundle。

源码仓库仅保存必要测试脚本、差异JSON、验收/进度/恢复文档；本次PNG、gzip快照、ZIP、数据库、运行缓存上传数均为0。原始PNG/DOM/CSS仅在本地与已核验独立备份，manifest中的文件名是备份索引，不表示GitHub存在这些文件。历史打包脚本summarize-supplement.py仅保留本地/备份，不纳入本次提交。没有新增业务源码变更；不访问真实用户数据库。提交前核对远端文件树/已有blob，仅保存有差异的文本；小批量UTF-8文件提交，禁止二进制Blob/分块循环。

R7.3/R1/R7仍IN_PROGRESS，严格视觉BLOCKED；2 BLOCKER、8 MAJOR、3未批准MINOR保留。R7-01/04/06 BLOCKED；R7.4/R7.5/R8 NOT_STARTED。原PR #15 Draft→develop，远端保存独立核验后停止，不等待CI、不合并/发布。

---

# R7 — 全应用集成、跨页回归与严格视觉验收：执行计划（PLAN）

状态：IN_PROGRESS；R7.1/R7.2 DONE，R7.3 IN_PROGRESS，R7.4/R7.5 NOT_STARTED。当前只完成R7.3可执行续验与保存，不进入后续阶段；详见R7.3-VISUAL-REVIEW.md。
设计基线：2026-10-28，最新源码/状态始终以远端 HEAD 和 R0-R8-STAGE-TRACKER.json 为准。

## 权威与准入

# GankSoft v0.7.6 — 阶段计划文档

> 文档补齐检查点：2026-10-28。此提交仅建立后续执行规范，不代表功能已实现或测试通过。
> 唯一工作分支：feature/v075-unified-learning-workspace；Draft PR #15 → develop。
> 权威依据：本包 README、05-R0-R8-STAGES-AND-GATES.md、04-BACKEND-E2E-TEST-MATRIX.md、03-VISUAL-FIXTURES-AND-ACCEPTANCE.md、06-CI-WINDOWS-RELEASE-GATES.md、冻结 OPEN-ME-v3.7.html，以及最新用户决策。
> 下一 Work 必须先核实远端 HEAD、AGENTS.md、STANDARDS.md、RECOVERY-NEXT.md 和现有源码/测试；下述步骤是计划，不可直接标 DONE。

**前置条件**：R5.a–d 和 R6 应先有可继承的阶段结果；R1 IN_PROGRESS 的导航/主壳遗留在 R7 中明确补验，不因 R2–R6 DONE 自动忽略。

## 本阶段目标
- 以冻结 v3.7 HTML 原型的布局/DOM/CSS 为视觉依据，在相同合成数据、字体、缩放、尺寸及页面状态下逐页比对正式生产 Electron。
- 连续使用一个隔离 Schema606 数据世界完成导航→卡片→编辑→复盘→统计→知识图谱/导入→设置/备份→重启，证明模块联动不劣化。
- 对 BLOCKER/MAJOR 差异逐项修复并重新验证；MINOR 需要明确记录和所有者批准，绝不把截图存在当做视觉 PASS。

## 实施顺序与范围

### R7.1 基线与遗留门禁

- 检查 tracker 中 R1 仍 IN_PROGRESS 的原因、R2–R6 的测试/差异/未运行项，按代码与运行环境确认旧证据是否有效。
- 核实原型 SHA256、生产入口 electron/main.ts→UnifiedWorkspace、图谱 Mind Elixir 自动布局不允许手工定位节点；冻结不可随意更改。
- 记录统一 test matrix、真实服务接口、数据夹具版本、文件树/代码 SHA、各类 Gate 初始状态。

### R7.2 跨页面真实流程

- 从 213px 文字目录进入卡片集→三模式卡片编辑发布→选择复盘/评分/暂停→分析历史→知识点关联/大纲/导入导出→设置/回收站/备份，全部通过正式 UI 与 typed IPC。
- 运行同一隔离 Schema606 的持久化、图片引用、学习事件、FSRS、历史/版本与备份恢复精确断言；正常退出后新进程读回。
- 回归原有长期 17 场景及受改动的 Crepe 表格、粘贴、图片、错误回执、图谱折叠/自动布局、跨集隔离；不删测试。

### R7.3 严格视觉与交互

- 逐页覆盖 1500×900、1366×900、900×900；同数据/同页面状态/同缩放/同字体的原型与生产截图、DOM、computed CSS、几何、hash。
- 至少空态/典型非空/长中文/异常态/弹窗/滚动/导航层级，动态数据真实生成；区分合理业务适配与未经批准的视觉偏差。
- 公共壳 CSS 仅保留实际生效来源；关闭 R1 导航残余问题；保留一套 213px 文字导航，无重复图标侧栏。

### R7.4 差异闭环与性能

- 建立逐页面差异表，包含期望/实际、截图、DOM、CSS 原因、严重级别 BLOCKER/MAJOR/MINOR、修复 commit、复验结果和明确的业务适配理由。
- 验证首次空库/中型数据/较深知识树/长文本/多图片加载分页与内存/响应性，采用实测指标，禁止凭空填写性能数值。
- 所有 BLOCKER/MAJOR 消除；MINOR 有所有者批准/明确阻断；Linux 辅助验证和 Windows 实机状态分别记录，Windows 项留 R8。

### R7.5 交付候选前汇总

- 汇总 UI_INTERACTION、VISUAL、IPC_API、BACKEND_INTEGRATION、PERSISTENCE_RESTART、NEGATIVE_SECURITY、REGRESSION 的源码版本与运行证据。
- 正式测试脚本应能从 GitHub 版本化 tests/fixtures/ganksoft/ 自动生成最小/原型等效数据；缓存不可持久时可重建，不误删活动锁。
- R7 完整验收后保存全局差异和 Gate 清单作为 R8 Windows 验收输入。

## 必须守住的边界

- 不为了截图给正式 UI 写入伪造统计或替换真实 IPC/SQLite。
- 不以静态 HTML、Linux 截图、CI 绿色或按键 DOM 响应冒充全应用验收。
- 不重做已无影响且有有效证据的阶段；受公共壳/协议影响的相关门禁必须重新验证。
- R8 才进行真实 Win10/11 同一便携包验收；未运行保持 NOT_RUN。

## 测试与证据原则

- 先确认现有 protocol/codec/服务接口和测试工具的真实名称，避免凭计划虚构可执行命令；优先使用仓库内版本化的最小合成夹具 tests/fixtures/ganksoft/，运行时 SQLite/活动租约不上传。
- 测试层次必须分别记录 VISUAL、UI_INTERACTION、IPC_API、BACKEND_INTEGRATION、PERSISTENCE_RESTART、NEGATIVE_SECURITY、REGRESSION；R8 另含 WINDOWS_REAL 和 PORTABLE_PACKAGE。实际测试命令/环境/退出码/次数及 SHA 必须记录在 TEST_REPORT.md。
- 未执行均为 NOT_RUN，失败保留 FAIL/阻断为 BLOCKED；有效的历史证据仅对未受影响项可注明继承，不得冒充在当前 SHA 上重跑。
- 每个稳定检查点 GitHub 连接器保存到原 PR#15，核实真实 HEAD/parent/tree，force=false、expected_sha，独立读回关键文件和证据；无需等待 CI，不合并或发布。

## 阶段退出 Gate

| 编号 | 必须产生的证据 |
| --- | --- |
| R7-01 R1 遗留关闭 | 文字侧栏、顶栏、目录和设置入口/导航保护真实 E2E、三宽对照通过，不保留未结高优先差异。 |
| R7-02 主流程闭环 | 编辑/复盘/统计/知识树/Markdown交换/图片/设置/备份跨页真实 UI→IPC→606→新进程读回。 |
| R7-03 安全回归 | CAS、幂等、未知回执、取消零写、回滚、图片引用和 FSRS/已发布/历史不退化。 |
| R7-04 原型视觉 | 主页面典型和异常状态三宽精确对应，截图/DOM/CSS/布局量测/差异结论完整。 |
| R7-05 全量与性能 | 受影响回归+长期17场景、按计划全量测试、性能及资源上限实际记录；阻断项有责任与复验。 |
| R7-06 差异终局 | BLOCKER/MAJOR 清零；MINOR 经用户明确批准；Windows 实机及便携 ZIP 保留 R8，不虚报。 |

## 下一 Work 恢复入口

1. 先检查 R1 尚未 DONE 的未结条目及 R5/R6 gate，再做同数据环境的最小跨页面全链路基线，逐步扩大回归。
2. 验证输入/输出、测试夹具、截图和负向回滚，按实际成功结果逐项更新 PROGRESS/TEST_REPORT/ACCEPTANCE。
3. 通过 R7 后生成 R8 Windows 候选前校验矩阵；R8 必须使用已验证的同源提交，不能用 R7 Linux 证据替代 Windows 签核。
