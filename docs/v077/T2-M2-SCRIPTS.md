# GankSoft v0.7.7 — T2-M2 自动化脚本实现与验收边界

> **状态：SCRIPT_IMPLEMENTED_NOT_EXECUTED**（2026-10-30）。本文件记录 29 条专属 GUI 脚本的提交情况，不是实际执行结果。本轮只编辑 `tools/validation/v077/`、`tests/` 和文档，不改业务生产代码。

## 1. 29 条 CASE 的脚本与反馈检查

| 内部检查点 | CASE ID | 数量 | 主场景文件 |
| --- | --- | ---: | --- |
| M2-01（基础编辑） | EDITOR-01～09 | 9 | `scenarios/m2-editor-basic.mjs` |
| M2-01（富文本与内容交换） | EDITOR-10～19 | 10 | `scenarios/m2-editor-rich.mjs` |
| M2-02（剪贴板） | CLIP-05/06/07/08/10/11/12/13 | 8 | `scenarios/m2-clipboard.mjs` |
| M2-03（弹窗） | EDITOR-20/21 | 2 | `scenarios/m2-dialogs.mjs` |
| **合计** | **精确映射到原 T2-M2 的全部CASE** | **29** | **4 个模块场景文件** |

公共 GUI 操作集中在 `scenarios/m2-support.mjs`（新旧卡进入、草稿保存与重启、原生合成剪贴板、图片置入和验图、内容交换、弹窗几何与鼠标滚动、只读 IPC 验证）。可执行 CASE 都经 `executeCase` 启动正式 Electron 界面，操作由 Playwright click/press/fill / mouse.wheel 执行，最终由实际用户界面反馈、只读协议/SQLite、必要的新进程重启判断 PASS/FAIL。为合成数据预置图片等行为只在独立用例夹具和系统剪贴板进行，不用直接后端写入冒充 GUI 用户动作。

## 2. 核验点与预期缺陷

- **EDITOR-01～09**：标题选中/删除，中文与长文本，选项增删移动与正确答案身份，批量输入取消/确认，错题四编辑区与来源，问答三字段，直接记忆 Markdown，已发布内容不被草稿覆盖；必要时跨新 Electron PID。
- **EDITOR-10～16**：快捷键/Markdown 原生编辑、公式/表格/颜色，表格添加与删除行列及撤销/重做、选区颜色不串段、焦点切换和频繁离页时草稿保护。Crepe 富文本/表格的真实菜单入口必须通过首次 Electron 运行校准；**未运行不能声称事务竞态通过**，不得用内部编辑器 API 调用替代 GUI。
- **EDITOR-17～19**：复制卡片→结构化粘贴预览→取消或确认；预览字段、修订更新、保存与重启，复制外部AI Prompt时默认不附带知识目录、只有勾选后才纳入、模板可编辑且系统剪贴板内容与预览一致。
- **EDITOR-20/21**：1500×900、1366×768、900px 三组实际视口；长文本可滚动、底部控件可达，图片引用预览有安全提醒；取消不写入，最终确认后重启引用完整。几何阈值为实际检测失败项，**不预先认可现有窄窗口，GH-20 原报告不关闭**。
- **CLIP-05～13**：Markdown 字面量、多语言/emoji/长文本、框选替换与撤销、快速双粘贴与多字段隔离；JPEG/WebP、图文混合、同图双 placement/宽度/重启、危险远程 HTML 不执行不下载。**CLIP-12 保持 [30,80] 的独立宽度严格断言**，与已实测 `MEDIA-03` 关联去重，不能为制造 PASS 降低预期。
- 本轮 ClipboardItem 使用 Electron native **合成**剪贴板，非实际用户 Windows 物理来源。GH-16、NEW-13、CLIP-03、CLIP-09 及 Win10/11 专项仍保持其独立待验证状态，不可据此宣称已经复现/修复。

## 3. 自检边界与执行入口

新增 `tests/v077-m2-handler-coverage.test.ts`，验证：29个原CASE、M2-01(19)/M2-02(8)/M2-03(2)精确覆盖、各模块处理器与公共支持文件存在、GUI/断言/证据入口、注册阶段不修改NOT_RUN、源码Node语法检查、Windows平台限制与GH-20/MEDIA-03严格检查。这些测试需要在完整 Node24 Work 树运行。

本轮 GitHub 远端静态核对：**M2 29/29 已注册、0缺失、0重复；5个新模块/共享脚本 V8 语法可解析**。静态解析与 CASE 映射校验**不等同于 Node24 单元或 Electron GUI 实测**。现有唯一账本**72 PASS / 3 FAIL / 3 BLOCKED / 172 NOT_RUN**，M1 47及M2 29均仍为 NOT_RUN。

下一 Work 推荐 GPT-6.1 Sol Medium，优先从 T2-M1 执行（此前47脚本未运行）再 T2-M2；若用户明确先 M2，可直接用以下命令：

```bash
node tools/validation/v077/environment.mjs status
node --experimental-strip-types --test tests/v077-m2-handler-coverage.test.ts
node tools/validation/v077/phase.mjs audit
node tools/validation/v077/phase.mjs list T2-M2
node tools/validation/v077/phase.mjs run T2-M2
```

同一阶段每次 `phase.mjs run` 只选下一个有NOT_RUN的内部检查点。脚本第一轮可能因真实 Crepe 菜单结构、IME/媒体平台行为或原生 ClipboardItem 兼容性出现测试驱动失败：必须从截图/反馈判断 TEST_INFRA 与 PRODUCT_FAILURE，最小修正测试选择器并先提交 GitHub，再按准确源码 SHA 复跑。FAIL 留 I3 分类、F4 集中修复，绝不修改业务代码以便测试收集。

每个有效检查点运行后 `collect.mjs` 先 dry-run 再 write、`promote.mjs` 严格按真实回执晋升，更新 `E2E-RESULTS.json`、`DEFECT-INBOX.json`、`RECOVERY-NEXT.md` 和对应阶段报告。保存到唯一 `feature/v077`，独立核验远端 SHA。额度不足立刻保存并结束；不等待 CI、不合并、不发布。

**本文件保存本身不增加 PASS，也不代表已经验证用户的 Windows 缺陷。**
