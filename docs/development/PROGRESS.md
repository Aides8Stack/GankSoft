# 当前进度：S1.a（2026-10-22）

状态：IN_PROGRESS（S1整体）；S1.a本地实现和测试DONE，CI PENDING_NOT_OBSERVED。S1.b/S1.c NOT_STARTED；S2–S9未进入。

沿用原分支 feature/v075-unified-learning-workspace、Draft PR #13→develop、S0 acf8556bf5691ce49d380cac93842f9804c065ac。起始HEAD与develop均未前移；S0最终质量39715355519/可信39715352908均success。未重跑需求设计或全量审计，未运行task:init，继承S0原文与证据。

本轮完成：

- 冻结tests/fixtures/schema604.sql（与S0 schemaHash一致）和完全合成旧数据：42张用户表+sqlite_sequence、错题/记忆原始评分与缺快照、知识多对多/多根/重名分支、回收站、FSRS/单卡策略、会话草稿、幂等/平台操作、4张当前/历史/作答/未绑定草稿图片。
- migrations/baseline.ts只读源库预检、逐表行摘要/媒体hash、ID/范围/FK/树/图片/草稿引用检查。使用readOnly/query_only，不执行openDatabase修复或schema升级。
- prepareMigrationBaseline复用node:sqlite backup生成WAL一致快照，单独只读核验备份还原内容，源前/备份/源后指纹一致后发布到源目录外新文件；拒绝覆盖。故障清理/重试、并发源变更和进程退出均有测试。
- backup.ts提取readVerifiedBackup供恢复与只读预检共用，保留所有校验；备份清单记录源库实际schema，不再套用当前应用常量。

实测：最终ci:quality PASS（227/227业务含新增25项、协议21/21、边界/类型/导出/构建、基础设施5/5、UnicodeZIP1/1）；流水线162/162；真实Electron基本4/4+系统图片/内容导入导出/完整备份恢复/回收站/取消5/5。没有删除/弱化/skip旧测试。

版本按现有非文档PR门禁预留0.7.5-rc.1（仅package及lock根版本变更，依赖完全不变）；schema仍604，protocol仍2.0/75定义。没有新UI/发布/模式切换/新评分/活动路径切换，不改workflow/审批门禁，不合并、不发布。

待验证：当前代码检查点的双平台CI、Windows硬链接/备份句柄路径行为、Win10/11人工、新schema实际迁移T02–T04。S1.a测试仅是T02/T04前置，绝不称整个S1完成。进入S1.b前需读取该代码检查点CI；此轮保存后即退出，不轮询。

以下为S0历史记录，状态以本节为准。

---

# PROGRESS

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

状态：DONE（S0）。审计/ADR/基线与远程检查点已保存，Draft PR #13；S1–S9未启动。最终回执提交CI保持PENDING，须按新head核实。

日期：2026-10-22（Asia/Shanghai）。实际 develop 与包快照一致，应用仍0.7.4-rc.6、schema604、protocol2.0。旧 TASK 与 PLAN/PROGRESS/HANDOFF/TEST_REPORT 已完整归档至本目录 history/infra-portable-only-release-6ab4df3a-7970896c0306-1792637499928/；其历史成功不算本轮验证。

已核实：真实源码调用链、42张合成空库表（含协议网关存储）、75个registry定义、原始评分约束、分类型deck/历史与FSRS、图谱排序/正文、图片与备份边界、当前便携流程、开放Draft PR #2/#3/#6/#7。基线develop Run39581175708 completed/success；不是新分支CI。

已完成设计：docs/v075/{ARCHITECTURE-BASELINE,SCHEMA604-INVENTORY,MIGRATION-ADR,API-CONTRACT-DELTA,PHASE-GATES}.md；保存权威需求/规格/全量验收原文。实际打开v3.7原型并审主要页面DOM/包内截图；没有用演示替换Vue。

本轮实测：锁文件冷安装194包；业务202/202、协议21/21、边界/类型/导出75定义、Vue/Electron/Vite构建PASS；真实Electron smoke4/4。protocol:export只校正API-INDEX版本标题rc.1→rc.6，无方法变更。完整命令/输出/限制见TEST_REPORT与docs/v075/evidence。

未实现：全部S1–S9新增业务（混合三模式/发布草稿/统一自评与周期/MD/排序/独立追加等）。未验证：新迁移、编辑器POC、Win10/11人工、私人数据库。头图自动截图超时/outline物理点击超出headless视口，未记通过；DOM审阅不冒充生产UI测试。

下一阶段需用户明确进入S1后，核最终head及真实CI；先S1.a合成迁移fixture和只读备份基线，不跳到编辑器/发布/复盘实现。本轮不合并、不发布、不审批、不等待CI。

## S0 远程保存与即时交接回执（2026-10-22）

- 远程实现检查点：`8fa96a06325e047919a8b05d4c69ec6050676c95`；parent=`7970896c0306833e3b2f54a843f388d2e380618f`，tree=`b970098dd0ea16a80de21fd364d6b4eafd79ba5c`，与本地最终文档tree完全一致，PR与git fetch独立读回一致。
- Draft PR：[13](https://github.com/Aides8Stack/GankSoft/pull/13)，head=`feature/v075-unified-learning-workspace`，base=`develop`，draft=true，未合并。
- 已观察到实现检查点PR quality：[39715137420](https://github.com/Aides8Stack/GankSoft/actions/runs/39715137420)，head_sha=`8fa96a06325e047919a8b05d4c69ec6050676c95`，event=pull_request，completed/success。只反映纯文档PR质量检查，不是新版业务/Windows验收。未等CI完成，读取完整head绑定详情时已结束。
- 普通HTTPS git push因没有登录凭据失败；改用已连接GitHub接口，从核实的base tree构建、parent指向真实HEAD、expected_sha核对且force=false推进ref。未覆盖任何远程工作。初始两个本地提交留在本地local/s0-pre-api保存；当前任务分支重新跟踪真实API远程检查点，无强推/重置/历史删除。
- 本次仅补交接回执；最终回执自身SHA不能写入自身文件，从远程PR/head或`git log -1 -- docs/development`解析。**最终新head的CI：PENDING_NOT_OBSERVED（在提交内记录）**；保存后只即时查一次新head的Actions，最终聊天回执报告真实SHA/Run，不无限追加文档提交。前序成功不能代替新head结果。
- S0已完成；下一轮先查最终head的真实CI，再按用户指示进入S1.a。保留全部测试/审批门禁；不自动合并、不发布、不审批；现在退出，不等待CI。
