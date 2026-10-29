# R8 进度（2026-10-29）

状态：IN_PROGRESS；基线 `f1e6e9806b1b072bded9eb8888672b460b1f960f`。技术准入R7 DONE，见 ../R7/R7-CLOSURE-20261029.md。

| 工作项 | 状态 | 实际结果 |
| --- | --- | --- |
| R8.1 构建与版本准备 | DONE | package/lock=0.7.6；流水线/身份/审批规则已核对；权限不可见部分明确交所有者 |
| R8.2 便携 ZIP | BLOCKED | 当前可执行准备完成；现有脚本无需改动；必须先合并develop，未构建实际ZIP |
| R8.3 Win10/11 同包GUI | NOT_STARTED | WINDOWS-CHECKLIST.md已备；真实运行NOT_RUN |
| R8.4 真机数据完整性 | NOT_STARTED | 既有自动化证据继承，真实包NOT_RUN |
| R8.5 交付签核 | NOT_STARTED | 无下载候选、无人工签核、无Release |

版本0.7.6是候选的构建身份，不等于正式发布/真机已通过。锁SHA256：`5b1e2cd201ee5cfcbaf0976444ea112b1f01e66833e7201de34408da58a51a28`；依赖版本、integrity及其余锁内容未变。普通提交后的最终SHA由Git历史解析；将来合并develop构建的SHA另以source.json记录。

现有链路：develop push→双平台quality/security→windows-package→artifact-verify→rc-publish-owner人工批准→release-rc。只取Artifact无需批准Release环境。唯一程序下载包为GankSoft-v0.7.6-win64-portable.zip（顶层GankSoft/），另三份文字来源/报告/哈希是证明材料。rc-packages保留14天。PR不出Windows交付包，不能在功能分支伪装develop。

审批和剩余步骤见 OWNER-NEXT.md；最终验收见 ACCEPTANCE.md。未重跑R7或全量自动化，不等待新CI。
