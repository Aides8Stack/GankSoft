# GitHub 分阶段永久记录模板

Work 执行 P0–P6，每阶段都要在远端存在（非本地草稿）以下文件。模板用内容填充，而不是空文件冒充通过。

```text
docs/v076/
  WORK-PLAN.md
  GITHUB-RECORDS-AND-ACCEPTANCE.md
  STATUS.md
  stages/
    P0/PLAN.md, PROGRESS.md, TEST_REPORT.md, ACCEPTANCE.md, evidence/
    P1/PLAN.md, PROGRESS.md, TEST_REPORT.md, ACCEPTANCE.md, evidence/
    P2/PLAN.md, PROGRESS.md, TEST_REPORT.md, ACCEPTANCE.md, evidence/
    P3/PLAN.md, PROGRESS.md, TEST_REPORT.md, ACCEPTANCE.md, evidence/
    P4/PLAN.md, PROGRESS.md, TEST_REPORT.md, ACCEPTANCE.md, evidence/
    P5/PLAN.md, PROGRESS.md, TEST_REPORT.md, ACCEPTANCE.md, evidence/
    P6/PLAN.md, PROGRESS.md, TEST_REPORT.md, ACCEPTANCE.md, evidence/
```

每份 `TEST_REPORT.md` 至少记录：运行命令、环境、实际 exit code、被测 SHA、PASS/FAIL/NOT_RUN、失败根因。`ACCEPTANCE.md` 至少记录：原型要求、对应正式组件、对照原型截图与正式 Electron Windows 中文截图文件、屏幕分辨率、数据来源（空白/合成）、本页真实操作、结论与缺口。未执行的人工 Win10/11 同包操作必须为 NOT_RUN。

正式源码、业务 API、测试脚本应在其真实仓库路径提交（src/electron/shared/tests/tools 等），不是只在文档里写“已开发”。

每阶段 checkpoint 的报告：本地/远端完整 SHA、GitHub PR、CI run/job、GitHub 截图路径/Artifact（非敏感），下一阶段的唯一可安全进行项。每次 push 后独立 fetch 复核远端。CI 未结束可以先保存检查点继续工作，但不能把 IN_PROGRESS 标为 PASS。

不经用户授权不得自动审批 pr-trust、合并 PR、发布 Release，不改受保护主分支，不强推，不上传真实学习库/密钥/私人文件。