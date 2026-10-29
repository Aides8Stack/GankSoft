# R6 历史检查点记录

以下包含启动时模板和逐次记录，当前状态以PROGRESS/ACCEPTANCE/TEST_REPORT为准。原始FAIL证据不删除。

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

## R6.2 检查点

R6.2 DONE：单卡明确显示继承卡片集/单卡独立来源；原预览确认与撤销保留，增加取消预览、加载失败重读、busy/unknown离页阻断，未改FSRS。正式Electron5组和三宽3PNG/DOM PASS；统一复盘领域14/14 PASS；build PASS。配置保存不改变原排期；取消不写；主动重算只提前未来继承卡，逾期/独立不变，撤销保留应有审计与递增revision；新PID精确读回。前序远端3fe9d7aefe74db5832ce740542f5e887bff33879/tree45ac8ddff5534e48353a12c5201be65bb78404b2独立核验。保存后继续R6.3。

## R6.3 检查点

R6.3 DONE：复用原回收服务，设置内显示文字恢复子树入口与无集选择空态。正式Electron7组 PASS：卡片删除/恢复取消、真实回执故障回滚；图谱整树删除/恢复及媒体引用保护；同名改名、缺父重挂载；卡片集缺目录/同名恢复；新PID精确读回。三宽恢复3图/DOM已审阅；领域回归21/21/build PASS。前序远端9c9f3dbb271daddecddb3ffcb9fe9052ee7adf63/tree7bcab7464157b36d19e7cd9b1a2603ec5c2141ac读回一致。保存后继续R6.4。

## R6.4 检查点

R6.4 DONE：设置明确区分完整恢复与合并导入；新增storage.merge.*仅606入口，复用原独立追加协调器/身份映射/候选事务/恢复点；旧storage.append.*仍METHOD_UNSUPPORTED。真实影响计数含集/卡/知识/草稿/历史/排期/实际图片字节。来源同版本默认跳过，显式force是独立副本；不合并既有卡片历史，不造第二套FSRS。

完整恢复/合并均持久保存原确认、结果未知锁定、按原ID+epoch核对；修复stale后重新握手及原址reload被will-navigate拦截。外部导航仍阻断。最终正式Electron9组+六张三宽 PASS，源/现库/媒体/非空历史/FSRS/新PID逐项精确核对。存储42、公开merge2、来源合同15、协议21/边界/类型/157方法、build PASS。前序fdedb8a818a61d73047f9b4eaa0bebb483f32f67/treedb3acc1b99c6b6413ac162fb9010dc0546e469dd已核验。保存后继续R6.5。

## R6.5 检查点

R6.5 DONE：现有目录迁移服务补可写权限预检，设置支持重读当前有效目录、失败清旧预览和非终态锁定/持久原请求。正式Electron6组 PASS；原目录读取/选择取消、占用目标用户哨兵保护、空间媒体预览取消、源并发变化拒绝、完整复制校验切换及未知原请求重放、新PID从新目录逐项精确读回。16领域/协议/进程中断回滚项与build PASS，三宽3图/DOM已审阅。原库/活动租约/用户文件没有清理或覆盖。前序e7c53017442e451735444df18532d6414b85347f/tree94f044612042bd516affb1938a582c4d8b4f323c读回一致。R6整体验收待最终原型对照、差异归因和恢复记录核验，当前仍IN_PROGRESS。
