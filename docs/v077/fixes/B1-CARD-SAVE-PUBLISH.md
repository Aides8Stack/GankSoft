# B1 手动草稿与直接发布 — 2026-10-31

唯一分支 feature/v077；基线 a84c581361471a267cae40cda5175cefac1d8524；Schema606。

## B1.1 检查点

IN_PROGRESS。正式新建入口改用本地 UUID + 纯函数内存种子，不再调用 draft.create。唯一 CardDraftController 删除计时器、自动 flush、离开自动保存和类型切换隐式写入；一次手动保存只提交点击时快照，后续编辑保持未保存。保留 CAS、原请求未知回执重试、旧 settings/learning_card_drafts 读取；显式空白保存可首次创建 settings 中原有格式的草稿。无新表/IPC/Store。

生产链：UnifiedWorkspace → UnifiedCardEditor → CardDraftForm → CardDraftController → draft.save → saveWorkspaceDraft → Schema606 原存储。类型切换只改变内存，下一次显式保存提交新模式。

本检查点仍需 B1.2 完成：发布当前快照，剪贴板卡片交换不再隐式保存，中央缺项提示。暂不宣称完整业务可用。
