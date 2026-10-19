# GankSoft 自适应复习 v2.1 — 分级参数配置完整设计

> 文档状态：**待实现的产品与工程设计规范**（不是已完成的功能）。编写日期：2026-10-18。
> 目标基线：GankSoft v0.7.1 RC2；源 ZIP SHA-256 `8276ad0855915b8c761f4914e103d2fe1138f315382a0c2a3853cd46e6255391`。
> 本文是 `04-v2基线文档/GankSoft-v0.7.1-adaptive-review-v2-design.md` 的**参数体系正式增补**。两者必须共同阅读；如涉及 UI/参数生效语义，以本文更具体的规定为准；不得据此推断 v2 已写入源码。

## 0. 决策速览与必须保护的约束

- **使用者能控制**：每张卡片及每个卡片集的最大复习间隔、每卡片集每日到期数、题目用时目标；未来可控制卡片集目标保持率、正常复习/专项预算、推荐模式和权重、知识点专项强度、诊断模型高级参数。
- **继承规则**：单卡显式配置 > 卡片集配置 > 新建卡片集默认模板（如未来实现）；但**不得**为单卡新增可覆盖知识点诊断得分的“手工掌握百分比”。一张卡片可以显式比卡片集更长，如集 30 天、单卡 90 天，允许；系统硬上限始终 3650 天。
- **作用边界**：FSRS 负责真实调度；题目/知识点证据模型只负责诊断；联合队列负责到期任务排序及独立专项练习。知识点强度不得篡改 FSRS 到期日。
- **历史安全**：当前源数据 `v060/data`，schema 601 为原有基线；不删除学习记录，不静默重置卡片 FSRS，不改写旧复习事件、错因、分数；不覆盖尚未提交或未保存代码。新配置采用追加式迁移，并进入**完整备份**，不能只进入内容 ZIP。
- **不固定三次**：诊断不依据“最近 3 次”“最近 6 次”硬截断；使用全部适用历史 + 时间衰减 + 跨题/跨日证据与可信度。UI 历史窗口不暗中改变当前掌握诊断。
- **两类卡**：错题卡与政治/常识记忆卡均可使用 FSRS 最大间隔；题目用时目标只适用于错题卡；知识点跨题能力分析不把记忆卡当成解题能力证据。
- **可用性要求**：高级算法参数可以配置，但默认隐藏于“高级 / 实验性”；推荐一般用户使用预设。每次修改提供“改变哪些行为、不改变哪些行为”的说明和生效预览。

## 1. 已有代码的事实边界（2026-10-18 对 RC2 ZIP 的静态核查）

| 领域 | RC2 已存在 | 当前具体行为 | 本设计新增 |
|---|---|---|---|
| 单卡最大间隔 | `CardReviewPolicy.vue`、`electron/modules/review/policy.ts` | `null` = 继承；值为 1–3650 天；`effectiveMaxInterval` 优先选单卡 | 参数来源标记、预测效果、批量选项及冲突保护 |
| 集最大间隔 | `DeckReviewSettings.vue`、`deck_review_policies` | 默认 365 天，1–3650 天，集间独立 | 显示继承人数/覆盖人数、预览和批量生效方案 |
| 每日到期上限 | 同上 | 默认 15 道，范围 1–200；RC2 现行计算需修复同卡多次有效复习重复消耗额度 | “每日独立到期题 ID 数”和“同日重学”分账 |
| 题目用时目标 | `AssessmentPolicyEditor.vue`、`assessment/policy.ts` | 卡片集可不设；单卡模式 `inherit/none/custom`，自定义范围 1–86400 秒 | 与风险引擎分离的配置页、来源标签、预览 |
| FSRS 保持率 | `review/fsrs.ts` | `request_retention: 0.9` 写死；`maximum_interval` 使用有效间隔；`enable_fuzz: false` | **卡片集级**高级配置保持率，安全验证后才开放 |
| 现有计划生效 | `policy.ts` | 单卡与集 `save*Policy` 的 `adjusted` 分别恒为 `false/0`，仅下次有效复习生效；存在未接入保存路径的 `clampCurrentPlan` 辅助函数 | 明确分离“只影响以后”与“预览后仅提前当前计划”；不要假装原来已经批量提前 |
| 题目×知识点 v2 | 目前仅完成设计 | 诊断/联合队列未作为 RC2 已实现功能验证 | 依 v2 文档分期集成参数服务 |

