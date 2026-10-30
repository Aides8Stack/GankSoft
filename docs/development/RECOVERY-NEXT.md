# GankSoft v0.7.7 当前恢复入口

T1-B DONE（收集结束）。指定9条：8PASS/1FAIL/0BLOCKED/0NOT_RUN；命令另选KNOW-12未实现，合计10条：8PASS/1FAIL/0BLOCKED/1NOT_RUN。

模块：analytics 3PASS；knowledge/Markdown 4PASS+KNOW-12 NOT_RUN；media 1PASS/1FAIL。MEDIA-03两次独立复现30/80变80/80，UI和持久化均覆盖；失败后停止该链，后续重启未跑，不借MEDIA-01冒充通过。无生产修改。

实测待修2项：继承AUTO-NEW-16-e0ee13132997；新增AUTO-MEDIA-03-a28b76820cf6。另4项用户报告待复现。测试工具故障独立FIXED，不计生产BUG；未进入I3/F4。

最后被测脚本SHA：7389b5ac034179649aba091a373d8772b5df8d46；首批有效CASE SHA：d2c0cb67d36dae3def2fd28922df402b0b71bd02。最终文档检查点从远端feature/v077读取。证据docs/v077/evidence/T1-B-RESULTS.json；报告docs/v077/T1-B-REPORT.md。原始截图/日志/数据库快照在validation-results/v077/runs，Git仅永久保存摘要/文件hash/脚本；不提交SQLite或二进制截图。

下一阶段T1-C / GPT-6.1 Sol / Medium：exchange、settings、storage、reliability及未覆盖基本路径。KNOW-12留后续。仅按授权继续，不自动开始。不要重读250清单/旧报告、不重复task:init或已通过项。按WORK-E2E-EXECUTION.md节约规则，脚本先保存GitHub再对准确SHA执行；先dry-run再collect写入，promote仅真实GUI结果。

本轮环境已有依赖和410输出，status有效，全部复用；没有prepare/ci/build。新Work先status，有合法同平台同指纹Artifact优先恢复，缺依赖/输出才prepare。每CASE隔离606，禁止用户数据。WindowsCI和Win10/11实机均NOT_RUN，Linux不冒充Windows。

保存核验后结束，不等CI、不合并发布、不进入生产修复。
