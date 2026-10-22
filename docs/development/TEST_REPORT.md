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
