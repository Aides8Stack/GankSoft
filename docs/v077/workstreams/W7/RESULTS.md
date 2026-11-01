# W7 实施与测试结果

**W7.1：DONE；W7.2 / W7.3：NOT_STARTED。** 当前Work仅完成后端核心，不合并、不发布。

分支 `feature/w7-review-lifecycle`；Issue #39；起始HEAD `5c047d201f6df95e398a52613b00aa5352629788`；任务基线 `d1aeb186c96a5d733ac7dec0c461b494aeac5558`。TASK已只初始化一次，继承W6的5份执行记录按原字节归档。

## 最终来源与保存

- 实际被测本地源码/测试：`946d0efda3df400bf9362205e024e8d0c48aff88`。
- GitHub同完整tree源码：`d93d3c5b472cbe8ac3cc743dcf7ee89cd281d71e`。
- 完整tree：`280bb215cb590c4e064d52fbe12eddda3ce29534`。
- 已通过连接器读HEAD及独立git fetch核对完整tree和51个变更blob；逐文件SHA-256/Git SHA见 [SOURCE-IDENTITY.json](evidence/SOURCE-IDENTITY.json)。最终报告提交仅更改文档/证据，生产与测试字节保持上述来源；最终HEAD按本文件Git历史读取，不在提交正文中虚构自身SHA。

## 最终验证

| 验证 | 最终结果 |
|---|---|
| W7.1-01～18 | **18 PASS / 0 FAIL / 0 BLOCKED / 0 NOT_RUN** |
| W7专项可执行分组（含额外边界） | **21 PASS** |
| `npm run check` | **PASS，exit 0** |
| 全量Node测试 | **757 PASS / 0 FAIL / 0 SKIP** |
| 协议测试 | **21 PASS** |
| 边界、协议类型、导出 | **PASS；177方法** |
| Vue/后端类型与 `npm run build` | **PASS（check内实际执行；先前独立build也通过）** |
| W1/W2领域回归 | **9 + 2 PASS，纳入上述757，不重复累加** |
| 9项继承失败修复专项 | **23 PASS，最终全量再次PASS** |
| 内容有效due/旧摘要/混合历史回收交界 | **3个原始FAIL均已修复；关联50 PASS，最终全量再次PASS** |
| Windows CI / Win10 / Win11 / 正式Electron整体验收 | **NOT_RUN，本阶段不冒充W7.3验收** |

环境Linux、Node v24.22.1；所有业务测试使用实际临时文件Schema606/生产领域及协议，没有mock SQLite。全文日志 [check-complete.log.gz](evidence/check-complete.log.gz)；原失败及修复过程 [attempts.log.gz](evidence/attempts.log.gz)；机器汇总 [SUMMARY.json](evidence/SUMMARY.json)。仅工作区绝对前缀被替换；原始最终日志SHA-256已记录。构建仅保留现有体积提示，无构建错误。

## 18项合同覆盖

| CASE | 真实断言与证据 | 结果 |
|---|---|---|
| W7.1-01 | 自主提交立刻有SQLite事件；scheduling整行不变 | PASS |
| W7.1-02 | 同卡五次独立eventId/记录；既有FSRS全字节不变 | PASS |
| W7.1-03 | 正式事件、schedule_event、scheduling及会话结果同事务；reps/difficulty/stability/due真实读回 | PASS |
| W7.1-04 | 两种模式五卡提交两卡后重启；两事件保留、剩余三卡可恢复 | PASS |
| W7.1-05 | 第三卡回执写入故障；本卡全部回滚，前两卡保留且草稿可重试 | PASS |
| W7.1-06 | 多个自主队列同卡创建成功 | PASS |
| W7.1-07 | 不再占用；队列候选无session_reserved排除 | PASS |
| W7.1-08 | 同deck重复启动返回同一sessionId | PASS |
| W7.1-09 | 不同deck正式队列相互独立 | PASS |
| W7.1-10 | 正式/自主队列并存，互不阻挡 | PASS |
| W7.1-11 | 同requestId创建回执重试和重启重试不新增 | PASS |
| W7.1-12 | 新requestId主动练习生成新sessionId | PASS |
| W7.1-13 | due/relearn汇合按cardId去重；队内重复输入拒绝，新到期不插入旧队列 | PASS |
| W7.1-14 | 自主未完成卡仍进入正式队列 | PASS |
| W7.1-15 | 标题/题干/答案/选项/解析/Markdown/媒体/类型/重发布/关联逐次比较真实SQLite整行；新旧AI提前due发布和重启保持 | PASS |
| W7.1-16 | 创建时冻结所有卡版本；两种模式修改后提交旧versionId；正式schedule log亦绑定旧版本 | PASS |
| W7.1-17 | 来源不明native旧会话按practice；保留ID/草稿/进度/旧事件/调度；606旧命令false不能误调度 | PASS |
| W7.1-18 | 两个独立SQLite连接/线程同步起跑，只存一个活动正式队列；导入重复队列也原子拒绝 | PASS |

额外保护：真正正式排期CAS冲突仍拒绝且零部分写入；practice可在正式调度改变后正常保存；历史混合页回收保留幸存卡事件/调度和原冻结entry。

## 错误修复与范围

原占用/强制调度最小复现2 FAIL；首轮全量中旧合同断言与兼容夹具失败全部修复；后续9项继承失败也按用户追加要求修复，未以“原来就失败”留置。处理为隔离未注册handler测试、注册前后真实账本逐字节不变、历史计划与当前进度分开校验，以及补齐Win09合成客户端身份并增加Server拒绝。最后补验发现的有效due版本耦合和回收重锚问题也已修复。原始失败没有覆盖或改成PASS。

生产必要范围及原因见 [IMPLEMENTATION.md](IMPLEMENTATION.md)：复用原FSRS、SQLite事务/回执、queue及既有版本表；无新表/Schema/引擎/卡片锁。未修改任何src/Vue、W4/W5生产页面或执行服务、package/锁文件、CI、250权威账本、W1–W6历史验收。只更新当前自动化以验证新的W7合同。

本阶段无未修复错误。W7.2固定入口/UI/AI数据链、W7.3整体验收均未开始；本轮保存并独立核验后停止。
