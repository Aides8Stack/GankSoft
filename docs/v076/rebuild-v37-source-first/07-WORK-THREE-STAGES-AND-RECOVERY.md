# 07 — 新 Work 直接执行指令（每次最多3个阶段）

> 这份文件即新 Work 的执行合同。用户授权自动连续处理当前批次最多3个阶段，**然后必须完整 GitHub 保存、核验远端并主动结束，不进入第四个阶段**。不得在单个 Work 背景无限继续，下一次由用户开启新 Work 并再次提供相同指令。未完成阶段在新 Work 恢复，不跳步。

## 一、启动时读取
仓库 `Aides8Stack/GankSoft`；唯一开发分支 `feature/v075-unified-learning-workspace`；Draft PR #15 → `develop`；版本 `0.7.6-rc.1`。已知制作基线 `8bad335e6c6d7ee7e853c87cd82853d36c20cb90`，**不是可直接覆盖的新HEAD**；以实时GitHub HEAD、本地未提交WIP、最新历史与CI为准。

1. 读取 `AGENTS.md`、`docs/development/STANDARDS.md`、`docs/development/TASK.json` 及原有 PLAN/PROGRESS/HANDOFF/TEST_REPORT。
2. 读取 `docs/v076/rebuild-v37-source-first/README.md` 和本目录 01–08 全部规范、`manifest.json`。
3. 打开冻结原型 `docs/v075/reference/OPEN-ME-v3.7.html`，校验SHA256；直接审读 DOM/CSS/JavaScript、所有主要页面函数、状态与事件，不能只打开截图。
4. 审查 `src/unified/UnifiedWorkspace.vue`、`UnifiedHome.vue` 等已实现源码、`ui-v076.css` 覆盖关系、`shared/protocol/registry.ts` 和真实后端模块；将 P0–P3 已有功能与测试视为候选可继承成果，不机械重写。

## 二、工作算法
- 检查 `docs/development/RECOVERY-NEXT.md` 与本目录 R0–R8 状态及当轮源文件测试，**选择首个未完成、可安全继续的阶段**，在一个 Work 内最多涉及3个连续实施阶段。
- 第1轮 R0→R1→R2；第2轮 R3→R4→R5；第3轮 R6→R7→R8。跨轮时若R0–R2未完，先继续安全可行的未完成部分，不因“已处理过”就永久跳过缺项。
- R0 **先建立源码映射、CSS计算来源和同数据夹具**，不要仅更新视觉截图。R1+迁移公共壳/CSS，R2+迁移首页与集工作台；之后按原型页面函数迁移。
- 保留原版左侧213px文字目录、topbar/subnav/原组件层次；允许补 UI 但不能重新创作主布局；不能把 demo HTML 作为正式生产运行。
- 生产 Vue 用既有 typed IPC、Schema606、FSRS、媒体/历史。每个 UI 功能做 UI→API→SQLite/重启、负向测试和受影响回归；同数据三宽对照原型。全部关键测试分别记 PASS/FAIL/BLOCKED/NOT_RUN。
- 发现公共 CSS 重复覆盖，应按真实 computed style 来源重组为单一规则而非追加补丁；Crepe/Mind Elixir 正式原生功能优先，不重写业务。
- 完成每个有意义的子任务立即提交/推送到原 PR #15 并读回远端 HEAD/文件；不能等三阶段结束才首次提交。严禁新分支、强推、无授权合并/Release、降低门禁、改 Schema606 或恢复 S8.b。
- 不等待长CI，记录 run/status 后继续不依赖该结果的独立任务；环境或额度出现风险立即停止开发、保存可用WIP。

## 三、阶段 Gate
每个阶段有源码/差异/截图与测试记录；无原型同数据比较、无真实生产UI后端读写或无必要平台证据，绝不能 DONE。真实 Windows/Win10/11 未跑标 NOT_RUN；Linux截图仅辅助。以前有效业务证据可有条件继承但不可冒称本轮全通过。

## 四、每轮结束必须保存
1. 停止新增功能，审差异/私密信息/并发HEAD。
2. 保存源码、脚本、测试、合成数据生成器、截图、`docs/v076/rebuild-v37-source-first/stages/R*/` 逐阶段记录。
3. 更新 `docs/v076/STATUS.md`、`docs/development/{RECOVERY-NEXT.md,TASK.json,PROGRESS.md,HANDOFF.md,TEST_REPORT.md}`（文件存在才更新，新增按仓库惯例），及本目录阶段总表。
4. 记录准确 commit SHA、PR#15、CI运行、截图覆盖、实际命令/退出码、未完成/阻断与下一Work的首个具体操作。
5. 使用非强制push或仓库批准GitHub API树提交，**读回远端HEAD及关键文件 SHA**。无法远端保存则明确“仅本地/未远程保存”，保留可验证本地备份。
6. **处理3个阶段后主动结束本次 Work；不进入第4阶段。** 若时长/连接/额度/安全阻断可提前结束。

## 五、恢复口令（用户新开 Work 时使用）
“继续 GankSoft v0.7.6 源码级 v3.7 UI 重构。使用仓库原分支和 PR#15。按 `docs/v076/rebuild-v37-source-first/07-WORK-THREE-STAGES-AND-RECOVERY.md` 执行，以 GitHub 真实最新HEAD和记录确定首个未完成阶段；本Work最多3阶段，持续中途保存，结束时完成远端核验、恢复交接后主动停止；不等待CI、不新建分支、不合并、不发布。UI严格迁移原型HTML/DOM/CSS且必须验真实后端与持久化。”
