# v0.7.7 卡片集目录管理 — Vue 组件与真实 API 合同

> 用户 2026-10-30 实机截图确认；[Issue #29](https://github.com/Aides8Stack/GankSoft/issues/29)。继续 `feature/v077`、Schema606；以实际 GitHub HEAD 为准。
> **限定范围：只导出卡片集，不导出文件夹。** 目录管理栏的组件/状态必须紧凑，保留窄左侧栏，禁止重做成宽侧栏。

## 1. UI 结构和交互

左栏固定为“学习总览 / 卡片集列表 + 文件夹树 / 设置”的现有密度：

- 「卡片集」标题右边仅有小图标 `+`：点击出现弹出菜单 `新建卡片集`、`新建文件夹`、`导入卡片集 ZIP`；菜单不永远占据侧栏空间。
- 文件夹名称单击展开/收起；右键或悬停 `⋯` 展开菜单：`打开`、`新建子文件夹`、`在此新建卡片集`、`导入卡片集 ZIP`、`重命名`、`移动到`、`删除文件夹`。**禁止导出文件夹**。
- 卡片集名称单击打开本集；右键或悬停 `⋯`：`打开`、`重命名`、`移动到`、`导出卡片集 ZIP`、`移入回收站`。
- 不要求在每行常显文字按钮。图标必须有 tooltip、aria-label；鼠标/键盘/触控可打开菜单；Esc、点空白关闭。菜单宽度适中，靠近目标且不能溢出 900px 窄窗口。
- 新建/编辑/移动复用统一的 Vue 对话框，显示名称、所在文件夹、目标路径浏览和保存/取消。保存得到真实服务回执才关闭并刷新目录；冲突、错误与未知结果不得伪报成功。
- 删除卡片集默认软删至回收站；不直接物理删除或删除数据库文件。文件夹删除默认为 **非级联：删除文件夹本身，其直接子项移至上一级**，提示必须写明不会删除卡片/子文件夹数据。整目录级联删除必须另有影响预览和二次确认，本轮不加入。
- 回收站恢复保留在「设置」工作台，不在左栏重复加一个宽面板。文件夹重命名/移动不得因相同名称错误关联别的 ID。

## 2. 真实 API 核对（已经存在的应复用）

| 能力 | 推荐生产 API | 注意事项 |
| --- | --- | --- |
| 浏览文件夹/卡片集 | `workspace.catalog` | `folderId/cursor/limit`，分页加载；懒加载子文件夹 |
| 新建/重命名/移动文件夹或卡片集 | `workspace.catalog.save` | `kind/id/expectedRevision/name/parentId`；防循环、重名、CAS |
| 删除/恢复卡片集 | `workspace.decks.batch` / `workspace.recycle.decks` | 删除/恢复均需 expectedRevision，回收站入口在设置 |
| 删除文件夹，不删内容 | `catalog.folder.action({action:'delete',cascade:false})` | 服务端将子项移动至上级；需显式告知并检查实际影响 |
| 导入卡片集 ZIP（606） | `card.exchange.open` → `card.exchange.import` | 预览/确认，作为新独立卡片集导入；不得覆盖同 ID |
| 导出卡片集 ZIP（606） | `card.listSummary`（分页取本集全部已发布卡）→ `card.exchange.preview` → `card.exchange.save` | 冻结卡片 ID 与修订，图片/知识点闭包由正式服务处理。**目前格式最多500张已发布卡且不能空包；超过范围明确提示，不能假装导出成功** |
| 完整整库/FSRS/历史备份 | 原设置的完整备份与恢复 | **不是**单卡片集 ZIP 导出；不得在 UI 混为同一种文件 |

**重要限制：** 已找到旧 `exchange.deck.export` 在 `electron/modules/export.ts` 仍读取 legacy `questions/memory_cards`。606 的正式编辑与学习在 `learning_cards` 等新结构中，**不能使用旧 API 冒充完整导出**。本轮可以在 1–500 张已发布卡范围实现单集内容包导出；空集、500+ 卡及带有完整草稿/FSRS历史的跨库迁移，未来须扩展606完整导出协议、真实核对后才能开放。如果保留“导出卡片集”称谓，应明确“已发布卡片内容包（不含复盘历史/草稿）”。

## 3. Vue 文件与事件合同

- 正式 `src/unified/UnifiedCatalogBranch.vue`：每行保留单击打开，右键/hover小图标只发 `manage(item,clientX,clientY)`；各级文件夹递归转发事件。
- 新增 `src/unified/UnifiedCatalogContextMenu.vue`：受控输入 `item|null` + `x/y`，根据根/文件夹/卡片集类型显示适当操作，按动作键发 `choose(action)`，不自行写数据库。统一完成 Esc/外部点击关闭。
- `src/unified/UnifiedWorkspace.vue` 负责事件路由：打开/创建/编辑/移动复用 `UnifiedCatalogEditor.vue`；删除调服务端软删；导入通过 `UnifiedCardExchange.vue` 导入内容包；导出通过分页提取卡片修订和新内容包预览；操作后刷新侧栏及首页目录、同步当前选中集。
- `src/unified/UnifiedCatalogEditor.vue`：已有位置浏览、重命名/移动/CAS对话框，补齐管理入口后保留统一提交能力。
- 预览：`docs/v077/prototypes/catalog/CatalogManagementPreview.vue` 是 mock 数据的 **Vue3组件设计预览**；`CatalogManagementPreview.html` 是浏览器可直接交互的离线预览。两份预览只演示 UI，不调用业务 API。

## 4. 定向功能测试

1. 根 `+`、文件夹/卡片集的右键和悬停 `⋯` 都可显示正确菜单；文件夹**没有导出入口**，卡片集**有导出 ZIP**。
2. 新建/重命名/移动文件夹与卡片集，ID 不变、父子路径正确；目录深层加载与重名/循环/并发修订失败可恢复。
3. 非级联删文件夹：原子移动其子项到上一级，数据/复盘历史/媒体不丢；删卡片集：回收站列出并可恢复，删除当前集安全回到总览。
4. 单卡片集内容 ZIP：至少包含卡片、有效知识点/关联与图片；导入作为独立卡片集后新 ID 和数量正确、重启一致；导出 0/501+ 张显示明确不支持，**不能调用 legacy 导出返回假成功**。
5. 模态对话框忙碌状态/未知回执、取消、重复点击、切页保护、目录刷新后选中态与面包屑正确。
6. 900/1366/1600三宽的正式 Electron GUI（含中文名称、拖动滚动栏、触控/键盘菜单），Schema606 只读核对与新进程重启；Windows10/11 实机未完成时保持 NOT_RUN。

## 5. 状态与后续

[Issue #29](https://github.com/Aides8Stack/GankSoft/issues/29) 跟踪。Vue原型和这份规范保存在仓库；**原型模拟数据与正式软件的真实 API 验收必须分开记录**。若不能验证旧导出完整性或超出606内容包限制，不得声称全部完成。禁止强推、自动合并、发布，不重跑250条已完成历史用例。
