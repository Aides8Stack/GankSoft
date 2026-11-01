# GankSoft v0.7.7 — 知识图谱交互 Vue 预览

这个目录是**设计原型代码**，不是生产 MindElixir 接口，也不调用数据库。

- [GankKnowledgeGraphCanvas.vue](./GankKnowledgeGraphCanvas.vue)：图谱的共享轻量 SVG 演示组件（受控 selectedIds、定位、禁选单树根、平移缩放、单击节点）。供两个预览复用，正式软件应继续使用其生产图谱引擎。
- [FilterKnowledgePickerPreview.vue](./FilterKnowledgePickerPreview.vue)：筛选学习单独的「选择知识点」弹窗。支持搜索框（Enter/按钮只聚焦，不改变选中）、不存在时约1.2秒短提示、点击/取消、选中全部子孙弹出操作，以及 **弹窗确认选择 → 筛选页再次点击「应用知识点」** 两阶段。
- [MarkdownExportSelectorPreview.vue](./MarkdownExportSelectorPreview.vue)：Markdown 导出页。左图单击/右侧复选框同步；右侧逐行缩进、父级/子树条件，每个被包含的祖先/后代都应自动勾选、图谱同步高亮；关闭条件时保留独立选中与其他来源的节点，禁止两侧错乱。
- [knowledge-preview-types.ts](./knowledge-preview-types.ts)：共享的知识点 ID/parentId 设计类型；非正式协议 Schema 类型。

启动命令与预览入口见 [../README.md](../README.md)。

**区别：** 筛选弹窗里“选中全部子知识点”属于临时筛选选择，确认后仍须应用；Markdown 导出每行“包含整个子树”属于逐节点**导出范围规则**。二者虽然共用视觉原型，但业务状态和后端提交必须分离。更多要求见 [#27](https://github.com/Aides8Stack/GankSoft/issues/27) 和 [#28](https://github.com/Aides8Stack/GankSoft/issues/28)。

这些预览组件可以浏览器内交互，但不代表已执行正式 Vue 编译、Electron GUI 或真实 Windows 客户端测试。本次所有正式功能保持待开发。