基线其他入口：`src/App.vue -> useStudySession.ts -> electron/modules/review/{workflow,service,fsrs}.ts`，`shared/review-contract.ts`、`shared/protocol/registry.ts`、`src/services.ts`、`electron/infrastructure/schema.ts`。`ReviewHub.vue`、`ReviewWorkspace.vue` 为非现行主入口；实现时不能只改这些旧页。

**术语修正**：现有 `SaveReviewPolicyCommand` 注释称 `null inherits the global default`，实际是继承**本卡所属卡片集默认值**，应改注释和 UI 文案，不改变旧数据含义。

## 2. 配置结构与覆盖机制

### 2.1 分层示意

```text
应用级「新建卡片集模板」（未来新增；只提供新建默认值，不自动覆写既有集）
   └── 卡片集的排期/任务预算/推荐模式/目标保持率
         ├── 错题 A：继承集最大间隔；继承集时间目标
         ├── 错题 B：自定最大间隔 7 天；不设置时间目标
         └── 错题 C：自定最大间隔 90 天（即使集只有 30 天）
知识点专项偏好（只作用于联合推荐队列）
   └── 不作为 FSRS 继承层，不覆盖卡片到期，也不自动修改单卡排期
诊断高级模型（全局规则版本；未来可扩展到卡片集预设）
   └── 不从 UI 的日期筛选自动修改，不回写原始复盘证据
```

### 2.2 数值与三态语义

- 对已有 `max_interval_days`，**没有 override 记录表示继承**；`custom=整数` 表示覆盖；默认不允许 `none`（不能关掉 FSRS 的法定最大间隔限制）。
- 对用时目标，`inherit`、`none`、`custom(seconds)` 三态必须原样保留，**none 是显式禁用**，不是未设置。
- 对新卡片集保持率，`custom` 或 `default(0.90)`；首版不做单卡保持率覆盖，避免目标保持率随多个知识点策略冲突。
- 卡片/集归属变化：卡片显式 override 始终随卡保留；继承卡在移动后使用目标卡片集设置，但其已存在计划默认不回算。目标卡片集的题量统计和专项选择更新，历史事件不移植到新集统计来源之外。
- 模板只用于“创建新集时初始化”，不得悄悄改既有卡片集配置；旧表以缺省值/增量迁移读取，不要求迁移全部既有记录。
- 值验证必须服务端权威执行，前端提供相同的即时反馈；不接受 NaN、Infinity、小数天、字符串数值、非法时区。

## 3. 面向使用者的参数目录（产品规范）

标记：✅ RC2 已有；🆕 v2.1 新增；🧪 高级/实验。所有 🆕/🧪 均未在 RC2 证实已实现。

### 3.1 排期与学习效率

| 参数名 / key 建议 | 级别 | 范围/默认 | 类型 | 生效规则 | 状态 |
|---|---|---|---|---|---|
| 最大复习间隔 `maxIntervalDays` | 卡片集 | 1–3650 / 365 天 | hard cap | 下一次有效复习；可另选预览后提前既有到期 | ✅ |
| 单卡最长间隔 `card.maxIntervalDays` | 单卡 | inherit 或 1–3650 天 | hard cap override | 独立于集值，下一次有效复习 | ✅ |
| 每日独立到期题数 `dailyDueUniqueLimit` | 卡片集 | 1–200 / 15 | budget | 保存后下一次队列生成，已领取会话保护快照 | ✅旧计数待修 |
| 单日重学预算 `sameDayRelearnBudget` | 卡片集 | 0–200 / 候选 10 | budget | 与每日新领取题数分账；不改变合法有效复习 | 🆕 |
| 专项练习数量 `specialtyDailyLimit` | 卡片集 | 0–200 / 候选 5 | budget | 独立练习，默认不推进非到期 FSRS | 🆕 |
| 每日练习时长目标 `practiceMinutes` | 卡片集 | 0 或 5–240 / 0 不限制 | soft goal | 仅辅助任务编排/估时，不能截断正在作答 | 🆕 |
| 目标做题用时 `targetSeconds` | 集/题目 | null 或 1–86400 秒，单卡三态 | assessment | 只对后续评估有效，不重判历史 | ✅ |
| FSRS 目标保持率 `desiredRetention` | 卡片集 | 建议 0.80–0.97 / 0.90 | schedule advanced | 下一次有效复习，不能回写既有到期和历史稳定性 | 🧪 |
| 手动暂停 / 恢复 | 单卡 | 布尔 | eligibility | 优先于自动选题；恢复不伪造复盘 | ✅既有保留 |
| 手动延期 `manualSnoozeUntil` | 单卡 | 合法未来时间 | due override | 只修改到期可见性/资格层，不伪造 FSRS 复习事件 | 🆕语义统一 |
| 提前当前过长计划 `applyToExisting` | 单卡/卡片集 | `future_only` 或 `advance_existing` | explicit action | 需要单独预览与确认；仅提前、不延后 | 🆕 |

