# W5 — 独立测试 CASE 与验收门槛

> **W5 / P1** — AI 返回 ZIP 安全执行与验收。状态：NOT_STARTED；模型：GPT-6 / High；W 内依赖：W1–W4；Issues #35（执行）、#18。

> **目前全部 NOT_RUN**。旧 B1–B5 的 Linux PASS 与旧250条结果不能计入本批测试；Vue 浏览器预览不代表真实 Electron 验收。

## 新增测试矩阵
| CASE | 强制断言 |
|---|---|
| W5-01 | 合法 1/500建议及无效 schema、错误 deck/snapshot、恶意 ZIP、路径穿越、超限全部正确拒绝 |
| W5-02 | 四类白名单动作合理生效；非白名单/越界/逾期延后、客观数据修改被拒 |
| W5-03 | ZIP 解析→预览而未点击执行，数据库/日志/FSRS **零写入** |
| W5-04 | 预览后用户又复盘、修改知识树/调度：执行前再校验并拒绝过期操作 |
| W5-05 | 相同卡片重复建议、跨批冲突、中途 SQL 失败：整批零部分写入、真实回执 |
| W5-06 | 幂等 requestId 重试、未知回执核对，只能生成一次合法应用和一条变更摘要 |
| W5-07 | 允许撤销成功且恢复精确合法排期；应用后又有正式复盘则保护后续调度并拒绝破坏性撤销 |
| W5-08 | 应用/撤销后无需重启，概览、列表、分析双维、知识点、下次复习立即一致 |
| W5-09 | 跨 W1–W4 最小 Electron UI→IPC→SQLite→新 PID 读回，问题 #16/#17/#21 的 Win10/11 真实用户链独立标记 |
| W5-10 | Windows 便携构建源 SHA/制品哈希/工作流 ID 可追踪；CI 未完成不声称 PASS、真实 Win10/11 未测 NOT_RUN |

**历史测试隔离**：旧 250 条冻结账本 `235 PASS / 0 FAIL / 3 BLOCKED / 12 NOT_RUN` 不自动晋升新合同；老 Windows `WIN-01～09、BACK-14` 与 `NEW-13、CLIP-03、CLIP-09` 仍须原证据链。专项优先用四 Worker 隔离并行；两个非 Windows 设施遗留 `EDITOR-12/SET-08` 保持原始 NOT_RUN，不无界重试。

**验收门槛**：真实业务事务安全；用户明确确认才执行；AI 不覆盖更新后的排期；Windows 交付制品可溯源。Windows 真机无证据不能宣称最终已验收。

## 证据与资源上限

- 根据实际触发方式核验 UI→IPC/可信提交回执→SQLite→页面切换数据同步→新 Electron PID 重新打开；仅适用场景执行。
- 最多四个彼此隔离的测试 Worker，使用临时 Schema606 数据库；失败原样保留，区分 PRODUCT_FAIL / TEST_INFRA / BLOCKED，设施问题最多一次有依据的补验。
- Linux Electron、Windows CI、Windows10、Windows11、真实125%DPI 各自独立标记；无真实测试证据就必须写 NOT_RUN。
- 结果统一填写 `RESULTS.md`；保留运行 CASE、源 SHA、证据索引，禁止将“脚本注册成功”当 PASS。
