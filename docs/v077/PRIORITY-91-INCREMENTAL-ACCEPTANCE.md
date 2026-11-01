# v0.7.7：91条优先功能精准增量验收（2026-10-30）

检查点A DONE；B DONE（13条全部取得真实业务结论，含2条FAIL）；C DONE。整体优先验收仍 IN_PROGRESS：5条Windows未执行、3条Windows阻塞、5条业务失败。只收集/归类，未修改生产代码。

| 状态 | 本轮开始 | 本轮变化 | 当前最终 |
| --- | ---: | ---: | ---: |
| PASS | 67 | +11 | 78 |
| FAIL | 3 | +2 | 5 |
| BLOCKED | 3 | 0 | 3 |
| NOT_RUN | 18 | -13 | 5 |
| 总计 | 91 | — | 91 |

本轮新增执行 **13个唯一CASE，11 PASS / 2 FAIL / 0 BLOCKED**。原67 PASS全部逐记录继承、零重复执行；原3 FAIL逐记录保留、零重复复现。13条普通NOT_RUN已完成13/13；Windows 8条实际完成0/8。不是重跑91/250条。

发生25次单CASE尝试：11次有效PASS、2次有效产品FAIL、12次测试设施失败（8类）。只有受影响且尚无有效业务结论的CASE重试；测试设施错误没有晋升产品FAIL。没有为新增脚本运行既有PASS模块。

唯一范围为 `PRIORITY-91-MANIFEST.json`（本轮初始快照，不覆盖），49 baseline + 全58 P0 + 额外6条，去重91/91，全部存在原250账本且全部有处理器。`priority91.mjs`只生成范围/当前分组，绝不启动业务测试；当前派生结果为 `PRIORITY-91-FINAL.json`。全250账本仅13条本轮对象发生变化：83 PASS / 5 FAIL / 3 BLOCKED / 159 NOT_RUN，未运行剩余159条。

| 本轮结果 | CASE |
| --- | --- |
| PASS，首轮 | ENV-02、HOME-01、HOME-02、EDITOR-03、EDITOR-06、PLAN-01、PLAN-09 |
| PASS，修测试设施后 | CAT-04、CAT-10、CAT-11、LIST-02 |
| PRODUCT_FAILURE | EDITOR-20、EDITOR-21；同归GH-20 |
| 原BLOCKED保持 | NEW-13、CLIP-03、CLIP-09 |
| 原NOT_RUN保持 | WIN-04、WIN-05、WIN-06、WIN-07、WIN-09 |

## 环境、执行和证据边界

- Node24.22.1、Linux x64、真实生产Electron GUI、独立Schema606临时库。复用381个适用且版本与锁一致的已安装依赖，没有npm ci。初始无v077构建缓存，可用旧输出对应不同生产源码，因此只做一次必要的 `npm run build`，成功并封存410个输出，后续全复用。未修改锁文件。
- `environment.mjs status`最终REUSE / build.valid=true；`phase.mjs audit`通过。待测21条的11个处理器语法/注册检查通过，共享支持模块导入通过。逐CASE断言审查见 `PRIORITY-91-ASSERTION-REVIEW.md`。
- CAT-10/CAT-11的系统confirm在无桌面的Linux中仅注入平台确认返回值，并断言实际GUI操作请求了确认；点击、生命周期写入、回收/恢复和读回走原生产逻辑。不能据此签核Windows原生弹窗；WIN-07保持NOT_RUN。
- 所有需要重启的成功路径已按原CASE验证不同PID读回。EDITOR-21的取消零写、确认写入、图片引用/正文保护和重启均完成，最终因尺寸FAIL；EDITOR-20三宽度滚动/复制/取消/原草稿零写均完成，最终因尺寸FAIL。
- 当前没有真实可见Windows桌面、Word/WPS、IME、截图工具或Win10/11同ZIP双机证据；不执行Windows命令，不新增无意义阻塞回执，不改变8条原状态，也不修改windowsCi/win10Real/win11Real。
- Linux截图缺中文字体，不能作为Windows字体/像素视觉签核；数值来自实际DOM几何，GH-20是在Linux被确认的已报告问题，Windows尺寸仍待验证。当前package.json版本0.7.6（界面沿用0.7.6-rc.1）是继承版本，本轮未改版本或发布。

已审核组依次经 `collect.mjs --dry-run`、`--write`、`promote.mjs --dry-run`、正式promote入唯一账本。前四组仅筛入已审业务结论的reviewed-summary，原summary/case均保留；其余设施失败单列，不手填PASS。

永久文本证据：`evidence/PRIORITY-91-INCREMENTAL-RESULTS.json`，包含13条最终记录、25次尝试分类、原始case/diagnostics哈希、数据表摘要、重启次数、各运行测试脚本哈希及几何差异。原始截图和全数据库诊断只在本地，不冒称远端已保存PNG；正常PASS只保存摘要。原3 FAIL直接复用T1-A/T1-B/T2-A原证据。

Shell普通push缺少凭证，改用GitHub连接器正常追加提交。连接器的作者/时间使保存SHA不同，因此 `evidence/PRIORITY-91-SOURCE-IDENTITY.json`逐一保留真实被测本地SHA与**完全相同Git tree**的远端提交映射；不改写测试来源SHA。最终保存以远端实际最新树为基础，并将该完整测试源码提交链作为合并父链，保留每个被测版本及其他Work的M4脚本。无强推、无CI等待、无develop合并/发布。

## 用户体验证据核对（继承证据，不重跑）

