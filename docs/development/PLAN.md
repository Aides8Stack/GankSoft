# G3 RC preflight

基线 df6b5a3ab1b07a966e363ac174634907abf1cf47；分支 fix/g3-rc-preflight。
A DONE：核实失败 Run39446565059/Job118709928702、只读 Token、当前有效规则和管理/公开详情字段差异。继承 G2 PASS，不重审。
B DONE：保留 fail-closed，仅区分配置错误与不可见证据，分页读取所有有效规则，追加结构化无敏感正文诊断。不存在已验证的只读 no-bypass 证明渠道，不接入高权限 Token/静态快照。
C DONE：测试正常/禁用/bypass/缺失/null/权限/网络/分页/来源/Strict/PR/强推/删除；流水线相关回归，不重跑业务或 ASAR 审计。源码变化按现有规则递增 rc.2。
D IN_PROGRESS：新 PR → develop；普通 API 保存并验证 tree/parent/head；只读取 CI 触发回执后退出。不合并，不操作 Release/Tag，不改 Ruleset。
恢复验收 BLOCKED：只有可靠运行时证据可通过；诊断 PR 不等于自动 RC 恢复。

## G3 OWNER_ENVIRONMENT_ATTESTATION_V1（2026-10-21，替代外部服务方案）
继续#8/fix/g3-rc-preflight，不重复task:init，不新增产品分支。基线a02a88e；用户取消外部服务，允许人工独立授权策略。P1 DONE：公开仓库/default main；Environment GET200返回0项，原生Required reviewers可用但未配置。#8质量CI PASS，pr-trust仍需exact-SHA owner review。P2/P3 IN_PROGRESS：构建只验证可见保护并明确bypass未验证，发布必须Environment owner approval+精确摘要/Run/attempt/版本/制品绑定，15分钟人工核验有效期；无批准或API异常拒绝。原严格validateProtection和Stable不降级。P4：新增正反例和相关流水线回归，无业务/ASAR重审。P5：更新#8/普通非强制保存/核实远程及CI触发即退出；不main部署、不配置Environment、不合并/发布。
原Env审批可以直接在develop自动Run等待，不依赖默认main手动入口；无需新增main PR。所有者仍需手动创建Environment，只允许develop，唯一reviewer Aides8Stack、禁admin bypass，允许自审以支持单所有者。
