# B2 验收 — DONE（2026-10-28最终）

B2.1继承DONE；B2.2 DONE；B2.3 DONE。R5.b整体IN_PROGRESS，B3/B4及c/d/R6 NOT_STARTED。

| 必要门槛 | 结果 | 证据 |
| --- | --- | --- |
| 单一可写实例、异步初始化/销毁归属、快速切节点与视图 | PASS | 继承实际Vue生命周期2；b22-final.json正式2组，连续写实例计数至多1 |
| 原生撤销/重做/格式及图片引用 | PASS | 真实Crepe原生命令/placement，未自建历史；图片宽度及持久化层级正常 |
| 失败草稿/真实CAS冲突/原请求未知结果核对 | PASS | b23-final.json1/2/7/8，修复前FAIL保留，明确取消/确认，不静默覆盖 |
| 详情关闭/离页/切集、退出后新Electron精确读回 | PASS | b23-final.json3–6；正常退出、不同PID、最后实际请求字节与磁盘/新进程完全一致，cleanup前验证 |
| 无关节点/发布/关联/非空历史/调度/图片字节不变 | PASS | 精确NodeBody/表行/引用/文件SHA对照，非空数据避免假阳性 |
| 可重复小型真实606夹具 | PASS | b2-fixture.ts复用原工具/真实API/实际ID，失效缓存可重建；3节点/1发布/1真实事件，不重建242卡 |
| 生产构建/检查点保存 | PASS / 保存以实际回执为准 | build-final.txt；B2-FINAL-DELIVERY-MANIFEST.json和远端树/关键文件独立核验 |
| Windows/物理剪贴板/IME/全应用严格视觉 | NOT_RUN | R7/R8，B2.1三宽继承；新单幅CAS截图缺CJK字体仅诊断 |

B2全部必要功能/数据安全/正式Electron门槛通过。本Work现在仅保存核验并结束，不进入B3。详细命令/失败归因/最终源码指纹见TEST_REPORT及B2-VALIDATION。以下旧BLOCKED记录为历史，不是当前状态。

---

# B2.2启动恢复安全检查点：最小启动及生命周期门PASS，完整B2.2仍BLOCKED

最小窗口2次正常退出；原生销毁期只读由实际FAIL转PASS，真实Vue异步初始化卸载/替代实例专项PASS。公开setReadonly单点修复，无布局/Schema/历史修改。原/tmp三节点库缺失使正式UI→IPC专项NOT_RUN，不能标B2.2/B2 DONE；下一Work先恢复缓存。详见B2-ACCEPTANCE及evidence/b2-2-recovery。B2.3/B3/c/d/R6未进入，连接器保存独立核验后结束。

---

# R5.b B2.2 当前结论：BLOCKED，R5.b整体IN_PROGRESS

B2.1 DONE和B1有效证据继承。B2.2仅测试WIP，首次测试门卡住exit130、后续Electron启动SIGTRAP/socket hang up，0组验收；没有生产修改或已证实产品修复。B2.3 NOT_STARTED，后续B3/B4/c/d/R6不进入。详见B2-ACCEPTANCE.md与evidence/b2-2。保存核验后结束，下一Work先恢复环境，不清库或活动租约绕开。

---

# 当前：R5.b B2.1 DONE，B2整体 IN_PROGRESS

本轮局部Gate及未完成项以 [B2-ACCEPTANCE.md](B2-ACCEPTANCE.md) 为准。B2.1 7组正式Electron、7项编辑器基础测试、三宽6PNG/DOM与build PASS；B2.2/B2.3 NOT_STARTED，完整安全/失败/未知结果/新进程持久化NOT_RUN。B1继承不重跑，七级导出仍归B3。当前检查点保存后结束，以下保留旧检查点原始记录。

---

# R5.b — IN_PROGRESS（B1 DONE）

| Gate | 状态 | 下一步 |
| --- | --- | --- |
| B1原生/配置/适配/GAP与数据边界 | PASS | B1-CAPABILITIES.md，26/26服务测试；不代表B2–B4通过 |
| B2正文/层级大纲同步、草稿与关闭、原生undo/redo、重启 | NOT_RUN | 复用现有Crepe/SaveController/服务，补正式Electron证据 |
| B3整树/局部/挂载/冲突/正文及图片预览/取消/确认 | NOT_RUN | 服务已存在；待UI适配，六级以上导出GAP必须处理/明确验收限制 |
| B4正式UI→IPC→Schema606、回滚/重启/受影响视觉 | NOT_RUN | 不以B1数据库重开代替Electron退出/重启 |
| 原分支连接器保存与独立读回 | 以本提交实际回执为准 | B1-DELIVERY-MANIFEST.json；不宣称尚未发生的保存 |

R5.a DONE保持；R5.c/d/R6未进入。本Work完成B1稳定检查点后保存核验主动结束，下一Work B2。以下R5.a表为历史有效验收。

---

# R5.a — DONE（C4）

| R5.a必要Gate | 状态 | 证据 |
| --- | --- | --- |
| 原生自动布局/能力对照/禁止自由坐标/多根数据合同 | PASS | C1能力表、C2领域及交互；未改引擎/Schema |
| 公开主题绿色节点/原生选中态恢复 | PASS | C4九状态颜色/原生selected/图像 |
| 右侧编辑器留白、现有工具可见、详情响应/可调整 | PASS | 39px格式栏、6组功能/4组侧栏及入口/9状态 |
| 实际修改节点/层级/正文后退出新进程精确读回 | PASS | c4/interaction.json，cleanupPerformedBeforeVerification=false |
| Unified关联筛选正确传递并排除无关卡 | PASS | 叶节点/父节点真实queue；明确Vue事件，未扩协议 |
| 正式Electron/真实IPC/606/三宽/DOM/CSS/失败保护回归 | PASS | C4+按影响继承C2/C3；合理差异详列 |
| GitHub原分支保存与独立核验 | 以本提交真实回执为准 | C4-DELIVERY-MANIFEST.json逐文件哈希、本提交树与关键文件读回；失败不得宣称DONE已远端保存 |

R5.a局部门槛通过；Windows和全应用严格像素验收仍NOT_RUN，按用户已明确范围移交R7/R8。R5整体IN_PROGRESS，R5.b/c/d NOT_STARTED。本轮仅C4，保存核验后结束，不进入后续阶段。
