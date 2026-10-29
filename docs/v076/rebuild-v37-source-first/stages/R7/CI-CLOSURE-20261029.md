# CI 一次性收口（2026-10-29）

基线 `e3b91d4f4df97d23a2005031790e4e196313c94a`，原分支 `feature/v075-unified-learning-workspace`，原 Draft PR #15 → develop。两个本地修复检查点完成后一次普通推送；不等待新 CI，不进入 R7.5/R8。当前最终检查点由 Git 历史及远端包含关系解析。

## 检查点 A：M08 启动契约和诊断

失败 CI 40810266737：Windows 的 Electron 44.9.1 环境预检已经 PASS，M08 子命令仅留下 `spawnSync ... node.exe ETIMEDOUT`；没有 report.json，无法从旧证据判断首窗口是否出现。精确核对源码可确定：旧脚本 prepareAndActivateUnified 生成迁移控制目录，正式 main → openService → prepareFreshUnified 必然拒绝没有 fresh606.json 的目录（FRESH606_INCOMPATIBLE）；旧错误对话框可能令无人值守进程持续等待。不能把这一静态结论冒称旧运行的原生对话框已被实测观察。

现在先在独立迁移 owner 中验证 12 张历史/FSRS 表及 rowid 原样保留、历史 FK、foreign_key_check 和生产 fresh606 准入拒绝；不启动迁移目录的正式 UI，不写入伪造初始化标记。已有 tests/m08-integrity-v076.test.ts 的迁移、原始记录、回滚、历史锚点、备份恢复和重启等 18 项全部保留并实际重跑 PASS。

正式 UI 的六组独立使用 prepareFreshUnified 真正生成的606环境。种子通过现有 session/typed API创建卡片集、知识点、发布、关联与真实复盘/FSRS；共享图片复用 stageImage。仅合成来源存档和未知恢复记录在独立测试 owner 中写入，关闭后才启动正式 main，生产源码和准入策略未改。fresh606.json 在启动前后字节一致。旧 fault-linked 历史锚点仍由上述迁移专项保护；fresh606 无旧 attempts FK 时验证无残留身份，而非为通过测试虚构旧数据。

六组覆盖：正式启动与原始复盘/FSRS；鼠标取消全表/附件零写；知识点及两版本存档实际永久删除且保留共享图片/历史；未知共享引用显示具体阻断并零写；混合复盘仅移除所选卡且保留幸存卡思路/结果/FSRS；正常关闭、独立 PID 重启及全表/全部附件精确读回。均走真实 Electron 窗口、生产 Vue、preload 和 IPC。

诊断：阶段变化同步持久化 report.json，每5秒写 heartbeat/输出当前阶段；启动20秒、首窗口15秒、控件10秒、总执行150秒、关闭8秒均有限。测试观察宿主记录 ready/window-created/load/load-failed/renderer-gone，保存主进程stdout/stderr；仅在测试宿主将启动错误对话框转为日志和失败退出，正式 main 未更改。超时强制终止所属进程树，关闭失败也独立尝试夹具清理。Windows 不加 Linux 参数。下载与环境预检代码、超时均未修改。

Linux 本轮真实六组 6/6 PASS；Windows 本轮真实执行 **0/6，NOT_RUN**（当前为 Linux）。M08 Windows Gate 仍 BLOCKED，不能用 Linux 结果替代。详见 evidence/ci-closure-20261029/m08-report.json 与进程/阶段日志。

本地首次补验暴露并修正测试夹具/观察宿主问题：复盘提交前的自评/反思必须与草稿一致；生成 CJS 的换行需要转义；fresh606 无旧 attempts 外键时不应要求保留孤立旧身份。修复后完整六组已重跑，未修改业务实现。

## 检查点 B：旧 ASAR 断言集中分类

13 套均含重要业务保护，故不整套撤销，仍为 **13套/107个当前语义场景**；这是场景数，不是内部 assert 数。四个混合场景重命名，测试契约同步更新。旧证据原样保留为历史，不能与本轮新契约混用。淘汰清单及替代保护也以 RETIRED_UI_ASSERTIONS 导出；自测约束契约身份、淘汰清单和两处旧颜色同时退出。

