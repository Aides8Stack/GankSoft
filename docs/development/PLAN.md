# G3 RC preflight

基线 df6b5a3ab1b07a966e363ac174634907abf1cf47；分支 fix/g3-rc-preflight。
A DONE：核实失败 Run39446565059/Job118709928702、只读 Token、当前有效规则和管理/公开详情字段差异。继承 G2 PASS，不重审。
B DONE：保留 fail-closed，仅区分配置错误与不可见证据，分页读取所有有效规则，追加结构化无敏感正文诊断。不存在已验证的只读 no-bypass 证明渠道，不接入高权限 Token/静态快照。
C DONE：测试正常/禁用/bypass/缺失/null/权限/网络/分页/来源/Strict/PR/强推/删除；流水线相关回归，不重跑业务或 ASAR 审计。源码变化按现有规则递增 rc.2。
D IN_PROGRESS：新 PR → develop；普通 API 保存并验证 tree/parent/head；只读取 CI 触发回执后退出。不合并，不操作 Release/Tag，不改 Ruleset。
恢复验收 BLOCKED：只有可靠运行时证据可通过；诊断 PR 不等于自动 RC 恢复。
