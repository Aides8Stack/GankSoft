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
