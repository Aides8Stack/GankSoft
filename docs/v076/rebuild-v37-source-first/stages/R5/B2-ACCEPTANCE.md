# B2.2 最小恢复检查点（2026-10-28）

基线edeb335fbe7c76a6ee155221fed8bc58f7096547；R5.b/B2 IN_PROGRESS，B2.2 BLOCKED（剩余正式数据专项），B2.3 NOT_STARTED。

| Gate | 状态 | 证据/边界 |
| --- | --- | --- |
| 进程/监听/租约/数据库预检 | PASS（诊断） | b2-2-recovery/minimal*.json：启动前后无Electron，端口集合一致，无writer.lock；原/tmp库/active指针已缺失。未删除任何租约或库 |
| 最小Electron启动 | PASS 2次 | 同44.9.1二进制SHA和B2.1参数；窗口可见DOM、ready、正常exit0；历史SIGTRAP未复现，根因未证明 |
| 一次性create/destroy测试门 | PASS（无死锁） | 两门均在15秒限内返回；首次原生销毁只读断言FAIL，不是启动环境故障 |
| 原WIP AbortSignal用例 | 不适用产品合同 | 生产create接口未支持signal；其FAIL保留minimal.json，不能将假设API不生效当产品竞态。改测实际Vue卸载链路，并保留单实例/正文/零陈旧通知断言 |
| 原生销毁期只读最小修复 | PASS | 公开setReadonly(true)先于await destroy；同一严格旧可写0/总可写1断言由FAIL转PASS |
| 初始化中真实Vue卸载/替代正文 | PASS | minimal-after-fix.json：旧可写0、新可写1、变更0、替代节点正文正确；不是原型或自制历史栈 |
| 生产构建及验证页构建 | PASS | production-build.txt/probe-build.txt；vue-tsc/tsc/Vite，无依赖安装；验证页复用原runner的同一构建配方 |
| 原Schema606库的正式UI/IPC B2.2完整专项 | BLOCKED / NOT_RUN | metadata存在但/tmp目录缺失；没有创建替代库冒充原库，没有运行全量或重建242卡 |
| B2.3/B3/WindowsGUI/三宽重拍 | NOT_RUN | 不在本轮范围；B1/B2.1及未受影响R5.a按影响继承 |

实际命令：`node --experimental-strip-types tools/validation/r5/b2-startup-recovery.ts minimal`；修复后设置`B2_RECOVERY_REPORT=minimal-after-fix.json`再运行一次。两次实际启动均成功，无同失败循环。诊断器首次ENOENT发生在launch之前，已单独保留preflight.txt。最小空窗口加载独立验证页，不执行正式知识API/数据库；不把它冒充B2.2全验收。

下一入口见RECOVERY-NEXT：先恢复原三节点库缓存，application阶段会对缺库/有效租约显式停止；再补正式B2.2，不进入B2.3/B3。以下为历史证据。

---

# B2.2 当前检查点 — BLOCKED（2026-10-28）

基线28cc2ad4f0a92401b410907ff51a5755f2437db8。生产代码保持B2.1，未更改编辑器或布局。B2整体IN_PROGRESS；B2.1 DONE继承；B2.2 BLOCKED；B2.3 NOT_STARTED。

| 当前验收 | 状态 | 实际证据 |
| --- | --- | --- |
| 最小恢复/公开create/destroy/setReadonly与现有disposed流程源码检查 | PASS（静态） | 当前源码指纹见b2-2/verification.json；生命周期风险仍为待验证假设 |
| 独立生命周期验证构建 | PASS（编译） | attempt0/1-command.txt；不含生产构建或类型全检 |
| 可控异步初始化/销毁专项 | BLOCKED | attempt0测试门自身卡住后exit130；修正为单次门并加15秒限制，尚未成功重验 |
| 正式Electron启动 | BLOCKED | attempt1.json，SIGTRAP/socket hang up，0组执行；不把dbus提示推定根因 |
| 单一可写实例/快速并发切节点/原生格式历史/已有图片 | NOT_RUN | 新脚本仅WIP，不能以源码或构建代替GUI通过 |
| B2.3失败/冲突/未知回执/详情关闭/离页/切集/新进程精确读回 | NOT_RUN | 本Work未启动 |
| B1 26/B2.1正式7/编辑器7/三宽/未受影响R5.a | 继承原有效证据 | 未重跑，生产代码完全未变 |
| 新三宽截图/生产build/无关全量测试 | NOT_RUN | 无生产/布局修改，环境故障后停止测试 |

