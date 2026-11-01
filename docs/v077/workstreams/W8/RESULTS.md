# W8 当前状态：仅设计/交互原型（2026-11-01）

- 用户明确修正范围：**仅 W4/W5 AI 学习分析 ZIP 导出、AI 返回建议 ZIP 导入及调度应用**。最初广义普通导入导出提议已从 W8 排除。
- W8.1：现有工作流核对、方案、旧新对比、独立 Vue SFC 交互模拟预览文档可交付；不是正式生产代码。
- W8.2：NOT_STARTED；不改 Electron、共享协议、Vue 生产页面、数据库或学习排期。
- W8.3：所有 W8-01～W8-12 **NOT_RUN**；Linux/Windows正式 GUI、CI/构建及Win10/11/125%DPI全部 NOT_RUN。
- 继续沿用 W4 的全量固定快照、Prompt/导出校验与 W5 的原始源文件核验、精确 revision、白名单、原子执行、幂等回执、保守撤销。
- 关联 Issue #40；PR #38 继续 Draft，不合并、不发布；没有触发 Windows 构建。

设计依据为 feature/v077 当时实际代码：src/unified/UnifiedAiAnalysis.vue、src/services.ts、docs/v077/workstreams/W4/RESULTS.md、W5/RESULTS.md。后续实施必须重新确认最新 Git HEAD，不依赖本次设计时点不变。

设计任务可标记 DONE，不得把生产实现或未运行的验收标记 PASS。
