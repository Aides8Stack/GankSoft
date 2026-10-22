# G3 安装身份修复测试账本
## Portable-only release migration (2026-10-21)
Goal: stop Inno/setup output and historical RC reinstall; only build and permanently preserve Windows x64 portable ZIP via owner-approved GitHub Release. New version 0.7.4-rc.6; source develop 2145e5c1f6a92e5900a94581950da9ba3bc8b1f1. New workflow uses current SHA, dual-platform quality/security, actual Windows portable smoke and ZIP deep-path extraction, manifest SHA verification, and gated release. Legacy installer scripts and manual stable candidate are dormant, not silently removed. See docs/ci/PORTABLE_RELEASE.md. Current state IMPLEMENTED_PENDING_CI; new Windows real acceptance NOT_RUN until CI; Win10/11 manual NOT_RUN. Do not merge or authorize release automatically.


## 当前续修：卸载显示名称（2026-10-21）

状态 **IMPLEMENTED_PENDING_CI**。继续原PR #10 / fix/g3-inno-install-identity → develop；不创建PR、不合并、不审批、不发布。以下更新优先于后面的历史快照。

已重新核实失败HEAD 8b12d63775e94dd4670aa7a74d437082496f5485、Run39533875571、Windows Job119006178153，以及原Artifact12316627030。
`ci/inno-registry-1.json` 原始值：hive=HKEY_CURRENT_USER、view=Registry64、exists=true；键尾GankSoft-ff915f18daf22f47f5cd1243f98ac47029f9d19db0812bca_is1；DisplayName=`GankSoft version 0.7.4`、DisplayVersion=`0.7.4`。InstallLocation为本次隔离目标（末尾反斜杠），UninstallString为该目录引号包围的unins000.exe；完整原始路径保留在上述Artifact中。
`ci/inno-install.json`：首个stable fixture install/identity-validation/uninstall=PASS，registry-validation=FAIL；reinstall/coexistence/launch=NOT_RUN，cleanup为空。其余fixture案例尚未执行，不能称Windows完整验收成功。全部fixture编译与PE版本资源PASS。

真实原因：installer.iss未显式设置UninstallDisplayName，实际注册表名称与install-identity.mjs:29期望的裸`GankSoft`不同。只修这项契约：显式`UninstallDisplayName=GankSoft {#AppVersion}`，校验精确期望`GankSoft ${meta.version}`及完整DisplayVersion；错误消息保存actual/expected。stable期望变为`GankSoft 0.7.4`，历史RC保留完整SemVer。旧名称、裸名称、错误版本、尾空格以及原路径/卸载命令等拒绝用例均保留或增加。

代码仅改installer.iss、install-identity.mjs、install-identity.test.mjs；57字符AppId、每构建隔离、HKCU/Registry64、重装/并存/卸载、元数据、ZIP、版本资源算法、全部workflow/门禁均保持。没有G2重审。

本轮本地：专项17/17、pipeline161/161；ci:quality PASS（基础设施5/5、UnicodeZIP1/1、业务202/202、协议21/21及边界/类型/build）。没有用这些结果代替Windows。本轮ASAR未重跑，先前13套件107用例仅作继承证据，应用文件未改变。离线npm ci因缺少zod缓存失败；随后普通npm ci成功安装194包，才执行上述依赖测试。最终代码测试FAIL 0。

实现远程检查点：470735868ca9b34772a70dfe7c5d0a603d839ad3，已独立读回；tree=cda0e870f2b9955589504f35262a66b79416db11，与本地f489d0d85c8390c882a9a1b6ab7c97cf7778ae31提交树完全相同。原PR仍open。最后交接提交的自身SHA由PR/head和git log -1 -- docs/development解析；不为记录自身SHA无限提交。
新CI已触发：Run39571052720（https://github.com/Aides8Stack/GankSoft/actions/runs/39571052720），head_sha=470735868ca9b34772a70dfe7c5d0a603d839ad3，event=pull_request，读取快照in_progress。scope=PASS；Windows Job119125085408和Ubuntu Job119125085458运行中。Windows链接：https://github.com/Aides8Stack/GankSoft/actions/runs/39571052720/job/119125085408 。本回执只属于该实现检查点；最后文档提交触发synchronize后，应按最终PR head查询新Run，旧Run可能被原concurrency取消。未等待执行结束。

本轮修复后的真实Windows安装/重装/并存/卸载、完整历史应用与ZIP验收均NOT_RUN，须读取新CI实际结果。若失败，先保留actual/expected再局部修复，严禁宽松匹配或跳过。若通过，仍须核对真实安装/卸载及产物证据，再由所有者决定后续授权。提交并确认触发后立即退出，不等待。

## 前序阶段历史记录

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
