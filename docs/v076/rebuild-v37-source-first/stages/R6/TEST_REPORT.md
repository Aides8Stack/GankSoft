# R6 测试报告（2026-10-28）

本地结果：PASS；阶段IN_PROGRESS仅待最终远端源码/证据封口。

基线dd64f033d469dec42c1bb688ffcaa113517ad6d6；最后已核验源码371a9e50c415fdab2585849e4c68e2fbb3133769，加最终设置样式/主题重试和测试工作树。各测试实际按检查点运行，未冒称在最终SHA重跑全部；仅样式/显式重试入口影响由最终settings/global/visual/build补验，其余按影响继承。本地Linux、Node24.22.1、Electron44.9.1、Schema606、ts-fsrs5.4.2；依赖锁未改，复用既有一致依赖。合成小库3知识点/1图片，设置专项4发布卡/4历史；不访问真实用户库。

| 实测命令/范围 | 结果 | 原始证据 |
| --- | --- | --- |
| node --experimental-strip-types --test --test-concurrency=1 tests/unified-review-v075.test.ts | PASS 14/14 | evidence/checks/schedule-domain.txt |
| 同runner：unified-card-lifecycle/unified-deck-recycle/unified-knowledge-v075 | PASS 21/21 | evidence/checks/recycle-domain.txt |
| 同runner：full-backup-preview/full-restore-protocol/full-restore/append-service/append-protocol/append-disabled-v075 | PASS 42/42 | evidence/checks/storage-domain.txt |
| 同runner：merge-public-v076 | PASS 2/2 | evidence/checks/public-merge.txt |
| 同runner：append-provenance/append-selection/external-scan-v075 | PASS 15/15 | evidence/checks/source-contract.txt |
| 同runner：relocation-preview/owner/failures/protocol-v075 | PASS 16/16 | evidence/checks/relocation-domain.txt |
| npm run check:protocol | PASS 21/21、边界、类型、157方法导出 | evidence/checks/protocol.txt |
| npm run build | PASS；最终vue-tsc/tsc/Vite退出0 | evidence/checks/build-final.txt |

六组相关测试合计110项。固定npm run test:r6已接入这些相同文件，**本Work未为凑次数再次执行聚合命令**。public-merge初次命令附带不存在的append-plan匹配项，仅产生真实2用例，不计作额外执行。

| 正式Electron命令（node --experimental-strip-types tools/validation/r6/…） | 结果 | 证据 |
| --- | --- | --- |
| settings.ts，最终R6_ATTEMPT=3/R6_SETTINGS_OUT=settings-final目录 | PASS 4组 | settings-final/attempt-3.json，另6PNG/DOM |
| schedule.ts，R6_ATTEMPT=4 | PASS 5组 | schedule/attempt-4.json，3PNG/DOM |
| recycle.ts，R6_ATTEMPT=1 | PASS 7组 | recycle/attempt-1.json，3PNG/DOM |
| backup-merge.ts，R6_ATTEMPT=4 | PASS 9组 | backup-merge/attempt-4.json，6PNG/DOM |
| relocation.ts，R6_ATTEMPT=0 | PASS 6组 | relocation/attempt-0.json，3PNG/DOM |
| global.ts，R6_ATTEMPT=0 | PASS 3组 | global/attempt-0.json |
| visual.ts，R6_ATTEMPT=4 | PASS 30截图/DOM、45几何对照 | visual-final/attempt-4.json |
| reload-probe.ts，R6_PROBE=after-verified | PASS 原址刷新及外链阻断 | backup-merge/reload-after-verified.json |

34个不同正式场景；正常退出后不同Electron PID逐项核对配置、发布内容、非空复盘历史、FSRS/下次时间、知识层级/关联/Markdown和图片hash。预览/取消零业务写；真实SQL回执触发器故障原子回滚；旧预览失效保护并发写；丢回复仅独立测试bootstrap在真实提交后注入，锁定直至原requestId/expectedEpoch核对。原生文件选择只适配对话框结果，生产main/preload/实际服务/SQLite未mock；确认答案适配不等于Windows原生确认签核。

完整恢复替换当前状态并保留完整恢复点；合并按原合同整集独立副本重映射全部身份和引用，不往现有卡片追加历史，导入事件及FSRS完整保留。相同来源版本默认跳过，强制独立副本/来源版本规则由来源合同覆盖。不存在“合并现有卡片新历史再重放FSRS”的公开路径，不虚构额外调度器。迁移先复制校验再切换，原库/哨兵用户文件保留，未删除活动租约。

## 失败与修复（均保留原始证据）

- settings/attempt0选择器同名误匹配；attempt1当前无头Electron原生confirm导致窗口关闭，改仅测试确认答案adapter，attempt2/最终attempt3通过。
- schedule/attempt0夹具重新打开已有复盘页正确被拒绝；attempt1/2误查不存在关联表，改真实settings前缀。attempt3/4通过，撤销保留审计及revision，仅原FSRS字段/due精确恢复。
- recycle/attempt0未打开更多菜单，真实按钮不可见；补公开入口后attempt1通过。
- backup-merge/attempt0复现stale拒绝后客户端握手未重置，已修ready；attempt1/2复现will-navigate连可信自身刷新也阻断，reload-before.json实证；仅允许精确当前可信URL，外链仍拒绝。首次外链探针因没等事件失败，最终有界事件等待通过。attempt3/4九组通过。
- visual-final/attempt0发现错误980断点，修850/610并保留before-layout图；attempt1/2是对照模型未计真实长表单的15px滚动条及1250px居中，改为精确测量/公式断言，未放宽任意差值。attempt3/4通过；最终补左对齐和窄列实际预览，详见VISUAL-DIFFERENCES。
- 各轮构建/失败JSON/PNG/DOM保留；文本日志仅去行尾空白，未改结果。

## 跨层与未运行项

VISUAL（R6范围）、UI_INTERACTION、IPC_API、BACKEND_INTEGRATION、PERSISTENCE_RESTART、NEGATIVE_SECURITY、REGRESSION：PASS。GITHUB_REMOTE_SAVE：已核验五检查点；最终封口待独立读回。

Windows10/11实机、物理剪贴板、中文IME、Windows跨卷/长路径/便携同包：NOT_RUN，归R8；全应用严格视觉与R1遗留整合：NOT_RUN，归R7。CI未轮询/未等待，本报告不声称CI通过。R5未受影响结果按原有效记录继承，未重复开发/全量测试。

远端保存事件：production-data-900及prototype-trash-1366两张截图曾被自动审批以“保留授权不足/潜在敏感截图”拒绝。重新核对原任务第九节明确授权、仓库与精确hash、b2合成来源和PNG无文本元数据，并重新目视检查后，同一未改动PNG经同一接口获准；未改编码/换通道绕过。记录见evidence/upload-review.json。此为上传审批事件，不是产品测试FAIL；全部截图/最终提交尚待封口核验。

第二张为公开冻结原型的空回收站，重新目视和读取GitHub原型源码确认无真实数据，再依据原任务明确授权上传同一字节获准。另有执行连接短暂断开并恢复，剩余PNG未重生成、hash一致；详情同upload-review.json。
