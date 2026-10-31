# B5 Markdown 逐节点导出与最终集成

基线 `8fa4d94ac39dc7bcc98ec164eca09d7a221a3869`；唯一分支 feature/v077，Schema606。仅B5，三个检查点；不合并、不发布、不等待CI、不重跑旧250。

## B5.1 DONE：协议与唯一范围计算

现有 knowledge.md.export.preview/copy/save 入口不变，无新IPC/表/Store/业务服务。新请求 selectionVersion=2，expectedTreeHash、directNodeIds、rules[{nodeId,includeParentBodies,includeDescendants}]、excludedNodeIds。规则源必须直接选中；对派生行开规则时将该行提升为直接选择。不递归开启新规则。所有ID必须在当前树内，重复/孤立规则/冲突排除明确拒绝。空有效集拒绝导出。

未带版本的旧 nodeIds+全局布尔请求保留原语义，通过显式adapter进入同一范围算法；strict union拒绝混合新旧字段。现有生产UI在B5.2迁移v2，原测试/外部旧调用不静默改变含义。

shared/knowledge/export-selection.ts 是前后端唯一规则与树索引实现：追踪直接、逐规则父级/子树贡献、主动排除，按ID去重；关闭规则仅移除其独有贡献；手动取消派生点以排除覆盖，相关规则显示部分状态；再按部分按钮恢复该规则完整范围。取消规则源移除该源规则，仅将因此丢失的其他可见项转为直接选择，保留其他规则来源。关系遍历、稳定顺序、深度和完整路径在同一局部索引内复用。

正文集合严格等于有效选择。为保留真实层级必须存在的未选祖先仅导出空正文结构标题，nodeCount包含这些标题，bodyCount只包含有效选中ID（含空正文节点），界面须明确说明。Markdown序列化、图片、大小上限、token/epoch/tree修订、复制、文件保存/未知结果机制和导入保持原服务。

实际：18项定向测试PASS（B5新增12 + 原存储6），后端类型PASS。失败尝试原样保留：合成夹具误用了同父重名、测试未连接系统剪贴板；修正夹具与断言入口后通过，不修改生产保护。证据 `../evidence/b5/b51-domain-final2.tap`；未执行GUI/Windows。检查点SHA以该路径Git历史与远端读回为准。

## B5.2 DONE：正式双向界面

B5.1远端 `cfdb05fe0acab8619df93344c9821be6a139b27f`，tree `6175938f1e4e8edede19d95d0043040400ac6879`，与本地2f902d4完整tree相同；连接器独立读回。

正式KnowledgeMarkdownExchange使用一份ExportSelection、同一共享resolver的effective驱动两侧；去掉全局开关。每行真实层级、勾选、父级/子树按钮、灰色禁用/浅绿/深绿/部分状态。图谱点击/二次点击同步右行并滚动；右侧点击/条件/搜索聚焦左图；逐节点ID与完整路径区分重名。搜索Enter/定位不改选择，无结果1.2秒消失。每次选择变化废弃预览；v2附树hash，服务端重新验证。未选祖先仅保留空结构标题，计数说明明确。

复用KnowledgeExchangeMap/MindElixir 6.0.0-next.4的公开expandNodeAll/findEle/scale/move，不加图谱引擎。锁定版本scrollIntoView在300ms动画中忽略后续请求（dist/MindElixir.js的Ge/rt；公开签名见dist/types/index.d.ts），因此交换视图用公开move + 瞬时CSS转场，保证快速定位最后一次目标；不访问/修改依赖私有字段或node_modules。三宽测试检查目标实际位于画布内，而非仅检查focused类。影响仅共享交换图谱定位，B4编辑和筛选最小集成补验。

导入文件/挂载/冲突/正文策略/预览/确认保持原工作流；导出业务不进入公共知识点选择器。导出新操作开始清空上次notice，避免失败时残留旧成功提示；未知文件结果仍锁定重写并指向设置核对。

Vue类型、完整构建、最终renderer增量和协议检查21项PASS，163个方法入口未增加；领域/Markdown/媒体/边界29项PASS；B1–B4交界7 PASS。正式Electron先导操作链18组PASS，Windows NOT_RUN。B5.3将在远端冻结的源码与脚本SHA上进行最终验收。

## B5.3 NOT_STARTED

待正式Electron、三宽、SQLite、独立进程重启及B1–B5交界最小验收。Windows10/11与真实125%缩放NOT_RUN。
