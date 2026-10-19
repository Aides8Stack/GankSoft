# 统一图片模块分阶段计划

本计划依据 AUDIT.md 所述实际基线；本轮仅实施 M0 管理机制，图片业务阶段均未开始。
目标：每张图片可独立调整显示大小，并在编辑、只读显示、保存、重新打开、草稿/历史、导入导出与完整备份之间一致；不改变原图像素或把查看器临时 zoom 当作已持久保存。
一个阶段通过并保存检查点后再推进依赖阶段；每次任务不要求完成整张计划。

| 阶段 | 依赖 | 范围与预计模块 | 实际测试方法与验收条件 |
| --- | --- | --- | --- |
| M0 开发管理初始化 | 无 | AGENTS、development 文档；审计 ignore/CI | 管理文档检查、原有边界检查、远程 diff/父链/分支读回；无业务改动并能从 GitHub 恢复 |
| P1 完整图片审计及基线 | M0 | 检索全部 img/附件调用，services、registry/data/models/codec、main/gateway、media/questions/review/sessions/import/export/backup、CSS、既有测试；输出 IMAGE_DESIGN.md | 完整 checkout；npm ci；npm run check；必要原图片 smoke。绘出全部数据流，列 API/旧入口使用情况及基线结果；依赖故障记 BLOCKED。不得伪称初审等于完成 |
| P2 公共图片协议与纯函数 | P1 | 确定图片资源与显示引用边界、每次出现的唯一引用、单位/默认/上下限/比例/容器适配；shared 模型/schema/codec；设计旧协议处理 | 新增有效/非法/缺省/边界/编解码往返测试；check:protocol、类型和原调用回归；修改契约必须有可运行配套，不能提交破坏现有调用的半成品 DONE |
| P3 后台持久化闭环 | P2 | SQLite schema、media/drafts、questions/content/save、workspace 读模型、会话/复盘快照和事务；必要 API 适配 | 服务/协议/数据库测试；A图调宽不改变B图/其他卡片，保存重读一致，草稿恢复、历史隔离、CAS/失败回滚/幂等、跨集拒绝；npm run check |
| P4 统一图片编辑与显示组件 | P3 | ImageAttachments/ImageViewer、独立显示组件或 composable；QuestionEditor、ReviewWorkspace、实际 Study/列表/历史调用者和 CSS | 每图独立控制、键盘操作、只读显示、适应容器、原图查看；保存/关闭重开一致；Electron UI smoke、build 和必要旧交互回归；记忆卡扩展需另确认范围 |
| P5 内容交换及完整恢复 | P3、P4 | imports/protocol/service/container、export、backup/integrity/containers；协议文档和例子 | gank.json、gank.zip、卡片集导出导入及完整备份分别 round-trip；原图哈希和每图尺寸保持；缺图/非法尺寸/重复引用/中断恢复/跨集隔离/历史一致；独立合成库，禁止真实用户库 |
| P6 全量回归及 Windows 验收 | P5 | tests/tools、API-INDEX、契约导出、设计/使用文档；打包验证 | npm run check、smoke、smoke:v071、build后 smoke-v073、test:package；Windows10/11 各自同包真机签核及必要新增图片用例；未真机完成保持 RC，不标整阶段 DONE |

## P1 必须形成的设计决策
- 缩放是显示元数据还是新资源操作；同一资源不同出现位置的独立性、编辑权限和历史不可变性。
- 默认宽度/单位/上下限/等比与容器收缩语义（此处不预先硬编码为某个方案）。
- 删除、排序、角色变更、保存失败/取消、草稿回收、历史图片和原文件生命周期。
- 新协议/数据库版本及不兼容时的明确拒绝或迁移行为；新版导入导出和完整恢复不可省略。
- 所有 public API、读写映射和边界；移除旧路径须有调用搜索和回归证据。
- 新增测试的准确文件/命令。阶段间如发现紧密依赖，可先调整本计划并说明原因，但不能扩大为一次性重写。

## 共同验收矩阵
至少两张题图、两张解析图、两张作答图；A/B 独立；跨卡/跨集/相同资源引用隔离；合法边界/非法输入；
保存重开、草稿中断恢复、历史查看、交换导入导出和完整恢复均覆盖。
性能/权限/缺插件、原生文件对话框、系统剪贴板、DPI 和 Win10/11 项须标明真实环境；合成注入不得伪称平台实测。
尚未执行的开发、设计和测试在 PROGRESS/TEST_REPORT 保持各自状态。

## I0 — 跨分支基础设施升级（2026-10-19）
本次仅开发规范与自动化，不推进 P1—P6 业务。
1. 审计固定远程 27d39307d9581334f906e02b2a62db85fe8f4cfc、下载并逐 blob 校验：已完成。
2. 通用规范、非破坏任务初始化、双平台门禁和 Windows 测试安装包链路：已实现，验证中。
3. 本地基线与基础设施测试、实际 Actions、独立基础设施 PR：按账本记录，不以 YAML 替代执行。
4. 验收：原业务文件不变；失败停止且保留日志；新分支隔离；测试包可追溯；PR 不夹带图片业务；main/develop 不改。
