# 当前测试账本：S1.c（2026-10-22，Asia/Shanghai）

环境Linux x64 / Node24.19.0 / npm11.9.0；同环境锁依赖不变。被测为f24c6b05e10e925a52a7ff57c62f300a40597d25加本轮12份实现/测试工作树，指纹 **8bab4d7db5666b02cbf6d091f0efacbe7bd68938e0958394a1faa34ddaa953f6**。逐文件SHA256和最终输出见docs/v075/evidence/S1C-TEST-OUTPUT.txt；不是声称提前测试未来提交SHA。

| 检查/命令 | 结果 | 实际范围与限制 |
| --- | --- | --- |
| 前序精确SHA门禁 | PASS | f24c6b05e10e925a52a7ff57c62f300a40597d25；quality39721268828 Ubuntu/Windows/scope/pr-gate成功；pr-trust success，target39723537044 |
| 最终npm run ci:quality | PASS | 267/267（新增30+全部旧237），协议21/21，基础设施5/5，UnicodeZIP1/1，边界/类型/78合同导出及Vue/Electron/Vite构建exit0，无skip/cancel |
| T02 no-op/指纹/来源 | PASS（合成Linux） | 604→606、两次no-op逻辑全表/媒体digest不变，独立副本同ID/版本/cycle/event；缺历史unknown/partial和原0–4/9.3/null不改；源库不被修复 |
| T02 同事务adapter/重开 | PASS | 原question.save/memory.submit与projection/watermark/receipt同commit，重放只一次；起始及逐卡投影中途故障均回滚旧写、新版本、回执和revision；旧事件原文逐条保留；重开/606再备份恢复/新epoch通过 |
| T03 新混合集 | PASS（合成Linux） | 一个全新deck保留旧kind元数据且三模式共存，原question/memory deck映射不变；编辑Draft/新版本独有图片30%字段无损606备份恢复并受控激活/协议读取。不是S2编辑器交互验收 |
| T04 模型回滚 | PASS8项 | DDL/逐卡/逐事件/commit前各一次异常及一次子进程exit43，WAL重开仍604原指纹，之后重跑606/no-op成功 |
| T04 协调中断 | PASS9项 | frozen/source-backed-up/model:card/event/before-commit/model-ready/prepared/pointer/committed各一次子进程exit47，恢复源或目标准确且再次恢复/重开一致；无两个合法活动写者 |
| T04 备份/闭包 | PASS | 604与606都实测还原；606当前/历史/作答/暂存/版本独有缺图（重算合法manifest后）拒绝；清单错schema、不可变约束缺失拒绝；已有目录文件保留 |
| T04 写屏障/路径错误 | PASS | 原协议/旧句柄冻结、外部SQLite写被reserved lock阻断、同进程/子进程争租约及活PID不可回收；epoch篡改拒绝；真实目标EEXIST、注入ENOSPC、提交后响应丢失、已提交目标丢失不回旧路径 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron启动/API、deck UI、错题揭示提交、记忆复盘，完成标记有效；默认604路径 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 图片/对话框、二进制内容交换、604备份恢复/epoch、回收站/取消/操作日志；606证据另由专项提供 |
| 旧测试/协议/依赖/流水线保留 | PASS | 旧测试源码、registry/共享合同/前端、依赖/lock、.github/tools均无改动；未删/skip/弱化；仅新增S1.c专项 |
| 当前新提交远端CI | PENDING_NOT_OBSERVED（提交内） | 保存后只即时读取一次，真实SHA/Run/状态写原PR描述和最终回执，不等待/轮询 |
| 当前新SHA Windows/Ubuntu Runner/ASAR | NOT_RUN | 本地Linux不代替Runner；进入S2前按新完整SHA核实 |
| 本轮pipeline162项/完整本地ASAR | NOT_RUN | 流水线未改，继承S1.a pipeline证据及S1.b远端门禁；本轮基础设施5项实际重跑 |
| Win10/11实机、真实旧RC样本 | NOT_RUN | 没有用户私人DB；合成和隔离目录不可冒充实机或真实RC迁移 |
| 真实断电/磁盘耗尽/ACL、Windows目录fsync、恢复进程再崩溃 | NOT_RUN/BLOCKED | ENOSPC是注入，process.exit不是断电；未知recovery.lock保守阻断，不自动删锁。电源/目录迁移扩大验收归S8 |
| 生产真实库自动激活 | NOT_RUN（未接入） | 仅显式受控后端路径端到端验证；默认604，未自动迁移；整个S1未放行S2 |

