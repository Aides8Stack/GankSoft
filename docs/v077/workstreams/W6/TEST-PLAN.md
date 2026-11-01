# W6 — 定向测试方案

初始状态：全部 NOT_RUN。W1–W4 的历史 PASS 不计入 W6。

| CASE | 验收内容 | 证据要求 |
|---|---|---|
| W6-01 | question-v1 题干与选项同组；A/B/C/D 固定字母列，长文本仅在文字列换行 | Electron 900/1366/1600 DOM/截图，无横向溢出 |
| W6-02 | 答案与解析在同一内容区块；Markdown/媒体正常 | Electron 三宽与 Markdown/图片检查 |
| W6-03 | qa-v1/direct-v1 保留原语义，不出现单选布局 | 三模式组件/GUI断言 |
| W6-04 | 统计摘要、趋势、最近学习、完整历史集中在同一统计区块 | Electron 页面结构与历史交互 |
| W6-05 | 详情页修改关联不切换知识图谱；选择器预载真实已关联 ID | 点击路径与初始选择证据 |
| W6-06 | 新增/断开/保留集合保存后 getLinks 读回完全一致；revision 正确变化 | SQLite/协议读回及集合差异断言 |
| W6-07 | CAS 冲突、未知回执、取消/放弃、读取失败保留输入；知识节点不被删除，历史快照不变 | 故障注入、历史事件前后对比 |
| W6-08 | dataSync 刷新、返回/重启、窄宽度适配；无过期关系或旧统计 | Electron/新 PID/SQLite 一致性 |

## 执行边界

- 临时 Schema606 数据库，不访问真实用户数据库。
- 优先复用既有 `tests/unified-knowledge-v075.test.ts` 与 `tests/knowledge-picker-v077.test.ts`。
- 不重跑 B1–B5、W1–W4 或旧 250 全量。
- Windows CI/Win10/Win11/真实125%DPI未实际运行则 NOT_RUN。
