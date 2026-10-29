# 下一 Work 最小恢复入口

仓库 Aides8Stack/GankSoft；唯一分支 feature/v075-unified-learning-workspace；原 Draft PR #15 → develop。修复基线 80e5f8dd2aa0f3487aad88626125f57fb06bfeb5；最终完整 SHA 从远端 HEAD/本文件 Git 历史解析。

本轮仅修 run 40807670304 两项阻断，已经完成两个修复检查点并保存退出：
- Ubuntu ui-v076.ts P1 旧选择器/按钮名已修；本地真实 P1 PASS（六个三宽检查+会话恢复；四项统计、原sessionId/cardId核验），正常正式 UI 未改。
- Electron首次懒下载移入独立必需环境准备门禁：锁定44.9.1原installer/校验缓存；验证实际文件、版本、平台、架构。Linux真实下载及复用PASS；错误架构覆盖拒绝PASS。Windows预检待CI；M08维持180秒并使用已安装路径，不再自行懒下载。质量报告分别记录各步耗时。

构建、原S8.b隔离262模块/410产物、CI core 5/5、语法/diff PASS。562项业务/协议/既有M08数据专项有效证据继承，不重复运行。权威精简说明：docs/v076/rebuild-v37-source-first/stages/R7/R7.4-M08-CI.md 末节；本轮证据 evidence/r74/m08-ci-final/。

M08 BLOCKED；Windows预检及正式Electron六组 NOT_RUN；R7.5未进入。下一轮仅读取最终SHA现有CI结果，不重复已通过测试：
1. Windows validation-results/ci/electron-preparation.json：先分清网络/文件/运行时环境失败；此时M08六组保持NOT_RUN。
2. Windows validation-results/m08-integrity/report.json 及 ci/quality.json：核对真实6/6、来源SHA/指纹、各步骤耗时。
3. Ubuntu validation-results/v076/P1/result.json 和质量阻断状态。
若真实6/6且相关质量阻断解除，直接按既有R7.5-ENTRY.md关闭对应Gate并进入精简验收；否则只处理实际失败项。禁止重新审计R0–R7、新增功能、扩大测试矩阵。

不等待/轮询CI，不新分支/PR、不强推、不合并发布。pr-trust由所有者最终稳定SHA复核，不能自动批准；R8和Win10/11人工项仍NOT_RUN。
