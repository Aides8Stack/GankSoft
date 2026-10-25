# 恢复起点（2026-10-25，S7.a检查点）

仓库 Aides8Stack/GankSoft；唯一原分支 feature/v075-unified-learning-workspace；Draft PR #13。TASK实际在docs/development/TASK.json。用户原始包Work-Handoff-v1.0仍为业务权威，完整包没有提交GitHub；新Work需同一附件。

S3–S6自动化已DONE。S6精确SHA7b5dbd49cec8aeb86bc987a3fd0bd5373d536908 / tree3878b012554378c73516aa85fcce8f1f15147bdf / Run40143926508，四Jobsuccess；Windows原日志确认363业务/122方法/媒体6/知识UI10。S6-ACCEPTANCE.json已归档。此检查点SHA用git log -1 --format=%H -- docs/development/RECOVERY-NEXT.md及远端refs读取，不回填自身SHA反复提交。

当前S7 IN_PROGRESS，S7.a本地实现/验证已完成，尚未验证当前新SHA Windows。新增src/unified/{UnifiedWorkspace,UnifiedCardEditor,UnifiedCardDetail}.vue、workspace-unified协议及查询；主入口只读按真实schema分流，604仍旧App，606才新工作台，不激活真实用户库。轻量目录/计数/搜索分页/会话摘要和精确题集定位；目录→列表→单模式详情/草稿/发布→复盘→图谱/大纲连通，返回保留查询勾选，离开暂停；详情历史按需读取，原评分/调度/编辑组件复用。新版导航不调用workspace.read全库Snapshot。最小Windows smoke接入现有tools/ci/quality.mjs，无workflow/门禁更改。

本地PASS：workspace专项4，业务367，协议21/124方法+边界/类型/导出，应用/隔离构建，真实Electron统一导航6（errors/external=[]且列表payload<16kB），pipeline182，ASAR13组107及完成标记。Linux无头截图超时BLOCKED，未冒称视觉/Windows实测。动态入口拆分导致小字体CSP失败，已assetsInlineLimit0改为同源文件后原107项通过；offline install缓存不足已用原lock在源码外完整预热381包，原182项通过，未改锁/测试。原始临时日志不上传，精简结果见TEST_REPORT。

首个未完成任务：原包04-work-prompts/phases/S7-UI-WORKSPACES-AND-PERFORMANCE.md中的S7.b。先核真实HEAD/工作树/此保存点一次CI；失败读取具体Job最小修复，不重做S2–S6。
1. 完整批量导出/删除/移动与回收入口（现有旧content.bulk按deck.kind分流，不能直接用于原生卡；先设计真实统一生命周期/归属及回执）。
2. 知识/日期/随机筛选；学习分析和全局/单卡调度设置统一UI，重算预览确认，原到期不延后。
3. 卡片集/文件夹管理；草稿/会话更多分页、重启多页恢复、同题集聚焦、窗口状态/焦点及三模式总路径、宽窄截图。
4. 完成S7后原S8-BACKUP-APPEND-MIGRATION、S9-RELEASE-READINESS-NO-PUBLISH。不能将S7.a当S7整体DONE。

持续授权S3–S9有效；保存检查点后继续，不逐阶段问，不等待/轮询CI。新CI未结束只做独立模块，不能标未验项目DONE。禁止新分支/PR、自动trust审批/合并/发布/强推、回滚既有成果/降门禁。全部验证为合成隔离，生产schema604；Win10/11真实IME/人工交互和最终同包仍NOT_RUN，正式启用前需实测。
