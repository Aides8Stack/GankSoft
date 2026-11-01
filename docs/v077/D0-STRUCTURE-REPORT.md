# GankSoft v0.7.7 — D0 测试架构与环境复用设计归档

**阶段**：D0 设计与结构归档，按模块先测试 → 收集问题 → 再集中修改。

- 分支：`feature/v077`；设计起点为 `6f6ba26cb52b418c0a85e02b9a971edc160ef263`，实际最终提交从本文件的 GitHub 历史/远端 HEAD 解析。
- 模型阶段建议：D0 Medium；T1/T2 Medium；I3/F4 High（复杂一致性问题按需 Extra High）；R5 Medium + High审核。
- **本阶段没有运行新的 Electron、Windows 真机或 CI 测试；不是任何业务 CASE 的 PASS 报告。**
- 未改动 `src/`、`electron/`、`shared/`、Schema606 或正式保存/发布/复盘逻辑。
- 250 原CASE / 58 P0、163 P1、29 P2保留，按12模块覆盖20原功能组，不改 `E2E-RESULTS.json` 的状态；历史H1的8条 Linux Electron PASS 仅作为已有证据。
- 按模块常规/失败反馈设计：`docs/v077/modules/*.md` 和 `MODULE-TEST-ARCHITECTURE.md`，以原用户操作合同为唯一源。
- 自动化结构：新增 `modules.mjs`、`module-plan.mjs`、`collect.mjs`；`run.mjs` 新增 `--module`、`--baseline`、`--include-negative`，未映射测试保持 NOT_RUN/退出码2；保留当前8条场景与唯一注册表。
- 问题归类：`DEFECT-INBOX.json` 预先保留用户实报 #16/#17/#20/#21，不宣称全部在v077复现；`collect.mjs` 只收真实FAIL/BLOCKED观察，不自动改测试PASS。
- 最小测试环境：`tests/fixtures/ganksoft/v077-minimal.json`、`environment.mjs`、`ENVIRONMENT-REUSE.md`；脚本根据工作区源指纹、锁文件、OS/Node和产物哈希决定重建。**PR质量工作流新增 Artifact 上传步骤，但由于 v077 目前尚无 PR 且未运行该新检查，不能声称已经有真正可下载构建。**
- CI：仅对既有 `pr-quality.yml` 新增 v077 专项已成功质量运行后的构建归档，不新建工作流，不修改 `develop-rc`、审批及发布门禁。Artifact按源码/平台命名、保留30天，供Work复用而非交付给最终用户。
- **环境限制**：本对话容器 Node v22、无法从 github.com 克隆完整仓库；因此新增纯工具、CLI测试及CI YAML在此尚无全仓 Node24 实际执行证据，下一T1 Work必须先专项核验。不能虚报新框架测试PASS。

## 后续必须执行的最短验证

```bash
node tools/validation/v077/environment.mjs status
node tools/validation/v077/environment.mjs prepare
node --experimental-strip-types --test tests/v077-module-layout.test.ts tests/v077-e2e-runner.test.ts
node tools/validation/v077/module-plan.mjs audit
node tools/validation/v077/module-plan.mjs list
node tools/validation/v077/run.mjs list --module cards --baseline
```

如框架存在缺陷，只修框架并重新核验后，再进入 T1；T1/T2按模块收集真实失败，**不边测边修改业务源码**。问题归类后进入I3/F4集中修，最后Windows实机和便携ZIP实测。此阶段尚未发布/合并PR。
