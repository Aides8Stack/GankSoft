# v0.7.7 剩余测试 R1 — 2026-10-30

实际唯一 CASE：34；{'PASS': 28, 'PRODUCT_FAILURE': 2, 'TEST_INFRA': 4}。每条本专项仅一次，不追加旧B1–B4重试。

生产冻结SHA：96d68d72db51ef7b18a0f1ecafa3e4db9176b976；构建来自c1b5f426f460cf205ff91231cfc4e29ecc37ff95，生产输入指纹fa6aaa247a036934ec72886879ae93e1f6da8af64bbcefb83e74e5d6ead70096；414输出逐哈希复用，零安装/编译。实际脚本SHA：59af65999feb4439955276bfcd86c87d8639cb6f。

四Worker，每CASE独立Electron/headless后端、Schema606、userData、合成文件和证据；异常自动降2。Linux剪贴板/对话框合成输入不等于Windows实机。没有改生产源码，没有合并、发布或等待CI。

逐CASE步骤、真实case回执与原始文件哈希见 evidence/REMAINING-R1-RESULTS.json；完整GUI、SQLite、重启和截图留独立原始证据包。旧B2和其他历史报告未覆盖。

| CASE | 分类 | 原因 |
| --- | --- | --- |
| EDITOR-01 | PASS | UI actions + persisted readback succeeded |
| EDITOR-02 | PASS | UI actions + persisted readback succeeded |
| EDITOR-04 | PASS | UI actions + persisted readback succeeded |
| EDITOR-05 | PASS | UI actions + persisted readback succeeded |
| EDITOR-07 | PASS | UI actions + persisted readback succeeded |
| EDITOR-08 | PASS | UI actions + persisted readback succeeded |
| EDITOR-09 | PASS | UI actions + persisted readback succeeded |
| EDITOR-10 | PRODUCT_FAILURE | GUI keyboard input characters displaced; persisted SQLite Markdown corroborates failure |
| EDITOR-11 | TEST_INFRA | AssertionError [ERR_ASSERTION]: The input did not match the regular expression /data-gank-color/#336699/. Input: |
| EDITOR-12 | TEST_INFRA | locator.click: Timeout 15000ms exceeded. |
| EDITOR-13 | TEST_INFRA | Error: DRAFT_NOT_DURABLY_READABLE: B2 保持发布和历史; {"summary":{"cardId":"9a79acfb-04ac-4d62-a76f-17bf9ac787db","title":"B2 保持发布和历史","draftType":"direct","revision":1,"publishedRevision":1,"updatedAt":"2026-10-30T11:49:02.169Z","isNew":false},"storedField":"<span data-gank-color=\"#336699\">彩色段</span>落\n |
| EDITOR-14 | PASS | UI actions + persisted readback succeeded |
| EDITOR-15 | PASS | UI actions + persisted readback succeeded |
| EDITOR-16 | PASS | UI actions + persisted readback succeeded |
| EDITOR-17 | PASS | UI actions + persisted readback succeeded |
| EDITOR-18 | PASS | UI actions + persisted readback succeeded |
| EDITOR-19 | PASS | UI actions + persisted readback succeeded |
| CLIP-05 | PASS | UI actions + persisted readback succeeded |
| CLIP-06 | PASS | UI actions + persisted readback succeeded |
| CLIP-07 | PASS | UI actions + persisted readback succeeded |
| CLIP-08 | PASS | UI actions + persisted readback succeeded |
| CLIP-10 | TEST_INFRA | electronApplication.evaluate: TypeError: clipboard.readImage is not a function |
| CLIP-11 | PASS | UI actions + persisted readback succeeded |
| CLIP-12 | PASS | UI actions + persisted readback succeeded |
| CLIP-13 | PASS | UI actions + persisted readback succeeded |
| MD-02 | PRODUCT_FAILURE | GUI keyboard input characters displaced; persisted SQLite Markdown corroborates failure |
| MD-03 | PASS | UI actions + persisted readback succeeded |
| MD-04 | PASS | UI actions + persisted readback succeeded |
| MD-05 | PASS | UI actions + persisted readback succeeded |
| MD-06 | PASS | UI actions + persisted readback succeeded |
| MD-08 | PASS | UI actions + persisted readback succeeded |
| MD-09 | PASS | UI actions + persisted readback succeeded |
| MD-10 | PASS | UI actions + persisted readback succeeded |
| MD-11 | PASS | UI actions + persisted readback succeeded |

collect dry-run/write、strict promote dry-run/write已执行。最新250总账：{'PASS': 196, 'FAIL': 5, 'NOT_RUN': 46, 'BLOCKED': 3}。Windows字段未改，其他CASE保持。

EDITOR-10/MD-02：快捷语法输入后字符移位，GUI与SQLite一致，当前生产复现旧报告症状，按一组缺陷跟踪；无业务修复。CLIP-12去除原CASE不要求的asset去重假设，保留两次Ctrl+V、placement独立、30/80宽度与重启断言，PASS。4设施遗留：EDITOR-11颜色应用未得到可信完成；EDITOR-12浮动工具栏拦截列按钮；EDITOR-13颜色标记打断Markdown原文连续匹配；CLIP-10暴露的clipboard代理无readImage API。本专项不重试。
