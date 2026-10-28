# 2026-10-28 R5.b B2.1 — DONE（B2整体 IN_PROGRESS）

起始远端 `2bfd6246b90cc84cd81393c9b0358fec2c368995`，原分支 `feature/v075-unified-learning-workspace` / Draft PR #15 → develop。此Work完成用户允许的B2.1安全检查点后结束，未进入B3、R5.c/d/R6。

实现多根文档分组、真实父子层级标题、分级目录展开/收起/选中/定位、模块正文独立只读展开；活动节点复用KnowledgeMarkdownPanel/Crepe编辑。只遍历既有Mind Elixir视图，未建立第二套领域树。修复专项发现的快速编辑→切节点漏存：已有原生contentVersion同步识别编辑，切换强制捕获快照/flush，未编辑内容不因序列化产生写入；折叠活动正文用v-show保留草稿。保存控制器、CAS/revision/requestId和业务API均复用，Schema606/FSRS/历史/锁文件未改。

本轮PASS：生产build；`tests/editor-v075.test.ts` 7/7；`tools/validation/r5/b2-outline.ts` 正式Electron 7组、两根九节点/七层/异支同名、零写、折叠草稿与切节点定向保存、搜索定位；三宽生产与冻结原型共6PNG+6DOM/CSS，三张最终生产图人工审阅。正式节点身份/层级/正文来自隔离真实606，未重建242卡夹具。B1的26项交换测试及未受影响R5.a全套未重跑。证据及失败归因见 `stages/R5/B2-ACCEPTANCE.md` 和 `evidence/b2-1/`。

B2.2/B2.3仍NOT_STARTED，完整矩阵NOT_RUN：单一可写实例异步创建/销毁时序、并发节点/图谱-大纲切换、原生undo/redo与既有图片、关闭详情/离页、失败与原请求未知结果核对、Electron退出新进程/数据库重启。当前通过的是稳定界面仅一个可写正文和快速节点切换专项，不能当B2完整验收。下一Work核对最新HEAD，从B2-ACCEPTANCE/R5 PLAN及现有保存链路恢复；不重做B1/B2.1，不以本轮Linux图像冒充Windows验收。

原分支通过连接器base-tree/真实parent、force=false、expected_sha保存；当前检查点完整SHA以Git历史和独立远端读回为准。保存核验后主动结束，不等CI、不合并、不发布。B1七级导出限制仍归B3，未修复。

---

# R5.b B1 — PASS（B1 DONE，R5.b IN_PROGRESS）

基线0eaedd4c4c260d8d008ff3d1f1372ef54be1fc10+本B1测试/文档工作树。生产源码未变，证据指纹见evidence/b1/verification.json。仅B1能力/数据边界检查点；不把领域测试当正式Electron UI通过。

| 本轮验收 | 状态 | 证据与范围 |
| --- | --- | --- |
| Markdown解析11+已有交换服务6+已有媒体6+新增边界3 | PASS 26/26 | evidence/b1/markdown-tests.txt，exit0，无skip/FAIL |
| 相同叶名在不同完整路径下隔离；指定挂载；默认keep/明确replace | PASS | 新boundaries测试1，另一分支完整NodeBody不变 |
| 预览/差异后取消不写；全树/局部导出保留路径正文语义 | PASS（服务） | tree/bodies/settings/cards/attachments bytes/receipt计数逐项精确比较，未发送confirm代表丢弃预览；非UI取消按钮测试 |
| 混合旧正文append+新子节点+图片的回执故障回滚 | PASS | 新测试2，真实SQLite TEMP触发器故障；树/正文/关联/文件字节/回执均回到原值；相同请求重试/重放仅提交一次 |
| 保存后数据库重开 | PASS（服务） | 同进程重新打开真实606 owner；不是Electron新进程/窗口验收 |
| 第七级局部导出 | GAP；拒绝保护PASS | 新测试3实测MARKDOWN_DEPTH_UNSUPPORTED，未扁平化/无写入；**导出功能未通过**，B3须处理必要合同/明确限制 |
| B2正文/大纲正式UI、原生undo/redo、失败草稿与窗口关闭/新进程 | NOT_RUN | 下一检查点，不用R5.a历史编辑证据替代B2 |
| B3正式UI预览/取消/确认/挂载/范围；B4集成/视觉 | NOT_RUN | 已有服务/对话框不代表R5.b完成 |
| R5.a已通过且未受影响的领域/交互/三宽 | 继承原证据，未重跑 | 本轮生产源码无改动 |
| build/全量测试/协议导出 | NOT_RUN | 本轮仅测试与文档，无生产/协议/依赖改动；不重复无影响构建或全量门禁 |
| R5.c/d/R6、Windows/物理剪贴板/IME | NOT_RUN | 本Work不进入；平台验收继续归R7/R8 |

执行命令：
```bash
node --experimental-strip-types --test --test-concurrency=1 tests/knowledge-markdown-v075.test.ts tests/knowledge-markdown-store-v075.test.ts tests/knowledge-markdown-media-v075.test.ts tests/knowledge-markdown-boundaries-v076.test.ts
```

