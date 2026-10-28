# R5.d 验收 — DONE；R5 DONE

基线c保存3974b0ab5570c4c9245a55afd0e2f7e8c78f39e7。a/b证据继承；c功能与错误安全证据/evidence/c，不冒称重跑旧阶段。

| Gate | 实际结果 |
| --- | --- |
| 多根/九层图谱与文档大纲ID/路径一致 | PASS d/integration-final.json1 |
| 正文编辑/图谱大纲切换与图片原身份 | PASS 第2组 |
| 图片重新插入、原生undo/redo、引用计数和卡片/知识共享 | PASS 第3组，distinct placement、相同asset，原生历史；media-final卡片及集级查询4处 |
| 实际文件整树交换/深层局部挂载/策略 | PASS 第4–6组，16节点9层，路径/顺序/正文/图片SHA-width-title精确相等；重复导入keep零正文/版本修改 |
| 取消与错误安全 | PASS 第7组取消零写；最终media-final8组含二次取消、混合draft+node+file回执失败精确回滚、并发预览失效、未知原ID重试、不重复执行 |
| 回收/恢复图片无悬空 | PASS 第8组，回收节点正文引用变为保护；禁止物理删除，恢复后正文/assets/父级不变且引用状态刷新 |
| 正常退出/新Electron精确恢复 | PASS 第9组与media-final最后组，新PID；全树/正文/revision/层级/关联/图片/发布/非空历史/调度逐项精确 |
| 非当前发布版本保留引用 | PASS service-final2 8项，新版本删除引用后旧版本仍有引用，禁止物理删除并保留字节 |
| 构建/协议/模块回归 | PASS c/regression46、protocol21+151方法；d/build-final、service-final2 8；无关全量不重复 |
| 受影响三宽/冻结原型 | PASS 900/1366/1500的card-images、deck-images、knowledge-images9张正式PNG及DOM；原型media3张及DOM，逐张审阅。中文字体实际可读，横向溢出/正文容器边界断言 |
| Windows/IME/物理剪贴板/全应用严格视觉 | NOT_RUN（R7/R8），本轮仅Linux局部辅助验收 |

视觉适配：冻结resourcesDialog为演示卡片级弹窗/图标缩略、模拟refs。本实现按用户要求分离卡片details简洁入口与集级网格页，真实缩略图/格式/字节/引用详情/搜索/分页与明确二次确认；绿色/白色/圆角/现有导航系统继承。原型不能合法删除历史，本实现直接禁用不可变引用。真实最小像素放大为纯色块是合成字节本身，非占位图片；原图不修改。UUID仅做资源身份与搜索，不能假称用户文件名。正文大图片沿原生宽度与滚动，不为了截图裁正文；九层导航原有滚动范围继承B2，不在本轮重做。全应用像素一致性仍R7。

命令：`npm run validate:r5`先build，然后media-library.ts、r5-integration.ts、media-reference.ts；服务`npm run test:media-library`。本轮实际分步执行，命令输出及源码指纹见verification.json。d最终media8与integrated9在最后产品构建上完成，脚本新增输出目录/额外断言不改变生产行为。已有真实失败保留c目录。

限制与恢复：普通删除只对无持久引用资源；清除引用与资源只操作当前可变节点/草稿，任何已发布/历史/回收/未知保留引用均拒绝。引用识别保守，残留字面资源身份也可能被保护，必须先合法处理正文，不猜测删除。文件删除不在SQL事务内冒充回滚：事务保存退役标记与回执后才清理，IO失败保留文件并后续重试。没有提供历史资产强删或永久删除资源恢复功能；节点回收恢复已正式测试，退役资源不能被陈旧编辑器静默重新引用。

结论：R5.a/b/c/d全部DONE，R5 DONE。R6/7/8未进入。下一Work在新授权下读stages/R6已有详细计划；本轮保存核验后主动结束，不合并/发布/等CI。
