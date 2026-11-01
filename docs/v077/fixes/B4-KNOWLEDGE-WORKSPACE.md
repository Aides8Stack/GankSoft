# B4 知识图谱、大纲全文与统一选择 API

2026-10-31：B4.1 / B4.2 / B4.3 **DONE（本轮Linux定向验收）**。仅B4；Windows CI、Win10/Win11、真实125%缩放均NOT_RUN。旧250账本不改，不进入B5、不等待CI、不合并或发布。

## 来源与检查点

- 基线：`8eb914039ecda9c3a2dbac50c204fca4f830de1b`（开始时连接器独立查询HEAD）。
- B4.1：远端 `c33ac88ce571471ac6204071ef0abb30dd69bcf8`，与本地 `86490e759233d408d9354e93486fb8d81ea5f5f0` 完整tree一致。
- B4.2：远端 `e702a59a47d17565a7641deab2a068490cd43426`，与本地 `bc24635` 完整tree一致。
- 最终被测生产与脚本：`c5db77372818266757be008318e478a35ca023d0`。原始GUI结果直接记录该SHA及脚本字节哈希，逐文件见 [B4-SOURCE-IDENTITY.json](../evidence/B4-SOURCE-IDENTITY.json)。文档/证据追加不改变被测源码。
- B4.3远端最终SHA是包含本文的最终检查点，按 `git log -1 -- docs/v077/fixes/B4-KNOWLEDGE-WORKSPACE.md` / `feature/v077` 读取；独立读回回执另写Issues #25/#26/#27与交付消息。提交不能在自身内容中嵌入自身SHA。

## B4.1 主图谱

复用MindMapWorkspace/MindElixir、fixedMapNodes与已有知识树/CAS服务。去掉重复标题、一级新增按钮和未选节点常驻文本，仅留低权重数量；搜索收进图标弹出区，Markdown导入/导出按钮移到工具栏可见区，撤销/重做/展开/收起合并进更多菜单。沿用现有两枚不同的子节点/同级节点SVG，不增加文字标签。

空树独立提供“创建首个知识点”；创建后入口消失。不删除已有顶层节点、没有第二棵树引擎，没有新增自动重排。编辑/重命名、层级/同级排序、缩放/平移、详情、导入/导出/回收等原能力保留。900/1366/1600工具栏无横向越界。

## B4.2 大纲全文

KnowledgeOutlineDocument由“仅选中展开”改为默认全部正文展开，手动折叠集合只存展示状态。去掉160字摘要组件调用，不再以摘要替代正文；未被调用的旧摘要组件没有重新接入。选中节点通过原KnowledgeMarkdownPanel/MarkdownEditor编辑，其他节点复用原MarkdownContent只读渲染，通过IntersectionObserver在接近视口时读取正文和启动原只读渲染器，不在进入时一次性创建所有实例；进入分层大纲先完成原结构读取，不另建正文真相源。全部展开/收起同时作用于正文，切换编辑目标不折叠其他模块。

真实父子层级/顺序、长正文尾、图片字节与放置宽度、表格、块公式都经过GUI/SQLite验证；图片保持原asset/placement引用。Crepe对代码/公式采用视口内延迟渲染，验收脚本按实际阅读滚动进入视口后核验KaTeX，不修改公式正文/组件内部算法。正文读取失败显示错误并可重读。

## B4.3 一个公共 API、一份会话、一个宿主

`src/main.ts` 在真正激活的前端应用中创建一次 `createKnowledgePicker`，通过Vue provide/inject供 `useKnowledgePicker().open(request)` 调用，并且只挂载一次既有KnowledgePicker。该composable是应用范围的短暂交互会话，不是新增全局持久Store。统一读取、加载失败/重试、单一Set、后代操作、确认/取消Promise与生命周期。并发打开明确拒绝；调用者卸载/卡片集变化取消其会话，generation隔离旧加载回包。确认返回独立ID副本，允许空数组，与取消严格区分。

```ts
const result = await picker.open({
  deckId, initialSelectedIds, purpose: 'association',
  allowSelectDescendants: true
});
// {status:'confirmed', nodeIds:[...]} 或 {status:'cancelled'}
```

复用并改造KnowledgeExchangeMap，不复制Vue原型的SVG图谱。用真实click/Enter/Space激活进行toggle，避免MindElixir selectNodes定位事件与重复点击语义混淆。节点样式/chip/计数同源；结构根不可选。父节点普通点击不带子孙，显式后代按钮递归批量on/off；标签按ID取消。搜索Enter/按钮只聚焦；同名候选用完整路径；不存在中央提示1.2秒且计时可重置。展开会重建节点元素，因此通过公开findEle重新获取目标再定位，修复过期元素聚焦问题。

固定五分区，整窗无纵向滚动，标签局部滚动；SVG工具图标避免平台字形缺失。返回焦点、Esc/关闭、失败禁确认、重试以及反复打开均已检查。

