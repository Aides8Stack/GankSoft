> **2026-10-23 用户阶段审核（优先于下方历史决议）**：S2 **开发准入 DONE**，测试源 `0b8b96bf857b43e42087e7d621084326cffacbf1` 的 Windows/Ubuntu/pr-gate 均 PASS，按用户授权可启动 **S3.a**。这不代表独立编辑器已接入真实用户页面，也不代表真实 Win10/11 中文 IME、人工作业及便携 ASAR 已通过；这些仍为 NOT_RUN，并要求正式编辑器启用/发布前补验。`pr-trust` 仍需所有者审核，未自动审批/合并/发布。下方所有“S2 BLOCKED / 不进入 S3”句子都是旧阶段 Gate 的历史记录，已被本次**仅针对开发准入**的决议取代；其他原生能力/协议风险结论继续有效。

# S2 原生编辑器优先决定（2026-10-23）

**S2 BLOCKED，未进入S3。** 锁定Milkdown/Crepe7.22.3、ganksoft.editor/1、Asset/Placement/每处百分比宽度合同不变。未更换框架、升级依赖或改工作流。下文历史ADR中的旧Windows/剪贴板状态只作历史；当前精确证据以本节、TEST_REPORT和S2-ADMISSION-EVIDENCE.json为准。

## 原生与业务适配对照

依据实际安装的7.22.3源码，不把文档页面只有导航当作API证据。表中“可移除”均指保留现有协议和断言的前提。

| 功能 | Crepe原生支持 | GankSoft当前代码与真实职责 | 官方配置/插件替代及移除影响 |
| --- | --- | --- | --- |
| 表格点击 | TableNodeView支持点击选格；旧实现延迟派发捕获的state.tr | CurrentTableNodeView有重复hit-test/同格判断，但只为取消被新意图取代的延迟点击；旧原生mismatched transaction仍稳定复现 | 公开TableNodeView/$view扩展保留。无配置能修正这个版本的旧事务；直接移除会带回已证实竞态。升级上游后必须重新评估删除 |
| 表格选区 | ProseMirror Text/Node/CellSelection | 只有点击意图使用当前state，内容未变的update保持DOM；没有另写通用选区系统 | 其余全部原生。node.eq时保持DOM是公开生命周期修复，旧身份控制FAIL；删它会重建DOM/移除拖拽源 |
| 行列拖拽 | 官方Table组件的手柄/预览/指示线/moveRow/Col处理 | **生产拖拽代码没有重写**，stopEvent委托原组件 | 本轮不加dragover/drop补丁。仅校准同一真实鼠标夹具：完整表格可见、目标指示线、最终落点的可信且被接纳的dragover后释放；A/B与完整编辑器均保留顺序/drop断言 |
| 表格行列增删 | 官方Table UI与命令 | 没有重复实现 | 继续原生，不增加业务adapter |
| 表格对齐 | 官方Table UI/setAlign命令 | 没有重复实现 | 继续原生，57项现有断言保留 |
| 撤销重做 | 官方history/快捷键/事务 | 没有另写编辑器undo栈；正文版本计数只用于拒绝过期异步资源插入 | 继续原生；不能以undo回到相同文本就解除已发生正文编辑的并发保护 |
| 图片上传 | ImageBlock onUpload/inlineOnUpload/blockOnUpload返回Promise<string>；proxyDomURL可映射展示URL | 旧假uploader仅报错并返回[]；**本轮删除**，公开editor.remove(uploadPlugin)移除未使用的上传事件插件，保留Builder配置生命周期 | 暂不启用默认blob上传，防止资源绕过media.stage。onUpload只返回src，不完整解决资产归属/每处ID/百分比序列化/异步拒绝，不能单凭此回调替换协议适配 |
| 图片粘贴 | 官方uploadPlugin处理ClipboardEvent FileList与占位符映射 | 当前只接管图片MIME，通过media.stage读取平台剪贴板，二进制/校验留主进程，书签/正文版本/销毁/pending保护 | 官方占位符会随正文mapping继续插入，失败只console.error且未提供我们需要的回执/清理语义；与“正文修改即拒绝”合同不同。保留最小图片入口，不接管普通文本 |
| 图片插入 | 原生schema与ProseMirror replaceSelection/事务 | 使用公开schema/事务批量放置，校验Asset冲突并创建Placement ID；不重写DOM编辑引擎 | 删除会丢资产/放置身份和批次一致性。暂存资源不能因插入失败擅删，以免破坏其它历史引用 |
| 每图缩放 | ImageBlock原生拖动手柄设置ratio，以自然尺寸/可用尺寸推导高度 | 当前只绑定每处URI的整数width(1–100)和百分比渲染，30%/80%独立 | 原生ratio不是容器百分比宽度，并序列化到alt、保留两位小数；resize不会更新src查询里的width。onUpload/proxyDomURL/maxWidth/maxHeight均不能独自无损替代。保留现有最小width适配 |
| 图片说明 | ImageBlock有caption UI，存title；原生alt用于ratio | 当前协议保留alt/title，**尚未启用原生说明编辑UI** | 直接启用会把原alt说明转换为ratio；要同时保留alt/title/width需新增schema/serializer适配，比当前方案更大。本轮不强行替换 |
| 标题、列表、粗体/强调/链接 | Crepe/GFM/CommonMark/工具栏/快捷键原生 | 没有重复实现这些编辑功能；安全解析限制不可信HTML/链接/媒体身份 | 原生保留；安全协议适配不可删，否则可引入外部图片/任意HTML入口 |
| 普通纯文本粘贴 | 官方Clipboard插件处理Markdown、代码块、slice/marks及插入 | **本轮交回原生**：非HTML文本先校验业务协议然后return false；代码块中交给原生按字面插入 | 不再自定义替换普通文本Slice。新增原生加粗/列表、代码字面文本、危险纯文本拒绝与重建断言；HTML仍只取text/plain，经安全parser后插入，不能把HTML原样交回DOM parser |
| 文字颜色 | 默认Crepe没有当前data-gank-color颜色mark合同 | 公开$markSchema/$remark与toggleMark，限制合法hex和往返 | 官方公开扩展是最小必要业务语法，不能直接删，否则丢颜色或吞掉不支持HTML |
| 公式 | Latex/KaTeX、CodeMirror/tooltip原生 | 仅通过featureConfigs限制trust/maxExpand/maxSize，字体同源输出 | 继续原生配置，不重写数学编辑/渲染 |
| 焦点、选区、事务 | ProseMirror公开API | 没有通用焦点管理替代；图片bookmark只恢复原目标，不抢焦点；表格保护仅特定旧版本缺陷 | 保留官方基础行为。删除业务异步保护会在光标移动/编辑/销毁时错插图；不能用当前选区顶替原始意图 |
| 中文组合输入 | 原生编辑器与OS IME处理正文 | 仅在composition期间暂停业务保存/Ctrl+S；没有实现自己的中文输入法或候选框 | 保留小保存边界；真实Win10/11 IME仍NOT_RUN，合成事件不算人工通过 |
| 保存接口 | getMarkdown/markdownUpdated等读写事件；无GankSoft持久化CAS | DocumentAdapter/SaveController负责revision、失败保留、串行重试、销毁取消 | 不能由原生编辑器替代业务持久化。当前仍是POC内存/测试JSON，正式Draft/版本接线属S3，备份/历史闭包不能据此宣称全通过 |

