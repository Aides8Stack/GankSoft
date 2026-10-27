# R0 真实合成夹具与原型等效方案

实现：`tools/validation/r0/fixture.ts`，仅使用 `mkdtemp` 下新建 Schema606，通过 prepareFreshUnified、生产 restore-session/gateway、typed client 和真实服务建立数据；无直接业务 SQL 写入。SQL 仅用于 PRAGMA user_version/integrity_check/foreign_key_check 断言。不上传数据库。

- 冻结原型哈希先验；从其 decks/cards/state/knowledgeTrees 字面量读取标题、模式和富文本素材，VM 限时且无应用权限。
- 建立公务员考试/申论积累目录、5集、242张已发布卡、1张未发布草稿；question/recall/reading 映射 question/qa/direct。
- 各集总数86/54/47/32/23；未学习24/12/8/6/3。其余189张通过真实 open/save/reveal/submit/next 复盘，由真实FSRS排期。18条使用当日，其余使用前一天的测试时钟；从真实 dashboard 断言5/242/53/18。生产不注入显示数字，不修改FSRS。
- 言语理解28个真实知识节点，保留原型主树/正文及关联；原型显示知识总数与其实际小树并不自洽，补充节点为明确合成内容，不声称图谱完全相等。
- 一条暂停的真实会话；进程退出后由新的 production Electron 读取原数据目录，核验卡片、知识、草稿和会话。
- 时区在测试进程固定 Asia/Shanghai，日期/种子/实际读数记录 manifest；fixture服务时钟可控，生产Electron恢复系统时间。时钟跨日则严格计数断言可能失败，应重新生成夹具，不放宽断言。

A轨视觉：原型文件不改写，不修改DOM以掩盖差异。overview四指标、deck卡片/到期/知识数可直接等效；原型76%掌握度无真实定义、最近记录/固定演示正文与真实历史不同，逐项标 BUSINESS_ADAPTED/NOT_VERIFIED，不能用全图像素分数当验收。

B轨兼容：既有 fresh-production 与相关测试覆盖空库、分页、CAS、权限/跨集、重启。当前采集器不冒称覆盖所有空/错/取消态；这些必须关联既有用例并在后续阶段从UI重验。

失败演进保留：首次多传mode/title被strict input拒绝；未揭示提交被SESSION_STAGE_CONFLICT拒绝；提交反思未先保存被SESSION_DRAFT_CONFLICT拒绝；直接记忆揭示态改思路被ANSWER_FROZEN拒绝。均为夹具脚本错误；按真实状态机修正，未改生产协议、业务或断言。
