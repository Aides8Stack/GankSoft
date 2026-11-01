# GankSoft v0.7.7 — 复盘暂停遮罩与逐卡有效计时

> 需求来源：2026-11-01 用户明确提出；[#32](https://github.com/Aides8Stack/GankSoft/issues/32)；关联 [#30](https://github.com/Aides8Stack/GankSoft/issues/30)、[#31](https://github.com/Aides8Stack/GankSoft/issues/31)。**当前只做前端 API + Vue 可交互预览；正式 Electron 接入待用户确认。**

## 用户可见行为

1. 手动暂停、窗口失焦/切外部应用、浏览器页面隐藏、最小化或从复盘页切换到应用内其他页面时，自动暂停本题有效计时。
2. 若仍在复盘页，立即显示小型居中模态框「复盘已暂停」、暗色遮罩和唯一主按钮「继续复盘」。仅用户明确点击继续、既有会话 API 确认成功后解锁答题/计时；点击遮罩/ESC/重新获焦不得自动继续。
3. 内部离开复盘应先暂停再切页，**不能让遮罩覆盖其他业务页面**；回到相同会话时显示暂停框，必须再次点继续。
4. 暂停期间禁止改答案、揭示/评分、正式提交与切题；暂存中的输入保留。暂停请求/草稿保存请求冲突时继续通过一个已有会话写入队列及 CAS/回执处理，不静默丢提交。
5. 每张卡独立统计前台有效秒数（答题、查看解析、自评）；排除手动暂停/离开/失焦、进程关闭与重启后等待继续。多次继续累加，新题从0开始，本轮总用时累计。已完成的真实评分提交事件写原有 `native.elapsedSeconds`；未提交时由现有 `study_sessions.elapsedMs/totalMs/resumedAt` 保存。**不建第二套计时存储。**
6. #31 新规则保持：正常学习正式保存必须同时记录 `learning_review_events`、`schedule_events` 和 `scheduling`；失败/冲突要有明确反馈，不能只练习或跳过 FSRS。

## 遮罩覆盖范围（2026-11-01 用户最新确认，优先级最高）

**仅遮挡正在学习的复盘内容区域，不得以 document/body、整个 Electron 窗口或整个 `UnifiedWorkspace` 为遮罩根容器。** 暂停弹窗在右侧复盘内容区内居中，而**左侧窄图标导航栏、卡片集/目录侧栏和顶部全局导航栏/面包屑必须保持明亮、可点击、可键盘访问**。

- 把 Vue 暗层挂载在复盘内容区域内部的专用 `position:relative; isolation:isolate` 容器，暗层 `position:absolute; inset:0`，绝不对整个应用使用全屏 `position:fixed` 遮罩。
- 暂停时仅复盘正文、答题、评分、提交与切题操作不可操作，可用局部 `inert` 阻止背景内容键盘操作；**不能让全局导航变 inert**。由于全局导航仍可用，暂停对话框不得错误宣称整个应用是 `aria-modal=true`。
- 用户在暂停状态仍可点击左侧/顶部导航离开复盘；离开后的其他页面不显示暂停框；返回原会话时只在复盘内容区域内恢复遮罩，继续复盘需明确按钮。
- 页面尺寸在 900、1366、1600px 和 Windows 125% 缩放下确保右侧内容不超宽、不盖导航；内容纵向滚动时应将暗层固定在**复盘内容滚动视口**而非整个应用窗口。
- **示例 Vue 预览已调整并在 Chromium 三宽度验证：** 暗层始于顶部导航栏下沿、横向只覆盖右侧复盘内容，左/顶部导航通过真实点击成功离开与返回，会话仍暂停；冻结计时、0 JS error。正式 Electron 复盘仍未接入，不能标记生产 PASS。

## 先行 API

- `src/review/review-pause-controller.ts`：`createReviewPauseController({initial,transport,now?})` 返回 `pause(reason)`、`resume()`、`leave()`、`sync(session)`、`getState()`、`subscribe(listener)`、`dispose()`。
- `transport.change('pause'|'resume')` 在正式集成时要调用**已有** `UnifiedReviewForm.change()` 串行事务和 CAS/receipt，不能独立发另一个竞争的 IPC 写请求。失败使用已有 `learning.session.get` 校对；`getState().cardSeconds/totalSeconds` 仅作页面显示投影。
- `bindReviewAutoPause` 在复盘页有效期间绑定 window.blur、document.visibilitychange，移除组件时解绑；同页内部切换调用 `leave()`。
- Vue3 交互原型：[ReviewPausePreview.vue](../prototypes/review/ReviewPausePreview.vue) 挂载原隔离预览应用第四个标签，模拟三种卡、暂停、继续、失焦、切页、返回与单卡计时。离线 Vue HTML 可直接双击，模拟提交**不写真实 SQLite/FSRS**。

## 验收现状及后续

- `node --experimental-strip-types --test tests/v077-review-pause-controller.test.ts`：4/4 PASS（暂停计时冻结、重复触发幂等、路由返回不自动恢复、新卡归零/总用时、失败时维持遮罩）。
- 独立离线 Vue HTML：Chromium 实际点击暂停/继续/切页/返回，模态正确且0 JS 异常。**这不是正式 Electron 生产验收，也不包含 Windows10/11 或真实125%缩放。**
- 用户确认后方可将 API/Modal 接入正式 `UnifiedReviewForm.vue`，并为真实 GUI→IPC→SQLite→重启补测，避免 #30/#31 旧问题再出现。

**保持 Schema606、原 FSRS 和历史数据、不合并、不发布。**
