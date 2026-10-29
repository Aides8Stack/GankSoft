# 2026-10-28 R5.c DONE；直接继续R5.d

基线0b0fa99789833d695c4708d0fb168832d98cda1c，原分支/PR15 Draft→develop。R5.a/b有效证据继承。c新增统一媒体library list/impact/delete与独立卡片/集级UI，复用stage/draftImage、公开原生NodeSelection/insert与既有保存/CAS/协议事务/回执。支持同集卡片/知识点共享，跨集拒绝；完整性/快照校验同步，不改606/FSRS/历史。

服务7项（含父例）、编辑器/卡片草稿/知识媒体等受影响回归46/46、协议21及边界/类型/151方法导出、生产build PASS。正式Electron8组PASS（evidence/c/electron-attempt1.json）：卡片查看/定位/真正重新插入、引用查询/集级列表、已发布保护、二次取消零写、混合正文事务回滚、并发失效、明确清除4个共享放置、未知原请求保护及新PID精确读回。发布版本/非空历史/调度/其他图片保持。c六张三宽截图保留，d补原型对照/最终审阅。

删除设计：全部引用含非当前发布/历史/回收/草稿/知识与保守保留记录；不可变引用禁止物理删除。可变删除预览哈希+修订执行前重查；SQL和回执失败完全回滚；物理文件只在持久回执后清理，失败保留字节后续重试，清理前再次排查引用/文件别名。永久退役标记保留审计，不把文件删除当作可回滚SQL。卡片正文引用删除由原生编辑器操作；实际资源清理统一在集级模块。

原失败完整保留：build-attempt0模板pending类型、build-final类型修正；service0/1复现原用途/hash完整性缺口，service2脚本误把完整MediaRef传strict Placement；正式electron0复现“定位后重新插入替换选中图”，已最小修复为选区之后插入并原生历史。没有删弱断言。

本稳定检查点通过连接器保存核验后直接d，当前R5整体IN_PROGRESS，c DONE/d IN_PROGRESS；不进入R6，不等CI/合并/发布。下一入口R5/PLAN与本记录；当前SHA由Git历史和远端读回解析。


固定资源：tests/fixtures/ganksoft/media.ts（mediaVersion1，5种像素11/22/33/44/55；共享3处、单独草稿、不可变发布、孤立、跨集；复用9层16节点/真实学习事件）。cache丢失/consumed新隔离生成，数据库/租约不提交。命令见夹具README。
