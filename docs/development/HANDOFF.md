# 新 Codex 任务恢复入口

仓库：https://github.com/Aides8Stack/GankSoft （private）
开发分支：feature/unified-image；集成 develop；稳定 main。禁止自动合并/修改后两者。
最新已确认远程 Commit（写入本记录时）：a0fb65d89b7273c6f06beb763e66b3c4d1899a05。
当前阶段 M0 IN_PROGRESS：管理文件已准备，初始化 Commit/远程核对待完成。P1—P6 均 NOT_STARTED。
本文件不能嵌入承载自身提交的 SHA；最新文档检查点需读取远程 HEAD 和 git log -1 -- docs/development 核实，下次更新回填前序已确认 SHA。

## 最近工作与未完成修改
已读取真实远程树、历史、README、package、图片主要前后台链路；新增六份管理文档；未修改业务代码。
基线中每组共用 width，尺寸不持久保存；不是已实现独立图片缩放。
无本轮未完成业务代码；任务被突然中断时，先检查 git status/diff 与 WIP 提交，不能假设没有部分修改。
详细路径、初始分支 SHA、风险与权限事实见 AUDIT.md。

## 恢复步骤（每次都执行）
1. 核对 origin 为 Aides8Stack/GankSoft；确认有真实检出。若只有连接器，按固定远程 SHA 读取，不伪称有本地分支。
2. 检查 git status --short --branch、git remote -v、git rev-parse HEAD；git fetch origin 后核对 origin/feature/unified-image。保留用户脏工作区，禁止 reset/强推。
3. 读取根 AGENTS.md，再读 PLAN、PROGRESS、本文件、TEST_REPORT 和需要的 AUDIT。
4. git log -10 --oneline --decorate；核对最新文档检查点与远程包含关系，不把文档中前序 SHA 误作当前 HEAD。
5. 用代码和测试调查文档声明；冲突先修记录。检查未完成 diff/WIP，从第一个未完成或证据失效阶段继续。
6. 下一项业务任务是 P1：补齐全仓图片调用图、设计/API、完整依赖基线；本次初始化不授权跳过设计直接一次性重写。

## 关键入口
ImageAttachments / QuestionEditor → src/services.ts → shared/protocol/registry.ts / data.ts / model-codec.ts
→ electron/preload.cts 的 gank:protocol → main.ts / protocol/gateway.ts → modules/media/drafts.ts / questions
→ infrastructure/schema.ts / images.ts；app-media://asset/draft/history 读取。
ReviewWorkspace、ReviewRecordDetail 是其他显示入口；sessions/events、review、export/import、backup 必须覆盖。
初审风险：尺寸字段缺失，历史/草稿模型不同，严格协议过滤字段，跨集隔离，Windows 原生解码。

## 标准检查点
以下命令在实际仓库、正确分支且无冲突时逐条执行，不能直接在快照目录执行：
```bash
git status --short --branch
git remote -v
git fetch origin
git rev-parse HEAD origin/feature/unified-image
git diff
git diff --check
# 按 PLAN 执行阶段检查，更新 PROGRESS/HANDOFF/TEST_REPORT
# 逐项 git add <本阶段文件>；检查暂存内容及秘密/产物
git diff --cached --stat
git diff --cached --check
git diff --cached
git commit -m "docs: initialize persistent development checkpoints"
git push origin HEAD:refs/heads/feature/unified-image
git fetch origin
git merge-base --is-ancestor HEAD origin/feature/unified-image
git ls-remote origin refs/heads/feature/unified-image
```
提交标题应随实际阶段改变；WIP 标明阶段与未完成部分。远程前移/拒绝不得强推，先调查。
未完成且需结束：记录状态 IN_PROGRESS/BLOCKED，保存 WIP；push 失败如实报告本地 SHA 和原因。

若 CLI 缺凭据但 GitHub 连接可写：读取目标 HEAD → 以其 tree 为 base_tree 创建仅允许文件的 tree → 以该 HEAD 为 parent 创建 commit → 重读 HEAD → force=false 更新 feature ref → 读回 ref/tree/compare 验证；并发变化先重审，绝不覆盖其他提交。
只有 PR 工作流时，保存到受支持的任务分支，记录 PR 的 base=feature/unified-image、head、URL 和未合入状态；未实际创建不得声称可用。不得创建 develop/main 的自动合并流程。

## 测试命令与限制
完整 checkout / Node>=24 后：npm ci；npm run check；按影响 npm run smoke、npm run smoke:v071、npm run test:package。
本版 UI：npm run build 后 node tools/smoke-v073.mjs。GUI smoke 需要 Electron/显示及系统库，失败据实记。
Windows 打包 npm run package:portable:win；真机按 docs/v0.7.3-windows-acceptance.md、tools/validation/windows-test.ps1；新增图片用例必须覆盖持久/交换/恢复。
当前 Linux 边界检查 PASS，其余本轮未执行；不能引用旧版 198 项报告来替代新基线。
