# RC、Stable及恢复
RC：用户合并版本PR至受保护develop后自动运行。Work提交交接后结束。PR不打包。下载入口为仓库Releases的Pre-release；本轮没有现成新安装包。
队列：固定policy.adoptionBaseline扫描第一父链所有合并。A失败阻断后续，下一次develop push或所有者reconcile重扫、核对已发布资产摘要，补全部缺失SHA。单组cancel=false不代表FIFO，补偿扫描才保证漏发可恢复。不得修改adoptionBaseline掩盖失败。
受信任协调器以触发提交为上界，origin/develop包含该提交即可；允许后续合并到来，不把既合入版丢弃。发布资产使用本run精确命名artifact，不下载latest。
Draft重试：同SHA、同version、同一原始制品可以补传缺少文件，字节冲突或多余文件立即失败，保留Draft。重新构建产生不同run元数据/字节时，不覆盖旧Draft；在原run保留期内取回原制品，人工核验后从原发布Job恢复。缺失原制品则人工处置后发布新版本，不重用已撤回Tag。
Stable：先人工批准将正式SemVer源码及工作流推广main；由所有者在默认main运行stable-candidate，source_sha必须等于当时main HEAD。它完整测试/安全/Windows构建后只创建私有Draft，不发布Stable。
在Windows10和11分别下载同一正式Draft的portable.zip，运行tools/validation/windows-test.ps1，实际执行40项人工验收后逐项填写manualCases/manualSignoff；报告sourceSha、version、zipSha256、应用EXE SHA必须与同一正式包一致。不得伪造。
使用gh release upload vVERSION win10-actual.json win11-actual.json（不得--clobber）把两份真实报告附到该Draft。所有者再单独运行release-control的publish，输入完整source_sha及确认短语“publish vVERSION SHA”。它独立校验实际资产摘要/正式源码/40项同包报告和既有release:verify，才发布Stable。无须Work在场。
release-control query/rename/withdraw均所有者手动。rename确认“rename vVERSION”，允许标题/说明更正；withdraw确认“withdraw vVERSION SHA”只撤回Release，保留Tag作为不可重用墓碑。Immutable策略若拒绝变更应如实失败，不强制绕过。
未实现自动更新main、自动合并、自动公开、自动Stable。真实CI/Windows/发布故障演练必须在用户批准合并后进行；当前NOT_RUN。公开历史脚本只审计所有可访问Git refs，不能代替Actions日志/旧工件/版权/第三方App和个人资料人工审计。
