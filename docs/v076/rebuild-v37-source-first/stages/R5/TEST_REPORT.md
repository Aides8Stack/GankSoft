# R5.a C4 — PASS（R5.a DONE）

基线9810ed8189bd4be712273e2b25b9cba8ffe586a1 + C4工作树。Linux、Node24.22.1、Electron44.9.1、MindElixir6.0.0-next.4、Crepe7.22.3；复用依赖/缓存，没有重装或重建242卡夹具。代码指纹见evidence/c4/verification-notes.json；当前提交以Git历史/远端读回解析。

| 命令/验收 | 结果 | 证据/边界 |
| --- | --- | --- |
| npm run build | PASS | evidence/c4/build.txt，最终源码类型/生产构建；原有chunk提示 |
| node --experimental-strip-types tools/validation/r5/c4.ts | PASS 6组 | evidence/c4/interaction.json；原生改名+显式改父级；现有可见格式栏、真实正文与Ctrl+B；清理前新进程精确保存值及UI读回；Unified叶节点/父节点筛选实际排除未关联卡；原有大纲/图谱切换只读不写 |
| node --experimental-strip-types tools/validation/r5/c4-resize.ts | PASS 4组 | evidence/c4/resize.json；900px实际默认290→键盘310→指针330，ARIA和宽度界限；调整后节点全可见、无侧栏覆盖，树hash/revision不变 |
| node --experimental-strip-types tools/validation/r5/c4-visual.ts | PASS 9组+2项 | evidence/c4/visual.json；1500/1366/900各展开详情/收起详情/纯画布，九PNG+九DOM/CSS/字体/哈希；原生绿色线、选中配色、详情/编辑器、toolbar/footer、全节点边界/重叠；900菜单所有结构/恢复/交换入口可达及Escape；全程树hash/revision一致 |
| R5.a局部视觉审阅 | PASS | 九张正式图逐张审阅；冻结原型及C3参考图/快照全部哈希继承；差异见VISUAL-DIFFERENCES.md |
| 领域21/21、C2 Electron11、C3几何9 | PASS（继承有效证据） | 原协议/后端/事务/回收/分层/禁拖等不重新开发或无意义全量重跑；受影响UI已由C4专项及九状态复验 |
| Windows10/11、物理图片剪贴板、真实IME、全应用严格视觉及便携ZIP | NOT_RUN | R7/R8，不把Linux当Windows |
| R5.b/c/d | NOT_RUN | 只保留已登记需求和既有入口，未实施新阶段 |

真实修改后的跨进程验证明确发生在清理前：target959a4220-2f45-488f-84b4-dfd7d2d09539改名“词义辨析·C4持久化”、挂到创新理论64ee9a2e-920e-4a21-8755-1490f951e6db，原生编辑正文及加粗；新进程API和实际UI均验证后才使用真实服务恢复原始合成图谱，以便冻结原型对照。原卡片关联和已发布内容精确相同，不能把“清理后读回”冒充此项。

早期真实FAIL保留：首次构建TS1136（主题字面量重复逗号）修复后PASS；首次视觉发现通用flex使关闭details内容仍显示，见visual-attempt1.json，明确关闭样式后最终九组PASS。无未解决FAIL/BLOCKED；不删断言/不削弱测试。6组功能在最后仅标题文案/关闭按钮/边框CSS微调前运行，其事件和服务未改；最终构建及九状态/900调整在最终源码重验。C1–C3历史失败及报告保留在旧evidence与Git历史。

GitHub只走连接器base-tree/实际parent/force=false/expected_sha保存原分支，独立读回完整HEAD/tree/关键文件和C4交付清单；是否成功以实际回执为准。不运行CLI push、不审批/合并/发布、不等待CI。

## 最终保存边界（追加保存指令后无新增测试）

最后一次既有弹窗入口回归实测FAIL已保留menu-attempt1.json。原因是关闭details父容器隐藏异步子dialog，退出等待保护；一次诊断被中断exit130，未清数据库/租约。修复仅保留子弹窗的菜单祖先并正确处理Esc，最终c4-resize.ts为4组PASS（2调整+恢复取消+原导入/导出关闭/Escape），树hash不变，正常退出成功。最终build PASS。

6组业务及9状态视觉在该事件修复前已PASS，最后修改未改变其布局/CSS、正文/层级/筛选服务，按影响继承；未再次重拍旧状态或冒称全套重跑。c4-visual.ts后来新增的“菜单Esc后保持全屏”显式断言本次未重跑（NOT_RUN）；原生弹窗Esc保持全屏在最终4组入口回归已实际断言。没有未解决的必要功能故障，不因此扩展后续阶段。

收到立即保存指令后停止开发及测试，仅整理本记录和通过连接器保存/核验；不等待CI。
