# GankSoft v0.7.6 — v3.7 源码级迁移、实施与测试工作包（R0–R8）

> 2026-10-27 用户新决策：**重新制定设计、实施和测试方法，保留后端与已验证业务成果，重新依据 v3.7 HTML 原型源码实现正式 Vue/Electron UI。** 本包不是代码重写授权，不代表 R0–R8 任何阶段已完成。仓库 `Aides8Stack/GankSoft`，原分支 `feature/v075-unified-learning-workspace`，Draft PR #15 → `develop`。本包制作基线：`8bad335e6c6d7ee7e853c87cd82853d36c20cb90`；新 Work 一律先检查最新 HEAD 和 WIP。

## 强制权威与冲突处理
1. 冻结原型 `docs/v075/reference/OPEN-ME-v3.7.html`（SHA-256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`）是**布局、DOM层次、视觉、交互区域**权威，不是参考配色。
2. **完整文字左侧导航**：原型 `.left-rail` 宽约213px，包含 GankSoft、学习总览、文件夹、卡片集名称/数量/选中态、设置；**不得默认用68px纯图标列，也不得额外叠加重复功能图标栏**。本集顶部路径与二级导航按原型实现。
3. 用户要求允许补齐正式版缺失的原型 UI，必要业务 UI 可增补，但不得破坏主布局；图谱全屏、节点编辑、MD层级大纲等已确认细节保留。
4. 原型的模拟数据/本地 demo 状态不可进入生产；正式页面必须通过现有 preload/协议、Schema606、FSRS、持久化及媒体服务取得真实数据。不要复制 `contenteditable` demo 替换 Milkdown/Crepe。
5. **以本目录 R0–R8 文件作为后续实施方法唯一入口**；此前 `docs/v076/WORK-PLAN.md`、`docs/v076/workpack/full-fidelity-v3.7/`、P0–P6 文件作为历史设计与测试资产；未冲突的业务约束、GitHub 守则和用户决定继续有效。原件不删除，旧已通过证据不能冒充本轮测试通过。

## 必须按序阅读
- `01-SOURCE-FIRST-ARCHITECTURE.md`：HTML → Vue → 真实 API 的技术实施边界
- `02-PAGE-AND-COMPONENT-MAPPING.md`：逐页面源码/正式组件/后端/验收映射
- `03-VISUAL-FIXTURES-AND-ACCEPTANCE.md`：同数据、同环境逐区域视觉验收
- `04-BACKEND-E2E-TEST-MATRIX.md`：真实 Electron → IPC → SQLite/FSRS/重启全链路
- `05-R0-R8-STAGES-AND-GATES.md`：九阶段、三轮 Work 与每阶段准入/退出
- `06-CI-WINDOWS-RELEASE-GATES.md`：CI/Windows/便携候选，不自动发布
- `07-WORK-THREE-STAGES-AND-RECOVERY.md`：直接复制给新 Work 的续开发指令
- `08-BASELINE-AND-MIGRATION-DECISIONS.md`：现有成果、已知问题、禁止项和恢复原则
- `manifest.json`：本包文件与原型、基线、验收目录清单

## 技术判定
不是“重新初始化项目”，也不是将全部 HTML 当生产运行时：**先解析冻结 HTML 的 DOM、样式及函数，按区域等价迁移为 Vue；Vue 仅负责状态和视图，操作通过现有 typed protocol 调用业务。** 不更改原型来迁就代码；不为相似截图硬编码数字。当前 P0–P3 代码作为候选复用资源，发现和原型不一致的 Vue/CSS 方可替换；P4–P6 未完成继续按新流程安排。

## DONE 的严格含义
**视觉比对 + UI交互 + 真实IPC/API + 数据完整性/重启 + 关联回归 + 所需Windows证据 + GitHub远端保存**分别记录 PASS/FAIL/BLOCKED/NOT_RUN。未运行/阻断时不写阶段 DONE；工作轮次最多处理3阶段可提前保存退出。不得降低测试，不能以 CI 绿或截图生成代替“原型视觉一致”。
