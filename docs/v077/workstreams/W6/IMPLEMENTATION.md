# W6 — 实施方案（最多三个检查点）

## W6.1 设计与隔离 Vue 原型

- 归档用户需求、布局设计、关系读写/验证合同。
- 新增独立 Vue 原型，覆盖 question/qa/direct、三大区块、知识点 chips、编辑选择弹窗、待保存/保存/放弃反馈。
- 原型仅展示交互，不接真实 DB，不冒充生产实现。

## W6.2 正式详情 UI 与关联编辑

- 修改 `src/unified/UnifiedCardDetail.vue` 的展示模板和局部状态。
- 修改 `src/unified/v37/pages/cards.css`，仅限 `.r3-detail` 范围。
- 复用 `useKnowledgePicker`、`unifiedKnowledge.links/tree/setLinks`、`dataSync`。
- 移除详情页到知识图谱主页面的 `@knowledge` 导航事件/处理器（若无其他调用者）。
- 保存关联后回读验证新增/断开/保留集合；处理 CAS 冲突和未知回执，不自动重试写入。

## W6.3 定向测试与收尾

- 补充领域/组件/静态合同测试，复用现有 `tests/unified-knowledge-v075.test.ts` 关系测试夹具。
- 正式 Electron 900/1366/1600 交互，检查三个模式、长选项、关联新增/断开/保留、取消/保存/冲突、刷新及历史快照。
- 必要运行协议边界、Vue/后端类型和 build；仅实际执行的用例记 PASS。
- 更新 RESULTS、TASK/PLAN/PROGRESS/HANDOFF/TEST_REPORT/RECOVERY 和 W6 总目录，提交并独立核验远端 SHA/tree/blob。
