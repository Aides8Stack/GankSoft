# GankSoft v0.7.6 — Work 连续执行指令：完整复刻 v3.7

在 GitHub `Aides8Stack/GankSoft`、唯一现有分支 `feature/v075-unified-learning-workspace`、Draft PR #15 上继续开发。先读取 `AGENTS.md`、`docs/development/STANDARDS.md`、`docs/v076/WORK-PLAN.md`、`docs/v076/STATUS.md`、本目录 `FULL-FIDELITY-SPEC.md` 与 `UI-MAPPING-AND-ACCEPTANCE.md`，并打开原版 `docs/v075/reference/OPEN-ME-v3.7.html` 核验 SHA256。以最新远端 HEAD 和未提交 WIP 为准，绝不重置/覆盖已有工作。

## 用户最新最高优先决定
**不是参照原型做相似软件，而是尽可能完整还原原型的界面外观、结构和交互；原型已有而正式 Vue 缺失的 UI 全部允许补齐，不视为需求扩大。**
保留之后确认的窄图标栏、卡片集中心操作、图谱工具和根节点特殊规则。原型所有假数字/模拟功能替换为 Schema606 真实数据与接口；不改业务数据库和已稳定业务。把 P0–P2 的视觉偏差列为当前优先修复，先纠偏再继续 P3–P6；不要因为本地场景 PASS 就跳过 UI 差异。

## 具体执行
1. 检查 GitHub 当前 HEAD、PR 和 CI，不等待 CI；核对本地 WIP。读取 v3.7 原型各页函数、CSS、DOM，与正式 Vue 逐页建映射清单。
2. 先纠偏 P0 导航及二级层级、P1 首页、P2 本集概览/列表/详情。逐区域修复视觉：排版、尺寸、留白、标题、按钮、图标、卡片、状态、双栏、子导航、工具条、空态。缺失 UI 直接补。保持真实数据、性能和能力。
3. 每一页做 1500/1366/900 三宽的**原型和正式 Electron 同尺寸并排截图对照**；至少分别验证空白606与合成非空606，记录真实实现 SHA、环境、差异项；对照失败则修正后重测。Windows 真实正式截图未完成时仅标视觉 NOT_RUN/BLOCKED。
4. 功能测试、协议、构建、旧 workspace 17 场景以及受到影响的编辑/复盘/图片/图谱回归按原强度测试，绝不删、弱化或跳过断言。旧功能检验结果与视觉验收分开报告。
5. 然后继续 P3 编辑器/复盘/分析，P4 全屏知识图谱/MD，P5 设置/回收站，P6 Windows 正式 UI、便携候选验收。同一套原型复制标准贯穿每页，不得又自行设计。
6. 每个阶段将源码、测试、差异表、脱敏截图、PLAN/PROGRESS/TEST_REPORT/ACCEPTANCE 同步至原 PR #15，推送后读回远端 HEAD 和关键文件。额度或连接中断前优先保存 WIP。
7. 不新建分支/PR，不强推，不修改 Schema606、FSRS 或已取消 S8.b，不自动合并、不绕过 pr-trust、不发布；不等待 CI 阻止独立开发。若视觉原型截图环境超时，标 BLOCKED，保留复验任务；不冒称 PASS。

## 阶段状态不得假称
截至当前已核实的 P2 检查点 `c74f921aa93fcffc1d39db86346c5497eb3dfd36`：P0–P2 有实现和 Linux 局部测试，但仍 IN_PROGRESS；Windows 逐页视觉 NOT_RUN；17 场景完整回执待确认；P3–P6 未完成。新 Work 必须按新的真实 HEAD 复核，不把此旧 SHA 当当前 HEAD。
