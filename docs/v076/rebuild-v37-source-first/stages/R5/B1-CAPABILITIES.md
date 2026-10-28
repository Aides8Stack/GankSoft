# R5.b B1 — 能力核对与数据边界（DONE）

基线 `0eaedd4c4c260d8d008ff3d1f1372ef54be1fc10`；原分支/PR15 Draft。此检查点只完成能力核对和服务边界证据，没有修改生产源码、Schema606或锁文件。R5.a DONE继承，R5.b整体IN_PROGRESS，B2/B3/B4 NOT_STARTED。能力存在不等于正式Electron验收通过。

## 已验证能力与复用决定

| 范围 | 标记 | 现有依据与本轮决定 |
| --- | --- | --- |
| Markdown富文本、表格、公式、格式与撤销重做 | NATIVE | 锁定Crepe7.22.3；`src/editor/milkdown-adapter.ts`创建现有Crepe；安装包公开源码`@milkdown/crepe/src/core/builder.ts`使用commonmark/gfm/history等。复用现有编辑器，不移植原型contenteditable/HTML转换或新建格式工具栏。原生undo/redo本轮未动态重跑。 |
| 原生编辑器功能开关/公式配置/事件 | CONFIG | 现有公开features/featureConfigs/editor插件API；AI/ImageBlock/TopBar的已有开关保持。ImageBlock禁用的原因是默认blob身份绕过媒体服务；不以此判定Crepe不支持图片。 |
| 正文加载、CAS保存、自动保存及失败重试 | ADAPTER（已有） | KnowledgeMarkdownPanel→MarkdownEditor/SaveController→`knowledge.node.read/save`；固定deck/node作用域、revision与原请求requestId；失败内容留在编辑器，未知结果冻结编辑并核对原请求。B2必须补正式UI切换/关闭/失败/重启，不重写保存控制器。 |
| 图谱/大纲身份和结构同步 | ADAPTER（已有、待B2验收） | MindMapWorkspace共用真实节点、`syncOutline/selectNode/toggleView/save`；原生详情仅map显示，大纲仅outline显示，不同时挂载双编辑器。>200节点默认分层只读，显式载入完整结构后才编辑/交换。 |
| 解析/导入/导出与正文政策 | ADAPTER（已有业务服务） | `shared/knowledge/markdown.ts`、`electron/modules/knowledge-unified/markdown-exchange.ts`；registry已定义source/text/open/clipboard/headings、import preview/page/diff/confirm和export preview/copy/save。Crepe负责文档内部；知识树、事务和交换归既有服务。不能要求编辑器原生承担Schema606领域合并。 |
| 多根/完整树/局部树与正文范围 | ADAPTER（已有，存在下述六级GAP） | 真实根parentId=null；导出显式nodeIds，可includeDescendants和includeParentBodies；必要祖先标题自动包含，默认不带未选祖先正文。全树传所有真实ID；当前UI只有逐项勾选，无原型全选/清空入口。 |
| 新根或挂接指定节点、完整路径冲突 | ADAPTER（已有） | `parentId:null/真实nodeId`；逐层按已映射父身份+名称匹配，预览row.path包含挂载路径。不同分支同名叶不合并；默认keep，按导入key选择replace/append。新增B1测试实证。 |
| 预览和确认/取消 | ADAPTER（已有、待B3呈现完善） | sourceToken/previewToken、treeHash/epoch/5分钟期限；预览/差异/分页不落库，confirm独立事务+回执；丢弃token相当于取消。每次政策变化重预览。未知回执重试原请求，不能盲目再次写入。 |
| 图片引用及失败回滚 | ADAPTER（已有） | 复用knowledge-unified/media与现有媒体服务；PNG/JPEG/WebP Data URI校验，转为同集knowledge placement，保留width/title并按集内hash去重；导出内嵌Base64。禁止跨集身份/未跟踪引用/远程或本地文件URL；协议事务失败同步清理本批新文件。新增混合事务测试证明旧正文/关联/图片不受损；不开发R5.c资源列表或清理模块。 |
| 六级以上树的无损交换 | GAP（实际测试确认） | 当前v1序列化仅#–######，`serializeMarkedMarkdown`对第七级抛`MARKDOWN_DEPTH_UNSUPPORTED`。服务局部导出自动保留祖先，因此单选第七级叶仍失败；“分支导出”现有错误建议不能解决此用例。不能宣称任意深度局部导出已支持。 |