默认候选值仅用于首次落地测试；不能宣称科学最优。用户旧值不得因新默认变更而改变。

### 3.2 智能推荐与队列（只作用于推荐，不直接调整 FSRS）

| 参数 | 级别 | 默认建议 | 验证约束 |
|---|---|---|---|
| 复习侧重 `priorityPreset` | 卡片集 + 会话临时覆盖 | `balanced`，可选 weak / overdue / coverage / custom | 仅重排合法候选，不能让非到期专项抢走已有到期名额 |
| 严重逾期保障 `severeOverdueReserve` | 卡片集高级 | 初始 0.30，允许 0–0.60 | 用分层公平性预算，防长期饥饿；不是保证完全无逾期 |
| 题目风险 `questionRiskWeight` | 预设/高级 | 0.40 | 四项权重经校验合计 1；可回放 |
| 知识风险 `knowledgeRiskWeight` | 预设/高级 | 0.25 | 需乘可信度/覆盖校正，无可靠归因时不得乱加 |
| 逾期紧迫 `overdueWeight` | 预设/高级 | 0.25 | 逾期层资格先判定，权重只负责层内排序 |
| 覆盖新颖度 `coverageWeight` | 预设/高级 | 0.10 | 不重复计同一题多知识点覆盖收益 |
| 题型/知识点分散程度 `diversityMode` | 卡片集 | balanced | 不能删除全部同知识点候选；保留足量题可用 |
| 跨题验证 `crossQuestionVerification` | 卡片集 | true | 自动专项仅非到期练习；独立题/日期证据规则仍有效 |
| 同日已练降权 `sameDayFatiguePenalty` | 卡片集 | true | 不阻止合法同日重学，不影响 FSRS 事件 |
| 随机专项 `randomFraction` | 会话或集 | 0，范围 0–1 | 需随机 seed 和可复现快照；到期保障先满足 |

推荐预设只是数值集合，建议设计为 `balanced` = [0.40,0.25,0.25,0.10]；`weak` = [0.50,0.30,0.15,0.05]；`overdue` = [0.25,0.15,0.50,0.10]；`coverage` = [0.25,0.25,0.20,0.30]。**这些数值仅是工程起始候选**，必须在合成数据库和回放测试中评估。保留严重逾期强制预算的独立逻辑。

### 3.3 知识点专项偏好（不是 FSRS 策略）

| 参数 | 级别 | 默认/候选 | 约束 |
|---|---|---|---|
| `knowledgeFocusMode` | 卡片集下知识点 | auto / normal / prioritize / reduce / exclude_specialty | exclude_specialty 只排除额外推荐，不排除依法到期题 |
| `knowledgePriorityBoost` | 卡片集下知识点 | 0.5–2.0 / 1.0 | 仅作为额外专项推荐的有界乘数；不改风险估计和 FSRS |
| `knowledgePracticeTarget` | 卡片集下知识点 | 0–50 / inherit | 只作为专项练习目标数，不卡死整集额度 |
| `knowledgeVariantFirst` | 卡片集下知识点 | true | 优先不同题目/跨日期，且同题练习不会假装知识点已稳定 |
| `knowledgePracticePaused` | 卡片集下知识点 | false | 只暂停该知识点的额外训练，不自动暂停任何卡片正常到期 |

