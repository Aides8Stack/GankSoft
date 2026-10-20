# ASAR 测试完整性门禁

## 核实与边界

PR #4 基线 `c1e57bff13009369686c60bf05bedabcee5064c7`，原 Run `39428215808` 四个 Job 成功。历史两次纽约 v070 日志只有4/5个 case，没有最终JSON。无法从现有日志确认物理退出原因，保留 NOT_VERIFIED。

已确认的代码缺陷：`package-check.mjs` 原先只判断 `spawnSync().status !== 0`，随后写固定 passed 标志。因此即使某个 smoke 返回0却提前退出，也可能被汇总为PASS。新增真实子进程回归复现此路径，不把先前 CI 绿色视为已有完整性门禁。

## 新判定流程

`tools/validation/smoke-contracts.mjs` 明确列出原有13组、107个预定用例ID、顺序和结果形态。它是提交审查的静态合同，不能从本次输出动态推导预期；增加用例需显式更新合同。用例数量相等但名称被替换、重复或乱序也拒绝。

每个 smoke 接入 `startSmoke(import.meta.url)`，原有断言及旧结果输出保留。只有成功路径末端调用 `finishSmoke(result)`，才校验并写入当前运行独立结果。未调用即退出0时，退出保护写 `SMOKE_INCOMPLETE` 并把进程状态改为非零。异常本来非零时保留原失败状态。

`checked-smoke.mjs` 在每次启动前生成新的随机 runId 和新目录，以环境变量传给子进程。父进程独立计算脚本、ASAR、合同哈希及版本。子进程用原子临时文件写入结果，随后同步输出带runId和文件哈希的 `GANKSOFT_SMOKE_COMPLETE`，避免依赖 console 缓冲刷新。

父进程必须同时核实：

1. 退出码0、没有 signal、spawn error 或 timeout。
2. 当前唯一目录中的结果文件存在、是有界普通文件、JSON/协议状态正确。
3. runId、脚本路径/哈希、ASAR哈希、合同哈希、版本、平台与父进程预期完全一致。
4. 用例列表/数量/顺序完全符合合同；逐项结果必须passed，原本要求的 errors 为空数组，目标类型正确。
5. stdout 中恰有一个匹配当前runId及结果文件哈希的完整结束标记，支持LF/CRLF。

任何一项失败即写当前 `verification.json=FAIL` 并抛错；不会返回PASS回执。每次 stdout/stderr、结果和核验回执保存在 `validation-results/asar-runs/run-*/`，失败时也保留。不同启动使用不同目录，旧JSON、旧日志以及旧runId不能放行新运行。原有全局结果JSON仍供既有消费者使用，但不作为新父进程的成功依据。

汇总入口也有未完成退出保护；启动时删除旧 `package-v073.json`。所有13组核验后才写新汇总，其中包含13个回执、107个已核验case及suiteRunId，最后同步输出 `GANKSOFT_ASAR_COMPLETE`。中途失败不能写“全部通过”。

## 实际验证

- 专项20/20：提前exit0/自然结束、无最终结果、错误/不足/重复/乱序用例、错误平台/目标/版本、错误数组、异常/非零/信号/超时、结果删除/损坏、标记缺失/重复、内容哈希错误、旧nonce/证据重放及正常完成。
- 全部流水线81/81，保留原61项；质量检查通过，含202项业务测试、协议/类型与构建。
- 完整ASAR13组、107个case通过；13份独立结果/标记及最终汇总哈希均核验。
- 纽约时区独立v070启动3次，每次15个case、当前JSON与匹配结束标记通过新门禁。
- 结果及16组运行证据副本见 `docs/ci/evidence/asar-integrity/validation.json`；历史不完整日志仍保留在此前 `asar-date-repeats.txt`。

本轮仅修改相关测试和验证工具、文档；业务、工作流、依赖、权限均未改。随机ID与哈希用于识别本次证据、防止意外重放或损坏，不能替代F02/F03/F04的可信工作流、exact-SHA人工审查及分支保护。物理提前退出原因未宣称解决，今后若复现将以失败回执阻断，而非绿色放行。Windows Runner结果等待新CI；Win10/Win11实机验收未执行。G2仍未完成。
