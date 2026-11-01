# C1 非Windows P1专项补验

生产基线 af4cda73ed98645f4e2e171197a2b6b129e54776，F4生产冻结未改；Node24.22.1 / Electron44.9.1 / Schema606。复用已验证496输出，零安装/编译；4 Worker，各CASE独立临时库及进程。

| CASE | 结论 |
| --- | --- |
| EDITOR-11 | PASS |
| EDITOR-12 | TEST_INFRA |
| EDITOR-13 | PASS |
| CLIP-10 | PASS |
| PLAN-08 | PASS |
| REVIEW-15 | PASS |
| MEDIA-02 | PASS |
| FAULT-11 | PASS |

7 PASS / 0 PRODUCT_FAILURE / 1 TEST_INFRA。EDITOR-11/12/MEDIA-02仅在审核首轮设施原因并修正后各补验一次；其余未重跑。MEDIA-02首轮fixture角色错误归TEST_INFRA，不是环境BLOCKED。EDITOR-12列按钮正常click后DOM仍两列，等待真实DOM变化亦超时；无法排除失焦/悬浮handle意图问题，未证实产品故障，不晋升FAIL。无force click、无业务源码修改、未降断言，不再重试。

EDITOR-11颜色/公式/表格保存与新PID、EDITOR-13可读文本和标记范围、CLIP-10 JPEG/WebP原生格式与解码保存重启、PLAN-08下一张返回、REVIEW-15两卡结束及新会话、MEDIA-02共享引用GUI和重启、FAULT-11独立会话无串事件均完整通过。逐脚本SHA和正式执行SHA见evidence/C1-RESULTS.json。已执行collect及strict promote dry-run/write，仅晋升7项；总账218/0/3/29，Windows字段未改。
