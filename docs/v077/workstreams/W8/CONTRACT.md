# W8 AI 子页面：导航、接口、状态与失败处理合同

## 1. 真实页面嵌套与交互边界

- 页面树：卡片集工作台（UnifiedWorkspace.vue，窄图标栏及顶部导航保留） → 学习分析（UnifiedAnalytics.vue） → AI 调度调整（UnifiedAiAnalysis.vue）。
- 父组件真实调用：<UnifiedAiAnalysis v-if="aiPage" :deck-id="deckId" @back="aiPage=false;load()" />。父页面既有 dimension/date/scope/search/sort/direction 不得因返回而被清空；原来的 load() 可刷新统计。
- W8 不能另增顶级「AI」菜单或在子页面内部重新挂一套主导航。独立原型中的模拟窄栏是展示壳，不是交付给子组件的新增 UI。
- 数据变化 alertdialog 的遮罩容器必须定位在子页面业务内容区，**不覆盖真实应用左栏、顶部导航**；必须具有焦点进入、Tab 焦点约束、Escape 规则及关闭后焦点恢复。子页返回应始终到「学习分析」，不是设置或学习总览。
- 后台导出时可点击「返回学习分析」：离开 W8 子组件不取消主进程 job。正在保存 Prompt/执行写事务/结果未知时按各自协议保护，不能一刀切允许离页而丢失需确认的信息。

## 2. 已存在 API 与提案边界（必须区分）

| 能力 | 当前真实协议 / 实际字段 | W8 后续所需变化（尚未实施） |
|---|---|---|
| 导出 | learning.aiAdjustment.export：deckId/jobId/date/includeImages | 复用，不更换 W4 ZIP 格式 |
| 进度 | learning.aiAdjustment.export.status：phase、cardCount、eventCount、bytes | 由全局轻量任务管理展示；**没有总量或百分比字段**，不得伪造分母、假 100% |
| 取消 | learning.aiAdjustment.export.cancel(jobId) | 由主进程 job 持有；视图卸载不自动调用 cancel |
| 导出结果 | saved、name、cardCount、eventCount、snapshotId（无 exportId/绝对路径） | 主进程在文件保存及完整性检验后从已核验 manifest 得 exportId/epoch/revision 与授权文件引用；不在 renderer 猜绝对路径 |
| Prompt | learning.aiAdjustment.prompt.get/save（含 expectedRevision） | 编辑沿用 CAS，未保存内容离页保护；更改 Prompt 本身不等于学习数据修改 |
| 当前建议导入 | learning.aiAdjustment.preview.open/page/close，目前打开过程需要两份 ZIP | 用户先选 AI ZIP；后台安全解析 source 后匹配被授权 W4 ZIP 引用，再沿用现有双包校验；不允许任意 renderer 文件路径 |
| 只读准备 | learning.aiAdjustment.preview.prepare（selection、source、token、confirmed=true） | 用户点击「检查并应用」明确同意系统进行只读准备；不再单独弹出校验确认；结果不是提交凭据之外的自动执行授权 |
| 写入/回执 | learning.aiAdjustment.apply/undo、operation.status、learning.aiAdjustment.logs | 一次**最终写入确认**，再由 W5 事务 CAS + requestId 原子写；unknown 先查回执，严禁二次提交 |

## 3. 最小来源索引及可信性

- 本地只保存少量已完成导出来源的**受授权文件引用**与 exportId/snapshotId/deckId/epoch/revision/摘要/时间；不保存用户的分析正文、Prompt、AI 建议全文，不扩展 SQLite 学习业务表。路径属于敏感本机元数据，避免日志输出或进入公开证据。
- 在主进程完成 ZIP 安全验证和原子落盘后登记，不能使用 renderer 文件名或未验证的 manifest 自称文件已通过数字签名；每次重用前重新校验路径权限、ZIP 完整性及当前 DB 修订。
- 如果无来源记录、移动/删除/读权限丢失、同名不同内容、多个候选不唯一，则只要求**补选原分析 ZIP**（原始来源不可信时拒绝）；不能回退为跳过来源检查。
- 数据 epoch 换库/恢复、当前 deck 改变、revision/target fingerprints 不同：根据 W5 来源校验拒绝旧建议；缓存不得跨换库恢复有效。建议关联需精确配对 exportId + snapshotId + deckId + epoch/revision，而非“最近一个文件名”。
- 来源索引可采用既有设置/最小 sidecar；具体持久化位置由 W8.2 先审查 owner/permission/retention 再确定；存储/清理策略和兼容旧 W4 未登记 ZIP 的补选方案必须有真实测试。