若一道题连接 K1、K2：不把它的推荐权重按两点简单相加；候选的知识点覆盖收益必须去重/有上限，并附可解释原因。多个弱知识点可能一起推荐同一题，但会话中这题只出现一次、预算只计一次。知识点树父子汇总不得重复累计同一条作答证据。

### 3.4 诊断模型高级参数（默认折叠，不做普通用户主导航）

| 参数 | v2 初始参考 | 用户可见性 | 对历史的影响 |
|---|---|---|---|
| `evidenceHalfLifeDays` | 60 天 | 🧪 高级 | 重新计算*派生诊断*，原始事件不改 |
| `repeatPenalty` | `1 / sqrt(n)` | 🧪 高级建议先 3 种预设 | 改变知识点跨次贡献，不改变卡片到期 |
| `knowledgePerQuestionCreditCap` | 2.0 | 🧪 高级 | 限制单题证据，保留原始历史 |
| `confidenceSlope` / 可信度平滑 | 版本化常量 | 建议第一阶段只读 | 影响风险状态与解释，不表现为掌握概率 |
| `hysteresis` | 高/低两段阈值 | 建议第一阶段只读 | 状态稳定，防一次对错造成抖动 |
| `diagnosisRuleVersion` | `adaptive-review-v2.0` | 只读可查看 | 变动意味着缓存失效与回放版本变化 |

不提供“最近 N 次决定掌握”开关。日期范围筛选仅影响明确指定的图表/历史查询，不暗改当前诊断规则。

## 4. 配置生效与当前计划调整（必须精确）

### 4.1 两种互不混淆的操作

**A. `future_only`（默认，保存配置）**

- 保存后立即改变“当前有效配置”的显示；今后新生成的复盘日程遵循新的单卡或集参数。
- 现存 `plans.due_at` / `memory_plans.due_at` / `scheduling.data.due` **不做批量重写**。
- 历史的 FSRS `stability`、`difficulty`、`last_review`、复盘事件等不改；改每日预算/优先级时可刷新*尚未冻结*的推荐预览。
- 用户在编辑页必须看到“当前到期日期未变，下一次有效复盘使用新上限”的明确提醒。

**B. `advance_existing`（显式二次操作）**

1. 先以权威后端状态只读预览：总卡数、继承/自定分布、当前到期、建议提前到期、会立即到期的数量、不适用/暂停/手动延期/无上次有效复习的数量；卡片集预览必须分页，不能爆量。
2. 前提：用户已经保存配置（或通过单次原子确认同时保存配置与应用），确认弹窗显示“仅提前、不延后”。预览 ID 绑定目标集/卡、有效策略 revision、当前数据 revision、模型版本、计算时钟、学习时区、请求的 `effectiveMode`。
3. 建议到期 `newEffectiveDue = min(oldEffectiveDue, max(now, lastEffectiveReview + capDays))`；如果 `last_review + cap` 已在过去，则使其“现在到期”，而不是伪造一条过去时刻的复盘事件。
4. 对每张卡片：单卡 override 存在则使用自己的上限；对尚无有效复习记录、缺少可信 last_review、已删除卡、暂停卡、存在明确手动延期冲突的卡**不自动改**，报告排除原因；严禁将禁用/延期冲突静默取消。
5. **不直接改写 FSRS `difficulty/stability/last_review`**。优先方案：新增独立 `due_override`/`policy_cap_due` 资格层记录，统一 `dueEligibilityService` 决定实际到期，FSRS 的原始 `due` 保留；下一次有效复习时清理临时覆盖。现有 `policy.ts` 有直接修改 `scheduling.data.due` 的未接入函数，Codex 必须评估并改为统一服务或做可证明兼容的精确补丁，不能两套钟同时存在。
6. 手动延期优先级：**pause > 用户显式 snooze（若冲突，本次批量调整跳过并提示） > policy advance bound > FSRS 原到期**。暂停卡不出现在自动队列；用户单独选择覆盖延期必须另经确认，不在本次默认任务中实现。
7. 提交时校验预览未过期、修订一致；使用事务、CAS 乐观并发、幂等 requestId、明确完成/失败回执；部分失败不得导致“保存成功但排期更新一半且 UI 不知”。可将一个卡片集确认操作按受限批次执行，每批记录审计/进度与可恢复状态；优先实现原子单事务（数据量允许时）。
8. 应提供取消和反悔途径：保存变更前可取消；确认后不重放学习历史，允许通过专门的、带预览的撤销该次 `due_override`（前提是相关卡片尚未再复习或手动修改，冲突则拒绝），不提供盲目“恢复历史 FSRS 算法结果”。

