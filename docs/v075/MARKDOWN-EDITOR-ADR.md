当前补记（S2准入）：父e73f9e46ae62ce11c4d859a6bbeeb3e4b2a5ce68的Windows57/完整editor含11/launcher已PASS。真实OS IME仍NOT_RUN，S2仍BLOCKED。新增公开TableNodeView.update(node)仅在node.eq(this.node)时返回true以保留拖拽源DOM，其余委托super.update；原生实现对此返回false导致CellSelection装饰更新重建，旧控制FAIL/新57与完整editor/鼠标行列拖拽PASS。没有接管dragover或复制移动算法。鼠标夹具等待原生指示线并重新命中移动预览层后释放，可信drag/drop与顺序有证据；不算人工签核。升级Crepe时须复核此update语义，重跑DOM身份/57/完整editor/原生鼠标路径；若上游已修，应移除此小适配。最新分项结果与阶段归属以PHASE-GATES.md为准。

# S2 当前决定：公开TableNodeView扩展继续验证（2026-10-22）

候选仍为锁定Milkdown/Crepe7.22.3，无新依赖。npm查询stable=7.22.3，尚无已发布升级可直接采纳；本轮不无依据升级、就地改node_modules或安装备选。通过公开Editor.remove/use + $view/TableNodeView替换点击选择适配，保留原Table feature/UI/行列/对齐/拖拽机制。不是私有方法/prototype patch，也不是声称上游已修复。

原生问题本轮仍复现exit1：点击时捕获state和selection，RAF/20ms后派发旧state.tr。新扩展把expected state作为点击意图令牌，回调若state已变（包括仅选择变化）、被更新点击取代、节点已销毁，则取消；仅仍有效时从当前state重建选择事务，销毁取消调度。没有吞异常、禁表格、额外延迟输入或等待到“安全时间”后再输入。原同格TextSelection与composing处理、其它事件/按钮/drag/mutation仍走原组件；保留MIT声明。

自动化：固定19用例x3=57/57，含RAF/CellSelection、鼠标和pointer/mouse序列、表头、文档/仅选择更新、最后点击、删除/替换/销毁、同格、行列操作/对齐与重建完整JSON；完整编辑smoke16条记录（15 PASS+原生颜色限制探针）、pageerror[]、external[]，Node6/质量273/协议21/build/默认Electron4+5通过。证据evidence/S2-TABLE-CURRENT-STATE；新夹具错误与更正原因一并保留，原测试/失败复现未删，新增Tab/ShiftTab键盘目标断言。原生未扩展仍FAIL与带扩展候选PASS分开记录，不覆盖旧失败。

**S2/T05仍BLOCKED，未获准接正式页面，不进入S3。** 真正OS中文IME/Windows编辑器实机、系统剪贴板、Win脱网ASAR资源、真实拖拽手势和Base64往返仍NOT_RUN。T06–T08只是本轮限定Linux/注入边界复验。继续该候选的下一步是真实IME与Windows同fixture验收；若必要表格功能无法用公开API保持，再隔离验证Vditor/Cherry，不先宣布最终选型。

媒体ganksoft.editor/1/placement宽度/安全解析、DocumentAdapter/SaveController及生产604保护均未变；没有直接SQL/文件I/O接入组件。FAST/FULL只设计、本轮实施暂缓。当前父4aebc2682c9e8b46c57bf311e9479432e9d3004a的质量双平台/pr-gate成功，pr-trust真实failure仍阻塞合并，局部开发授权不替代可信审核。

参考：安装的@milkdown/components7.22.3公开导出与src/table-block/view/view.ts、@milkdown/utils $view以及core Editor.remove/use；官方https://milkdown.dev/docs/api/component-table-block；上游相关报告https://github.com/Milkdown/milkdown/issues/2495（报告不等于上游修复承诺）。

---

历史ADR，原生未适配失败仍可复现；当前扩展结论以上节为准。

# S2 编辑器选型与编码 ADR（2026-10-22）

