# 2026-10-30 最终并发保存：R3仅独立旧生产证据

保存前远端前移至4406cc95f3f4b1b6279b6248daf4dee66b4adc36，F1修改src/unified/UnifiedCatalogEditor.vue和src/unified/v37/responsive.css，生产输入从fa6aaa…变为5c52ef…；保留对方全部修复、报告、脚本和账本结果。

本Work R1/R2已在生产变化前保存，另一Work已逐CASE保留。R3实跑18条/16PASS/2TEST_INFRA，只测旧生产96d68d72，**不晋升新生产HEAD**。本地旧生产候选222PASS/5FAIL/3BLOCKED/20NOT_RUN仅是独立快照；不是最新权威状态。

**最新远端250总账：208 PASS /3 FAIL /3 BLOCKED /36 NOT_RUN；P1 NOT_RUN=18（8非Windows+10Windows），P2 NOT_RUN=18。** 本轮66唯一尝试（65GUI）实际54PASS/2PRODUCT_FAILURE/10TEST_INFRA，其中R1/R2的38PASS+2FAIL已入账，R3的16PASS未晋升。F1另将ENV-05/CAT-03两既存FAIL修复为PASS。

下一轮在新生产冻结后，仅P2的18条需要当前源码验收（旧R3证据可供定位，不能算当前回归通过），另有8条P1非Windows设施遗留。共26条非Windows NOT_RUN，10条Windows专项及3条原生P0 BLOCKED保持隔离。具体CASE/驱动原因见docs/v077/REMAINING-FINAL-REPORT.md。当前专项每条一次上限已耗尽，不擅自再跑；本轮保存核验后结束。

---

# v0.7.7 剩余测试 R3 — 2026-10-30

实际唯一 CASE：18；{'PASS': 16, 'TEST_INFRA': 2}。每条本专项仅一次，不追加旧B1–B4重试。

生产冻结SHA：96d68d72db51ef7b18a0f1ecafa3e4db9176b976；构建来自c1b5f426f460cf205ff91231cfc4e29ecc37ff95，生产输入指纹fa6aaa247a036934ec72886879ae93e1f6da8af64bbcefb83e74e5d6ead70096；414输出逐哈希复用，零安装/编译。实际脚本SHA：4f74a18b9507c09f8b26cbdeb32534a5c20794e7。

四Worker，每CASE独立Electron/headless后端、Schema606、userData、合成文件和证据；异常自动降2。Linux剪贴板/对话框合成输入不等于Windows实机。没有改生产源码，没有合并、发布或等待CI。

逐CASE步骤、真实case回执与原始文件哈希见 evidence/REMAINING-R3-RESULTS.json；完整GUI、SQLite、重启和截图留独立原始证据包。旧B2和其他历史报告未覆盖。

| CASE | 分类 | 原因 |
| --- | --- | --- |
| HOME-03 | PASS | UI actions + persisted readback succeeded |
| HOME-04 | PASS | UI actions + persisted readback succeeded |
| HOME-05 | PASS | UI actions + persisted readback succeeded |
| HOME-06 | PASS | UI actions + persisted readback succeeded |
| HOME-07 | PASS | UI actions + persisted readback succeeded |
| HOME-08 | PASS | UI actions + persisted readback succeeded |
| AN-02 | PASS | UI actions + persisted readback succeeded |
| AN-03 | PASS | UI actions + persisted readback succeeded |
| AN-04 | PASS | UI actions + persisted readback succeeded |
| AN-05 | PASS | UI actions + persisted readback succeeded |
| AN-08 | PASS | UI actions + persisted readback succeeded |
| SET-05 | PASS | UI actions + persisted readback succeeded |
| SET-06 | PASS | UI actions + persisted readback succeeded |
| SET-07 | TEST_INFRA | locator.waitFor: Timeout 15000ms exceeded. |
| SET-08 | TEST_INFRA | locator.waitFor: Timeout 15000ms exceeded. |
| SET-09 | PASS | UI actions + persisted readback succeeded |
| SET-10 | PASS | UI actions + persisted readback succeeded |
| SET-11 | PASS | UI actions + persisted readback succeeded |

collect dry-run/write、strict promote dry-run/write已执行。冻结生产本地候选总账（未晋升新生产）：{'PASS': 222, 'FAIL': 5, 'BLOCKED': 3, 'NOT_RUN': 20}。Windows字段未改，其他CASE保持。
