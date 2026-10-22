# PLAN

任务：GankSoft v0.7.5 S0 baseline and ADR
分支：feature/v075-unified-learning-workspace
基线：7970896c0306833e3b2f54a843f388d2e380618f

状态：IN_PROGRESS。仅执行 S0；S1–S9 均 NOT_STARTED。

1. DONE：完整读取用户包的 START/权威决策/主指令/路线/验收/S0及架构；校验包完整性。
2. DONE：核对真实 develop HEAD、分支/开放PR/CI/架构/字段/协议；实际打开 v3.7 HTML 参考。
3. DONE：docs/v075 的架构、完整 schema604 字段清单、迁移 ADR、真实 API 差异和阶段 Gate；不改业务/schema/依赖/流水线。
4. DONE：npm ci --include=dev、npm test、check:protocol、build 与必要 Electron 启动/复盘 smoke。测试和限制见 TEST_REPORT。
5. IN_PROGRESS：审文档 diff/历史归档，提交推送，Draft PR → develop，核实远端 SHA/Actions，最终回执后立即退出。

下一轮最小任务是 S1.a：先核本分支最终 SHA/CI，然后生成含旧事件/图片/知识/回收站的 schema604 合成 fixture 和迁移前 fingerprint/可恢复快照。后续扩展统一 Card/ContentVersion/Cycle/Event 合同；详细边界见 docs/v075/PHASE-GATES.md。

禁止本轮实现 S1–S9；禁止合并/发布/审批、修改门禁或重新引入流水线试点；根拖整图暂缓；保护原始评分/历史/媒体。
