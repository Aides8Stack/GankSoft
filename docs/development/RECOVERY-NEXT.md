# 恢复入口：S8.a typed API与预览/确认UI

## S8.a 受控恢复服务检查点（2026-10-26）

已实现同一owner/control租约内的完整恢复服务：确认绑定preview/hash/epoch/revision/全库替换及604转换；冻结旧连接与SQLite写锁，先制作并复验当前全库恢复点，再stage候选/媒体/历史、落盘并以唯一active.json提交。新generation不创建第二控制域，旧目录保留拒写，新epoch拒绝旧窗口。操作回执位于control而非被替换的DB；提交前失败原库保持不变，提交后响应丢失只返回已提交状态，不覆盖重试；新目录损坏/缺失禁止回退。604转换只在已授权隔离606 owner候选进行，生产604和旧公开恢复入口未改。

tests/full-restore-v075.test.ts20/20 PASS（7个真实子进程中断点、提交前ENOSPC注入、响应丢失、当前恢复点重建比对、全表/媒体事实一致、连续恢复和旧回执、候选媒体破坏）；原迁移30+备份预检4相关回归PASS，npm run build/协议边界PASS。首次回归暴露未激活目录的错误码顺序变化，已修正后原断言全部通过。未删除/跳过/放宽测试。Windows本轮尚未复验，真实Win10/11仍NOT_RUN。

首个未完成：S8.a公开typed API/预览与确认UI/成功后重开连接/状态查询与取消。服务已实现不代表T38全流程DONE。随后T39外库独立追加、T40目录迁移、T41回收站、T42全阶段故障验收；S8 IN_PROGRESS，S9 NOT_STARTED。Windows列拖拽仍FAIL待诊断；诊断检查点1f6fee6f7786cf59025316070c337193914e5f27已完整取回比对，首次查询无Run，不等待。本提交自身SHA/CI从Git和GitHub实时解析。

唯一仓库Aides8Stack/GankSoft，分支feature/v075-unified-learning-workspace，原Draft PR13→develop。继续原工作区，不clone/init/新分支/PR，不reset/强推/自动trusted审批/合并/发布。S7视觉准入DONE：原34张Windows逐图审阅发现3处缺陷，581e6a7修复后CI40205235936全PASS并逐图复核10张受影响图。证据S7-VISUAL-REVIEW.json与S7-ACCEPTANCE.json，继承S0–S7，不重做。9b1b16e完整776文件已核验；CI40207324786的Ubuntu/scope PASS，Windows/pr-gate FAIL，真实失败是完整编辑器列拖拽指示线5秒超时。离线资源PASS，ERR_INTERNET_DISCONNECTED是预期控制。现有日志无法区分坐标与事件时序，相同1008×681长页Linux探针通过未复现；新增释放鼠标/截图前几何诊断，不冒充已修复，不扩大或放宽门禁。

受控恢复代码在electron/infrastructure/migrations/coordinator.ts，新增owner.restore及readRestoreStatus；备份preview新增stageTo只从私有捕获ZIP解包。确认DTO在shared/storage/full-backup.ts。恢复前写租约由原openUnifiedOwner持有，不能在旧owner未关时打开第二owner；成功后调用方必须关闭已退役连接再按同control重开并建立新协议host，不能在旧DB内写恢复成功回执。异常RESTORE_COMMITTED视为已提交并查询control回执；其他未决状态先recoverUnifiedMigration，不直接打开旧路径。active.json是唯一提交点，restore-pending只索引恢复日志，不是第二个活动路径。

服务验证已经完成，不因接UI重跑S0–S7全量。窗口CI缺陷保持独立未解决记录；T38仍NOT_RUN整体（服务部分PASS），T39–T42后续及S9人工项按S8-ACCEPTANCE.json。上传前检查敏感信息，每个独立功能及时保存全部源码、测试、配置和摘要，独立fetch核对完整文件树。CI只首次记录，不等待/轮询。额度或连接不足先保存，无法推送则完整Git历史/源码备份并独立恢复验证。
