# GankSoft v0.7.7 — Windows 实测需求统一入口

> **状态：已收集/待开发、待重新验收**  
> 决策日期：2026-10-30。目标分支：`feature/v077`；数据库：Schema606。  
> 依据：用户 Windows 便携测试包的实际截图与明确补充决策，关联 GitHub Issues #16–#29。  
> 本目录是**本轮新增及修订需求的当前实施依据**，不是现有软件已实现的功能说明。

## 读取顺序与文件分工

| 文件 | 范围 | 主要来源 |
| --- | --- | --- |
| **[CARD-DRAFT-PUBLISH.md](./CARD-DRAFT-PUBLISH.md)** | 卡片临时编辑、显式草稿保存、直接发布、必填星号、居中短提示、按钮状态，以及粘贴/保存原始缺陷 | [#16](https://github.com/Aides8Stack/GankSoft/issues/16)、[#17](https://github.com/Aides8Stack/GankSoft/issues/17)、[#19](https://github.com/Aides8Stack/GankSoft/issues/19)、[#21](https://github.com/Aides8Stack/GankSoft/issues/21)、[#22](https://github.com/Aides8Stack/GankSoft/issues/22) |
| **[NAVIGATION-AND-DIALOGS.md](./NAVIGATION-AND-DIALOGS.md)** | 独立草稿箱、删除/继续编辑、子页面返回来源、编辑页取消按钮、Prompt/粘贴预览弹窗尺寸 | [#20](https://github.com/Aides8Stack/GankSoft/issues/20)、[#22](https://github.com/Aides8Stack/GankSoft/issues/22)、[#23](https://github.com/Aides8Stack/GankSoft/issues/23)、[#24](https://github.com/Aides8Stack/GankSoft/issues/24) |
| **[KNOWLEDGE-WORKSPACE.md](./KNOWLEDGE-WORKSPACE.md)** | Markdown 大纲全部正文默认展开；单树知识图谱、去重工具栏、纯图标操作和画布空间优化 | [#25](https://github.com/Aides8Stack/GankSoft/issues/25)、[#26](https://github.com/Aides8Stack/GankSoft/issues/26) |
| **[KNOWLEDGE-POINT-SELECTOR.md](./KNOWLEDGE-POINT-SELECTOR.md)** | **筛选学习调用的图谱弹窗**：节点多选/取消、弹出批量子孙选择、搜索定位、不存在短提示、弹窗确认后还须在筛选页单独应用 | [#27](https://github.com/Aides8Stack/GankSoft/issues/27) |
| **[MARKDOWN-EXPORT-SELECTION.md](./MARKDOWN-EXPORT-SELECTION.md)** | **Markdown 导出页右侧列表**：一行一节点、层级缩进、每行父级正文/整个子树独立条件、左右图谱双向选中与聚焦 | [#28](https://github.com/Aides8Stack/GankSoft/issues/28) |
| **[CATALOG-MANAGEMENT.md](./CATALOG-MANAGEMENT.md)** | 卡片集/文件夹窄侧栏小图标与右键管理、新建/改名/移动/软删及**仅卡片集ZIP**导入导出；Vue 交互原型入库 | [#29](https://github.com/Aides8Stack/GankSoft/issues/29) |

[全功能操作链与用户闭环问题 #18](https://github.com/Aides8Stack/GankSoft/issues/18) 适用于上列三组需求的回归验收。

## 必须先理解的最新决定（旧要求已被覆盖）

1. **不再自动保存草稿。** 进入新卡、编辑字段和切页前，不得自动创建或更新持久草稿；用户点击「保存草稿」才存储，点击「发布卡片」才正式发布。**直接发布不能先偷偷创建草稿。** 有草稿则发布成功后同事务清除草稿。
2. **草稿无发布必填门槛。** 即使只填一部分或首次明确点击保存一张空白新卡，也可以保存草稿。结构、安全、媒体约束仍须遵守。**这一决定覆盖此前“空白卡保存按钮禁用”的旧要求。**
3. **资料缺失时“发布卡片”仍然可点击，以触发校验提示。** 缺项时居中红色半透明圆角 toast 约1秒消失；连续点击每次重新出现并重置计时。校验失败零数据写入。此条覆盖“发布必填项不齐即禁用按钮”的旧草案。**成功发布且无新修改**时才禁用发布（另有提交中/未知结果等防重复锁定）。
4. **明确保存/发布状态。** 新开空白编辑器不能假显示“已保存”。有本次可信保存回执才能说“草稿已保存”；首次保存/后来修改/已发布/失败/未知结果分别处理。
5. **独立草稿箱 + 子页面返回来源。** 草稿箱不是所有卡片页的一排标题按钮；有编辑、放弃草稿、搜索/分页与返回来源页。编辑页底部增加「取消」；导航栏直达的一级主页面无需返回，子页面都要有安全返回。
6. **Markdown 大纲全部正文默认展开。** 所有知识点按层级连续阅读完整正文，其他节点只读；不以160字摘要替代。
7. **知识图谱是单树交互，节点工具栏只用图标。** 删除「+ 一级知识点」及重复入口；仅保留清晰区分的“新增子节点/新增同级节点”图标，**不加常驻文字标签**（允许 hover 提示/aria-label）。只去除新增入口，**不删除或迁移既有知识点**。
8. **知识点选择弹窗不再显示全部知识点列表。** 图谱单击未选中则选中、已选中则取消；已选标签点击 × 反向同步；搜索 Enter/按钮只在图谱定位、绝不自动勾选；不存在时中央短暂显示“知识点不存在”；弹窗各区固定、整体不纵向滚动。见 [#27](https://github.com/Aides8Stack/GankSoft/issues/27)。
9. **Markdown 导出右侧按层级逐行显示知识点。** 一行含 checkbox 和两个逐节点可选的导出条件，图谱与列表互相选中和滚动定位；现有后端只有全局两项选项，实际实现必须扩展协议。见 [#28](https://github.com/Aides8Stack/GankSoft/issues/28)。
10. **卡片集目录管理采用紧凑右键/小图标菜单。** 复用现有目录写入、移动、回收 API；**只允许卡片集 ZIP 导出，文件夹没有导出功能**。Schema606 内容包目前最多500张已发布卡，不含草稿/历史；超限、空集不能假装成功。见 [#29](https://github.com/Aides8Stack/GankSoft/issues/29)。
11. UI 以 `OPEN-ME-v3.7.html` 已确认的主布局为基础：左侧保留窄图标栏和卡片集区，图谱/编辑区域尽量紧凑，不改成传统宽侧栏。

## 本轮追踪总表

| Issue | 主题 | 性质 | 当前 |
| --- | --- | --- | --- |
| [#16](https://github.com/Aides8Stack/GankSoft/issues/16) | 题干粘贴 `UNSUPPORTED_HTML` | 真实 Windows 报告/待根因闭环 | Open |
| [#17](https://github.com/Aides8Stack/GankSoft/issues/17) | 保存草稿后草稿箱找不到 | 真实 Windows 报告/待根因闭环 | Open |
| [#18](https://github.com/Aides8Stack/GankSoft/issues/18) | GUI → 持久化 → 重启闭环验收 | 测试验收要求 | Open |
| [#19](https://github.com/Aides8Stack/GankSoft/issues/19) | **最新**显式保存 / 直接发布 / 未提交仅缓存 | 产品生命周期决策 | Open |
| [#20](https://github.com/Aides8Stack/GankSoft/issues/20) | AI Prompt/粘贴预览弹窗太窄 | Windows UI 反馈 | Open |
| [#21](https://github.com/Aides8Stack/GankSoft/issues/21) | 发布反馈、必填红星、中央短提示 | Windows UI 与逻辑反馈 | Open |
| [#22](https://github.com/Aides8Stack/GankSoft/issues/22) | 保存确认、编辑页取消与返回 | Windows UI 反馈 | Open |
| [#23](https://github.com/Aides8Stack/GankSoft/issues/23) | 独立草稿箱/删除/返回 | Windows UI 反馈 | Open |
| [#24](https://github.com/Aides8Stack/GankSoft/issues/24) | 全部二级子页面返回来源页 | 全局导航决策 | Open |
| [#25](https://github.com/Aides8Stack/GankSoft/issues/25) | Markdown 大纲全部正文默认展开 | Windows 图谱 UI 反馈 | Open |
| [#26](https://github.com/Aides8Stack/GankSoft/issues/26) | 单树、纯图标、精简图谱工具栏 | Windows 图谱 UI 反馈 | Open |
| [#27](https://github.com/Aides8Stack/GankSoft/issues/27) | 选择知识点弹窗：子树弹出操作、搜索、两阶段筛选确认 | Windows 图谱选择 UI 反馈 | Open |
| [#28](https://github.com/Aides8Stack/GankSoft/issues/28) | Markdown 导出右侧分级列表、每节点父级/子树条件及左图谱同步 | Windows Markdown 导出 UI 反馈 | Open |
| [#29](https://github.com/Aides8Stack/GankSoft/issues/29) | 卡片集/文件夹目录 Vue 交互预览、管理规则与未来 API 接入计划（**尚未开发**） | Windows 目录管理反馈 | Open |

## Vue 交互预览（仅设计，不接生产）

- [Vue 3 卡片集管理预览](../prototypes/catalog/CatalogManagementPreview.vue) / [预览说明](../prototypes/catalog/README.md)（内存模拟，不写数据库）。另有 [知识点选择预览](../prototypes/knowledge/FilterKnowledgePickerPreview.vue) 和 Markdown 导出左右联动预览，均只供后续开发按 UI 合约实现。
- 后续实施计划：可新增 `src/unified/UnifiedCatalogContextMenu.vue`，将已有目录 API 与 `UnifiedCatalogBranch.vue`、`UnifiedWorkspace.vue` 对接。**本轮只做 Vue 原型和文档；此前试写的生产改动已正常恢复原状，未接入正式页面。**
- 卡片集导出**绝对不能**把旧 `exchange.deck.export` 当作完整 606 导出。

> **2026-10-30 最新工作边界：当前仅要求 Vue 预览和完整需求/API 规划，不要求实现软件功能。** 特别是 #29 左栏目录、#27 知识点选择、#28 Markdown 导出等预览，都不应被记作生产实现或正式 GUI 测试通过。后续开发需用户单独授权。

## 实施与验收边界

- **此目录仅整合需求，不代表已经修改生产代码或完成验收。** 不要因为新增文档修改旧的250条测试真实结果。
- 之前 `235 PASS / 0 FAIL / 3 BLOCKED / 12 NOT_RUN` 是**旧草稿自动持久化合同下**的某个冻结总账；不可把它宣称为新手动保存/直接发布合同的验收结果。需要重写受影响 NEW/OLD/EDITOR/CLIP/FAULT/UI 用例并在实际新源码上定向复验。
- 依照 `AGENTS.md`、`docs/development/STANDARDS.md`；继续使用 `feature/v077`，不得重置历史、强推、擅自合并 `develop` 或发布。
- 真实 UI 鼠标键盘操作、SQLite/协议回执、关闭并启动新 Electron 进程的读回，必须形成完整证据链；Linux Electron、Windows CI 和**实际 Win10/11 便携客户端**的结果要分栏，未测不写 PASS。
- 当前 Windows 测试包据已记录的编译源 SHA `2d6f9d080c40259747c218ec85ef37fee1728283`；本目录保存时的 `feature/v077` HEAD 为 `ab1c34a75bd84225a02252e396a3ff12d83bc0e7`。**开发和下一次打包必须读取 GitHub 实际最新 HEAD**，不得复用历史冻结 SHA 冒充最新版。
- 后续 Work 先以这里的**最新冲突覆盖规则**作为权威需求，再到各 Issue 看复现细节与历史背景。不得反向采用 Issue 下方已被覆盖的旧描述。

## 建议实施顺序

1. 先落地新草稿生命周期/发布原子性、失败恢复和必填校验，避免仅改按钮/文案；保留旧数据兼容。
2. 配套实现独立草稿箱与全局安全返回，再改内容预览弹窗。
3. 独立完善知识图谱大纲与精简工具栏。
4. 定向正式 Electron 业务回归、真实 Win10/11 用户复验、直接构建便携测试 ZIP；最后再考虑合并与发布。

## 变更维护约定

- 本目录集中记录 **2026-10-30 这批用户实测反馈**。后续同主题需求补充，优先编辑对应主题文件和此索引，而非继续在多个 Issue 重复粘贴相互矛盾的规范。
- 若新要求推翻旧决定，应显式注明日期、被覆盖的条款、对应 Issue，并同步更新测试验收合同，避免“最新要求”只存在于聊天。
