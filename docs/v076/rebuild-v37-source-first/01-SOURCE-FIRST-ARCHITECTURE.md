# 01 — 源码级迁移架构与实施规则

## 一、先拆原型，不再“看图重写”
原型是单文件 HTML（<style>、DOM模板、<script>、状态与事件处理）。R0 先通过已锁定原型 SHA-256 读取全文，按**确切原型函数和 CSS 选择器**建立 `prototype-dom-css-inventory`，包括：`app-shell`, `left-rail`, `topbar`, `subnav`, `page-heading`, `summary-strip`, `metric`, `split-layout`, `deck-row`, `soft-callout`, `quick-row`, `subsection-grid`, `editor-shell`, `knowledge-toolbar-levels` 等，覆盖弹窗、悬停、焦点、空态和响应式。不同页面函数/分支代表不同原型状态，必须记录，不能只看入口截图。

**输出必须是定位到源码的机器可审阅矩阵**：原型函数 / CSS选择器与属性 / 对应DOM结构 / 交互事件 / 正式Vue目标 / 生产数据与API / 不一致说明 / 证据路径。逐项标 `EXACT`、`BUSINESS_ADAPTED`（附证明）、`MISSING` 或 `NOT_VERIFIED`；这些是矩阵项状态，不替代阶段状态。

## 二、分层而不重写业务
```
冻结 OPEN-ME-v3.7.html (只读，不可更改以让测试绿)
  ├─ DOM/CSS视觉合同 → Vue SFC 模板与 scoped/分层 CSS
  ├─ 页面交互语义 → Vue state/composables/command adapter
  └─ demo data/actions → typed gank.protocol → electron/modules → Schema606/FSRS/media
```
生产入口仍是 `electron/main.ts` → `src/main.ts` → `src/unified/UnifiedWorkspace.vue`。不使用 iframe/demo 原型替代。模块可以逐页迁移至如 `src/unified/v37/`；路径和拆分名称为建议不是强制，优先复用 `src/unified/UnifiedHome.vue`, `UnifiedDeckOverview.vue`, `UnifiedCardDetail.vue`, `UnifiedAnalytics.vue`, `UnifiedCardEditor.vue`, `UnifiedWorkspace.vue` 及现存模块。**只在对照证据支持时替换**。不可让旧版 604 入口被误认为正式 606。

## 三、CSS 从单文件补丁转为单一真实规则来源
现有 `src/unified/ui-v076.css` 包含重复覆盖（检查点：`.unified-content` 多处、`.metric` 多处、`.catalog-grid` 多处），不可再向文件尾部无限追加“full-fidelity fix”。R0 生成样式生效与覆盖报告，R1 按原型拆分：
- `tokens.css`：原型原值、色板、字体、边框、圆角、阴影
- `shell.css`：left-rail、topbar、subnav、content 定位
- `components.css`：buttons、deck-row、metric、stat、table、cards、modals
- `pages/*.css`：只容纳该页面特有样式
- `responsive.css`：来自原型的断点和经批准的必要狭屏处理

先用 CSS 计算样式及两版DOM快照证明等价，再在迁移过程中删除已被接管的旧规则。避免整体重写引发未测试回归；不得保留互相打架的两个同优先级来源。对第三方组件仅修改公开支持的外层容器/主题和必要样式，不触碰内部私有实现。

## 四、组件拆分示例（以原型为边界）
`AppSidebar` + `AppHeader` + `PageHeading` + `DeckRow` + `MetricCard` + `HeroPanel` + 各页组件；命名可复用既有 SFC。要求原型 DOM 层次、尺寸比例、gap、字体、边框、颜色、图标、标签、可见条件尽可能直接对应。若原型与生产行为冲突，只做记录的`BUSINESS_ADAPTED`，不顺手“优化”成新样式。
- 文字目录按原型：约213px左栏，学习总览 + 卡片集树 + 计数 + 底部设置；原型 `.left-rail` 为最高优先。
- 顶部 `.topbar` / `.subnav` 原样定位；全屏知识图谱在**已有用户确认的专用画布状态**可以占满可用窗口，但普通页面不变成纯图标壳。
- `Crepe/Milkdown` 实际富文本编辑、选区、表格、图片粘贴、IME 等保持原生公开 API，不复制原型 demo contenteditable。
- `Mind Elixir` 保持图谱渲染引擎；迁移外层工具/搜索/大纲/选中侧栏，真实树的增删改/拖动由知识服务持久化。

## 五、API适配与性能
组件不直接访问 SQLite/Node/FS；通过 `src/services.ts` 和 typed `window.gank.protocol` 访问 existing gateway。先查真实 `shared/protocol/registry.ts` 与业务服务，再记录准确方法；例如 `workspace.catalog`、`workspace.dashboard`、`learning.session.open` 等现有方法，其他方法不得猜测签名。页面首次仅获取必要 summary；列表分页/搜索后端查询，详情按需加载；不要为了截图对齐一次读出所有卡片正文、媒体和学习历史。保留草稿保护、CAS、epoch、回执、事务回滚和 S8.b 的彻底取消。

## 六、每次迁移步骤
1. 对原型函数/DOM/CSS/state/actions 定位，保留原文件和哈希
2. 取得正式生产代码/实际调用链，列 `EXACT/MISSING/BUSINESS_ADAPTED`
3. **先移植原型布局**，再补真实状态与对应 typed API；不借业务缺口偷改外观
4. 组件+CSS静态映射检验、同数据视觉对照、真实 Electron 行为与持久化测试
5. 针对性回归，记录差异，分小提交推送，读回远端
6. 若原型局部不可直接迁移（例如模拟图谱、demo editor），记录原型的**外壳视觉与交互合同**、正式成熟组件的能力边界，并提交其适配依据；不伪造全等或自由重写