调试：最初tsc指出3处nullable路径未缩窄，修正never函数声明后通过；新增30项最终全部PASS，旧237项保持PASS。未通过删测试、降低解码/审批门禁制造成功。604旧备份继续保留opaque附件字节的原语义；迁移604和606图片预检严格解码，所有604/606完整备份补齐引用闭包校验。

阶段结论：S1.c本地实现/验证DONE；T02–T04上述自动化范围PASS。当前完整SHA远端质量/可信仍待核，因此S1整体IN_PROGRESS，本轮不进入S2，也不宣称生产升级/全部存储故障场景已验收。以下为历史证据。

---

# 当前测试账本：S1.b（2026-10-22，Asia/Shanghai）

环境：Linux x64 / Node24.19.0 / npm11.9.0；依赖沿用S0同环境锁安装，package/lock自S1.a无变化。被测为d334d91a26478c2ea4e899126f172138da91ebfe + 本轮实现工作树；实现13文件规范JSON(path/sha256)指纹 **9ded731c398b2027f069801b3a5f6de5c0d2a319e053b1524b97676da8483006**，见S1B-TEST-OUTPUT.txt。不能把quality.json的基线SHA误当未来提交已测。

| 检查/命令 | 实际结果 | 范围/限制 |
| --- | --- | --- |
| 前序精确SHA GitHub质量/信任 | PASS | d334d91；39718272521的Windows/Linux/scope/pr-gate均success；pr-trust status=success，target39719132662 |
| 远端schema占用核对 | PASS | 全部已fetch origin分支仅图片恢复分支605，其余604；606未占用；生产未升级 |
| 最终npm run ci:quality | PASS | 237/237业务（旧227+新增10），协议21/21，基础设施5/5，UnicodeZIP1/1，协议边界/类型，78定义导出，Vue/Electron/Vite构建exit0 |
| 新增S1.b专项（含于237） | PASS10/10 | 原42表+sqlite_sequence逐行/媒体字节保留、3card/7version/5cycle/4event映射与unknown/raw9.3/空新分、pending/未知结构/源路径阻断、不可变/跨卡FK/事件唯一、单模式Draft CAS、混合同deck三类型与独立模式版本、旧token歧义/跨集隔离、DTO非法选项/分数拒绝、独立正误/0–100存储与索引、真实protocol只读/旧写路径回归、分页/revision/epoch/预算 |
| 摘要规模与预算 | PASS | 106卡，每卡3万字符正文；50条/页最大13497 bytes；没有正文/历史字段；遍历无重复/遗漏；606使用learning_cards_deck索引，不读版本document |
| 旧合同/门禁/依赖保留 | PASS | 原75个方法的全部JSON schema及envelope/semantics逐项相等；仅新增3个query。旧测试源码不改，无workflows/tools/pipeline/发布门禁/依赖改动 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron启动、deck UI、错题揭示提交、记忆复盘；完成标记有效 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 图片解码/对话框、二进制内容交换、完整604备份恢复/epoch、回收站、取消及操作日志；不是606备份验证 |
| 当前提交GitHub CI | PENDING_NOT_OBSERVED（提交内） | 保存后即时读取并记精确SHA/Run/状态到PR描述及最终回执，不等CI |
| 当前提交Windows/Linux远端完整quality/ASAR | NOT_RUN | 本地不能替代Runner；下次按精确HEAD核实 |
| 本轮npm run test:pipeline | NOT_RUN | 流水线未改，继承S1.a的162/162证据；本轮ci:quality基础设施5项实际重跑 |
| Win10/11人工、真实旧RC用户库 | NOT_RUN | 仅合成隔离库，无私人数据 |
| S1.c幂等/中断回滚/重开/606备份和激活 | NOT_RUN | 未实现完整恢复协调/启动升级，stage副本不能作活动库；T02–T04及整个S1未通过 |

