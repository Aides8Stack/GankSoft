# W6 当前状态：DONE（Linux定向范围，2026-11-01）

W6.1设计保持；本轮已授权并完成W6.2正式布局/关联接入与W6.3验收。八CASE全部PASS，19复用领域+2真实Vue组件+21协议检查PASS，类型/生产构建/正式Electron/SQLite/恢复epoch/独立PID/三宽PASS。冻结源码及测试远端`08f22fa973347e9d5cda61e569e5c29f6ab0d619`，tree`17948c793a9d201519ed898cb4dfa4e44f07f343`。详见[RESULTS.md](./RESULTS.md)。

生产只改详情Vue、局部cards.css和父页@knowledge；无新API/IPC/表。Windows CI/Win10/Win11/125%DPI均NOT_RUN。PR38保持Draft，本轮不构建Windows；下次须将既有便携入口旧W5固定SHA更新为W6冻结来源再单独构建。导入导出进度和后台导出仍为独立待办。

**以下为原方案及中间检查点历史，旧PLAN_ONLY/NOT_RUN仅反映当时授权，不再约束本轮已完成实施；原功能范围仍有效。**

---

# W6 — 测试计划（所有用例当前 NOT_RUN）

本文件是未来验收方案。W6 当前只完成设计与视觉原型归档；没有执行生产实现、测试、构建或 Electron 验收。W1–W4 的历史 PASS 不计入 W6。

## 1. 测试环境

- 临时 Schema606 数据库和合成卡片集；禁止访问真实用户数据库。
- Electron 正式生产构建，不以 Vue 原型或浏览器 mock 代替。
- 视口：900、1366、1600 CSS px；真实 Windows 125% DPI 另行记录。
- question-v1、qa-v1、direct-v1 三种模式均需合成数据。
- 关系测试至少准备旧关联 A/B/C 和待新增 D；历史事件需在修改前生成冻结知识快照。

## 2. 验收用例

| CASE | 场景 | 通过标准 | 状态 |
|---|---|---|---|
| W6-01 | question-v1 题干、材料和选项布局 | 题干在选项前；桌面选项两列；字母与文字首行并排起始；长文本只在文字列内换行；无横向溢出 | NOT_RUN |
| W6-02 | 正确答案与解析 | 同一内容容器；正确答案按 correctOptionId 定位；无效/缺失 ID 不猜答案；Markdown/媒体正常 | NOT_RUN |
| W6-03 | qa-v1/direct-v1 兼容 | QA 显示问题/答案/补充；direct 显示正文；不出现虚构选项或答案区；Markdown/媒体正常 | NOT_RUN |
| W6-04 | 学习统计与历史 | 摘要、趋势、最近三条、完整历史在同一区；缺失值不伪造为零；cursor 分页和单条历史详情正常 | NOT_RUN |
| W6-05 | 当前知识点关联展示 | get + tree 读回名称和完整父级路径；空关联、失效节点、读取中、读取失败分别显示 | NOT_RUN |
| W6-06 | 现有 KnowledgePicker 接入 | 修改关联打开现有 picker；预选真实 ID；确认仅暂存；取消不写库；详情页不跳转知识图谱；放弃修改恢复原集合 | NOT_RUN |
| W6-07 | 保存、读回和冲突 | set 使用 expectedRevision；读回精确验证新增/断开/保留；冲突保留暂存选择；未知回执不重复发送；断开关系不删除知识点 | NOT_RUN |
| W6-08 | 历史快照、刷新和响应式 | 当前关联修改前后历史快照完全一致；dataSync 刷新/返回/重开不丢数据；900/1366/1600 无溢出 | NOT_RUN |

## 3. 重点集合断言

旧集合 O={A,B,C}，用户新集合 N={A,C,D}：

- 新增：D 存在且已关联。
- 断开：B 不再关联，但知识点 B 本身仍存在。
- 保留：A、C 仍然关联。
- 最终 get 读回集合必须与 N 完全相等。
- 既有历史事件快照仍保留事件发生时的 A/B/C，不随当前关系变更。

## 4. 必须覆盖的异常路径

- knowledge.tree.read 失败或节点失效。
- picker 加载中取消、确认、重复打开、宿主卸载。
- cardLinks.set 的 REVISION_CONFLICT。
- command outcome unknown；依赖 services.invoke 已有 operation.status 原请求核验，不生成新 requestId 自动重发。
- set 成功但后续 get/tree 读回失败。
- dataSync 刷新与用户编辑/保存并发。
- DATA_EPOCH_CHANGED 和页面卸载期间的迟到响应。

## 5. 未来建议执行顺序

1. 定向 Node 测试：现有 picker 和 cardLinks 领域用例。
2. Vue 类型检查和生产构建。
3. 正式 Electron 生产包定向 smoke，验证 W6-01～W6-08。
4. 归档三宽截图、DOM/几何断言、SQLite 读回和历史快照对比。
5. 只对真实失败修复并重跑受影响用例，不重跑旧 250 条。

Windows CI、Win10/Win11、真实 125% DPI 未实际执行时保持 NOT_RUN。任何设计描述、原型截图、静态代码审阅都不能代替正式 Electron PASS。
