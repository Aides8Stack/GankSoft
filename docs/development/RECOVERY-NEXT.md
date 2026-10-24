# 恢复起点（2026-10-25）

仓库 Aides8Stack/GankSoft；唯一原分支 feature/v075-unified-learning-workspace；Draft PR #13。任务元数据在 docs/development/TASK.json。原始工作包仍需用户附件，不声称完整包已在GitHub。

本轮恢复前远端：b3a37ff3a9a29f68d5cb10385a988d51aa0af96d。本检查点SHA通过 `git log -1 --format=%H -- docs/development/RECOVERY-NEXT.md` 和远端refs解析，禁止回填自身SHA循环提交。

S3–S5已归档DONE。S6文本/图片/交换/大纲本地实现与验收已完成；当前新SHA双平台CI尚待核实，整体S6 IN_PROGRESS，不冒称Windows通过。实现/测试入口：shared/knowledge/{markdown,media}.ts、electron/modules/knowledge-unified/{markdown-exchange,media,storage}.ts、KnowledgeMarkdownExchange/KnowledgeExchangeMap/KnowledgeMarkdownPanel/MindMapWorkspace，以及knowledge-markdown-media/store-v075 tests和tools/knowledge-spike/smoke.ts。媒体复用既有staging和完整native decoder；知识purpose与卡片隔离。回收正文资源保留；schema604生产入口不自动激活606。

最新已执行：业务363/363；媒体6+文本6；协议21/122方法+边界/类型/导出；应用及隔离构建；真实Electron知识10场景（含导入未知回执锁关闭/原请求恢复、图片真实加载/宽度、大纲Ctrl+S、系统剪贴板）；Linux ASAR13组107项/完成标记。详细报告docs/development/TEST_REPORT.md。起始旧CI40142358877曾Linux success/Windows in_progress，不轮询。新CI只取保存后即时状态。

首个未完成任务：原包 04-work-prompts/phases/S7-UI-WORKSPACES-AND-PERFORMANCE.md。先核真实HEAD/工作区/本检查点一次CI；若必要Job失败，读具体日志最小修复。随后S7.a紧凑卡片集导航和统一列表/编辑/复盘/图谱工作台，复用typed API、单模式内容/分页历史/按需媒体，避免旧App全库Snapshot store。S6对应当前CI未完成时只做不依赖待验结果的独立S7模块，不标S6整体DONE。接着S8独立追加/活动路径/回收站，最后S9全回归与真实Win验收清单。

用户已连续授权S3–S9，原包“只S0”“每阶段提交退出”等旧限制已覆盖。保存远端检查点后继续，不逐阶段问、不等待/轮询CI。不得新分支/PR、自动trust审批/合并/发布、强推、回滚已验成果或降门禁；所有数据为合成隔离样本。Win10/11人工IME/物理交互/最终便携同包保持NOT_RUN，正式启用前仍需实测。
