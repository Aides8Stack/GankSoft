# S4 本地验收与队列检查点（2026-10-24）

原PR13、原feature/v075-unified-learning-workspace。S4前序源码已远程保存5578f141df1f28e0bd2178e0fb03c5301e5bf67b（tree fa3ac7f02cb49802b403a5c198444cc4affe2b3b），CI40090576841 scope/Windows/Linux/pr-gate全部completed/success。本地8304af7与该远程tree一致，c531633仅保留等价本地历史，未合并PR。

本检查点进一步补齐统一队列：复用StudyFilters、日预算、知识随机抽样和selectCandidates；三模式、当前周期证据、现行FSRS due、多页占用、日期/知识/所选卡筛选、专项和同日重学预算。旧604入口保留；只输出轻量元数据，不夹带正文/图片/全部历史。原生知识关联接口将随S5完成，目前沿用真实legacy关联，绝不伪造旧题载体。现有Windows quality.mjs增加真实复盘六场景，原全部检查保留。

本地PASS：S4专项17/17、完整业务328/328、协议21/边界/类型/98方法、应用构建、隔离构建、旧编辑器18、统一复盘Electron6（errors/external=[]）、Linux ASAR13组107项（含系统交换备份5）。最初两项新增测试失败分别是夹具多传字段和当日legacy真实预算未排除，已通过调整夹具输入与独立测试日期修复，未删除历史或放宽断言。队列类型推导编译错误已显式字段投影修复。

本地test:pipeline初次182项中179通过/3失败：离线冷安装缺缓存zwitch包导致随后yaml不可解析，正在填充锁定依赖缓存后原命令复验；没有改测试或门禁。本检查点新队列与Windows复盘步骤仍需自身CI核验，S4整体IN_PROGRESS，核心5578的绿灯不能冒充新检查点。Win10/11人工IME/物理交互/最终便携同包仍NOT_RUN，生产604不启用606。

下一步：核对缓存补齐后的流水线结果，保存本次S4；不等待CI，实施S5中独立知识树/顺序/Markdown/合并与原生卡关联模块。新CI成功后归档S4 T16–T22/T27。按原Work-Handoff连续S5→S9，推送不结束任务；不新分支/PR、不自动trust/合并/发布、不访问真实库。当前自身SHA由git历史解析，禁止文档回执循环。
