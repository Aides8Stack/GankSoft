# B3 卡片集目录管理正式实现

基线 `cda2d9446b60a022e65eb08f00ed24462bf2e93c`，唯一 `feature/v077`，Schema606。本次用户明确授权正式实现，前序“仅Vue预览”边界已接续。

实现检查点已准备：B3.1统一管理菜单/编辑移动；B3.2安全删除和内容ZIP；B3.3目前取得领域17项（首次14，设施修正后3项定向通过）及18组Linux Electron通过。最终冻结源码同SHA验收/正常远端保存仍IN_PROGRESS，不重跑B1/B2或旧250。

## 已实现与调用层级

- `UnifiedCatalogBranch.vue`只展示/展开/发出manage事件；`UnifiedCatalogContextMenu.vue`纯操作选择，含键盘、焦点归还、Esc/外部关闭和窗口限位。`catalog-management.ts`只包含动作清单及最多500张的分页元数据收集，不处理ZIP。
- `UnifiedWorkspace.vue`路由事件，唯一目录展开集合保留刷新和已加载页；`UnifiedCatalogEditor.vue`复用同一个新建/改名/移动/删除对话框和原requestId。业务写入仍由已有领域服务负责。
- 根＋提供文件夹/卡片集/ZIP导入，文件夹和卡片集右键及hover⋯共用菜单；主页管理入口也接入同一菜单。文件夹不提供导出。
- `workspace.catalog/save`保留CAS、同名和循环规则；已有`catalog.folder.action`仅补可选expectedRevision及非级联上移重名拒绝，正式UI必须携带修订。不新建目录表、全局store、IPC通道或平行业务服务。
- 文件夹只删除自身、直接子项上移；同层重名原子拒绝并提示处理冲突。卡片集沿用`workspace.decks.batch`软删，设置回收站恢复；删除当前集清理旧导航来源并返回总览。文件夹删除后更新当前路径。
- `UnifiedCardExchange.vue`统一复用`card.exchange.open/import/preview/save`；整集导出先分页收集原生606卡片ID/revision。只补preview可选`expectedDataRevision`封住收集与冻结之间的增删窗口；已有冻结token在写盘前再校验全局修订。
- 文件写入结果未知仍保留原有系统操作锁，明确按钮前往现有设置“待核对操作”，不宣称成功、不自动重复写文件。设置初次挂载到该分类会实际加载待核对记录。SQL命令未知则原requestId重试，不允许关闭/改写载荷。

## ZIP明确范围

`ganksoft.cards` v1内容包，1–500张已发布卡、关联知识点及祖先正文/层级、卡片与知识正文图片和关联闭包；不含未关联知识、草稿、FSRS、调度配置、复盘历史。空集/501+拒绝，不截断冒充成功；完整数据用设置完整备份。导入产生独立deck/card/node/asset身份；相同包默认定位已导入的独立集，显式“另导一份”才复制，不覆盖来源。没有调用读取旧questions/memory_cards的exchange.deck.export，未扩展完整集快照协议或Schema。

## 验收与已修正失败

新测试 `tests/catalog-management-v077.test.ts`；既有606内容交换7项和卡片集回收5项定向回归。本轮17个唯一领域测试实际完成；首次测试脚本误读不存在的learning_card_knowledge和传入多余严格键，已修复后仅重跑失败3项，原日志保留。

正式Electron脚本 `tools/validation/v077/b3-catalog-management.mjs` 12组、`b3-catalog-boundaries.mjs` 6组：102卡两页内容包往返、图片字节/祖先/链接、新身份；当前集删除/设置恢复/不同PID重启；三宽900/1366/1600菜单限位；第二页目录选中和折叠刷新；CAS、空/重名/循环、未知目录保存/删除/导入、空集/取消/写入失败及过期token重新预览。

实际发现并修正：文件写入未知无法到设置核对；初次直接进入待核对分类未读列表；删除文件夹后当前路径遗留旧层；删除当前卡片集后CSS使hidden子导航仍显示；目录刷新丢失已加载第二页。主12组已通过，最后两项小修由补充6组通过。下一步冻结代码后取得同源最终记录，保存原始失败和最新源指纹。

系统原生confirm、文件对话框结果为Linux测试注入；不是Windows物理对话框/剪贴板/IME/DPI验收。Windows CI/Win10/Win11全部NOT_RUN。无依赖安装、无Schema/锁/版本/调度模型变更；旧250账本不变。保存核验后结束，不等CI、不合并发布、不进入B4/B5。
