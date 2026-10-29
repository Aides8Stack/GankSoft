## 2026-10-29 检查点 A：M08 fresh606 契约修复

本轮基线 e3b91d4f4df97d23a2005031790e4e196313c94a；原分支/原Draft PR15。迁移验证与正式fresh606 UI分离，生产准入策略未改，未伪造标记。Linux正式Electron六组6/6，独立PID重启/全表与附件读回PASS；迁移领域专项18/18。加入阶段、心跳、首窗口与进程输出、有限超时和强制清理。Windows真实0/6 NOT_RUN，M08 Gate仍BLOCKED。证据：stages/R7/evidence/ci-closure-20261029/m08-report.json；后续只完成本轮旧ASAR集中分类/补验和统一保存，不进入R7.5/R8。

# M08及CI交接

仓库Aides8Stack/GankSoft；唯一分支feature/v075-unified-learning-workspace；原Draft PR15→develop；基线39311546cfb7cb79f75e3b469a24a267f1d5bca3。当前提交SHA从Git历史/远端HEAD读取。

本轮只做M08正式Electron补验准备和CI生产隔离修复。隔离修复已实现并本地PASS：正式606 merge契约/controller/service与旧S8.b入口分离，复用中立图/身份/历史算法；旧代码仍内部测试隔离。原隔离检查器未改，源码262模块/产物410文件PASS；构建、协议21/160方法、相关导入/备份恢复/Markdown交换通过。169/169及18/18继承，不重复全量；因共用身份/来源提取，仅补M08受影响存档1例PASS。

M08仍BLOCKED，正式Electron六组本轮NOT_RUN。当前Linux Work已有SIGTRAP/Unix socket EPERM证据，未再次启动。脚本已按平台选择启动参数，六组断言保留，新增来源/构建指纹与不同PID证据；现有Windows Quality在隔离之后新增必需m08-native-integrity-windows步骤，报告由原PR Reports保存。没有真实6/6报告不能标DONE。

本轮权威恢复：docs/v076/rebuild-v37-source-first/stages/R7/R7.4-M08-CI.md；证据evidence/r74/m08-ci/checks.json。不要重复读取R0–R7历史。下一步读取最终SHA的Windows validation-results/m08-integrity/report.json及ci/quality.json；按真实结果关闭M08或只修具体失败。不进入R7.5/R8；M01–M07保持，B02人工项仍交R8 NOT_RUN。

基线Quality40805896252双平台/最终pr-gate FAIL，均隔离门禁；基线pr-trust40805894615因完整SHA所有者复核要求FAIL。最终提交将触发原PR CI，状态提交后读取；本轮不等待。所有者审批入口actions/workflows/pr-trust.yml，选择main：pr_number=15，source_sha=最终完整SHA，confirm=review 最终完整SHA。不绕过/自批。

正常保存到原PR并独立核验HEAD、完整tree、关键文件后立即结束；不新分支/PR、不强推、不合并发布。


## 2026-10-29：最终两项 CI 精准修复
基线80e5f8dd2aa0f3487aad88626125f57fb06bfeb5，原PR15/原分支。P1语义定位与继续学习名称修复，本地真实PASS；Electron准备拆为独立必需门禁，原校验installer及缓存、文件/运行时版本架构验证、本地首次及复用PASS。构建/原生产隔离PASS，core 5/5及语法/diff PASS；未重跑全量业务。Windows准备及M08六组NOT_RUN，M08 BLOCKED，R7.5待真实6/6和相关质量阻断解除。详见RECOVERY-NEXT.md及R7.4-M08-CI.md末节；保存后退出，不等待CI、不合并发布。