原失败与命令输出保留在evidence/b2-2；仅脱敏本地调试端点。没有已验证的新产品修复。先恢复真实Electron环境和核实中断进程/租约，再复用本地三节点合成库，验证测试门与基线复现；不要直接运行后当作通过，不删除租约或重建数据绕开故障。Crepe公开setReadonly可用于后续最小适配，但AbortSignal尚未接入生产createMarkdownEditor。

连接器保存及独立核验后本Work结束，不进入B3。以下B2.1为历史有效证据。

---

# R5.b B2 验收记录（2026-10-28）

基线 `2bfd6246b90cc84cd81393c9b0358fec2c368995`；B2整体 IN_PROGRESS，B2.1 DONE，B2.2/B2.3 NOT_STARTED。按用户本轮“完成当前安全检查点后主动结束”执行；本文件不表示完整B2通过。

| 检查点 / Gate | 状态 | 证据与边界 |
| --- | --- | --- |
| B2.1 文档式大纲/真实层级/目录定位 | PASS | 正式Electron 44.9.1，真实606两根九节点，七层与异支同名精确身份/层级/正文；非B1交换测试 |
| 独立模块只读正文 | PASS | 原有KnowledgeMarkdownPanel readonly→MarkdownContent→Crepe；标题/列表/真实表格与公式渲染，服务逐节点原始Markdown/revision/treeHash完全不变 |
| 活动正文折叠与快速切节点必要回归 | PASS | v-show保留活动编辑器和草稿；切节点前同步快照+SaveController/CAS保存，仅原节点revision+1，其他节点原文/修订不变 |
| 搜索/重复定位 | PASS | 收起当前正文后同名搜索重新展开；七级目标定位正确，treeHash/revision不变 |
| 稳定界面单一可写正文 | PASS | 原生只读预览不含contenteditable=true；三个宽度均只有一个可写正文；不代表异步销毁窗口/并发切换验收 |
| 三宽局部视觉/布局 | PASS | 1500/1366/900，生产+冻结原型6PNG/6DOM/CSS，正文不越界/遮挡，目录无横向溢出；源/数据/视觉差异见下文 |
| 编辑器基础保存回归 | PASS | tests/editor-v075.test.ts 7/7，SaveController失败/并发/IME/相同快照等已有用例；不是原生GUI undo/redo测试 |
| B2.2 单实例生命周期/节点与视图并发/原生格式历史/图片 | NOT_RUN | 只验证上述受影响必要子集；接续审查MarkdownEditor异步create/destroy及引用归属，不另建控制器 |
| B2.3 保存失败/重试/未知结果/关闭离页/退出新进程/数据库重启 | NOT_RUN | 既有实现复用但未完整验证；不得以本轮正常关闭测试进程替代 |
| Windows10/11/IME/物理剪贴板 | NOT_RUN | 保留R7/R8责任 |
| 原分支远程保存与独立核验 | 以实际回执为准 | B2-DELIVERY-MANIFEST.json、远端tree/源码/报告/恢复文件精确读回 |

## 实现与调用链

- `KnowledgeOutlineDocument.vue`仅将现有ViewNode投影为文档模块；真实nodeId/depth/path不变，多根分组；第七层使用L7标识，避免伪造Markdown的第七级标题。正文/目录的可视缩进分别封顶8/12层以保护工作区，data-depth和路径保留真实深度。
- 当前节点正文继续使用唯一活动KnowledgeMarkdownPanel插槽；其他模块按需readonly加载同一knowledge.node.read数据，复用现有MarkdownContent渲染，不新写Markdown解析/HTML转换/格式栏。
- `outlineSelect`先走既有selectNode/flush；目录和图谱共用selectedKnowledgeId；同步原生选择，定位当前文档模块；全部展开/收起同步目录；目录选中时展开祖先。
- 复用已有原生事务contentVersion，仅增加hasChanges公开adapter方法；MarkdownEditor.isClean同步检查当前快照，KnowledgeMarkdownPanel.flush不再以滞后的save-state直接放行。未修改SaveController、知识API、CAS、Schema606、FSRS或学习历史。
- CSS复用C4已经存在的颜色/保存工具布局到大纲容器；目录样式限定到直属nav，避免误选Crepe内部nav。

