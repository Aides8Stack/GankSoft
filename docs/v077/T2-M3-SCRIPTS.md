# GankSoft v0.7.7 — T2-M3 自动化脚本补齐检查点

**状态：SCRIPT_IMPLEMENTED_NOT_EXECUTED**，不能解读为功能测试 PASS。日期：2026-10-30。

## 一、47个原始CASE全部按模块编写与注册

| 内部组 | 场景 | 数量 | 可执行脚本文件 |
| --- | --- | ---: | --- |
| M3-01 | PLAN-01～12：筛选、知识点、时间、随机队列、三类型学习、调度设置、预览/重算撤销 | 12 | `tools/validation/v077/scenarios/m3-planner.mjs` |
| M3-02 | REVIEW-06/07/08/09/12/13/14/15/16：FSRS 0–100边界、计时/恢复、未提交笔记、练习、历史 | 9 | `scenarios/m3-review.mjs` |
| M3-03 | KNOW-01/03/04/05/06/07/08/09/10/13/14/15：知识图谱节点、父子层级、关联与取消、缩放/三宽 | 12 | `scenarios/m3-knowledge.mjs` |
| M3-04 | MD-02/03/04/05/06/08/09/10/11：Markdown正文/大纲、图片、导出真实文件、导入、冲突、安全 | 9 | `scenarios/m3-markdown.mjs` |
| M3-05 | AN-02/03/04/05/08：统计日期、得分/耗时趋势、知识点去重、卡片类型切换后历史 | 5 | `scenarios/m3-analytics.mjs` |
| **总计** | **T2-M3全部47个唯一CASE** | **47** | **五个模块驱动** |

复用 `scenarios/m3-support.mjs`，其提供GUI导航、三模式夹具、学习队列、ReviewEvent提交、真实知识节点/Markdown交换、只读历史查询、必要的Electron重启；业务操作通过 `executeCase` + Playwright操作正式界面，不允许仅用直接写数据库/API替代用户操作。合成测试前置条件由隔离Schema606的fixtureSetup创建，不触碰用户真实数据。

现有 `registry.mjs` 已准确登记47/47；增加 `tests/v077-m3-handler-coverage.test.ts` 验证精确CASE覆盖、分组12/9/12/9/5、真实GUI入口、主要数据断言及运行前账本不可变。

## 二、反馈检查与安全约束

- **PLAN**：用户操作前后的队列与筛选一致；读回日期、知识点、卡片类型；全局与单卡排期分离；预览/取消无写入，确认/撤销不延后已到期计划。
- **REVIEW**：八个边界评分 **0,59,60,74,75,89,90,100** 对应 Again/Hard/Good/Easy；草稿、暂停、独立思路/错因/漏洞/反思，练习不改FSRS、事件唯一身份和重启后的证据。
- **KNOW**：节点名称/ID/父节点与卡片关联精确验证；取消移动删除不得形成环或孤儿；图谱操作、全屏与900/1366/1500宽度有GUI可达性断言。
- **MD**：正文结构和实际图片宽度、正式导出预览与系统剪贴板和本地MD字节、导入确认/取消/冲突策略、危险外链/HTML、保存未知回执及恢复。
- **AN**：7/30/全部/自定义日期，趋势点与真实ReviewEvent ID，正确的耗时和得分，跨模式历史不可丢、知识掌握按卡片去重。所需IPC/SQLite仅做读回。
- 各测试用例通过 `observe(ctx)` 提取实时用户可见反馈，`evidence(ctx)` 输出失败诊断/截图/读库摘要和必要新PID验证。**截图和完整日志不嵌入模型上下文**，分析FAIL/BLOCKED摘要即可。
- 未运行可能存在实际UI选择器、异步时序、测试夹具前置条件等 **TEST_INFRA** 问题，也可能真实发现 **PRODUCT_FAILURE**；不得因此放宽核心业务断言。Windows物理剪贴板/Win10+Win11仍属M5，不在M3冒名签核。

## 三、保存核验与真实执行边界

GitHub独立读回静态审计：47 CASE全部注册，零遗漏/零重复、全部CASE对应非空实际脚本分支；六个M3共享/场景源文件V8静态语法可解析。已保存覆盖测试但**未在Node24完整树中实际运行单元检查，也未运行Electron GUI**。正式质量结果不能因写好脚本变动。

唯一 `docs/v077/E2E-RESULTS.json` 保留 **72 PASS / 3 FAIL / 3 BLOCKED / 172 NOT_RUN**。M3这47条仍全部NOT_RUN。生产 `src/`、`electron/`、`shared/`、数据库和包锁均未修改；不需为此次脚本提交重建、运行CI或发布。

总体脚本进度：M1 47 + M2 29 + M3 47 = **123条新增未运行脚本处理器**。所有已注册处理器 **198/250**（包括前75条已存在处理器）；原172条未运行中仅M4 40与M5 9 = **49条仍未编写**。

## 四、下轮最小继续入口

建议 GPT-6.1 Sol · Medium。若用户选择执行M3而非继续补M4，完整Node24/正式Electron环境中的最小指令：

```bash
node tools/validation/v077/environment.mjs status
node --experimental-strip-types --test tests/v077-m3-handler-coverage.test.ts
node tools/validation/v077/phase.mjs audit
node tools/validation/v077/phase.mjs list T2-M3
node tools/validation/v077/phase.mjs run T2-M3
```

`phase.mjs run`每次执行一个尚未完成的内部检查点，先核实环境有效且GUI场景已注册，GUI脚本的实际首次运行失败要区分 TEST_INFRA/PRODUCT_FAILURE；脚本修正先正常提交GitHub再按精确SHA运行。按 `collect.mjs` dry-run/write、`promote.mjs` 真实证据晋升CASE，持续更新阶段报告/缺陷收集/恢复文件，独立核验远端SHA，额度不足立即保存后停止。此前M1/M2也未在真实Electron执行，不能把三大阶段的脚本完成解读为业务测试DONE。

本轮未修改生产代码、不合并、不发布、不等待CI。下一脚本开发阶段按原规划为 **T2-M4 40条**，最后T2-M5 9条Windows专项。
