# 本轮M08测试

仓库Aides8Stack/GankSoft，唯一分支feature/v075-unified-learning-workspace，原Draft PR15→develop。基线b66d43d6884f52aab374a6f9e68027fe0d7e7a1a，版本0.7.6-rc.1，Schema606。

M08数据修复已实现，受影响169/169及最终新专项18/18、协议21/边界/类型/160方法和构建PASS。M08整体BLOCKED：正式Electron在创建页面前SIGTRAP/socket EPERM，两次0组；不得把领域通过当UI通过。M01–M07/B01/N01–N03继承DONE，B02仍交R8 NOT_RUN；R7.4/R7.3/R1/R7 IN_PROGRESS，R7.5/R8 NOT_STARTED。

权威恢复：docs/v076/rebuild-v37-source-first/stages/R7/R7.4-M08-INTEGRITY.md；证据同目录evidence/r74/m08-integrity/。此前逐轮历史保留在Git及独立阶段报告，勿反复读取。

- PASS：17文件受影响测试169/169（命令见checks.json），随后仅新增独立PID用例后，新专项18/18 PASS。不相加、不冒称全量重跑。
- PASS：npm run check:protocol（21项/边界/类型/160方法）；npm run build。
- BLOCKED：node --experimental-strip-types tools/validation/r7/m08-integrity.ts。普通及隔离profile在页面创建前SIGTRAP/socket EPERM，0组执行；6组UI全部NOT_RUN。
- Windows/物理输入/性能：NOT_RUN；B02交R8。

实际失败：测试夹具将direct模式已冻结思路再改写，改为真实qa答题→揭示流程；旧memory_cards.legacy_question_id共享源题触发正确保护，增加明确拒绝用例，并在构建原始合成源时另设无共享源关系的独占删除用例。旧整集删除遗留media-draft.deckId导致重开失败，已修为仅删除独占元数据并保留文件，实际备份/重开PASS。Electron平台失败不记产品通过。
