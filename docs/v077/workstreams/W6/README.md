# W6 正式实施进度（2026-11-01，当前）

用户已授权W6.2→W6.3，覆盖下方旧PLAN_ONLY限制。检查点一布局已保存远端d42751a2b8d7374040bcdd34fff8805428c4cdda，类型PASS。检查点二：现有Picker暂存/差异/保存、CAS、原请求回执核验、精确get+tree读回、epoch清理及并发保护已接入；类型PASS，实际W6八CASE待检查点三执行，均NOT_RUN。生产仅改详情Vue、局部cards.css、移除父页@knowledge；无API/IPC/表/全局状态新增。PR38保持Draft，本轮不构建Windows、不改版本、不合并发布。旧方案和误实施记录保留在下方作历史。

---

# GankSoft v0.7.7 — W6 卡片详情紧凑布局与知识点关联管理

**状态：PLAN_READY（仅方案，不含生产实现）**

- Issue：#37
- 分支：feature/v077
- 数据模型：Schema606
- 设计参考基线：b980a2aa0db44c589d25defd08ba64d745aad3f1
- W6.1 需求、设计与 Vue 视觉原型：DONE
- W6.2 正式实现：PLANNED_NOT_STARTED
- W6.3 测试计划：DONE；实际测试 NOT_RUN

## 阅读顺序

1. DESIGN.md：需求、页面信息架构、既有组件/API/数据合同。
2. IMPLEMENTATION.md：未来获准实施时的文件清单、依赖顺序和分阶段计划。
3. TEST-PLAN.md：未来实施后的测试矩阵、环境、验收标准。
4. RESULTS.md：当前真实状态和未执行项。

Vue 视觉原型：docs/v077/prototypes/card-detail/W6CardDetailPreview.vue。它是隔离展示样例，使用演示数据，不连接生产数据库、不调用真实 API，不代表正式功能。

## 本轮授权边界

只整理和保存方案文档。不得编写/修改生产实现代码，不执行测试或构建，不合并 PR，不发布。PR #38 保持 Draft。

## 重要约束

- 复用已存在的 KnowledgePicker 和知识点关联 API，不重新开发。
- 不新增 IPC/API/SQLite 表，不改 Schema606、FSRS、学习事件或统计口径。
- 不重做 W1–W4、B1–B5，不重跑旧 250 条用例。
- 所有未来测试在获得独立实施授权后执行；未执行项目一律 NOT_RUN。
