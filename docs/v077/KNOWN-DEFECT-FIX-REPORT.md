> 2026-10-30后续更新：用户已批准FAULT-05请求级清理合同并完成生产修复。FAULT-05、CLIP-14、MEDIA-01、MEDIA-03正式Linux Electron 4/4 PASS，含真实SIGKILL恢复；当前FAULT-05为FIXED_PENDING_WINDOWS。见[专项修复报告](FAULT-05-FIX-REPORT.md)。下文和原证据保留为上一轮历史记录。

# v0.7.7 已知4项缺陷修复与定向回归（2026-10-30）

F1/F2/F3完成本轮授权范围并停止。实际修复3个BUG；4条CASE在正式Linux Electron通过，FAULT-05保持FAIL/清理合同待决。Windows未执行，不能宣称4项全修复或Windows验收通过。未执行其余P1/91/250全量，不等CI、不合并、不发布、不改版本号。

| BUG | 状态 | 本轮定向结果 | 远端生产修复SHA |
| --- | --- | --- | --- |
| GH-20 | FIXED_PENDING_WINDOWS | EDITOR-20/21 PASS | 5057ea4eba38cb79d73580fa92054cc4b053d525 |
| MEDIA-03 | FIXED_PENDING_WINDOWS | MEDIA-03 PASS | 5057ea4eba38cb79d73580fa92054cc4b053d525 |
| NEW-16 | FIXED_PENDING_WINDOWS | NEW-16 PASS | 4e2e0fe3e208c7134763332d9d872983538205bc |
| FAULT-05 | CONTRACT_REVIEW_REQUIRED | FAULT-05 FAIL，原断言保留 | 未修改清理逻辑；核查版本4e2e0fe3e208c7134763332d9d872983538205bc |

## F1：两个P1修复

GH-20：原Prompt弹窗209px，粘贴预览桌面680px，900窗口文本操作区不足160px。`src/cards/CardDraftForm.vue`共享dialog只设max-width，没有明确宽度，长文与按钮争用高度。最小修复为1080px响应式宽度、视口边距与高度上限、独立滚动正文及固定头部/底部操作区；文本框全宽并保留最小高度。复用既有绿色边框/背景/圆角/阴影风格，没有改变交换数据协议或业务按钮动作。

实际1500/1366窗口弹窗宽1080px，900窗口宽860px；正文文本框分别1015/1015/795px宽。Prompt预览clientHeight246px，结构化粘贴输入208px。原三宽度和55%视口宽断言原样保留；真实滚轮、长文复制到系统剪贴板、取消零写、粘贴确认、图片引用、正式正文保护及新PID读回均PASS。固定操作区避免长文挤出取消/确认/复制。

MEDIA-03：原30%/80%保存后80%/80%。**并非assetId共享宽度**：adapter、Markdown、draft媒体引用已按placementId隔离。原宽度number控件仅监听change；实测事件顺序为input=30，异步Markdown通知使Vue以旧placement.width=80刷新控件，focusout时已回到80，change未提交30。两次基线诊断和原始事件序列保留在证据JSON。

`src/editor/MarkdownEditor.vue`改为有效整数1–100的input事件立即按placementId更新，并同步刷新placement控件状态；保留现有Markdown序列化、资源身份和持久化合同。MEDIA-03新增DOM style.width严格断言，保存前和独立新PID重开后均30%/80%；两条placement不同、asset相同、draft.get/Markdown精确读回、原文件哈希和已发布正文不变。没有数据库或图片二进制修改。

## F2：中文反馈修复、暂存合同核查

NEW-16：`publishDraft`将publicationIssues内部键直接join到PUBLISH_INCOMPLETE消息。新增`shared/cards/publication-feedback.ts`，通过`electron/modules/cards-unified/publish.ts`映射标题、题干、选项数量/正文、正确答案、正面/背面、记忆正文及旧题整理提示，未知键使用中文通用反馈。未改publicationIssues、必填模型或拒绝发布规则。

正式Electron反馈“请选择正确答案”；缺答案拒绝发布，原内容只存一份未发布草稿，草稿箱重开和新PID恢复保持payload。增加选择正确项后发布的GUI回归，确认是同一cardId、字段完整且草稿移除。另有反馈规则及既有草稿/发布/媒体/回执回归27/27 PASS。

FAULT-05先核合同，未实现清理：

