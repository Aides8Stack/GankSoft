## 2026-10-25 原生窗口状态检查点（待 Windows 专项）

恢复核实原PR13仍Draft、原分支HEAD c1bcbc02d158697b12c5a216e0ccbc8f0435aad9，CI40173592122的scope/Windows/Ubuntu/pr-gate全PASS。已下载并查看Windows设置截图1366/720：中文可读、控件无溢出，补足设置页视觉证据，不代表全页面验收。

继承未提交窗口成果，补齐正常位置/大小与最大化状态的原子保存、损坏文件回退、显示器移除与小屏边界。没有改变数据库、schema或生产启用。窗口单元3/3、应用/隔离构建PASS；Linux真实Electron专项发现getNormalBounds返回0尺寸（无窗口管理器），本地原生验收BLOCKED，不冒充通过。新增专项进入既有Windows质量入口，保持门禁；等待未来真实结果但不轮询。

首个未完成：大知识树roots/children按需载入及完整宽窄图谱视觉；窗口待Windows专项确认。S7仍IN_PROGRESS，S8/S9 NOT_STARTED。当前检查点自身SHA以Git/PR解析，保存后继续独立任务。

## 2026-10-25 S7.f 设置、历史证据与返回焦点检查点

基线016ae2357148222c90b29d84c6a5d9555e075576 / CI40171845002已真实核实scope、Windows、Ubuntu、pr-gate全通过；继承S0–S7.e，不重新克隆/初始化/新建分支。

新增全局设置及主题持久化、数据备份/内容导入/当前集调度和回收入口、待核对操作与外部AI指引；复用现有API/偏好/备份服务。详情补齐原始错因和知识漏洞，旧记录只呈现已有事实。设置返回保留列表筛选/选择/焦点和历史证据；返回复盘时重新读取已暂停会话修订，继续编辑不会使用旧revision。没有改schema或旧学习/图片协议。

实测：历史证据3/3；Electron设置专项5场景、errors/external=[]；CI基础设施5/5；协议边界与应用/隔离构建PASS。使用同一生产协调器完成真实备份与取消。测试夹具补齐提交前草稿保存、明确区分历史按钮与图表点、直接记忆默认揭示状态，没有改变产品断言或增加超时。原17场景与ASAR13/107仍继承基线，本次不重复。

离屏截图1366/720已成功捕获并检查布局；当前Linux无中文字体，文字方框，完整中文视觉验收BLOCKED，不能标PASS。专项已接入既有Windows质量入口，保留原15秒操作/900秒步骤上限与全部门禁。原始截图/日志不提交，只保留非敏感摘要docs/v075/S7F-ACCEPTANCE.json。

首个未完成：S7.f原生窗口状态、知识大树按层呈现和完整宽窄视觉T33/T35/T37；S7整体IN_PROGRESS，S8/S9 NOT_STARTED。保存后继续可独立任务，不等待CI，不自动审批/合并/发布。

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
