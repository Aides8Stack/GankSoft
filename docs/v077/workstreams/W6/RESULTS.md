# W6 — 执行结果

**状态：IN_PROGRESS。** 生产实现和测试入口已编写并准备保存；实际命令、Electron 交互与测试结果尚未运行，不得标记 DONE。

## 检查点

| 检查点 | 状态 | 说明 |
|---|---|---|
| W6.1 设计与隔离 Vue 原型 | DONE | 设计和原型已在提交 `d4f500ac3937d017738746b72c05d3ff570ebff8` 保存 |
| W6.2 正式详情 UI 与关联编辑 | IN_PROGRESS | 正式组件、样式和父页面导航事件已修改；待类型检查/构建/Electron验收 |
| W6.3 定向测试与收尾 | IN_PROGRESS | 领域测试、Electron smoke 和 package-check 接入已编写；尚未运行 |

## 生产改动范围

- `src/unified/UnifiedCardDetail.vue`
- `src/unified/v37/pages/cards.css`
- `src/unified/UnifiedWorkspace.vue`

## 测试改动范围

- `tests/w6-card-detail-v077.test.ts`
- `tools/smoke-w6-card-detail.mjs`
- `tools/validation/smoke-contracts.mjs`
- `tools/validation/package-check.mjs`

## 测试账本

| CASE | 状态 | 说明 |
|---|---|---|
| W6-01～W6-08 | NOT_RUN | 自动化入口已准备，实际测试未运行 |

## 平台状态

- Linux unit/type/build：NOT_RUN
- Linux Electron ASAR smoke：NOT_RUN
- Windows CI：NOT_RUN
- Windows 10/11：NOT_RUN
- 真实 125% DPI：NOT_RUN

## 下一步

先运行 W6 新增领域/静态合同测试，再执行协议检查、构建和 package-check。修复真实失败后重跑受影响用例，保存原始日志和三宽截图。不得因脚本已注册或源码已提交将用例标记 PASS。
