# B2 草稿箱、统一返回与弹窗 — 2026-10-31

B2.1 IN_PROGRESS（实现、领域4/4与Vue类型PASS；GUI待B2.3）；B2.2/B2.3 NOT_STARTED。仅B2，不进入B3。

基线 ad9af933199e8f2ba45409d9f33e797472900dbd；Schema606，无新表/服务/IPC通道。旧250测试总账不改。

新增最小命令 `draft.discard`：当前deck/card/正式修订/草稿修订+明确确认；同现有gateway事务和幂等回执，失败回滚，原请求可重试/重启核对。新卡删除settings中的草稿封套，不建正式空壳；已发布卡仅删除learning_card_drafts，不触碰正式内容、历史、周期、FSRS、知识/图片引用。删除释放草稿文档引用，图片资产保留现有资源库、无引用时由原媒体API管理，避免误删跨卡/历史共享资源。未知结果禁止离开，重复核对原requestId。

`UnifiedWorkspace → UnifiedDraftInbox → unifiedDrafts.listSummary/get/discard`；搜索与分页在原listSummary扩展query；旧封套/裸payload与旧自动草稿仍沿原读路径。没有重写B1 save/publish。

命令：`node --experimental-strip-types --test tests/draft-inbox-v077.test.ts`（4 PASS）；`vue-tsc --noEmit` PASS。首次3个失败为新discard实现向strict DraftScope传递了多余键，已修复，失败记录待最终归档。

Windows CI/Win10/Win11 NOT_RUN。当前为检查点1，本轮继续检查点2/3后保存结束。

## 检查点2

来源栈 `src/unified/source-navigation.ts` 只记录page/deck/card/event/session/scroll，不写数据库；卡片列表与筛选继续复用lastLists/plannerStates，草稿查询/已加载分页由InboxState保留。删除后来源无效回退列表。系统/详情旧专用来源状态删除，避免平行状态机；返回复盘重新读session。

CardDraftController新增leave三选动作，仍复用原flush/close；CardDraftForm唯一dialog、顶部返回/底部取消/切页/窗口beforeunload共享close。保存失败、未知、组合输入/进行中均不可静默离开；放弃不删已有草稿。取消Esc恢复焦点。

3项导航/离开单元PASS，Vue类型PASS。Prompt/粘贴保留原解析/安全逻辑，已有大窗保留并按规范约束860/920px、700px/88vh；配置、标题、操作固定，中间内部滚动。实际Electron/三宽/DPI尚待检查点3。
