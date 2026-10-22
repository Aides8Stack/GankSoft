# v075 分阶段 Gate 与最小任务

S1自动化Gate DONE：19ab62dfe806174060478ffdb05fe955bea223bd 的quality39726201464 Ubuntu/Windows/pr-gate/scope success，最新有效pr-trust status success（39730661706）。对应SHA已真实读取；无新增迁移完整性阻塞。真实旧RC、Win10/11、真实断电等仍NOT_RUN/BLOCKED；生产604保护不变，不自动升级真实库。

S2 BLOCKED：本轮公开TableNodeView/$view扩展的表格交错57/57和完整组件smoke通过，原生未适配7.22.3仍保留mismatched transaction失败控制；T05真实OS IME/Windows编辑器及其余未验证项仍NOT_RUN，不最终选型/不接正式页面，不满足S3准入。S3–S9 NOT_STARTED。以下S1.c历史表中的“待当前SHA”只反映当时，现以本节收尾为准。本表不是合并或发布授权。

S2最终验收补记（2026-10-22）：326572b6e46982ac74223547874956ee7f967a28双平台quality/pr-gate成功，latest pr-trust failure→39776475352；本机Linux，Windows专项与6项真实操作NOT_RUN，不能记DONE。人工入口/清单见[S2-WINDOWS-ACCEPTANCE.md](S2-WINDOWS-ACCEPTANCE.md)。本轮仅测试工具、同源字体输出与失败日志路径修复，Linux57/集成smoke/工具自检通过；T05–T08总体BLOCKED，S3不进入。

## S2 当前专项门禁

| 项目 | 实际结论 | 阻塞与下一验证 |
| --- | --- | --- |
| T05 | 自动化PASS；总Gate BLOCKED | 公开NodeView扩展57/57，集成标题/列表/表格合成中文undo/redo、Tab/ShiftTab通过；真实OS IME/Windows编辑器NOT_RUN。原生未适配失败证据保留，不以局部PASS替代真IME |
| T06 | PASS（注入平台读取后的真实IPC/资源及30/80重建/进程重启） | 系统剪贴板、单.md Base64往返NOT_RUN |
| T07 | PASS（数学编辑、颜色/格式/图片编码及SQLite JSON fixture） | 正式Draft/ContentVersion写接线未做；单.md Base64未做，不能冒充S3/S6 |
| T08 | PASS（Linux受测离线/本地资源/六种安全拒绝、多实例） | Win10/11脱网便携与编辑器ASAR资源NOT_RUN；本轮Linux全场景PASS；Windows与实机NOT_RUN，S2仍BLOCKED |

完整复现与证据见MARKDOWN-EDITOR-ADR、EDITOR-COMPONENT、TEST_REPORT及evidence/S2-*。本轮业务273/协议21及Electron4+5 PASS；表格自动化专项通过不能抵消真实IME/Windows等未验证项。只有补齐关键要求及精确新SHA远端门禁，才可重新评估S2是否DONE；本轮不进入S3。

| 阶段 | 最小可执行任务及依赖 | 可审查输出 / Gate | 验收编号 |
| --- | --- | --- | --- |
| S0 | 最新 develop/分支/PR/CI → 全文需求 → 源码字段/接口/架构审计 → 基线 | 4份基线/ADR/API/Gate 文档、schema实测清单、旧状态归档、新任务记录；仅文档 diff；npm ci/test/protocol/build/Electron smoke 真实账本；Draft PR+远程 SHA/Actions快照 | T01 |
| S1.a | 先核 S0最终SHA与CI，再 schema604 只读/合成 fixture 和备份预检 | 行/事件/媒体/FK fingerprint；未知schema、碰撞、损坏拒绝；无私人数据 | T02/T04 前置 |
| S1.b | 先 ADR字段和版本/ID方案，再增量 schema/codec/registry/adapter | cardId稳定、混合deck目标路径、单类型Draft与不可变版本/cycle/event约束；旧入口可用；不提前启用新评分/发布UI | T02/T03 |
| S1.c | 先核S1.b最终SHA双平台quality/pr-gate/pr-trust；补同事务旧写adapter/激活，重复迁移/中断/重开/备份适配 | schema604与新schema可恢复；历史评分/事件/媒体不变；原始历史缺失明确unknown；T02–T04通过才能S2 | T02–T04 |
| S2 | 独立 MarkdownEditor+Media POC；优先 Milkdown/Crepe，依证据取舍 | IME/离线/LaTeX/颜色/每图30%与80%/安全往返记录；决定编码与API。失败不得铺到全部页面 | T05–T08 |
| S3.a | S1/S2通过后实现单卡单模式草稿、模式切换确认与6向首次映射 | 取消不丢，确认清原draft，目标已有发布优先，正式类型不提前变 | T09–T12 |
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
