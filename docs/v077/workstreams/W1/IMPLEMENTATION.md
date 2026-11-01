# W1 — 实施方案（最多三个检查点）

> **W1 / P0** — 复盘评分、FSRS、即时同步。状态：NOT_STARTED；模型：GPT-6 / High；W 内依赖：无新 W 批次依赖；Issues #30、#31。

## 最多三个检查点
1. **W1.1 核验当前真实失败链**：从 `src/review/UnifiedReviewForm.vue`、`src/unified/UnifiedWorkspace.vue`、`src/services.ts`、`shared/protocol/client.ts`、`electron/modules/cards-unified` 复现“立即保存/自动保存竞争/退出回列表旧快照”，用同一隔离数据库核验三个真实表及可信回执。区别“未提交”与“已提交但 UI 陈旧”。
2. **W1.2 实现单一提交与同步合同**：消除正式页面/后端的 practice 绕过；修复提交锁与排队自动保存；维持单事务及原 requestId 幂等；借现有网关回执扩展元信息透传，轻量失效通知和列表 context-only 恢复。只动确实受影响的读页面。
3. **W1.3 定向回归/保存**：运行下面测试矩阵，记录 GUI→IPC→SQLite→返回列表/分析→新进程重启完整证据，提交源码+结果+RECOVERY 并核验远端 SHA；完成立即停止。

## 每批交付要求

- 源码范围只触及直接相关的既有模块，不复制 FSRS/学习统计/协议网关，不新增为了批次命名而存在的平行模块。
- 完成一个真正检查点后再正常保存；无法完成时记录 WIP 与阻断原因，不扩大范围、不自动进入下一批。
- 必要构建与测试复用已有依赖和夹具；只执行 `TEST-PLAN.md` 中的 CASE + 必需最小集成。
- 测试证据、被测源码 SHA 和最终推送 SHA 分别记录于本目录 `RESULTS.md`。
