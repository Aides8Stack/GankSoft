# W6 — 实施方案（仅计划，当前不执行代码）

**当前授权：只整理方案文档。** 以下步骤是将来获得独立实施授权后的执行计划，不代表已经实施。

## W6.1 需求、设计与 Vue 视觉原型 — DONE

交付物：
- DESIGN.md：页面结构、现有 API、关联一致性和数据保护合同。
- docs/v077/prototypes/card-detail/W6CardDetailPreview.vue：隔离视觉原型。
- 原型只使用演示数据，不连接生产数据库，不调用真实 API。

## W6.2 正式详情 UI 与知识点关联接入 — PLANNED / NOT STARTED

未来执行顺序：

1. 重新读取 feature/v077 实际最新 HEAD、AGENTS.md、开发标准和本 W6 文档；核对生产组件与设计基线差异，不按旧 SHA 盲目覆盖。
2. 修改 src/unified/UnifiedCardDetail.vue：
   - 将 question-v1、qa-v1、direct-v1 分成明确的显示分支。
   - question-v1 使用题干/材料/紧凑选项区，以及答案/解析组合区。
   - 将统计摘要、趋势、最近学习和历史详情放入同一统计容器。
   - 新增当前关联读取状态、知识点路径展示、暂存选择、差异、保存/放弃、冲突和回读验证状态。
   - 保留现有学习历史分页、事件详情、Markdown、媒体和 dataSync 生命周期保护。
3. 修改 src/unified/v37/pages/cards.css：
   - 只增加 r3-detail/W6 范围样式。
   - 选项字母固定列、文本 min-width:0、桌面两列、窄屏单列。
   - 答案/解析、统计区、知识点 chips 和保存状态紧凑布局。
   - 不改 cards/filter 或其他页面样式。
4. 修改 src/unified/UnifiedWorkspace.vue：
   - 删除卡片详情的 @knowledge -> switchPage('knowledge') 跳转事件。
   - 不删除知识图谱页面入口，也不改变其他页面导航。
5. 复用现有能力，不修改以下文件：
   - src/main.ts
   - src/components/KnowledgePicker.vue
   - src/composables/knowledgePicker.ts
   - src/services.ts
   - shared/protocol/registry.ts
   - shared/protocol/knowledge-tree.ts
   - electron/modules/knowledge-unified/links.ts
   - 数据库迁移/Schema606/FSRS/学习统计模块。
6. 逐项自检：question/qa/direct 三种模式、旧卡片历史、媒体引用、加载错误、刷新和返回流程。

W6.2 完成条件：正式组件已接入现有 picker/API；无跳转知识图谱；无新增 API/IPC/表；代码审查确认不改变历史快照与统计口径。完成后才能进入 W6.3。

## W6.3 定向测试与验收 — PLANNED / NOT STARTED

未来测试顺序：

1. 复用 tests/knowledge-picker-v077.test.ts 的选择器取消、确认、预选、子树和异步加载测试。
2. 复用 tests/unified-knowledge-v075.test.ts 的关系保存、revision 冲突、事务回执和历史快照测试；只对 W6 新增 UI 行为补充用例，不复制既有领域测试。
3. 增加卡片详情结构/交互测试，覆盖三种模式、关联面板、保存/放弃和错误状态。
4. 用临时 Schema606 数据库执行正式 Electron 定向验收。
5. 仅运行 W6 相关用例、协议必要检查、vue-tsc/build 和生产 Electron smoke；不重跑旧 250 条全量。
6. 记录准确的被测 commit SHA、环境、用例结果和原始截图/日志。没有真实执行证据的用例继续 NOT_RUN。

## 文件修改清单

未来正式实现预期修改：
- src/unified/UnifiedCardDetail.vue
- src/unified/v37/pages/cards.css
- src/unified/UnifiedWorkspace.vue

未来测试预期新增/修改：
- tests 中 W6 卡片详情定向测试。
- 如现有 Electron smoke 无法覆盖详情页，再增加最小 W6 smoke；是否需要修改 tools/validation/package-check.mjs 和 smoke-contracts.mjs，必须先确认现有门禁覆盖情况。
- 不为本批新增 API、IPC、数据库迁移或服务层。

## 不在本方案授权范围内

当前不执行上述任何代码修改，不运行测试或构建，不升级 package.json 版本，不修改 CI trust/version policy，不创建 ready-for-review 状态，不合并 PR #38，不发布。
