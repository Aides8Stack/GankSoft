# G3 人工RC发布进度

当前实现：DONE；阶段结论 IMPLEMENTED_PENDING_CI。延续#8/fix/g3-rc-preflight，前序检查点a02a88e240c00b09b3f4fe3d7bc02dda280e66e8；版本0.7.4-rc.3。用户已取消外部服务方案。
P1 DONE：Public/default main；Environment GET200返回0；公开仓库支持Required reviewers但owner尚未配置。旧#8质量Run39448956112成功，pr-trust39449063303因exact-SHA人工复核缺失而失败；旧RC39446565059是失败证据。
P2 DONE：build-only显式记录隐藏bypass未验证；原严格函数保持拒绝；自动quality/security/Windows/artifact门禁保留，写权限只在最终release Job。
P3 DONE：Environment唯一owner审批+精确request digest+人工核验时间，绑定repo/develop、coordinator/source SHA、版本、Run/attempt/manifest；发布每次写前复查并保存独立人工授权回执。未配置Env/无批准/过期/篡改/CI失败/冲突均拒绝；不启用Stable。
P4 DONE：owner24/24、pipeline144/144、CRLF58/58，无删除/跳过；未重跑业务/ASAR/G2审查。原120测试继承并保留。
P5：普通非强制保存#8当前分支、远程tree/parent/head匹配；最终提交/首次CI回执从PR描述与本轮最终报告解析，不写自身未来SHA。

部署验收BLOCKED：环境未配置，实际人工批准、真实RC/Windows均NOT_RUN。无main PR需求（原生develop自动Run审批可用），未修改受保护分支、Ruleset、Secret/App或Release/Tag。点击步骤与限制见docs/ci/OWNER_RC_APPROVAL.md。
