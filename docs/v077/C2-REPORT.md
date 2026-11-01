# C2 当前源码P2验收

F4后生产冻结af4cda73ed98645f4e2e171197a2b6b129e54776，496输出同指纹复用；4 Worker，18条均重新实跑，不复制R3旧PASS。Node24.22.1/Electron44.9.1/Linux/Schema606，独立合成库。

| CASE | 结论 |
| --- | --- |
| HOME-03 | PASS |
| HOME-04 | PASS |
| HOME-05 | PASS |
| HOME-06 | PASS |
| HOME-07 | PASS |
| HOME-08 | PASS |
| AN-02 | PASS |
| AN-03 | PASS |
| AN-04 | PASS |
| AN-05 | PASS |
| AN-08 | PASS |
| SET-05 | PASS |
| SET-06 | PASS |
| SET-07 | PASS |
| SET-08 | TEST_INFRA |
| SET-09 | PASS |
| SET-10 | PASS |
| SET-11 | PASS |

17 PASS / 0 PRODUCT_FAILURE / 1 TEST_INFRA。首页6/6、分析5/5、设置6/7完成真实GUI链；SET-07从页面反馈和renderer读取实际Prompt剪贴板，PASS。SET-08首次已证实drop后operation.status自动恢复成功；drop-unknown仅隐藏传输层回执，后端真实已有receipt且完成，不应出现在待核对列表，该设施假设错误。唯一补验改成现存目录作为目标，触发真实备份写入失败，生产生成pending且operation.status无回执；到记录核对结果确认时dialog.accept抛Target page/context/browser closed，未产生可信完整case报告。此项保持TEST_INFRA/NOT_RUN，不认定业务FAIL、不记PASS，不再重试。脚本已对齐现有headless window.confirm适配方式，仅语法检查，未冒称复验通过。

collect dry-run/write及strict promote dry-run/write将17完整结果入账；补验只含NOT_RUN，无可晋升项，未运行promote制造结果。总账235/0/3/12。逐CASE执行SHA、脚本SHA见evidence/C2-RESULTS.json，所有Windows字段及F4结果保留。