调试：首次新增9项为8/9，失败是测试把client的本地Zod校验误认作host错误码；改为向真实gateway传非法limit并精确断言VALIDATION_ERROR，未放宽任何断言/协议或旧测试。随后补独立新事件/索引专项，最终10项及全量237全部PASS，无skip/cancel/fail。当前实现测试后未改；后续只有执行文档和证据。

旧评分0–4/原自评9.3/空值、旧实际rating、原fault/evidence/schedule留存；新scoreTenths/rating保持null。没有启用新评分行为或重算排期。已验证模型约束和一次隔离构建，不把它当作S1.c幂等/故障/恢复验收。

审阅：AUDIT.md为旧infra任务的0.7.3/a0fb65d记录，不能替代S0实测基线；只继承仍有效证据。当前最终SHA从远端PR/head解析，提交不能包含自身SHA。

以下为历史测试账本，不冒充本轮重跑。

---

# 当前测试账本：S1.a（2026-10-22，Asia/Shanghai）

环境延续S0：Linux x64 / Node24.19.0 / npm11.9.0。被测基线为acf8556bf5691ce49d380cac93842f9804c065ac加本轮7份实现/fixture/版本文件工作树；不是声称已测试未来提交SHA。实现文件指纹：e166e3f25d85a17b7b9740be69e36e0900590d13a399f48bbd75f058c737fffc（规范JSON(path/sha256)列表见证据文件）。

| 检查/命令 | 真实结果 | 范围 |
| --- | --- | --- |
| S0远程HEAD/CI/继承证据核对 | PASS | acf8556；39715355519/39715352908 success；无源码前移，不重复S0全审计 |
| 冻结fixture的schemaHash | PASS | 355c28a533579ffed5ad3c007bb7406eabe3c0cbff0d63950446d89b8f81c0ad，与S0一致；42用户表+sqlite_sequence；全合成 |
| 最终npm run ci:quality | PASS | 基础设施5/5、UnicodeZIP1/1、业务227/227（旧202+新增25）、协议21/21、边界/类型、75定义导出、Vue/Electron/Vite构建全部exit0 |
| 25项S1.a专项 | PASS（含于227） | schema/marker/缺表、元数据只读、WAL恢复/重复制作、所有表行和媒体hash、原始空自评/缺快照、AUTOINCREMENT/重复行/大整数/BLOB、ID碰撞/空ID、缺历史/未绑定/会话图片、跨集/循环、坏JSON/FK/图片、并发变化、3故障点/重试、不覆盖目标/错误源路径/未结束事务、ZIP损坏、独立子进程exit37 |
| npm run test:pipeline | PASS162/162 | 原审批/门禁/RC/版本/便携回归保持；无工作流改动 |
| npm run version:check -- origin/develop | PASS | 0.7.5-rc.1高于0.7.4-rc.6，Tag/Release未占用；只改根版本，不改依赖 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron启动、deck、错题复盘、记忆复盘；完成标记有效 |
| node tools/smoke-system-v060.mjs | PASS5/5 | 图片对话框/解码、二进制内容交换、备份恢复/epoch、回收站、取消/操作日志；完成标记有效 |
| 最终diff/敏感信息/版本锁/原测试保留核验 | PASS | git diff --check、允许文件/敏感信息/锁版本/旧测试保留核验；不提交DB/图片/zip/构建产物 |
| 当前S1.a检查点GitHub CI | PENDING_NOT_OBSERVED（提交内） | 推进远端后即时查询，完整SHA/Run记最终回执和原PR描述；不等CI |
| Windows/Linux远程本轮完整quality/ASAR | NOT_RUN | 本地GUI不能替代Runner；后续按精确SHA核实 |
| Win10/Win11人工/真实旧RC用户库 | NOT_RUN | 无私人数据库；没有把合成fixture冒充真实RC样本 |
| S1.b/S1.c增量迁移、混合三模式模型/新typed API、迁移幂等/回滚 | NOT_RUN | 未实现；本轮只完成T02/T04前置，不宣称整个S1/T02–T04通过 |

