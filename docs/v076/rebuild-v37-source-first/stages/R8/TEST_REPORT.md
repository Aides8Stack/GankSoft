# R8 准备验证报告（2026-10-29）

基线 `f1e6e9806b1b072bded9eb8888672b460b1f960f`；Linux Node v24.22.1；被测工作树仅版本/根锁元数据改为0.7.6，无依赖或功能改动。最终提交由Git历史解析；新CI未查询、不等待。

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 基线CI身份 | PASS | commit_workflow_runs与run_jobs对应40826741821，四job success |
| 既有R7本地33组/18项 | PASS（继承） | ../R7/R7.5-FINAL-20261029.md及checks.json；本轮不重跑 |
| node --test tools/pipeline/version.test.mjs tools/pipeline/portable-only.test.mjs | PASS 5/5，退出0 | SemVer/锁版本/便携清单排除安装器及错误smoke/解压证据；合成测试不是实际包 |
| node tools/pipeline/version.mjs check | PASS 0.7.6，退出0 | package与两处lock版本一致；依赖树不变 |
| develop/main有效规则读取 | PASS（读取） | evidence/preparation-20261029.json；缺bypass字段不宣称无绕过 |
| 既有inspectProtection实际校验 | PASS（如实受限） | BUILD_ONLY_BYPASS_UNVERIFIED，unresolved=[25463281]；未当作完整发布放行 |
| 环境保护设置读取 | BLOCKED | API403；所有者独立核验rc-publish-owner必需审核人 |
| Windows构建/ZIP/EXE/解压 | NOT_RUN | PR不出合规交付包，须合并develop后走原流水线 |
| Win10/Win11真机与B02 | NOT_RUN | WINDOWS-CHECKLIST.md |
| 最终提交CI/最终安全放行 | NOT_RUN | 不查询/等待新CI；旧绿灯不归给新SHA |

锁SHA256 `5b1e2cd201ee5cfcbaf0976444ea112b1f01e66833e7201de34408da58a51a28`。构建身份由source.json记录完整develop源码SHA、lockSha256、runId/attempt/url；TEST_REPORT.json绑定ZIP哈希及真实Windows smoke/extraction；SHA256SUMS覆盖ZIP/来源/报告；实际归档verify校验CRC/内部全量manifest/原生模块。既有脚本静态核对完成，不表示执行成功。

旧Git标签查询未发现v0.7.6；构建后发布仍会拒绝覆盖既有tag。未安装依赖、未重复全量测试、未构建Linux伪Windows包、未修改流水线。本轮保存核验记录见最终答复和Git历史。
