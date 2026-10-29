# 本轮实际测试

仓库Aides8Stack/GankSoft；唯一分支feature/v075-unified-learning-workspace；原Draft PR15→develop；版本0.7.6-rc.1，Schema606。

M01/B01/N02 DONE；M02–M07/N01/N03继承DONE。M08原生安全执行已实现，但旧历史外键/版本化知识存档/未知共享恢复范围BLOCKED。B02移交R8 NOT_RUN。R7.4/R7.3/R1/R7 IN_PROGRESS，严格整体验收BLOCKED；R7.5/R8 NOT_STARTED。

检查点一249ed83dfc01fc3db92cf5df775542f176c73a7c（13文件）；检查点二6b7d220929e88440f31dec7dc9cea2641dba9035（21文件），各自parent/完整tree/变更blob独立读回一致。最终文档提交SHA由Git历史及分支HEAD解析，禁止为填写自身SHA无限提交。

权威本轮记录：docs/v076/rebuild-v37-source-first/stages/R7/R7.4-FINAL.md；原生删除合同：同目录R7.4-NATIVE-PURGE-DESIGN.md。此前完整开发日志保留在Git历史249ed83dfc01fc3db92cf5df775542f176c73a7c及各阶段独立报告；此处只保留当前恢复所需信息。

安全专项15/15、正式删除Electron6组/三类三宽9检查、图谱最终3组及前序受影响A4组、协议21项/边界/类型/160方法导出、生产构建PASS。全量业务537/537曾在本轮通过；之后只增加6项安全专项与精确影响计数/存档依赖/中文标签，受影响项复验PASS，未宣称最终543项全量重跑。Windows、性能及物理输入NOT_RUN。

| 命令 | 结果 | 范围 |
| --- | --- | --- |
| npm test | PASS | 537/537，末次局部细化前；不冒称最终全量重跑 |
| node --experimental-strip-types --test --test-concurrency=1 tests/recycle-native-purge-v076.test.ts | PASS | 最终15/15 |
| node --experimental-strip-types tools/validation/r7/final-purge.ts | PASS | 最终正式Electron6组、三类三宽9检查 |
| node --experimental-strip-types tools/validation/r7/final-graph.ts | PASS | 正式3组及三宽/900导航 |
| R74_UNIT=A R74_NO_IMAGES=1 R74_CACHE=validation-results/r745/pristine R74_ATTEMPT=final-single-root node --experimental-strip-types tools/validation/r7/r74-round1.ts | PASS | 本轮图谱A4组，非重复计数 |
| npm run check:protocol | PASS | 协议21项/边界/类型/160方法导出 |
| npm run build | PASS | 最终Vue/main/preload构建 |

最终源码SHA256及必要文本证据：stages/R7/evidence/r74/final/purge-checks.json、purge-electron.json、graph.json。原始运行日志留本地，不上传大证据。

失败归因：离线npm ci缺zwitch缓存，随后复用锁哈希相同的现存依赖；测试夹具最初未保存复盘草稿、把expectedDraftRevision写为0、误用client.call第三参数、在软删除前比较相邻节点显示position，均修正真实协议调用/比较时点后完整专项PASS。直接改epoch被owner拒绝且回滚，真正epoch更换由真实备份恢复验证。未删断言、未降低安全门槛。
