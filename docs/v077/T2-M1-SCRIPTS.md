# GankSoft v0.7.7 — T2-M1 模块GUI自动化场景实现检查点

> **状态：SCRIPT_IMPLEMENTED_NOT_EXECUTED**（2026-10-30）。这是场景源码开发记录，不是 Electron 功能验收报告。基于 `feature/v077`，当前宏阶段计划 `docs/v077/MERGED-5-STAGES.md`。

## 已补齐的模块处理器

| 业务分组 | 新增CASE数 | 文件 | 验收入口 |
| --- | ---: | --- | --- |
| ENV：启动、导航、窗口与离页保护 | 8 | `tools/validation/v077/scenarios/m1-app.mjs` | ENV-02～09 |
| CAT：文件夹、卡片集、管理与回收恢复 | 10 | `scenarios/m1-catalog.mjs` | CAT-01、CAT-03～11 |
| HOME：首页、卡片集概览和入口 | 8 | `scenarios/m1-home.mjs` | HOME-01～08 |
| NEW/OLD：新卡、旧卡、类型与草稿 | 11 | `scenarios/m1-cards.mjs` | NEW-04/06/07/08/10/11/15，OLD-04/05/12/13 |
| LIST：列表、筛选、详情、批量处理 | 10 | `scenarios/m1-list.mjs` | LIST-02～11 |
| **合计** | **47** | **5个模块驱动文件** | **全部 T2-M1 原 CASE** |

公共操作集中在 `scenarios/m1-support.mjs`，其涵盖正确的GUI目录创建、目录检索、系统回收、真实启动数据路径与空库夹具。既有 `helpers.mjs` 仅对 `executeCase` 增加可选 `fixtureFactory`，默认仍使用原 `b2Fixture`，不改变历史用例的默认行为。独立测试脚本 `tests/v077-m1-handler-coverage.test.ts` 审计47个CASE登记、缺失文件、未运行账本和源码解析。

每个CASE都通过现有 `executeCase` 启动正式Electron应用，真实 Playwright 点击/键盘操作，结合只读协议/SQLite与必要新PID重启判断。为了覆盖分页、三类型和跨卡片集情形，部分场景在**启动前的隔离夹具初始化阶段**通过正式模型写入合成资料；执行中不得借后台写入替代业务GUI动作。对于CAT-07等要求的目录搜索或其他当前UI可能不存在的入口，必须以实际运行的用户可见失败为准，不应人为放宽断言或冒充通过。

## 当前核验边界

- GitHub远端文件读回静态审计：**47/47 CASE映射；0缺失；0重复；6个新增场景/共享文件解析通过**。附加Node测试文件已保存但尚未在完整Node24工作树执行。
- 本轮无法在当前对话环境下载完整GitHub仓库并启动Electron（本地Node22，GitHub DNS不可用），所以**没有新用例实测PASS，也不声明脚本都能运行成功**；首次运行中如有选择器/前置条件问题，只可精准修测试设施，原有用户反馈断言不能降低。
- `docs/v077/E2E-RESULTS.json` **未修改**：72 PASS / 3 FAIL / 3 BLOCKED / 172 NOT_RUN；M1 47条仍NOT_RUN。生产 `src/`、`electron/`、`shared/`、数据库与依赖锁没有变更。
- 没有执行`npm ci`、`npm run build`，不新增CI结果或Windows签核。

## 下一轮 Work 最小执行入口

**GPT-6.1 Sol · Medium**；同一分支 `feature/v077`，以远端实际HEAD为准。遵守 `AGENTS.md`、`STANDARDS.md`。只读取本报告、`RECOVERY-NEXT.md`和当前失败相关测试源码，不重新整理历史250条。

```bash
node tools/validation/v077/environment.mjs status
node --experimental-strip-types --test tests/v077-m1-handler-coverage.test.ts
node tools/validation/v077/phase.mjs audit
node tools/validation/v077/phase.mjs list T2-M1
node tools/validation/v077/phase.mjs run T2-M1
```

先校验环境可复用，否则只在缓存失效时使用`environment.mjs prepare`。每次`run T2-M1`从一个内部检查点开始（M1-01～04），运行并审查失败后，使用既有 `collect.mjs` dry-run/write 和 `promote.mjs` 审核真实结果。每个有效检查点提交脚本、阶段报告和唯一测试账本，核验远端SHA；可继续下一检查点，额度不足立即保存退出。

**用户确认的流程保持不变：先收集，I3统一归类，F4才修改生产业务；不自动合并、发布或等待CI。**
