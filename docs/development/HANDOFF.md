# Pipeline v4 交接与恢复
仓库Aides8Stack/GankSoft；infra/pipeline-v4 → develop；Draft PR https://github.com/Aides8Stack/GankSoft/pull/4；package版本0.7.4-rc.1。
先读AGENTS/STANDARDS/TASK/PLAN/PROGRESS/TEST_REPORT；fetch并核实真实HEAD与工作区。前序检查点de3092a978a0e8aa1755c5d11b24c4a899c1001e，最终保存提交由远程分支HEAD及Git父链解析。通过Git Data API在完整基树上保存，父提交连续、force=false、expected_sha租约；远程tree必须与本地完全一致。
Work本轮本地必要测试通过后保存最终提交、读回远程并立即退出。PR/CI/Windows/Release不是退出依赖，不轮询。最终CI运行编号待核实，可在PR Checks或 https://github.com/Aides8Stack/GankSoft/actions?query=branch%3Ainfra%2Fpipeline-v4 查看；不将前序CI成功套用当前代码。
下一次用户说“检查CI并继续”：只读当前HEAD对应真实runs/jobs。失败读取Job日志，最小修复+本地必要回归+独立提交保存后再次退出；成功核对真正来源SHA、产物与校验值。不要重做已有有效验证。
本次需要用户：配置develop/main保护（required pr-gate、up-to-date、禁止强推/删除、仅授权者合并），审核PR#4；PR#3被替代，是否关闭由用户决定。图片PR#2合入前必须刷新develop并bump下一唯一版本。
自动RC只有用户合并到受保护develop后启动。默认main尚无v4手动按钮；Stable/管理/公开审计workflow需用户另行批准推广main。Stable必须正式SemVer、正式制品同包Win10/11真实40项签核和所有者独立dispatch确认。禁止伪造签核、自动合并、Public、Stable。
若RC中断，重扫policy adoptionBaseline的第一父链；失败版阻断后续，已发布版验Tag/SHA/资产摘要后幂等跳过。Draft只补相同原制品，冲突不覆盖；用原run制品恢复。撤回保留Tag墓碑，永不重用。

## G0–G1 最新恢复入口（2026-10-20，优先于上文历史）
本轮仅解阻 PR #4。原远程基线 db5a5ea2aaa8987f058115e58fd09b1738bf1c1d；具体修复与测试见 TEST_REPORT 末节和 docs/ci/evidence/g1-validation.json；PLAN 的 G0–G1 节为当前范围。原 Windows Run 39356453395 已核实 FAIL；不是仍在等待，也不是修复后结果。
按 Git Data API 在完整基树上普通提交，parent=核实 HEAD、force=false、expected_sha 租约；逐路径/完整tree/父链读回核验。当前文档提交身份用远程 infra/pipeline-v4 HEAD 与 git log -1 -- docs/development 解析，不循环补写自身SHA。
提交后一次读取匹配 SHA 的 Actions；运行中或未观测标待核实，完成交接即退出。后续仅在用户说“检查 CI 并继续”时读取最新 HEAD 的真实 Run/Jobs；失败展开失败Job日志、最小修复、必要本地回归、保存交接后再次退出。
所有者下一步：核实最新 pr-gate 及双平台质量；失败交回新任务，成功后先配置实际有效的 develop/main 保护（required pr-gate、up-to-date、禁强推/删除，按套餐能力核实），审核并亲自决定合并 PR #4。PR #3 不同时合并，是否关闭由所有者决定；PR #2 仍独立。G2之后另轮执行；不推广main、不发Stable、不删已有版本。

### G1 远程保存与触发回执（仅首次观察，不轮询）
修复检查点：1d57a13797029fdefb226579e28eaede757a0cb5；父提交 db5a5ea2aaa8987f058115e58fd09b1738bf1c1d；tree 9f0e27703a2020d5bac161e8a8adbfd4f7de3a31。普通非强制保存后读回 PR head、完整394个文件path/mode/blob SHA及父链，全部一致。
Draft PR #4：https://github.com/Aides8Stack/GankSoft/pull/4 ，infra/pipeline-v4 → develop；未合并。
首次确认该修复SHA的PR工作流已触发：Run 39387138356 / #3，queued，conclusion=null，CI_PENDING/待核实。https://github.com/Aides8Stack/GankSoft/actions/runs/39387138356 。该状态仅为首次读取，不等待结论。
本回执提交只改文档，security.mjs/workflows.test.mjs逐字节保持上述被测修复。当前最终文档检查点由远程分支HEAD解析；它会独立触发检查，不能将前序Run套作新HEAD结果。任务结束报告提供最终HEAD及一次读取的新Run；无法在自身提交中预写自身SHA/未来Run，不为此循环提交。
下一轮先读取真实HEAD对应Checks/Run；当前没有Windows成功、安装包或发布结论。Work保存交接后立即结束。

