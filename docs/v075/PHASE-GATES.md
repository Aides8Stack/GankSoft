# v075 分阶段 Gate 与最小任务

S0 本轮仅审计/ADR/测试基线/远程检查点；S1–S9 均 NOT_STARTED。本表不是 CI 发布授权。完整 T01–T45 原文保存在 TEST-MATRIX.md，需求原文见 FUNCTIONAL-SPEC.md。

| 阶段 | 最小可执行任务及依赖 | 可审查输出 / Gate | 验收编号 |
| --- | --- | --- | --- |
| S0 | 最新 develop/分支/PR/CI → 全文需求 → 源码字段/接口/架构审计 → 基线 | 4份基线/ADR/API/Gate 文档、schema实测清单、旧状态归档、新任务记录；仅文档 diff；npm ci/test/protocol/build/Electron smoke 真实账本；Draft PR+远程 SHA/Actions快照 | T01 |
| S1.a | 先核 S0最终SHA与CI，再 schema604 只读/合成 fixture 和备份预检 | 行/事件/媒体/FK fingerprint；未知schema、碰撞、损坏拒绝；无私人数据 | T02/T04 前置 |
| S1.b | 先 ADR字段和版本/ID方案，再增量 schema/codec/registry/adapter | cardId稳定、混合deck目标路径、单类型Draft与不可变版本/cycle/event约束；旧入口可用；不提前启用新评分/发布UI | T02/T03 |
| S1.c | 上一步实现后，重复迁移/中断/重开/备份适配 | schema604与新schema可恢复；历史评分/事件/媒体不变；原始历史缺失明确unknown；T02–T04通过才能S2 | T02–T04 |
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

## 每个阶段固定退出规则

1. 起始核对远程 HEAD/PR/前序 CI；取消/超时/失败/未运行分别记，失败先修；CI仍运行就报告待核实，不轮询。用户明确进入该阶段才实施。
2. 更新 docs/development/{PLAN,PROGRESS,HANDOFF,TEST_REPORT}.md 与 TASK.json；先归档不同任务，不覆盖既有历史。文档只写真实实现/设计/未完成/未验证。
3. 运行当前影响所需专项及 npm test/check:protocol/build，必要 smoke；缺环境记 NOT_RUN/BLOCKED。不得删/skip/弱化测试来达成Gate。
4. 审变更允许范围、隐私/产物/脚本与门禁；小提交、普通push、独立核远程SHA与Draft PR。Actions只取一次即时快照，未发现记PENDING_NOT_OBSERVED，不等结束。
5. 提交不能包含自身SHA：记录已知实现检查点，最终SHA从远程PR/head及git log解析。最多一次文档回执提交，不为写自身SHA无限提交；新SHA的CI必须重新即时查一次。

## 不允许进入下一阶段的条件

未知schema/身份碰撞、历史/图片不一致、无法验证备份、恢复不唯一、发布/回执状态未知、必要测试失败均阻断相应危险写入。只能做独立只读调查/保护数据，不能用清空重建或改发布流水线解锁。S0完成不等于新业务已实现；S9通过也不代表有合并/发布授权。
