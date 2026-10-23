# 环境中断恢复记录（2026-10-23，优先于下方旧状态）

**当前执行环境 unavailable，无法再读取工作区或运行测试。** 远端已核验业务检查点：`d9e312a63c9d81714f1a7a053c9921d98c5745c8`，tree `39101b042fead718fc6094cc83d46cdf746d6b28`，原分支/Draft PR13。S3.a代码及交接已远程保存，Node290/协议21/专项17/草稿Electron7/原编辑器18记录本地PASS。质量Run39882141281首次快照in_progress；pr-trust Run39882138000首次pending，未等待或审批。

之后已开始S3.b，但以下改动**仅本地未提交、未远程保存，环境中断后无法确认仍可恢复**：原子publish/默认保留周期/显式重学、legacy所有权保护、复制粘贴预览与Prompt纯函数、Prompt路径查询与旧AI调用拒绝、新编辑页发布/内容交换接线。不能把它们当作此远端SHA已有功能。

已实际读到的本地测试：最初publish专项15/15（含原草稿12+新增发布3），内容交换/Prompt纯函数7/7 PASS。随后新增Prompt路径/AI拒绝测试以及发布/内容交换UI，最后的专项与vue-tsc命令已启动，**结果未读到，NOT_VERIFIED**；不能沿用前一源码测试宣称最终S3.b通过。S3.b整体IN_PROGRESS，S4–S9 NOT_STARTED。真实Win10/11 IME/人工/便携ASAR仍NOT_RUN。

恢复：按原包91，先检查 `/workspace/scratch/edd748788110/GankSoft` 的git diff及本地未提交S3.b，保护现存修改。若仍在，先读PLAN和原S3 prompt，核对变更后运行专项、npm test、check:protocol、build、build:editor-spike及草稿Electron smoke；先修实际失败，再提交推送原PR。若工作区已丢失，从上述远端S3.a检查点恢复，**只重做未保存的S3.b，不重做S0–S3.a**。

S3.b尚需完善/验证：发布UI及响应丢失处理；粘贴/Prompt实际剪贴板闭环；跨卡片集/跨数据库图片复制尚未完成（当前纯函数只携带本地引用并警告，后端必须继续拒绝不属于目标范围的资源）；新原生卡片知识关联仍需要S5数据服务，不能伪造legacy承载行。不得因局部publish测试PASS跳过完整T13–T15进入S4。按原包继续连续实施；不自动审核pr-trust、不合并、不发布。

---

# 当前恢复入口：S3.a本地完成 → S3.b（2026-10-23）

原包 /04-work-prompts/00-WORK-MAIN-PASTE.md + 原S3阶段指令为主，连续执行授权覆盖旧退出规则。实现起点18d0f7fab53e4ef6c8011bc129067016b3496d9b；本检查点自身SHA由git log/PR最新HEAD解析，不为回填自身SHA循环提交。原PR13仍Draft。

**不要重做S0–S2。** S3.a本地T09–T12闭环已完成，新Windows结果待CI；新草稿页仅合成606验证，正常App继续604。人工IME/生产启用门禁仍有效。

实现入口：shared/protocol/card-draft.ts（未完整草稿与显式存储封套），shared/cards/mapping.ts（六向）；electron/modules/cards-unified/draft-service.ts（范围/版本/预览/媒体/事务）；registry/gateway/src/services统一接口；src/cards/{draft-controller.ts,CardDraftForm.vue}；tools/card-draft-spike/{main.cjs,smoke.ts}。完整性校验与备份发现草稿独有引用，拒绝跨卡/跨集资产与宽度不一致；未删除任何文件资产或历史。

恢复步骤：核最新HEAD和未提交修改；只读取当前新CI实际结果，若尚运行如实记PENDING，不等待。专项`node --experimental-strip-types --test tests/card-drafts-v075.test.ts tests/card-draft-controller-v075.test.ts`；必要UI`npm run build && npm run build:editor-spike && node --experimental-strip-types tools/card-draft-spike/smoke.ts`。新Windows草稿专项已最小加入既有quality步骤，原S2/发布门禁保留。

下一项按原包S3.b：先审S1 legacy projection/owner完整性规则与新发布所有权，事务冻结版本/正式模式/关联、默认resetStudyCycle=false（选中才新cycle）、旧事件和调度保护；复制/粘贴内容预览确认、外部Prompt两范围默认关且互相独立。当前这些NOT_STARTED，不能称S3整体完成。不要静默重写旧表或改已有不可变快照。阶段通过继续S4，不逐次询问授权。

证据：TEST_REPORT与docs/v075/S3-DRAFT-VALIDATION.json。最新CI在提交内为PENDING_NOT_OBSERVED，推送后仅取一次即时快照。不能自动审批、合并、发布或新建分支。额度中断按原包91恢复。

---

历史记录（当前状态以上节为准）：

# 最新交接：S2 开发准入获批，转入 S3.a（2026-10-23）

