## 2026-10-25 S7.f 设置、历史证据与返回焦点检查点

基线016ae2357148222c90b29d84c6a5d9555e075576 / CI40171845002已真实核实scope、Windows、Ubuntu、pr-gate全通过；继承S0–S7.e，不重新克隆/初始化/新建分支。

新增全局设置及主题持久化、数据备份/内容导入/当前集调度和回收入口、待核对操作与外部AI指引；复用现有API/偏好/备份服务。详情补齐原始错因和知识漏洞，旧记录只呈现已有事实。设置返回保留列表筛选/选择/焦点和历史证据；返回复盘时重新读取已暂停会话修订，继续编辑不会使用旧revision。没有改schema或旧学习/图片协议。

实测：历史证据3/3；Electron设置专项5场景、errors/external=[]；CI基础设施5/5；协议边界与应用/隔离构建PASS。使用同一生产协调器完成真实备份与取消。测试夹具补齐提交前草稿保存、明确区分历史按钮与图表点、直接记忆默认揭示状态，没有改变产品断言或增加超时。原17场景与ASAR13/107仍继承基线，本次不重复。

离屏截图1366/720已成功捕获并检查布局；当前Linux无中文字体，文字方框，完整中文视觉验收BLOCKED，不能标PASS。专项已接入既有Windows质量入口，保留原15秒操作/900秒步骤上限与全部门禁。原始截图/日志不提交，只保留非敏感摘要docs/v075/S7F-ACCEPTANCE.json。

首个未完成：S7.f原生窗口状态、知识大树按层呈现和完整宽窄视觉T33/T35/T37；S7整体IN_PROGRESS，S8/S9 NOT_STARTED。保存后继续可独立任务，不等待CI，不自动审批/合并/发布。

## 最终源码保存核验（2026-10-25）

原分支已保存源码检查点 `8359a79eb27cd09d108dbc2ef82804af06db4778`，tree `7f457703fef15345683a49b3309654d3e8253f3a`。独立git fetch后，与本地有效源码逐项核对：755个受版本控制文件内容/模式/清单一致，23个本轮变更文件全部存在；未上传文件0、内容差异0。非敏感文件清单与哈希见docs/v075/S7-SAVE-VERIFICATION.json。此处更新发生在源码/测试完整核验之后。

当前只补最终恢复回执；其自身SHA由Git/原PR13实时读取，不为回填SHA追加提交。S7整体仍IN_PROGRESS，首个未完成S7.f；S8/S9 NOT_STARTED。保存成功不等于CI或Windows人工验收通过。没有新分支、强推、自动审批/合并/发布。

# 当前验证摘要

被测实现：本地12e8f62215041ea5c61d52463c5ce4daf25bf18e。随后只精简恢复文档，没有更改已验证源码。Linux自动化结果不能代表Windows人工验收。

| 项目 | 结果 | 范围 |
| --- | --- | --- |
| npm test | PASS 384/384，0失败/skip | 完整业务；之后补充两个交换边界场景，见下行 |
| 原生卡片交换专项 | PASS 7/7 | 三模式/旧题/独立身份/重复包/图片30和80宽度/知识图片和祖先/备份与重开/回执失败回滚/损坏ZIP/对话框期间修订变化/取消幂等 |
| npm run check:protocol | PASS 21项，133方法 | 边界、类型和协议导出 |
| npm run build | PASS | Vue/Electron/Vite |
| npm run build:editor-spike | PASS | 隔离工作台/编辑器构建 |
| Electron统一工作台 | PASS 17场景 | 全屏1366/720、真实多页重启、调度恢复、目录分析、选中导出及预览/取消/实际ZIP独立导入；页面异常和外部请求均空 |
| 当前Linux ASAR | PASS 13组/107项 | 完成标记8146e07a-1a22-49e6-b05f-12a412ce3787；无删除/跳过/放宽门禁 |
| 宽窄截图视觉对照 | BLOCKED | 无头环境截图超时；几何/交互通过不冒充视觉通过 |
| 当前代码Windows CI | NOT_RUN/待新检查点 | 源码已保存；新提交CI在最终推送后即时核实 |
| Win10/11人工IME、物理操作、最终便携同包 | NOT_RUN | 发布/生产启用前必须完成 |

必要命令：

```bash
node --experimental-strip-types --test tests/unified-card-exchange-v075.test.ts
npm run check:protocol
npm run build
npm run build:editor-spike
node --experimental-strip-types tools/workspace-spike/smoke.ts
node tools/validation/package-check.mjs
```

构建与共用资源Electron测试必须串行。继承仍有效的历史结果，不重复已通过且不受变更影响的范围。测试使用合成隔离数据；本文件不包含原始日志、用户数据库或环境凭据。

前序CI：3ce4dda68433c507fbfc65edced345c67c91d55c的Run40168399144 Windows质量通过，Ubuntu/pr-gate因v070旧static断言失败，已读取失败Job并最小修复，当前ASAR通过。0b22d2b92e87f89eea18f8d582ed5674fc4d150e保存后即时未发现Run，未轮询。新提交CI在推送后即时记录，不能继承前序Windows结论。

历史完整记录保留在Git已有提交及用户下载的 GankSoft-v0.7.5-Recovery-20261025.zip；本目录只保留当前执行摘要。根据用户2026-10-25本会话要求，精简重复的历史CI诊断、运行环境和恢复元数据，不将原始日志复制到新提交。源码、测试、阶段验收文件和既有Git历史未删除。