环境Linux/Node24.22.1/Schema606；复用既有unifiedWorkspaceFixture的隔离临时合成库，每例独立并正常关闭，不使用真实数据。第一次25项运行PASS后加强全树路径/正文断言、增加深层GAP用例，最终26项运行PASS。无未解决测试FAIL或环境BLOCKED；六级功能GAP仍未解决，不能标记R5.b DONE。未新增UI截图（生产UI未改）；原R5.a正式截图和差异不覆盖。

保存只走连接器base-tree/实际parent/force=false/expected_sha原分支，独立HEAD/文件树/关键证据核验后结束。本提交自身SHA由Git历史和独立读回解析。

---

# R5.a C4 — PASS（R5.a DONE）

基线9810ed8189bd4be712273e2b25b9cba8ffe586a1 + C4工作树。Linux、Node24.22.1、Electron44.9.1、MindElixir6.0.0-next.4、Crepe7.22.3；复用依赖/缓存，没有重装或重建242卡夹具。代码指纹见evidence/c4/verification-notes.json；当前提交以Git历史/远端读回解析。

| 命令/验收 | 结果 | 证据/边界 |
| --- | --- | --- |
| npm run build | PASS | evidence/c4/build.txt，最终源码类型/生产构建；原有chunk提示 |
| node --experimental-strip-types tools/validation/r5/c4.ts | PASS 6组 | evidence/c4/interaction.json；原生改名+显式改父级；现有可见格式栏、真实正文与Ctrl+B；清理前新进程精确保存值及UI读回；Unified叶节点/父节点筛选实际排除未关联卡；原有大纲/图谱切换只读不写 |
| node --experimental-strip-types tools/validation/r5/c4-resize.ts | PASS 4组 | evidence/c4/resize.json；900px实际默认290→键盘310→指针330，ARIA和宽度界限；调整后节点全可见、无侧栏覆盖，树hash/revision不变 |
| node --experimental-strip-types tools/validation/r5/c4-visual.ts | PASS 9组+2项 | evidence/c4/visual.json；1500/1366/900各展开详情/收起详情/纯画布，九PNG+九DOM/CSS/字体/哈希；原生绿色线、选中配色、详情/编辑器、toolbar/footer、全节点边界/重叠；900菜单所有结构/恢复/交换入口可达及Escape；全程树hash/revision一致 |
| R5.a局部视觉审阅 | PASS | 九张正式图逐张审阅；冻结原型及C3参考图/快照全部哈希继承；差异见VISUAL-DIFFERENCES.md |
| 领域21/21、C2 Electron11、C3几何9 | PASS（继承有效证据） | 原协议/后端/事务/回收/分层/禁拖等不重新开发或无意义全量重跑；受影响UI已由C4专项及九状态复验 |
| Windows10/11、物理图片剪贴板、真实IME、全应用严格视觉及便携ZIP | NOT_RUN | R7/R8，不把Linux当Windows |
| R5.b/c/d | NOT_RUN | 只保留已登记需求和既有入口，未实施新阶段 |

真实修改后的跨进程验证明确发生在清理前：target959a4220-2f45-488f-84b4-dfd7d2d09539改名“词义辨析·C4持久化”、挂到创新理论64ee9a2e-920e-4a21-8755-1490f951e6db，原生编辑正文及加粗；新进程API和实际UI均验证后才使用真实服务恢复原始合成图谱，以便冻结原型对照。原卡片关联和已发布内容精确相同，不能把“清理后读回”冒充此项。

早期真实FAIL保留：首次构建TS1136（主题字面量重复逗号）修复后PASS；首次视觉发现通用flex使关闭details内容仍显示，见visual-attempt1.json，明确关闭样式后最终九组PASS。无未解决FAIL/BLOCKED；不删断言/不削弱测试。6组功能在最后仅标题文案/关闭按钮/边框CSS微调前运行，其事件和服务未改；最终构建及九状态/900调整在最终源码重验。C1–C3历史失败及报告保留在旧evidence与Git历史。

GitHub只走连接器base-tree/实际parent/force=false/expected_sha保存原分支，独立读回完整HEAD/tree/关键文件和C4交付清单；是否成功以实际回执为准。不运行CLI push、不审批/合并/发布、不等待CI。

## 最终保存边界（追加保存指令后无新增测试）

最后一次既有弹窗入口回归实测FAIL已保留menu-attempt1.json。原因是关闭details父容器隐藏异步子dialog，退出等待保护；一次诊断被中断exit130，未清数据库/租约。修复仅保留子弹窗的菜单祖先并正确处理Esc，最终c4-resize.ts为4组PASS（2调整+恢复取消+原导入/导出关闭/Escape），树hash不变，正常退出成功。最终build PASS。

6组业务及9状态视觉在该事件修复前已PASS，最后修改未改变其布局/CSS、正文/层级/筛选服务，按影响继承；未再次重拍旧状态或冒称全套重跑。c4-visual.ts后来新增的“菜单Esc后保持全屏”显式断言本次未重跑（NOT_RUN）；原生弹窗Esc保持全屏在最终4组入口回归已实际断言。没有未解决的必要功能故障，不因此扩展后续阶段。

收到立即保存指令后停止开发及测试，仅整理本记录和通过连接器保存/核验；不等待CI。
