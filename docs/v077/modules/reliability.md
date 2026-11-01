# 故障恢复与Windows（reliability） — v0.7.7 真实 GUI 使用路径与反馈测试

> **未运行的测试不得写 PASS**。关联原 CASE 组：FAULT、WIN；本模块的机器可读配置在 `tools/validation/v077/modules.mjs`。此文件只记录正常和异常路径的预期，不复制第二套结果账本。

## 正常使用主链

重复点击/注入失败→保留输入→重试→Win10/11 ZIP重启。

**必须有的反馈：**禁止重复提交/错误可见/未知结果待核对。

**必须读取的结果：**无重复记录、原数据完整、Win10/11独立证据。操作后必须验证页面同步、正常离开与返回；持久化写操作还需独立新 Electron PID 重启读回。

| CASE ID | 从用户可见页面触发的操作 | 必须看到/核验的结果 | 当前 Electron 状态 |
| --- | --- | --- | --- |
| FAULT-02 | 两次点击保存/发布/移入回收站 → 仅一个成功记录 | 请求幂等、无重复卡和历史 | NOT_RUN |
| FAULT-03 | 数据库保存故意失败后继续键入 → 再尝试保存 | 未保存内容可恢复，失败不伪装为 clean | NOT_RUN |
| WIN-09 | Win10/Win11 使用相同隔离合成库流程分别完成一次新卡→草稿→发布→复盘→重启 | 两台结果一致，原始 ZIP 相同 | NOT_RUN |

## 异常、取消与用户反馈

| CASE ID | 失败/取消/特殊输入 | 反馈或零写断言 |
| --- | --- | --- |
| FAULT-08 | 操作过程中模拟重启/退出/中断 → 再进入 | 按实际持久化回执恢复，不虚报未落盘的更改 |
| WIN-07 | 原生系统文件选择/保存/确认/取消弹窗按鼠标操作 | 操作/取消的真实结果符合业务零写约束 |

通用五态：**未保存 → 处理中 → 真成功 → 可理解的失败/冲突 → 空结果/取消**。收集失败时必须分别记录用户所见、后台确认和重启后结果，不能只记录报错字符串。

## Work 按模块执行（测试优先，禁止边测边改生产代码）

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs show reliability
node tools/validation/v077/run.mjs list --module reliability --baseline
node tools/validation/v077/run.mjs run --module reliability --baseline
# 以上会如实标记尚未编码的 CASE 为 NOT_RUN，退出码 2 不能算通过。
```

尚未实现的场景优先复用正式 Electron Playwright 公共驱动，按**功能模块**将脚本放在 `tools/validation/v077/scenarios/`，在唯一 `registry.mjs` 明确注册；不得用 API 直接代替按钮触发。原始失败报告位于 `validation-results/v077/runs/`，运行后用 `collect.mjs` 转入唯一 `DEFECT-INBOX.json`，待所有模块收集完再进入 I3/F4 统一修改。遇数据破坏风险立即停止该危险路径并保留证据。
