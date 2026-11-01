# 文件夹与卡片集（catalog） — v0.7.7 真实 GUI 使用路径与反馈测试

> **未运行的测试不得写 PASS**。关联原 CASE 组：CAT；本模块的机器可读配置在 `tools/validation/v077/modules.mjs`。此文件只记录正常和异常路径的预期，不复制第二套结果账本。

## 正常使用主链

新建卡片集→改名→返回→重启→移入回收站→恢复。

**必须有的反馈：**成功/重名/取消/删除影响提示。

**必须读取的结果：**卡片集ID、名称、目录关系与计数一致。操作后必须验证页面同步、正常离开与返回；持久化写操作还需独立新 Electron PID 重启读回。

| CASE ID | 从用户可见页面触发的操作 | 必须看到/核验的结果 | 当前 Electron 状态 |
| --- | --- | --- | --- |
| CAT-02 | 新建卡片集 → 输入名称 → 保存 → 进入 | 卡片集可用、唯一 ID 和列表计数正确 | NOT_RUN |
| CAT-04 | 目录项重命名 → 离开 → 重开 | 新名称和关联卡片完整保留 | NOT_RUN |
| CAT-10 | 卡片集移入回收站 → 查看侧栏与首页 | 不再显示活动卡片集，历史/草稿在回收数据中受保护 | NOT_RUN |
| CAT-11 | 恢复卡片集 → 重开、再进入 | ID、卡片与知识关系正确恢复 | NOT_RUN |

## 异常、取消与用户反馈

| CASE ID | 失败/取消/特殊输入 | 反馈或零写断言 |
| --- | --- | --- |
| CAT-03 | 新建同名/空名/非法名字 → 提示 → 取消 | 有意义的校验、不产生孤儿项或暗中覆盖 |
| CAT-08 | 打开编辑目录弹窗 → 修改但点取消/关闭 | 旧名称及层级未修改 |

通用五态：**未保存 → 处理中 → 真成功 → 可理解的失败/冲突 → 空结果/取消**。收集失败时必须分别记录用户所见、后台确认和重启后结果，不能只记录报错字符串。

## Work 按模块执行（测试优先，禁止边测边改生产代码）

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node tools/validation/v077/module-plan.mjs show catalog
node tools/validation/v077/run.mjs list --module catalog --baseline
node tools/validation/v077/run.mjs run --module catalog --baseline
# 以上会如实标记尚未编码的 CASE 为 NOT_RUN，退出码 2 不能算通过。
```

尚未实现的场景优先复用正式 Electron Playwright 公共驱动，按**功能模块**将脚本放在 `tools/validation/v077/scenarios/`，在唯一 `registry.mjs` 明确注册；不得用 API 直接代替按钮触发。原始失败报告位于 `validation-results/v077/runs/`，运行后用 `collect.mjs` 转入唯一 `DEFECT-INBOX.json`，待所有模块收集完再进入 I3/F4 统一修改。遇数据破坏风险立即停止该危险路径并保留证据。
