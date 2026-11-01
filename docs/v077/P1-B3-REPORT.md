# GankSoft v0.7.7 P1-B3 测试报告

范围：Schema606，PLAN 10 / REVIEW 9 / KNOW 12，仅本批31条原NOT_RUN；不执行B1/B2/B4/P0/P2。状态 IN_PROGRESS：所有31条均实际执行，8条仍无完整可信结论，不称全批通过。

| 指标 | 结果 |
| --- | ---: |
| 计划CASE | 31 |
| 实际执行唯一CASE | 31 |
| 总尝试次数 | 45 |
| PASS | 23 |
| PRODUCT_FAILURE | 0 |
| 最终TEST_INFRA | 8 |
| BLOCKED | 0 |
| 最终NOT_RUN | 8 |

TEST_INFRA与NOT_RUN为同8条，不重复计数。45=31首轮+12补验+2延后补验；第三次批次命令只实际启动KNOW-14和REVIEW-16，每CASE最多2次。其余返回的耗尽回执不是实际尝试。REVIEW-16第二批因同脚本设施熔断未启动；KNOW-14首轮因只有3节点被人工审核降为设施覆盖不足，83节点补验通过。

## 生产与环境

- 冻结生产SHA `c1b5f426f460cf205ff91231cfc4e29ecc37ff95`；指纹 `fa6aaa247a036934ec72886879ae93e1f6da8af64bbcefb83e74e5d6ead70096`。
- Node24.22.1/Linux/x64；依赖复用，无npm ci。统一构建一次，414个输出文件逐哈希验证；四Worker不编译。最后一次构建校验仍PASS。
- 四Worker、每CASE独立Electron、隔离Schema606/userData/证据目录。REVIEW-08达到180秒上限后自动降至2 Worker；不共享可写学习状态。残留失败夹具为合成数据，未触碰用户数据。
- 精确测试脚本SHA：首轮c1b5f426f460cf205ff91231cfc4e29ecc37ff95；补验24e9efcae5747dab86dabb466a6eba70c9c12f6a；最后两条20bf394170a39b9030f3da1c35547d9d7fd04f8f。脚本哈希、完整构建清单与数据库证据见SOURCE-IDENTITY和逐CASE文件；精确本地提交随源码bundle保留，不能把脚本SHA换成最终文档SHA。
- Linux原生confirm只注入平台返回，实际按钮点击和生产重算/撤销写入仍经GUI；不冒充Windows物理弹窗。没有Win10/11验收。

## 结果与设施原因

| CASE | 结论 | 说明 |
| --- | --- | --- |
| PLAN-02 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| PLAN-03 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| PLAN-04 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| PLAN-05 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| PLAN-06 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| PLAN-07 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| PLAN-08 | TEST_INFRA | 已验证三类型精确队列与返回；原CASE要求的下一张未执行，覆盖不足，不晋升。 |
| PLAN-10 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| PLAN-11 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| PLAN-12 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| REVIEW-06 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| REVIEW-07 | TEST_INFRA | 首轮被夹具未结束会话阻断；补验脚本误将函数传入标题数组。参数已修正但不第三次运行。 |
| REVIEW-08 | TEST_INFRA | 首轮夹具/直接记忆阶段假设错误；补验重启路径180秒超时，SIGKILL，无完整case.json。 |
| REVIEW-09 | TEST_INFRA | 补验业务断言完成，但TEST_CLEANUP_TIMEOUT，不能晋升PASS。 |
| REVIEW-12 | TEST_INFRA | 补验练习/正式事件与dueAt断言完成，但TEST_CLEANUP_TIMEOUT，不能晋升PASS。 |
| REVIEW-13 | TEST_INFRA | 补验未到期练习事件与dueAt断言完成，但TEST_CLEANUP_TIMEOUT，不能晋升PASS。 |
| REVIEW-14 | TEST_INFRA | 补验第二张卡时上一张勾选未清除，队列含两张且停在旧卡；已修选择清理，未第三次运行。 |
| REVIEW-15 | TEST_INFRA | 首轮被夹具会话阻断；补验脚本误将函数传入标题数组。参数已修正但不第三次运行。 |
| REVIEW-16 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-01 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-03 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-04 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-05 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-06 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-07 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-08 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-09 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-10 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-13 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-14 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |
| KNOW-15 | PASS | 完整GUI操作、可见反馈与数据断言通过；保存/重启按原场景执行。 |

