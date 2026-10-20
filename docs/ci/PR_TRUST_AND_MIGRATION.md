# G2：PR 信任边界与安全迁移

本文件是整改设计和部署清单。当前实现位于 infra/pipeline-v4 / PR #4；没有部署 main/develop、合并、关闭旧 PR 或触发发布。原始安全审计保留在私有交付中，不复制原报告或私人证据到公开仓库。

## F02：可信决策和候选代码

| 层 | 代码来源与权限 | 决策 |
| --- | --- | --- |
| `pr-trust.yml` | 经所有者审查部署到默认 main；`pull_request_target` / main 的 owner dispatch；无 checkout、无 PR import、无 shell、无制品下载；仅读取 API 元数据并 `statuses:write` | 写入候选完整 HEAD 的 `pr-trust` commit status；Fork/非所有者来源拒绝；CI控制文件改变要求 owner 明确复核 SHA |
| PR scope | 固定已审计 `999a184b53dc415c38661b84c56a1643d03f78eb` 的 pr.mjs/scope.mjs/version.mjs，在可信目录运行；候选只作为 git/JSON/文档输入 | PR 自改 pr.mjs 不能改变 docs-only 判定；更新此 pin 视为受控策略变化 |
| PR quality/pr-gate | 候选 HEAD，GitHub hosted 双平台，`contents:read`、不传 Secrets、不持久化凭据、不保存/恢复共享 npm cache | 测试候选应用；其结果不能代替可信状态。修改测试、scripts、配置、workflow 由独立 pr-trust 阻断，直到 exact-SHA 审核 |
| develop RC | 所有者合并之后的受保护源码 | 完整质量/安全/Windows/资产验证之后独立发布；发布前重读有效规则，缺失即阻断 |

当前只允许 owner-maintained same-repository PR，延续原有策略。允许 Fork、Dependabot 或更多维护者不是本次范围；未来须另行设计授权流程。所有者账号和有仓库写权限的 Apps/协作者属于信任根：必须人工最小化权限。不可信账号不得拥有同库写 Token；拥有此权限的人能创建工作流/状态，不能靠一个 job 名称防范它。

`pr-trust` 是来自默认分支的独立 commit status；正常 PR 即使把自己的 `pr-gate` job 改成直接成功，也不能取得此状态。必须将 `pr-trust` 和 `pr-gate` 都设为必需、来源 GitHub Actions，且禁止绕过。GitHub 对同名 check 与 commit status 要求两者都通过；本设计使用不同名字，便于审核独立来源。不要将只有 head 中的 workflow、只有绿色 pr-gate 或作者字符串当作信任证明。

CI策略范围包括 `.github/`、`tools/`、`tests/`、manifest/lock、tsconfig、Forge/Vite配置、.npmrc、.gitmodules、.gitattributes；重命名前路径同样检查。路径元数据不足、>=3000文件、API错误、PR/base在读取中变化全部拒绝。不读取/执行 patch、标题、评论中的代码。任何新 SHA 使旧审核失效。

唯一允许的 `pull_request_target` 例外是 **pr-trust.yml 的整文件 LF 规范化 SHA256**。安全审计对其它 target 工作流、增加 checkout、Secrets、写内容权限、代码/事件变更仍拒绝。修改这份可信工作流必须同步明确更新审计 hash 和回归，并在受保护默认分支人工审核；不是按文件名宽泛放行。

## 所有者部署顺序（本轮未执行）

1. 先审阅本PR中新 `pr-trust.yml`。另经批准，用**单独的 workflow-only PR** 将同一文件推广到默认 main；无需应用源码、构建脚本或 RC 流程。保留现有保护，不直接推 main。它只有元数据/状态权限，不构建或发布。
2. main 部署后，手动运行 **GankSoft trusted PR metadata**，选择 main，填写 PR #4、当前完整 HEAD、`review FULL_SHA`。只在已检查该 SHA 的 workflow、scripts、tests/config 后确认。自动事件对策略变更会失败，这是设计要求；人工 dispatch 是 exact-SHA 审核，不是跳过测试。
3. 确认当前 HEAD 确实出现来自该可信工作流的 `pr-trust` status。将 develop/main 相关 Ruleset 加入 `pr-trust`，保留 `pr-gate`、strict/up-to-date、PR、resolved threads、防删除、防强推、无 bypass。main 当前尚无 required checks，须按可用工作流分步启用，不能制造永远等不到的状态。
4. 独立验证：普通所有者业务/文档PR能通过；改scope/空置tests/把pr-gate改直接成功仍被pr-trust拒绝；Fork拒绝；旧SHA审核不能放行新SHA；伪造/重命名控制文件被拒绝。无破坏探针不得进入发布分支；不执行 Fork 代码来验证元数据拒绝。真实探针本轮 NOT_RUN。
5. **G2有效部署与恶意探针验证完成后**，再由所有者决定审核/合并 PR #4。合并 develop 会启动未来 RC，属于后续阶段，本轮不执行。不要为了先合并而删除 pr-trust 要求或放宽发布前检查。