## G2 S1/F02（2026-10-20）
基线999a184；PR#4保持Draft/open，原Run39387301625已完成success，仅为旧源码回执。可信metadata-only pr-trust已实施：固定仓库/所有者/默认main、只用PR REST元数据、Fork/外部拒绝、完整SHA人工复核CI控制变化、拒绝截断列表/重命名伪装/并发前移。其唯一写权限是commit status；没有checkout/安装/执行PR内容。scope改用已审计999a184固定脚本，候选和可信目录隔离；PR取消共享npm缓存。
专项 node --test tools/pipeline/pr-trust.test.mjs tools/pipeline/workflows.test.mjs：18/18 PASS，Linux Node24.19.0；首次事件归属测试FAIL因为新增受限metadata触发器，补精确工作流白名单与篡改拒绝断言后PASS，未删除旧测试。源码和默认基线的部署状态分开：main无工作流，可信状态尚未部署；当前仅GitHub Actions app的pr-gate不足以抵御整个workflow被PR改写。必须另经所有者批准部署main的metadata工作流，并把pr-trust加入Rulesets，进行真实恶意探针。

## G2 S2/F03/F04 当前权威状态（2026-10-20）
基线999a184b53dc415c38661b84c56a1643d03f78eb；S1远程检查点91ccf4052af6ae910c3aaea397d57df0f766fed0（parent=999a184，tree=fadc855b6cd9f513835f88ace2bfbc95ed3f14ee），S1专项18/18 PASS，已普通非强制保存并核验tree/parent；当前S2工作树以源码哈希绑定。
仓库Public；protect-develop 25463281 / protect-main 25463521 均active、无bypass。develop已有GitHub Actions pr-gate+strict，main没有required checks，均缺pr-trust。原Run39387301625 completed/success仅绑定999a184，不能代替本轮。
F02代码DONE、部署BLOCKED：新增保护默认分支metadata-only状态，固定可信scope源码SHA，PR无Secrets/只读Token、不共享cache；控制文件修改须owner针对完整SHA单独review；未知来源/Fork、截断/重命名伪装/并发前移拒绝。新pr-trust尚未部署main、尚未设required，当前pr-gate不能单独视为可信授权。严禁将本轮标为平台级整改完成。
F03方案DONE、全仓库迁移NOT_RUN：6个旧分支每个4个唯一浮动Action；分支SHA/工作流blob/Action列表见docs/ci/evidence/g2-security-validation.json。PR#4保持原子替换旧quality.yml；未改其他分支、未停用全局workflow、未关闭#3/#2，避免中断开发。迁移步骤见docs/ci/PR_TRUST_AND_MIGRATION.md。
F04代码DONE、线上验收BLOCKED：queue/最终release/Stable共用有效Rules及active无bypass检查，要求PR、resolved threads、pr-gate+pr-trust的Actions来源、strict、防删除/防强推。读取失败或仅protected=true都阻断；PR/target/workflow_run/Fork/未知actor不能进入发布上下文。Actions管理、协作者/Apps/Secrets设置无法由本接口读取，明确待人工；不可默认安全。
本地PASS：npm ci；pipeline42/42（所有原测试保留）；ci:quality（5基础设施、1中文ZIP、199业务含21协议，协议21重跑、75方法导出、边界/类型/构建）；Linux ASAR/UI/缺原生依赖13组；pipeline:security 0漏洞；diff/秘密检查。Node24.19.0/npm11.9.0，Windows未运行。
部署main可信workflow、required pr-trust、真实恶意探针、旧分支迁移、Windows/RC/Stable均NOT_RUN。不能因PR CI变绿直接合并；先按PR_TRUST_AND_MIGRATION完成G2人工动作，本轮不进入G3。
当前新CI：CI_PENDING/待核实。交接保存后即退出；下轮按最新HEAD读取Run，失败读实际Job日志再最小修复，成功也不得跳过G2部署签核。无自动合并、无main/develop修改、无Release/Tag写入、无删除版本或分支。

