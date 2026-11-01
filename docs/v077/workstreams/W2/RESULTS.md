# W2 — 执行结果与交接

**W2.1 DONE / W2.2 DONE / W2.3 DONE（Linux Electron 定向验收）。**

W2-01～W2-08：**8 PASS / 0 FAIL / 0 BLOCKED / 0 NOT_RUN（Linux、明确标注的事件驱动）**。另：控制器6、SQLite领域2、W1直接交界2 PASS；没有重跑W1全套/B1–B5/旧250。本Work只完成三个检查点，不启动W3–W5、不等待CI、不合并develop、不发布。

Windows CI / Windows10 / Windows11 / 真实125%DPI：**分别 NOT_RUN**。无桌面Linux的真实软件切换/原生最小化事件传递及中文字体视觉签核：NOT_RUN，不以事件注入冒充人工系统操作。

## 身份与远端保存

| 项目 | 完整身份 |
|---|---|
| 起点 GitHub HEAD | `b22a93301aab88fca0869d6ce8df3cd08c52bb54` |
| W2.1远端检查点 | `c920845df8645a8d05c2b90d9d52461f6d855b97` |
| W2.2远端检查点 | `3842ffc09bee1b9b0b50799bf32ba086d6959339` |
| 最终GUI被测生产源码、测试脚本提交 | `8db67b67e38bac7e5423536c69736be0b8daec19` |
| 上述完整tree | `7eb67792d281838dcbb53bc317a1e41d3a9bc6bc` |
| 最终证据/文档保存SHA | 由本路径Git历史、feature/v077远端ref及Issues #32/#33最终回执解析，不虚构自身SHA |

GUI在实际fetch并检出上述远端冻结SHA后执行；后续仅报告/证据，无生产或脚本变化。逐文件Git blob和SHA-256见 [SOURCE-IDENTITY.json](./evidence/SOURCE-IDENTITY.json)，全部生产输入字节哈希亦在 [gui-final.json](./evidence/gui-final.json)。

| 测试输入 | Git blob |
|---|---|
| `tools/validation/v077/w2-review-history.mjs` | `5716269297703066f950fc0d164fcf2a7fbc2a07` |
| `tests/w2-review-v077.test.ts` | `a467f62ce6e48851297f44785efa3b519b00a24c` |
| `tests/v077-review-pause-controller.test.ts` | `7e65705c5be2fd6333e85baca4f0a30e8ecf79eb` |
| `tools/validation/v077/w1-host.cjs` | `e68e9abc3305707b9eaf25c50e12af83285296e4` |

普通push只尝试一次，因当前没有Git写凭据失败。连接器逐个文件创建并核对blob，以已核验父提交/base tree追加，更新ref带expected_sha且force=false；每次完整tree与本地完全相等。末次保存后再次独立读取ref、fetch和比较全部新增/修改文件及blob。不强推、不覆盖他人提交。

## 正式实现

- 复用现有pause controller、learning.session.change、study_sessions的elapsedMs/totalMs/resumedAt。暂停立即局部inert和遮罩，只能主动继续；blur、hidden、离开复盘/切会话均暂停，顶部及左侧导航可操作，离开后遮罩不留在其他页面。
- 自动保存、暂停和正式提交仍走W1原串行请求及requestId回执。pause可选pausedAt传递实际前台截止点，延迟自动保存回包不增加后台时间；失败保留原截止点，多次继续累计本卡毫秒。owner重开停止旧活动锚点，保留最后持久计时和草稿，不计算停机时间。异常强杀只能保留最后持久检查点，正常离开先持久暂停。
- 最后一题正式提交、FSRS三表、completed归档、revision和durable receipt仍属于**同一个既有事务**。最后回执失败整体回滚；未知回执在确认前不跳结算，重试复用原requestId/eventId。完成立即释放队列占用，保留study_sessions；旧session删除入口也不能删除统一会话。
- 唯一新增方法是只读 `learning.session.settlement`，仍使用原gank:protocol。workspace.sessions扩展聚合、筛选和真实总数；历史摘要不加载正文。结算按原ids顺序，标题取事件contentVersionId，调度取相同eventId的schedule_events.after_state；不使用后来scheduling到期日。
- ReviewHistory是所有卡片下子页面，完整图标/标签/数量按钮；无新增全局Tab/历史KPI。ReviewSettlement是完成与未完成共用组件，顶部唯一返回，已结束无底部操作，未完成可继续；自评/评级同格同行，没有虚构系统0–10分数。详情只读。
- 两页面沿用W1 dataSync/epoch/revision、请求序号、筛选身份和分页修订校验；末张归档后相关页面读最新数据，旧历史查询不能覆盖新筛选。卡片列表返回立即看到最新次数。

没有新数据库表/第二套计时库/调度引擎/历史引擎/IPC通道/全局持久Store；Schema606和既有FSRS保持原机制。

## 实际修改的生产文件（14个）

| 文件 |
|---|
| `electron/modules/cards-unified/review-session.ts` |
| `electron/modules/storage-unified/restore-session.ts` |
| `electron/modules/workspace-unified/queries.ts` |
| `electron/protocol/gateway.ts` |
| `shared/protocol/registry.ts` |
| `shared/protocol/review-details.ts` |
| `shared/protocol/unified-review.ts` |
| `shared/protocol/workspace-unified.ts` |
| `src/review/ReviewHistory.vue` |
| `src/review/ReviewSettlement.vue` |
| `src/review/UnifiedReviewForm.vue` |
| `src/review/review-pause-controller.ts` |
| `src/services.ts` |
| `src/unified/UnifiedWorkspace.vue` |