### 4.2 核心规则示例

| 情况 | 保存后 | 用户选择“提前当前计划”后 |
|---|---|---|
| 集最长 365→30 天；单卡继承、原计划 180 天后 | 仍 180 天后 | 以最近一次有效复盘起算，超过 30 天则提前至上限；若上限已过期，则现在到期 |
| 集最长 365→30 天；某卡单独 90 天 | 单卡不变 | 不因集改成 30 而采用 30；用独立 90 天判断，若原本未违反单卡上限则不改 |
| 单卡 7→60 天，当前计划还有 2 天 | 仍 2 天 | 不延后，仍 2 天 |
| 单卡继承恢复 | 下一次有效复习使用所属集配置 | 若选择单卡“提前当前计划”，以有效集上限与历史最近有效复盘判断 |
| 暂停/删除/首学/用户显式延期 | 保持原状 | 默认跳过、给明确原因；不凭空计算新复盘历史 |

**必须测试**：暂停/手动延期、时区、夏令时、上限天数与毫秒关系、已超时、跨午夜、FSRS内部 due 和 plans 不一致、重复确认、部分故障与恢复、并发修改、移动卡片至其它集，不能只看表面 UI。

## 5. 前端产品界面与交互规范

### 5.1 导航

从现行 `DeckReviewSettings.vue` 延伸到“卡片集设置 → 复习策略”，下设 4 个内部 tab：

1. **复习排期**：每日到期数、最大间隔、目标保持率（高级折叠）、继承与自定义的卡片计数、现有任务预览/调整。
2. **每日任务与专项**：同日重学预算、专项练习预算、可选时长目标、正常复习与专项两种任务账本。
3. **智能推荐**：模式预设/高级自定义权重、逾期公平保障、知识点多样性、随机比率、示例队列预览。
4. **知识点专项**：知识点树、独立题/日证据、覆盖不足提示、专项强度、可排除“额外专项”但不排除到期。

全局设置只提供“新建卡片集模板”和“高级诊断模型”；**不把全局修改自动推给所有既有卡片集**。具体单卡设置在现行 `CardReviewPolicy.vue`/卡片详情中：继承/独立最大间隔、题目独立用时目标、有效值、来源标签和下次生效说明。

### 5.2 推荐页面布局（桌面）

```text
┌──────────────────────── 复习策略 · 资料分析 ──────────────────────────┐
│ [排期] [今日任务] [智能推荐] [知识点专项]     当前集: 资料分析        │
│ 卡片集最长间隔  [30]天     每日到期 [20]道   保持率 [90% 高级]        │
│ 继承 128 张 | 单卡自定义 12 张        [查看生效预览] [保存设置]       │
│ 小贴士：更新默认值不会覆盖 12 张自定义卡。                           │
├──────────────────────────────────────────────────────────────────────┤
│ 选中策略：仅从下次有效复盘生效                                        │
│ ○ 仅后续生效（默认）    ○ 同时提前过长的现有任务（先预览并二次确认）  │
│ [预览：会提前 26 张；当前 0 立即到期；跳过 3 张手动延期]              │
├──────────────────────────────────────────────────────────────────────┤
│ 推荐排序： [均衡] [薄弱优先] [逾期优先] [覆盖优先] [自定义]             │
│ 当前队列预览：题目 | 原因 | 原定到期 | 当前有效到期 | 知识覆盖           │
│ —— 正常复习 vs 非到期专项强区分；显示为何推荐 / 预计工作量 ——           │
└──────────────────────────────────────────────────────────────────────┘
```

