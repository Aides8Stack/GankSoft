# v4验收账本

本地模型通过与GitHub/Windows真实验收分列，不将mock标为真实上线PASS。被测源哈希见evidence/local-validation.json。

| ID | 本地证据 | GitHub/实机状态 |
|---|---|---|
| P0-01 | PASS：真实仓库/HEAD/本地tree/PR#2/#3核验 | PASS（只读审计） |
| P0-02 | PASS：独立infra分支远程创建 | PASS（只读审计） |
| P0-03 | PASS：六YAML事件归属静态/自动测试 | PASS（只读审计） |
| P0-04 | 未执行本地等价场景；不得推断 | BLOCKED（人工设置） |
| P0-05 | PASS：Node24和真实npm脚本 | PASS（只读审计） |
| V-01 | PASS：版本不变拒绝测试 | NOT_RUN |
| V-02 | PASS：双lock版本一致测试 | NOT_RUN |
| V-03 | PASS：实际bump0.7.4-rc.1 | NOT_RUN |
| V-04 | PASS：同版本Tag其他SHA拒绝mock | NOT_RUN |
| V-05 | PASS：并行PR刷新版本模型 | NOT_RUN |
| V-06 | PASS：文档豁免模型 | NOT_RUN |
| V-07 | PASS：非法/回退/墓碑模型 | NOT_RUN |
| V-08 | 未执行本地等价场景；不得推断 | NOT_RUN |
| V-09 | PASS：version:bump实际执行 | PASS（只读审计） |
| CI-01 | 未执行本地等价场景；不得推断 | NOT_RUN |
| CI-02 | 未执行本地等价场景；不得推断 | NOT_RUN |
| CI-03 | 未执行本地等价场景；不得推断 | NOT_RUN |
| CI-04 | 未执行本地等价场景；不得推断 | NOT_RUN |
| CI-05 | PASS：汇总FAIL模型 | NOT_RUN |
| CI-06 | PASS：cancelled/skipped/缺失模型 | NOT_RUN |
| CI-07 | 未执行本地等价场景；不得推断 | NOT_RUN |
| CI-08 | 未执行本地等价场景；不得推断 | NOT_RUN |
| CI-09 | 未执行本地等价场景；不得推断 | NOT_RUN |
| CI-10 | 未执行本地等价场景；不得推断 | NOT_RUN |
| CI-11 | PASS：未知/空diff保守分类 | NOT_RUN |
| CI-12 | 未执行本地等价场景；不得推断 | NOT_RUN |
| CI-13 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-01 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-02 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-03 | PASS：本地失败子进程后续NOT_RUN | NOT_RUN |
| RC-04 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-05 | PASS：原依赖审计FAIL→修复0漏洞，密钥模型 | NOT_RUN |
| RC-06 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-07 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-08 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-09 | PASS：真实临时文件字节篡改拒绝模型 | NOT_RUN |
| RC-10 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-11 | PASS：上传失败保留Draft mock | NOT_RUN |
| RC-12 | PASS：同SHA发布幂等/草稿补传mock | NOT_RUN |
| RC-13 | PASS：其他SHA Tag冲突mock | NOT_RUN |
| RC-14 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-15 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-16 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-17 | PASS：A/B/C第一父链意图模型 | NOT_RUN |
| RC-18 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-19 | 未执行本地等价场景；不得推断 | NOT_RUN |
| RC-20 | PASS：缺失/错误Win10/11证据拒绝模型 | NOT_RUN |
| RC-21 | 未执行本地等价场景；不得推断 | NOT_RUN |
| WK-01 | PASS：Work退出状态机模型；最终远程保存后退出 | NOT_RUN |
| WK-02 | 未执行本地等价场景；不得推断 | NOT_RUN |
| WK-03 | 未执行本地等价场景；不得推断 | NOT_RUN |
| WK-04 | 未执行本地等价场景；不得推断 | NOT_RUN |
| WK-05 | PASS：本地真实失败修复并重跑 | NOT_RUN |
| WK-06 | PASS：人工未执行维持NOT_RUN | NOT_RUN |
| WK-07 | 未执行本地等价场景；不得推断 | NOT_RUN |
| SEC-01 | 未执行本地等价场景；不得推断 | NOT_RUN |
| SEC-02 | 未执行本地等价场景；不得推断 | NOT_RUN |
| SEC-03 | 未执行本地等价场景；不得推断 | NOT_RUN |
| SEC-04 | 未执行本地等价场景；不得推断 | NOT_RUN |
| SEC-05 | 未执行本地等价场景；不得推断 | BLOCKED（人工设置） |
| SEC-06 | 未执行本地等价场景；不得推断 | NOT_RUN |
| SEC-07 | 未执行本地等价场景；不得推断 | NOT_RUN |
| SEC-08 | 未执行本地等价场景；不得推断 | NOT_RUN |

P6真实端到端BLOCKED：未经用户批准不合并。以上不是最终上线放行；需后续真实run/job/制品哈希补充。

## G0–G1 2026-10-20 补充（不覆盖历史模型状态）
| 项目 | 本地证据 | GitHub/实机状态 |
|---|---|---|
| G0 最新HEAD/PR/保护/原失败日志 | PASS：基线db5a5ea、PR#2/#3/#4实时核验，原Windows FAIL | PASS（只读核验）；保护仍false |
| G1 LF/CRLF根因复现 | PASS：旧版LF成功CRLF失败，新版均成功 | 最新修复CI_PENDING/待核实 |
| G1 结构化最小权限/恶意输入 | PASS：原有断言保留，专项11/11、pipeline31/31 | NOT_RUN（最新HEAD双平台结果未等候） |
| G1 既有完整质量/安全 | PASS：199业务含21协议、5基础设施、中文ZIP、类型/构建；0漏洞 | NOT_RUN（不沿用历史Ubuntu成功） |
| G2–G7/Windows真机/发布 | NOT_RUN（不在本轮范围） | NOT_RUN |
精确工作树及日志摘要：evidence/g1-validation.json。远程检查点/触发回执见 development/HANDOFF.md 最新节。

G1远程回执 PASS：1d57a13797029fdefb226579e28eaede757a0cb5 / tree9f0e27703a2020d5bac161e8a8adbfd4f7de3a31；394文件哈希及父链一致。Actions已触发Run39387138356，首次queued、conclusion=null，CI_PENDING；本轮未轮询。最终文档提交身份由HEAD解析，不能视作前序Run已测试。
