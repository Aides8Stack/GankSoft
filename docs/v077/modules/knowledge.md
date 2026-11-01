# 知识图谱与Markdown（knowledge） — v0.7.7 真实 GUI 使用路径与反馈测试

> **未运行的测试不得写 PASS**。关联原 CASE 组：KNOW、MD；本模块的机器可读配置在 `tools/validation/v077/modules.mjs`。此文件只记录正常和异常路径的预期，不复制第二套结果账本。

## 正常使用主链

创建知识点→关联卡片→编辑Markdown→保存→重启。

**必须有的反馈：**节点保存/正文保存/取消不写/关联错误提示。

**必须读取的结果：**节点关系、Markdown正文、知识关联精确。操作后必须验证页面同步、正常离开与返回；持久化写操作还需独立新 Electron PID 重启读回。

| CASE ID | 从用户可见页面触发的操作 | 必须看到/核验的结果 | 当前 Electron 状态 |
| --- | --- | --- | --- |
| KNOW-02 | 新建根知识点 → 保存 → 刷新 | 节点名称、ID、层级持续存在 | NOT_RUN |
| KNOW-11 | 一张卡关联多个知识点 → 复盘 → 返回知识图谱 | 双向卡片引用、统计不重复 | NOT_RUN |
| MD-01 | 打开某知识点 Markdown 正文 → 输入文本 → 自动/手动保存 → 重启 | 正文精确读回，版本/修订正确 | NOT_RUN |

## 异常、取消与用户反馈

| CASE ID | 失败/取消/特殊输入 | 反馈或零写断言 |
| --- | --- | --- |
| KNOW-12 | 删除知识点子树 → 回收站 → 恢复 | 整棵子树、ID、父子关系和卡片关联恢复 |
| MD-07 | Markdown 导入预览 → 取消 | 无新增节点和写入 |

通用五态：**未保存 → 处理中 → 真成功 → 可理解的失败/冲突 → 空结果/取消**。收集失败时必须分别记录用户所见、后台确认和重启后结果，不能只记录报错字符串。

## Work 按模块执行（测试优先，禁止边测边改生产代码）

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs show knowledge
node tools/validation/v077/run.mjs list --module knowledge --baseline
node tools/validation/v077/run.mjs run --module knowledge --baseline
# 以上会如实标记尚未编码的 CASE 为 NOT_RUN，退出码 2 不能算通过。
```

尚未实现的场景优先复用正式 Electron Playwright 公共驱动，按**功能模块**将脚本放在 `tools/validation/v077/scenarios/`，在唯一 `registry.mjs` 明确注册；不得用 API 直接代替按钮触发。原始失败报告位于 `validation-results/v077/runs/`，运行后用 `collect.mjs` 转入唯一 `DEFECT-INBOX.json`，待所有模块收集完再进入 I3/F4 统一修改。遇数据破坏风险立即停止该危险路径并保留证据。
