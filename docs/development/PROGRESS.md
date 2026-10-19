# 权威执行进度

记录日期：2026-10-19；仓库 Aides8Stack/GankSoft；分支 feature/unified-image。
初始源码基线：a0fb65d89b7273c6f06beb763e66b3c4d1899a05。阶段编号与 PLAN.md 一致；AUDIT 初审不等于 P1 完成。

## M0 — 开发管理初始化
- 目标：建立跨任务记录、检查点与恢复规则。
- 状态：DONE（仅 M0 管理机制；代码实现 P1—P6 尚未开始）。
- 已实现：根规则、实际审计、阶段计划、状态记录、交接入口、测试账本；保留既有 README/.gitignore/全部业务源码。
- 修改文件：新增 AGENTS.md；docs/development/{AUDIT,PLAN,PROGRESS,HANDOFF,TEST_REPORT}.md。没有业务代码变更；没有配置 CI。
- 实际测试：T01 原边界检查 PASS；T02 六文件文档/空白/变更文本秘密模式检查 PASS；T03 初始化提交 tree/父链/远程分支读回 PASS，详见 TEST_REPORT。
- 尚未验证：npm 依赖测试/构建/Electron、Windows10/11；全仓秘密扫描；PR 创建。
- Commit SHA：d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae（初始化）；本回执提交用 Git 历史解析，不在自身内容中填写自身 SHA。
- 已推送 GitHub：是（已通过 GitHub API 非强制更新并独立读回确认 d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae）。
- 下一步：P1：在完整 checkout 中补齐图片全调用审计、IMAGE_DESIGN.md 与 npm ci/npm run check 基线；保留当前管理机制，不重新初始化。

## 后续业务阶段（本轮均未实施）
| ID / 名称 / 目标 | 状态 | 已实现 / 修改文件 | 实测 / 未验证 | Commit / 推送 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| P1 完整审计与设计基线 | NOT_STARTED | 无；已有初审见 AUDIT | 未执行完整基线；全链路待审 | 无 / 否 | 完整检出、安装、验证基线、IMAGE_DESIGN |
| P2 统一图片契约 | NOT_STARTED | 无 | 新协议测试未运行 | 无 / 否 | 等 P1 设计通过 |
| P3 持久化与快照 | NOT_STARTED | 无 | 数据完整性测试未运行 | 无 / 否 | 等 P2 |
| P4 编辑和显示统一 | NOT_STARTED | 无 | UI/重开测试未运行 | 无 / 否 | 等 P3 |
| P5 交换和恢复 | NOT_STARTED | 无 | 往返/故障回归未运行 | 无 / 否 | 等 P3/P4 |
| P6 回归和 Windows 验收 | NOT_STARTED | 无 | 全量与两系统实机未运行 | 无 / 否 | 等 P5 |

新增记录保留真实失败、阻塞和已完成阶段；补记被测 SHA 与检查点 SHA 的区别。WIP 记录部分实现和准确继续位置，禁止为了结束任务改为 DONE。

## 保存回执
初始化提交 d743c10c09c4e1bbd57d2749f8665fd5dae8c9ae 已确认位于远程 feature/unified-image；父提交为 a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
递归树由 323 个原文件变为 329 个，六份文档新增，原文件 SHA 全部保持；main/develop 保持基线。
本回执是追加文档提交；最新 HEAD 从远程读取，不把初始化 SHA 宣称为永远最新。

## I0 — 通用基础设施升级
状态：DONE（基础设施自动验收完成）；图片 P1—P6 仍 NOT_STARTED。
已实现：通用 AGENTS/STANDARDS、task:init 归档与分支校验、quality 双平台门禁、Windows 便携包/安装器/安装启动卸载/来源与 SHA-256 脚本。
本地验证：npm ci、npm run check（198 全量 + 21 协议测试、边界/类型/前后台构建）、4 项基础设施测试 PASS。完整 ASAR/GUI 与缺原生插件故障隔离 PASS。
实际 GitHub CI、Windows Runner 和安装器测试尚未验证；不能称流水线部署完成。
前序远程检查点：27d39307d9581334f906e02b2a62db85fe8f4cfc。后续验证回执补记实际提交、run 和 PR。

I0 验证更新：两平台 quality 通过（run39214134268），故障分支远程阻断验证通过（run39214033112）。Windows 交付链路仍执行中；PR#1 已创建、未合并。详见 TEST_REPORT，不能把仅实现阶段改为全部 DONE。

Windows 包发现并修复中文清单默认编码缺陷；新增 1 项 Python 中文 ZIP/哈希回归 PASS。Windows 交付整体仍待修复后实际重跑，不标 DONE。

