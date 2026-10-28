# 2026-10-28 R5.b B2.2 WIP — BLOCKED（环境启动故障）

本Work已核实远端28cc2ad4f0a92401b410907ff51a5755f2437db8、原分支/PR15 Draft。B2.1及既有B1/R5.a未受影响证据继承。尚未修改任何生产源码/协议/Schema/锁文件或视觉；仅新增待验证生命周期专项及计划。B2.2未完成，B2.3未启动。

新增`tools/validation/r5/b2-lifecycle.{ts,html}`及`b2-lifecycle-browser.ts`：独立验证构建在Crepe公开create/destroy等待点注入可控Promise，用来检验初始化取消/销毁期间只读；正式UI部分计划验证快速并发切节点、原生格式/图片undo/redo和图谱/大纲切换。**这些新断言均未通过验收，不能当已实现或已证实产品竞态。** 首次测试门误拦截替代实例清理而卡住，已中断exit130；单次门和15秒上限已改但尚未成功验证。再次启动Electron发生SIGTRAP及WebSocket socket hang up，0组执行。按用户环境故障规则立即停止新增开发/测试，仅保存WIP与原始失败（本地调试URL已脱敏）。

证据`stages/R5/evidence/b2-2/`：attempt0/attempt1及命令输出、verification.json。新独立验证页Vite构建成功不等于正式生产构建/GUI通过。B2.2正式Electron/原生undo/redo/图片/快速切换为NOT_RUN；B2.3保存安全/退出新进程为NOT_RUN。未重复B1 26/B2.1 7组正式+7单元/三宽，也未运行无关回归。

下一Work精确入口：先核实最新HEAD，读B2-ACCEPTANCE及evidence/b2-2/verification.json；处理Electron启动故障，调查被中断进程及写租约的真实状态，不猜定租约即唯一原因、不删除活动租约。复用本地`validation-results/r5-b2-2/fixture.json`所指三节点合成库`/tmp/gank-b2-lifecycle-GNPISt/synthetic606`（未上传/清理）；没有重建242卡完整夹具。环境恢复后先验证修正的一次性测试门，再对原源码做可控复现；只有证据成立才最小修复现有适配生命周期/身份校验，保留B2.1快照保护和原生历史。Crepe本身无AbortSignal选项，测试signal是拟议业务取消适配，当前生产接口未实现，as any仅用于WIP基线探针。

R5.b/B2整体IN_PROGRESS；B2.1 DONE、B2.2 BLOCKED、B2.3 NOT_STARTED。通过连接器真实base tree/parent/expected SHA/force=false保存，独立核验后主动结束；不进入B3/c/d/R6，不等CI、不合并发布。当前提交自身SHA由Git历史/独立远端读回解析。

---

# 2026-10-28 R5.b B2.1 — DONE（B2整体 IN_PROGRESS）

起始远端 `2bfd6246b90cc84cd81393c9b0358fec2c368995`，原分支 `feature/v075-unified-learning-workspace` / Draft PR #15 → develop。此Work完成用户允许的B2.1安全检查点后结束，未进入B3、R5.c/d/R6。

实现多根文档分组、真实父子层级标题、分级目录展开/收起/选中/定位、模块正文独立只读展开；活动节点复用KnowledgeMarkdownPanel/Crepe编辑。只遍历既有Mind Elixir视图，未建立第二套领域树。修复专项发现的快速编辑→切节点漏存：已有原生contentVersion同步识别编辑，切换强制捕获快照/flush，未编辑内容不因序列化产生写入；折叠活动正文用v-show保留草稿。保存控制器、CAS/revision/requestId和业务API均复用，Schema606/FSRS/历史/锁文件未改。

本轮PASS：生产build；`tests/editor-v075.test.ts` 7/7；`tools/validation/r5/b2-outline.ts` 正式Electron 7组、两根九节点/七层/异支同名、零写、折叠草稿与切节点定向保存、搜索定位；三宽生产与冻结原型共6PNG+6DOM/CSS，三张最终生产图人工审阅。正式节点身份/层级/正文来自隔离真实606，未重建242卡夹具。B1的26项交换测试及未受影响R5.a全套未重跑。证据及失败归因见 `stages/R5/B2-ACCEPTANCE.md` 和 `evidence/b2-1/`。

B2.2/B2.3仍NOT_STARTED，完整矩阵NOT_RUN：单一可写实例异步创建/销毁时序、并发节点/图谱-大纲切换、原生undo/redo与既有图片、关闭详情/离页、失败与原请求未知结果核对、Electron退出新进程/数据库重启。当前通过的是稳定界面仅一个可写正文和快速节点切换专项，不能当B2完整验收。下一Work核对最新HEAD，从B2-ACCEPTANCE/R5 PLAN及现有保存链路恢复；不重做B1/B2.1，不以本轮Linux图像冒充Windows验收。