## 实际命令与环境

Node24.22.1 / Linux / Electron44.9.1 / Crepe7.22.3 / Mind Elixir6.0.0-next.4；npm ci因当前本地依赖缺失正常安装，锁文件未改。复用本地同版本Electron运行时和Noto Sans CJK SC字体。新建独立/tmp/gank-b2-outline-*小型真实606库，仅通过typed协议建九节点，不访问真实用户库，不重建242卡夹具。

```bash
npm run build
node --experimental-strip-types --test tests/editor-v075.test.ts
node --experimental-strip-types tools/validation/r5/b2-outline.ts
```

输出：evidence/b2-1/{build.txt,editor-tests.txt,outline-tests.txt,verification.json}。7个正式Electron用例、7个编辑器基础用例均PASS；build退出0，既有chunk体积警告保留。未重跑B1 26项或R5.a全套。冻结HTML SHA256仍为8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015，仅读定位261–288/365–384及knowledgeOutlineNav/treeOutline；未重新解析全部原型。

## 失败与修正（原证据保留）

- attempt1：夹具误用catalog.save返回不存在的name字段，导航找undefined；修正合成元数据，非产品或Electron环境故障。
- attempt2/3：Crepe表格组件含一个空布局table和一个带th的内容table；原断言错误地统计所有table，随后filter范围错误。改为精确内容table及两列标题断言，未删表格/只读/零写断言。
- attempt4：实际快速切节点后正文仍为原文。KnowledgeMarkdownPanel.flush以尚未到达的save-state=clean放行；同步native事务版本/快照修复后保留同一严格正文与revision断言通过。原失败PNG/DOM/JSON保留。
- attempt5：视觉采集选择器误取Crepe隐藏nav；产品直属导航CSS也随之收窄，避免样式作用于原生编辑器菜单。三宽精确几何断言保留。
- attempt6：功能及三宽首轮PASS；人工审阅发现900px深目录产生横向滚动。将名称正常换行并增加目录横向零溢出断言，最终7组+6图PASS。

## 视觉差异与结论

逐张审阅最终production-outline-{1500,1366,900}.png及相同数据/活动节点/顶部滚动位置的reference-outline三图。分组、层级缩进、右侧320/314.17/210px目录、选中色和白底文档结构可用；900px深层长名正常换行，正文/目录/底栏互不遮挡。

合理适配：原型演示富文本不真正渲染表格和公式，正式版使用原生Crepe表格与KaTeX；正文块保留现有紧凑颜色/保存工具栏和保存状态，按文档自适应高度。源原型inactive正文摘要/图标计数不作为虚构业务数据补齐，本轮采用按需只读正文。原型大纲顶部为“展开/收起全部正文”，正式沿用R5工具栏（展开/收起用于目录树），各模块有独立正文按钮；不声称逐像素一致。源第七层仍重复######，正式L7显示真实层级，不修改B3导出限制。隐藏图谱的缩放随搜索/窗口原生fit变化，不影响正文/层级，不新增布局逻辑。

B2.1局部视觉通过；完整B2、全应用严格视觉、Windows、系统IME/物理图片剪贴板均未由本记录验收。

## 下一检查点

先核实远端HEAD，读本文件和R5/PLAN，然后仅B2.2：原生撤销重做/图片保留、快速并发节点和视图切换、单一可写Crepe在异步初始化/销毁期间的归属安全；再B2.3故障/未知回执/关闭离页/退出及新进程数据库重开。本轮后续状态均NOT_STARTED/NOT_RUN，禁止进入B3/R5.c/d。小型夹具脚本可重现；validation-results/r5-b2/fixture.json与数据库只是本地合成缓存，不上传。