状态：BLOCKED。Milkdown/Crepe **7.22.3 不获准接入正式页面**。保留隔离验证组件/适配器与失败复现；不进入S3。不以一次成功运行覆盖可复现失败。

## 实际依据与范围

继承S0–S1，不重新设计迁移。起点19ab62dfe806174060478ffdb05fe955bea223bd的quality39726201464（Ubuntu/Windows/pr-gate）及最新有效pr-trust status（39730661706）均success，S1自动化Gate DONE。真实旧RC、Win10/11、真实断电等仍NOT_RUN/BLOCKED；生产默认604，不自动升级。

全文读取原包S2指令、MD-Editor-Review-v3.7和MD协议；实际打开OPEN-ME-v3.7.html并读取DOM，截图捕获超时；同时查看包内knowledge-toolbar-v3.7.png。原型只用于内容优先/按焦点工具栏的参考，没有复制demo contenteditable替换Vue。

npm实际查询并锁定@milkdown/crepe与@milkdown/kit 7.22.3，MIT，package-lock固定传递版本。仅devDependencies：候选尚未通过，不把未接线编辑器依赖作为Electron生产运行依赖。原依赖版本未升级。正常src/main.ts/App.vue不导入编辑器；独立验证build才产出入口，组件内部动态import加载编辑器/CSS/本地KaTeX字体。当前候选大chunk约1.1MB（gzip约340KB），存在Vite大chunk警告，未调整警告阈值，不宣称S7性能预算通过。

## 已实测能力与失败

- Vue/Electron默认所见即所得，标题/列表/表格、加粗/强调；行内公式经原生tooltip修改，块公式经CodeMirror修改，KaTeX本地渲染，序列化后重建保留。
- 原生Crepe不会将data-gank-color作为颜色mark：probe保留文本但computedColor=null。新增严格颜色mark/Remark扩展，支持RGB文字颜色及Markdown往返；未宣称支持背景色或任意HTML/CSS。
- 原生ImageBlock存src/caption/ratio并将ratio写到alt，不能直接当作百分比放置合同。验证组件关闭该feature，复用Milkdown image schema并以资源服务解析；每处30%/80%分别保存、销毁重建、进程重启通过。没有关闭表格来回避失败。
- 系统剪贴板写入后read未返回图片（Linux headless）。后续在主进程clipboard.read边界注入合法PNG，**真实media.stage IPC、解码、settings暂存与文件读取**执行；不是操作系统剪贴板通过证据。重复插入同一asset产生不同placement，未声称多次stage有hash去重。
- 6项Node专项验证编码/临时SQLite JSON、拒绝非法引用、保存串行/失败/冲突/中断/输入法组合期间延后保存。自动保存只对验证内存adapter，正式Draft持久化/发布属于S3。

**关键FAIL：Crepe表格点击与即时输入事务竞态。**

`node_modules/@milkdown/components/src/table-block/view/view.ts`的TableNodeView.#handleClick捕获`state`及selection，随后在requestAnimationFrame（CellSelection分支20ms timeout）内dispatch旧`state.tr`。若点击后、回调前正文已经更新，就抛`RangeError: Applying a mismatched transaction`。加强标题/列表/表格合成composition/undo测试时发现；全场景有成功和失败运行，不能只选成功结果。

最小原生复现：`npm run build && npm run build:editor-spike && node tools/editor-spike/reproduce-table-race.mjs`。原生Crepe默认features，**没有GankSoft editor adapter**：建标题+两列表格→向td发mousedown→下一帧前insertText→延迟selection事务抛异常，命令exit1。`S2-NATIVE-TABLE-RACE.json`保留真实stack。目前未观察到文档字符丢失，但异常足以阻断可靠表格/IME验收；没有宣称安全或已修复。未修改node_modules、吞异常、禁用表格或增加测试等待来掩盖竞态。

## 编码合同：ganksoft.editor/1（隔离候选，不是新增IPC方法）

