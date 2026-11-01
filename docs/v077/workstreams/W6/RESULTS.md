# W6 最终结果（2026-11-01）

**W6.2 DONE；W6.3 DONE（约定Linux定向验收）。8 PASS / 0 FAIL / 0 BLOCKED / 0 NOT_RUN。**

用户本轮已明确授权W6.2→W6.3，覆盖旧PLAN_ONLY；原设计历史保留在README/IMPLEMENTATION/DESIGN/TEST-PLAN下方。PR #38保持Draft；Issue #37更新进展，不关闭Windows未验项。

| CASE | 结果 | 实际覆盖 |
|---|---|---|
| W6-01 | PASS | 900/1366/1600真实窗口，材料/题干顺序、两列/单列、首行对齐、换行、无溢出 |
| W6-02 | PASS | 按实际optionId定位B，解析/表格/公式/图片；缺答案兜底由真实编译Vue组件专项覆盖 |
| W6-03 | PASS | QA问题/答案/补充；Direct正文；媒体正常，无虚构选择题区域 |
| W6-04 | PASS | 统一统计/最近三条，完整历史默认折叠，cursor20→23，当时答案/评分/反思/快照；缺失统计不补零 |
| W6-05 | PASS | 完整父级路径，空关联、失效节点、加载中、关系及树读取失败/恢复 |
| W6-06 | PASS | 复用Picker预选/子树；确认只暂存；取消及放弃零set/SQLite零变更；A/B/C→A/C/D |
| W6-07 | PASS | expectedRevision真实冲突；拒绝/未知回执/读回失败；原requestId状态核验，未知请求仅一次set |
| W6-08 | PASS | 历史/FSRS/树逐行哈希一致，迟到响应/刷新/返回，真实恢复新epoch，独立PID重启/SQLite及三宽 |

## 正式实现与边界

仅三个生产文件改变：`src/unified/UnifiedCardDetail.vue`、`src/unified/v37/pages/cards.css`、`src/unified/UnifiedWorkspace.vue`。标题/来源/返回/编辑及复盘/调度入口保留；明确三种卡片模式，合并答案解析与学习统计。选项按原顺序，900px单列，1366/1600px双列；短选项不随同行长内容拉高。

直接复用现有`useKnowledgePicker().open()`、`knowledge.cardLinks.get/set`、`knowledge.tree.read`。暂存集合与持久关系分开，显示新增/断开/保留，显式保存与放弃；set携带CAS令牌，成功后get+tree精确集合验证。未知回执使用原请求`operation.status`，未核验前禁止新写入；成功但读回失败不冒充验证成功。冲突自动尝试刷新基线，保留暂存，需用户再次读取/核对及保存；epoch清理、组件卸载和迟到响应有代际保护。

无API/IPC/表/全局状态/版本/CI变更，无FSRS/调度/掌握度口径变更。W1–W5及B1–B5生产代码与证据未修改；未重跑旧250条。独立待办：**导入导出进度标志、支持后台导出**；Issue #36不实施。

## 实测与来源

- 复用`tests/knowledge-picker-v077.test.ts`及`tests/unified-knowledge-v075.test.ts`：19 PASS。
- 新`tests/w6-card-detail-v077.test.ts`：2 PASS，编译并挂载真实SFC，验证缺答案不猜测、缺统计不补零；不复制后端领域测试。
- `npm run check:protocol`：21 PASS，边界、协议类型、177方法导出成功。导出命令生成的继承文档差异未纳入W6，保留原文件，未修改协议。
- `npm run build`：Vue类型/后端类型/生产构建PASS；最终选项CSS小改后仅`vite build`更新renderer，未重新安装依赖；Electron后端复用同字节构建。
- 正式`dist`/`dist-electron`，临时Schema606库，1个隔离Worker，8 CASE/全部检查PASS，renderer error=0。使用真实Vue点击，API只用于合成准备/并发写者/只读断言；故障包装仅在测试主进程启用。
- 独立PID 20→99，23条学习事件；SQLite integrity=ok、foreign_key_check空。旧/新关系精确集合、B节点仍存在、事件知识快照A/B/C保留。`learning_review_events/schedule_events/scheduling/learning_cards/learning_content_versions/knowledge`整行前后SHA256一致。
- 真实备份恢复产生不同epoch；从详情返回、重新进入及新PID均读回一致。系统对话框选择只在测试注入，不是Windows物理操作。
- 已补齐Linux测试字体Noto Sans CJK SC；三张最终截图均人工检查为本项目原创合成页面。不是Windows字体/125%DPI签核。

冻结生产/测试远端：`08f22fa973347e9d5cda61e569e5c29f6ab0d619`，tree `17948c793a9d201519ed898cb4dfa4e44f07f343`。实测本地`4db823a70a146eef081cebf80db1712957c5c5c1`，与远端**完全同tree**；文件及构建指纹见`evidence/SOURCE-IDENTITY.json`。最终证据提交由本文件Git历史/branch ref解析，避免自引用SHA。

## 失败记录与复验

前期夹具/驱动失败均保留原日志`evidence/attempts/01.txt`～`11.txt`及SUMMARY.json：媒体用途、会话草稿字段、编辑器隐藏table/img节点、非法缺答案wire注入、历史知识点顺序、故障回包缺fieldErrors。均为TEST_INFRA，未据此修改后端或削弱业务断言。最终冻结源码和脚本一次完整执行8 PASS，原始输出`evidence/electron.txt`，结构结果`evidence/RESULTS.json`；2项真实Vue兜底测试另存`ui-component.txt`。

## 未验与下一步

Windows CI、真实Windows10/11、物理剪贴板/IME/原生对话框、125%DPI：**NOT_RUN**；本轮没有触发新便携包。现有入口`.github/workflows/v077-portable-test.yml`当前固定旧W5源码`49384668bbfbbef0926bb4f85be9cafc1374dd79`，**直接重跑不会包含W6**。下一轮按独立构建授权，将既有入口的SOURCE_SHA及checkout ref一起锁定上述W6冻结源码（或最终证据提交，生产字节相同），核验门禁不变后仅构建一次win64便携ZIP；不新建流水线、不修改安全门禁。

所有检查点完成后结束；不新PR、不将PR38转Ready、不合并develop/main、不强推、不发布、不等待CI。
