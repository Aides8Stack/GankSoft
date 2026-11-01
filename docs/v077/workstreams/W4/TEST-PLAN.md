# W4 — 独立测试 CASE 与验收门槛

> **W4 / P1** — AI 分卡 ZIP 导出与 Prompt。状态：NOT_STARTED；模型：GPT-6 / Medium；W 内依赖：W1、W3；Issues #35（导出）。

> **目前全部 NOT_RUN**。旧 B1–B5 的 Linux PASS 与旧250条结果不能计入本批测试；Vue 浏览器预览不代表真实 Electron 验收。

## 新增测试矩阵
| CASE | 强制断言 |
|---|---|
| W4-01 | 1、10、225、5000张卡导出，每卡独立 JSON/manifest 索引；不存在单个全量 JSON |
| W4-02 | 单卡 0、40、111 条历史与极长单卡正文安全分片；硬尺寸阈值不被悄悄突破 |
| W4-03 | SHA256、文件字节数、ZIP CRC、文件路径和每个 cardId/eventId 对应完整性一致 |
| W4-04 | 导出中发生评分/调度变化：一致快照成立或明确失败；不得拼接跨修订文件 |
| W4-05 | Prompt 保存/取消与新 ZIP 内容一致，首次默认、版本不兼容、重启读取正确 |
| W4-06 | 图片开关、损坏引用/大文件、隐私提示；不导出图片时标记材料不完整 |
| W4-07 | 导出中途失败/空间不足/取消：无残留可误用 ZIP、临时文件被清理 |
| W4-08 | Vue 在 900/1366/1600px 可操作；不改原学习历史/FSRS；Windows 真机未测 NOT_RUN |

**验收门槛**：ZIP 真实生成/解包/哈希校验、包含全部选择范围且无丢卡与旧版本混合、Prompt 保存可靠、生产 DB 和 FSRS 零变化。本批**不实现**解析后的调度 apply。

## 证据与资源上限

- 根据实际触发方式核验 UI→IPC/可信提交回执→SQLite→页面切换数据同步→新 Electron PID 重新打开；仅适用场景执行。
- 最多四个彼此隔离的测试 Worker，使用临时 Schema606 数据库；失败原样保留，区分 PRODUCT_FAIL / TEST_INFRA / BLOCKED，设施问题最多一次有依据的补验。
- Linux Electron、Windows CI、Windows10、Windows11、真实125%DPI 各自独立标记；无真实测试证据就必须写 NOT_RUN。
- 结果统一填写 `RESULTS.md`；保留运行 CASE、源 SHA、证据索引，禁止将“脚本注册成功”当 PASS。