### G2所有者的下一步（必须按顺序）
1. 下轮“检查CI并继续”核实最新HEAD的真实Checks；失败先修复，不等待。
2. 独立批准默认main的workflow-only可信元数据部署（本轮未执行）。详细文件/顺序见docs/ci/PR_TRUST_AND_MIGRATION.md。先核对提交内容，再owner在main dispatch，对PR#4完整HEAD输入review确认。
3. 把pr-trust设为必需，保留pr-gate/strict/无bypass；核实Actions/Fork/Token/Secrets最小权限，完成正常及恶意PR真实阻断验证。
4. 旧分支按独立授权安全迁移，保留PR#2，不把#3与v4一起合并、不关闭#3。G2实际验收后，所有者再决定PR#4是否合入develop；届时才进入G3自动RC。
当前机器可读证据：docs/ci/evidence/g2-security-validation.json。原始私有审计未公开；所有代码/文档状态与证据分开。最终交接提交不能写入自身SHA，由远程infra/pipeline-v4 HEAD和父链解析，不循环提交。

### G2远程保存及Actions首次触发回执
S1：91ccf4052af6ae910c3aaea397d57df0f766fed0。S2源码/测试/交接检查点：b5e3b8cedfb4775263d6cc7f4b5c259dffbbbb9b，parent=91ccf4052af6ae910c3aaea397d57df0f766fed0，tree=eaeed17ce6e3f189f3f61dd59011870a2b77fc4a；完整401文件的path/mode/blob哈希及父链读回一致，普通非强制保存。
PR #4：https://github.com/Aides8Stack/GankSoft/pull/4 ，infra/pipeline-v4 → develop，保持Draft/open，未合并。
S2首次Actions确认：Run 39401281660，status=in_progress，conclusion=null，CI_PENDING/待核实；https://github.com/Aides8Stack/GankSoft/actions/runs/39401281660 。仅首次读取，不轮询、不等待结果。
本次最终补回执只修改文档/证据，不改被测源码。最终文档提交身份从远程infra/pipeline-v4 HEAD解析；其Actions独立触发，不能将S2 Run当作最终文档SHA的结果。最终回答记录一次读取的最终Run，不为了预写未来Run或自身SHA反复提交。
本地测试通过，G2部署/规则/旧分支迁移/真实攻击探针仍BLOCKED或NOT_RUN。下一轮先核实最新HEAD CI，之后由所有者批准可信metadata到默认main的独立部署、设required pr-trust并签核；不要立即合并本PR进入RC。本轮未改main/develop、未关#3、未发布或删除版本。

## G2 Windows换行测试修复（2026-10-20，当前权威状态）
基线f457cba9fa8b9e87c8789f2be817cf9a61664371；本地干净且远程PR#4最新HEAD相同，继续infra/pipeline-v4既有任务。实际Run39401503994：scope/Ubuntu quality成功，Windows Job118557286576在test:pipeline有两项FAIL，pr-gate失败，Windows ci:quality未运行。
根因已用原源码快照复现：LF源+LF工作流两项PASS；LF源+CRLF工作流仅多行替换测试FAIL；CRLF源+LF工作流仅嵌入脚本比较FAIL；双CRLF两项FAIL。YAML解析块脚本规范为LF，而源文件字节仍有CRLF；旧push多行replace在CRLF下没有命中，实际测试的是原工作流，而非PR带write的攻击对象。
修复仅pr-trust.test.mjs：只将CRLF转LF再精确比较，不trim、不忽略其它空白/内容；新增所有4种EOL组合及内容/空白篡改拒绝。使用YAML结构构造攻击，uniqueKeys解析无错误后回读确认top/job contents=write、Secrets引用、删除push并添加pull_request且release-rc仍write，再断言原生产审计拒绝；原两项测试保留。生产auditWorkflows、可信hash、pr-trust源码及所有workflow逐字节未改，F02/F03/F04设计不变。
实际本地PASS：4组合修复后各2项通过；专项20/20；pipeline43/43（新增1项，原42项保留）；ci:quality（5基础设施、1中文ZIP、199业务含21协议，协议21重跑、75方法导出、边界/类型/构建）；源码/工作流安全审计、git diff --check。Linux Node24.19.0/npm11.9.0；仅模拟Windows换行字节，未执行Windows OS。
精确证据：docs/ci/evidence/g2-windows-newlines.json，包含修复前后矩阵、原始失败Run/Job、源码hash与命令日志摘要。本轮未重装未变依赖，未重复Linux ASAR/UI或依赖漏洞库查询；不把历史通过写成本轮重跑。
新源码CI_PENDING/待核实，不能引用旧Ubuntu成功。G2平台验收仍待核实/验收：默认main可信metadata部署、required pr-trust及实际保护、Actions/Fork/Token/Secrets设置、旧分支迁移、真实正常/恶意PR阻断验证。Windows新HEAD结果由新Actions确认，本轮不等候。
禁止本轮合并PR、修改main/develop、发布RC/Stable、删除分支或关闭PR。下一轮先读最新HEAD的真实Run/失败日志；通过后也不跳过G2平台验收。本次提交交接后立即退出，不轮询。