移动端/窄屏分为堆叠区块，先参数再预览；仍可键盘操作。暗色/浅色/跟随系统主题一致；输入错误就地提示；离页未保存应确认；配置保存成功和计划预览/应用成功须分别告知，不用同一条 toast 混淆。

### 5.3 可解释展示

- “当前来源：本卡独立 / 继承卡片集”始终可见；高级保持率显示说明“更高通常意味着更频繁复习”，不是自动调高掌握率。
- 任务条目解释 `reasonCodes`，例如 `severely_overdue`、`repeat_error`、`knowledge_underverified`、`recent_fatigue`、`manual_snooze_excluded`；明示正常 FSRS 与专项练习。
- 显示“当前诊断依据的规则版本”和“历史范围筛选只影响图表，未影响当前 FSRS/诊断”的提示。
- 参数预设更换后先产生无副作用 `preview`，不会自动保存。
- 非法参数不可保存；防抖与迟到响应处理防旧配置覆盖新预览；错误时保留编辑草稿。

## 6. 工程模块/接口边界（示意，Codex 须适配现有注册方式）

```ts
// domain configuration: descriptive contract, not drop-in current source
interface ReviewDeckConfigV2 {
  deckId: string;
  dailyDueUniqueLimit: number;        // 1..200
  maxIntervalDays: number;            // 1..3650
  desiredRetention: number;           // 0.80..0.97, default 0.90
  sameDayRelearnBudget: number;       // 0..200
  specialtyDailyLimit: number;        // 0..200
  practiceMinutes: number | null;
  priorityPreset: 'balanced'|'weak'|'overdue'|'coverage'|'custom';
  weights: { question: number; knowledge: number; overdue: number; coverage: number };
  severeOverdueReserve: number;       // 0..0.60
  diversityMode: 'spread'|'balanced'|'focus';
  crossQuestionVerification: boolean;
  sameDayFatiguePenalty: boolean;
  randomFraction: number;
  revision: number;
}
type Inheritable<T> = { mode:'inherit' } | {mode:'custom'; value:T};
type InheritableOrNone<T> = Inheritable<T> | {mode:'none'};
interface ReviewCardConfigV2 {
  kind:'question'|'memory'; cardId:string;
  maxInterval: Inheritable<number>;
  // Only question cards have targetSeconds; memory cards do not.
  targetSeconds?: InheritableOrNone<number>;
}
interface KnowledgeSpecialtyPreference {
  deckId:string; knowledgeId:string;
  mode:'auto'|'normal'|'prioritize'|'reduce'|'exclude_specialty';
  boost:number; practiceTarget:number|null; variantFirst:boolean;
  revision:number;
}
interface ReviewConfigPreview {
  target: {kind:'deck'|'card'; id:string};
  mode:'future_only'|'advance_existing';
  previewToken:string; calculatedAt:string; configRevision:number; dataRevision:number;
  inheritedCount:number; overriddenCount:number; affectedCount:number;
  immediateDueCount:number; skipped:Record<string,number>;
  sampleBeforeAfter:Array<{kind:'question'|'memory';cardId:string;beforeDue:string;afterDue:string;reason:string}>;
  nextPageToken?:string;
}
```

逻辑分割：

- `review/policy.ts`：配置验证、有效值解析、来源说明；仅此模块负责卡/集覆盖。
- 新 `review/config-service.ts`：配置读写与修订、事务、审计、配置快照、批量预览与二次应用。
- 新 `review/due-eligibility.ts`：统一 FSRS 原始 due、手动延期、暂停、策略提前覆盖和计划显示；**任何读/提交均使用同一权威值**。
- 新 `review/recommendation-config.ts`：预设与自定义权重解析，纯函数，拒绝非法数据。
- `adaptive/question-evidence`、`knowledge-evidence`：仅诊断历史证据；模型配置由版本化规则解析，不读/写卡片调度状态。
- `review/review-queue`：获得合法到期集合后再读取推荐参数；专项练习独立记账，不能偷偷影响 due。
- `shared/protocol/registry.ts` + `src/services.ts`：严格声明所有查询/命令、Zod 输入输出、错误码和权限范围；不得任意 IPC。
- `electron/infrastructure/schema.ts`：增量迁移，数据库旧 schema 前向升级；需要同时更新完整备份/恢复、重建与旧版本导入的兼容用例。
- UI 只调用服务层，不在 Vue 重新实现“有效上限计算”或到期资格判定；同一个卡片集新旧界面必须读到同一策略。

