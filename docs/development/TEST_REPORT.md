# Pipeline v4 TEST_REPORT
阶段P0审计完成，P1-P6尚未实施。基线c8db715d33265bdf8e2edd05f0f14a35b97de8ac，分支infra/pipeline-v4。
341/341 Git blob和基线tree核验PASS；精确commit重建PASS；task:init归档5份旧状态PASS；npm ci --ignore-scripts PASS（524包，仅依赖获取，生命周期尚未运行）。
下一步P1版本治理。CI/Windows/Release NOT_RUN；分支保护NEEDS_USER_ACTION；未合并/未公开/未Stable。
远程检查点通过Git Data API保存后独立读取ref/tree，当前文档自身SHA由远程分支解析。

P1实现版本单一来源及严格SemVer，0.7.4-rc.1；4项版本测试、version:check PASS；无业务/依赖变化。P0远程352dc1fe81c4156bee9bf71ee4d5c1cde10553ef。下一步P2。

P2：唯一PR监听、稳定pr-gate、分类/授权/版本/基线上下文检查，旧quality.yml退役；保守所有非文档全量双平台，无安装包。版本+分类+故障汇总7项PASS；GitHub事件实测NOT_RUN，下一步P3。

P3：受保护develop+所有者合并+固定SHA预检、全第一父链意图扫描、独立双平台全质量/安全/Windows安装卸载依赖链实现。11项本地治理测试PASS；实际Windows及自动RC NOT_RUN。P4将接入独立资产验证与发布事务。

P4：独立artifact-verify、最小写权限release-rc、Draft完整上传/远程摘要核验/Pre-release；不可变版本SHA、已发布对账、草稿安全恢复、完整ZIP/EXE来源验证实现。16项治理/故障注入测试PASS。完整本地ci:quality另行运行中；真实Release未触发。下一步P5。

P5：Stable正式源码候选全门禁→私有Draft→同包Win10/11各40项签核+所有者独立确认；Release query/rename/withdraw均手动，保留Tag，公开前历史审计及人工配置文档已实现。17项流水线测试PASS；六份YAML事件/权限/依赖/不可变Action pins静态核验PASS。
安全审计发现原Forge7工具链31项漏洞（23 high/1 critical），普通audit fix未解决；升级Forge8.0.1、Packager20.3.0、ASAR4.3.1，适配具名/公开导出，最终npm audit及license/integrity/源代码安全扫描PASS（0漏洞），没有降低阈值。
既有198项中的时区用例初始时区依赖运行环境，在纽约环境“变更为纽约”无效；固定fixture初始UTC，明确验证真实写入并保留原异常断言，UTC/上海/纽约各5项PASS。生产业务代码未修改。
本地ci:quality完整入口PASS：5基础设施、1中文ZIP、198业务（包含21协议），协议21重跑、类型/边界/前后台构建。被测工作树以P4远程c61091656441b8ada31c083424dc1f55b21bd6ed为基础；后续P5源码变更须独立核验。Linux ASAR/UI执行中，不宣称结果；Windows/Stable/公开历史审计NOT_RUN。下一步P6综合验收及Draft PR。
