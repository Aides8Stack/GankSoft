# 当前执行：S1.b（2026-10-22）

沿用PR #13与原分支；S1.a d334d91a26478c2ea4e899126f172138da91ebfe 的quality 39718272521 completed/success，精确SHA pr-trust success（owner审核39719132662）。S0/S1.a证据有效，不重复设计/全量审计。

本轮模型/协议实现和本地测试DONE（237/237、协议21/21、build、Electron4+5）；更新记录并保存同分支后取即时CI快照退出。S1.b远端门禁待核，S1.c尚未执行。

605已被origin/feature/unified-image-recovery占用，选择目标606。S1.b在隔离合成副本建立Card/不可变ContentVersion/单模式Draft/StudyCycle/ReviewEvent；生产openDatabase仍604，不在恢复验证前触发自动升级。只读API通过旧表adapter提供最新数据；旧Application/协议事务仍唯一写入所有者。S1.c完成备份、幂等/中断/重开及原子升级接入后，才能激活新持久化读取，不能把隔离副本当已升级用户库。

不实现新编辑器、draft切换/发布入口、新评分/FSRS或S2–S9；不改流水线/可信/发布门禁。保留全部旧数据、旧入口和测试。

---

# 当前执行：S1.a（2026-10-22）

沿用同一任务/分支/PR #13，不运行task:init、不重做S0。S0最终SHA acf8556bf5691ce49d380cac93842f9804c065ac 的PR质量39715355519、可信39715352908均completed/success；当前head/base未前移。

S1状态IN_PROGRESS；S1.a本地已完成且测试通过，当前代码检查点CI待核实。按原ADR已完成S1.a：冻结schema604合成fixture → 只读源库/历史/媒体fingerprint与异常拒绝 → 现有ZIP备份的无损恢复基线/WAL/故障验证。S1.b正式schema/统一模型/协议在此基线Gate之后；S1.c幂等迁移与回滚随后，S2–S9不进入。

本轮新增数据保护代码和fixture属于首个跨平台前置检查点；在动真实schema前，需确认此检查点Windows/Linux必要CI真实通过。若本轮保存后CI未结束，按用户机制退出并交接S1.b，不轮询。无DDL升级/旧历史重解释/活动路径切换/发布审批变更。

以下S0记录保留作历史，当前执行范围以上述S1为准。

---

# PLAN

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

状态：DONE（仅S0；新回执提交的CI待核实）。仅执行 S0；S1–S9 均 NOT_STARTED。

1. DONE：完整读取用户包的 START/权威决策/主指令/路线/验收/S0及架构；校验包完整性。
2. DONE：核对真实 develop HEAD、分支/开放PR/CI/架构/字段/协议；实际打开 v3.7 HTML 参考。
3. DONE：docs/v075 的架构、完整 schema604 字段清单、迁移 ADR、真实 API 差异和阶段 Gate；不改业务/schema/依赖/流水线。
4. DONE：npm ci --include=dev、npm test、check:protocol、build 与必要 Electron 启动/复盘 smoke。测试和限制见 TEST_REPORT。
5. DONE：文档/归档校验、GitHub接口保存与tree读回、Draft PR #13、实现检查点Actions核实。本次补最终交接回执，再即时核最终SHA/Actions并退出，不等待。

下一轮最小任务是 S1.a：先核本分支最终 SHA/CI，然后生成含旧事件/图片/知识/回收站的 schema604 合成 fixture 和迁移前 fingerprint/可恢复快照。后续扩展统一 Card/ContentVersion/Cycle/Event 合同；详细边界见 docs/v075/PHASE-GATES.md。

禁止本轮实现 S1–S9；禁止合并/发布/审批、修改门禁或重新引入流水线试点；根拖整图暂缓；保护原始评分/历史/媒体。
