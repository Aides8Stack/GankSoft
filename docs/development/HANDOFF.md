## 显示工作区故障已定位并本地修复

真实诊断证实Linux无头screen.workArea为1×1，窗口归一化将应用压成1×1，导致导航点击无命中。E2E状态隔离不是该故障根因，已纠正此前假设。窗口帮助器把无效/未就绪桌面（含0或1×1）回退为1460×960；正常小屏640×480和移除显示器仍按真实边界保护。窗口单元3/3和构建PASS；原失败tools/smoke-knowledge-filter.mjs四个原业务场景真实PASS，没有删断言、force点击或增加超时。临时诊断已移除。

c35298b的CI40200339283：Windows质量PASS（含原生正常位置、最大化/还原与进程重启），Ubuntu仍为同一ASAR点击失败。大树全源码已保存f9ef54b3b0fa9202f9ca4016fab1a20ffafef224/tree def8ea1c5a9eefc4660f302a4ff67e1045e18205，独立fetch核验本地168dcc1树一致；Run40201510884首次in_progress。现在继续必要ASAR和完整宽窄视觉采集/Windows审阅，不等CI、不进入未准入S8。

# 当前交接

唯一仓库Aides8Stack/GankSoft，分支feature/v075-unified-learning-workspace，原Draft PR13→develop。连续授权S7→S8→S9仍有效，不在提交后退出、不等CI；准入未满足不能提前标DONE。

当前S7.f大树与窗口验收IN_PROGRESS。恢复从RECOVERY-NEXT.md/TASK.json开始。c1bcbc02的CI40173592122真实PASS；原生窗口207156d的失败Job已读并最小修复，c35298b35a5cdb44df79b46a418580931de72c38保存核验一致，修复CI40200339283首次queued。

当前源码含大树layer/locate只读协议、hash缓存边界、完整树编辑保护及合成专项。已验证27业务、协议21/135、大树Electron7、原知识Electron10、构建/类型；最后搜索保留未保存模型补丁已重建并通过专项，工作台17场景相关回归PASS。所有有效源码、测试和必要配置必须随检查点保存，不得只提交此文档。Windows完整中文视觉、原生最大化/重启仍待真实专项，Win10/11人工及最终便携同包NOT_RUN。

本地与API提交元数据父链可不同；保存前核真实远端HEAD/tree，以此为base/parent，expected_sha匹配且force=false；独立fetch后比较完整代码树/文件内容，不重置或强推。不得上传真实库、密钥、令牌、私人文件、未检查日志；不新分支/PR、不自动trusted审批/合并/发布、不自动生产迁移。

保留已有Git历史与此前可下载恢复包。若再次审批拒绝，按用户要求检查实际原因；仍失败则停止重复尝试，导出全部未推送成果与Git历史并独立恢复验证。下一入口和未完成范围必须准确记录。
