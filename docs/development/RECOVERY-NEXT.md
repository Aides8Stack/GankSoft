# 2026-10-25 当前恢复入口：S7.e（未进入 S8）

原仓库 Aides8Stack/GankSoft，唯一分支 feature/v075-unified-learning-workspace，Draft PR #13。用户本轮重新授权 S7→S8→S9 连续执行，旧文档的“立即停止”只针对上次紧急保存，已失效。已读取本轮两个一致的原始ZIP、主指令、冻结规格、S7/S8/S9、验收和v3.7最终HTML原型；没有以旧源码覆盖最新实现。

## 已保存与当前状态

前序本轮远端检查点 3ce4dda68433c507fbfc65edced345c67c91d55c，tree 880e010b372e7c4be19ca90bd464863ecf6818d0，与本地df52cfb44b5e9966c576f92084e98429508263ae的tree完全一致。普通HTTPS push缺少凭据，沿已连接GitHub接口保存，以核实HEAD为真实parent/base tree，expected_sha、force=false，独立fetch核tree。API与本地提交元数据可不同；保留本地历史，不reset/强推/新分支。此后提交的自身SHA从远端HEAD或git log解析，不为回填自身SHA制造文档提交。

S3–S6继承有效自动化证据。S7整体IN_PROGRESS，S7.b/c/d本地完成，S7.e首个未完成。S8/S9 NOT_STARTED，未执行真实库迁移/不可逆删除/自动审批/合并/发布。生产schema仍604，606仅既有合成隔离；没有自动启用用户数据。

## 本轮实装

- 整窗导图1366/720真实边界、工具栏返回；旧入口7场景包括平移/拖节点/编辑弹窗/返回/Escape。实际修复全屏覆盖旧知识编辑弹窗，原全屏static/顶部可点的旧断言改成窗口几何及当前返回入口；未删操作断言/改原超时。
- 原生三模式批量删除/移动/分页回收恢复：CAS、scope、幂等回执与整体回滚，身份/内容版本/历史/FSRS/单卡策略保留；移动清当前知识关联，草稿保留并推进基线；未完成复盘保护，已完成页面原文归档。复用原所有权/关系/事务服务，不走旧deck.kind批处理。
- 筛选与调度确认/取消/撤销/响应丢失核对；practiceMode参与同题集匹配。真实专项启动、揭示、跨进程恢复后仍强制仅练习；正常多页和原始思路跨重启恢复。
- 学习概览/分析：按学习时区筛选、混合模式统计/趋势/分页历史、按需打开原始事件与当时内容/知识快照；历史SQL只返回摘要，不把大反思/快照隐藏加载进列表。目录新建/改名/移动复用现有CAS/同名/循环规则；新卡片集无模式限制。草稿/会话补更多分页并隔离切换。

## 实测证据

PASS：完整业务379/379，0失败/跳过；工作台6、生命周期5、分析/目录及备份闭包5；协议21/129方法与边界/类型/导出；应用/隔离构建；最新真实Electron16场景（errors/external=[]），两次实际进程重启；旧图谱7场景。S7-ACCEPTANCE.json记录全部场景和源码指纹。

Linux无头截图仍BLOCKED，不能据几何/交互断言声称视觉PASS。Win10/11人工IME/物理操作/最终便携同包NOT_RUN。本轮完整ASAR13组/107项PASS，完成标记0eb49c2c-2528-4382-b950-34b3b3a1955d；修正v070/v071旧全屏布局验收，未减少场景或操作断言。

起点1e53c866 / CI40146327911：scope与Windows quality成功；Ubuntu/pr-gate失败于旧全屏static断言。已读Windows Job121028375472和Ubuntu Job121028375482；此前Windows拖拽/launcher问题本次未复现，未伪称根因已查清，未改编辑器/超时/门禁。后续3ce4dda / CI40168399144首次in_progress，未轮询。新检查点CI仅推送后读一次，未完标PENDING_CI。

## 首个未完成任务与准入

1. 核对实际最新HEAD/工作树/TASK.json（位于docs/development，不重复初始化），读最新检查点一次CI；若失败，仅处理对应Job/Artifact的实际故障。不重做S2–S6，不降测试门禁。
2. S7.e：实现原生卡片批量导出及相关往返；三模式、当前发布/草稿/知识与媒体规则以原ZIP为准。不能直接接旧依deck.kind的content.bulk/旧导出，把direct卡漏掉。入口 src/unified/{UnifiedWorkspace,UnifiedCardBatch}.vue、src/services.ts、shared/protocol/registry.ts，复用cards-unified服务/既有交换和媒体基础。先明确与原导入协议的真实映射，再实现/专项验证，不输出无法恢复的新格式。
3. 补齐统一系统设置/数据管理导航，完整草稿/会话大页、焦点/窗口状态与三模式总路径；核对历史错因/知识漏洞详显、大知识树按层加载、宽窄视觉。当前T33/T34/T37只有子项PASS，T35视觉BLOCKED，T36继承S6。不得因此把整个S7标DONE。
4. 验证命令：专项 node --experimental-strip-types --test tests/unified-{workspace,card-lifecycle,analytics-catalog}-v075.test.ts；npm run check:protocol。需要UI时严格 npm run build → npm run build:editor-spike → node --experimental-strip-types tools/workspace-spike/smoke.ts。保留每操作15s和原CI900s步骤门禁；此前本轮自加shell总150s截断长套件，只是本地执行中断，已撤除该包装并完成原全断言16场景，未放宽产品断言/原CI门禁。构建/共用资源Electron测试禁止并发。
5. S7所有功能与准入完成并保存后，按原包S8完整恢复/独立追加卡片集/活动路径迁移/回收站→S9系统与Win便携同包验收。当前不提前做S8危险数据操作。持续授权仍有效，不逐阶段询问，不因检查点本身结束，不等待CI。

原始包在本轮附件解压目录；不提交ZIP、数据库、图片附件或原始敏感日志。必要合成证据仅精简JSON。临时日志 /tmp/gank-s7-final-ui.log、gank-s7-analysis-business.log、gank-s7-analysis-protocol.log、gank-s7-final-asar.log，丢失后从源码专项复现，不伪造。
