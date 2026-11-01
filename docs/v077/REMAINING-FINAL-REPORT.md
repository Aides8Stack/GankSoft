# 2026-10-30 C1/C2/C3最终保存交接（优先于历史）

本轮执行结束，新增24PASS/0产品FAIL/2最终TEST_INFRA，权威235PASS/0FAIL/3BLOCKED/12NOT_RUN。C1 7PASS+EDITOR-12设施遗留，C2 17PASS+SET-08设施遗留；两项均已耗尽本轮2次上限，不再自动执行。非Windows验收不能标全部完成。

唯一报告docs/v077/NONWINDOWS-FINAL-REPORT.md；逐CASE及脚本SHA evidence/C1-RESULTS.json、C2-RESULTS.json；严格汇总evidence/C3-AUDIT.json。C1已保存3ede63b6c3aae1ed30648ccd94f673ca030a6eee，C2已保存40389230ec2c4717e206a94a1db9d528fd34f24c，均完整tree核验相等。最终C3完整SHA由此文件Git历史解析。

保持F4生产基线af4cda73ed98645f4e2e171197a2b6b129e54776与指纹15339498e14c8c5fc2e31b60e3ca86a37910c486f246fe80cb0ad0c738b44907，零安装/构建/生产修改。精确执行SHA分别5ec44a9c79eb34f7d3f756e00f4cef86d6f2bb31、bdeb11785cf60c108f740e0585e332238adbbd9e、112c66e527491e5c18655f05ab022ccc903a1883、f1ef99d0a1e74e137177bd7669cf93aaec27f21b。原始证据1819375字节已保存，回执evidence/C1-C2-EVIDENCE-ARCHIVE.json；实际增量bundle可恢复本地精确提交。

Windows的WIN-01～09/BACK-14保留NOT_RUN，NEW-13/CLIP-03/CLIP-09保持BLOCKED；GH-16/17/21未凭Linux关闭，需Win10/11便携版物理IME/剪贴板完整链。下一入口报告Windows交接段/windows-platform.mjs/run.mjs。本轮只结束，绝不等待CI、合并、发布、再开Linux批次或Windows执行。

---

# 2026-10-30 最终并发保存：R3仅独立旧生产证据

保存前远端前移至4406cc95f3f4b1b6279b6248daf4dee66b4adc36，F1修改src/unified/UnifiedCatalogEditor.vue和src/unified/v37/responsive.css，生产输入从fa6aaa…变为5c52ef…；保留对方全部修复、报告、脚本和账本结果。

本Work R1/R2已在生产变化前保存，另一Work已逐CASE保留。R3实跑18条/16PASS/2TEST_INFRA，只测旧生产96d68d72，**不晋升新生产HEAD**。本地旧生产候选222PASS/5FAIL/3BLOCKED/20NOT_RUN仅是独立快照；不是最新权威状态。

**最新远端250总账：208 PASS /3 FAIL /3 BLOCKED /36 NOT_RUN；P1 NOT_RUN=18（8非Windows+10Windows），P2 NOT_RUN=18。** 本轮66唯一尝试（65GUI）实际54PASS/2PRODUCT_FAILURE/10TEST_INFRA，其中R1/R2的38PASS+2FAIL已入账，R3的16PASS未晋升。F1另将ENV-05/CAT-03两既存FAIL修复为PASS。

下一轮在新生产冻结后，仅P2的18条需要当前源码验收（旧R3证据可供定位，不能算当前回归通过），另有8条P1非Windows设施遗留。共26条非Windows NOT_RUN，10条Windows专项及3条原生P0 BLOCKED保持隔离。具体CASE/驱动原因见docs/v077/REMAINING-FINAL-REPORT.md。当前专项每条一次上限已耗尽，不擅自再跑；本轮保存核验后结束。

---

# GankSoft v0.7.7 剩余P1/P2执行收尾（2026-10-30）

本轮授权的R1/R2/R3均执行并收尾；用例尚未全部通过，不宣称整个测试阶段DONE。66个唯一CASE尝试、66次尝试，每条仅本专项一次；65条进入真实GUI，MEDIA-02停在fixture。没有重开旧B1–B4运行目录或修改其证据。优先4Worker，资源/超时条件自动降2，实测各阶段为4Worker。

| 检查点 | 唯一CASE | PASS | PRODUCT_FAILURE | TEST_INFRA | BLOCKED |
| --- | ---: | ---: | ---: | ---: | ---: |
| R1 B2当前生产重验 | 34 | 28 | 2 | 4 | 0 |
| R2 独立设施专项 | 14 | 10 | 0 | 4 | 0 |
| R3 P2 | 18 | 16 | 0 | 2 | 0 |
| 合计 | 66 | 54 | 2 | 10 | 0 |

10 TEST_INFRA保持NOT_RUN，不与NOT_RUN双计。原168 PASS增加54，原3 FAIL增加2；冻结生产本地候选快照222 PASS /5 FAIL /3 BLOCKED /20 NOT_RUN；并发后R3不晋升。最新权威总账及剩余数量见文首并发说明。