`{encoding,markdown,assets:[{id:UUID,mime:png|jpeg|webp,access:draft|asset}]}`。无绝对路径、二进制、blob或远程资源作为持久身份；readDocument严格Zod、文档最大800000字符/200资产、重复asset拒绝。

每处图片：`![说明](gank-asset://<assetUUID>/<placementUUID>?width=30)`。width为1–100整数百分比；同资产多处placement独立且不可重复。查询串/fragment/用户名/路径变体非规范URI拒绝；资源必须在service返回的assets内，由适配器映射到`app-media://draft|asset/<UUID>`。alt/title保留。删除引用不删除二进制，历史媒体清理仍由后端引用闭包决定。

颜色为`<span data-gank-color="#b91c1c">正文与Markdown格式</span>`，仅小写6位hex；Remark转换为mark，渲染DOM只设置校验后color。不接受style、事件、其它HTML、未闭合颜色、外部/文件/data/blob图片或引用式图片；明确报错且不改变原正文。链接仅http/https/mailto、禁止控制/空白字符，编辑器内点击不自动导航。普通HTML粘贴只取text/plain再走同一parser；拖放明确拒绝，默认blob上传入口关闭。KaTeX不启用trust；块公式额外限制展开/尺寸，行内沿用库默认安全选项。并非任意Markdown/HTML保真编辑器。

S1 ContentVersion.mediaRefs尚不直接使用此DTO：S3后端须解析全部字段Markdown、校验card/deck/资源所有权并解析fileName/mime/role，生成同一placementId/assetId/width；不得信任renderer的access作为授权。旧nullable/非整数width不得静默取整或猜测，需明确转换/拒绝策略。本轮未改S1 DTO或旧内容保存。

## 保存与生命周期

MarkdownEditor props：initial、revision、DocumentAdapter、EditorMediaAdapter。事件changed/saveState/failure/disposed。DocumentAdapter.save(document,expectedRevision,AbortSignal)必须返回新revision；当前只实现隔离内存示例。500ms去抖、Ctrl+S、串行保存；旧响应不把新编辑标clean；冲突/失败留文档，显式重试；组合输入暂停提交。销毁abort并通知未保存快照，未承诺自动持久恢复。组件不导入node/后台/SQL。

图片异步stage前冻结doc+selection书签；期间文档/光标变化则明确要求重试，销毁后不插入。错误不伪报已保存。组件mount/unmount与两个实例有隔离验证；大规模长文/完整OS IME未验收。

## 备选对照与下一入口

| 候选 | 本轮证据 | 决定 |
| --- | --- | --- |
| Milkdown/Crepe7.22.3 | 实装、编码/媒体/数学通过部分范围；原生表格事务竞态最小复现FAIL | 暂不生产选用；保留隔离POC，先解决/验证上游修复版本，不就地吞错 |
| Vditor | 官方README明确wysiwyg/ir/sv、数学与sanitize配置；默认cdn指向unpkg需本地化 | NOT_RUN；若Crepe无法以受支持版本解决，用相同fixture重点对比表格即时输入、颜色/宽度及本地资源 |
| Cherry Markdown | 官方README为浏览器/Node Markdown编辑器；原包列为备选 | NOT_RUN；默认编辑体验是否满足所见即所得仍需真实对照，不能按功能清单宣称通过 |

本轮未安装备选，未宣布任何一个最终胜出。真实中文IME（标题/列表/表格长文与光标）、Win10/11脱网便携包、系统图片剪贴板、单.md Base64导出再导入及统一正式Draft/发布服务接线均NOT_RUN/BLOCKED；单.md/森林交换未提前实现S6。本轮SQLite证据仅隔离JSON fixture，不冒充正式内容API端到端。

官方与安装源：
- https://milkdown.dev/docs/guide/using-crepe
- https://milkdown.dev/docs/api/component-image-block
- https://github.com/Milkdown/milkdown （实际版本源码以上述npm安装目录为准）
- https://github.com/Vanessa219/vditor （mode/cdn/math/sanitize参数）
- https://github.com/Tencent/cherry-markdown