## W2-01～W2-08 最终验收

命令：`W2_EVIDENCE_DIR=validation-results/v077/w2-final node --experimental-strip-types tools/validation/v077/w2-review-history.mjs`。
环境：Linux x64 / Node v24.22.1 / Electron44.9.1 / Schema606隔离临时库。

| CASE | 结果 | 实际断言 |
|---|---|---|
| W2-01 | PASS | 局部遮罩/inert、暂停禁评分保存、ESC/遮罩/重新focus不解锁，实点左侧/顶部导航离开，无遮罩残留，返回仍暂停 |
| W2-02 | PASS | 多次活动/暂停分段累计；注入hidden/visibilitychange验证前台逻辑；500ms自动保存回包确定性挂起后blur，计时即时冻结，释放后SQLite不含等待时间 |
| W2-03 | PASS | 1卡正式保存立即completed归档和只读结算，1事件/1调度，无完成按钮/底部操作，返回列表立即1次 |
| W2-04 | PASS | 6卡三类型，原序/评分/评级/客观/耗时/当次due与DB逐行一致；Again2 Hard1 Good2 Easy1，客观1/2，详情只读 |
| W2-05 | PASS | 未完成进度恢复；同一卡后来再次评分后，旧结算due仍为旧事件快照；重复打开不改变任何学习事件/排期 |
| W2-06 | PASS | 完整历史按钮中的数量徽标可真实点击；所有卡片→历史→结算→顶部返回；筛选保持；延迟旧历史回包释放后不能覆盖新筛选 |
| W2-07 | PASS | SQLite最终回执失败三表与归档整体回滚、评分保留；未知回执未假跳转，原请求核对后仅1事件；自动保存途中实点/连点提交不重复 |
| W2-08 | PASS | 900/1366/1600真实GUI点击和布局/局部遮罩边界、无页面横向溢出、评级同行、顶部唯一返回；CDP 1.25页面scale另行验证，不等同真实125%DPI |

正式链：GUI→preload/services→gank:protocol→SQLite→切换页面/重新查询→**独立PID 29→102**。重启后未完成计时/83分草稿、完成结算和全部FSRS/历史一致；integrity_check=ok、foreign_key_check=0、user_version=606；renderer error=0。

原始证据：[最终GUI结果](./evidence/gui-final.json)、[逐文件身份](./evidence/SOURCE-IDENTITY.json)、[日志](./evidence/validation-logs.txt)、[六张无损截图清单](./evidence/SCREENSHOTS.json)。截图webp解码像素与原PNG逐像素一致，未缩放/删减；Linux缺CJK字库导致截图中文呈方框，中文标签由真实DOM定位核验，不能据此宣称字体视觉通过。

## 必要定向检查

- `node --experimental-strip-types --test tests/v077-review-pause-controller.test.ts tests/w2-review-v077.test.ts`：**8 PASS（6控制器+2真实SQLite领域）**。
- `node --experimental-strip-types --test --test-name-pattern='W1-04/06|W1-06 unknown' tests/w1-review-sync-v077.test.ts`：**仅2条交界 PASS**；没有执行W1-01～08全套。
- Vue/后端类型、协议边界及类型PASS；Vite必要增量构建PASS。类型/构建在同字节工作树执行后冻结；最终GUI在检出的远端冻结提交执行，未重装依赖。
- 协议导出PASS：164方法（新增1只读）。API-INDEX已同步；中央大JSON不作整文件大传输，提供相对当前受控快照的 [可重建导出补丁](./evidence/protocol-export.patch)，其中亦包含W1尚未落入静态快照的导出差异；运行 `npm run protocol:export` 可重建，运行时以Zod/registry为准。

## 真实失败、限制与后续入口

1. [首次GUI失败原文](./evidence/gui-infra-attempt.json)：W2-01已PASS，headless native hide没有DOM可见性事件，W2-02设施超时，后续未执行。保留 [native探针](./evidence/native-visibility-probe.json)：hide/minimize原生状态变化，但document.hidden=false且无blur/visibilitychange。一次有依据补验改为明确标注的事件注入，未降低业务断言。自动化blur/hidden/focus不代表物理切换软件验收。
2. [暂停失败截止点原始FAIL](./evidence/pause-cutoff-failure.txt)：发现失败后继续会把等待计时；保留失败，正式控制器已修复，新增回归PASS。首次冻结8项也通过，但最终只以最新8db67b6冻结结果为准，修复后已重新验收受影响链与完整W2八项。
3. 老会话未存startedAt时仅能从最早本轮事件或最后持久时间回退；新会话准确记录开始时间。这类回退时间不等于可恢复的精确开始时刻，旧学习事件不变。
4. **没有未解决的W2事务/数据完整性阻断**。真实WindowsCI/Win10/Win11/125%DPI、物理失焦最小化和字体视觉继续NOT_RUN；本轮未创建Windows包，未等CI。

后续须新Work按最新GitHub HEAD及 [W3入口](../W3/README.md) 恢复。W3仍NOT_STARTED；本Work保存最终回执后立即结束，不重新开发W1或B1–B5。
