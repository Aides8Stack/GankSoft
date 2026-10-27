# 本轮R0：知识只读写入修复，阶段仍 IN_PROGRESS

起始远端b3ba983bf16d78391c40dab7f9eaf40a71b71eca，父08893a4eb328bcc72589c4da8e8a8bb65f922870；同一历史未覆盖。隔离12节点五场景中修复前C/E发生无用户编辑的revision/hash/正文变化；确认Milkdown新旧序列化字符串相同却通知changed，后续dirty/flush提交CAS。已针对无变化回调作最小修复，未改Schema606/FSRS。

诊断构建A–E修复后5/5 PASS，真实编辑保存、导出预览无写和关闭重启读回PASS；不含诊断注入的生产构建重跑原18场景18/18 PASS；关联24项编辑器/知识/Markdown测试24/24 PASS。完整命令、前后原始字节/修订/hash与调用堆栈见stages/R0/evidence/readonly-matrix。新旧生产源码指纹不同，旧截图及测试只保留为历史证据，不声称本轮重新通过。Windows、全量视觉及所有剩余状态NOT_RUN；R0 IN_PROGRESS，R1/R2 NOT_STARTED。

下一轮先审查新修复对其他编辑/媒体路径及R0剩余动态状态的影响，按实际代码变更补必要回归，再完成同语义视觉基线和阶段Gate。起始b3ba983的pr-trust仍failure/run40480180171，需要所有者对相应完整SHA独立审核；不自批、不改门禁、不合并不发布。当前检查点自身SHA由Git历史解析。

---

# R0 恢复与剩余任务

本轮已核验源映射52行、复盘/知识/设置语义，并以18个小型实际场景补证。保留旧索引、依赖、59项有效测试及42图，未扩大生产UI改造。

1. 下一轮从真实知识只读写入失败恢复：用完整12节点/选择/大纲/MD预览路径追踪editor初始化、markdownUpdated、dirty、flush和CAS，比较缩小3节点未复现路径。不要直接假定简单规范化就是唯一根因。
2. 最小修复前明确公开组件API与持久化边界；保留tree/revision/hash和正文严格断言。修复后重跑失败及受影响编辑器/知识专项，必要才扩大回归。不得删断言、改Schema/FSRS或重拍图掩盖失败。
3. STATE-SEMANTIC-MAP中24条本轮动态NOT_RUN分别补具体证据，已有display/API证据可继承；MISSING条目由对应R3-R6责任实现，不可伪造入口。
4. 知识精确12节点和规模28节点分轨；复盘answer/reveal/真实result分别取状态，原型result枚举别名不是可达事件；设置general/about缺失留明确责任，operations/ai不删除。
5. 所有R0退出条件满足才DONE并允许R1。当前R0 IN_PROGRESS，R1/R2 NOT_STARTED；本轮保存核验后退出。
