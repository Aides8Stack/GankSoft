# v075 分阶段 Gate 与最小任务

## S2 开发准入审核通过，授权进入 S3.a（2026-10-23，覆盖下方旧 BLOCKED 结论）

**用户已明确批准修改开发阶段准入规则。** 审核基线：`0b8b96bf857b43e42087e7d621084326cffacbf1`，GitHub Actions [39876037722](https://github.com/Aides8Stack/GankSoft/actions/runs/39876037722) completed/success；scope、Ubuntu、Windows、pr-gate 全部 SUCCESS。Windows 日志确认原生/扩展 A/B 表格拖拽 PASS、完整表格拖拽 PASS、实际系统 PNG Clipboard + 可信 Ctrl+V PASS、30%/80% 图片资源与重开 PASS、受控离线资源 PASS；既有 57 项表格、11 项图片异步与 3 项原生文字粘贴仍在质量验证范围。当前未发现阻断 **S3.a 的已知自动化故障**。

**Gate 决议**：S2 开发/自动化准入 `DONE`；S3.a **获准启动**（仅计划与授权，不代表草稿、模式映射已经实现）。将前置人工 S2 全签核要求调整为 **正式编辑器对真实用户开放/生产启用前必须补验**：Win10/11 真实中文 OS IME（标题、列表、表格、撤销/光标/组合保存）、真实鼠标/剪贴板、失败恢复及离线；最终便携 ASAR/同包验收仍属 S9。以上均保持 `NOT_RUN`，绝不写成 PASS。若在 S3.a 开发期间出现影响数据正确性的明确缺陷，必须按原测试门禁修复，不因准入授权忽略。

`pr-trust` 当前为 failure，原因是该 SHA 尚未得到所有者可信审核；**它是 PR 合并门禁，不是 S2 代码测试失败，也不是 S3.a 开发阻塞。** 本次不代替所有者进行可信审核、不合并、不发布、不删除 Draft/分支。旧原生 TableNodeView 事务竞态仍保留负向复现；正式使用继续依赖已有公开适配保护。新文档提交不会把父 SHA 的质量证据冒充成新 SHA 的重跑。

### S3.a 最小开发范围（当前尚未实现）

1. 单卡单模式草稿：独立身份、CAS revision/epoch、失败保留、重开与取消不丢；草稿不得覆盖已发布版本及旧复盘历史。
2. question / QA / direct 三模式的六向首次内容映射：先定义受审查的字段映射与丢失信息的预览/确认；已发布目标内容优先保护。
3. 模式切换：预览 → 确认/取消，未确认不修改原草稿、模式、媒体引用；卡片集隔离与跨卡并发保护。
4. 独立分阶段测试：编码/业务 API/SQLite 事务/冲突/失败/重开/图片资源归属；只通过公开接口接编辑器，不重写表格/图片/原生 Clipboard。
5. 不提前实现 S3.b 的 publish/relearn、S4 调度、S6 导出、S7 全页面。人工 IME 验收在正式编辑器对真实数据启用前完成；不得将隔离 EditorSpike 或内存 adapter 当作正式草稿服务。

---

S1自动化Gate DONE：19ab62dfe806174060478ffdb05fe955bea223bd 的quality39726201464 Ubuntu/Windows/pr-gate/scope success，最新有效pr-trust status success（39730661706）。对应SHA已真实读取；无新增迁移完整性阻塞。真实旧RC、Win10/11、真实断电等仍NOT_RUN/BLOCKED；生产604保护不变，不自动升级真实库。

## 最新原生优先补记（2026-10-23）

c892378c094080c537e1017430b1957f75a60e4f / Run39810159802的Windows57/完整editor含11、系统Clipboard/离线均PASS，但launcher行拖缺drop，Windows/pr-gate FAIL。本轮普通文本交回原生Clipboard、移除假uploader，原生A/当前扩展B/完整产品同鼠标路径最终Linux PASS（1100×720/DPR1）；旧原生事务竞态仍FAIL控制，点击/DOM保护保留。新路径等待最终落点实际接纳dragover，不改生产拖拽实现。

新SHA Windows A/B及完整拖拽/新原生粘贴/launcher待既有CI；不能沿用前序PASS或把Linux当Windows恢复。真实Win10/11 IME/人工清单仍NOT_RUN，**S2 BLOCKED，S3不进入**。没有调整Gate。现有ADR逐项记录原生能力/保留适配/协议风险，单一证据S2-ADMISSION-EVIDENCE.json.nativePriority；下方历史准入报告按其标明的SHA适用。

## S2 当前准入报告（2026-10-22）

**S2 BLOCKED；现有 S3 准入条件未满足，S3–S9 NOT_STARTED。** 原Gate不调整。本表覆盖下方历史备注中的旧“Windows未运行/图片失败”状态；原未适配Crepe失败控制仍保留。

已核父SHA `e73f9e46ae62ce11c4d859a6bbeeb3e4b2a5ce68`：Run39796684980最终Windows/Ubuntu quality、pr-gate、scope全success；Artifact12434645198 Windows57、完整editor含11异步、启动恢复PASS。旧图片故障不再阻塞；pr-trust最新failure39796682060，由所有者按最新SHA处理。

| 编号 | 已满足的开发验证 | 当前仍缺 |
| --- | --- | --- |
| T05 | 精确父SHA Windows表格57/合成中文/undo/redo/Tab、异步11 PASS；当前工作树Linux57及原生鼠标行列拖拽PASS，公开update修复保持DOM | 新SHA Windows回归待CI；真实Windows中文OS IME标题/列表/表格、光标/选区/撤销/组合保存仍NOT_RUN，是S2关键阻塞 |
| T06 | 父SHA Windows注入读取边界后的真实媒体/30-80/进程重开PASS；当前Linux实际系统Clipboard API+可信Ctrl+V+两图30-80/保存重开PASS | 新SHA Windows实际系统剪贴板待CI；截图工具人工操作仍NOT_RUN；单MD/Base64正式交换属S6 |
| T07 | 父SHA及当前Linux数学/颜色/表格/图片序列化、完整JSON/测试adapter保存重开、失败重试PASS | Windows人工长文与格式签核仍NOT_RUN；正式Draft/ContentVersion接线属S3，不能把测试adapter当正式持久化 |
| T08 | 父SHA Windows安全/本地资源smoke PASS；当前Linux新profile断网负向对照、公式/字体/图片完整加载PASS | 新SHA Windows受控离线待CI；Win10/11物理断网/最终便携ASAR仍NOT_RUN，最终同包签核属S9，不替代S2 Windows本地资源验证 |

最小剩余动作：①读新SHA Windows三项平台检查及完整57/editor/launcher和质量/pr-gate真实结果；②Win10/11执行[S2-WINDOWS-ACCEPTANCE.md](S2-WINDOWS-ACCEPTANCE.md)最少六行人工清单，特别是真IME；③由所有者完成最新SHA可信审核，再评估S2 DONE。Runner语言环境探针只记录安装语言，未可靠驱动TSF/候选窗口，native-chinese-ime必须NOT_RUN。

如果延后真实IME验收到发布前，丢字/光标跳变/撤销不完整/组合期间保存半成品风险会随正式页面接入扩散；若延后系统图片/拖拽/脱网人工签核，也可能错过实际桌面交互与路径差异。是否调整Gate只能由用户明确决定；本轮未调整、未进入S3。阶段归属澄清不是Gate豁免。

本轮只有公开TableNodeView.update 7行保持同内容DOM的修复及必要测试工具。最终Linux系统剪贴板/原生鼠标行列拖拽/受控离线PASS，旧控制与夹具失败保留于[S2-ADMISSION-EVIDENCE.json](S2-ADMISSION-EVIDENCE.json)。沿原launcher接入现有Windows quality，无新增workflow，不以Linux结果冒充Windows或人工通过。

完整复现与证据见MARKDOWN-EDITOR-ADR、EDITOR-COMPONENT、TEST_REPORT及evidence/S2-*。本轮业务273/协议21及Electron4+5 PASS；表格自动化专项通过不能抵消真实IME/Windows等未验证项。只有补齐关键要求及精确新SHA远端门禁，才可重新评估S2是否DONE；本轮不进入S3。

| 阶段 | 最小可执行任务及依赖 | 可审查输出 / Gate | 验收编号 |
| --- | --- | --- | --- |
| S0 | 最新 develop/分支/PR/CI → 全文需求 → 源码字段/接口/架构审计 → 基线 | 4份基线/ADR/API/Gate 文档、schema实测清单、旧状态归档、新任务记录；仅文档 diff；npm ci/test/protocol/build/Electron smoke 真实账本；Draft PR+远程 SHA/Actions快照 | T01 |
| S1.a | 先核 S0最终SHA与CI，再 schema604 只读/合成 fixture 和备份预检 | 行/事件/媒体/FK fingerprint；未知schema、碰撞、损坏拒绝；无私人数据 | T02/T04 前置 |
| S1.b | 先 ADR字段和版本/ID方案，再增量 schema/codec/registry/adapter | cardId稳定、混合deck目标路径、单类型Draft与不可变版本/cycle/event约束；旧入口可用；不提前启用新评分/发布UI | T02/T03 |
| S1.c | 先核S1.b最终SHA双平台quality/pr-gate/pr-trust；补同事务旧写adapter/激活，重复迁移/中断/重开/备份适配 | schema604与新schema可恢复；历史评分/事件/媒体不变；原始历史缺失明确unknown；T02–T04通过才能S2 | T02–T04 |
| S2 | 独立 MarkdownEditor+Media POC；优先 Milkdown/Crepe，依证据取舍 | IME/离线/LaTeX/颜色/每图30%与80%/安全往返记录；决定编码与API。失败不得铺到全部页面 | T05–T08 |
| S3.a | S1与S2自动化开发准入DONE后实现单卡单模式草稿、模式切换确认与6向首次映射 | 取消不丢，确认清原draft，目标已有发布优先，正式类型不提前变 | T09–T12 |
| S3.b | 原子publish+默认不重学+剪贴板/Prompt | 重学才新cycle、旧史/版本保留；粘贴预览再覆盖；两Prompt范围独立默认关；退役内置AI调用并测拒绝/无请求 | T13–T15 |
| S4.a | 固定内容与cycle的会话+事件+幂等+评分/FSRS适配 | 边界分数/错高分/对低分合法；实际评级保存；旧版归档不覆盖新state；计时/跨页去重/恢复 | T16–T21 |
| S4.b | 单卡/全局参数和主动重算、双维掌握度读模型 | 不自动改due；preview确认；到期不延后；覆盖不变；当前cycle pending；知识不是调度对象 | T22，T27评估基础 |
| S5.a | 多根/正文模型/同级排序与Mind Elixir事件适配 | parent/order持久化、同级唯一/去环/跨deck拒绝；重开一致；空白pan不抢节点手势；不做根拖整图 | T23–T25 |
| S5.b | 合并/子树删除/恢复预览、事务/逆操作 | 正文/子树/关系/冲突均确认，缺父/同名人工处理，历史快照不改，父聚合cardId去重 | T26–T27 |
| S6.a | 标记MD正式语法ADR与parser/serializer | 正文标题/围栏/缩进代码/引用/转义/深度>6/LF CRLF/非法标记可逆或明确拒绝；不静默扁平化 | T28–T29 |
| S6.b | 预览导入/路径冲突/分支导出/媒体与双视图 | Base64/宽度/公式无损、默认保留、复制与保存同结果；MD右侧层级目录/左图挂载；IPC资源有界 | T30–T32 |
| S7 | 逐页面接线与密度/懒加载验证；依赖S3–S6 | UI以v3.7为参考，保留真实Vue；列表/单模式/历史分页/大图按需；返回/多标签/草稿/窄屏/focus tooltip | T33–T37 |
| S8.a | 全部新对象完成后扩完整恢复与独立追加 | 新旧schema/gank.json/ZIP分类；历史/FSRS/图片完整；同来源版本默认跳过，强制另导独立deck，所有内部ID映射 | T38–T39 |
| S8.b | 活动目录迁移与回收站最终整合 | WAL+媒体快照，源留存停写、目标唯一；断电/跨盘/中文路径/磁盘满/缺图可回滚；不悄悄回旧库 | T40–T42 |
| S9 | 全量回归/现有Windows便携流程验收/安全与交接 | CI同SHA真实核对，Win10/11同包实机签核；不以Linux/Runner代替；可审核PR，不自动合并/发布 | T43–T45 |

## 历史S1.c本地 T02–T04 证据（远端已由本轮收尾）

| 编号 | 本地实际覆盖 | 当前结论 | 未执行/进入下一阶段条件 |
| --- | --- | --- | --- |
| T02 | 604→606，两次no-op逐表/媒体指纹不变；两个独立副本身份一致；604/606完整备份/还原；原分数/空快照保留；旧API同事务投影/水位/回执、失败回滚和重开 | PASS（Linux合成库） | 新SHA Windows/Ubuntu quality/pr-gate和pr-trust待核；真实旧RC私人库NOT_RUN，不冒充合成样本 |
| T03 | 新deck保留旧kind标记但含question/qa/direct三卡；原deck映射不变；单草稿和版本独有图片随606备份恢复并经受控协议读取 | PASS（Linux合成库） | 不等于S3编辑/发布或S4评分已实现；当前SHA远端待核 |
| T04 | DDL/逐卡/逐事件/commit前异常+进程退出，9个协调点进程中断；SQLite源写锁/应用冻结、跨进程租约争用、epoch、真实目标EEXIST、注入ENOSPC、提交后响应丢失、目标丢失不回退；备份闭包缺图/清单错版本/约束损坏拒绝 | PASS（上述自动化范围） | 真实断电/磁盘耗尽/Windows目录fsync/Win10/11实机NOT_RUN；恢复过程中再崩溃的未知锁保守BLOCKED，不宣称电源级容灾完整 |

源marker/日志/指针/lease缺任一证据，不解除保护。真实用户库及生产启动未执行自动升级。下一轮仅先核本轮完整SHA门禁；任何失败/运行中停止并定向恢复。只有对应双平台quality/pr-gate/pr-trust成功且无新增完整性阻塞后，才能把S1自动化Gate记DONE并按用户授权进入S2 POC。当前不进入S2、不宣称整个S1完成。

## 每个阶段固定退出规则

1. 起始核对远程 HEAD/PR/前序 CI；取消/超时/失败/未运行分别记，失败先修；CI仍运行就报告待核实，不轮询。用户明确进入该阶段才实施。
2. 更新 docs/development/{PLAN,PROGRESS,HANDOFF,TEST_REPORT}.md 与 TASK.json；先归档不同任务，不覆盖既有历史。文档只写真实实现/设计/未完成/未验证。
3. 运行当前影响所需专项及 npm test/check:protocol/build，必要 smoke；缺环境记 NOT_RUN/BLOCKED。不得删/skip/弱化测试来达成Gate。
4. 审变更允许范围、隐私/产物/脚本与门禁；小提交、普通push、独立核远程SHA与Draft PR。Actions只取一次即时快照，未发现记PENDING_NOT_OBSERVED，不等结束。
5. 提交不能包含自身SHA：记录已知实现检查点，最终SHA从远程PR/head及git log解析。最多一次文档回执提交，不为写自身SHA无限提交；新SHA的CI必须重新即时查一次。

## 不允许进入下一阶段的条件

未知schema/身份碰撞、历史/图片不一致、无法验证备份、恢复不唯一、发布/回执状态未知、必要测试失败均阻断相应危险写入。只能做独立只读调查/保护数据，不能用清空重建或改发布流水线解锁。S0完成不等于新业务已实现；S9通过也不代表有合并/发布授权。