| 实际调用入口 | 接入与业务边界 |
| --- | --- |
| UnifiedCardEditor | 同一API；确认只更新页面待保存ID，选择/取消不会保存草稿或发布。沿用已有已发布卡关联工作流，页面单独“保存知识点关联”才调用原knowledge.cardLinks.set，保留CAS/requestId/未知结果核对；正文继续B1显式保存/发布。未保存关联可显式放弃，离开时阻止误丢。 |
| UnifiedStudyPlanner顶部/右侧 | 同一宿主；确认只显示待应用列表，页面“应用知识点”才更新有效StudyFilters。 |
| QuestionEditor / MemoryEditor | legacy根按catalog.model条件可达，改为轻量KnowledgePickerButton调用相同API；模型交回原表单显式保存。未重新启用旧页；本轮未做legacy模型GUI。 |
| CardExplorer | 同一轻量触发器，沿用旧页筛选业务；无独立图谱/加载/选择状态机。 |
| 主图谱/Markdown导出 | 管理与导出仍是各自原工作流，不混入公共选择器；B5逐节点导出规则未做。 |

没有新增数据库表、IPC、全局Store、第二种图谱引擎或平行业务服务；electron/shared协议/Schema606及src/store.ts均无修改。API选择器没有创建知识点或任何持久化调用。

## 实际验证

| 层次 | 本轮结果 | 原始文件 |
| --- | --- | --- |
| Vue类型 | PASS | b4/b41-typecheck.txt、b42-typecheck.txt、b43-typecheck-final.txt（成功空输出） |
| 受影响知识领域 | 11 PASS | b4/b41-domain.tap |
| Markdown存储/媒体 | 12 PASS | b4/b42-domain.tap |
| 公共选择API生命周期 | 8 PASS | b4/b43-api-final.tap |
| 协议/边界/类型 | 21 PASS，163方法无协议变更 | b4/protocol.txt |
| 构建 | 初次完整build PASS，最终受影响renderer增量PASS | b4/build.txt、renderer-picker-final.txt |
| 正式Linux Electron | **18组PASS，0 renderer error** | b4/gui-frozen.json、gui-frozen.txt |
| 三宽截图 | 900/1366/1600图谱+选择器；1366全文大纲 | b4/map-*.png、picker-*.png、outline-1366.webp |
| SQLite/重启 | PASS，新PID 40→115、integrity_check=ok | b4/gui-frozen.json |
| Windows CI/Win10/Win11/真实125%缩放 | NOT_RUN | 不以Linux冒充Windows |

命令：`node --experimental-strip-types --test tests/unified-knowledge-v075.test.ts`；同命令运行knowledge-markdown-store-v075/knowledge-markdown-media-v075；同命令运行knowledge-picker-v077；`vue-tsc --noEmit`；`npm run check:protocol`；`npm run build`；`vite build`；`B4_EVIDENCE_DIR=validation-results/v077/b4/frozen node tools/validation/v077/b4-knowledge-workspace.mjs`。

正式Electron使用生产build/preload/IPC、隔离的合成Schema606库与只读SQLite；不是浏览器静态预览。系统提供的无显示器Linux ozone=headless模式不代表Windows物理桌面。复用现有依赖，未改锁文件；中文字体仅补入测试环境，不进入产品仓库。

18组覆盖：图谱三宽、零写入；全文/层级/图片/表格/公式/切换编辑；点击反选、标签/图谱、数量、子孙on/off；搜索路径/仅定位/缺失toast；选择器三宽；两步筛选；两个入口/编辑器同一DOM宿主；五轮打开关闭无重复toggle；延迟读取取消重开；关联独立显式保存、未保存正文保留；加载失败/重试/Esc；空树首节点与跨集隔离；精确业务写入审计；新进程重启/完整性。过程中只出现**一次knowledge.cardLinks.set和一次knowledge.tree.apply**，均来自显式业务操作；没有draft.save、card.publish或knowledge.node.save。

保留首次设施错误和真实定位缺陷，不把原FAIL删除或重写为PASS。`b4/ATTEMPTS.json` 分类11次前序尝试；各`gui-attempt*.json`保存原始状态/异常/实际源码与脚本指纹。多数为夹具与组件内部占位/虚拟化/离开保护的驱动不匹配；第8次发现真实搜索过期元素问题并修复。最终18组冻结结果与前序16组PASS不重复累加。未重跑B1–B3或旧250。大纲截图因单文件传输校验问题改为无损WebP，解码RGB逐字节相同，尺寸/像素哈希见b4/SCREENSHOT-CONVERSION.json；其他三宽截图为原PNG。

## 变更清单与边界

完整允许路径和逐文件gitBlob/SHA256/大小记录在 `B4-SOURCE-IDENTITY.json`；最终文档和证据清单由最终提交diff独立核验。核心源码：MindMapWorkspace、KnowledgeOutlineDocument、KnowledgeMarkdownPanel、KnowledgePicker、KnowledgeExchangeMap、knowledgePicker composable、main、两处正式页面、三个legacy调用者及轻量触发器。新增API8项测试和单一B4正式GUI驱动。

Linux验收通过不表示真实Windows、物理125%缩放、旧模型GUI或5000节点性能基准通过；这些本轮NOT_RUN。沿用现有树读取/编辑器资源限制，没有新增性能框架。保存三个检查点后立即结束；下一批B5必须另获授权。
