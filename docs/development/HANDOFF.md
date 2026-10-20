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
