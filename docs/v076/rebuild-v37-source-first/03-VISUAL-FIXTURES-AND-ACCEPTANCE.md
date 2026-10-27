# 03 — 同源 HTML 的严格视觉验收、状态夹具与差异闭环

## 目标、来源和不容协商的规则
原版 `docs/v075/reference/OPEN-ME-v3.7.html` 冻结只读，其 SHA-256 必须精确为 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`。**视觉比较对象为“相同屏幕尺寸、数据语义、页面状态、字体、缩放的原型与正式生产 Electron”**，不能拿空数据库截图与原型丰富演示内容直接得出“相似/不相似”的验收结论。另保留独立的空数据库、真实数据规模、窄宽和错误态测试，不能为截图向正式 UI 注入假数字。

## 两条互不替代的测试数据轨道
- **A. 原型等效视觉夹具**：用隔离临时 Schema606 数据库通过现有 typed protocol / 真实业务服务生成类似原型的文件夹、5个卡片集、卡片/关联知识、会话及学习记录。原型示例含242卡、53到期、18今日完成；实现时必须从真实 FSRS/事件读取得出可验证值，不直接设前端常量。若当日/时区/FSRS状态不允许严格复制数字，记录业务可解释差异，以稳定的构造状态和语义归一化对照布局。绝不伪造“掌握度76%”等无真实业务定义的指标。
- **B. 真实业务兼容夹具**：全新空白606、小型合成非空606、单集和多文件夹/嵌套目录、异常/超长标题、图片/公式、不同复盘事件、不同尺寸数据库。测试真实效果、可访问性、响应性能与持久化。

每张截图单独记录 `prototypeHash`、`gitHead`、`workingTree`、`appEntry`、`platform`、`screen/viewport`、`deviceScaleFactor`、`zoom`、`fontFamily`、`fixtureId`、`fixtureSeed`、`pageState`、`captureCommand`、`sha256`。不能将工作树或 Linux 辅助证据冒充 Windows 正式包。

## 捕获顺序与精确对齐
1. **原型**：用已存在的 `tools/validation/capture-ui-reference-v076.mjs` 或等效脚本打开单文件原型；明确设置 `state.page`、卡片集、编辑模式、揭示/评分阶段、知识图谱选择与弹窗状态。截图与 DOM 结构快照、computed style、布局坐标一同保存。
2. **正式 Electron**：真正运行 `electron/main.ts` 的 production606，不使用 `src/App.vue` 或 test-only demo；数据由 API/测试夹具生成；等待字体、动态数据、编辑器/图谱稳定且不靠随意 sleep；对同一页面状态截图。
3. **窗口**：至少 1500x900、1366x900、900x900；在 Windows 对 100%/125% 缩放及中文字体再验证；所有采集结果必须测量截图像素维度、CSS viewport、`innerWidth`、窗口装饰、滚动条占位，防止曾出现的“1484 vs 1500”误判。
4. **差异**：为每个状态输出 `reference-*.png`、`production-*.png`、`compare-*.webp` 和 `diff.json`；并列、透明叠加或热图只是辅助，必须逐DOM区域和计算样式解释差异。禁用遮挡、裁切、CSS隐藏、改原型或任意拉伸使截图“接近”。
5. **每页逐项核验**：导航宽度/字面层级、顶栏、二级导航、内容左边界、区域顺序、主副列比例、统计卡尺寸、CTA/按钮、表格列顺序、图标、正文排版、字号/行高、间距、颜色、阴影、边框、滚动、空态、提示、弹窗、焦点/hover、900px原型响应行为。变化需逐项归因。
6. **差异分级**：`BLOCKER`（导航/版式重构、区域缺失、核心交互失效）、`MAJOR`（显著尺寸/布局/状态差异）、`MINOR`（微小图标/抗锯齿差异）。BLOCKER/MAJOR 必须修复；MINOR 也要留记录或经所有者明确同意。无审核批准不得视作“已接受”。
7. 修复后保留历史证据并重新采集新版本全套同状态截图；旧证据不得覆盖或改名冒充新图。Linux只标辅助；Windows中文正式 Electron、Win10/Win11人工签核独立标记。

## 验收表实例（每页面/状态/宽度一个）
```yaml
page: overview
prototype: docs/v075/reference/OPEN-ME-v3.7.html::overview()
implementation: src/unified/UnifiedHome.vue
fixture: matched-v37-seed-v1
state: home-synthetic
width: 1366
height: 900
source_sha: <tested-code-sha>
platform: linux|windows
font: <font>
reference_image: <path>
production_image: <path>
comparison_image: <path>
dom_structure: PASS|FAIL|BLOCKED|NOT_RUN
computed_style: PASS|FAIL|BLOCKED|NOT_RUN
visual_review: PASS|FAIL|BLOCKED|NOT_RUN
differences: [{selector: '.deck-row', severity: MAJOR, expected: '...', actual: '...', fix: '...'}]
evidence_validated: true|false
reviewer: <who>
```

## 不得用形式化测试代替视觉验收
仅测试 213px 宽、无溢出、按钮圆角、能生成 PNG，**不能**得到视觉 PASS；相同数据必须同时检查结构与计算样式。所有未验证项标 `NOT_RUN`；截图采集 BLOCKED 时不得假称对照通过。与后端 E2E 结果分开报告，但联合决定阶段能否 DONE。
