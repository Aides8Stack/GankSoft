# 备份恢复与回收站（storage） — v0.7.7 真实 GUI 使用路径与反馈测试

> **未运行的测试不得写 PASS**。关联原 CASE 组：BACK、TRASH；本模块的机器可读配置在 `tools/validation/v077/modules.mjs`。此文件只记录正常和异常路径的预期，不复制第二套结果账本。

## 正常使用主链

备份→检查归档→隔离库恢复→删卡→回收站恢复。

**必须有的反馈：**备份路径/风险预览/确认/取消/恢复完成提示。

**必须读取的结果：**SQLite/图片/卡ID/历史/调度一致、取消零写。操作后必须验证页面同步、正常离开与返回；持久化写操作还需独立新 Electron PID 重启读回。

| CASE ID | 从用户可见页面触发的操作 | 必须看到/核验的结果 | 当前 Electron 状态 |
| --- | --- | --- | --- |
| BACK-01 | 先建立卡片/草稿/复盘/图片/知识点合成数据 → 导出完整备份 ZIP | 归档可校验，包含业务/媒体/历史及身份 | NOT_RUN |
| BACK-03 | 导出备份后故意修改工作库 → 隔离目录恢复备份 | 恢复前预览准确，恢复后数据库/媒体一致 | NOT_RUN |
| TRASH-02 | 将一张卡移回收站 → 回收站中查看 → 恢复 | 卡片 ID、已发布内容、草稿、历史和排期恢复 | NOT_RUN |

## 异常、取消与用户反馈

| CASE ID | 失败/取消/特殊输入 | 反馈或零写断言 |
| --- | --- | --- |
| BACK-04 | 恢复前确认对话框点取消 | 取消零业务写入，已存在卡片/草稿完整 |
| TRASH-04 | 删除有未发布草稿的卡片 → 恢复 | 草稿仍可在草稿箱被恢复编辑 |

通用五态：**未保存 → 处理中 → 真成功 → 可理解的失败/冲突 → 空结果/取消**。收集失败时必须分别记录用户所见、后台确认和重启后结果，不能只记录报错字符串。

## Work 按模块执行（测试优先，禁止边测边改生产代码）

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs show storage
node tools/validation/v077/run.mjs list --module storage --baseline
node tools/validation/v077/run.mjs run --module storage --baseline
# 以上会如实标记尚未编码的 CASE 为 NOT_RUN，退出码 2 不能算通过。
```

尚未实现的场景优先复用正式 Electron Playwright 公共驱动，按**功能模块**将脚本放在 `tools/validation/v077/scenarios/`，在唯一 `registry.mjs` 明确注册；不得用 API 直接代替按钮触发。原始失败报告位于 `validation-results/v077/runs/`，运行后用 `collect.mjs` 转入唯一 `DEFECT-INBOX.json`，待所有模块收集完再进入 I3/F4 统一修改。遇数据破坏风险立即停止该危险路径并保留证据。
