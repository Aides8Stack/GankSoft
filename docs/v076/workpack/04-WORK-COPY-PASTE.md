# 可直接复制给 Work 的首条指令

我授权继续 GankSoft v0.7.6（小版本）的 **OPEN-ME-v3.7.html 原型直实施 UI 改造**，不是复用旧的 0.7.5 交付结论，也不是重新设计一套相似 UI。

我已上传 `GankSoft-v076-UI-v3.7-GitHub-Workpack.zip`。先严格读取根目录 `00-START-HERE-WORK-v076.md`，然后读取 GitHub 仓库 `Aides8Stack/GankSoft` 开发分支 `feature/v075-unified-learning-workspace` 的 `docs/v076/WORK-PLAN.md`、`docs/v076/GITHUB-RECORDS-AND-ACCEPTANCE.md`、`docs/v076/STATUS.md`，以及 `AGENTS.md` / `STANDARDS.md`。

该分支已经保存开发版本 `0.7.6-rc.1` 的 package 与 lock 根版本（检查点 `06c342dbe421b0ef721aefd08d8e4632e0a5d93d`，以 GitHub 最新实际 SHA 为准）；正式 `develop` 仍保留 0.7.5，不得直接覆盖受保护分支。

先从仓库读取原版 `docs/v075/reference/OPEN-ME-v3.7.html`，运行工作包中的哈希校验脚本，按其视觉设计真实落地 Vue/Electron Schema 606。保留后续确认的窄图标栏、卡片集工作台、图谱全屏与连续图标工具栏、普通节点拖动、右侧 MD 层级大纲。严禁简化成两个卡片+默认按钮的粗糙首页，严禁模拟数据/静态原型充当实际软件。

连续实施 P0–P6：学习总览、卡片集概览与列表、编辑器、复盘、分析、知识图谱、设置回收站及正式 Windows 验收。**每个阶段必须将全部有效的开发源码、设计决策、阶段计划和进度、测试脚本、测试结果、经脱敏的真实 Windows 中文截图同步推送 GitHub，写入 `docs/v076/stages/PX/` 并更新总状态。每次推送后要重新从远端读回并提供完整 SHA。** 不能只保存在 Work 本地或短期 Actions Artifact。

保留 Schema606、FSRS、旧数据、Milkdown/Crepe 和已通过业务功能；不扩大数据库改造，不删除/削弱原测试，不追加首次启动下载，不恢复取消的外部数据库功能。

**没有正式 Windows Electron EXE 的逐页中文截图与 v3.7 对照，不得宣布 UI 完成。** 未测明确 NOT_RUN。连接中断/额度不足先保存远端 checkpoint 与完整恢复说明。不得强推、绕过信任审核、自动合并 PR、发布 Release。