### 6.1 建议新增的类型化协议（名字可按既有约定调整）

| 方法 | 模式 | 行为 |
|---|---|---|
| `policy.config.get` | query | 读取卡/集/知识点有效配置、继承来源、revision |
| `policy.config.preview` | query | 只读预测未来行为、现有到期调整量和影响卡清单（分页） |
| `policy.config.save` | command | 保存配置，仅后续生效，CAS revision / requestId / 回执 |
| `policy.config.applyExisting` | command | 根据一次具体未过期的预览执行“提前当前计划”，不得接受任意卡 ID 原样调用 SQL |
| `policy.config.undoExisting` | command | 有条件移除由此次批量生成、尚未被更新覆盖的 due override |
| `policy.knowledge.set` | command | 修改某集某知识点专项偏好，禁止写 FSRS |
| `policy.previewQueue` | query | 根据最新权威配置产生无副作用推荐预览，带 ruleVersion / reasons |

现有 `policy.card.set`、`policy.deck.set`、`assessment.target.set` 应保留兼容，优先让旧 API 委托新的服务，而不是出现两个规则实现。所有 command 响应显式区分 definitive/unknown，不能因超时自动重试不可幂等操作。

### 6.2 可逆增量数据设计（示例，不是强制照抄）

现有 `deck_review_policies(deck_id,daily_limit,max_interval_days)` 与 `card_review_policies(kind,card_id,max_interval_days)` 原样保留；新参数优先放新表，例如：

```sql
CREATE TABLE deck_review_config_v2 (
  deck_id TEXT PRIMARY KEY REFERENCES decks(id),
  desired_retention REAL NOT NULL DEFAULT 0.90,
  relearn_budget INTEGER NOT NULL DEFAULT 10,
  specialty_budget INTEGER NOT NULL DEFAULT 5,
  practice_minutes INTEGER,
  priority_preset TEXT NOT NULL DEFAULT 'balanced',
  weights_json TEXT NOT NULL,
  severe_overdue_reserve REAL NOT NULL DEFAULT 0.30,
  diversity_mode TEXT NOT NULL DEFAULT 'balanced',
  cross_question_verification INTEGER NOT NULL DEFAULT 1,
  same_day_fatigue_penalty INTEGER NOT NULL DEFAULT 1,
  random_fraction REAL NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE TABLE knowledge_specialty_prefs (
  deck_id TEXT NOT NULL REFERENCES decks(id),
  knowledge_id TEXT NOT NULL REFERENCES knowledge(id),
  mode TEXT NOT NULL DEFAULT 'auto', boost REAL NOT NULL DEFAULT 1,
  practice_target INTEGER, variant_first INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(deck_id, knowledge_id)
);
CREATE TABLE review_due_overrides (
  kind TEXT NOT NULL, card_id TEXT NOT NULL,
  source TEXT NOT NULL, effective_due TEXT NOT NULL,
  created_by_operation TEXT NOT NULL, created_at TEXT NOT NULL,
  superseded_at TEXT, revision INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(kind,card_id,source)
);
CREATE TABLE review_config_operations (
  id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL, target_kind TEXT NOT NULL, target_id TEXT NOT NULL,
  preview_hash TEXT NOT NULL, status TEXT NOT NULL,
  before_json TEXT NOT NULL, after_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

约束：SQLite 严格 CHECK/foreign key、有效索引、必要级联/软删处理、配置版本化审计、旧备份兼容；不要仅存 JSON 缺字段校验。schema 样例需与实际迁移工具、备份表白名单及主键作用域对齐；是否拆分 `review_due_overrides` 来源需根据现有 `plan.set` 调查后决定，禁止重复的权威 due。

## 7. 推荐规则的参数独立性

```text
FSRS candidate eligibility = authoritativeDueEligibility(card, now, overrides, pause)
if eligible:
  assignedBucket = scheduled_due | same_day_relearn
  priority = weights × normalizedEvidenceFeatures
  fairness + diversity + budget selection
