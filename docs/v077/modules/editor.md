# 编辑器、选项与粘贴（editor） — v0.7.7 真实 GUI 使用路径与反馈测试

> **未运行的测试不得写 PASS**。关联原 CASE 组：EDITOR、CLIP；本模块的机器可读配置在 `tools/validation/v077/modules.mjs`。此文件只记录正常和异常路径的预期，不复制第二套结果账本。

## 正常使用主链

输入选项→选择答案→Ctrl+V文本/网页→保存→重开。

**必须有的反馈：**粘贴/格式降级/非法HTML拒绝/预览取消反馈。

**必须读取的结果：**选项顺序、光标编辑结果和正文准确。操作后必须验证页面同步、正常离开与返回；持久化写操作还需独立新 Electron PID 重启读回。

| CASE ID | 从用户可见页面触发的操作 | 必须看到/核验的结果 | 当前 Electron 状态 |
| --- | --- | --- | --- |
| EDITOR-03 | 错题卡添加两个以上选项 → 改内容、上移/下移、删除 | 可见顺序与保存顺序一致，正确项跟随正确 ID | NOT_RUN |
| EDITOR-06 | 批量输入选项 → 确认替换 → 重开 | 数量/文本/顺序正确，旧正确答案要求重新选择 | NOT_RUN |
| CLIP-01 | Windows 记事本复制普通中文/英文 → 正文 Ctrl+V → 自动保存 | 文本完整插入，无 UNSUPPORTED_HTML，草稿能从 UI 恢复 | PASS |
| CLIP-02 | Windows 网页选取带段落和加粗的文字 → Ctrl+V → 重开 | 安全降级为受支持文本，合理保留换行、不执行原网页 HTML | NOT_RUN |
| CLIP-04 | 复制文字中含字面 <b>/<script> 字符 → 粘贴 | 纯文字不得执行脚本，也不因普通字面字符导致错误状态 | PASS |

## 异常、取消与用户反馈

| CASE ID | 失败/取消/特殊输入 | 反馈或零写断言 |
| --- | --- | --- |
| CLIP-15 | 出现 UNSUPPORTED_HTML 等错误 → 取消或修正 → 再次输入并保存 | 报错可恢复、已写入的合法草稿不被隐式遗失 |
| EDITOR-20 | 打开“复制外部 AI Prompt”→ 勾选知识点范围 → 展开模板 → 滚动阅读长 Prompt → 复制并关闭 | 桌面宽度足以阅读正文；高分屏/窄内容区不溢出，预览滚动、操作按钮与焦点可达；关闭后编辑内容无变化 |
| EDITOR-21 | 打开“粘贴卡片预览”→ 输入长结构化内容 → 解析预览 → 取消后重开并确认 | 大面积可滚动文本区、解析结果与固定操作按钮可达；取消零业务写入；确认遵循旧安全及草稿规则 |

通用五态：**未保存 → 处理中 → 真成功 → 可理解的失败/冲突 → 空结果/取消**。收集失败时必须分别记录用户所见、后台确认和重启后结果，不能只记录报错字符串。

## Work 按模块执行（测试优先，禁止边测边改生产代码）

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs show editor
node tools/validation/v077/run.mjs list --module editor --baseline
node tools/validation/v077/run.mjs run --module editor --baseline
# 以上会如实标记尚未编码的 CASE 为 NOT_RUN，退出码 2 不能算通过。
```

尚未实现的场景优先复用正式 Electron Playwright 公共驱动，按**功能模块**将脚本放在 `tools/validation/v077/scenarios/`，在唯一 `registry.mjs` 明确注册；不得用 API 直接代替按钮触发。原始失败报告位于 `validation-results/v077/runs/`，运行后用 `collect.mjs` 转入唯一 `DEFECT-INBOX.json`，待所有模块收集完再进入 I3/F4 统一修改。遇数据破坏风险立即停止该危险路径并保留证据。
