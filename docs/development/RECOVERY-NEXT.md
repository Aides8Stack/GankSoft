## 最终源码保存核验（2026-10-25）

原分支已保存源码检查点 `8359a79eb27cd09d108dbc2ef82804af06db4778`，tree `7f457703fef15345683a49b3309654d3e8253f3a`。独立git fetch后，与本地有效源码逐项核对：755个受版本控制文件内容/模式/清单一致，23个本轮变更文件全部存在；未上传文件0、内容差异0。非敏感文件清单与哈希见docs/v075/S7-SAVE-VERIFICATION.json。此处更新发生在源码/测试完整核验之后。

当前只补最终恢复回执；其自身SHA由Git/原PR13实时读取，不为回填SHA追加提交。S7整体仍IN_PROGRESS，首个未完成S7.f；S8/S9 NOT_STARTED。保存成功不等于CI或Windows人工验收通过。没有新分支、强推、自动审批/合并/发布。

# 恢复入口：S7.f（S7整体未完成）

仓库：Aides8Stack/GankSoft。唯一分支：feature/v075-unified-learning-workspace；原 Draft PR #13，目标 develop。当前任务延续原v0.7.5工作包，未重新初始化、未建立新分支/PR。

## 先核实保存状态

已核实远端检查点：0b22d2b92e87f89eea18f8d582ed5674fc4d150e（tree b1265124499a73d8454d6503b652b0cad7201b13），等价本地dedaf7ec987e0a9c2f2db2063411dceaca3ad4d9。

新增S7.e本地实现：12e8f62215041ea5c61d52463c5ce4daf25bf18e。完整源码、Git bundle和原工作包已保存在用户可下载的GankSoft-v0.7.5-Recovery-20261025.zip中。此前新增上传被阻断；用户随后授权精简恢复文档后，经正常审批保存至8359a79eb27cd09d108dbc2ef82804af06db4778，已独立核验全部源码和测试。

API与本地某些提交元数据父链不同，但等价代码树已核实；不通过reset、强推或覆盖工作区处理ahead/behind。API保存必须基于核实的远端tree/parent，expected_sha匹配且force=false。当前提交的自身SHA从Git/远端解析，不为回填自身SHA追加空洞提交。

## 当前实现及验证

S3–S6继承有效准入。S7.a–d已保存；S7.e原生选择导出、对称内容ZIP独立导入已本地验证。新包只含当前发布内容、关联知识及祖先正文、媒体闭包；三模式及旧文本选项原样保留。草稿/历史/FSRS不进入内容包；旧content2.0/gank.json/ZIP不删除。详细契约见docs/v075/CARD-CONTENT-EXCHANGE.md。

当前验证：业务384/384，随后交换专项7/7；协议21/133方法；构建；Electron17场景（两次进程重启，异常/外部请求为空）；Linux ASAR13组107项。详见TEST_REPORT.md和docs/v075/S7-ACCEPTANCE.json。截图BLOCKED，Windows人工及最终便携同包NOT_RUN。

## 首个未完成任务与准入

1. 读AGENTS.md/STANDARDS.md、本目录TASK/PLAN/PROGRESS/HANDOFF/TEST_REPORT；核真实工作树、原分支/PR13与最新检查点CI一次。失败读取真实Job/Artifact后最小修复，不重做S2–S6，不等待CI。
2. S7.f：统一系统设置/数据管理导航、历史错因/知识漏洞详显、焦点/窗口状态、完整大草稿/会话分页、知识大树分层和宽窄视觉T33/T35/T37。T34批量学习/删除/移动/回收恢复/导出和对称导入已验证；T36继承S6。
3. 入口：src/unified/UnifiedWorkspace.vue、UnifiedCardDetail.vue、现有Settings.vue及preferences composable；图谱MindMapWorkspace.vue/knowledge-unified服务。复用typed API，避免旧deck.kind限制和workspace.read大快照。
4. UI命令依次执行npm run build、npm run build:editor-spike、node --experimental-strip-types tools/workspace-spike/smoke.ts。保留每操作15秒和原CI900秒门禁；构建/共用资源Electron不能并发。
5. S7全部必要实现、真实验证与原Gate满足后，再连续S8→S9。未满足时不标DONE；不以Linux或Runner替代Win10/11人工验收。

不自动审批、合并或发布；不强推；不操作真实用户数据库。生产schema604不自动激活606；606仅用于已建立的合成隔离验证。Win10/11人工IME/物理操作及最终便携同包验收尚未执行，是生产启用和交付前置条件。

历史完整记录保留在Git已有提交及用户下载的 GankSoft-v0.7.5-Recovery-20261025.zip；本目录只保留当前执行摘要。根据用户2026-10-25本会话要求，精简重复的历史CI诊断、运行环境和恢复元数据，不将原始日志复制到新提交。源码、测试、阶段验收文件和既有Git历史未删除。
