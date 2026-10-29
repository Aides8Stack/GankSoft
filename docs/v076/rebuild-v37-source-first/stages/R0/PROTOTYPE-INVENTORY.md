# R0 原型源码清单（增量审计）

原型冻结哈希再次通过。保留上轮 `prototype-dom-css-inventory.json`，本轮 `source-audit.json` 补充 TypeScript AST，`css-rules.json` 使用 PostCSS，`api-component-index.json` 使用 Vue SFC 与 registry AST。语法解析不执行原型，也不构成交互覆盖。

| 项目 | 本轮数量 | 边界 |
|---|---:|---|
| script | 3 | 全部解析，无语法诊断 |
| 函数/箭头/回调 | 303 | 与旧128个函数声明计数口径不同 |
| if/条件表达式 | 575 | 源码定位与条件全文保留 |
| switch case | 102 | action、类型、键盘等分支保留 |
| 事件监听 | 13 | 目标/事件/行号保留 |
| HTML模板 | 153 | 动态模板片段保留，不冒称静态DOM完整树 |
| CSS规则 | 1300 | 原型+正式ui-v076.css，有条件与有序声明 |
| 重复选择器 | 186 | 按单文件selector分组；媒体条件不相同时并非全部冲突 |

## 主页面/状态分支

| 入口 | 行范围 | 状态/交互合同 | 负责人 |
|---|---|---|---|
| render | 1459–1460 | 路由、专注、导航、弹窗、图谱布局 | R1 |
| overview | 1336–1339 | 目录、续学、最近学习、统计；另验空态 | R2 |
| deckHome | 1340–1344 | 卡片集/到期/知识/计划/四快捷/最近卡片 | R2 |
| cardsScreen | 1345–1355 | 草稿箱/搜索/类型/多选/导出/删除/详情 | R3 |
| cardDetailScreen | 1356–1361 | 单卡模式、历史和内容按需 | R3 |
| filterScreen | 1362–1364 | 状态/模式/日期/知识选择/随机 | R3 |
| editorScreen | 1374–1383 | question/recall/reading、选项/答案/富文本/模式切换 | R4 |
| reviewScreen | 1365–1369 | question/recall/reading × answer/reveal/result/暂停 | R4 |
| analyticsScreen | 1418–1418 | 时间窗/趋势/模式/历史/知识，演示曲线不得生产复用 | R4 |
| knowledgeScreen | 1385–1416 | map/outline、布局、全屏、搜索/选择/正文/层级 | R5 |
| knowledgeTransferScreen | 1289–1293 | import/export、select/preview、根/子节点、范围/冲突 | R5 |
| scheduleScreen | 1420–1420 | 本集/单卡继承/参数/重算 | R6 |
| settingsBody | 1428–1432 | general/review/data/appearance/about/trash | R6 |
| renderModal | 1458–1458 | 全部overlay类型、焦点/关闭/确认取消 | R0/R3-R6 |

## 弹窗与事件源

以下为已定位函数，签名/分支/状态访问见 source-audit.json：

- `knowledgePickerDialog`：1434–1434
- `pasteDialog`：1436–1436
- `copyDialog`：1437–1446
- `resourcesDialog`：1447–1447
- `deleteMediaDialog`：1448–1448
- `batchOptionsDialog`：1449–1449
- `promptManagerDialog`：1450–1450
- `newKnowledgeDialog`：1452–1452
- `genericDialog`：1453–1453
- `batchExportDialog`：1454–1454
- `deletionDialog`：1455–1455
- `permanentDeleteDialog`：1456–1456
- `editorModeSwitchDialog`：1457–1457
- `renderModal`：1458–1458
- `openModal`：1461–1461

监听器：

- document / 'click'：1503–1728
- rootOverlay / 'click'：1729–1729
- document / 'keydown'：1730–1745
- document / 'input'：1746–1768
- document / 'paste'：1769–1773
- document / 'focusin'：1774–1777
- document / 'focusout'：1778–1780
- document / 'dblclick'：1781–1785
- document / 'change'：1786–1806
- document / 'pointerdown'：1809–1813
- document / 'pointermove'：1814–1814
- document / 'pointerup'：1815–1815
- document / 'paste'：1817–1817

## 人工判读与剩余边界

原型三段脚本包含 Markdown/森林纯函数引擎与主页面控制器。主点击委托先处理 data-deck/card-detail/card-edit/card-study 等属性，再按 data-action 分支；input/change/keydown/pointer 另有独立事件，不能把80个静态action当完整交互。state、knowledgeState、transfer 的初始化及每个读/赋值/方法调用均有AST位置。

动态结构由真实浏览器DOM快照补证；未执行的弹窗、hover/focus、模式与窄屏分支保持 NOT_VERIFIED，负责人按 page-api-map.json 记录。R0 不能因索引生成就声称所有分支行为通过。
