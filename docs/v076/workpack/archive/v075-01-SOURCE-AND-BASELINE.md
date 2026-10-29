# 当前证据、源码位置与恢复方式

## 事实（2026-10-27 GitHub 核验）

- `develop`：`ea78b80c953fb9c4ad3f0ad33e6983191ad50e1d`（PR #14 merge）。
- 原 feature 分支：`dc3e255a27b836e487f7986066c8cf807afe1efe`（在 develop 后方，安全更新前先确认远端）。
- v3.7 原始 HTML：`docs/v075/reference/OPEN-ME-v3.7.html`，仓库审计登记 SHA-256 `8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015`。
- 正式加载：`src/main.ts` 动态选 `UnifiedWorkspace.vue`，606 返回 unified；旧 `src/App.vue` 仅 legacy 模型。
- 正式主页/卡片集/部分管理结构：`src/unified/UnifiedWorkspace.vue`。其中 home 只有导入/新建/文件夹路径/目录网格；样式 scoped 的 `.unified-shell`/`.catalog-grid` 很薄，没有把原型首页四 KPI 和右侧内容布局搬入。
- `src/style.css`、`src/workspace.css`、`src/workspace-v071.css`、`src/theme.css`、`src/study-workbench.css` 会被导入，但旧 `.v04` UI 规则不自动适用于 606；全局控件规则需审查冲突。
- 复盘：`src/review/UnifiedReviewForm.vue`；编辑：`src/unified/UnifiedCardEditor.vue` → `src/cards/CardDraftForm.vue` → `src/editor/MarkdownEditor.vue`；分析：`src/unified/UnifiedAnalytics.vue`；图谱：`src/components/MindMapWorkspace.vue`。
- 2026-10-27 UI 核对报告 `docs/v075/UI-ENTRY-AUDIT-2026-10-27.md` 已确认正式 UI 接入 ≠ v3.7 外观与信息结构达标。
- 用户已在正式 Windows `GankSoft.exe` 中截图证明 UI 严重简化，图片位于本工作包 `evidence/user-actual-windows-home.png`。

## 首次启动提示的旁支（不扩范围）

正式主进程默认目录 `join(app.getPath('userData'),'v060','data')`，旧数据可能导致 606 fresh-only 拒绝启动。UI 重构不要擅自迁移/覆盖旧数据；验收必须用隔离的全新 606 数据目录，用户数据保留。可在独立任务中另做“安全选择新目录”的 UI 体验改进，不可为了视觉改造删数据。

## 证据优先级

1. 用户这次明确授权：**直接以 v3.7 原型为正式 UI**，结合后续已确认补充。
2. 原版 `OPEN-ME-v3.7.html` + 可信 hash，及 `REVISION-v3.7.md`、`UI-REFERENCE-GUIDE.md`。
3. 仓库 `AUTHORITY-AND-DECISIONS.md` 中不冲突的冻结功能决定。
4. 既有 UI audit 作为旧状态和问题来源；其中“取消 UI 整改”视作已被本轮新要求取代。
5. spike/旧 604 的 UI 只作参考，不是正式完成凭证。

## GitHub 地址

- 仓库：https://github.com/Aides8Stack/GankSoft
- 原版 HTML：https://github.com/Aides8Stack/GankSoft/blob/develop/docs/v075/reference/OPEN-ME-v3.7.html
- UI audit：https://github.com/Aides8Stack/GankSoft/blob/develop/docs/v075/UI-ENTRY-AUDIT-2026-10-27.md
- 正式 Vue：https://github.com/Aides8Stack/GankSoft/blob/develop/src/unified/UnifiedWorkspace.vue
- 最近已完成便携 CI：https://github.com/Aides8Stack/GankSoft/actions/runs/40430001868