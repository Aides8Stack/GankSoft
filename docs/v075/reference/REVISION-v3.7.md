# GankSoft v0.7.5 — v3.7 UI/Markdown 编辑器评审变更

## 1. 工具栏位置

按照用户 2026-10-22 截图：地图工具栏中选中节点的新增子节点、同级节点图标从最右侧移至「全屏」按钮后，和其他图标保持一条连续的操作带（屏宽不足时换行）。选中节点名保持轻量缩略显示；悬停或键盘聚焦有中文 tooltip；取消多处重复入口。

验收：桌面宽度约 1500px 时，两个新增按钮紧跟 `fullMap` 按钮，不再浮到右边缘；宽度约 900px 时可操作、无覆盖；功能点击仍能打开对应新增弹窗。

## 2. Markdown 编辑器现状及选型

- **v3.7 HTML 只是离线交互原型**，依赖原生 contenteditable、自定义 `prototypeMarkdownPreview`，不依赖 Milkdown、Vditor、Cherry Markdown、Tiptap；公式渲染、编辑与序列化并不完整。
- **2026-10-22 核实 develop/package.json** 未安装 Markdown 专用编辑器依赖。现有 `KnowledgeEditor.vue` 是普通文本域。
- **候选推荐：Milkdown + Crepe（MIT、Vue3、ProseMirror/Remark）**。官方证明：WYSIWYG、Markdown、LaTeX、图片 block/缩放、粘贴/上传、可自定义工具栏。将其封装为独立 `<MarkdownEditor>` UI 适配器和后端媒体 API，不要让页面直接管理文件路径或 SQLite。
- 正式集成必须额外验证：每张图片独立保存 displayWidth、内联/块级图片、引用与图注；所有公式在编辑和回显中正确转换；文字颜色在 Markdown/HTML 序列化和清洗后保持；粘贴图片必须进入统一媒体存储；输入自动保存+Ctrl+S 使用草稿/知识点 API 与错误提示；正文标题与 GankSoft 导入导出知识树结构标记必须分开处理。
- 单个 `.md` 导出中的 Base64 图片由知识点交换层注入，不把 Base64 当作日常数据库图片存储格式。不得默认依赖公网 CDN；Electron Windows 便携版需离线可用。
- 替代候选 Vditor：原生 WYSIWYG/IR/SV，数学公式和上传；图片尺寸/自定义颜色/Markdown 无损往返需项目专项验证。优先选择支持 Vue 3、可深度扩展、且图片/LaTeX 能力可靠的 Milkdown。

## 3. 验收边界

本轮仅验证 DOM 结构、图标位置、悬停标签、交互与浏览器无错误；**不表示正式 Markdown 组件完成**，正式选型需后续 Work 做技术验证，用户尚未批准生成交接 ZIP。

来源：
- https://milkdown.dev/docs/guide/getting-started
- https://milkdown.dev/docs/recipes/vue
- https://milkdown.dev/docs/api/crepe
- https://milkdown.dev/docs/api/component-image-block
- https://milkdown.dev/docs/guide/using-crepe
- https://github.com/Vanessa219/vditor
