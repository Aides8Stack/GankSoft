# 统一图片模块：本轮审计和设计

固定审计版本：a39a7da631a34b7f534a36bc46079abe1716f773；2026-10-19。
本地是经 Git blob 哈希验证的源码快照，不是 Git clone；没有本地分支/HEAD。使用仓库授权的 GitHub API 检查点流程，不新建或重置目标分支。
远端 feature/unified-image=a39a7da；develop=c8db715（PR1已合并）；main=a0fb65d。旧交接中的“PR1未合并”已失效。目标保持 feature/unified-image，不自动合并或发布。

## 真实调用图
- 图片输入：ImageAttachments → services.media.stage → registry media.stage → preload gank:protocol → main.stageOperation → media/drafts.stageImage → infrastructure/images.validateImage → @napi-rs/image。
- 卡片保存：QuestionEditor → services.question.save → registry content.question.save → gateway.saveQuestionImages → questions/service.addAsset、deleteAsset → assets表。当前 images 只含 id/role，组内共用 width=360，不持久保存。
- 学习：StudyWorkspace（当前主要作答入口）、ReviewWorkspace（并存入口）、QuestionLibrary、MemoryWorkspace 的题目显示；作答图经 StudyWorkspace → 会话草稿 responseImages → sessions/events → review/service.responseImages → attempts.question_snapshot。
- 历史：review/analytics → CardReviewStats/codec → ReviewRecordDetail；资源从 app-media://history/attemptId/imageId 读取。题目快照由 questions/content.questionContentSnapshot 保存。
- 图片读取：app-media://asset/id、draft/id、history/attemptId/id；main 解析归属，仅访问 attachments 中受限文件名。渲染层不接触任意本地路径。
- 交换：modules/export → imports/protocol.validatePackage → imports/service.commitImport；collection复用该通路；containers 负责 ZIP 限额/路径；backup 备份SQLite及attachments、恢复后校验integrity。
- 清理：modules/trash.manageTrash 返回附件候选，application 在事务后删除；历史引用必须保护。media.import/paste/remove 已退休（METHOD_RETIRED），不能重新引入另一条写通路。
- MemoryEditor 使用普通文本；选项也为普通字符串。不存在可复用的富文本编辑器，不更换编辑器；新增图片节点采用现有表单中的结构化节点列表，后续按字段角色扩展，不能宣称已有富文本业务。

## 状态（审计时）
| 项目 | 结论 | 证据/下一步 |
|---|---|---|
| 文件/剪贴板统一校验、暂存、受限读取 | 部分实现 | drafts/main；暂存写文件和SQL缺恢复日志 |
| 不可变原图/哈希去重/资源与实例分离 | 缺失 | 随机文件名、一图一文件；需要资源仓库 |
| 独立尺寸、对齐、变换、撤销、重做 | 缺失 | ImageAttachments组内临时width |
| 草稿/历史/备份/交换 | 已实现基础通路，新增属性待接入 | 新节点必须逐层贯通 |
| 裁剪/批注/缩略图 | 缺失 | 后置，基础稳定后再实现 |
| Windows10/11人工验收 | 待验证 | CI Windows Runner不是人工实机 |

## 技术决策与一致性
保留现有 ID 作为业务实例身份。媒体原图按 sha256 命名，独立 assetId（hash），不同实例各有布局；不能直接用 hash 作为可越权读取的公开句柄。既有 assets/草稿/历史是引用真源，引用查询服务集中读取这些源，避免维护另一个可能漂移的引用计数。
第一实现阶段先完成资源写入与恢复，不改变公共协议/数据库版本。资源元数据使用既有 settings 的独立命名空间，备份可完整保存；下一阶段再版本化图片布局与实例协议。旧引用保持可读，不要求迁移旧字节。原图不覆盖；实例变换只改元数据。
原子性：校验→同盘 .media-staging 暂存及持久日志→原子rename→业务事务存资源/引用。外层事务可能回滚，日志保留到独立恢复步骤；恢复必须在数据库写锁下核对当前/草稿/历史引用后补偿，不能把“文件已写”当作数据库已提交。
清理仅处理本服务拥有的哈希原图；删除引用不立刻删除字节。损坏快照/日志保守拒绝清理，不能推断为空。
布局采用像素意图和 max-width:100% 容器适应；稳定实例ID、资源ID分开。每次复盘历史固定题目版本和节点布局；图片展示变化不应篡改复习算法或知识点关系。

## 阶段对应本包主指令
A0审计 → A1资源基础设施 → A2图片实例与独立缩放 → A3业务接入 → A4非破坏增强 → A5交换恢复 → A6回归构建/PR。阶段分别测试、更新三份执行记录、独立提交和远程读回；保留旧P1—P6计划作历史，不将其完成状态套用本轮。
影响文件：media/{repository,references,service,drafts}、infrastructure/images、main、shared图片模型/registry/types/codecs、questions/review/sessions、图片编辑和显示组件、imports/export/backup/integrity、对应tests与smoke。按阶段逐项变更，不一次整体重构。
回退：通过普通后继 revert 提交撤销阶段（不得reset/强推）；先备份新版数据。以后数据库/协议升级一旦引入，不直接用旧程序打开新数据。保留现有main与develop，PR不自动合并。
