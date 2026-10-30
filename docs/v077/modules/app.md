# 启动与学习总览（app） — v0.7.7 真实 GUI 使用路径与反馈测试

> **未运行的测试不得写 PASS**。关联原 CASE 组：ENV、HOME；本模块的机器可读配置在 `tools/validation/v077/modules.mjs`。此文件只记录正常和异常路径的预期，不复制第二套结果账本。

## 正常使用主链

首次启动→首页空态→创建卡片集→退出重启。

**必须有的反馈：**初始化/空态/读取失败提示。

**必须读取的结果：**数据目录、首页统计和新卡片集可读。操作后必须验证页面同步、正常离开与返回；持久化写操作还需独立新 Electron PID 重启读回。

| CASE ID | 从用户可见页面触发的操作 | 必须看到/核验的结果 | 当前 Electron 状态 |
| --- | --- | --- | --- |
| ENV-01 | 首次启动 Windows/Electron 便携程序 → 进入学习总览 → 关闭 → 再次启动 | 无崩溃、无旧模式604生产准入、同一隔离数据目录和启动页 | NOT_RUN |
| ENV-02 | 完全空白 Schema606 首次启动 → 检查所有主页与导航入口 | 空状态和引导正确，无演示数据混入 | NOT_RUN |
| HOME-01 | 空库首页查看摘要与卡片集列表 → 创建卡片集 | 新卡片集出现在首页、可进入 | NOT_RUN |
| HOME-02 | 从首页点击某卡片集 → 查看本集概览 | 总卡数、待复盘数量与实际查询一致 | NOT_RUN |

## 异常、取消与用户反馈

| CASE ID | 失败/取消/特殊输入 | 反馈或零写断言 |
| --- | --- | --- |
| ENV-07 | 故意触发页面列表查询失败 → 点击重新读取 | 可恢复、错误信息不冒充已成功 |
| HOME-08 | 本集没有待复盘卡时点击学习入口 | 给出明确空状态，不创建空或重复会话 |

通用五态：**未保存 → 处理中 → 真成功 → 可理解的失败/冲突 → 空结果/取消**。收集失败时必须分别记录用户所见、后台确认和重启后结果，不能只记录报错字符串。

## Work 按模块执行（测试优先，禁止边测边改生产代码）

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs show app
node tools/validation/v077/run.mjs list --module app --baseline
node tools/validation/v077/run.mjs run --module app --baseline
# 以上会如实标记尚未编码的 CASE 为 NOT_RUN，退出码 2 不能算通过。
```

尚未实现的场景优先复用正式 Electron Playwright 公共驱动，按**功能模块**将脚本放在 `tools/validation/v077/scenarios/`，在唯一 `registry.mjs` 明确注册；不得用 API 直接代替按钮触发。原始失败报告位于 `validation-results/v077/runs/`，运行后用 `collect.mjs` 转入唯一 `DEFECT-INBOX.json`，待所有模块收集完再进入 I3/F4 统一修改。遇数据破坏风险立即停止该危险路径并保留证据。
