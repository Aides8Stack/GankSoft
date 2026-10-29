# M08补验与CI隔离计划

仓库Aides8Stack/GankSoft；唯一分支feature/v075-unified-learning-workspace；原Draft PR15→develop；基线39311546cfb7cb79f75e3b469a24a267f1d5bca3。当前提交SHA从Git历史/远端HEAD读取。

本轮只做M08正式Electron补验准备和CI生产隔离修复。隔离修复已实现并本地PASS：正式606 merge契约/controller/service与旧S8.b入口分离，复用中立图/身份/历史算法；旧代码仍内部测试隔离。原隔离检查器未改，源码262模块/产物410文件PASS；构建、协议21/160方法、相关导入/备份恢复/Markdown交换通过。169/169及18/18继承，不重复全量；因共用身份/来源提取，仅补M08受影响存档1例PASS。

M08仍BLOCKED，正式Electron六组本轮NOT_RUN。当前Linux Work已有SIGTRAP/Unix socket EPERM证据，未再次启动。脚本已按平台选择启动参数，六组断言保留，新增来源/构建指纹与不同PID证据；现有Windows Quality在隔离之后新增必需m08-native-integrity-windows步骤，报告由原PR Reports保存。没有真实6/6报告不能标DONE。

本轮权威恢复：docs/v076/rebuild-v37-source-first/stages/R7/R7.4-M08-CI.md；证据evidence/r74/m08-ci/checks.json。不要重复读取R0–R7历史。下一步读取最终SHA的Windows validation-results/m08-integrity/report.json及ci/quality.json；按真实结果关闭M08或只修具体失败。不进入R7.5/R8；M01–M07保持，B02人工项仍交R8 NOT_RUN。

基线Quality40805896252双平台/最终pr-gate FAIL，均隔离门禁；基线pr-trust40805894615因完整SHA所有者复核要求FAIL。最终提交将触发原PR CI，状态提交后读取；本轮不等待。所有者审批入口actions/workflows/pr-trust.yml，选择main：pr_number=15，source_sha=最终完整SHA，confirm=review 最终完整SHA。不绕过/自批。

正常保存到原PR并独立核验HEAD、完整tree、关键文件后立即结束；不新分支/PR、不强推、不合并发布。