本轮没有恢复ImageBlock，也没有改ganksoft.editor/1。原生图片交互确实丰富，但要在其ratio/alt/上传默认语义之上接入全部现有合同，需要比当前最小图片适配更多改造；本轮保留最小适配更符合“先原生、再公开扩展、最后自研”。未来若正式授权评估schema层映射，再与当前30/80/alt/title/异步/安全/重开断言对照，不在本轮铺开新图片工程。

## 对照证据与鼠标夹具

起点c892378c094080c537e1017430b1957f75a60e4f / Run39810159802的Windows119934026750失败仅在launcher拖拽；Artifact12440650734原始SHA256为fe39c77d64eee73108730f14105dc8ae8f159099216bafe79f6f193fba74fb32。系统剪贴板/30-80/重开及受控离线均PASS，57/完整editor含11也PASS。原Windows日志最后dragover在(204,672)，dragend在(224,683)，没有drop；未记录最终落点dragover或其接纳状态，不能据此断言组件缺陷。

新增隔离A=原生Crepe默认Table、B=仅加载现有CurrentTableNodeView，7.22.3版本/数据/官方主题/host/窗口1100×720/DPR1和鼠标函数相同；通过页面reload隔离renderer上下文，避免测试销毁悬浮原生插件后遗留timer访问旧ctx。完整业务编辑器仍使用同一鼠标函数且保留原顺序/drop/保存断言。没有注入drag/drop事件或直接调用移动命令。

最终Linux A/B均PASS，生产路径PASS；同路径DOM、可信dragstart/dragover/drop、最终行列内容记录在既有S2-ADMISSION-EVIDENCE.json的新nativePriority节。首次观察器在capture阶段检查defaultPrevented过早、分数坐标和未加载官方CSS导致的夹具失败均保留，修正依据明确，不隐藏失败或重跑碰运气。Windows新A/B通过原quality已有launcher执行，**本地NOT_RUN，需新SHA Runner证据，不能宣称Windows已恢复**。

原生旧事务竞态独立脚本再次稳定FAIL/exit1；此负向控制不作为要求产品转绿的前置，不因拖拽通过就移除保护。最终表格57、异步11、原完整编辑器断言与新增原生粘贴3项、Node编辑器6项、类型/build通过；精确最终命令结果见TEST_REPORT。

## 参考与升级风险

本轮实际读取7.22.3：@milkdown/components/src/table-block/view/{view.ts,component.tsx,drag.ts}、dnd/drag-over-handler.ts；image-block/{schema.ts,remark-plugin.ts,config.ts,view/components/image-viewer.tsx}；@milkdown/crepe/src/feature/image-block/index.ts及core/builder.ts；@milkdown/plugin-upload/src/upload.ts、plugin-clipboard/src/index.ts。证据保存这些文件hash，路径对应锁定npm包；未修改node_modules。

官方入口：https://milkdown.dev/docs/api/component-table-block 、https://milkdown.dev/docs/api/component-image-block 、https://milkdown.dev/docs/api/plugin-upload （本次网页抓取仅导航，因此具体行为以上述锁定源码为准）。公开源码：https://github.com/Milkdown/milkdown/tree/v7.22.3/packages 。

风险/未验证：新Windows落点等待及A/B必须由Runner复验；真实Win10/11中文IME、人工剪贴板/拖拽/物理脱网未签核；ImageBlock未正式接入；单MD/Base64=S6，正式Draft=S3，最终便携ASAR与同包签核=S9。没有修改或放宽S2 Gate。升级依赖时优先复查并删除可由上游修复替代的点击/DOM保护；每次都运行57/11/原生A-B/安全/重开，不依赖版本名猜测兼容性。

---

以下为历史ADR与旧状态，不覆盖上方当前结论：

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
