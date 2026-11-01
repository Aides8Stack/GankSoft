# 筛选学习、复盘与调度（learning） — v0.7.7 真实 GUI 使用路径与反馈测试

> **未运行的测试不得写 PASS**。关联原 CASE 组：PLAN、REVIEW；本模块的机器可读配置在 `tools/validation/v077/modules.mjs`。此文件只记录正常和异常路径的预期，不复制第二套结果账本。

## 正常使用主链

筛选→生成学习队列→答题/揭晓→评分→保存→重启。

**必须有的反馈：**筛选空态/答题提交/保存成功/任务完成提示。

**必须读取的结果：**评分、FSRS、下次日期与复盘历史对应。操作后必须验证页面同步、正常离开与返回；持久化写操作还需独立新 Electron PID 重启读回。

| CASE ID | 从用户可见页面触发的操作 | 必须看到/核验的结果 | 当前 Electron 状态 |
| --- | --- | --- | --- |
| PLAN-01 | 打开筛选学习 → 选卡片类型/学习状态 → 查看预览 | 预览与筛选一致、无混类型错卡 | NOT_RUN |
| PLAN-09 | 打开卡片集调度设置 → 修改参数 → 保存 | 新设置持久，未确认重算不改既有计划 | NOT_RUN |
| REVIEW-01 | 错题卡进入复盘 → 选择选项 → 填独立思路 → 揭晓 → 评分 → 保存 | 客观答案、自评、思路各自记录，不混淆 | NOT_RUN |
| REVIEW-02 | 错题答错但评分给 10 分 → 保存 | 客观答错强制 Again，不被高自评覆盖 | NOT_RUN |
| REVIEW-04 | 问答卡进入复盘 → 回忆 → 揭晓答案 → 评分 | 记录正确且无单选题状态残留 | NOT_RUN |
| REVIEW-05 | 直接记忆卡阅读正文 → 评分 → 保存 | 记录模式和内容一致，不要求输入选择题选项 | NOT_RUN |

## 异常、取消与用户反馈

| CASE ID | 失败/取消/特殊输入 | 反馈或零写断言 |
| --- | --- | --- |
| REVIEW-03 | 错题答对但低评分 → 保存 | 按 0–10 自评正确映射调度，客观结果独立保存 |

通用五态：**未保存 → 处理中 → 真成功 → 可理解的失败/冲突 → 空结果/取消**。收集失败时必须分别记录用户所见、后台确认和重启后结果，不能只记录报错字符串。

## Work 按模块执行（测试优先，禁止边测边改生产代码）

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs show learning
node tools/validation/v077/run.mjs list --module learning --baseline
node tools/validation/v077/run.mjs run --module learning --baseline
# 以上会如实标记尚未编码的 CASE 为 NOT_RUN，退出码 2 不能算通过。
```

尚未实现的场景优先复用正式 Electron Playwright 公共驱动，按**功能模块**将脚本放在 `tools/validation/v077/scenarios/`，在唯一 `registry.mjs` 明确注册；不得用 API 直接代替按钮触发。原始失败报告位于 `validation-results/v077/runs/`，运行后用 `collect.mjs` 转入唯一 `DEFECT-INBOX.json`，待所有模块收集完再进入 I3/F4 统一修改。遇数据破坏风险立即停止该危险路径并保留证据。
