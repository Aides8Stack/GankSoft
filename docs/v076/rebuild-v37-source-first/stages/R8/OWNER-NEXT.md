# 所有者下一步（仅说明，未代为执行）

1. 打开原PR #15，独立审查最终完整40位HEAD及本轮版本/锁变更。等待该最终SHA的pr-gate成功；旧CI40826741821仅覆盖f1e6e980，不可代替新提交。
2. 打开 https://github.com/Aides8Stack/GankSoft/actions/workflows/pr-trust.yml → Run workflow，分支必须main，pr_number=`15`，source_sha=`最终40位HEAD`，confirm=`review 最终40位HEAD`。由Aides8Stack运行。后续若再有提交，审核失效，须以更新HEAD为准；本轮不会追加回执提交。
3. Settings→Rules→protect-develop：核对active、禁止删除/强推、PR/已解决讨论、strict GitHub Actions pr-gate与pr-trust，无bypass。main当前没有required checks，不冒称与develop相同。公开API未返回bypass_actors，不能将缺字段当空列表；本轮不改规则。
4. Settings→Environments→rc-publish-owner：独立确认Required reviewer为Aides8Stack及环境保护有效。环境接口本轮403；YAML存在不能证明服务器审批配置。保持待批准，不为下载Artifact批准发布。
5. 确认最终SHA门禁均满足后，将Draft标为Ready，正常合并PR15到develop；不绕过规则、不直接push develop。此操作由所有者决定/执行。
6. 合并会触发现有develop-rc.yml。实际构建身份是合并后的完整develop SHA；quality/security通过才执行Windows包。完成后打开该次Actions→Artifacts→rc-packages，下载并取出GankSoft-v0.7.6-win64-portable.zip和三份证明文件。Actions下载外层Artifact ZIP只是运输容器，不是第二类安装包；Win10/11用里面同一个便携ZIP。
7. 用SHA256SUMS.txt核对ZIP；核对source.json的sha、lockSha256、runId/runAttempt及TEST_REPORT.json的sourceSha/zipSha256、Windows smoke/extraction PASS。Windows PowerShell：`Get-FileHash -Algorithm SHA256 .\GankSoft-v0.7.6-win64-portable.zip`。将同一ZIP交Win10和Win11执行WINDOWS-CHECKLIST.md。
8. release-rc会在环境处等待审批；下载测试包不需要放行它。未经另行发布授权，不批准此job，不创建Release。真机NOT_RUN时仍是候选；版本字符串0.7.6不会自动变成正式签核。

本轮不执行以上审核、Ready、合并、环境批准或发布动作。
