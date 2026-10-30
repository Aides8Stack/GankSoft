# B1 手动草稿与直接发布 — 2026-10-31

唯一分支 feature/v077；基线 a84c581361471a267cae40cda5175cefac1d8524；Schema606。

## B1.1 检查点

DONE（领域及状态机层；正式 GUI 统一在 B1.3 验证）。正式新建入口改用本地 UUID + 纯函数内存种子，不再调用 draft.create。唯一 CardDraftController 删除计时器、自动 flush、离开自动保存和类型切换隐式写入；一次手动保存只提交点击时快照，后续编辑保持未保存。保留 CAS、原请求未知回执重试、旧 settings/learning_card_drafts 读取；显式空白保存可首次创建 settings 中原有格式的草稿。无新表/IPC/Store。

生产链：UnifiedWorkspace → UnifiedCardEditor → CardDraftForm → CardDraftController → draft.save → saveWorkspaceDraft → Schema606 原存储。类型切换只改变内存，下一次显式保存提交新模式。

本检查点仍需 B1.2 完成：发布当前快照，剪贴板卡片交换不再隐式保存，中央缺项提示。暂不宣称完整业务可用。

## B1.2 检查点

IN_PROGRESS（源码/领域验证完成，正式 GUI 待 B1.3）。现有 card.publish 新增可选 fields、可空 expectedDraftRevision，当前快照直接生成 ContentVersion，无临时草稿。旧草稿调用方式仍可读/发布；清稿与正式版本和协议回执同事务，CAS/幂等保留。draft.save 允许首次本地 ID 保存；模式变化要求 confirmModeChange，UI 确认只在内存执行。

card.clipboard.copy/preview 增加可选当前 fields，apply 返回 DraftFields 并只暂存资源，不再写卡片草稿；复制、Prompt、批量选项、粘贴、类型切换和离开均不能调用保存。原图片所有权、Placement 校验和回滚清理保留。正式 UI 增加发布红星、单个中央约1秒缺项提示、准确保存状态和按钮状态。UNSUPPORTED_HTML 从文字内容安全降级，不把富 HTML 或 HTML-derived Slice 插入文档；媒体仍走原暂存链。

验证：状态机与原领域回归35/35；新增直接保存/发布领域6/6；协议21/21及边界/类型/162方法导出通过；正式 build 通过（之后修正首次保存预览 allowNew，下一轮构建需覆盖该修正）。无依赖安装。首次新增测试包含 TEST_INFRA（不存在的关系表名），已修；另外暴露首次保存预览未允许无记录内存ID的真实源码缺口，已修并6/6复验。历史250总账未改，Windows未执行。
