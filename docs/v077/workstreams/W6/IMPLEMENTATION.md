# W6 — 实施方案（最多三个检查点）

## W6.1 设计与隔离 Vue 原型 — DONE

- 需求、交互、接口合同和独立 Vue 原型已保存。
- 原型不连接真实数据库，不冒充生产实现。

## W6.2 正式详情 UI 与关联编辑 — IN_PROGRESS

- `src/unified/UnifiedCardDetail.vue`：question/qa/direct 三模式分组；紧凑选项；答案与解析同组；统计/趋势/最近记录/历史归组；关联名称与层级路径；选择器暂存、保存/放弃、CAS 冲突和未知回执处理。
- `src/unified/v37/pages/cards.css`：选项两列/窄屏单列、固定字母列、长文本换行、统计和关联编辑布局。
- `src/unified/UnifiedWorkspace.vue`：移除详情页跳转知识图谱的 `@knowledge` 事件。
- 复用现有 `useKnowledgePicker`、`knowledge.cardLinks.get/set`、`knowledge.tree.read`、`dataSync`。无新增 API/IPC/SQLite 表。

## W6.3 定向测试与收尾 — IN_PROGRESS

- 新增 `tests/w6-card-detail-v077.test.ts`：布局合同、三模式、现有 API 接入、关系增删保留、CAS 与历史快照持久化测试。
- 新增 `tools/smoke-w6-card-detail.mjs`：正式 Electron 900/1366/1600、选择器操作、关系保存/读回、CAS 冲突、取消、独立 PID 重启。
- 接入 `tools/validation/smoke-contracts.mjs` 与 `tools/validation/package-check.mjs`，由现有生产606 ASAR smoke 门禁执行。
- 必须实际运行 `npm test`、`npm run check:protocol`、`npm run build`、Linux Electron package-check；未运行项继续 NOT_RUN。