## 数据边界

- 真实树最多5000节点；同父名称和顺序唯一，循环/跨集/展示根`gank-root`由现有服务拒绝。图谱坐标不进入交换或持久化。
- 正文公共Text上限200000字符；文件/总体解析64MiB、文本IPC输入最多1400000字符；标题候选最多5000。不得将文件上限等同于粘贴输入上限。
- source标题首批最多100、按公开headings API补页；导入预览默认50行、页面最多100；diff最多200000字符；导出可见预览100000字符，完整copy/save仍从同一exportToken获取。页面必须明确截断/分页，不能把前50行当整个变更范围。
- 普通Markdown标题只是候选，需明确selectedLines；正文标题不应无条件升成节点。带标记v1保留正文中的标题、代码、公式、颜色和字面标记；同父重复路径拒绝。
- includeParentBodies/includeDescendants是当前批次布尔选项；原型提供逐节点范围选项。B3需明确现有批次语义，决定是否必要最小适配，不能直接声称逐节点合同已实现。
- 预览仅内存，数据库重开后token失效；已确认数据持久化，旧token不得跨进程再次确认。文件写入结果未知走既有待核对操作，不自动重复文件副作用。

## B2/B3 的精确缺口与最小方案

1. **B2大纲呈现**：冻结HTML的`knowledgeOutlineNav`和文档式模块样式（约261–288行）提供层级正文文档。当前正式大纲仅当前节点正文+递归目录。先以真实身份同步和单一活动Crepe实例为基础，补正式文档/目录交互及必要视觉；不能用原型`readLiveMarkdown`重做编辑器。节点切换/关闭/失败草稿/原生undo/redo必须正式Electron补验，不能只靠服务测试。
2. **B3预览内容**：现有列表展示完整路径/动作/字数/图片总量，`showDiff`按需显示before和after。默认keep时after等于原正文，**无单独incoming正文**；当前DTO不返回逐节点图片引用清单。最小方案是在既有分页/差异API上补受限的待导入正文/引用元数据与清晰政策展示，复用现有图片校验/解码，不重建存储、布局或编辑器。B1不改公共合同，后续改动须同步codec/协议测试。
3. **B3导出范围**：原型transferRight有全选/清空、搜索及逐节点选项，现有UI只有勾选+批次选项。整树/局部服务已存在，按必要操作补入口并标明“必要祖先仅标题”的行为；深层导出的GAP不得被空按钮或静默扁平化掩盖。
4. **六级GAP方案**：B3先评估在现有服务中把选定子树重定基准层级的最小适配，明确祖先上下文如何保留；若子树自身超过六级，仍须有明确限制或另行定义无损格式。不要改知识树层级凑导出，不新造布局引擎或在B1擅改格式。此项必须在R5.b DONE前解决必要合同或明确验收限制，不能仅凭文档登记宣称通过。

## 本轮验证和下一入口

`evidence/b1/markdown-tests.txt`：26/26 PASS（3个新增边界+23个现有Markdown相关用例），真实隔离Schema606/typed协议/SQLite及文件；非Electron GUI。命令/指纹见`verification.json`。预览取消零写、混合append+新子节点+图片的回执故障精确回滚，原请求重试/重放仅一次，数据库重开精确相同。第七级拒绝测试PASS表示限制被确认，不表示深树导出成功。

没有生产/UI改动，因此不重复R5.a截图/领域/交互或构建；B2/B3/B4正式Electron、窗口退出重启、受影响视觉仍NOT_RUN。下一Work从本文件及R5/PLAN恢复B2，先核实最新HEAD；B1稳定检查点通过连接器保存后主动结束。
