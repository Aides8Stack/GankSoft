# W7 测试计划（三阶段）

所有测试使用隔离临时 Schema606 数据库。逐项记录 PASS/FAIL/BLOCKED/NOT_RUN、命令、环境、被测 SHA。W1–W6 历史 PASS 不自动继承为 W7 PASS。

## W7.1 后端核心与业务规则
| CASE | 场景 | 预期 |
|---|---|---|
| W7-01 | practice提交同一卡多次 | 每次独立事件，FSRS全字段不变 |
| W7-02 | scheduled提交 | 学习事件、schedule_event、scheduling同事务更新 |
| W7-03 | 五卡队列提交两卡后退出 | 两条事件永久保留，剩余三卡可恢复 |
| W7-04 | 第三卡提交失败 | 前两卡不回滚，第三卡无部分写入且草稿保留 |
| W7-05 | 同deck并发创建scheduled | 只有一个活动正式队列 |
| W7-06 | 不同deck创建scheduled | 各自成功 |
| W7-07 | 多个practice队列引用同一卡 | 全部创建、保存、恢复成功 |
| W7-08 | practice与scheduled并存 | 相互不阻挡 |
| W7-09 | 同requestId重试/新requestId | 同请求幂等，新请求创建新practice |
| W7-10 | due与relearn包含同一卡 | 正式队列仅出现一次 |
| W7-11 | 卡片内容/发布/知识点关联修改 | FSRS、cycleId、dueAt逐字段不变 |
| W7-12 | 活动会话后编辑卡片 | 旧冻结版本可完成提交，事件绑定旧versionId |
| W7-13 | 来源不明的旧未完成会话 | 全部按practice恢复，历史和草稿保留 |

## W7.2 UI 与 AI 数据链
| CASE | 场景 | 预期 |
|---|---|---|
| W7-14 | 概览无活动正式队列且有到期卡 | 固定显示开始正式复盘 |
| W7-15 | 概览已有活动正式队列 | 显示继续入口和进度 |
| W7-16 | 概览无到期卡 | 显示今日正式复习已完成，不创建空队列 |
| W7-17 | 手动/搜索/随机/专项入口 | 全部创建practice |
| W7-18 | 开始/恢复/切换失败 | 可见原因、状态和重试入口 |
| W7-19 | AI导出 | 包含practice+scheduled全部历史周期事件 |
| W7-20 | practice事件无schedule_event | 正常导出null，不丢事件 |
| W7-21 | 未提交草稿/队列 | 不作为已提交学习证据 |
| W7-22 | 新建/暂停/恢复/草稿后导入AI建议 | 指纹未变，仍可校验 |
| W7-23 | 学习事件/FSRS/内容/知识点关系变化 | 旧来源失效 |
| W7-24 | 统计分类 | 总学习、自主、正式、最近学习、最近正式复习分别准确 |

## W7.3 整体验收
| CASE | 场景 | 预期 |
|---|---|---|
| W7-25 | 正式 Electron 创建/恢复正式队列 | 每deck唯一，操作正常 |
| W7-26 | 正式 Electron 创建多个practice队列 | 同卡可重复，无占用提示 |
| W7-27 | 逐卡提交后关闭/重启 | 已提交事件和未完成进度一致 |
| W7-28 | FSRS与事件读回 | practice不改FSRS；scheduled正确更新 |
| W7-29 | 概览返回与即时统计刷新 | 数据一致 |
| W7-30 | W4导出/W5建议预览 | 全历史完整，来源有效性正确 |

## 执行要求
先运行当前阶段定向测试，再运行受影响的 W1/W2/W4/W5 交界测试。W7.3 执行 `npm test`、`npm run check:protocol`、`npm run build`、`npm run test:package` 及适用 Pipeline v4 门禁。真实 Electron/SQLite/重启验收必须有证据。Windows CI、Win10/Win11真机单独记录；未运行标记 NOT_RUN。

## W7.1 实际执行补充

用户指定的W7.1-01～18全部PASS，逐项映射见RESULTS；21组真实SQLite专项含新旧有效due、并发、旧606和回收边界。最终全量757/757、协议21/21、177方法、类型/边界/build通过。历史计划中的W7.2/3仍NOT_STARTED，未以本阶段Node结果替代Electron或Windows验收。
