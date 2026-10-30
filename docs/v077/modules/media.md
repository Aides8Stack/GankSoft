# 图片与资源库（media） — v0.7.7 真实 GUI 使用路径与反馈测试

> **未运行的测试不得写 PASS**。关联原 CASE 组：MEDIA；本模块的机器可读配置在 `tools/validation/v077/modules.mjs`。此文件只记录正常和异常路径的预期，不复制第二套结果账本。

## 正常使用主链

正文插图→资源库预览→设置图片大小→保存重启。

**必须有的反馈：**上传进度/成功/资源不可用/安全拒绝提示。

**必须读取的结果：**资源哈希、assetId、placement与引用完整。操作后必须验证页面同步、正常离开与返回；持久化写操作还需独立新 Electron PID 重启读回。

| CASE ID | 从用户可见页面触发的操作 | 必须看到/核验的结果 | 当前 Electron 状态 |
| --- | --- | --- | --- |
| MEDIA-01 | 从卡片正文插入/粘贴图片 → 打开图片资源库 | 资源存在、卡片引用与资源 ID 对应 | NOT_RUN |
| MEDIA-03 | 同图不同位置分别设置 30% 和 80% → 保存重启 | 宽度独立、资源不重复删除 | NOT_RUN |

## 异常、取消与用户反馈

| CASE ID | 失败/取消/特殊输入 | 反馈或零写断言 |
| --- | --- | --- |
| MEDIA-07 | 图片资源恢复/备份后打开历史卡片 | 图片内容哈希与显示一致，无断链 |

通用五态：**未保存 → 处理中 → 真成功 → 可理解的失败/冲突 → 空结果/取消**。收集失败时必须分别记录用户所见、后台确认和重启后结果，不能只记录报错字符串。

## Work 按模块执行（测试优先，禁止边测边改生产代码）

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs show media
node tools/validation/v077/run.mjs list --module media --baseline
node tools/validation/v077/run.mjs run --module media --baseline
# 以上会如实标记尚未编码的 CASE 为 NOT_RUN，退出码 2 不能算通过。
```

尚未实现的场景优先复用正式 Electron Playwright 公共驱动，按**功能模块**将脚本放在 `tools/validation/v077/scenarios/`，在唯一 `registry.mjs` 明确注册；不得用 API 直接代替按钮触发。原始失败报告位于 `validation-results/v077/runs/`，运行后用 `collect.mjs` 转入唯一 `DEFECT-INBOX.json`，待所有模块收集完再进入 I3/F4 统一修改。遇数据破坏风险立即停止该危险路径并保留证据。