调试记录：初次专项20/22，两个ID碰撞fixture同时破坏了旧回执引用，先被已有完整性检查拒绝。仅修正合成fixture的依赖引用以隔离碰撞缺陷，保留精确错误码断言；22/22通过。后续补源schema标签/空ID/会话媒体验证，最终新增25项并入227全部通过。最终源码无测试失败/跳过/取消；旧测试/断言未删除或放宽。

依赖沿用S0同环境的锁安装；本轮lock除两处根版本外与S0完全相同，不重新做无变化的安装/审计。前期check/quality结果只作调试过程；最后一次ci:quality对上面最终实现指纹完整执行。持久输出与各实现SHA256见docs/v075/evidence/S1A-TEST-OUTPUT.txt。

以下为S0历史测试记录，不冒充本轮重跑。

---

# TEST_REPORT

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

阶段 S0；日期2026-10-22（Asia/Shanghai）。被测应用源码/依赖为基线7970896c0306833e3b2f54a843f388d2e380618f；测试时工作树仅任务文档不同，不能声称提前测试了尚未产生的提交SHA。最终文档提交的应用tree/blob与此基线一致，提交前再核。

环境：Linux x64，Node24.19.0/npm11.9.0；锁定Vue3.5.44、Electron44.7.2、TypeScript5.9.3、Vite8.3.4、Mind Elixir6.0.0-next.4、ts-fsrs5.4.2、Zod4.6.7、@napi-rs/image1.15.0。只使用既有测试mkdtemp临时库和S0内存空库，无私人数据库。