## 4. 状态机：数据库变化与重新分析

```text
EMPTY → EXPORTING → EXPORTED_VALID → WAIT_EXTERNAL_AI → AI_ZIP_SELECTED
AI_ZIP_SELECTED → SOURCE_MATCHED → PREVIEW_VALID → PREPARING → CONFIRM_FINAL → APPLYING → APPLIED
EXPORTED_VALID + DB_CHANGE → EXPORTED_OUTDATED → REQUIRE_NEW_EXPORT
PREVIEW_VALID/PREPARING/CONFIRM_FINAL + DB_CHANGE → STALE_LOCKED + ALERT_OPEN
STALE_LOCKED + DISMISS → STALE_LOCKED                    （不解锁）
STALE_LOCKED + REEXPORT → EXPORTING_NEW → WAIT_EXTERNAL_AI_NEW
WAIT_EXTERNAL_AI_NEW + OLD_AI_ZIP → STALE_LOCKED           （不得复活）
WAIT_EXTERNAL_AI_NEW + NEW_AI_ZIP + STRICT_VERIFY → PREVIEW_VALID
APPLYING + UNKNOWN_RECEIPT → PENDING_STATUS_CHECK          （不二次 apply）
```

- DB_CHANGE 指**已确认**与导出来源/目标失配的数据库 epoch/revision/指纹变化：真实复盘、卡片发布、知识关联、调度/策略变更或整库恢复等。切换页面/仅查看统计/保存纯 Prompt 不擅自判为变化。服务端事务中的精确重验为最终权威。
- 事件触发点：第一次 AI ZIP 导入与原始 W4 ZIP 匹配时；预览期间收到 dataSync 通知后重新核验；点击应用自动 prepare 时；最终确认后 W5 事务 CAS 拒绝时。相同失效事件**只弹一次**，离开后再进入可看到持续的锁定状态。
- 导出期间发生真实复盘：旧固定快照 ZIP 可以完成且完整，但如完成时来源相对当前库过期，明确标示“已生成但不适合用于当前调整”，禁止静默当作最新分析包。
- 失效弹窗：标题「学习数据已发生变化」；正文明确原包/当前修订不符与旧建议不可应用；按钮「暂不处理」「重新导出最新分析 ZIP」。后者**只启动本机新导出**，AI 重新分析和新建议 ZIP 由用户在外部完成。不能复用旧 AI ZIP 取得新的有效状态。
- 用户已提交 apply 而结果未知，不能推断没有写入；应显示「原操作结果待核对」，优先查原 requestId 对应 operation.status。只有权威明确拒绝后可认定未执行。

## 5. 信息展示与用户可见流程

正常导出：进入 AI 调度调整子页 → 导出分析 ZIP → 选保存位置 → 软件内后台运行 → 完成后用户自行交给外部 AI。日期只影响摘要，完整卡/事件不截断；图片缺失提示和数据隐私提示常驻且简洁。
正常导入：选择 AI 返回 ZIP → 后台关联/完整校验原 W4 ZIP（必要时补选） → 预览全部建议并默认选中合法项 → 点击「检查并应用」触发自动只读准备 → **一次最终确认** → 原子提交和记录。异常路径不能强行满足少点击数目标。
完成后展示真实更新数量、最近操作状态、保守撤销入口；不得以不同知识点重复累计卡片数。大包分页选择使用 W5 actionId/全合法选择与排除集合，不把当前页当全部。

## 6. 编写与测试门槛

- W8.2 不修改 Schema606、W4/W5 ZIP 格式或 W5 四类动作白名单；如果设计证据证明最小新增 API 必须存在，先写明确输入/输出字段、授权来源与调用关系再实施，不创建第二套调度引擎。
- 任何 UI 事件只改变可视状态/调用已定义服务，不从 Vue 直接使用 Node 文件系统、SQLite 或不可信绝对路径。
- 数据库读写和真实文件流程必须用隔离合成库/ZIP + Electron 真实 IPC 验收。独立 Vue 演示只证明设计交互，不作为 W8-xx PASS。
- 通过标准：W8-01～W8-16 实际逐项具备源码 SHA、调用记录、预期/实际、Electron 宽度和重启读回结果；Win10/11/125%DPI 没运行就明确 NOT_RUN。
