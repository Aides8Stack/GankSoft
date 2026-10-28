# R7.3 三宽视觉证据目录（源码仓库精简归档）

本目录仅保存结构化摘要证据：`manifest.json`、`comparison.json`。
完整原始证据（66 张 PNG 截图、DOM / computed CSS / 布局几何 JSON、`review-1366-contact.png`）已保留在离线 Git Bundle `GankSoft-R7.3-284d330.bundle` 中，**不纳入本次源码仓库提交**，以免重复写入大型二进制文件。

| 原始证据包 | 页面/状态 | 归档方式 |
| --- | --- | --- |
| `visual-a.zip` | overview、deck、cards | 本地备份，不在 GitHub 源码树 |
| `visual-b.zip` | editor、review、planner | 本地备份，不在 GitHub 源码树 |
| `visual-c.zip` | knowledge、knowledge-outline | 本地备份，不在 GitHub 源码树 |
| `visual-d.zip` | analysis、settings、trash | 本地备份，不在 GitHub 源码树 |

结构化摘要中保留原截图与 JSON 的文件名、SHA-256 和环境/场景索引；验收结论见 `../../../R7.3-VISUAL-REVIEW.md`。需要复跑像素和几何比较时，请先从原始备份恢复截图、JSON 快照，再运行脚本，不能把只保存摘要当作已通过验收。当前门禁仍为 **BLOCKED**。
