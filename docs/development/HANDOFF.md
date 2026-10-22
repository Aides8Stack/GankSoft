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