## I0 最终状态（当前权威入口）
DONE：通用规范、任务归档、双平台门禁、Windows自动构建/GUI/安装/卸载、ZIP/来源/校验值，以及真实失败阻断已完成并验证。
被测feature源码32ff1725c7a7726f6e990e2c0ccad7886ba32646 /run39215579198，独立infra源码ef976d707bb4f042e2d24f74654044bd528365bb /PR run39215634338，均全部SUCCESS。安装包和证据详见 TEST_REPORT.md 最终回执。
PR#1待用户审核，未合并；main/develop仍为a0fb65d8。Windows10/11人工NOT_RUN，保持TEST_RC。图片P1—P6未开始，本轮没有业务改动。
新任务：先核实远程HEAD/工作区，读取STANDARDS和TASK；新分支从用户指定的已批准基线创建并归档初始化任务文件。继续当前图片任务须以用户新需求为依据，从保留的P1计划开始，不重做I0。当前文档检查点从远程Git历史解析，不把前序被测SHA当作永远最新HEAD。


## A0 本轮权威状态
A0 DONE（审计与基线），A1—A6 NOT_STARTED。已读上传主指令与设计/验收清单；完整调用图和状态表见 IMAGE_DESIGN.md。198测试和21协议测试、边界/类型检查PASS；补齐原始二进制后build PASS。前序检查点a39a7da。下一步A1不可变资源、引用查询、暂存恢复及测试。


## A1 资源基础设施
状态DONE。新增media/repository.ts、references.ts、service.ts；文件/剪贴板及交换导入统一createMediaAsset；原图按SHA256去重，实例ID仍独立；引用查询以assets/草稿/历史为真源，取消草稿不删字节，绑定卡片消费草稿引用；回收站保护共享草稿。main.openService恢复日志；未提交文件启动补偿，明确失败的导入立即补偿。资源元数据使用settings命名空间，没有修改数据库版本或IPC契约。新增tests/media-resource.test.ts七项PASS；npm run check全205/205及协议21/21、边界/类型/构建PASS。曾发现原导入失败测试要求即时补偿并已修复，未削弱测试。前序检查点38df8a8；本阶段提交由远程历史解析。下一步A2节点布局/独立缩放；A2—A6 NOT_STARTED。


## A2 图片节点与独立缩放
状态DONE。shared/protocol/image-node定义严格布局（64—2400px、对齐、fit），shared/image-node为公共出口；instances服务按实例ID保存布局并富化读模型，当前卡片/题目快照保留instanceId和assetId。ImageNode实现四角等比缩放、精确尺寸、对齐、原图预览和容器约束；ImageAttachments提供每图布局、50步撤销重做；QuestionEditor贯通保存。布局元数据存settings image-layout:id，不改变原图/其他实例。两项新增单元/集成测试PASS；全量207/207及协议21/21/边界/类型/构建PASS；Electron smoke-v072含新增真实拖拽、尺寸输入、独立性、对齐、撤销重做和容器适应PASS。前序检查点61ca5f2。A3—A6 NOT_STARTED；旧学习显示/作答历史/交换还需后续接入，不能标整模块DONE。


## A3 现有图片入口贯通
状态DONE（现有图片能力范围）。学习StudyWorkspace、备用ReviewWorkspace、QuestionLibrary、记忆工作台的已有迁移图片、复盘历史统一ImageNode只读渲染；移除学习/列表共享宽度滑块。作答responseImages允许结构化id/layout，草稿保存校验归属、重复和布局，提交快照与历史读模型保留独立尺寸；继续读取原ID数组。不同编辑区的撤销只作用于自身用途。208/208全量、协议21/21/边界/类型/构建及完整smoke-v072 PASS，含512px作答图冻结并写入历史。前序0c3cf0f；A4—A6 NOT_STARTED。限制：当前选项/记忆编辑器为纯文本，尚未新增它们的富文本/图片编辑能力；本轮没有擅自替换编辑器，该扩展不能被当作已完成。


## A3b 选项和记忆卡图片扩展
状态DONE。增加schema605迁移：question assets允许option-A—D；memory_assets保存记忆提示/内容图片引用。资源和布局服务复用；记忆卡读取、详情、学习、编辑、历史快照和回收站引用保护已贯通；选项A—D编辑/只读显示已贯通。布局调整不重置学习版本；新增/删除媒体内容才失效学习证据。209全量及21协议/边界/类型/构建PASS；Electron真实新增记忆图420px、选项A图264px保存并学习显示PASS。此前A3的纯文本限制已由本阶段解除，文本仍保留，不更换编辑器。A4—A6 NOT_STARTED；新角色/记忆图的交换和严格恢复校验仍是A5待办。

## 恢复后验证（当前权威状态）
目标feature/unified-image-recovery，已保存64f7e3a；A0—A3b沿用，A4—A6 NOT_STARTED。恢复后npm run check PASS（209项全量，含21协议项；协议重跑、边界、TypeScript、构建通过）。UI首次FAIL：列表刷新时行内学习按钮可点击而start忽略；补齐disabled后build和完整smoke-v072 PASS（25组，含记忆420px、选项264px、作答历史512px）。不削弱测试。原恢复基线两平台quality SUCCESS，Windows包验证读取时IN_PROGRESS。Win10/11人工NOT_RUN。下一步A4。
