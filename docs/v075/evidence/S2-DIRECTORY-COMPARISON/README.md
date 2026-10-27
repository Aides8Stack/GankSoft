# Windows冷启动目录对照证据

父检查点e3051b0d95c418c348d3ac725c98e8c8ffacd9f2；原失败Run39749260681/Windows Job119725473546；Artifact12413335363的正向目录bootstrap/run-zMZeQH/child-t3NvEM/。prior-windows-positive无损保留4份原文件内容：result/stdout/stderr保持原字节，debug日志以JSON content保留原CRLF（读取后UTF-8编码可还原原字节，避免Git把CRLF诊断当代码尾随空白）；SHA256见EVIDENCE.json；stdout原本为空，npm被杀前未写出timing JSON。

真实Windows观测：Node24.21.0/npm11.19.0，C临时目录，120023.6397ms，ETIMEDOUT/SIGTERM/status=null；stderr最后完成reifyNode @milkdown/crepe112667ms。依赖仍有进度，慢的底层原因未知；不是缺yaml或损坏lock负向用例。不能据此认定物理磁盘/杀毒/平台故障。

实现仅测试侧：A=os.tmpdir；B=workspace/validation-results/bootstrap/sources；每次mkdtemp专用中文/空格目录，physical node_modules不存在；同full lock/manifest/hash、Node/npm、cache/env（实际child环境仅记录hash）、ci参数与120000ms/4MiB。顺序A1→B1；安装成功/失败分歧，或都成功但≥2倍且差≥10秒时，才反向B2→A2，总计最多4次完整锁对照。每次结果/完整子进程证据先保留再继续，最后统一断言；失败不被后续成功消除。成功组核manifest/lock不变、yaml锁定版本、npm timing及三模式；缺yaml、坏lock和独立worktree控制不变。

LINUX-DIRECTORY-COMPARISON是最终工作树真实Linux报告，不是Windows：A4283.318ms/B4195.231ms，error无/signal无/status0，全部校验PASS；实际根都是/，无C/D结论，未触发反向。前一次实现验证A5519.638ms/B5234.429ms亦通过；随后仅补回packageCount字段并补盘符解析单测后，再验证最终工作树。两次各2次完整安装，没有无限重跑；Windows仍未执行。

LOCAL-TEST-OUTPUT保留命令输出。最终专测14/14 PASS；test:pipeline退出0，但捕获的spec输出未含总计数，不把预期176推算成观测值；19个其余文件另用TAP明确168/168 PASS，bootstrap自身真实安装、三模式、缺依赖/坏lock/独立worktree结果在run-5lSyIK子进程记录中。ci:quality基础设施5/ZIP1/业务273/协议21/边界/类型/78导出/build通过。Windows负向与真正超时不能混淆。未运行编辑器专项，不把继承的Crepe FAIL改PASS。

下一次读取新SHA的pr-quality Run与pr-reports-windows-latest-<run>-<attempt> Artifact：bootstrap/run-*/directory-comparison.json/.md及对应child-*/{result.json,stdout.txt,stderr.txt,npm-logs/}。先确认Windows平台/实际根盘，再解释结果；反向重复关联仅称目录相关性能差异。两处超时缺实际完成耗时或资源证据；两处成功仅本次未复现。不要重跑碰运气或先扩大120秒。新Run/SHA即时回执在原PR13描述，提交内不能包含自身SHA，不为回填而反复提交。

必要门禁通过后，下一任务入口才是S2表格竞态修复或同fixture备选验证；S2/T05仍BLOCKED，真实IME/系统剪贴板/Base64/Win编辑器实机NOT_RUN，不进入S3。
