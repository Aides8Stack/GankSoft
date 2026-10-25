# 2026-10-25 紧急停止保存：S7.b WIP（最新状态，优先于下方历史）

用户最新明确要求“不要再实现任务，立马保存任务进度”。已停止开发与正在运行的界面复验；只保存、推送、读回，不进入S8，不等待CI。原仓库Aides8Stack/GankSoft，唯一分支feature/v075-unified-learning-workspace，原Draft PR #13，不新分支/PR、不自动审批/合并/发布、不强推。

## 准确检查点与现状

保存前远端HEAD：0eda6c02572f532bcfc7f8fd3610dbdca9499697，tree fc38f40a6e79df195ab9fcd686ef50ae70a3afe8。本地HEAD 24eec85与该远端tree完全相同，保留等价本地历史，不重置/覆盖。此保存提交的完整SHA请从远端HEAD或git log -1 -- docs/development/RECOVERY-NEXT.md读取；提交无法在自身内容中包含自身SHA，不为回填回执反复提交。

S3–S6自动化DONE，继承既有验收文件；S7.a本地DONE，S7整体IN_PROGRESS。本次保存S7.b筛选/调度实现及全屏WIP，不能标整个S7或Windows验收DONE。生产schema仍604，606仅既有合成隔离，不自动迁移或访问真实用户库。

已实现：UnifiedStudyPlanner知识路径/包含下级/日期/随机知识点及真实只读队列预览；UnifiedScheduleSettings全局/单卡设置、独立重算预览/确认/撤销及未知原请求恢复入口；现有AdaptiveReviewSettings统一接线；队列/重算输出轻量标题；无关键词时不读取全部正文字段，旧复盘仅取所需统计字段；专项会话practiceMode持久化，跨重启/下一卡保持仅练习，UI禁止取消且服务端拒绝取消，提交仍校验已保存草稿。

全屏WIP：已读取原型OPEN-ME-v3.7.html及原S7/UI参考指南；原型最终.knowledge-fullscreen为inset:0,width:100vw,height:100dvh，旧CSS后置覆盖仍扣48px/200px。MindMapWorkspace新增局部高优先级整窗及画布高度样式，UnifiedWorkspace补主容器高度，smoke新增1366/720宽度下实际画布边界断言及工具栏返回。构建已通过，但最新真实Electron复验被用户立即停止（退出130、无完成输出），**全屏修复尚未验证，不可宣称已通过**；截图/完整视觉验收仍BLOCKED。

## 已有测试与本次边界

- 中断前有效日志：完整业务369/369 PASS（/tmp/gank-s7b-business-final.log）；协议21及124方法/边界/类型/导出PASS（/tmp/gank-s7b-protocol-final.log）；S7.b Electron9场景PASS，errors/external=[]（/tmp/gank-s7b-ui-final.log）。该9场景发生于最新全屏样式/边界断言之前，不能替代全屏验收。
- 本次实际PASS：npm run build（/tmp/gank-s7b-save-build.log）、npm run build:editor-spike（/tmp/gank-s7b-save-spike.log）；node --experimental-strip-types --test tests/unified-workspace-v075.test.ts 6/6（/tmp/gank-s7b-save-targeted.log），0失败/跳过；git diff --check。
- 本次最新Electron：node --experimental-strip-types tools/workspace-spike/smoke.ts，用户要求立即停止，退出130，未完成，不记PASS。宽窄全屏边界及视觉仍待复验。
- 继承S7.a pipeline182/182、ASAR13组107项，不在紧急保存时重跑。Win10/11人工IME、物理操作及最终便携同包NOT_RUN。
- 临时日志/合成数据库/截图/附件ZIP均不上传；以上精简证据随源码保存，即使/tmp丢失也不虚构原始日志。

## 真实CI，不能继承绿灯

保存前远端0eda6c02572f532bcfc7f8fd3610dbdca9499697 / Run40145081439：scope及Linux success；Windows及pr-gate failure。已读Windows Job121024604891原始日志：editor-launcher-selftest-windows失败；table-mouse-drag在table-mouse-drag.mjs:83等待5000ms超时，offline-local-resources在manual-acceptance.mjs launch等待window事件5000ms超时。Artifact12580431392。没有改编辑器/门禁来绕过；具体根因与修复仍未完成，不能仅认定随机故障。S7.a Windows新增工作台步骤在launcher之前，需恢复时按原日志逐项确认，不能以整个Job失败推断各步均未运行。

此新保存提交CI：PENDING_NOT_OBSERVED，推送后只即时读取一次新完整SHA的runs并在最终回执报告；不等待、不轮询。前序失败不代表新SHA已测试，前序S6绿灯也不代表S7通过。

## 下次Work首个未完成任务（直接从GitHub恢复）

1. 读取本文件、TASK.json、PROGRESS/HANDOFF/TEST_REPORT及实际远端HEAD；保护全部WIP。当前任务元数据在docs/development/TASK.json，根目录没有TASK.json，不重复初始化任务。
2. 只查当前保存SHA的一次CI结果。若Windows仍失败，读具体Job/Artifact，最小定位上述拖拽/离线重启失败；不重做S2–S6、不削弱断言/超时/质量门禁。该阻断与下面全屏复验均未完成。
3. 按顺序构建完成后再运行smoke，禁止构建和界面测试共享资源并发：npm run build；npm run build:editor-spike；node --experimental-strip-types tools/workspace-spike/smoke.ts。首个本地未验证项为**S7.b整窗图谱WIP在1366/720宽度的边界与工具栏返回复验**。旧9场景已PASS，无需重写。失败保留现场最小修复；截图超时如实BLOCKED。
4. 完成当前筛选/调度子任务剩余交互覆盖（重算确认/撤销、异常回执、专项启动/恢复），再继续S7剩余：原生卡批量导出/删除/移动及回收入口；学习分析；卡片集/文件夹管理；草稿/会话分页、多页跨重启、焦点/窗口状态；三模式总流程、宽窄视觉与T33–T37。不得直接用旧content.bulk按deck.kind处理原生卡，先复用统一生命周期/归属/回执服务。
5. S7未完整验收，不标DONE；不重复S0–S6。仅当用户恢复连续开发后，原后续范围为S8完整恢复/独立追加卡片集/活动数据库目录迁移/回收删除恢复（新旧隔离、媒体闭包、预览/事务/回滚）→S9全量回归和Win10/11同包人工验收/交接，不自动发布。此次保存后立即停止，不继续这些阶段。

核心入口：src/unified/{UnifiedWorkspace,UnifiedStudyPlanner,UnifiedScheduleSettings,UnifiedCardDetail}.vue；src/components/{MindMapWorkspace,AdaptiveReviewSettings}.vue；src/review/UnifiedReviewForm.vue；electron/modules/cards-unified/{queue,recompute,review-session}.ts；shared/protocol/{unified-review,review-details}.ts；src/services.ts；tests/unified-workspace-v075.test.ts；tools/workspace-spike/smoke.ts。

原业务原型/阶段包仍作为参考，未将私人附件或整个ZIP提交GitHub；本文件已写明当前完整可执行恢复起点和后续范围，不依赖旧/tmp或聊天来找未完成项。任何原型差异保护既有有效实现，不直接回滚。
