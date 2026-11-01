# W6 — 定向测试方案

初始结果全部 NOT_RUN；W1–W4 历史 PASS 不计入 W6。

| CASE | 验收内容 | 自动化证据 |
|---|---|---|
| W6-01 | question-v1 题干与选项同组；固定字母列，长文本在文字列内换行 | `tests/w6-card-detail-v077.test.ts` + Electron smoke |
| W6-02 | 正确答案与解析同组；Markdown/媒体仍正常 | 静态合同 + Electron smoke |
| W6-03 | qa-v1/direct-v1 保留各自语义，不出现单选选项 | Vue合同 + Electron smoke |
| W6-04 | 摘要、趋势、最近学习、完整历史同属统计区 | Vue合同 + Electron smoke |
| W6-05 | 详情页打开现有 KnowledgePicker，不切换知识图谱 | Electron smoke 验证详情仍可见 |
| W6-06 | 新增/断开/保留关系保存后 get 读回一致，重启仍一致 | Schema606 领域测试 + Electron smoke |
| W6-07 | CAS 冲突、未知回执、取消/放弃保留输入；知识节点不删除，历史快照不变 | 领域测试 + Electron smoke |
| W6-08 | 900/1366/1600 无横向溢出；刷新/返回/新 PID 读回一致 | Electron smoke + 三宽截图 |

## 执行命令

- `node --experimental-strip-types --test tests/w6-card-detail-v077.test.ts`
- `npm run check:protocol`
- `npm run build`
- `node tools/validation/package-check.mjs`（运行 W6 正式 Electron smoke）

Windows CI/Win10/Win11/真实125%DPI未实际执行则 NOT_RUN。不得把静态合同测试或 Vue 原型预览冒充 Electron GUI PASS。
