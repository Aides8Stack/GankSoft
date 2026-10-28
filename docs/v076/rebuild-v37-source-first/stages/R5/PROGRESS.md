# R5.a — DONE（C4收尾）

恢复基线9810ed8189bd4be712273e2b25b9cba8ffe586a1；原分支feature/v075-unified-learning-workspace，Draft PR15 → develop。本次保存SHA以本文件Git历史及远端独立读回为准，提交不能包含自身SHA。

C4完成：

- Mind Elixir公开theme.palette/cssVar改为原型绿色体系；原生selected类呈现#dceddf/#438d69/#1c6047。expandNodeAll/方向/保存/历史刷新后通过公开selectNode恢复既有业务选择；没有独立选中状态、方法覆盖或新布局引擎。
- 详情宽度按原型465/423.45/290px响应；保留既有宽度调整。现有格式栏从隐藏仍占92px改为可见39px，修复旧label边距，保留颜色/保存和Crepe原生快捷键，未新建工具栏。细节标题/关闭入口/关联按钮边框、原有图谱/大纲分段视图对齐。次级结构/恢复/交换操作归入同一原生HTML details菜单，900px主工具栏单行59px。
- 真实UI修改节点名、父子层级及Markdown（含原生Ctrl+B加粗），保存后正常退出；新Electron进程在任何清理前精确读回name/parentId/position/revision/Markdown、关联和已发布版本，UI路径/正文也一致。
- 新增明确filter事件；UnifiedWorkspace使用现有StudyFilters和UnifiedStudyPlanner/learning.queue.preview，替代legacy全局预设。叶节点精确筛选与父节点包含后代均PASS；未关联对照卡实际被排除。不扩协议/服务。

新证据：C4功能6组、900px键盘/指针调整及入口4组、最终生产build、三宽9组及菜单/只读2项PASS。九张正式PNG和九份DOM/CSS/字体/哈希在evidence/c4；冻结原型继承C3，全部哈希复核。逐张审阅九图，R5.a局部视觉通过。领域21/21、C2 Electron11及C3几何9的未受影响语义继承，不宣称重跑；C4三宽因主题/详情/工具区变化全部增量复拍。

无未解决R5.a阻塞。合理业务适配：原生曲线/自动布局、既有展示容器不入库、真实关联1/1而非原型演示14/14、窄宽自动fit（900详情73%，纯画布100%）、5px分隔调整区、真实Crepe自适应内容高度及显式筛选预览。详见VISUAL-DIFFERENCES.md，不宣称全应用逐像素一致。

R5.a DONE；R5整体仍IN_PROGRESS，b/c/d NOT_STARTED。Windows/物理剪贴板/IME/全应用严格视觉/便携ZIP继续R7/R8，NOT_RUN。本Work完成C4并通过连接器保存全部有效增量、独立核验后结束；不进入b/c/d/R6，不等待CI、不合并发布。

保存前最后修复：原生details关闭时会隐藏内部异步弹窗；已保留子弹窗祖先，Esc先关弹窗/菜单。恢复/原导入导出入口及关闭不写树最终4组PASS，初始FAIL见menu-attempt1.json。布局不变，九图按影响继承；不为再次跑新增断言延长Work。用户追加立即保存后停止全部非必要测试，仅保存和核验。