**当前入口**：原分支 `feature/v075-unified-learning-workspace` / 原 Draft PR [#13](https://github.com/Aides8Stack/GankSoft/pull/13)。先核远端 HEAD 与工作区；审核基线 `0b8b96bf857b43e42087e7d621084326cffacbf1`，质量 Run [39876037722](https://github.com/Aides8Stack/GankSoft/actions/runs/39876037722) completed/success：scope、Ubuntu、Windows、pr-gate 全 success。Windows Job 120161827790、Artifact 12468398489；表格 57、编辑器集成（含 11 异步图片、3 原生文本粘贴）、系统 clipboard PNG、30/80、原生/适配 A/B 行列拖拽和受控离线通过。未发现 S3.a 开发阻断性错误。

**用户阶段批准**：S2 自动化/开发准入 DONE，S3.a 允许立即进行独立业务开发。以前“必须先完成全部 Win10/11 IME 人工测试才能写 S3”的 Gate 已调整；但 `S2-WINDOWS-ACCEPTANCE.md` 人工清单仍 NOT_RUN，正式编辑器真实数据启用前必须验收，S9 最终同包验收不可省略。原 Crepe 事务竞态负向脚本仍预期 FAIL，保留 GankSoft 已测公开扩展。

**下一步可以直接实施**：按新 PLAN.md 的 S3.a T09-T12，从 S1 DTO/606 模型与 existing draft/content API 审计开始，随后实现草稿后端、CAS/epoch、三模式六向首次映射、预览/确认/取消；分阶段测试和小提交。当前业务代码未开始，不能把授权写成已实现。保护现有 schema604 用户库与媒体/历史、跨卡片集隔离，不做 S3.b 的 publish 或其它阶段。

`pr-trust` 仍为 failure：等待所有者独立审核当前最终 SHA；不得自动审批、合并、发布。此次文档更改生成后续新 HEAD 的 CI 状态必须单独取证，不能继承父 SHA 的运行身份；普通推送，不轮询等待 GitHub Actions。

---

历史交接（以下旧 S2 BLOCKED 只反映原 Gate）：

# 当前交接：核原生优先简化后的 Windows A/B 与完整拖拽

起点c892378c094080c537e1017430b1957f75a60e4f / Run39810159802失败只在Windows launcher行拖拽，57/完整editor含11/系统剪贴板/受控离线PASS，Ubuntu成功。Artifact12440650734原始SHA256 fe39c77d64eee73108730f14105dc8ae8f159099216bafe79f6f193fba74fb32已核，非新图片回归。当前新SHA/一次即时CI见原PR13回执，不为写自身SHA另造提交。

本轮仅减少编辑职责：普通非HTML文本粘贴交回原生Clipboard；HTML仍安全纯文本路径。删除假uploader回调，通过公开editor.remove(uploadPlugin)移除未使用的默认上传事件插件。保留ImageBlock关闭及最小Asset/Placement/width/书签并发/销毁/保存适配，不改ganksoft.editor/1。详见更新后的MARKDOWN-EDITOR-ADR功能对照。

表格生产table-interaction.ts不变；仍是官方拖拽/增删/对齐/undo。新增table-mouse-drag.mjs复用一个真实鼠标函数，A原生默认Table和B现公开扩展使用相同数据/官方主题/host/窗口/路径，reload隔离，不使用内部move或合成drag/drop。函数先确保表格完整可见，指示线到目标且最终落点确有可信/被接纳dragover后释放，保留原完整内容/drop断言；Windows效果必须新CI验证。

最终Linux A/B+完整产品拖拽、系统剪贴板30-80/保存重开、受控离线/launcher均PASS；A table DOM会重建而B保持。原生旧事务竞态再次FAIL/exit1（独立负向控制），因此点击/DOM保护不可盲删。57/11、完整editor18记录及新增原生粘贴3项、Node6、类型/build PASS。所有最终产品错误数组为空，夹具开发失败及纠正有记录。单一证据S2-ADMISSION-EVIDENCE.json.nativePriority。

下一准确入口：核PR13最新完整SHA与对应Run；Windows Artifact先看ci/quality.json，要求57/editor/launcher真执行并PASS。s2-platform-acceptance.json.tableComparison.results需A/B两条环境/DOM/原生事件/内容证据，B与完整table-mouse-drag必须PASS；系统clipboard/offline亦PASS，native-chinese-ime=NOT_RUN。A若FAIL保留原生诊断，不能用A诊断控制冒充B产品通过；完整产品任何FAIL继续阻断。配合s2-launcher-selftest.json、s2-platform-acceptance/*.png/html/log，按真实阶段定向处理，不无限重试/增加流水线。

现有S2 Gate不变，真实Win10/11中文IME/人工清单未签核，S2 BLOCKED、不进入S3。所有者按最新完整SHA处理pr-trust，不复用旧授权。此轮原分支/原Draft PR，不新workflow/PR，不审批/合并/发布，不等待CI。

---

历史记录（当前状态以上节为准）：

# 当前交接：读取新增 Windows 系统操作结果，再补真实 IME

原分支feature/v075-unified-learning-workspace / Draft PR13→develop。已核父e73f9e46ae62ce11c4d859a6bbeeb3e4b2a5ce68的Run39796684980双平台quality/pr-gate最终success，Artifact12434645198 Windows57/完整editor含11/launcher均PASS；旧图片异步故障关闭。pr-trust最新failure39796682060，不能复用旧SHA授权。当前提交SHA/一次即时CI在PR回执与最终回复解析，不为写自身SHA另造提交。

只修公开TableNodeView.update内容未变时保持DOM（7行），并新增CellSelection装饰更新的DOM身份断言，旧实现控制FAIL/新57及完整editorPASS。原生dragover已接纳，无额外事件补丁。原launcher --verify-launcher新增platform-acceptance.mjs，通过真实系统clipboard、浏览器鼠标原生行列拖拽、断网负向对照验证本地字体/公式/图片；任何FAIL仍exit1。真实IME不支持可靠驱动，明确NOT_RUN，无合成替代。

最终Linux三项系统自动化PASS；原夹具失败及最小修正记录见S2-ADMISSION-EVIDENCE.json，最终build/57/完整editor含11/保存失败重试与进程重开PASS。测试adapter的保存/JSON重开不等于正式Draft。无真实用户数据/工作流/依赖/发布/保护变更，S0/S1/C-D/FAST-FULL不重做。

下一入口（不轮询）：核PR最新完整SHA及其质量Run Windows Artifact；先读ci/quality.json的57/editor/launcher步骤，再读s2-platform-acceptance.json、s2-launcher-selftest.json及s2-platform-acceptance/*.log/html/png。要求system-clipboard-png、table-mouse-drag、offline-local-resources均PASS，errors/browserErrors/external为空；native-chinese-ime预期NOT_RUN。Windows若失败，按具体case读取原生事件/顺序/资源证据定向处理，不再增加复杂测试基础设施。新CI成功仅证明Runner范围，不能填人工PASS。

现有S3准入仍不满足。Win10/11按S2-WINDOWS-ACCEPTANCE.md六行最小人工清单，尤其真实中文IME标题/列表/表格、光标/选区、undo/redo、组合Ctrl+S；OS/IME版本与capture/report必须回传。延后真实IME可能把丢字/光标/撤销/半成品保存风险带入所有正式编辑页面，只能由用户明确调整Gate，代理不调整。正式Draft=S3、Base64=S6、便携ASAR最终签核=S9；现有未验证项保留，不通过重归类宣称S2 DONE。

本轮退出：提交推送、独立fetch核SHA/tree、一次新SHA CI快照后退出。Windows新结果待核，S2 BLOCKED；不审批pr-trust、不合并/发布/删分支、不进入S3。

---

历史记录（当前状态以上节为准）：

# 当前交接：核新SHA Windows异步图片恢复与11项专项

父检查点da4dca3a4c2fcc64d77fe3c9288fe308ba7aab28，Run39789987983旧Windows119863277349在stage成功后MEDIA_INSERTION_MOVED_RETRY；Ubuntu成功/pr-gate失败，latest pr-trust failure39790212181。本轮已实际修复，非只诊断：原始adapter在纯选区变化、正文不变的受控场景稳定FAIL；新版同输入恢复原bookmark目标PASS。旧Windows报告未记录两个比较的独立结果，不能补造该次具体分支；新CI才是恢复证据。

实现src/editor/milkdown-adapter.ts：公开Plugin state追踪docChanged版本，capture selection/bookmark；仅焦点/选择变化允许，当前state事务setSelection(original bookmark)后批量插图，不抢焦点。正文任何修改（含undo复原）、无效/回退bookmark拒绝；pending第二次明确忙碌拒绝，第一次完成后重试；销毁不交付，实例隔离。无内容改动时位置映射是恒等，明确拒绝跨正文编辑映射，不能解除版本保护。整批先验Asset/冲突，避免部分节点与assets；原media.stage/历史/宽度协议不动，不清暂存资源。

tools/editor-spike/paste-regression.ts新11用例在原tools/smoke-editor-v075.mjs中执行；前置完整集成先通过真实paste/IPC/解码/资源落盘和进程重开，再以已stage的真实Asset控制专项Promise完成时点。专项不冒充真实剪贴板；没有直接insertImage代替首次粘贴。验证页只加隔离hook，正常App不暴露。

最终本机Linuxquality273/协议21/类型/build、表格57、异步11、完整editor17记录（含原生颜色限制探针）、启动恢复自检通过，errors/browserErrors/external均空。S2-ASYNC-IMAGE-VALIDATION.json保留hash/旧原生adapter控制失败/Windows原诊断及最终结果；首次夹具separator/type问题与更正有记录，原测试不删。默认Electron/全ASAR本轮未另跑，真实IME/系统剪贴板/手工拖拽NOT_RUN，S2仍BLOCKED。

下一准确入口：核原PR最新完整HEAD（本次提交SHA/即时Run在PR描述）及该SHA Windows/Ubuntu quality、pr-gate、最新有效pr-trust，不轮询。Windows现有quality应完整跑57、editor（含11异步目标用例）、launcher --verify-launcher；Artifact editor-v075.json须17记录、11专项全PASS、所有既有30/80/重开/解码断言与errors/browserErrors/external空。启动恢复必须真执行，不能沿用旧NOT_RUN或旧SHA成功。若报MEDIA_INSERTION_DOCUMENT_CHANGED_RETRY，说明正文事务版本已变，按真实操作调查，不放宽保护；TARGET_INVALID同样保留拒绝；BUSY是明确拒绝第二个未决请求、需完成后重试的既定策略。新Windows成功前不宣称修复验收完成，不进入S3。

所有者按最新完整SHA处理可信审核，旧SHA不复用；代理不审批/合并/发布。不改workflow/保护/发布，不查C-D，FAST/FULL暂缓。保存核SHA/tree及一次即时CI后退出，不等待，不新分支/PR。

---

历史交接（当前状态以上节为准）：

# 当前交接：读Windows图片粘贴分段诊断，根因未定

参考实现41a2d89cae627d4ea001204f6b9252d967c2c57a，Run39785588369 Windows119847922073在首次图片img可见性30秒超时，表格57通过；Ubuntu通过/pr-gate失败，latest pr-trust failure39785584531。用户本轮授权定向红CI调查。已继承quality.mjs接入Windows专项，不能退回只Linux或关闭测试。提交自身SHA/一次即时CI回执在原PR13描述，按远程HEAD解析，不为回填自身SHA再提交。

本轮只补EditorSpike.vue真实media adapter观测与smoke-editor-v075.mjs诊断：保留原剪贴板mock/事件/实际IPC媒体API与插入、30秒和全部原断言；新断言要求事件被观察/阻止、mock确实read/getType及stage resolved。收集浏览器错误、资源请求和main stderr；失败HTML在validation-results中，现有always Artifact会上传。没有业务修复，没有根因结论；不能把Linux成功当Windows修复。

本地PASS：build+spike、57、完整editor16记录（15PASS+颜色限制探针）、Node6、启动恢复自检。受控临时stdin getType错误的预期FAIL exit1/30秒、0Asset/0图片及完整错误保留验证通过，源码无故障开关；Linux成功报告已恢复，故意失败单独保留。小结S2-WINDOWS-PASTE-DIAGNOSTICS.json包含旧Windows原报告、两实现hash、Linux正向与受控失败诊断。

准确下一入口：核原PR最新SHA及其Run/Windows质量（初始Run见PR回执），读取pr-reports-windows-latest-<run>-<attempt>中：

1. editor-v075.json → phase、pasteDiagnostics.event观察/PNG items/prevented，clipboard.installed/reads/getTypes/blob/errors，renderer.mediaTrace started/resolved/rejected与原错误、document.assets、alerts/saveState、images rect/naturalWidth/invalidMedia。
2. event未观察先查分发目标；未调用stage查图像分支；stage已开始但clipboard无读查IPC/校验；getType错误查mock返回；stage rejected查原错误；stage resolved但无节点查alert（含MEDIA_INSERTION_MOVED_RETRY保护），不得直接解除保护；节点存在但不可见看rect/资源HTTP和CSP。
3. 配合mediaRequests/browserErrors、editor-v075-main.log、editor-v075-failure.html判断存储/引用/渲染。当前证据没有旧Windows这些字段，不能补写推断。新CI若绿只记本次未复现，根因仍须证据；不因一次绿给观测改动虚构修复归因。
4. 要继续验收须同新SHA Windows57、粘贴/30-80/资源重开/完整editor/启动恢复和双平台quality/pr-gate都真通过；pr-trust由所有者对该最新SHA处理，不能自动审批/复用旧审核。

S2总Gate仍BLOCKED，真实中文OS IME/系统剪贴板/人工拖拽及Windows ASAR未实际覆盖仍NOT_RUN，Base64仍S6待办。不得进入S3、改发布/保护规则或再查冷启动C/D。保存后仅一次即时CI退出，不等待，不新分支/PR，不合并/发布/删分支。

---

历史交接（当前状态以上节为准）：

# 当前交接：先完成Windows六项真实操作，S2仍BLOCKED

当前实现基线326572b6e46982ac74223547874956ee7f967a28已核双平台quality/pr-gate success，pr-trust最新failure→39776475352（owner exact SHA review required）。本次仅人工工具/字体构建/诊断路径及必要文档，提交自身SHA和即时CI写原PR13回执，按远端HEAD解析；不重复提交回填SHA。

准确入口：docs/v075/S2-WINDOWS-ACCEPTANCE.md。Windows Node24+在原feature分支最新SHA依次npm ci --include=dev → npm run build → npm run build:editor-spike → node tools/editor-spike/check-table-interactions.mjs（57/57）→ node tools/smoke-editor-v075.mjs → node tools/editor-spike/manual-acceptance.mjs。每一步失败停止保留日志。人工窗口用真实OS输入法/剪贴板/拖拽，终端capture/restart/quit；工具仅临时库，未接真实用户数据，未修改clipboard.read。重启采用测试JSON重新注入最近成功保存文档、复用隔离资源库，不冒充正式Draft数据库保存。别直接关窗口X，先capture/用quit。

本机Linux已重新build+spike、57/57、完整editor smoke（15PASS+限制探针）和工具自检通过。修复spike字体data:被CSP拒绝：assetsInlineLimit:0、40个本地字体文件，无CSP放宽；自检检查browserErrors/pageerror和failedFonts，均空。smoke失败HTML从/tmp常量改至专用测试dir；无业务/依赖/工作流/安全门禁修改。初次工具焦点失败和字体错误原日志位置及当前小结见S2-ACCEPTANCE-CHECKPOINT.json；原生未适配FAIL证据仍保留。

剩余均NOT_RUN：Windows57/完整smoke、真实IME（标题/列表/表格长文、光标选区、undo/redo、组合Ctrl+S）、真行列拖拽、系统图片剪贴板和30/80宽度重开、Windows脱网及ASAR。清单6行结果+OS/IME版本+完整SHA+自动化JSON/日志+工具report/capture交回，再评估S2 DONE；没有结果不改T05–T08总体BLOCKED。Base64交换按S6范围待办，正式保存/发布是后续阶段，不能借验收越级接线。

当前新SHA所有必要门禁必须实读，pr-trust由所有者处理，不自动审核；CI运行中不轮询。Windows冷启动故障已DONE，不重复C/D；FAST/FULL实施暂缓；S0/S1有效证据直接继承；不进入S3、不合并/发布/删除分支。

---

历史交接（当前状态以上节为准）：

# 当前交接：S2公开表格扩展已验证自动化，下一步真实IME/Windows

原仓库/feature/v075-unified-learning-workspace/Draft PR13→develop。已核父SHA 4aebc2682c9e8b46c57bf311e9479432e9d3004a；自身SHA按远端HEAD/git log解析，提交后即时Run/check/status写原PR描述，不为回填反复提交。起始质量39763577036双平台/pr-gate/scope success；Windows独立D:\a\_temp全锁冷启动13962.7299ms PASS，冷启动故障DONE，不再调查C/D。起始pr-trust failure→39763767234真实读取，合并仍受可信审核约束；本轮用户授权局部S2，不自动审批。FAST/FULL分级实施暂缓，S0/S1不重做。

本轮完成：src/editor/table-interaction.ts公开TableNodeView/$view替换，安装在create前；原Crepe7.22.3 Table feature/UI/命令保留，只将延迟click改成可取消的当前意图。任何state改变（含仅选择）/更新点击/销毁取消旧意图，执行时current state建tr；保留原RAF/20ms而非增加输入等待，不吞错/不改node_modules/不禁表格。milkdown-adapter只调用该内部安装函数，媒体/保存/DTO不变；正常App未接入。

验证入口：先npm run build，再npm run build:editor-spike。原node tools/editor-spike/reproduce-table-race.mjs仍FAIL/exit1，是未适配原生诊断控制，不串成成功前置；本轮真实失败已保存。新node tools/editor-spike/check-table-interactions.mjs要求固定57/57/errors[]，完整node tools/smoke-editor-v075.mjs保留原断言并新增Tab/ShiftTab落格。UI验证之后普通build会清理独立入口，恢复时重新build:editor-spike；不对准真实用户库。

本地实际：Linux Node24.19/npm11.9/Electron44.7.2；57=19x3固定矩阵PASS，完整集成16记录（15 PASS+原生颜色限制探针）/errors[]/external[]；Node6、quality273/协议21/基础设施5/ZIP1/边界/类型/78导出/build、默认Electron4+5通过。未另重跑pipeline（原父CI182已有效、流水线没变），未运行新Windows编辑器、真实IME/系统剪贴板/Base64或真实表格拖拽。57本地专项尚未由当前pr-quality自动执行，不把新CI绿记成专项重跑。

证据docs/v075/evidence/S2-TABLE-CURRENT-STATE：原生失败、57专项/完整smoke/quality JSON、全部日志/新夹具失败及更正解释、6文件hash/指纹e1b078dc5a5a4c52ecf6577f22b55ed29e39cdc5a55f3a393011a1f3cd0c777b。夹具纠正了pointer→mouse真实序列、列对齐须先选整列、选择命令返回void引发false、跨Schema doc.eq身份不能作跨实例合同；现在核完整JSON/Markdown重建，未删旧断言、未忽略字段。升级候选前必须重审公开API和重跑完整矩阵。

当前S2/T05总Gate仍BLOCKED，不进入S3、不宣布生产选型。下一准确入口：

1. 核PR最新完整HEAD及该SHA双平台quality/pr-gate与最新有效pr-trust；运行中不轮询。需要可信审核时由所有者按当前完整SHA处理，旧SHA审核不复用；不自动审批/合并/发布。
2. 按EDITOR-COMPONENT入口在Windows独立验证环境执行同57专项和集成smoke，保留pageerror/完整日志；真正中文OS IME在标题/列表/表格长文连续输入、光标位置、undo/redo与Ctrl+S/组合期间不保存需真实验收。Linux合成composition不能代替。
3. 补Windows脱网资源/ASAR、系统图片剪贴板、真实行列拖拽；Base64交换仍按S6范围，不为补证越级实现。T06–T08限定PASS不扩大为全平台通过。
4. 若公开扩展在必要功能/真实IME上失败，保留失败并先定向修复；受支持方式无法保持功能才以相同fixture隔离对照Vditor/Cherry。只有T05–T08关键要求及当前SHA必要门禁实际满足才评估S2 DONE，本轮不进入S3。

保存沿核实base tree/真实parent/expected_sha/force=false，独立fetch核SHA后一次即时CI并退出，不新分支/PR、不强推、不动生产数据库/发布门禁。

---

历史交接，以本节为准。

# 当前交接：核验新独立D盘冷启动；FAST/FULL设计已保存

仓库Aides8Stack/GankSoft、feature/v075-unified-learning-workspace、原Draft PR13→develop。父检查点a8b4d61ea43093d86f38a28659351ef16568fffc；提交自身SHA从远端HEAD/git log -1解析，提交后即时Run与状态写原PR描述，不为回填自身SHA重复提交。

第一阶段已实现并本地验证：tools/pipeline/bootstrap-workspace.mjs真实根选择（Windows优先RUNNER_TEMP，其次源码父目录下新的D盘同级目录）、源码/祖先node_modules隔离、真实ESM/CJS缺yaml及安装后仅本地解析、专用目录清理；bootstrap.test.mjs保留完整离线全锁ci/120000ms/4MiB/严格退出/lock/yaml/三模式/坏lock/独立worktree/阻断。每日只跑一次正常全锁冷安装；旧4次C/D性能代码完整保留在experiments/directory-comparison.test.mjs，未重跑，原合成单测保留。没有业务/依赖/workflow/可信/发布/保护规则改动。

参考证据已核：Run39759121731 Ubuntu成功/Windows119758723844 test:pipeline失败/pr-gate失败，pr-trust latest failure→39759353663。Artifact12417536862 C120.046秒超时/118.803秒成功，D10.421/10.470秒成功；目录关联已足够，不再追查C。旧D在项目树内，不是隔离验收；本轮新D路径仍要实际CI证明。原Artifact完整ZIP+原报告已无损保存于docs/v075/evidence/S2-COLD-ROOT-FIX，保留远端原Artifact不删改。

本地真实结果：Linux Node24.19/npm11.9，正常冷安装6001.938ms，安装前ESM/CJS缺yaml且三模式失败，安装后自己node_modules/lock/yaml2.9.1/三模式PASS；专项20、pipeline182（全部通过、无skip/cancel）、业务273/协议21、基础设施5/ZIP1/边界/类型/78导出/build PASS。完整输出/四实现文件hash与指纹7da3fc0da72851510d259df66be902d796fd7c9204c7e1aa6c62f74e95ced9c9见docs/v075/evidence/S2-COLD-ROOT-FIX。Windows新独立D目录NOT_RUN本地，不能以Linux或旧源码内D的成功宣称修复已验收。

第二阶段设计DONE：docs/v075/CI-QUALITY-TIERS.md；分级实现NOT_STARTED。包括完整覆盖/触发/去重/唯一pr-gate与最新SHA FULL/现有pr-trust、main当前可见保护差异与授权要求。FAST不能代FULL；FULL跳过/缺失/失败/旧SHA均拒绝；不能把手工workflow_dispatch Job直接当PR规则集required检查。后续先保留全自动FULL验证覆盖再分级，不改便携ZIP/RC/Release/人工发布审批。

下一准确入口：

1. 核PR最新完整HEAD与该SHA Ubuntu/Windows quality、pr-gate及最新有效pr-trust。提交后初始Run见PR描述；运行中不轮询。可信审核按当前完整SHA由所有者处理，不自动审批，不用旧审核替代。
2. 读新Run的pr-reports-windows-latest-<run>-<attempt> Artifact，找bootstrap/run-*/pre-install.json和cold-install.json。确认选择实际D盘、realpath在源码树外、所有祖先node_modules不存在，ESM/CJS缺yaml和三模式真失败，然后同目录完整offline ci，120000ms/4MiB，error无/signal无/status0，lock/yaml/local解析/三模式全PASS。核耗时与子目录child-*/result.json、stdout/stderr、npm日志；本次正常只应有1次完整锁冷安装（原独立worktree小fixture和坏锁负向安装另有必要目标）。不再跑四次泛查。
3. 新Windows通过后才记独立路径修复已验证，比较旧C约120秒与新D实测；仍失败只按新证据最小修复，不放宽超时、不接受null或依赖污染。后续FAST/FULL按设计B–F独立小检查点推进，main Required Checks需要用户明确授权，绝不自行改规则或发布路径。
4. 当前SHA必要门禁全部通过后，再恢复S2表格竞态修复/同fixture备选；S2/T05仍BLOCKED/FAIL，最小复现/失败日志/pageerror保留，真实IME/系统剪贴板/Base64/Windows编辑器实机NOT_RUN，不进入S3。

采用核实HEAD的真实tree/parent、expected_sha、force=false保存，独立fetch核SHA/tree后收集一次即时CI退出；不新建分支/PR，不强推、不等待/轮询、不自动合并/发布。

---

历史交接，当前状态以上节为准。

# 当前交接：读取新Windows目录对照；S2/T05仍BLOCKED

原分支feature/v075-unified-learning-workspace、Draft PR13→develop不变。父检查点e3051b0d95c418c348d3ac725c98e8c8ffacd9f2；原质量Run39749260681/Windows Job119725473546失败；最新有效pr-trust failure→39749485110。用户本轮明确授权调查红CI，未绕过可信/合并/发布门禁。自身SHA以远端HEAD/git log -1 -- docs/development解析，提交后即时Run/status写原PR描述和最终回执，不为自身SHA反复提交。

已完成：读取Artifact12413335363正向bootstrap/run-zMZeQH/child-t3NvEM，确认C临时目录120023.6397ms/ETIMEDOUT/SIGTERM/null，最后reifyNode @milkdown/crepe112667ms；四份原文件完整保存于docs/v075/evidence/S2-DIRECTORY-COMPARISON/prior-windows-positive。已提交的代码范围仅测试侧同机目录实验，不是业务修复或超时放大。

test:pipeline现在顺序A1(os.tmpdir)→B1(workspace/validation-results/bootstrap/sources)。同Node/npm、完整package/lock/hash、实际cache与child env hash、ci --include=dev --ignore-scripts --offline --no-audit --no-fund、120000ms/4MiB；全新专用中文/空格目录，安装前lstat证实无node_modules，不复制依赖。安装成功/失败分歧，或都成功但≥2倍且差≥10秒，才反向B2→A2一次；最多4次对照安装。A失败仍B，最后汇总任何失败仍门禁FAIL。每次成功继续manifest/lock、yaml、timing及三模式完整断言；旧负向/独立worktree控制保留。只清理mkdtemp所有目录，诊断外置保留；沿用现有workflow与always artifact，无审批/发布改动。

本地已通过：专项14、其余19个pipeline文件TAP168、完整test:pipeline退出0（捕获spec缺汇总，不推算总计）、ci:quality业务273/协议21/基础设施5/ZIP1/边界/类型/78导出/build。最终Linux A4283.318ms/B4195.231ms，根/与/，两组全检查PASS，无反向，不能称Windows或C/D验证。Windows对照NOT_RUN本地，慢的原因仍UNKNOWN。

下一准确入口：

1. 读取PR最新完整HEAD及该SHA quality的Ubuntu/Windows/pr-gate、最新有效pr-trust真实状态；本提交后的即时Run见原PR13描述。运行中不轮询。要恢复后续S2必须全部必要门禁通过；可信失败须所有者按新完整SHA处理，旧审核不能替代，不自动审批。
2. 无论Windows quality成败，读取**该SHA**的pr-reports-windows-latest-<run>-<attempt> Artifact，找到bootstrap/run-*/directory-comparison.json和.md，及每行指向的child-*/result.json、stdout/stderr、npm-logs。核实际Windows平台、路径/盘符、执行顺序、版本/完整lock hash/环境hash/缓存、120000ms与4MiB、耗时、error/signal/status/最后阶段及全部后验；报告非C/D就明确非C/D。原Artifact12413335363仅是前序超时证据，不能充当新对照。
3. A慢B快且反向同方向仅记录“目录相关性能差异”，不能归因物理磁盘/杀毒；下一步优先最小调整临时目录并保留隔离/中文/全部断言。两处超时需实际完成耗时或资源证据再提出一次有界验证，不能无限扩大超时或宣称GitHub全站故障。两处成功只记本次未复现。120秒本轮公平固定，未来有证据可讨论有限调整。
4. 当前SHA必要门禁通过后，再继续**S2表格竞态修复或同fixture备选验证**。Crepe原生竞态、最小复现、失败日志/pageerror均保留；真实IME/系统剪贴板/Base64往返/Win编辑器实机NOT_RUN/BLOCKED。Windows恢复不代表T05/S2通过；不进入S3、不改生产数据库保护、不操作真实用户库。

保存采用核实HEAD为parent/base tree、expected_sha、force=false，核远端完整SHA/tree后仅一次即时CI，退出不等待，不新分支/PR、不强推、不自动合并/发布。

---

以下历史交接状态以上节为准。

# 当前交接：先收集Windows冷启动诊断；S2仍BLOCKED

原仓库/分支/Draft PR13→develop不变。已核父检查点46e404a8a7224946854ae7be3c8a18fa062d82d1；Run39745482071的Windows Job119712802877在test:pipeline失败，Ubuntu成功、pr-gate失败；最新有效pr-trust failure→39745800696。没有用S1旧SHA门禁代替当前结果。

Windows真实日志：Node24.21.0/npm11.19.0；顶层ci25秒成功；bootstrap.test.mjs原229–245真实离线全锁ci在120015.5683ms返回null退出码。原error/signal/npm日志未记录、临时源被finally清理、无Windowsartifact，故**底层根因未确认，不能宣称Windows已修复/瞬时环境故障或确需提高超时**。缺yaml/损坏lock为正常负向证据。

实现仅tools/pipeline/bootstrap.test.mjs、bootstrap-process.mjs和5项bootstrap-process.test.mjs：逐子进程持久诊断、npm timing/debug、node/npm/cache/锁包数量；原120000ms/4MiB上限及完整真实冷启动断言保留并加强无error/无signal/退出0。新报告在validation-results/bootstrap/run-*/child-*/{result.json,stdout.txt,stderr.txt,npm-logs/}，自动由现有always上传步骤覆盖，没改workflow/审批/发布/依赖。原临时checkout仍清理，不复用node_modules；每次证据目录独立，不重用旧PASS。

本地通过：npm11.19流水线167（含新增5）、业务273/协议21、基础设施5/ZIP1/构建。单次在线预热后Linux真实离线安装4.738秒，完整pipeline同安装4.906秒；初始缺缓存探针ENOTCACHED<1秒。仅Linux证据，没使用Windows/真实用户库，也未无依据重跑旧CI。

下一准确入口：

1. 读原PR最新完整HEAD及该SHA的Ubuntu/Windows quality、pr-gate、最新有效pr-trust。提交后的即时状态见原PR描述；运行中/未通过就停止，不轮询。当前文档不可能含自身SHA，按远端HEAD/git log解析。
2. 若Windows冷安装仍失败，优先下载其现有pr-reports-windows artifact，找到cwd为coordinator且args为npm-cli ci的正向child目录；cwd为failed install的是损坏lock负向用例，不能混淆。对照result的error.code/signal/status/elapsed，完整stdout/stderr及npm-logs的debug/timing最后完成/未完成阶段；再判断cache/文件系统/进程/npm版本/预算。不要先扩大timeout、删除冷安装、接受null或修改workflow。旧Run没有这些证据，不假装已经看过。
3. 当前SHA必要门禁全部通过后，再继续S2表格竞态修复或同fixture备选验证。T05原生Crepe竞态FAIL、最小复现与pageerror断言保留；真实IME/系统剪贴板/Base64往返/Win编辑器实机NOT_RUN/BLOCKED。不因CI绿将S2改DONE，不进入S3，不重做S0/S1。

本轮原始Job、Linux对照、真实npm日志和测试输出见docs/v075/evidence/S2-WINDOWS-BOOTSTRAP-*。未完成：原Windows根因/恢复结论及新SHA远端门禁；必须读取新诊断CI才能进一步有据修复。提交推送核SHA后只取一次即时CI并退出，不自动审批、合并、发布。API保存沿用最新base tree/parent、expected_sha与force=false；保留本地恢复stash，不强推。

---

以下历史交接的当前状态以上节为准。

# 当前交接：S1自动化DONE；S2候选验证BLOCKED，不进入S3

仓库Aides8Stack/GankSoft；feature/v075-unified-learning-workspace；原Draft PR #13→develop。本轮父检查点19ab62dfe806174060478ffdb05fe955bea223bd。精确S1.c检查点19ab62dfe806174060478ffdb05fe955bea223bd：quality39726201464的Ubuntu job119650594353、Windows119650594402、pr-gate119651723739均completed/success；scope119650548049亦成功。最新有效pr-trust提交状态success，target39730661706，明确绑定该完整SHA。旧自动trust失败已被该有效状态取代。S1自动化Gate DONE，真实旧RC/Win10/11/真实断电等NOT_RUN/BLOCKED保留；生产默认604，不自动升级真实用户库。

实现入口：src/editor/{MarkdownEditor.vue,milkdown-adapter.ts,media-adapter.ts,save-controller.ts}；shared/editor/document.ts；src/editor-spike/与tools/editor-spike/独立验证入口；tests/editor-v075.test.ts六项。编码/限制/备选对照见docs/v075/MARKDOWN-EDITOR-ADR.md，复现命令见EDITOR-COMPONENT.md，API边界已补API-CONTRACT-DELTA。

当前阻塞：Crepe7.22.3表格点击捕获旧state，requestAnimationFrame/20ms后dispatch旧事务；期间输入导致mismatched transaction。原生Crepe默认feature、无本项目adapter也稳定失败，详见S2-NATIVE-TABLE-RACE.json。未补丁node_modules、未禁用表格/吞错/增加等待掩盖问题。候选不获准上正式页面；仅隔离验证组件可继续使用。

已通过：全量273（含6项新增）/协议21/构建/基础设施5/ZIP1、Electron原流程4+5；S2图片独立30/80、公式编辑和重建、颜色、保存失败/冲突/中断控制、多实例销毁、安全拒绝/本地字体等部分范围。完整S2 smoke保留FAIL（表格异步事务），不能以成功运行覆盖失败。平台clipboard.read注入后真实IPC/解码/资源持久化已测；系统剪贴板实际读取无图、真实OS IME、Win10/11脱网、单.md Base64往返仍NOT_RUN/BLOCKED。SQLite JSON fixture不冒充正式草稿API，内存save adapter不代表S3完成。

下一次准确入口：

1. fetch原分支，读PR最新完整HEAD的Ubuntu/Windows quality、pr-gate及最新有效pr-trust。当前提交后的CI只取一次即时快照，真实SHA/Run见PR描述；运行中/失败停止，不轮询，失败定向读取job日志。不能复用19ab62d旧审核。
2. 继续S2，先`npm ci`、`npm run build && npm run build:editor-spike && node tools/editor-spike/reproduce-table-race.mjs`复现（当前预期诊断exit1=FAIL）。读ADR，验证上游受支持修复版；若不能解决，使用相同T05–T08 fixture实装对照Vditor，再考虑Cherry。不要重新S0审计/迁移设计，也不要通过改测试时序隐藏库竞态。
3. 补真实中文IME（标题/列表/表格长文、光标/撤销）、系统图片剪贴板、Win10/11便携脱网、单.md Base64资源往返；当前尚无最终编辑器选型或S3准入。只在S2所有必要要求真实通过后判断下一阶段，届时另按用户授权；本轮不进入S3。

正常应用build清除验证入口；验证脚本固定新临时目录，禁止手工对真实用户数据目录运行POC。不增加/启用生产Draft/publish/新评分接口，不改S1安全激活保护。真实旧RC/断电等仍未验收；不合并、不发布、不自动审批。

提交不可能包含自身SHA；当前提交内CI=PENDING_NOT_OBSERVED，最终SHA从PR/head与git log解析。原PR描述记录真实远端SHA/tree/即时Run，避免回写自身SHA反复触发CI。Git HTTPS无凭证时沿用既有API tree/commit/ref流程，parent/base_tree绑定最新已核HEAD、expected_sha且force=false，fetch核对tree后本地快进；远端若前移先停查，绝不强推。

---

以下为历史交接，当前入口以上节为准。

# 当前交接：S1.c 本地完成，整体S1待当前SHA门禁

仓库/分支/PR不变：Aides8Stack/GankSoft，feature/v075-unified-learning-workspace，Draft #13→develop。起点f24c6b05e10e925a52a7ff57c62f300a40597d25，已实际核实quality39721268828的Ubuntu/Windows/scope/pr-gate均success；pr-trust提交状态success，指向owner审核39723537044。S0/S1.a/S1.b有效证据直接继承。

本轮实现入口：

- migrations/unified-model.ts：stageUnifiedModel纯606验证/no-op；legacy-projection.ts：来源映射与同事务增量归档；unified-integrity.ts：精确结构/DTO/双向来源/水位校验。
- migrations/coordinator.ts：prepareAndActivateUnified → recoverUnifiedMigration → openUnifiedOwner；源外全新控制目录、源库/媒体保留及两个ZIP恢复点。active.json是提交点；相同目录重试用recover，不覆盖重建。
- infrastructure/write-owner.ts + database.transaction：应用路径冻结、606受控连接、最外层commit前adapter。原Application/host事务唯一业务写所有者，projection失败回滚旧写/档案/回执/水位。
- backup.ts / migrations/baseline.ts / integrity.ts：604/606完整备份识别、只读还原验证、全引用闭包；main.ts仅补604恢复UI在目录替换前拒绝未受控606，没有自动升级入口。
- tests/migration-recovery-v075.test.ts：新增30项，含迁移事务4故障+4进程退出、9协调检查点进程中断、备份/单写者/epoch/adapter回滚等。

安全状态：合成与隔离副本的准备/冻结/转换/606恢复验证/提交/旧API写入/重开路径已通过；真实用户数据库未触碰，生产启动默认604。不能仅删除MIGRATION_NOT_ACTIVATED保护或修改SCHEMA_VERSION接生产。606须由openUnifiedOwner核日志/指针/源目标marker/epoch并持独占租约；默认openDatabase和无所有者606协议仍拒绝。

激活前调用方须排空异步系统操作；任何pending平台操作先用原入口人工核对，协调器不自动承认。源DB应用marker/query_only及独立BEGIN IMMEDIATE锁冻结写入；源和图片不删除。指针前失败恢复可用源，指针后响应丢失报MIGRATION_COMMITTED；目标失联/epoch冲突不自动回旧路径。600–603旧备份沿用原路径，605不支持，未知604结构仍阻断。

已完成：T02两次迁移/no-op与完整指纹/ID、604/606备份还原；T03新deck三模式及旧集隔离、Draft/版本独有图片和受控读取；T04异常/进程中断/重开、源SQL锁、跨进程租约、epoch、真实EEXIST/注入ENOSPC、提交后丢响应/目标失联/缺图/错版本拒绝。本地267/267、协议21/21、构建、基础设施5、ZIP1、Electron4+5 PASS。

未完成/未验证：本轮新SHA远端Ubuntu/Windows quality/pr-gate/pr-trust；Win10/11人工、真实旧RC样本、真实断电/磁盘耗尽/权限ACL、Windows目录fsync。进程exit不是断电证据；恢复进程自身在recovery.lock内再崩溃会保守阻断，须人工核对。新606若旧purge会丢原史则拒绝，完整回收站/清理归S8；生产自动升级与新编辑/发布/评分UI均未启用。

**下一次准确入口**：fetch同分支，核本轮PR最新完整HEAD、对应双平台quality/pr-gate与pr-trust。运行中或失败停止，不轮询；失败只读失败Job定向修复，保留现有测试。需要owner审核时绑定当前完整SHA，前序审核不可复用。当前S1整体IN_PROGRESS，不满足进入S2；只有本轮全部必要远端门禁通过且无完整性阻塞后，才把S1自动化Gate记DONE，并按用户下一轮授权进入S2编辑器POC。不要重跑已有效的S0/S1.a/S1.b审计，不提前接编辑/发布/评分UI。

提交内当前CI=PENDING_NOT_OBSERVED；自身SHA从PR/head与git log解析，实际即时CI回执写原PR描述和最终回复，不为回写SHA重复触发重型CI。PROGRESS/TEST_REPORT/PHASE-GATES已同步，证据S1C-TEST-OUTPUT.txt。保存沿用base tree/真实parent、expected_sha、force=false；不新建分支或PR，不改流水线/可信/发布门禁，不自动审批/合并/发布。

---

# 当前交接：S1.b 本地完成，下一入口 S1.c（先核当前提交门禁）

同一任务/分支feature/v075-unified-learning-workspace、Draft PR #13→develop；S1整体IN_PROGRESS。前序检查点d334d91a26478c2ea4e899126f172138da91ebfe的quality39718272521（Ubuntu/Windows/scope/pr-gate）全部成功；精确SHA pr-trust success，owner审核Run39719132662。S0/S1.a基线有效，不重新全量设计/审计。

本轮实现：electron/infrastructure/migrations/{unified-schema,unified-model}.ts；electron/modules/cards-unified/{legacy,queries,drafts}.ts；shared/protocol/unified.ts；registry/gateway/src.services三个typed只读入口；tests/unified-model-v075.test.ts新增10项。原入口/评分/调度保持；生产schema604，目标606（605被图片恢复分支占用）。

**隔离606是模型验证结果，不是已激活的用户库。** stageUnifiedModel要求源库之外的副本，当前只接受S1.a实测完整604 schemaHash并阻断pending平台操作。旧表不删除，旧raw event/score/FSRS/会话/知识/回收站/媒体不改。没有迁移启动协调器；重跑606尚未实现幂等。openDatabase拒绝606；Application protocol拒绝606/MIGRATION_NOT_ACTIVATED，防止旧写入口造成投影漂移。不要直接解除保护接生产。

604新查询只读旧数据，无learning_*写入；返回的当前内容token绑定card/revision/epoch，是临时当前视图，不能宣称历史已归档。旧token/缺档案明确NOT_AVAILABLE；606隔离service按持久版本ID读，旧UUID alias多个来源时AMBIGUOUS，不任选一个快照。Draft仅内部副本CAS，尚无公开save/switch/publish或新编辑器。

下一次准确入口：

1. fetch原分支，核PR #13最新完整HEAD、对应双平台quality/pr-gate及pr-trust；当前最终SHA从PR/head与git log解析。若失败仅定向修复；运行中/门禁未过保存退出，不轮询，不凭前一SHA通过。
2. 门禁通过进入**S1.c**，从unified-model.ts的stageUnifiedModel + baseline.ts的prepareMigrationBaseline +上述10项测试继续。先做606重复迁移/no-op和原始事件/媒体/版本/cycle ID两次一致；补事务异常、进程退出、磁盘/目标错误的回滚与重开恢复证据，不重做S0/S1.a。
3. 完成606的backup manifest版本范围、readVerifiedBackup/stageBackup/openDatabase/validateBusinessData及引用闭包适配，验证604和606完整备份恢复；当前备份恢复支持范围仍旧版本，不能宣称606已可恢复。
4. 激活前建立冻结写入/无未决操作、单一写所有者、旧入口的同事务adapter/水位、恢复日志/epoch与原子升级策略；新投影不得异步双写。源库和媒体恢复点保留，禁止静默回旧路径。只有S1.c/T02–T04真实通过后才可进入S2。
5. 本地必要测试→更新记录→同分支提交保存→核完整远端SHA/即时CI→退出。无新分支/PR、流水线/可信/发布门禁改动，无自动审批/合并/发布。

本轮本地237/237、协议21/21、构建、基础设施5/5、UnicodeZIP1/1、Electron4+5通过；完整输出/文件hash见docs/v075/evidence/S1B-TEST-OUTPUT.txt。当前提交CI在提交内记PENDING_NOT_OBSERVED，保存后精确SHA/Run/真实状态写原PR描述与最终回执。提交不能包含自身SHA，不为回写生成重复重型CI。GitHub连接器保存沿用真实base tree/parent+expected_sha+force=false。

Win10/11人工/真实旧RC库/本轮606幂等中断重开备份均NOT_RUN，不宣称整个S1已通过。以下旧交接保留作历史。

---

# 当前交接：S1.a 本地完成，等待代码检查点CI

同一任务/分支/PR #13；S1整体IN_PROGRESS。当前文档检查点的完整SHA从PR/head与git log解析，提交不能包含自身SHA。远程保存前状态CI=PENDING_NOT_OBSERVED；保存后即时读取一次，真实SHA/Run/状态记入本轮最终回执及PR描述，不为写自身SHA制造重复重型CI。

本轮实现入口：electron/infrastructure/migrations/baseline.ts 的 inspectLegacyBaseline / prepareMigrationBaseline；electron/infrastructure/backup.ts 的 readVerifiedBackup；tests/migration-baseline-v075.test.ts（25项）与tests/fixtures/{schema604.sql,v075-schema604.ts}。S0架构/ADR/API差异保持有效，不重新设计/另起任务。

下一次准确入口：

1. fetch原分支，读取PR #13最新完整SHA和对应PR quality/pr-trust真实结果；检查是否仍以acf8556为前序、develop有无变化。失败只读失败Job/日志修复；若需owner对控制文件精确SHA审查，按现有门禁处理，不自动审批。运行中报告待核实，不轮询。
2. 本S1.a代码检查点Windows/Linux必要CI通过后进入**S1.b**：按已提交MIGRATION-ADR/API-CONTRACT-DELTA扩增量统一Card/不可变ContentVersion/单模式Draft/Cycle/Event表与typed摘要/内容合同；从合成schema604恢复点开始回填，保留旧UI和唯一写入所有者。schema版本候选605，动手前核实未被占用。不进入S2编辑器/S3发布UI/S4评分。
3. S1.c再验证回填幂等、连续两次迁移、各中断点回滚/重开/备份适配，T02–T04全部满足后才可进入S2。当前未实现这些DDL/协议/迁移，不能把备份故障测试当迁移事务测试。

使用限制：prepareMigrationBaseline尚未接入启动/UI/IPC；调用方必须冻结应用与媒体写入直至返回，三方指纹比较是漂移检测，不是跨进程文件锁。schemaHash是识别证据，非自动放行任意同版本结构；未知额外表也会完整计入指纹，S1.b须明确其映射或阻断。fixture故意保留pending平台操作，制作恢复点可保全它，但真实升级前必须解析/阻断未决操作；不能把有恢复点等同于允许升级。

恢复点只接受源目录外的全新目标文件，使用同文件系统硬链接原子发布（无覆盖），不支持硬链接时安全失败。进程强退出可留下未发布临时诊断目录；重试不会误认其为成功，也不切换活动路径。源表/原始评分/历史/图片未转换或改写，缺失历史正文/路径/自评不补造。真实私有库未打开。

版本0.7.5-rc.1仅为现有PR版本门禁预留；无依赖升级、无Release/Tag。依赖安装沿用同环境S0的npm ci，lock除根版本外逐项一致。普通git push无HTTPS凭据的既有事实继续有效，采用GitHub连接器以真实base tree/parent、expected_sha及force=false保存同一分支；不新建分支或PR、不改门禁。

本地最终227/227、协议21/21、build、基础设施5/5、UnicodeZIP1/1、pipeline162/162、Electron4+5通过。Windows Runner/Win10/11人工、本S1.b/S1.c未运行。完整证据见TEST_REPORT与docs/v075/evidence/S1A-TEST-OUTPUT.txt。

以下为S0历史交接，不将其NOT_STARTED/旧CI当本轮状态。

---

# HANDOFF

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

当前状态 DONE（仅S0）：本地审计/设计/测试、远程保存及Draft PR #13已完成；S1–S9未启动。最终回执提交CI须按新head核实。

先读 AGENTS.md/STANDARDS.md、本目录TASK/PLAN/PROGRESS/TEST_REPORT，以及 docs/v075/README.md。权威需求按最新用户明确决定 > AUTHORITY-AND-DECISIONS > FUNCTIONAL-SPEC/TEST-MATRIX > 历史资料；不要按旧任务/旧zip恢复废弃功能。

本轮只改文档和历史归档。docs/v075 包括真实字段/接口/模块/UI映射、schema604合成DDL清单、迁移和回滚策略、API差异、S1–S9门禁、三份包内权威原文及真实测试输出；API-INDEX仅由既有export校正版本标题。业务源码、依赖、schema、Vue UI和所有workflow未改。

重要差距：develop仍deck.kind隔离、直接保存正文自动重置、self_score与correct绑定；没有统一编辑草稿/内容版本档案/cycle；图片共享组件宽度不持久，#2图片分支不是已合入实现；内置AI API需后续退役。不要据旧报告宣称schema605/独立图片宽度已实现。

远程基线develop=7970896c0306833e3b2f54a843f388d2e380618f，基线Run39581175708 success。本任务Draft PR和新commit/Actions待本轮提交后即时读回，不用旧Run代替新head。提交不能包含自身SHA，最终检查点从 `git log -1 -- docs/development` 与远程PR/head解析；若有一次回执提交，其前序SHA/Run只属前序提交，不无限写回。

恢复步骤：

1. `git status --short`、fetch origin、核本分支和origin/develop/PR完整SHA；不覆盖未提交工作、不force push。
2. 仅用户明确“检查CI并继续/进入S1”才读最终head的Actions。失败先取失败Job原始日志定向修复；运行中报告待核实，不轮询；成功才进入用户指定阶段。
3. S1最小入口：schema604合成fixture、只读schema fingerprint、事件/图片/调度原始清单、node:sqlite备份和故障注入策略；对照MIGRATION-ADR/API-CONTRACT-DELTA冻结ID/版本/评分来源合同，再扩增量迁移。
4. 保留正常cardId/全部旧历史/FSRS与媒体；旧评分不伪转；缺历史正文或关联路径保留unknown；碰撞/损坏阻断。新编辑/发布评分不提前接入，S2才编辑器POC。
5. 必要本地测试→记录→提交普通push→核SHA/Actions一次→退出，不等CI；不合并/发布/审批、不改现有便携门禁。

本轮Windows10/11人工、新迁移与真实用户DB均NOT_RUN。原型DOM已打开；headless截图与outline物理点击未通过，见TEST_REPORT，不能当正式UI验收。

## S0 远程保存与即时交接回执（2026-10-22）

- 远程实现检查点：`8fa96a06325e047919a8b05d4c69ec6050676c95`；parent=`7970896c0306833e3b2f54a843f388d2e380618f`，tree=`b970098dd0ea16a80de21fd364d6b4eafd79ba5c`，与本地最终文档tree完全一致，PR与git fetch独立读回一致。
- Draft PR：[13](https://github.com/Aides8Stack/GankSoft/pull/13)，head=`feature/v075-unified-learning-workspace`，base=`develop`，draft=true，未合并。
- 已观察到实现检查点PR quality：[39715137420](https://github.com/Aides8Stack/GankSoft/actions/runs/39715137420)，head_sha=`8fa96a06325e047919a8b05d4c69ec6050676c95`，event=pull_request，completed/success。只反映纯文档PR质量检查，不是新版业务/Windows验收。未等CI完成，读取完整head绑定详情时已结束。
- 普通HTTPS git push因没有登录凭据失败；改用已连接GitHub接口，从核实的base tree构建、parent指向真实HEAD、expected_sha核对且force=false推进ref。未覆盖任何远程工作。初始两个本地提交留在本地local/s0-pre-api保存；当前任务分支重新跟踪真实API远程检查点，无强推/重置/历史删除。
- 本次仅补交接回执；最终回执自身SHA不能写入自身文件，从远程PR/head或`git log -1 -- docs/development`解析。**最终新head的CI：PENDING_NOT_OBSERVED（在提交内记录）**；保存后只即时查一次新head的Actions，最终聊天回执报告真实SHA/Run，不无限追加文档提交。前序成功不能代替新head结果。
- S0已完成；下一轮先查最终head的真实CI，再按用户指示进入S1.a。保留全部测试/审批门禁；不自动合并、不发布、不审批；现在退出，不等待CI。
