# R7 测试报告

## R7.1

源码 ae6b338827d1e494bc3f6a9c7c745aae12f14239 + tools/validation/r7/shell.ts 工作树；Linux / Node24.22.1 / Electron44.9.1 / Schema606 / b2Fixture v2。npm ci及Electron安装成功，锁文件未改。

| 命令 | 结果 | 证据 |
| --- | --- | --- |
| npm run build | PASS exit0 | 正式Vue/TS/Electron/Vite构建；仅已有bundle体积提示 |
| node --experimental-strip-types --test --test-concurrency=1 tests/unified-workspace-v075.test.ts tests/card-drafts-v075.test.ts | PASS 32/32 exit0 | evidence/shell/checks.json；无skip/cancel |
| R7_ATTEMPT=final node --experimental-strip-types tools/validation/r7/shell.ts | PASS 5组 exit0 | evidence/shell/attempt-final.json；真实main/preload/typed IPC/606，新PID19→90 |

首轮失败为专项编写时的夹具/选择器适配：默认队列无到期卡；fixture留有已提交但未完成会话，选中学习会恢复result；direct模式无单选独立思路；图谱正式返回名为“返回所有卡片”。最终通过UI完成旧会话再新开direct复盘，检查反思及实际返回。未改变产品或削弱精确保存断言。原初失败保留attempt-0.json，其余重复诊断归纳于此；不是已确认产品缺陷。R1历史脚本不反复重拍12图。

严格视觉、Windows/IME/物理剪贴板、便携包、全量性能：NOT_RUN；分别留R7.3–R7.5/R8。R1未标DONE。此处为第一次保存时状态；R7.2最终结果见下。R7整体不能DONE。

## R7.2（当前检查点工作树）

父检查点 `4d0aa3e54b99e46721ef25853bedb94a58f7b023`。正式源码只改 UnifiedWorkspace.vue 的回收后返回刷新、v37/pages/knowledge.css 的图谱父高度；Schema606、FSRS、协议、存储与媒体引擎未改。所有数据为可再生合成夹具。

| 命令 / 范围 | 结果 | 证据 |
| --- | --- | --- |
| npm run build；npm run build:editor-spike | PASS exit0 | evidence/checks.json；后者仅供原17场景 |
| R7_ATTEMPT=final2 node --experimental-strip-types tools/validation/r7/integration.ts | PASS 8组 exit0 | evidence/integration/attempt-final2.json；真实main/preload/typed IPC/606，全程同一隔离数据世界 |
| R7_ATTEMPT=final node --experimental-strip-types tools/validation/r7/recycle-return.ts | PASS 1组 exit0 | evidence/recycle-return/attempt-final.json；真实恢复+返回刷新/查询/选择/发布/历史/FSRS/字节 |
| R7_ATTEMPT=regression node --experimental-strip-types tools/validation/r7/shell.ts | PASS 5组 exit0 | evidence/shell/attempt-regression.json；修改returnSystem后补受影响设置往返与新PID |
| R7_ATTEMPT=final node --experimental-strip-types tools/validation/r7/layout.ts | PASS 4宽 exit0 | evidence/layout/attempt-final.json；1366/900/1500/720精确内容/画布/footer边界 |
| 安全专项：unified-review、unified-card-lifecycle、editor、knowledge-markdown-boundaries、knowledge-exchange、media-library、full-restore-protocol、merge-public | PASS 45/45 exit0 | evidence/checks.json有完整命令/统计/日志hash；后端未改，不机械重复 |
| node --experimental-strip-types tools/workspace-spike/smoke.ts | PASS 17/17 exit0 | evidence/long17/attempt-final.json；保留全部行为场景与精确断言，真实服务辅助spike；正式main/正常退出另见integration |

正式8组包含三种卡片UI创建/Crepe编辑/草稿/发布；发布不可变与知识关联取消；混合集与错题高自评/客观错分离、pause/resume、真实历史/分析；多根九层map/outline、原生Markdown编辑保存与文件/剪贴板交换、keep/取消零写、共享图片与不可变引用；原生移入确认/取消、设置内回收恢复；整库ZIP备份取消/恢复、提交后未知回执冻结和原ID+epoch重放；独立606合并新增完整副本，原有每一行/图片字节不变；正常退出释放租约、不同Electron PID精确读回所有业务表、正文、层级、发布及会话。未知期间观察器旧epoch拒绝是正确保护，测试没有放松协议。

两项原始产品FAIL及最终复验见FAILURE-LEDGER.md和evidence/layout/attempt-0.json、evidence/recycle-return/original-workspace-fail.json；重复环境/定位诊断归纳保存，运行库、锁、profile、缓存均不入Git。源码/脚本具体hash由VERIFICATION.json绑定本保存工作树；报告输出ID均为合成。

R5/R6未受影响的CAS、回滚、跨集媒体、未知回执等有效证据按原范围继承，45项补本轮安全回归。当前协议检查继承R6的21项/157方法通过，未冒充本轮重新执行。最终全量、严格逐页三宽、性能、Windows真机/IME/物理剪贴板/便携ZIP仍NOT_RUN，留R7.3–R7.5/R8。

中断恢复只继续未完成的长期场景与集中保存，没有重跑有效的8组正式闭环、45安全、5组主壳、4宽几何或构建。原17场景最近14项后在第三次启动的目录summary原生click回执超时；诊断与最终处置见FAILURE-LEDGER.md。最终17/17、无renderer错误/外链、未调用workspace.read；完整trace不重复上传，仅保存场景、数量与hash。