产品故障：EDITOR-10/MD-02再次复现此前旧B2字符移位症状，GUI输入后的错误正文已进入SQLite，本轮将这2条晋升为当前生产FAIL，复用原一组缺陷AUTO-EDITOR-10-edcae784ef2d及其重复项，不新增重复BUG。不修生产；其余3个既存FAIL及所有历史有效结果原样保留。

## 下一轮具体遗留

| CASE | 最后设施原因/恢复入口 |
| --- | --- |
| EDITOR-11 | 已选择实际文本，但公式/表格后颜色标记未得到可信完成；需追踪GUI选区/工具栏颜色交互，不能预判产品故障 |
| EDITOR-12 | 列插入按钮已出现，浮动格式工具栏拦截鼠标；需通过正常滚动/焦点使按钮可操作，禁止force点击冒充GUI |
| EDITOR-13 | Markdown颜色标签打断原始文本连续子串，saveDraft等待条件不匹配；需DOM可读文本和结构化标记分别核对，保留范围断言 |
| CLIP-10 | 暴露的clipboard代理没有readImage；需按实际异步read/ClipboardItem接口核验格式，保留JPEG/WebP实际解码、保存和重启 |
| PLAN-08 | 保存成功状态出现两个role=status，严格选择器冲突；后续需补完下一张与返回，局部成功不算PASS |
| REVIEW-15 | 同一重复状态选择器阻断；两卡完整提交/结束/新会话链未完成 |
| MEDIA-02 | fixture改从summary读title后，getPublishedContent.revision仍undefined；从summary读取revision后再验证共享图片跨卡/知识点引用；本次没进入GUI |
| FAULT-11 | 第二次选卡仍残留旧勾选；需先取消列表所有勾选，保持两独立session和无串事件断言 |
| SET-07 | 复制Prompt后对话框已关闭，“Prompt已复制”在页面；应等页面status后核对真实renderer剪贴板 |
| SET-08 | drop回执后未出现预设alert，流程可能已通过receipt自动恢复；先看console/diagnostics的operation.status路径，再设计真正unknown夹具，不将成功恢复当产品失败 |

本次专项目标每条至多一次已耗尽，不在本轮重试以上10条；后续另获专项授权后方可再执行。R2的BACK-09/EX-13除原GUI链外，还只读审核了本轮保存的重启后SQLite快照：不同卡/集ID、历史条数/评分/等级/时间、FSRS due/stability/difficulty/reps一致，BACK-09当前图片引用数、宽度和二进制哈希一致；审核本身不是新CASE运行。

## 生产身份与保存

生产冻结96d68d72db51ef7b18a0f1ecafa3e4db9176b976；414输出来自c1b5f426f460cf205ff91231cfc4e29ecc37ff95，指纹fa6aaa247a036934ec72886879ae93e1f6da8af64bbcefb83e74e5d6ead70096。开始/结束environment status均REUSE+valid，零安装/编译。所有脚本SHA及同tree GitHub映射见evidence/REMAINING-SOURCE-IDENTITY.json。通过连接器以远端HEAD为父、原tree为底、expected_sha+force=false保存，非强推；脚本均先静态检查并本地不可变commit，R2/R3驱动远端保存后执行，R1驱动远端保存与首轮启动重叠但测试脚本始终冻结。

每检查点均collect dry-run/write、strict promote dry-run/write。保留历史报告与证据，按CASE增加结果；逐对象核验原非NOT_RUN案例均未改，所有Windows字段均未改。所有生产路径src/shared/electron、版本及锁文件与基线无diff。四Worker调度专项4/4 PASS、修改脚本node --check、git diff --check通过。曾误用.ts扩展名启动专项测试而未运行，已改为真实.mjs入口4/4通过，不计CASE尝试。

Linux/Node24.22.1/Electron44.9.1/Schema606；每CASE独立进程/headless GUI后端/原生剪贴板、临时数据库/userData与证据。只用合成数据，未访问用户库。Windows的WIN-01～09/BACK-14共10条继续NOT_RUN，P0 NEW-13/CLIP-03/CLIP-09保持BLOCKED；后续入口为真实Win10/11交互客户端及windows-platform.mjs/run.mjs，托管Server代理不可替代签核。

本轮不改生产BUG、不合并、不发布、不等CI；最终保存核验后结束，不进入第四检查点。原始summary/case/console/SQLite读回/截图、运行identity与精确本地脚本bundle独立打包，包回执见evidence/REMAINING-EVIDENCE-ARCHIVE.json（在包生成后另存，不要求包包含自身回执）。

最终设施自检补记：并发F1后B1已无NOT_RUN，旧单测用真实账本空集合检查“缺处理器抛错”，导致Missing expected exception（3/4）。已改为独立克隆夹具明确保留一个B1 NOT_RUN，再验证无处理器必须拒绝、已注册必须选中；没有改权威账本或削弱缺处理器断言，复验4/4 PASS。该纯单测夹具修正晚于原始实测证据包，仅在GitHub保存，不改动任何CASE结果或实际脚本SHA。
