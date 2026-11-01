# GankSoft v0.7.7 非Windows测试最终收尾

本轮C1、C2、C3三个检查点已执行并停止；非Windows验收尚有2条设施遗留，不能宣称全部通过。26条唯一CASE，30次有界尝试，最终24 PASS / 0 PRODUCT_FAILURE / 2 TEST_INFRA。首次执行26次，仅4条确认设施原因后各定向补验一次；实际尝试合计24 PASS / 6 TEST_INFRA，不把尝试数量当作CASE数量。没有自动重跑业务FAIL。

250条权威总账：**235 PASS / 0 FAIL / 3 BLOCKED / 12 NOT_RUN**。只改变24条原NOT_RUN，原211PASS和3BLOCKED、全部Windows层逐对象核验不变。EDITOR-12、SET-08仍NOT_RUN；不将设施问题记成产品FAIL。

## C1逐CASE

| CASE | 结论 |
| --- | --- |
| EDITOR-11 | PASS |
| EDITOR-12 | TEST_INFRA |
| EDITOR-13 | PASS |
| CLIP-10 | PASS |
| PLAN-08 | PASS |
| REVIEW-15 | PASS |
| MEDIA-02 | PASS |
| FAULT-11 | PASS |

## C2逐CASE

| CASE | 结论 |
| --- | --- |
| HOME-03 | PASS |
| HOME-04 | PASS |
| HOME-05 | PASS |
| HOME-06 | PASS |
| HOME-07 | PASS |
| HOME-08 | PASS |
| AN-02 | PASS |
| AN-03 | PASS |
| AN-04 | PASS |
| AN-05 | PASS |
| AN-08 | PASS |
| SET-05 | PASS |
| SET-06 | PASS |
| SET-07 | PASS |
| SET-08 | TEST_INFRA |
| SET-09 | PASS |
| SET-10 | PASS |
| SET-11 | PASS |

## 遗留与证据边界

- EDITOR-12：正常焦点/鼠标点击列按钮后仍两列；等待真实DOM变化也超时，无法排除悬浮handle意图/失焦设施因素。没有force click、改业务、降断言；两次已耗尽，不再重试，不足以认定产品FAIL。
- SET-08：首轮已核验operation.status自动恢复、实际备份和receipt；隐藏传输回执不等于后端pending。补验用临时根目录作为备份目标制造真实文件写入失败，读回pending且response=null；记录核对结果时headless dialog.accept异常导致进程退出。C3只读SQLite独立核实：一笔completed有receipt、一笔pending无receipt，0 resolve receipt。没有完成解除待核对链，保持NOT_RUN。最终脚本改用既有window.confirm适配方式，未执行第三次，不冒称修好或PASS。
- 运行中没有生产变化。所有生产输入、Schema606、锁文件和构建输出保持冻结；零安装、零构建。C1/C2正式报告与逐脚本SHA保存，精简CASE保留sourceSha/runId/操作/证据索引，新旧源码证据不混用。

## 真实SHA与环境

生产基线：`af4cda73ed98645f4e2e171197a2b6b129e54776`；F4实现SHA `c8e133e2ced59bc7f9cf9e58c36d75fdc7995f19`。生产指纹 `15339498e14c8c5fc2e31b60e3ca86a37910c486f246fe80cb0ad0c738b44907`，496输出，来源构建SHA `5957c89484de21b3eb77e8deb7c1a8f9206607c4`。开始/结束environment均REUSE+valid；Node24.22.1/Electron44.9.1/Linux x64，独立真实Electron/Playwright GUI、临时Schema606合成库，无用户学习库。

| 执行 | 实际本地测试SHA |
| --- | --- |
| C1首轮 | 5ec44a9c79eb34f7d3f756e00f4cef86d6f2bb31 |
| C1唯一补验 | bdeb11785cf60c108f740e0585e332238adbbd9e |
| C2首轮 | 112c66e527491e5c18655f05ab022ccc903a1883 |
| C2唯一补验 | f1ef99d0a1e74e137177bd7669cf93aaec27f21b |

C1远端保存 `3ede63b6c3aae1ed30648ccd94f673ca030a6eee`，完整tree `36d4480dc760d1391f3ce52e022b1540fbb241a8` 与本地C1检查点完全相等。C2远端保存 `40389230ec2c4717e206a94a1db9d528fd34f24c`，完整tree `5455141d38f56f84637394c7b9ab40df9ed009f1` 与本地 `a8adf0b03321818a1ca0c28914d580bb9c3eb117`完全相等。连接器保存与本地测试SHA分别列明，未冒称测试提交元数据也相同。精确本地提交均在增量source bundle，可从生产基线恢复。最终C3 SHA通过Git历史/远端HEAD解析，避免写入自身SHA循环提交。

审核：collect dry-run/write、strict promote仅晋升24可信PASS；aggregateReports验证26唯一ID/每项最多2次/每项最多1可信结果；四Worker调度单测4/4 PASS；所有修改测试脚本语法和git diff --check通过；生产路径无diff，Windows字段未改。未重跑250/B1-B4/R1-R3，未等待CI、合并develop、发布或进入Windows。

## Windows交接

10条继续NOT_RUN：WIN-01～09、BACK-14。3条P0继续BLOCKED：NEW-13、CLIP-03、CLIP-09。非Windows真正未完成：EDITOR-12、SET-08（设施结论，不是未尝试）。本轮自动执行结束，不再启动批次；后续如需补齐，须新专项授权且保留两次旧证据。

GH-16题干粘贴UNSUPPORTED_HTML、GH-17保存后草稿箱找不到、GH-21保存草稿/发布无响应，保持Windows待实机核验，不凭Linux PASS关闭。需要Windows10与Windows11 x64交互桌面、对应来源的便携包和哈希、物理中文输入法、JPEG/WebP/HTML真实剪贴板、可写临时Schema606库。使用同一包执行题干粘贴→保存→草稿箱→重开→发布→重启完整操作链，保留反馈及数据结果。入口 tools/validation/v077/windows-platform.mjs、run.mjs及本报告；无头Linux不能替代Windows签核。

## 原始归档

原始运行、失败截图/日志、数据读回、496输出清单与精确本地source bundle打包，1,819,375 bytes，200成员，SHA256 `125572bcea701fef760b6b46a5b1fa1e44cd47259b96d633758dfaaec888f0f5`；ZIP CRC和每成员哈希验证通过，保存成功。回执 evidence/C1-C2-EVIDENCE-ARCHIVE.json；C3只读审核与回执在归档生成后另存GitHub，不要求压缩包包含自身回执。未把PNG、依赖、构建、数据库或bundle提交GitHub。
