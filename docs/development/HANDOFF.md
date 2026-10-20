# Pipeline v4 交接与恢复
仓库Aides8Stack/GankSoft；infra/pipeline-v4 → develop；Draft PR https://github.com/Aides8Stack/GankSoft/pull/4；package版本0.7.4-rc.1。
先读AGENTS/STANDARDS/TASK/PLAN/PROGRESS/TEST_REPORT；fetch并核实真实HEAD与工作区。前序检查点de3092a978a0e8aa1755c5d11b24c4a899c1001e，最终保存提交由远程分支HEAD及Git父链解析。通过Git Data API在完整基树上保存，父提交连续、force=false、expected_sha租约；远程tree必须与本地完全一致。
Work本轮本地必要测试通过后保存最终提交、读回远程并立即退出。PR/CI/Windows/Release不是退出依赖，不轮询。最终CI运行编号待核实，可在PR Checks或 https://github.com/Aides8Stack/GankSoft/actions?query=branch%3Ainfra%2Fpipeline-v4 查看；不将前序CI成功套用当前代码。
下一次用户说“检查CI并继续”：只读当前HEAD对应真实runs/jobs。失败读取Job日志，最小修复+本地必要回归+独立提交保存后再次退出；成功核对真正来源SHA、产物与校验值。不要重做已有有效验证。
本次需要用户：配置develop/main保护（required pr-gate、up-to-date、禁止强推/删除、仅授权者合并），审核PR#4；PR#3被替代，是否关闭由用户决定。图片PR#2合入前必须刷新develop并bump下一唯一版本。
自动RC只有用户合并到受保护develop后启动。默认main尚无v4手动按钮；Stable/管理/公开审计workflow需用户另行批准推广main。Stable必须正式SemVer、正式制品同包Win10/11真实40项签核和所有者独立dispatch确认。禁止伪造签核、自动合并、Public、Stable。
若RC中断，重扫policy adoptionBaseline的第一父链；失败版阻断后续，已发布版验Tag/SHA/资产摘要后幂等跳过。Draft只补相同原制品，冲突不覆盖；用原run制品恢复。撤回保留Tag墓碑，永不重用。
