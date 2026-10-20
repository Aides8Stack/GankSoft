# G2 当前人工操作入口

以 [PR_TRUST_AND_MIGRATION.md](PR_TRUST_AND_MIGRATION.md) 为准。当前仓库已Public，两个Ruleset active；develop要求pr-gate/strict，main没有required checks，均缺pr-trust。Actions管理设置、协作者/Apps/Secrets待人工核验。先部署可信元数据工作流并验证，再考虑合并PR#4；本轮未改main/develop、未发布。

# v4初次实施时的人工配置（历史快照，非当前状态）
| 设置 | 实际状态 | 必须操作 |
|---|---|---|
| 仓库 | Private，默认main | 不改可见性 |
| develop/main保护 | branch API protected=false | NEEDS_USER_ACTION：require PR、required pr-gate、require up-to-date、禁止force/deletion；只允许Aides8Stack写入/合并，审核Apps；单人不要要求他人批准 |
| Rulesets详情 | 管理接口能力/套餐待核实 | 核实可用套餐，不能以workflow代替保护 |
| Actions默认Token权限 | 未读取 | 设置只读；仅发布Job contents:write |
| Stable环境reviewer | 未配置/未核实 | 当前采用所有者单独manual dispatch+完整确认短语，非自动Stable；如环境可用再配置，不能Prevent self-review锁死单人 |
| 默认main手动工作流 | 当前main没有v4 | 用户另行批准推广后才有dispatch按钮；本轮不改main |
| 自动RC | 未合并，未生效 | 先配置保护，再人工合并本PR到develop；全部门禁通过才自动Pre-release |
| 历史/版权/日志/Artifacts/Apps审计 | NOT_RUN | 公开前独立审计及明确授权；本轮不公开 |
| 计费/Actions额度/环境功能 | 当前接口未核实 | 用户在Settings/Billing核实，不承诺免费或额度充足 |
| Tags/Release | 读取到v0.7.3-rc1；Release列表为空 | 新版本0.7.4-rc.1，无现存同名Tag；启用不可变Release前核实平台支持 |

不要同时合并旧PR#3；v4已替代其行为，关闭#3需用户决定。图片PR#2保持独立，刷新develop后单独bump下一版本再合并。
