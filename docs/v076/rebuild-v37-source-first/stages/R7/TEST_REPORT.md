# R7 测试报告

## R7.1

源码 ae6b338827d1e494bc3f6a9c7c745aae12f14239 + tools/validation/r7/shell.ts 工作树；Linux / Node24.22.1 / Electron44.9.1 / Schema606 / b2Fixture v2。npm ci及Electron安装成功，锁文件未改。

| 命令 | 结果 | 证据 |
| --- | --- | --- |
| npm run build | PASS exit0 | 正式Vue/TS/Electron/Vite构建；仅已有bundle体积提示 |
| node --experimental-strip-types --test --test-concurrency=1 tests/unified-workspace-v075.test.ts tests/card-drafts-v075.test.ts | PASS 32/32 exit0 | evidence/shell/checks.json；无skip/cancel |
| R7_ATTEMPT=final node --experimental-strip-types tools/validation/r7/shell.ts | PASS 5组 exit0 | evidence/shell/attempt-final.json；真实main/preload/typed IPC/606，新PID19→90 |

首轮失败为专项编写时的夹具/选择器适配：默认队列无到期卡；fixture留有已提交但未完成会话，选中学习会恢复result；direct模式无单选独立思路；图谱正式返回名为“返回所有卡片”。最终通过UI完成旧会话再新开direct复盘，检查反思及实际返回。未改变产品或削弱精确保存断言。原初失败保留attempt-0.json，其余重复诊断归纳于此；不是已确认产品缺陷。R1历史脚本不反复重拍12图。

严格视觉、Windows/IME/物理剪贴板、便携包、全量性能：NOT_RUN；分别留R7.3–R7.5/R8。R1未标DONE。R7.2尚未运行；R7整体不能DONE。
