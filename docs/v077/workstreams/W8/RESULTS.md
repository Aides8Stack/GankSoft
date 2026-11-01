# W8 当前状态：仅设计/交互原型（2026-11-01）

- 用户明确修正范围：**仅 W4/W5 AI 学习分析 ZIP 导出、AI 返回建议 ZIP 导入及调度应用**。最初广义普通导入导出提议已从 W8 排除。
- W8.1：**DONE（设计与静态审查交付范围）**：已核对 W4/W5 源码、明确父子页面、完成新旧对比、合同、AUDIT 缺口矩阵及隔离 Vue 模拟原型；不是正式生产功能。
- W8.2：NOT_STARTED；不改 Electron、共享协议、Vue 生产页面、数据库或学习排期。
- W8.3：所有 W8-01～W8-16 **NOT_RUN**；Linux/Windows正式 GUI、CI/构建及Win10/11/125%DPI全部 NOT_RUN。
- 用户新增 W8 强制要求：数据库真实学习修订或身份与来源不符时**立即弹出重新分析提示**；关闭提示不解除 stale 锁定，重新导出后仍必须导入基于新源的 AI 建议 ZIP。独立 Vue 演示原型同步增加弹窗和模拟数据变化入口；不接真实数据库。
- 继续沿用 W4 的全量固定快照、Prompt/导出校验与 W5 的原始源文件核验、精确 revision、白名单、原子执行、幂等回执、保守撤销。
- 关联 Issue #40；PR #38 继续 Draft，不合并、不发布；没有触发 Windows 构建。

设计依据为 feature/v077 当时实际代码：src/unified/UnifiedAiAnalysis.vue、src/services.ts、docs/v077/workstreams/W4/RESULTS.md、W5/RESULTS.md。后续实施必须重新确认最新 Git HEAD，不依赖本次设计时点不变。

设计任务可标记 DONE，不得把生产实现或未运行的验收标记 PASS。

## W8 文档缺口审查（新增，无生产测试）

- 新增 [AUDIT.md](./AUDIT.md) 的 A01～A16：明确真实父页面嵌入、弹窗遮罩、不重复导航、W4 进度缺少总量和 W4 结果不返回 exportId/绝对路径、AI 来源锁定、unknown 回执、隐私路径授权、导出中快照过期、Prompt 与数据修订差异。
- 新增 [CONTRACT.md](./CONTRACT.md) 的 UI/API/状态机合同及旧新来源验证流程；扩充 TEST-PLAN 至 16 项。此前 Issue #40 / IMPLEMENTATION 的旧 12 项文字为过时计数，不应再引用。
- 原型全部是合成模拟：**不向 GankSoft SQLite 写入，不通过 Electron 真正生成 ZIP，不连接外部 AI**。静态检查/远程保存只证明文件存在，不是功能验收。
- 本轮没有修改 W1–W6 已验生产源码或历史测试结果；PR #38 继续 Draft，W8.2 NOT_STARTED、W8.3 NOT_RUN。