受限条件：本轮禁止修改 main/develop，因此可信状态尚未在默认分支启用；当前 Rulesets 缺少 pr-trust。**F02 代码已实施，不代表平台级整改已验收。**

## F03：六个旧分支的迁移

实时分支和 workflow blob 见 `evidence/g2-security-validation.json`。当前 develop、feature/unified-image、feature/unified-image-recovery、infra/ci-gate-probe、infra/development-pipeline 使用 8b715682/beab7b58 旧 quality.yml；chore/ci-efficiency 使用 bbf53165。旧配置仍含浮动 Action；main没有工作流。PR #4 的安全属性不能套用到旧分支。

- 本PR保留“删除旧quality.yml并新增v4唯一PR监听”的原子替换；回归确认一个普通PR质量工作流、一个受限元数据工作流、一个develop发布入口；不恢复旧quality.yml。
- 不全局 disable 旧 workflow：它会影响仍在开发的PR #2。不自动删除/重置旧分支，不关闭 #3，也不合并 #3。
- 部署可信元数据后，再人工审核合并v4，develop才迁移。维护中的图片分支应随后安全合入批准的develop基础设施、解决版本和协议差异，重跑测试；不把业务代码带回infra分支。
- 其余仍需维护的旧分支，在独立授权任务中仅固定现有 Action SHA或安全同步已批准的v4，保持原测试和门禁。归档分支保留历史，停止当作新开发基线。各分支提交前核对新HEAD，禁止批量强推/覆盖。
- 可在所有活跃分支固定完成后，由所有者开启平台“要求完整Action SHA”策略；提前开启会让旧PR失败，不能以该设置代替实际迁移。
- 旧分支仍可push触发旧流水线，故F03全仓库整改待迁移，不标PASS。不能将当前分支“无重复监听”写成全仓库“无旧流水线”。

## F04：公开仓库与发布边界

2026-10-20读取：Public；PR创建策略 collaborators_only，Fork允许、当时Fork=0；protect-develop/main active、bypass为空。develop要求GitHub Actions pr-gate和strict；main只有PR/禁止删除/禁止强推等，无required checks。这些事实不证明Actions审批/Secrets设置完整。

发布前 `protection.mjs` 必须读取有效 `/rules/branches/{branch}` 和每个对应规则集，核实 PR、resolved threads、strict、GitHub Actions来源的pr-gate/pr-trust、防删除/防强推、active且无bypass。读取失败、规则身份缺失或布尔protected但规则不足均拒绝；queue、最终release、Stable preflight共用。发布只接受owner的develop push/dispatch；Stable仅main的owner dispatch。Fork/PR/target/workflow_run不得进入发布入口。

本轮连接器不支持Actions管理设置和effective-rules端点；Rulesets详情可读。Actions运行时的REST client可调用这些端点；权限不足会fail-closed，不降级到protected布尔值。真实API可读性和整个RC流程在上线验收中另测，不能以mock通过代替。

所有者待核验（不输出任何Secret值）：

1. Settings → Actions：默认Token Read repository contents；关闭自动创建/审批PR的能力；外部贡献者运行审批选择所有外部贡献者；禁止向Fork发送写Token和Secrets（若该选项存在）。本轮仅延续collaborators_only，不开放外部PR。
2. 逐项审查Collaborators、GitHub Apps、deploy keys、PAT/服务账号、环境授权与仓库/组织Secrets范围；不可信身份无同库写权限；只有受信任发布环境能获取发布凭据。不在PR工作流使用Secrets、secrets:inherit或自托管Runner。
3. 保护main/develop规则和所需状态来源，进行实际阻断验证。保护布尔值、无Fork或“审批过一次Fork运行”都不等于可信代码审核。
4. main手动入口只通过批准的workflow PR部署；不通过PR制品、评论代码、缓存或latest-run间接输入发布器。Stable继续独立的同包Win10/11人工签核，本轮无发布。

官方参考：
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks
- https://docs.github.com/en/rest/repos/rules#get-rules-for-a-branch
