# G3 恢复交接

基线 df6b5a3ab1b07a966e363ac174634907abf1cf47；分支 fix/g3-rc-preflight；版本0.7.4-rc.2。
G2 PASS 继承本次用户提供的验收，不重新审查。实时核实 PR#4 已合并、develop 未前移。

当前结论：BLOCKED，诊断PR不是恢复成功。入口tools/pipeline/protection.mjs；queue.mjs→requireReleaseProtection；github.mjs与工作流权限未改。Stable/撤回共用该验证函数，故运行了全部pipeline相关回归，未做无关业务/ASAR重审。

根因：GitHub Get a repository ruleset明确规定bypass_actors只对Ruleset写权限调用者返回。原preflight只有读取权限，旧代码把配置缺陷和证据不可见合成同一错误。当前公开GET实际省略字段，管理接口返回空数组；active及4条有效规则均核实。原Run没有响应体日志，具体当时字段形状无法追溯，本修复在拒绝信息中补最小结构诊断。
官方依据：https://docs.github.com/en/rest/repos/rules#get-a-repository-ruleset 。Metadata read能读有效规则/详情，但不能由此证明无bypass。current_user_can_bypass只说明调用者；Ruleset列表、protected布尔、历史G2快照均不等价。未找到已验证且无需Ruleset写能力的等价实时读取方案。

下一步所有者：
1. 审核本PR完整SHA（CI控制文件变更需既有独立可信授权），读取真实pr-gate/pr-trust；不自动合并。
2. 保留RC阻断。当前没有经验证的“只增read权限即可恢复”的配置操作；不要盲加administration:read PAT，也不要把管理Token放进RC工作流。若要求自动恢复，需要另行批准一个隔离的可信验证边界，其管理端能读取完整实时bypass、对本次运行证据签名、发布端独立校验并拒绝过期/重放。此方案尚未设计批准或实现；需要单独授权，不能作为本PR已完成内容。
3. 取得可靠安全证据后再审核恢复方案；合并后先走原自动RC，只有未触发/队列问题才用既有owner reconcile。当前reconcile仍会因同一证据缺失拒绝，不能用来绕过。

最终保存的SHA/PR/首次Run回执见本次最终报告及PR描述；本仓库文档检查点由git log -1 -- docs/development和远程分支解析。CI仍待核实；Windows构建、Win10/11实机、RC发布均无本轮成功证据。保存后退出，不等待CI、不手动恢复、不操作Tag/Release。
