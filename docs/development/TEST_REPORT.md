# G3 安装身份修复测试账本

状态 IMPLEMENTED_PENDING_CI；任务 IN_PROGRESS。环境 Linux / Node24.19.0 / Python3。
被测内容：本地35c1b49e8051b1f2ce8a3b5777d199423b819223加本修复工作树；该准备提交基于a007001，只含任务初始化和强制rc.5版本提升。提交后以相同文件内容的远程tree核对；不是声称提前测试了尚未生成的SHA。

| 阶段/命令 | 结果 | 证据/范围 |
| --- | --- | --- |
| 原始日志/报告重新读取 | PASS | Run39528225102 / Job118991333874 / Artifact12314936808；安装/卸载成功，注册表查询失败；原launch=FAIL误归类 |
| npm ci --offline | PASS | 锁文件安装194包，未使用ignore-scripts；无依赖升级 |
| node --test 四个身份/版本资源/delivery专项文件 | PASS 16；FAIL 0 | install-identity、windows-version、inno-resources、delivery；包含通过与缺失/错值阻断、边界、恶意输入、不同SHA/Run/attempt、10000身份碰撞回归 |
| npm run test:pipeline | PASS 160；FAIL 0 | 新身份测试4个包含其中；审批/PR/RC/Stable/ZIP/manifest/CRLF及完整工具链回归保留；owner-rc夹具只补新身份，不放宽审批 |
| npm run ci:quality | PASS | 基础设施5/5；Unicode ZIP Python 1/1；业务202/202；协议21/21；边界/类型/导出与应用build全部exit0；协议21含重复运行，不累计为独立业务用例 |
| node tools/validation/package-check.mjs | PASS | Linux实际Electron ASAR/GUI：13套件107用例；缺原生图片插件隔离通过；validation-results/package-v073.json |
| 修改后定向复核 | PASS 16；FAIL 0 | 当前最终生产脚本改动后专项重跑；artifact验证额外阻断新阶段FAIL/NOT_RUN/缺失及安装身份伪造 |
| git diff --check / node --check | PASS | 无空白问题；新增JS与Inno回归入口语法通过 |
| 阶段B：Windows/Inno6.7.1实际安装、重装、并存、卸载fixture | NOT_RUN | PR现有Windows Inno步骤现已接入；五案例，报告fixturePayload=true、launch=NOT_RUN；本地无pwsh/Windows，未模拟成功 |
| 阶段B/C：真实历史GankSoft编译/资源/安装/metadata/注册表/启动/卸载 | NOT_RUN | 本修复新一轮结果待原develop-rc队列；PRfixture和LinuxGUI均不能替代 |
| 0.7.4完整历史应用 | NOT_RUN | 本地可见历史未找到对应版本源码SHA；只覆盖映射及fixture，不改源码版本伪造历史 |
| 阶段D：Windows80/100字符解压、路径边界、全文件hash与完整产物验收 | NOT_RUN | 本轮真实Windows结果待CI；代码及原artifact-verify/manifest/ZIP门禁保留 |
| Win10 / Win11人工同包验收 | NOT_RUN | 保持RC；无签核 |

调试过程：首次pipeline出现24个失败（旧夹具缺新字段及旧结构断言）；补齐后1个失败（Run/attempt阻断现在先被身份校验拒绝）。更新该测试以构造内部一致但来自另一attempt的产物，原wrong build Run断言仍保留。最终160/160；另增加新阶段缺失/失败/伪造的阻断回归，最终专项16/16。未捕获失败继续发布、未减少门禁。

全部门禁保留：pr-gate/pr-trust、artifact-verify、rc-publish-owner人工审批、RC/Stable隔离。没有执行G2全历史安全重审、自动审批、合并或发布。

## 远程检查点与触发回执

新PR：https://github.com/Aides8Stack/GankSoft/pull/10 （open，head=fix/g3-inno-install-identity，base=develop；未合并）。
阶段A提交：ce088fbd0b3cb44ed4497eb28f80e41bc2039631。
阶段B提交：56a84a5d4d4692f602204db724f7f5709b390ec4；远程ref独立读回一致。
远程tree=5279285f20b024ab6c8ca44e0784747e98e2cfdd，与本地已提交5345dd0da7426440735fa91deef52f02075ccecc的tree精确相同；该本地提交上再跑pipeline160/160、完整metadata生成/committed-toolkit hash及身份CLI通过，工作区干净。此前全部quality/ASAR测试针对同样实现文件。

已确认PR quality Run39533697469被触发：
https://github.com/Aides8Stack/GankSoft/actions/runs/39533697469
被测head_sha=56a84a5d4d4692f602204db724f7f5709b390ec4，event=pull_request，快照in_progress；scope已PASS，Windows/Ubuntu quality运行中。Windows Job：https://github.com/Aides8Stack/GankSoft/actions/runs/39533697469/job/119005324813 ；Ubuntu Job119005324912。
本回执只对上述SHA/Run有效，不代表测试完成。最后文档提交会触发synchronize，旧Run可能被原有concurrency取消；当前文档提交SHA由远程分支/PR head及git log -1 -- docs/development解析，最新Run须按该SHA查询，不把旧Run当成最终head验收。按规则不为写入自身SHA无限提交。

IMPLEMENTED_PENDING_CI。未持续轮询或等待Windows结束；未审批pr-trust/Release、未合并/发布。下一会话先重新核对最终head和最新CI，再读取具体失败Job或真实安装/卸载/产物证据；只有所有者可授权后续合并与发布审批。