| 用户关切 | 对应可信证据 | 仍存缺口 |
| --- | --- | --- |
| 新卡自动草稿、草稿箱重开、重启不丢 | NEW-01/02/03/12；原ledger.lastAutomation保留GUI+重启步骤 | 部分旧原始文件指向local-only，本Work无法恢复旧截图；不冒称新证据 |
| 已发布卡关联草稿、正式正文/历史保护 | OLD-03、OLD-08/09；T2-A-RESULTS及原草稿账本 | 原证据平台为Linux |
| 显式保存/发布反馈 | NEW-14、NEW-17、OLD-14、FAULT-03；T1-A/T1-C/T2-A | NEW-16校验提示仍泄漏内部字段 |
| 普通/富文本/图片粘贴保存 | CLIP-01/02/04/14/15/16、MEDIA-01；原证据继承 | 合成Electron剪贴板不覆盖真实Word/WPS和Windows截图；CLIP-03/09与WIN仍待实机 |
| 两个内容交换弹窗阅读/滚动/按钮 | 本轮EDITOR-20/21有三宽度真实操作与几何 | GH-20确认FAIL，尚未修 |
| 复盘评分、排期和学习历史一致 | REVIEW-01/05及P0 REVIEW；T1-A/T2-A | 无Win10/11同ZIP双端结果 |
| 卡片集之间数据隔离 | 既有隔离夹具和跨卡错误插入保护CLIP-14/FAULT-05；本轮目录身份/恢复 | 本91集合没有完整双卡片集快速切换ENV-04的实测覆盖，明确留缺口，不扩展重测 |

## 缺陷去重与修复交接

本轮新发现全新根因BUG **0个**；新增确认 **1个既有用户报告GH-20**，影响2个CASE。连同原3个确认失败，共 **4个唯一待处理BUG，5条FAIL**。USER_REPORTED的GH-16/17/21不因局部LinuxPASS被擅自关闭。

| BUG唯一编号 | 优先级/模块 | CASE | 证据与最小复现 | 根因线索/建议回归 |
| --- | --- | --- | --- | --- |
| GH-20 | P1，内容交换弹窗 | EDITOR-20、EDITOR-21 | 本轮RESULTS对应ID：已发布直接记忆卡→复制Prompt→展开长模板；1500/1366/900下Prompt弹窗209px。粘贴预览长结构化文本/图片，桌面宽度680px，900下文本区不足160px | 两模式共享 `src/cards/CardDraftForm.vue` transferDialog；缺长文响应式布局。只修该弹窗尺寸/滚动/文本区/按钮可达，保留零写取消、确认与重启断言；定向回归这2条 |
| AUTO-MEDIA-03-a28b76820cf6 | P1，图片放置宽度 | MEDIA-03 | `evidence/T1-B-RESULTS.json#MEDIA-03`：同图两位置30%/80%→保存，变80%/80% | 独立placement宽度关联，adapter/序列化/媒体引用逐层查；不得以assetId共用宽度。定向MEDIA-03，受影响粘贴宽度CASE按实际修复范围补回归 |
| AUTO-NEW-16-e0ee13132997 | P2，发布校验反馈 | NEW-16 | `evidence/T1-A-RESULTS.json#NEW-16`：问题卡未选正确项→发布，提示correctOptionId；拒绝发布和草稿保留正确 | 最小修用户可见字段映射；不改必填规则。定向NEW-16 |
| T2A-FAULT-05-STAGED-IMAGE | P2，暂存资源生命周期 | FAULT-05 | `evidence/T2-A-RESULTS.json` final/FAULT-05：异步图片粘贴期间改正文→拒绝过期插入→重启，未引用暂存PNG/settings仍在 | 已确认残留现象，自动清理时机/暂存合同待核；不能扩大为丢数据/跨卡泄漏。仅清理本次未引用资源，保护历史引用；定向FAULT-05 |

下一轮Sol High先修P1 GH-20、MEDIA-03，再按额度处理P2；生产修复前读本表及指向的最小失败记录即可，不重读250条历史。已完成的PASS不因这次收集重复运行；生产修复后只回归实际受影响CASE。没有已证实P0数据丢失问题。

## 测试设施问题（已修，不计产品BUG）

| 编号 | 问题 | 影响与结果 |
| --- | --- | --- |
| INF-01 | 未展开目录管理便点击隐藏按钮 | CAT-04/10/11，定向修复后PASS |
| INF-02 | async Locator工厂返回Promise却调用count | LIST-02，修复后类型/两种排序均PASS |
| INF-03 | wheel事件后立即读scrollTop | EDITOR-20；改为有界条件等待，滚动通过 |
| INF-04 | 图片原生v2归档误作v1文本解析夹具 | EDITOR-21；改用现有公开v1纯序列化生成合法长文fixture，GUI输入/解析/确认/图片重启检查完整；最终仅几何FAIL |
| INF-05 | 无桌面Linux调用原生confirm，异步accept异常导致无case回执 | CAT-10/11；明确平台确认适配，不冒充Windows；最终PASS |
| INF-06 | details展开状态保留，且open空串被当作false | EDITOR-20；判断属性是否null，三宽度均执行完成 |
| INF-07 | 错误要求生命周期CAS revision不变 | CAT-10；按既有retainDraft合同断言revision精确+1，完整正文/引用/身份/历史仍严格比对，最终PASS |
| INF-08 | 900宽Prompt模板字符略少于既定10000阈值 | EDITOR-20；增补夹具长度，保留阈值，最终仅几何FAIL |

三个检查点完成后保存结束；最终完整SHA通过分支远端读回解析，不为文档包含自身SHA制造循环提交。