- `docs/v075/EDITOR-COMPONENT.md`明确“媒体服务暂存后不自动删除，避免破坏历史。”
- `docs/v075/MARKDOWN-EDITOR-ADR.md`明确“暂存资源不能因插入失败擅删，以免破坏其它历史引用”。现有媒体库合同仅在引用预览、哈希复核、事务/回执提交后退役文件，失败时保留字节供安全重试。
- `stageImage`每次产生新UUID，文件与`settings(media-draft:<id>)`配对；`media.stage`没有取消令牌、请求所有权租约或重启过期语义。renderer的异步异常路径只拒绝插入，没有申请退役资源。不能将“没有持久引用”推断为没有其他在途编辑引用。
- 本轮原FAULT-05真实执行仍FAIL：原生合成图片粘贴被hold，正文修改后释放，GUI显示MEDIA_INSERTION_DOCUMENT_CHANGED_RETRY，正文无图片、草稿mediaRefs为空；新PID240→311后，本请求PNG及settings暂存元数据仍在，文件SHA与元数据一致。SQLite assets表无额外记录；这是被追踪暂存资源，非无记录文件。
- 捕获SQLite中未见本资源的卡片草稿/正式版本/学习历史/旧作答/会话/知识正文引用，原知识图片哈希保持；正式内容和学习历史保护断言通过。残留属于本次新stage，已证实；自动回收时机与现行合同冲突，按用户指令标记CONTRACT_REVIEW_REQUIRED，保留FAIL而非改断言或粗暴删除。

后续若批准改变合同，应先定义请求级暂存所有权、持久/在途引用保护、事务回执后的物理退役、失败重试与崩溃恢复，再定向实现；本轮没有扩大到新媒体生命周期重构。GH-16/17/21原用户P0报告逐项原样保留，没有证据证明本轮同因，不宣称已修复。

## F3：执行、证据与保存

| 命令 | 实际结果 | 被测本地SHA | 同Git tree远端源码SHA |
| --- | --- | --- | --- |
| `npm run build`（F1） | PASS，410输出 | F1生产工作树 | 5057ea4eba38cb79d73580fa92054cc4b053d525 |
| `node tools/validation/v077/run.mjs run --ids EDITOR-20,EDITOR-21,MEDIA-03` | 3 PASS | 8b3966c381a03d5a7ff85e4d8d4a9d1fc6427cf1 | 5057ea4eba38cb79d73580fa92054cc4b053d525 |
| `npm run build`（F2） | PASS，411输出 | F2生产工作树 | 4e2e0fe3e208c7134763332d9d872983538205bc |
| `node tools/validation/v077/run.mjs run --ids NEW-16,FAULT-05` | 1 PASS / 1 FAIL，合同争议 | e81aee94a4634a01a9bfd653f2fde7f7647115f6 | 4e2e0fe3e208c7134763332d9d872983538205bc |
| `node --experimental-strip-types --test tests/v077-publication-feedback.test.ts tests/card-drafts-v075.test.ts` | 27 PASS / 0 FAIL | e81aee94a4634a01a9bfd653f2fde7f7647115f6 | 4e2e0fe3e208c7134763332d9d872983538205bc |

依赖与有效初始410输出哈希复用，无npm ci/锁修改；生产修改后F1/F2各进行一次必要构建，未重复编译通过版本。Node24.22.1、Electron44.9.1、Linux x64、Schema606隔离合成库；原失败诊断只用于定位，没有把脚本存在当作PASS。没有新的共因/回归失败；唯一剩余FAIL为原FAULT-05合同项。Linux无中文字体不能冒充Windows像素、物理剪贴板或Win10/11双机验收。

永久文本证据`evidence/KNOWN-DEFECT-FIX-RESULTS.json`包含原异常、事件捕获、三宽度几何、实际CASE回执、文件/SQLite读回摘要、重启PID、脚本/原始证据哈希及精确源码身份。PNG/完整诊断仅本地，不提交二进制、不冒称远端已保存原图。构建警告为既有大包提示，exit0；没有降低测试尺寸或预期。

结果晋升采用现有promote.mjs（先dry-run，逐CASE检查原始case.json/平台/步骤/证据/HEAD），仅更新上述5条。最终87 PASS /1 FAIL /3 BLOCKED /159 NOT_RUN；其他245条CASE对象、全部Windows层、其他缺陷条目和原用户报告保持原值。原5FAIL观察继续保存在原报告/缺陷inbox，本轮4条新PASS只替代这些CASE的当前Linux结果。

起始远端495b04d5f6a9cc96847251d2cbd0b0b11aefa5c8；每个保存前重查远端。Shell正常push返回缺少密码，改用仓库已有允许的GitHub连接器追加blob/tree/commit；每次基于实时远端tree/parent，仅改确认路径，expected_sha与force=false。F1/F2本地/远端提交tree分别严格相等：8f1a5ccdc8663b80abe82eba81a6780e7a548f71、cdaf797fbb50b4f485219753c6639ea5d7bb576f；不将不同SHA伪称同提交。最终文档检查点SHA由远端HEAD解析，不为写入自身SHA循环提交。

并发保护：截至F2最新核查无其他Work前移；初始远端中完整250处理器、并行M4脚本及既有测试结果全部继承。F3提交前再次核验远端、逐项比较生产/测试blob及其他245条CASE/全部Windows层；若远端前移，先合并内容，不用旧整文件覆盖。下一Work从本报告及RECOVERY-NEXT当前段恢复，按新授权处理Windows补验/FAULT-05合同或剩余P1；本Work停止。
