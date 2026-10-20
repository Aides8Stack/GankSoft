# G3 测试报告

基线 df6b5a3ab1b07a966e363ac174634907abf1cf47；分支 fix/g3-rc-preflight；版本0.7.4-rc.2。
G2 PASS 继承本次用户提供的验收，不重新审查。实时核实 PR#4 已合并、develop 未前移。

环境Linux / Node24.19.0 / npm11.9.0；测试对象为基线加本PR工作树，最终文件哈希和提交tree对应，非Windows实测。

| 命令/核验 | 结果 | 范围 |
| --- | --- | --- |
| npm ci --include=dev --ignore-scripts | PASS | 锁定依赖安装，仅供pipeline测试；不冒充应用构建 |
| node --test tools/pipeline/protection.test.mjs | PASS | 34/34，0 skipped |
| 三个protection/github/test文件CRLF独立临时副本运行同专项 | PASS | 34/34，0 skipped，Linux换行回归 |
| npm run test:pipeline | PASS | 120/120，0 failed/cancelled/skipped |
| npm run version:check -- origin/develop | PASS | 0.7.4-rc.2，package和lock两处版本一致 |
| git diff --check；既有scanSource工作流/源码守卫 | PASS | 无workflow/权限/业务变更 |
| 无认证公开API实际requireReleaseProtection | PASS（预期拒绝） | ruleset25463281 active，bypass_actors=missing；不是发布PASS |
| CI、Windows、RC发布 | NOT_RUN/待核实 | 最终报告和PR描述只记录首次触发，不等待结果 |
| 业务/ASAR全量审计 | NOT_RUN | 本轮无关，不重复G2证据 |

拒绝覆盖：disabled/evaluate、非空bypass、字段缺失/null/错误类型、缺失详情/身份、401/403/404/500（分支/有效规则/详情）、网络与损坏JSON、必需状态缺失/来源错误、Strict关闭、PR/强推/删除保护缺失、多Ruleset及第二页不可验证规则；正常完整证据和合法可选字段通过。全部测试API为只读GET。
首次专项因分页URL/错误消息变化使旧mock预期失败；首次完整回归发现撤回场景mock分页URL不匹配。仅调整mock精确请求，保留原断言；最终全量通过。无测试删除/跳过。

原Run日志未含API结构，本轮未获得原Actions Token，不宣称测得原响应缺失。当前公开真实响应+管理接口差异和官方规范支持权限根因。修复保留所有不可确认情况拒绝；自动恢复仍BLOCKED。