| 套件 | 保留保护 / 分类决定 |
| --- | --- |
| smoke-v060 | API桥、问题/记忆复盘实际提交，保留 |
| knowledge-picker | 层级关联、多选、新建、取消、跨集隔离，保留 |
| knowledge-filter | 后代/any-all、只读树、保存筛选、卡片零变更，保留 |
| mind-workspace | 拖动只读、blur释放、草稿/层级保存、重排持久化，保留；浮层边界关系用于可操作性 |
| import-cards | ZIP/JSON/BOM/中文路径/分页、重复导入、隔离和取消，保留 |
| study-pages | 计时/暂停、会话复用、重载草稿、关闭不复活，保留；删除 home标签宽度≤44 |
| v066 | 跨页返回原复盘/结果/计时、分析隔离、历史记录和管理器关闭，保留 |
| v070 | 日期、编辑/自动保存/撤销/快捷键、冲突阻断、移动卡片历史、正常关闭保存，保留；同时删除两处 --bgcolor=#f8faf7、48px头部与58px导航断言 |
| v071 | 设置/主题持久化、AI无凭据/废弃命令拒绝、回收站、导出ZIP/导入取消，保留；删除48px头部、设置图标换行与固定8行要求 |
| v072 | 筛选、抽样确认、图片原子保存/失败零写、剪贴板兼容、冻结复盘、分页/返回滚动，保留 |
| v073 | 配置权威保存、未保存拦截、FSRS字节不变、条件撤销，保留 |
| system-v060 | 图片解码、交换、备份恢复epoch、回收站、取消/操作日志，保留 |
| native-failure | 缺解码插件时隔离、无写/无未决操作、备份仍可用，保留 |

固定色值不再作为通过条件；主图双击/调整浮层、选择器节点可见、关联保存/移动历史仍严格验证。其余12套已静态检查同类值，移除上述纯外观值；不能因为旧DOM是操作定位器就删除其唯一业务保护。节点拖动、可点击/不遮挡、主题配置和持久化等有意义交互继续必需。正式606 ASAR 9组仍先执行，retained604 结果不能冒充正式606覆盖。

package-check 对独立 retained 套件一次收集全部失败，再以非零退出阻断聚合；FAIL 时保留实际失败清单和证据，去除原先无条件填写的逐项 passed字段。成功报告包含必需/实测套件及场景数、淘汰明细、原ASAR/脚本/契约哈希及真实完成标记。底层 nonce、来源/目标绑定、完成标记与父验证器未弱化。

## 实际补验与边界

- 构建 PASS；正式 P1 7个检查 PASS（空/合成606各三宽和真实会话恢复）。
- 正式606 ASAR 9/9，retained604 13/13套、107/107场景，FAIL列表为空；一次完整 package-check 退出0。
- M08领域专项18/18；新/原证据契约21/21；CI core 5/5；生产隔离262模块/410产物 PASS；源码/工作流/Electron安全扫描 PASS；diff校验 PASS。
- 完整 test:pipeline：180 PASS、3 FAIL。根因是既有冷安装测试使用离线 npm ci 时缓存缺失 zwitch-2.0.4.tgz（ENOTCACHED）；其父测试及依赖安装后的后续worktree测试随之失败。记录真实 FAIL，不修改该测试、不反复安装、不把先前CI同测试PASS当本轮PASS。失败CI40810266737的双平台test:pipeline均已PASS，此为本地缓存条件差异。
- 原有效562项业务及S8.b历史证据继承；本轮没有重复全量业务/数据库开发。未改版本号/锁文件、正式源码、下载方案、CI矩阵或pr-trust。
- Windows六组、Windows人工/IME/物理剪贴板仍 NOT_RUN。只有新CI真实Windows6/6且质量阻断解除，下一Work直接执行既有R7.5-ENTRY.md精简验收，不重审R0–R7，不重做数据库。

精简文本证据在 evidence/ci-closure-20261029/manifest.json；被测为基线工作树，记录各源文件哈希，不把基线SHA单独当最终源码。截图仅本地诊断，不上传二进制。

公开stderr副本已移除本地调试器WebSocket会话地址。自动审批审查曾拒绝原始地址披露，已采用脱敏替代；原始运行日志仅留本地。结果、断言与完成标记未改。
