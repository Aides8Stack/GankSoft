# Pipeline v4 测试（本轮真实结果）
Linux Node24.19.0/npm11.9.0；从远程develop c8db715d33265bdf8e2edd05f0f14a35b97de8ac逐blob核验恢复，精确重建Git commit和tree；shallow边界明确。
最终被测源码：以P5远程de3092a978a0e8aa1755c5d11b24c4a899c1001e为基线的P6工作树。精确文件SHA256和文档更新前Git tree见docs/ci/evidence/local-validation.json。远程最终提交必须逐tree读回；新文档提交不宣称已有安装包包含本回执。
| 命令/范围 | 结果 | 证据 |
|---|---|---|
| npm ci（最终lock） | PASS | 仅锁定依赖恢复 |
| npm run test:pipeline | PASS | 23项：SemVer、风险分类、权限/事件/DAG、A/B/C对账、故障/篡改、Draft恢复、幂等/墓碑、Stable同包签核、Work退出 |
| npm run ci:quality | PASS | 5基础设施、1中文ZIP、199业务（含21协议），协议21重跑、边界/类型/前后台构建；不是220个独立用例 |
| node tools/validation/package-check.mjs | PASS | 13组Linux ASAR/UI/原生插件缺失故障隔离；不是Windows测试 |
| UTC/上海/纽约各运行review-matrix-v073 | PASS | 每环境5项，fixture固定初始UTC，原拒绝变化断言保留 |
| npm run pipeline:security | PASS | secrets/许可/integrity/工作流权限/依赖审计；0漏洞，首次31项已修复 |
| YAML结构+Prettier+git diff --check | PASS | 六workflow唯一事件、pins、最小权限、有效依赖；5个官方Action commit均经GitHub API核实存在 |
| 内部/源代码/编译输出版本 | PASS | package/lock/backend快照/编译模块同为0.7.4-rc.1 |
| GitHub PR真实事件去重及跨Job故障注入 | NOT_RUN | 当前CI_PENDING/待核实，不等待 |
| Windows构建/安装/卸载/实际EXE版本 | NOT_RUN | 由用户合并后的GitHub Windows Runner完成 |
| 自动RC真实Draft上传/发布/三连合并 | NOT_RUN | 未授权合并；本地mock通过不能代替实测 |
| Win10/11人工、Stable | NOT_RUN | 无真实同包签核，禁止Stable |
| 所有refs历史/旧日志/Artifacts/版权/Apps | NOT_RUN | 本地shallow不能冒充公开审计；仍Private |
首次业务回归197/198失败定位为宿主默认纽约导致测试无时区变化；固定fixture初始UTC并增强断言后最终199/199通过（新增版本单一来源用例）。原工具链31漏洞升级到0；未删断言、未跳过失败或修改阈值。
全部配套验收项逐项状态见docs/ci/ACCEPTANCE_LEDGER.md。当前“代码已实现、本地通过”，不是完整上线/Windows/发布通过。