原分支通过连接器base-tree/真实parent、force=false、expected_sha保存；当前检查点完整SHA以Git历史和独立远端读回为准。保存核验后主动结束，不等CI、不合并、不发布。B1七级导出限制仍归B3，未修复。

---

# 2026-10-28 R5.b B1 — DONE（R5.b整体IN_PROGRESS）

本Work起始远端0eaedd4c4c260d8d008ff3d1f1372ef54be1fc10、原分支/PR15 Draft已核验。仅完成B1能力和数据边界核对；新增3个边界测试，Markdown相关26/26 PASS，详见`docs/v076/rebuild-v37-source-first/stages/R5/B1-CAPABILITIES.md`与`evidence/b1/verification.json`。没有修改生产源码/Schema606/锁文件，没有重跑未受影响的R5.a测试或截图，没有重建242卡UI夹具/安装依赖。

确认完整路径挂载隔离、预览取消零写、混合旧正文append+新节点+图片的回执故障精确回滚、原请求重试/重放一次、数据库重开一致。真实限制：v1最多六级且局部导出仍保留祖先，第七级叶无法导出；已保留拒绝测试及B3最小方案。B2文档式大纲与UI草稿/切换/关闭保护，B3待导入正文/逐节点图片预览与范围呈现，B4正式Electron全链路及视觉均未完成，保持NOT_RUN。

R5.a DONE继承，R5.b IN_PROGRESS（B1 DONE，B2/B3/B4 NOT_STARTED），R5.c/d及R6未进入。下一Work从B1-CAPABILITIES.md与R5/PLAN恢复B2，先核实最新HEAD，复用现有Crepe/保存控制器和知识服务；不重做B1或R5.a。此检查点通过GitHub连接器以真实HEAD/tree/parent、force=false和expected_sha保存；自身SHA从Git历史与独立读回解析，核验后本Work主动结束，不合并/发布/等待CI。

---

# R5.a — DONE（C4收尾）

恢复基线9810ed8189bd4be712273e2b25b9cba8ffe586a1；原分支feature/v075-unified-learning-workspace，Draft PR15 → develop。本次保存SHA以本文件Git历史及远端独立读回为准，提交不能包含自身SHA。

C4完成：

- Mind Elixir公开theme.palette/cssVar改为原型绿色体系；原生selected类呈现#dceddf/#438d69/#1c6047。expandNodeAll/方向/保存/历史刷新后通过公开selectNode恢复既有业务选择；没有独立选中状态、方法覆盖或新布局引擎。
- 详情宽度按原型465/423.45/290px响应；保留既有宽度调整。现有格式栏从隐藏仍占92px改为可见39px，修复旧label边距，保留颜色/保存和Crepe原生快捷键，未新建工具栏。细节标题/关闭入口/关联按钮边框、原有图谱/大纲分段视图对齐。次级结构/恢复/交换操作归入同一原生HTML details菜单，900px主工具栏单行59px。
- 真实UI修改节点名、父子层级及Markdown（含原生Ctrl+B加粗），保存后正常退出；新Electron进程在任何清理前精确读回name/parentId/position/revision/Markdown、关联和已发布版本，UI路径/正文也一致。
- 新增明确filter事件；UnifiedWorkspace使用现有StudyFilters和UnifiedStudyPlanner/learning.queue.preview，替代legacy全局预设。叶节点精确筛选与父节点包含后代均PASS；未关联对照卡实际被排除。不扩协议/服务。

新证据：C4功能6组、900px键盘/指针调整及入口4组、最终生产build、三宽9组及菜单/只读2项PASS。九张正式PNG和九份DOM/CSS/字体/哈希在evidence/c4；冻结原型继承C3，全部哈希复核。逐张审阅九图，R5.a局部视觉通过。领域21/21、C2 Electron11及C3几何9的未受影响语义继承，不宣称重跑；C4三宽因主题/详情/工具区变化全部增量复拍。

无未解决R5.a阻塞。合理业务适配：原生曲线/自动布局、既有展示容器不入库、真实关联1/1而非原型演示14/14、窄宽自动fit（900详情73%，纯画布100%）、5px分隔调整区、真实Crepe自适应内容高度及显式筛选预览。详见VISUAL-DIFFERENCES.md，不宣称全应用逐像素一致。

R5.a DONE；R5整体仍IN_PROGRESS，b/c/d NOT_STARTED。Windows/物理剪贴板/IME/全应用严格视觉/便携ZIP继续R7/R8，NOT_RUN。本Work完成C4并通过连接器保存全部有效增量、独立核验后结束；不进入b/c/d/R6，不等待CI、不合并发布。

保存前最后修复：原生details关闭时会隐藏内部异步弹窗；已保留子弹窗祖先，Esc先关弹窗/菜单。恢复/原导入导出入口及关闭不写树最终4组PASS，初始FAIL见menu-attempt1.json。布局不变，九图按影响继承；不为再次跑新增断言延长Work。用户追加立即保存后停止全部非必要测试，仅保存和核验。
