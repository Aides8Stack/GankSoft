# R6 — 设置、回收站、备份与全局交互：进度

**状态：IN_PROGRESS**（2026-10-28 规划补齐检查点；尚无本阶段生产实现或测试运行）

## 已有依据（只说明计划和可继承资产）

- 主实施边界见本目录 PLAN.md，准入/退出门槛见 ACCEPTANCE.md；总体计划见 ../../05-R0-R8-STAGES-AND-GATES.md。
- 原型、已有 Vue/IPC/Schema606/测试及较早阶段证据需按最新 HEAD 复核，不能将其存在当作本阶段完成。
- 现有用户决定：原型 v3.7、文字左栏、设置内回收站、Mind Elixir 自动图谱布局、便携 ZIP（无安装器）、原 PR #15 不自动合并/发布。

## 本阶段开发记录

| 工作项 | 状态 | 备注 |
| --- | --- | --- |
| R6.1 设置主界面与导航 | NOT_STARTED | 等待下一 Work 核实源码与执行 |
| R6.2 调度配置与例外 | NOT_STARTED | 等待下一 Work 核实源码与执行 |
| R6.3 设置内回收站 | NOT_STARTED | 等待下一 Work 核实源码与执行 |
| R6.4 完整备份、恢复与合并导入 | NOT_STARTED | 等待下一 Work 核实源码与执行 |
| R6.5 数据目录与危险操作 | NOT_STARTED | 等待下一 Work 核实源码与执行 |

## 未执行与安全边界

- 生产代码修改：无（此检查点只创建规划文档）。
- 本阶段新测试、截图、Windows 和 CI 验证：NOT_RUN；详见 TEST_REPORT.md。
- 不自动修改全局阶段跟踪中的状态，不覆盖 R5 正在进行的 B4 工作。

## 下一步

1. 读取本阶段 PLAN.md 与 ACCEPTANCE.md；检查正式设置 UI、已有 Trash/backup/path/scheduler 服务及当前 R1 壳组件的映射；优先补最少一条真实设置入口到 606 的闭环，不重复开发旧数据层。
2. 开始实作前检查 PR#15 真实 HEAD、未保存 WIP，按业务服务/前端组件的实际能力拆分最小可验证工作。
3. 有效工作完成后更新本文件和 TEST_REPORT/ACCEPTANCE，按检查点安全提交、独立核验；用户没有授权时不得自动发布。

## 2026-10-28 R6.1 检查点

R6.1 DONE：冻结 settings-grid/menu/main 结构接入9分类（含必须的常规、调度、数据、备份与恢复、内部回收站），不增加主导航。窄屏分类横排；重开保留分类、切换聚焦标题、主题失败可重试；调度嵌入原组件并复用离页 guard。生产 build PASS；正式 Electron4组与6截图/DOM PASS，详见 evidence/settings/attempt-2.json。R6整体仍 IN_PROGRESS；R6.2–R6.5连续执行，不以保存退出。
