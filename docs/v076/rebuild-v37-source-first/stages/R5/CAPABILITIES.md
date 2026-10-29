# R5.a Mind Elixir 能力核对

锁定并实际安装：mind-elixir 6.0.0-next.4，未更新依赖。核对来源：node_modules/mind-elixir/dist/types/{types/index,methods,nodeOperation,utils/pubsub,plugin/contextMenu}.d.ts及dist/MindElixir.js；官方https://docs.mind-elixir.com/docs/api/mind-elixir.mindelixir（在线文档部分仍为旧单数moveNode命名，以安装版本公开类型为准）。

| 需求 | 分类 | 已验证依据/方案 |
| --- | --- | --- |
| 自动布局/连线/方向 | NATIVE/CONFIG | init/refresh/layout、initLeft/initRight/initSide/initDown，direction 0/1/2/3；theme.cssVar --node-gap-x/y、--main-gap-x/y公开，沿用原生默认间距 |
| 展开/收起 | NATIVE | expandNode/expandNodeAll；expandNode事件；不将视图变化记为树业务修改 |
| 平移/缩放/适应/居中 | NATIVE/ADAPTER | move/scale/scaleFit/toCenter及scale/move事件；原生wheel/ctrl-wheel。已安装interact中editable+map-container左键无条件进入BoxSelect（先于pan），mouseSelectionButton=2无法修正该入口；保留现有小型空白区pan→公开move适配，不重写引擎 |
| 选择/搜索定位 | NATIVE/ADAPTER | selectNode/findEle/scrollIntoView；搜索用已有knowledge.tree.locate处理分层，完整树在待保存数据中查找；保持正文flush保护 |
| 新增/删除/改名/结构 | NATIVE/CONFIG | addChild/insertSibling/moveUpNode/moveDownNode/moveNodesIn、before公开钩子与operation事件；删除接已有subtree.delete，业务CAS/事务/回执不绕过 |
| 数据加载刷新 | NATIVE/ADAPTER | init/refresh/getData；既有knowledgeView/分层适配和tree.apply序列化只含name/parentId/position，展示容器和坐标不入库 |
| 禁止节点自由定位 | GAP/ADAPTER | 本版本Options无draggable字段；interact内置nodeDraggable没有公开禁用开关，不能照搬旧博客draggable。最小DOM捕获适配阻止节点pointerdown进入拖动，同时通过公开selectNode保留选择；明确层级/排序操作调用原生方法 |
| 多根森林 | ADAPTER（复用） | knowledgeView把真实null根挂到展示容器gank-root，仅用于框架单根视图；treeRows排除展示容器，不伪造业务根 |
| 详情/关联/正文 | ADAPTER（复用） | 现有KnowledgeMarkdownPanel/Crepe、learning.mastery.knowledge真实cardIds统计、知识树路径；不重做编辑器或图片系统 |

不使用引擎私有字段/坐标算法/自由坐标持久化；不新增重复工具栏。框架原生操作先通过已核对的公开before与事件做业务约束，已有方法覆盖需以最小公开钩子替换。

## C4已验证扩展（锁定版本不变）

- CONFIG：公开theme.palette控制原生分支色，cssVar控制root/main/selected；published CSS原生.selected类只做外观规则，公共selectNode在refresh/expandNodeAll后恢复业务已选身份，无方法覆盖/内部坐标调用。
- ADAPTER：详情/编辑器容器CSS修正旧label/隐藏格式栏占位，保留原MarkdownEditor/Crepe功能。原生HTML details组织已有次级按钮，不新建工具栏系统。
- ADAPTER：独立filter Vue事件传nodeId；Unified用现有StudyFilters/PlannerState/UnifiedStudyPlanner及queue API。原card.listSummary不支持知识条件，因此不伪造该端点过滤或扩协议。
- NATIVE回归：Ctrl+B原生加粗/保存/新进程还原，图谱/大纲原有切换、键盘/指针侧栏和自动fit已实测。
