# 复盘暂停与逐卡计时 Vue3 预览

## 使用

仓库根目录执行 `npx vite --config docs/v077/prototypes/vite.config.ts`，在预览 App 顶部点击「复盘暂停与计时」。也可打开单独打包的 HTML 离线 Vue 预览。

- [ReviewPausePreview.vue](./ReviewPausePreview.vue) 真实 Vue3 + TypeScript 可交互组件。
- [review-pause-controller.ts](../../../../src/review/review-pause-controller.ts) 复用的薄前端 API，不额外写 SQLite、FSRS、IPC。
- 预览包括手动暂停、自动失焦、暗色遮罩、显式继续、模拟离开/返回、三张卡独立有效计时、模拟评分提交。
- 独立 API 单测：`node --experimental-strip-types --test tests/v077-review-pause-controller.test.ts`，4 PASS；离线 HTML Chromium 实际交互 0 JS 错误。
- **正式复盘未接入、模拟提交不生成学习历史或调度**，用户确认后再开发；Windows/真实125% DPI 均 NOT_RUN。相关需求 [REVIEW-PAUSE-TIMER.md](../../requirements/REVIEW-PAUSE-TIMER.md) 与 [Issue #32](https://github.com/Aides8Stack/GankSoft/issues/32)。
