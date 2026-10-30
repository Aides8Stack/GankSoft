# GankSoft v0.7.7 恢复入口

T1-A DONE（收集结束）：本轮10条为9 PASS /1 FAIL /0 BLOCKED /0 NOT_RUN。唯一业务/反馈失败NEW-16：缺正确答案提示泄漏correctOptionId；拒绝发布和唯一草稿及新PID恢复验证通过。生产业务源码未改，Windows用户报告未关闭。

最后被测脚本检查点：50ef476ba948ac458cbfb152e82ecfb51fabc247；前序CASE按T1-A-RESULTS.json各自精确SHA继承。最终文档保存SHA从远端feature/v077读取。

只读：AGENTS.md/STANDARDS.md当前必需段、docs/v077/T1-A-REPORT.md、WORK-E2E-EXECUTION.md节约规则、当前模块文档、DEFECT-INBOX.json。不要重读全部历史或250清单，不重复task:init。

下一阶段T1-B / GPT-6.1 Sol / Medium：analytics、knowledge、media，随后其它模块/核心剩余链；T1/T2只测/收集，I3后才F4集中修复。剩余232 CASE NOT_RUN，不把脚本或旧8条PASS算本轮成功。

环境：先environment.mjs status。已有同平台同指纹合法缓存则复用；本轮首次构建410文件已校验，后续全部复用、无二次ci/build。远端未生成可下载Artifact；新Work缺依赖/输出才prepare恢复。每条新写场景先保存远端SHA再执行；按模块批量、只读失败摘要；不等CI、不合并发布。

原始截图/日志/合成快照留在validation-results/v077/runs；Git永久保存证据摘要、文件hash与全部脚本。旧预保存/首批清理挂起的部分run无完整summary，不作验收；精简工具问题记录T1-A-INFRA-ATTEMPTS.json。有界清理仅终止自身Electron子进程、保留清理异常隔离夹具，禁止访问用户数据。
