# W6 — 执行结果

**状态：IN_PROGRESS / BLOCKED（仓库验证门禁）。** W6 生产实现与测试入口已保存；PR #38 已创建 Draft，但仓库 trust/version gate 阻止进入测试 job。W6 实际 CASE 仍全部 NOT_RUN，不得标记 DONE。

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


## 2026-11-01 PR 门禁结果（非产品测试结论）

- Draft PR：[ #38 ](https://github.com/Aides8Stack/GankSoft/pull/38)，head `b8f9afd962b7b61d0841129c4415504a51ab3d01`。
- PR quality run [41298025980](https://github.com/Aides8Stack/GankSoft/actions/runs/41298025980)：scope job 在版本策略处失败，报错 `Version must increase above current base`。feature/v077 与 develop 的 `package.json` 当前均为 `0.7.6`，策略要求 PR 版本高于 base；quality job 被跳过，因此 npm test、protocol、build、package-check 均未运行。
- PR trust run [41298026013](https://github.com/Aides8Stack/GankSoft/actions/runs/41298026013)：因本批修改 `tests/` 与 `tools/` 控制路径，报 `CI_POLICY_REVIEW_REQUIRED`。这是要求所有者对完整 SHA 进行人工复核的保护措施，不得绕过。
- 上述是仓库门禁阻断，不是 W6 产品 FAIL。W6-01～W6-08 继续 **NOT_RUN**。

## 恢复条件

1. 所有者审阅 PR #38 完整 diff 后，在 GitHub Actions 的 `GankSoft trusted PR metadata` 工作流中选择 `main` 手动运行；输入 PR_NUMBER=`38`、EXPECTED_SHA=`b8f9afd962b7b61d0841129c4415504a51ab3d01`、CONFIRM=`review b8f9afd962b7b61d0841129c4415504a51ab3d01`。只在确认该完整 SHA 后运行。
2. 决定是否将 package.json/package-lock 从 0.7.6 提升到 0.7.7 以满足 develop 的版本门禁。未获明确授权前不修改版本。
3. 门禁通过后重新触发 PR quality，才可记录真实测试结果。
