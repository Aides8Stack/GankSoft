# R8 验收矩阵（2026-10-29）

阶段IN_PROGRESS；技术准备完成，实际候选与Windows人工未完成。

| Gate | 状态 | 证据/剩余 |
| --- | --- | --- |
| R7技术准入 | PASS | f1e6e980完整SHA对应CI40826741821四项success；历史33组/18项继承 |
| R8.1版本/脚本准备 | PASS | package/lock=0.7.6；5项版本/便携清单专项PASS；evidence/preparation-20261029.json |
| R8-01 实际Windows包身份 | BLOCKED | 先由所有者合并develop，再取现有rc-packages及source/报告/哈希；未构建包 |
| R8-02 实际无安装便携 | NOT_RUN | 已有打包、80/100深度真实Windows解压、EXE smoke及完整文件哈希脚本；本轮未实际运行 |
| R8-03 Win10 | NOT_RUN | WINDOWS-CHECKLIST.md，含IME/物理剪贴板、100%/125% |
| R8-04 Win11 | NOT_RUN | 与Win10同一SHA256的ZIP |
| R8-05 门禁/安全放行 | BLOCKED | develop严格pr-gate/pr-trust已实时核对；最终提交门禁未读取；bypass字段不可见、环境403待所有者独立确认 |
| R8-06 候选与发布边界 | NOT_RUN | 尚无候选下载；未合并/批准环境/创建Release |
| R8-B02 原生恢复确认 | NOT_RUN | 真实鼠标取消零写、确认恢复/列表/重启读回 |

本轮明确不做逐像素视觉验收，也不重跑已通过的整套自动化。R7历史严格视觉要求不作为重新开启已关闭阶段的理由。真实Windows/便携包不能由Linux、mock、合成剪贴板或质量CI替代。

R8.2只有当前可执行准备完成，实际ZIP未通过前不能DONE；R8整体不能DONE。唯一目标GankSoft-v0.7.6-win64-portable.zip，顶层GankSoft/；禁止安装器、平行流水线及绕过审核。版本0.7.6仅构建身份，仍为未签核候选。