## 缺陷与可信晋升

没有足够证据确认新增产品BUG；collect两阶段审核均0新增产品观察。未遇到可关联EDITOR-10/MD-02的字符错位证据，也未重跑B2或认定共同代码根因。所有设施错误不计产品FAIL。

23条PASS由现有collect/promote按精确本地脚本SHA分别dry-run、write；保留SHA及证据门禁，不改promote。PLAN-08的部分成功经覆盖复核撤回，不晋升；KNOW-14旧小夹具结果撤回，只晋升83节点完整补验。

运行前远端为c1b5f426…，最终保存时远端93d8ce8已含并行B4/B5测试成果，但无并发生产变化；本地全部生产输入与该SHA完全一致。只改测试驱动、报告、逐CASE证据、账本及RECOVERY-NEXT。账本按CASE更新23条，其余227条逐对象相等；全部Windows字段保持，B1/B2独立证据及FAULT-05修复保留。

B3晋升后、并行B4保存前的250条快照：**141 PASS / 2 FAIL / 3 BLOCKED / 104 NOT_RUN**。不代表历史PASS在当前HEAD重跑。

## 保存及下一轮

永久文件：`evidence/P1-B3-RESULTS.json`、`evidence/P1-B3-SOURCE-IDENTITY.json`、`evidence/P1-B3-CASES/*.json`；逐CASE证据含实际case、诊断数据库快照、GUI反馈轨迹及失败页面文本。原始PNG/console/工作树提交bundle另存独立ZIP；不得声称二进制截图已提交GitHub。

调度器自检 `node --test tests/v077-p1-parallel.test.mjs` 4/4 PASS，生产构建指纹校验PASS。没有重跑全量250/91、没有改生产或调度器、没有等待CI、没有合并或发布。

下一轮入口仅 **B4**：先核最新HEAD与environment status，再list/run B4 --workers 4。B3的8条设施遗留本轮均已2次尝试；不得自动第三次。07/15参数和14残留勾选修正已在最后脚本提交，但它们没有再次运行，不宣称修后PASS。后续专项须另行授权；本轮保存独立核验后停止。

原始证据ZIP SHA-256：`111fb5e6151e1c26358b1cdfab91b866e6e54bffc3a01ad08acef7a2b7055f78`，2,675,776 bytes；持久文件ID见SOURCE-IDENTITY。

## 最终并发合并回执

保存前远端前移至 `93d8ce8c3485f4411461f769301eb372c321b3ca`，只改M4测试设施/记录，无任何生产输入变化。保留其B4 27PASS/1FAIL、缺陷FAULT-13及B5环境说明；以该HEAD为父、原tree为底，仅将B3的23条CASE自动化字段合入最新账本。其余227条与最新远端逐对象一致，Windows字段不动；不覆盖对方M4驱动、DEFECT-INBOX及其他文档。

**最终250条权威总账：168 PASS / 3 FAIL / 3 BLOCKED / 76 NOT_RUN。** 原始ZIP在并发合并前冻结，不包含对方B4/B5，也不改写ZIP中的旧账本快照。当前GitHub JSON及本节是合并后的最新总账。

本Work按原交接指向B4，但另一Work已独立完成其B4/B5收尾；后续先读该最新报告，禁止自动重复运行B4。本Work没有进入B4/B5，也不扩大到设施修复或Windows验收。