else if specialtyAllowed:
  assignedBucket = weak_knowledge_practice | error_intervention | coverage_verification | manual_random
  doesNotWriteFSRSUnlessExplicitValidScheduledReview
```

例如 Q1 独立最大间隔 7 天、所属集 30 天、关联 K1/K2；K1 设为“强化专项”：Q1 仍使用 **7 天**作 FSRS 硬上限；K1 的强度只会增加 Q1/Q2/Q3 进入额外专项池的排序可能，优先安排新题/不同变式，且不能强制将 Q1 的下次 FSRS 改为 3 天。题目内容版本、知识点快照、错误明确归因和跨题证据规则依完整 v2 文档。

## 8. 系统保护、性能与版本兼容

1. 所有危险操作和模型调参都有 `ruleVersion/configRevision`；使用同一 `now/timezone/config/dataRevision` 可以重放相同预览。模型更新不修改历史真实记录，只让派生缓存失效。
2. 配置写入与审计/回执同一事务；未知结果可按 requestId 查询，不盲目重复提交；前后端使用类型化 API 且防止“迟到查询覆盖新配置”。
3. 保留卡片集独立性，包含多个知识点的题不会跨集污染；知识点软删/合并/重命名及卡移动要有明确 orphan 显示，不默默继承其它集的配置。
4. 大集预览分页/聚合，不一次性加载所有题到渲染层；缓存键包含 deckId、configRevision、dataRevision、timezone、ruleVersion，并在 review/编辑/关联/迁移/恢复/改时间区时正确失效。
5. 默认仅未来生效；批量“提前现有任务”预览与落库之间需要 CAS 和错误保护；强杀/断电恢复按操作状态查询，而不是盲重试。
6. Windows 10/11 必须真实运行后才能写“实测通过”。本规范属于设计；旧 RC2 的 163 项测试、Linux ASAR 测试不能冒充新代码已测。运行代码改造时按影响跑 `npm run check`、`npm run smoke:v071`、`npm run test:package`、备份恢复/迁移用例。

## 9. 设计对照验收（完整矩阵见独立文件）

- 集 30，单卡 inherit=30；另一单卡 custom=90；修改集 60，前者变 60，后者仍 90；删除后者 override 则变 60。
- 集 365→30，单卡有到期 180 天，但只点击“保存”，旧 due **一字节不变**；明确执行调整后才可能提前。
- 改 30→90，无论保存或“提前当前计划”，都**不得自动延后**已安排的日期。
- 同卡一天 4 次有效复习（若业务合法）只消耗 **1 个“当日独立到期题”**，同日重学在另一账本；幂等重复上报计 0 次额外。
- 单卡自定 7 天 + 关联薄弱 K，不因知识点弱变 3 天；K 的专项推荐可增加。
- 用户对知识点设置 `exclude_specialty`，合法到期题仍会出现。
- 只设置 FSRS 保持率 0.95，从下一次有效复盘开始影响新 FSRS 排期，过去状态/事件不可重写，不能伪造“掌握率 95%”。
- 并发预览失效，旧 requestId 不重复入账，复盘/延期冲突有明确状态，不显示虚假成功。
- 旧备份可恢复；新备份完整包含新增配置、操作审计与 due overrides；内容导出仍不能被误标为完整学习备份。

## 10. 建议分期与交付

P0 源码与未提交修改审计 → P1 原有单卡/集配置封装及回归、每日预算修复 → P2 新配置表和继承来源、FSRS 卡片集保持率 → P3 预览及显式提前机制、唯一 due 判断 → P4 关联 v2 联合队列和知识点参数 → P5 现代化设置 UI → P6 测试、备份、发布验证。每阶段交付代码 diff、变更文件、运行结果与未验证边界。不能一次重写全部文件或以理论断言代替实测。

---

**验收状态声明**：本文件仅为设计；本次交付是 Codex 指令与规范包，不包含新写好的 GankSoft 程序。初始参数候选值须在开发中通过测试和回放验证，最终由用户可控配置生效。
