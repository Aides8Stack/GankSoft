# GankSoft v0.7.5 — Markdown 编辑器选型与验收建议（评审稿）

日期：2026-10-22。仅供设计确认；尚未引入依赖、修改 GitHub 或生成 Work 实施 ZIP。

## 一、核实结论

- **当前 v3.7 HTML 原型**：并未使用第三方 Markdown 编辑器。`demoRichMarkdown()` 用原生 `contenteditable`，`prototypeMarkdownPreview()` 用有限的手写预览逻辑。页面上的「实时渲染」是交互示意，**不保证完整 Markdown/LaTeX、图片调整或无损往返**。
- **当前仓库 `develop`**（审查 SHA `7970896c0306833e3b2f54a843f388d2e380618f`）：`package.json` 没有安装专用 Markdown 编辑器。`src/components/KnowledgeEditor.vue` 当前为结构化字段普通 `textarea`；已有 Vue 3、Electron、SQLite、独立图片服务以及类型化 IPC/API 协议。

## 二、推荐候选：Milkdown + Crepe（非已安装组件）

**理由**：与“默认边写边渲染、近似语雀/Notion 的正文编辑”目标一致；Milkdown 基于 ProseMirror/Remark，MIT 授权，Vue 3 集成明确；Crepe 提供工具栏、图片 Block、数学公式、表格、文本编辑等开箱组件。Milkdown 官方的图片 Block 明确包含拖拽缩放和上传接口，可用定制上传接入 GankSoft 本地媒体管理。`markdownUpdated` 事件可用于草稿变更通知。

| 用户需求 | Milkdown / Crepe 原生情况 | GankSoft 必须实现/验收 |
|---|---|---|
| 默认所见即所得、Markdown 编辑 | 官方支持 | 中文输入、表格、列表、长文档与焦点稳定性 |
| Vue 3 / Electron / Windows 离线 | 官方 Vue 3 集成；浏览器编辑器 | 正式打包、离线资源、暗色主题与 ASAR 检验 |
| 行内及块级 LaTeX | Crepe `Latex` 特性，KaTeX | 编辑/预览切换、序列化、重新打开无损 |
| 插入、粘贴、拖放图片 | 组件和上传插件提供接口 | 文件写入本地媒体库、稳定资源 ID、清理无用 blob |
| 每张图片独立缩放 | ImageBlock 提供 resize | **宽度持久化**；重启、复制、MD 导入导出后宽度仍独立 |
| 文字颜色、不同格式 | 可扩展但非本案保证的基础能力 | 自定义 mark 与 HTML/Markdown 安全解析及无损还原 |
| 自动保存、Ctrl+S | 有编辑变更事件 | 去抖保存、异常草稿保护、失败提示与显式 Ctrl+S |
| 知识点正文与卡片编辑复用 | 组件化基础适合 | 复用单独 `<MarkdownEditor>`，不让 UI 直接依赖数据库 |
| GankSoft 专用知识点正文标记 | 非通用编辑器职责 | 在独立 MD 交换层编码/解码正文边界，正文内部标题自由使用 |
| 单个 `.md` 包含 Base64 图片 | 编辑器非负责此数据交换约束 | 导出层将已引用本地图片转换为 Data URI，导入时提取并存储 |

**结论**：覆盖大多数编辑体验诉求，但**不是直接满足全部需求**；图片显示尺寸持久化、颜色语法无损转换和离线媒体与数据库集成是必须测试的关键风险。

### 建议技术边界（仅架构，非编码指令）

- `MarkdownEditor`：仅负责 UI 编辑、Markdown 文本/结构输出、格式工具栏和编辑事件。
- `DocumentService`：保存/读取知识点正文或卡片内容，处理草稿、保存状态与版本并发。
- `MediaService`：接管粘贴/上传图片，生成资源 ID，渲染时转换为本地安全 URL；不长期以临时 `blob:` URL 作唯一存储引用。
- `KnowledgeMarkdownExchange`：将节点树与正文以 GankSoft 自有标记写入 `.md`，处理内嵌 Base64 图片与结构冲突预览。
- `Renderer/Sanitizer`：统一可信渲染策略，禁止不可信 Markdown/HTML 注入 Electron 执行环境。

## 三、备选组件

- **Vditor（MIT）**：官方提供 `wysiwyg`、`ir`、`sv` 三种编辑模式，支持数学公式及粘贴上传，技术集成成本可能较低。但每图显示宽度、文字颜色及自定义正文标记的持久化往返也必须专项验证。
- **Cherry Markdown（Apache-2.0）**：官方支持图片调整、数学公式、Markdown 预览与扩展能力。需验证完整段落级所见即所得是否符合本软件选定的默认编辑体验。
- **Tiptap**：扩展与自定义 NodeView 很丰富，但官方 Markdown 扩展标注为 Beta，并有 Markdown 无损兼容限制，因此本轮不列为优先。

## 四、正式实现之前必须通过的最小技术验证

1. 中文输入法编辑、撤销/重做、自动保存/刷新恢复不丢失光标或内容。
2. 输入行内 `$...$` 和块级 `$$...$$`，正常渲染与编辑并能正确导出再导入。
3. 贴入两张图片并分别设置 30% / 80% 宽度；重启与 MD 导入导出后仍显示各自宽度。
4. 文字颜色、标题、表格、链接及内嵌特殊符号在 Markdown 往返后不丢格式；编辑器不应误把正文标题当作知识点。
5. 本地图片资源采用统一媒体服务；完整数据库备份及单 `.md` Base64 交换均能正确重建引用。
6. 自动保存失败、版本冲突、任务中断后不得虚报「已保存」；草稿与已发布内容互不覆盖。
7. Windows 10/11 便携包脱网启动，公式、图片及编辑器样式均不访问 CDN。

官方资料：
- https://milkdown.dev/docs/guide/getting-started
- https://milkdown.dev/docs/recipes/vue
- https://milkdown.dev/docs/guide/using-crepe
- https://milkdown.dev/docs/api/component-image-block
- https://milkdown.dev/docs/api/plugin-upload
- https://milkdown.dev/docs/api/plugin-listener
- https://github.com/Milkdown/milkdown
- https://github.com/Vanessa219/vditor
- https://github.com/Tencent/cherry-markdown
- https://tiptap.dev/docs/editor/markdown