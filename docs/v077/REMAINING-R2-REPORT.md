# v0.7.7 剩余测试 R2 — 2026-10-30

实际唯一 CASE：14；{'PASS': 10, 'TEST_INFRA': 4}。每条本专项仅一次，不追加旧B1–B4重试。

生产冻结SHA：96d68d72db51ef7b18a0f1ecafa3e4db9176b976；构建来自c1b5f426f460cf205ff91231cfc4e29ecc37ff95，生产输入指纹fa6aaa247a036934ec72886879ae93e1f6da8af64bbcefb83e74e5d6ead70096；414输出逐哈希复用，零安装/编译。实际脚本SHA：1bf75f033b53828c60b23deab5ff899100a16445。

四Worker，每CASE独立Electron/headless后端、Schema606、userData、合成文件和证据；异常自动降2。Linux剪贴板/对话框合成输入不等于Windows实机。没有改生产源码，没有合并、发布或等待CI。

逐CASE步骤、真实case回执与原始文件哈希见 evidence/REMAINING-R2-RESULTS.json；完整GUI、SQLite、重启和截图留独立原始证据包。旧B2和其他历史报告未覆盖。

| CASE | 分类 | 原因 |
| --- | --- | --- |
| CAT-07 | PASS | UI actions + persisted readback succeeded |
| NEW-08 | PASS | UI actions + persisted readback succeeded |
| PLAN-08 | TEST_INFRA | locator.waitFor: Error: strict mode violation: getByRole('status').filter({ hasText: '复盘已保存' }) resolved to 2 elements: |
| REVIEW-07 | PASS | UI actions + persisted readback succeeded |
| REVIEW-08 | PASS | UI actions + persisted readback succeeded |
| REVIEW-09 | PASS | UI actions + persisted readback succeeded |
| REVIEW-12 | PASS | UI actions + persisted readback succeeded |
| REVIEW-13 | PASS | UI actions + persisted readback succeeded |
| REVIEW-14 | PASS | UI actions + persisted readback succeeded |
| REVIEW-15 | TEST_INFRA | locator.waitFor: Error: strict mode violation: getByRole('status').filter({ hasText: '复盘已保存' }) resolved to 2 elements: |
| MEDIA-02 | TEST_INFRA | Fixture protocol expectedPublishedRevision undefined; no GUI launch, not platform BLOCKED |
| EX-13 | PASS | UI actions + persisted readback succeeded |
| BACK-09 | PASS | UI actions + persisted readback succeeded |
| FAULT-11 | TEST_INFRA | locator.waitFor: Timeout 15000ms exceeded. |

collect dry-run/write、strict promote dry-run/write已执行。最新250总账：{'PASS': 206, 'FAIL': 5, 'NOT_RUN': 36, 'BLOCKED': 3}。Windows字段未改，其他CASE保持。
