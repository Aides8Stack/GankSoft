# R0 验收 — IN_PROGRESS

| R0交付/退出项 | 状态 | 证据与边界 |
|---|---|---|
| 原型SHA与既有源码保留 | PASS | 哈希精确匹配；生产目录/锁文件未改，旧索引保留 |
| 完整脚本/CSS语法索引 | PASS | 3 scripts无解析诊断，AST/PostCSS机器清单；索引不代表行为 |
| overview/deck/editor/review/knowledge/settings映射 | PASS | 15组page-api-map，协议定义、handler/test引用、差异责任 |
| 每个动态状态/事件与具体生产用例逐项闭环 | NOT_RUN | 52个原型DOM状态已枚举；生产对应尚未完整核实 |
| CSS静态覆盖与实际computed来源 | PASS | 36个CDP匹配规则/计算样式/边界快照、重复源与迁移顺序 |
| 隔离Schema606真实合成夹具 | PASS | 5/242/53/18严格断言，真实FSRS/189学习事件、PRAGMA完整性 |
| production Electron与三宽基线采集 | PASS | 6页×3宽×2版=36PNG，18并排图；不是视觉一致PASS |
| 六页严格同状态/同语义全覆盖比较 | NOT_RUN | 原型固定示例、知识树与settings状态仍需闭环，补参考态不掩盖缺项 |
| 真实进程重启读取 | PASS | 卡片、知识树、草稿、暂停会话采样读回 |
| GitHub保存/远端核验 | PASS | 已有两个中途检查点；本文件最终保存须由当轮独立读回确认 |

环境BLOCKED已解除，阶段保持IN_PROGRESS，避免把未核验动态映射与语义对齐伪装完成。生产UI存在明确BLOCKER/MAJOR差异，属后续R1–R6实施责任，不用baseline截图替代修复。Windows与全量产品验收均未通过/未运行。
