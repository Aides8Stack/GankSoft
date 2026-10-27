# P1 实施设计

原型overview()：四摘要，左侧我的卡片集纵向列表，右侧继续学习callout和最近学习。直接映射到UnifiedHome.vue及现有目录slot，不改为另一套布局。

数据缺口：catalog只列当前文件夹；analytics仅支持单集且没有未完成会话全局摘要。增加workspace.dashboard只读投影，支持可选deckId；统计元数据、时间区间和最近6条记录/4个会话，复用currentDue，无正文/图片/会话草稿加载。不改Schema或排期。


## 2026-10-27 完整复刻纠偏

首页四摘要、紧凑目录行、继续学习提示和最近学习按原型校准；真实空白606/合成606双态。 按 full-fidelity-v3.7 规范执行。

## 本轮检查点：真实目录和首页复验

前序远端 f9b210ea5db0541daa3772abd9c28b908cd56524（与本地 efed918 的完整树相同）已读回导航源码。按冻结原型真实截图恢复首页51px空导航带，并补回右上专注模式（默认关闭）和本地用户设置入口；上一个检查点关于移除空带的决定被本次同屏核对纠正。

正式 left-rail-v076.ts：PASS 5场景，UI新建文件夹及嵌套卡片集→真实workspace.catalog.save/catalog，折叠/展开及精确路径/选中态；取消未保存目录不写数据；编辑器经侧栏返回保存真实草稿；三宽文字目录；退出并启动新Electron后目录、卡数、草稿仍在。确认对话框决策使用测试注入，非Windows原生对话框人工验收。此前模态背景拦截导致的错误测试动作已改为真实可操作的取消按钮；headless原生confirm不返回，按已有smoke方式注入确认决策。未修改产品确认流程或断言。

正式 ui-v076.ts P2：PASS 12场景（含P1空白/合成首页三宽、恢复真实会话及P2场景）；原型overview/deck/cards/cardDetail三宽12张采集PASS；build PASS；check:protocol PASS（21项/148方法）。原型颜色/左栏213px/品牌/标题正文边界与新截图已逐图检查；真实数字、空态、文件夹与导入/管理入口为业务映射，未复制演示数字。Windows视觉/Win10/11人工 NOT_RUN，阶段仍IN_PROGRESS。