| 命令/检查 | 实际结果 | 证据/边界 |
| --- | --- | --- |
| python 包内09-tooling/verify_package.py | PASS | required33、10阶段、manifest/SHA256一致；不是生产测试 |
| 新checkout/status/远端develop/分支/PR/CI核对 | PASS | baseline与来源一致；启动干净；无已有v075分支/PR；旧开放PR不改 |
| npm ci --include=dev | PASS，194包 | 未改lock，未ignore-scripts；Electron首次使用下载二进制后实际smoke成功 |
| npm test | PASS202、FAIL0、skip0、cancel0 | 当前全部tests/*.test.ts，含核心/SQLite/复盘/导入/图片/备份；非覆盖率百分比 |
| npm run check:protocol | PASS21、FAIL0、skip0 | 协议回归另跑21（已含在202中，不重复累计独立数）；边界/tsc/导出75定义均exit0 |
| npm run build | PASS | vue-tsc、Electron tsc、Vite229 modules；构建产物未提交 |
| node tools/smoke-v060.mjs | PASS4/4 | 真实Electron临时库：boot/API、deck UI、错题揭示/提交、记忆复盘；完成标记有效；不是Win/完整ASAR |
| S0 openDatabase(:memory:) + Application + createApplicationProtocol + PRAGMA | PASS | 42张表、integrity=ok、FK0行；SCHEMA604-INVENTORY含所有字段/外键/DDL和fingerprint。只读审计策略未实现迁移 |
| 本地Electron打开OPEN-ME-v3.7.html/审阅主要页DOM | PASS（限参考审阅） | 首页/deck/cards/editor/review/knowledge/settings，附MD大纲/交换DOM检查；无pageerror不代表生产功能通过 |
| 原型headless screenshot/outline物理点击 | BLOCKED | screenshot超时，outline按钮超出该headless视口；没有更改原型/生产代码来掩盖。DOM事件审阅和包内静态截图仅参考，不是鼠标/截图验收 |
| npm run test:ci | PASS5/5，FAIL0，skip0 | 既有基础设施自检，无门禁修改 |
| 新增文档范围/历史归档/决策原文/链接/git diff --check | PASS | 5份归档逐字节一致、3份权威原文一致、T01–T45保留、内部链接有效、git diff --check通过；无数据文件、依赖、测试、工作流变更 |
| 本分支实现检查点GitHub PR CI | PASS（8fa96a0，仅文档CI） | Run39715137420 completed/success；下方完整SHA绑定；最终回执提交是新head，CI保持PENDING待即时核实 |
| 全量ASAR/其余生产GUI smoke | NOT_RUN | S0无应用行为变化，本轮仅必要4项smoke；基线CI成功独立登记 |
| 新schema/新评分/三模式/Markdown POC/迁移回滚 | NOT_RUN | S1–S9未实施，T02–T45尚非通过 |
| Win10/Win11人工及本轮Windows便携验收 | NOT_RUN | Linux与GitHub Runner不能冒充实机签核 |

持久证据：docs/v075/evidence/BASELINE-TEST-OUTPUT.txt（命令输出）；schema清单fingerprint；本目录后续远程回执。原型首次脚本错误使用npm模块路径获取Electron API、后续截图/点击超时均只影响临时参考查看脚本；纠正require('electron')后页面实际可打开。最终应用测试无FAIL，不删/skip/降低现有测试。

文档检查记录：初次暂存检查发现原始DOM输出尾部空白，已在远程保存前规范化；最终相对develop的 git diff --check PASS。应用测试无变更，无重新运行必要。

## S0 远程保存与即时交接回执（2026-10-22）

- 远程实现检查点：`8fa96a06325e047919a8b05d4c69ec6050676c95`；parent=`7970896c0306833e3b2f54a843f388d2e380618f`，tree=`b970098dd0ea16a80de21fd364d6b4eafd79ba5c`，与本地最终文档tree完全一致，PR与git fetch独立读回一致。
- Draft PR：[13](https://github.com/Aides8Stack/GankSoft/pull/13)，head=`feature/v075-unified-learning-workspace`，base=`develop`，draft=true，未合并。
- 已观察到实现检查点PR quality：[39715137420](https://github.com/Aides8Stack/GankSoft/actions/runs/39715137420)，head_sha=`8fa96a06325e047919a8b05d4c69ec6050676c95`，event=pull_request，completed/success。只反映纯文档PR质量检查，不是新版业务/Windows验收。未等CI完成，读取完整head绑定详情时已结束。
- 普通HTTPS git push因没有登录凭据失败；改用已连接GitHub接口，从核实的base tree构建、parent指向真实HEAD、expected_sha核对且force=false推进ref。未覆盖任何远程工作。初始两个本地提交留在本地local/s0-pre-api保存；当前任务分支重新跟踪真实API远程检查点，无强推/重置/历史删除。
- 本次仅补交接回执；最终回执自身SHA不能写入自身文件，从远程PR/head或`git log -1 -- docs/development`解析。**最终新head的CI：PENDING_NOT_OBSERVED（在提交内记录）**；保存后只即时查一次新head的Actions，最终聊天回执报告真实SHA/Run，不无限追加文档提交。前序成功不能代替新head结果。
- S0已完成；下一轮先查最终head的真实CI，再按用户指示进入S1.a。保留全部测试/审批门禁；不自动合并、不发布、不审批；现在退出，不等待CI。
