# G3 OWNER_ENVIRONMENT_ATTESTATION_V1 交接

IMPLEMENTED_PENDING_CI。前序远程a02a88e240c00b09b3f4fe3d7bc02dda280e66e8；#8/fix/g3-rc-preflight → develop；当前0.7.4-rc.3。本轮取消外部服务，不重复初始化同分支任务/G2审查。
实现：protection可见保护与严格完整校验分离；queue仅CLI显式build-only；verify-all原门禁后生成approval-request；owner-rc独立人工策略；release复用原事务/账本并逐写守卫；develop-rc最终Job Environment批准。Stable/pr-trust工作流不变。
下一步：1.只读新HEAD真实CI，失败按真实日志最小修复；不套用旧#8成功。2.所有者按docs/ci/OWNER_RC_APPROVAL.md创建rc-publish-owner（Required reviewer仅Aides8Stack、develop-only、关闭管理员绕过；单owner允许自审）。3.审核本PR完整SHA并通过既有pr-trust授权，必需状态通过后所有者决定合并。4.原自动构建成功后Review deployments，核验完整实时Ruleset/bypass/必需状态等，复制Summary摘要声明填当前Unix秒，Approve and deploy；不授权未列明版本。

15分钟人工核验有效期；GitHub审批API无独立时间戳，owner时间是人工声明而非平台签发。缺失bypass从未视作机器通过；人工核验后隐藏配置变化仍有窗口。公开仓库原生审批可用，无需本轮main入口部署；若未来转私库失去功能，保持BLOCKED并另建main独立PR，不跳过环境。

真实Env/批准API行为与Token读取、CI/Windows/RC未验收；无Release/Tag实际写入。历史撤回的main严格保护检查不改，跨Run/attempt旧包/过期授权不恢复；Draft/Tag冲突保留后交owner既有恢复机制。
最终远程SHA/tree/首次Run回执在PR描述和最终报告；当前文档检查点以git log -1 -- docs/development和远程HEAD解析。核实触发后立即退出，不轮询、不合并、不恢复/发布。
