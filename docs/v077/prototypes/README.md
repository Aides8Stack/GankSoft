# GankSoft v0.7.7 — 三个 Vue3 交互设计原型

> **2026-10-30 最终用户授权：本轮只保留 Vue 预览、需求和后续 API 设计文档；不实现正式功能。** 这里是**隔离的 Vite 预览应用**，不会调用 Electron IPC、写入 Schema606、运行真实 ZIP 导入导出或修改正式导航。

> 2026-10-31：目录模块已按新授权进入B3正式接入，见 [B3报告](../fixes/B3-CATALOG-MANAGEMENT.md)。本目录仍保持隔离mock预览；知识图谱/Markdown导出原型仍待B4/B5，不在B3实现。

## 直接运行

从 GankSoft 仓库根目录执行（使用项目已有依赖，若已安装则不需要重复安装）：

```sh
npx vite --config docs/v077/prototypes/vite.config.ts
```

然后在浏览器打开 `http://127.0.0.1:4177/`。这是 Vue 3 + TypeScript 的完整可交互设计预览，**不要仅双击 `index.html`**：它依赖 Vite 编译 `.vue` 单文件组件。

可选：只验证这份预览的构建，在根目录执行：

```sh
npx vite build --config docs/v077/prototypes/vite.config.ts
```

构建结果仅落在 `docs/v077/prototypes/dist/`；**不等于生产 Electron 构建或 Windows 实机验收**。若当前没有安装依赖，不要求为了本轮重新安装全部软件包。原型已经提交 GitHub，但本次未在容器执行上述 Vite 构建。

## 三个模块与设计依据

| Vue 预览模块 | 源文件 | 最新需求 |
| --- | --- | --- |
| **卡片集目录管理**：窄侧栏、`+`、右键/`⋯`、模拟新建/编辑/移动/软删、单卡片集 ZIP 导出入口；**无文件夹导出** | [catalog/CatalogManagementPreview.vue](./catalog/CatalogManagementPreview.vue) | [目录管理规范](../requirements/CATALOG-MANAGEMENT.md)、[#29](https://github.com/Aides8Stack/GankSoft/issues/29) |
| **筛选学习 → 选择知识点**：图谱单击切换、选中全体子孙、搜索定位/未找到提示、已选标签双向同步、确认后仍需应用 | [knowledge/FilterKnowledgePickerPreview.vue](./knowledge/FilterKnowledgePickerPreview.vue) | [知识点选择弹窗](../requirements/KNOWLEDGE-POINT-SELECTOR.md)、[#27](https://github.com/Aides8Stack/GankSoft/issues/27) |
| **Markdown 导出右栏**：分级单行、每节点包含父级/子树、实际选择双向同步、重叠来源保护、导出范围预览（示意） | [knowledge/MarkdownExportSelectorPreview.vue](./knowledge/MarkdownExportSelectorPreview.vue) | [Markdown 导出选择](../requirements/MARKDOWN-EXPORT-SELECTION.md)、[#28](https://github.com/Aides8Stack/GankSoft/issues/28) |

- [App.vue](./App.vue) 是三模块标签页入口及统一示例数据。知识点预览复用 [knowledge/GankKnowledgeGraphCanvas.vue](./knowledge/GankKnowledgeGraphCanvas.vue) 和 [knowledge/knowledge-preview-types.ts](./knowledge/knowledge-preview-types.ts)。
- 模拟数据在内存中，刷新会重置，不接触用户的真实卡片/知识点。根节点「知识图谱」为演示中的唯一根，不能作为普通知识点勾选。
- 图谱 SVG 是为**演示交互逻辑**而写的轻量预览。正式 GankSoft 必须复用已有图谱引擎和 Schema606 API，不得直接拿 SVG 模拟组件替换正式思维导图。
- Markdown 导出的两个逐节点条件在正式后端目前只有全局条件，**未来必须修改导出协议和服务端范围计算**，否则只是前端模拟。当前预览“预览导出范围”不会生成真实 Markdown/ZIP。
- 卡片集 ZIP 导出**只针对卡片集**。当前 Schema606 内容包协议不等于完整备份，不保证草稿/学习历史/FSRS，不能将模拟导出入口视为实际已经支持完整卡片集 ZIP。

## 统一知识点选择器 API：设计约束（尚未接入此原型）

这套 Vue 预览当前用于**模拟视觉和选择行为**。正式实施时，必须将图谱弹窗抽成**一个可供多个页面调用的前端 API**，已选数量实时从唯一 ID 集合计算，确认只返回所选 ID，取消不提交。不要把 `FilterKnowledgePickerPreview.vue` 在每个正式业务页面复制一份，也不要把 Markdown 导出的逐节点条件塞入这个公共弹窗。

当前调用点、建议接口与不增加不必要复杂度的边界，统一见 [知识点选择 API](../requirements/KNOWLEDGE-PICKER-API.md) 和 [架构约束](../requirements/ARCHITECTURE-GUARDRAILS.md)。**本轮只补充设计，未修改正式 Vue 组件/后端 API。**

## 给下一轮 Work 的读取顺序

先读 [requirements/README.md](../requirements/README.md)，再读需要的专题规范，最后打开 `docs/v077/prototypes/` 在浏览器观察与操作。实现必须基于**当时 GitHub 实际最新 HEAD**、已有生产 API 与正式测试，不能假定本轮已经开发完毕。未经新授权不得修改生产源码、重新设计左侧宽度、合并/发布或重置已有250条测试。
