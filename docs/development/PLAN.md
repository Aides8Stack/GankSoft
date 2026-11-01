# W7.1 后端核心与业务规则

状态：IN_PROGRESS。分支 feature/w7-review-lifecycle，起点5c047d201f6df95e398a52613b00aa5352629788，基线d1aeb186c96a5d733ac7dec0c461b494aeac5558，Issue #39。

A：复现占用和强制调度；协议持久化practice/scheduled；BEGIN IMMEDIATE事务内按deck查找或创建正式队列，复用现有queue候选与预算；取消跨队列排除；冻结全队列版本；逐卡事务及内容/调度隔离。

B：真实SQLite 18 CASE、W1/W2领域回归、协议、npm run check及build；审diff与兼容性，更新报告，连接器按真实parent/tree/lease保存并独立读回。

只改本阶段后端/协议及必要的数据兼容边界；不改Vue、W4/W5、版本、Schema606，不合并发布，不进入W7.2/3。历史W1–W6验收保持归档。
