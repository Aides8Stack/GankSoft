# R6 — 设置、回收站、备份与全局交互：验收

**阶段：DONE（2026-10-28）。全部本阶段必需Gate PASS。** 原分支/PR15 Draft→develop。

| 编号 | 验收标准与结论 | 状态 | 证据 |
| --- | --- | --- | --- |
| R6-01 设置内入口 | 9分类、返回保留、焦点/空态/错误重试/离页保护；回收站仅设置内部，三宽可用 | PASS | [设置4组](evidence/settings-final/attempt-3.json)、[全局3组](evidence/global/attempt-0.json)、[视觉](evidence/visual-final/attempt-4.json) |
| R6-02 调度参数 | 继承/独立来源，保存不改现有排期；重算预览/二次取消零写、只提前、逾期/独立保护、撤销与重启精确读回 | PASS | [正式5组](evidence/schedule/attempt-4.json)、[领域14项](evidence/checks/schedule-domain.txt) |
| R6-03 回收恢复 | 卡片/卡片集/整棵知识子树；同名/缺父、媒体/关联保护、取消/回滚/重复请求/新PID | PASS | [正式7组](evidence/recycle/attempt-1.json)、[相关21项](evidence/checks/recycle-domain.txt) |
| R6-04 备份恢复 | 完整恢复与606独立合并明确区分；影响计数/ID重映射/来源版本去重/原历史和FSRS/媒体保护/失败一致/原ID+epoch核对/新PID | PASS | [正式9组](evidence/backup-merge/attempt-4.json)、[存储42项](evidence/checks/storage-domain.txt)、[公开入口2项](evidence/checks/public-merge.txt)、[来源合同15项](evidence/checks/source-contract.txt) |
| R6-05 目录迁移 | 当前路径/可写与空间预检；占用/取消/源变化不切换；复制校验后切换/原库与用户文件保留/新PID | PASS | [正式6组](evidence/relocation/attempt-0.json)、[相关16项](evidence/checks/relocation-domain.txt) |
| R6-06 相关回归 | 真实Electron→typed IPC→606；110相关项、协议21/157方法、build；三宽30图/45对照及最终设置6图 | PASS | [指纹/汇总](VERIFICATION.json)、[build](evidence/checks/build-final.txt)、[协议](evidence/checks/protocol.txt)、[视觉差异](VISUAL-DIFFERENCES.md) |

VISUAL（R6范围）、UI_INTERACTION、IPC_API、BACKEND_INTEGRATION、PERSISTENCE_RESTART、NEGATIVE_SECURITY、REGRESSION、GITHUB_REMOTE_SAVE：PASS。源码/测试/截图/日志完整检查点`fec06b70b1c1cf54153e8b5b5031f5f090b5c985`，tree `858ee26507fb7badfe68fe94a05134156ffc69fa`与本地索引一致，PR真实HEAD/关键文件/恢复入口已独立核验。当前DONE文档自身SHA由Git历史和远端读回解析。

冻结HTML未改，常规及空回收状态可比；真实调度/数据表单比演示内容长，滚动条与1250px居中按精确公式核验，功能扩展差异见VISUAL-DIFFERENCES。此PASS不冒称全应用逐像素一致。

全部危险操作复用既有服务/协调器/事务/回执，未重建Schema606/FSRS。新storage.merge仅606独立副本，旧storage.append/604外部转换仍关闭；同ID不覆盖、复制学习历史与FSRS，不存在往现有卡片追加历史的公开路径。没有因回收/恢复/迁移损坏发布内容、历史、关联或媒体，没有清理活动数据库/租约/用户文件。原始FAIL及上传审批/连接事件保留，未削弱必要断言。

全应用严格视觉/跨页集成/R1遗留归R7，Windows10/11/中文IME/物理剪贴板/同包便携归R8，均未在本Work执行，保持NOT_RUN。R6已完成并结束，下一Work从R7恢复；不等CI、不新分支/PR、不强推/合并/发布。
