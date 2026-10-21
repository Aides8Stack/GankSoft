# G3 人工RC发布测试报告

对象：a02a88e240c00b09b3f4fe3d7bc02dda280e66e8基础上的本PR工作树，版本0.7.4-rc.3；Linux Node24.19.0/npm11.9.0。
- PASS：npm ci --include=dev --ignore-scripts（pipeline-only安装，不冒充应用构建）。
- PASS：node --test tools/pipeline/owner-rc.test.mjs：24/24，无skip/fail/cancel。生产发布模块mock一次发布/幂等重放/过期不公开、错误SHA与占版零写入；拒绝无批准、外人/错ID/错环境/拒绝/文本篡改/未来与过期、错误source/version/manifest/Run/attempt、制品篡改、失败/缺失/重复CI、API错误/可见bypass/Strict关闭；只读构建未知bypass明确标记。
- PASS：npm run test:pipeline：144/144；原120项保留，新24项。真实cold-install/worktree、版本/队列/撤回/事务/工作流安全相关回归通过，非G2全量审计。
- PASS：独立CRLF源码+工作流副本，owner与strict protection共58/58。仅Linux换行模拟，不称Windows OS。
- PASS：npm run version:check -- origin/develop；git diff --check；既有scanSource工作流/源码守卫。
- NOT_RUN：业务/ASAR全量（用户排除）；真实Environment配置/审批/发布/Windows/Stable；新CI结论。
初始新增fixture漏version，补真实verifyDirectory所需字段后通过，未弱化断言。首次完整pipeline的cold-cache子测试因npm离线缺zod tarball失败，npm ci补齐锁定缓存后原测试通过；未改bootstrap测试或跳过。
前序远程质量39448956112为旧a02a88e成功，pr-trust39449063303仍需owner独立审核；旧RC39446565059失败。新CI只能记录首次触发，最终报告提供Run ID；不等待或宣称构建/发布成功。

授权策略独立标识OWNER_ENVIRONMENT_ATTESTATION_V1。人工完整实时核验与15分钟owner声明窗口不等同机器持续验证；GET Environment缺少未文档化开关不被假定安全，实际owner审批记录始终必需。详细部署步骤/限制见OWNER_RC_APPROVAL.md；源码哈希见docs/ci/evidence/g3-owner-validation.json。
