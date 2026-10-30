# GankSoft v0.7.7 — 全前端统一「知识点选择器」API 合同与调用点清单

> **2026-10-31 用户最新架构要求：** 知识点选择弹窗不是给每个页面分别复制的组件，而是**整个前端可以统一调用的公共 API**；同一弹窗可展示已选总数、已选标签，用户确认后返回结果，调用业务自己决定何时保存或应用。**本文件仅做架构设计、调用点核对与后续实现合同；尚未修改任何生产代码。**
>
> 关联 [#27](https://github.com/Aides8Stack/GankSoft/issues/27)、[选择器交互规范](./KNOWLEDGE-POINT-SELECTOR.md)、[总计划 B4](./IMPLEMENTATION-WORKPLAN.md)、[模块化约束](./ARCHITECTURE-GUARDRAILS.md)；Vue 交互预览见 [FilterKnowledgePickerPreview.vue](../prototypes/knowledge/FilterKnowledgePickerPreview.vue)。

## 1. 当前前端调用/重复实现调查

核对 `feature/v077` 源码（本次调查基线 SHA `bb5cea439fb064ad6172473a0456314f6ddf7209`）：

| 入口 / 源文件 | 当前情况 | 优先级与目标 |
| --- | --- | --- |
| **正式卡片编辑**：`src/unified/UnifiedCardEditor.vue` | 内置独立 `<dialog>`、`KnowledgeExchangeMap`、自己维护 `chosen`、`linkQuery`，确认时调用 `knowledge.cardLinks.set`；与另一选择器重复 | **必须迁入公用选择器**，返回 nodeIds；关联写入仍由卡片业务按明确用户提交、revision/CAS 执行 |
| **正式筛选学习**：`src/unified/UnifiedStudyPlanner.vue` | 内置 `choosing`、`draftKnowledge`、长列表复选框；**顶部和右侧各一个**“选择知识点”入口，实际均调用 `choose()` | **必须迁入同一个公共选择器 API**。窗口「确认选择」只更新页内待应用 ID；页面「应用知识点」才更新有效筛选 |
| `src/components/QuestionEditor.vue`（原有错题编辑器） | 已使用 `KnowledgePicker.vue` 做知识点关联 | 旧路径：若生产仍可达，则迁移其调用契约；不可在未核实路由时删代码/另建第二组件 |
| `src/components/MemoryEditor.vue`（原有记忆编辑器） | 已使用 `KnowledgePicker.vue` 做知识点关联 | 同上 |
| `src/components/CardExplorer.vue`（原有卡片浏览/筛选） | 已使用 `KnowledgePicker.vue`，`purpose='filter'` | 同上；统一弹窗不应直接写筛选业务数据 |
| `src/components/ReviewWorkspace.vue`（原有按知识点复盘） | 当前是普通 `<select v-model='knowledgeId'>`，不是图谱弹窗 | **候选 1**：仅在确认仍是用户实际可达页面且适合图谱多选后规划迁移，不能为“全局复用”强制重构单选旧页 |
| `src/components/KnowledgeMarkdownExchange.vue` | 导出需要左图谱+右侧逐节点父级/子树规则、双向联动 | **不调用通用弹窗**；它与筛选/关联的选择语义不同。仅复用底层图谱渲染/选择 ID 工具，不混用导出逐节点规则状态 |
| `src/components/MindMapWorkspace.vue` | 主知识树管理与节点编辑 | **不是选择弹窗调用方**；树修改/删除操作不能混进选择 API |

**统计结论：当前确认 5 处页面已有图谱选择功能或实现（正式 2 + 原有 3）；其中正式筛选学习页有 2 个触发按钮，均应调用同一接口；另发现 1 个可选的旧复盘入口。** 这不是声称 5 个页面均由当前正式生产路由加载。正式运行时 `src/main.ts` 根据 `catalog.model` 在 `UnifiedWorkspace.vue` 与 `App.vue` 间选择根组件，因此**应在当前激活根中只挂一个选择器宿主**，共享相同 API 约定，避免无意义地重写旧路由。

实际调用点最终数量需在后续正式实施开始时按最新 HEAD 做一次小范围静态扫描并核对运行可达性。新增页面只能接入公共 API，不再复制选择器。

## 2. 最小公共 API：选择与业务写入解耦

前端建议提供单一入口 `useKnowledgePicker().open(request)`，由当前激活应用根提供一个弹窗宿主；这是一套**前端交互 API**，**不需要为“打开弹窗”新增 Electron IPC 或 Schema606 表**。知识树读取继续使用现有 `unifiedKnowledge.tree({deckId})` / 已有适配器。

```ts
type KnowledgePickerRequest = {
  deckId: string;                       // 必须明确所属卡片集
  initialSelectedIds: readonly string[];// 已关联或已暂选的真实 nodeId
  purpose: 'association' | 'filter';    // 只决定标题/提示，不执行业务
  allowSelectDescendants?: boolean;     // 显式操作“选中全部子知识点”
};

type KnowledgePickerResult =
  | { status: 'confirmed'; nodeIds: string[] }
  | { status: 'cancelled' };

interface KnowledgePickerAPI {
  open(request: KnowledgePickerRequest): Promise<KnowledgePickerResult>;
}
```

**不要在 Result 额外存储一份独立 `count` 字段**，避免计数和 ID 不一致；由 `selectedIds.size` 实时计算“已选 N 个”，确认返回时用 `nodeIds.length` 计算。根节点是结构容器，不可作为普通知识点选中。允许确认空数组（清空关联/筛选）与取消严格区分。

所有选择操作只修改弹窗会话内 `Set<nodeId>`，而不是直接修改调用方 `v-model`、`store`、`cardLinks`、`StudyFilters` 或数据库。确认只返回**不可共享引用的 ID 副本**，并关闭弹窗；取消不改变调用者状态。

### 调用方范式（不是本轮生产代码）

**筛选学习：**

```ts
const result = await picker.open({
  deckId, initialSelectedIds: pendingKnowledgeIds.value, purpose: 'filter',
  allowSelectDescendants: true
});
if (result.status === 'confirmed') pendingKnowledgeIds.value = [...result.nodeIds];
// 之后用户还需单独点击页面上的“应用知识点”，才更新真正 StudyFilters。
```

**卡片关联：**

```ts
const result = await picker.open({
  deckId, initialSelectedIds: editorKnowledgeIds.value, purpose: 'association'
});
if (result.status === 'confirmed') editorKnowledgeIds.value = [...result.nodeIds];
// 卡片保存/正式关联事务仍由 CardEditor 根据其显式按钮、revision 和回执执行。
```

如果已有已发布卡片允许独立保存关联，仍必须由该业务页面的显式确认负责 `knowledge.cardLinks.set`，选择器本身**绝不发起** `setLinks`。这是与 B1「未明确提交前仅内存缓存」的一致要求。

## 3. 共用选择器内必须存在的交互能力

- 进入时按 `deckId` 只读加载真实树；复用现有 MindElixir/图谱渲染能力，根节点不可选，不得新建第二种图谱引擎。
- 单击未选节点加入，再单击已选节点取消；下方“已选知识点”标签点击 `×` 反向取消；**同一个 Set 驱动图谱样式、标签和统计**，避免三套可写状态。
- 弹窗固定分区：标题、可平移/缩放图谱、已选标签、搜索栏、固定「取消/确认选择」底栏；整个弹窗禁止上下滚动，标签过多时仅局部滚动。
- 选中含子节点的节点后，提供显式「选中全部子知识点 / 取消子知识点」操作；只有主动点此操作才递归选择，不因选父节点自动选择所有子孙；使用 ID、Set、防循环算法，重复节点计数一次。
- 搜索 Enter/确认按钮：只定位/居中/短暂高亮，**不改变选择集合**；同名以完整路径辨认。不存在时中央圆角「知识点不存在」toast 约1.2秒消失，连续搜索重新触发并重置消失计时。
- 搜索/定位、缩放、平移、展开、改变焦点均不能隐式触发选中；图谱事件转发时区分真实用户点击与程序定位。
- 「已选 N 个」按**不重复 ID 数量**实时显示；增减/子树批量操作立即更新；点击确认返回准确 `nodeIds`。不得以 `chosen.push()` 造成重复和反复点击无法取消。
- 弹窗取消/Esc/关闭/路由离开 → `cancelled`，外部业务数据不变；正在打开时再次调用应明确拒绝或返回忙碌错误，**禁止堆叠第二个弹窗或覆盖第一份 Promise**。
- 知识树加载失败时在当前弹窗提供错误和重试，不能给出伪成功的空结果；运行中切换 `deckId` 要取消原会话，不跨卡片集泄漏 ID。

## 4. 结构约束：复用而不是增加并行系统

后续实施**优先重构现有** `src/components/KnowledgePicker.vue`、现有图谱渲染/知识树适配器，提炼可供多页调用的 `useKnowledgePicker` 受控接口；**不允许同时保留三套相互独立且仍被生产调用的“选择器状态机”。**

最小建议责任边界：

1. **公共选择会话/API**：接收 request、加载树、维护 `selectedIds` Set、递归子树、确认/取消 Promise；每次调用状态隔离。整个应用当前根只需**一个激活弹窗宿主**。
2. **现有图谱绘制适配层**：仅渲染、响应真实节点点击、执行纯定位/缩放与高亮；不能读写卡片关联或筛选条件；优先复用现有 MindElixir 能力。
3. **业务调用页面**：接收 `nodeIds`，分别负责卡片关联的明确提交或筛选页「应用知识点」。Markdown 导出仍使用独立页面和逐节点导出协议。

**不能把原 `KnowledgePicker.vue` 中直接 `services.knowledge.save()` 创建节点的动作混入公共选择 API**，因为创建知识点属于知识树管理写入、取消无法撤销。现有新增/管理功能应在知识树管理工作区保留，不得静默删除业务功能。若仍需从选择器快捷跳转创建，应使用独立明确导航/授权，完成后再只读刷新树，不产生“选择等于创建”的副作用。

避免为每个页面再引入自己的 modal、`chosen`、`search`、`loading`、`MindElixir` 生命周期。禁止建立多余前端全局持久 Store 或另一个通用 API 网关，也不要新增后端 `knowledgePicker.open` IPC：**弹窗打开是一项前端交互**。

## 5. 最小集成验收（安排 B4 定向执行）

| CASE | 应验证的合同 |
| --- | --- |
| API-01 | 从**正式筛选页顶部**与**右侧侧栏**两个按钮打开的是同一个选择器宿主，已有待选 ID 恢复一致 |
| API-02 | 正式编辑器调用相同 API，返回所选 ID；点击确认前和点击取消后原关联/数据库不变 |
| API-03 | 勾选、反选、`×` 移除、子树批量 on/off 后，图谱、标签、数量按 ID 完全一致 |
| API-04 | 按 Enter/点击搜索定位不改变选中数量；不存在 toast 自动消失；同名完整路径定位准确 |
| API-05 | 筛选：弹窗确认只更新待应用列表；页面再点「应用知识点」才触发筛选队列更新 |
| API-06 | 切换卡片集/连续打开关闭/并发双开/Esc/图谱加载失败后无旧选中泄漏、监听器不重复 |
| API-07 | 旧路径若实际仍可达，接入同一公共 API 且不破坏原有业务；不可达路径不重复重构 |
| API-08 | 检查没有第二套可达选择器状态机、没有新增无必要 DB/IPC 写入、没有重复加载图谱实例 |

所有结果以**正式源码和真实 Electron 测试**为准，原型能点击不等于业务通过；Windows10/11 实机需另行实际复验。当前全部为**待实现/NOT_RUN**。
