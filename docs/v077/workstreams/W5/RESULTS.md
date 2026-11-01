# W5.2 / W5.3 最终交付（2026-11-01，优先于下方历史）

**W5.2 DONE；W5.3 DONE（Linux正式定向验收及Windows便携构建）。Windows10/11真实桌面验收仍为NOT_RUN。** 本次中断恢复仅核验既有源码、测试字节和运行回执，保存尚未提交的补验脚本/原始证据并补全文档；没有重复测试、安装、构建或触发CI。下方IN_PROGRESS/2%额度/未授权段落均为原时点历史，不代表当前状态。

## 实际验收

| CASE | 当前结果 | 证据范围 |
|---|---|---|
| W5-01 / W5-03 | PASS（沿用W5.1） | 原导入/解析/完整分页/冲突及零写入证据保留，本轮未重跑 |
| W5-02 | PASS | 四类真实动作；direct/aggregate去重；1/100/500/501/6000条实际写入并逐卡核验；内容/评分/历史/FSRS内部状态不变 |
| W5-04 | PASS | 准备后正式复盘、目标变化使旧凭据拒绝；事务内重新解析/owner、来源、epoch/revision、完整目标和策略CAS |
| W5-05 | PASS | 跨片整组事务；中途SQL及写回执故障后数据库全表摘要精确一致；撤销中途错误完整回滚；伪造凭据/原始目标篡改/资源预算拒绝无部分写入；原W5.1跨片重复冲突证据沿用 |
| W5-06 | PASS | 原requestId重试、operation.status未知回包恢复、独立owner/进程重启后重放；无第二次修改或虚假成功 |
| W5-07 | PASS | 持久审计、独立重启后整组精确撤销、撤销幂等；后续正式复盘保护新FSRS/排期，无法安全撤销时整组拒绝 |
| W5-08 | PASS | 卡片列表、概览、队列、双维分析、后续W4导出读取同一最新到期覆盖/策略；不重启即时同步，正式复盘清除提前覆盖 |
| W5-09 | PASS（Linux） | 正式UI→统一IPC→SQLite完整导出/导入/选择/确认/执行/日志/撤销链；页面切换与新PID读回；三宽900/1366/1600，无renderer error |
| W5-10 | PASS（构建与来源） | Windows hosted构建成功、精确来源和可读文件名、GankSoft/根目录及ZIP哈希；真实Win10/11桌面/物理剪贴板/原生对话框/125%DPI另列NOT_RUN |

最终冻结同字节：领域 **10 PASS /0 FAIL**、协议 **21 PASS /0 FAIL**（同一日志31项）；准备零写入边界 **1 PASS**、W4后续导出边界 **1 PASS**；正式Linux Electron **7组PASS /0 FAIL**，rendererErrors=[]，独立PID **20→94→169**，SQLite integrity_check=ok，foreign_key_check=[]，user_version=606。本轮新增验收CASE为02、04～10共8项PASS，01/03为既有PASS，不重复计数；不晋升旧250账本。

原始证据：[最终领域/协议](./evidence/full/frozen-domain-protocol.log)、[正式Electron报告](./evidence/full/gui-exact.json)、[GUI日志](./evidence/full/gui-exact.log)、[W4导出边界](./evidence/full/export-boundary.log)、[准备边界](./evidence/full/preflight-boundary-final.log)、[源码/脚本逐字节身份](./evidence/full/SOURCE-IDENTITY.json)。原始失败domain-extra/domain-final/domain-perf-retry完整保留；前者为同日已学卡队列应归relearn的测试设施断言错误，后两者为真实资源预算拒绝并已整体回滚。最终通过前优化了锁定快照下批量身份读取，保留15秒解析、30秒事务、逐卡策略CAS及事务末尾预算检查。最终6000条测试组约30.7秒（含两类故障注入、成功写入、逐卡读回、重启重放及撤销，多次独立事务；不是单次事务耗时）。

## 生产及测试身份

- 已独立fetch核验的生产和主领域/GUI脚本：`49384668bbfbbef0926bb4f85be9cafc1374dd79`，tree `f3abc2baa9fd0e64d643904e40d420a944231981`；实际测试本地`3f7a163132d9fff9d650b647a346a2fab5053043`与其完整tree相同。
- GUI主脚本SHA256：`c27964eaa336840e7e7731339b560053117fd9b6d385b8ddf010aef22ce8d0c3`；领域主脚本SHA256：`5e79200f2f850297bc1fac65ca2b94a3996c2cccb941c468f6b8a37257f1dc56`。
- 两个补验脚本以SOURCE-IDENTITY.supplementalScripts字节身份保存：w52只改测试名称以反映仅准备阶段零写入，w5-export-boundary为后续导出接口交界补验；不改变被冻结生产源码。最终证据提交SHA由本文件Git历史及feature/v077 ref解析，不能在提交自身写入自身SHA。
- 类型、协议边界、必要构建与最终后端增量均PASS；复用既有依赖，没有重复安装，没有重跑W1–W4/B1–B5或旧250整批。

执行使用既有同步host.atomic，使参数/到期覆盖/审计/revision/回执同事务提交；预览展示字符串不参与写入依据。提前到期使用既有settings覆盖，保留FSRS原始due/scheduled_days，正式复盘清除覆盖。既有review_config_operations保存最小前后字段、目标指纹及动作摘要；不保存AI全文、原ZIP或Prompt，不扩Schema606/IPC/引擎。撤销有意保守：任何后续数据库写入或提前任务已经到期，整组拒绝，避免覆盖新的学习；不承诺所有历史操作均可撤销。

## Windows便携交付回执

原中断前已触发的[运行41304150223](https://github.com/Aides8Stack/GankSoft/actions/runs/41304150223)现已 **completed/success**，job124840999450全部构建/打包/上传步骤成功。本次只读回已有结果，没有重触发或等待CI。默认main未部署此workflow，连接器无dispatch；实际通过既有feature/v077的workflow路径push触发，不修改main或绕过审批。

- 来源SHA：`49384668bbfbbef0926bb4f85be9cafc1374dd79`；工作流提交：`19eaa02533d73c30d199109bf87e00390b18fc24`；workflow ID402718539。
- [下载制品](https://github.com/Aides8Stack/GankSoft/actions/runs/41304150223/artifacts/13082234575)：内含`GankSoft-v0.7.7-20261101-win64-portable-test.zip`、相邻BUILD-INFO.json及portable-test-receipt.json。仅win64便携ZIP，无安装器，ZIP根目录GankSoft/；版本仅构建副本package/lock从0.7.6覆盖为0.7.7。
- 内部便携ZIP SHA256：`f12117064dac2e0b62b11d75b3a6221bc169f6d6023b347a557469998647c944`（实际Windows job的Get-FileHash输出，不冒称本地重算）。外层Actions artifact摘要`1ce241c2c1fd56ad669cf08ab4d6061f2de16f3e400890a052a985754bd1554d`是另一层文件，不可混用。
- 制品ID13082234575，174751329字节；API所示到期2026-11-15T11:58:39Z。回执见[windows-build-receipt.json](./evidence/full/windows-build-receipt.json)及[原始来源日志摘录](./evidence/full/windows-provenance.log)。原windows-run.json保留中断前IN_PROGRESS时点，新回执为本次成功观察。

**公开保存恢复：** 此前自动审核先后拒绝截图及整批文本证据上传，未形成新的远端提交；本地检查点3abbf3dac6e5fac4032565878788077342461681、3bc6c91907c64bc12fc4d12f7d5ba1b170846bbe完整保留，没有绕过拒绝。项目所有者在2026-11-01明确授权将本轮原创报告、日志、脚本、合成测试截图和开发记录公开上传至Aides8Stack/GankSoft的feature/v077。按此新授权恢复保存，待上传38个既有变更文件逐项检查未发现真实密钥、密码、个人邮箱或其他受限数据；三张PNG已经逐张检查并核对隔离合成夹具来源。新增[公开上传检查回执](./evidence/full/UPLOAD-REVIEW.json)，本次保存包含这三张PNG及全部文本证据，共39个变更文件。最终远端提交及树以本路径Git历史和独立fetch核验为准，不将本地提交SHA冒充远端，也不为记录自身SHA无限追加提交。本次只保存和核验，没有重新开发、测试、安装或构建。

**剩余未验：** Win10/Win11真实桌面、物理剪贴板、原生文件对话框、真实125%DPI、中文字体视觉签核及超6000条/接近资源极限压力均NOT_RUN；Windows构建成功不代表Windows GUI签核。未操作W6/Issue36/PR38审批、合并或发布。保存并独立核验后本轮结束。

---

# W5.2 原子安全检查点（2026-11-01，历史）

最终预算检查曾发现6000条超过30秒，整组实际回滚；首次进一步优化时重解析超过15秒，同样拒绝且未部分接受。两次失败分别保留domain-final.log和domain-perf-retry.log，不能以此前9 PASS掩盖。现已用单次操作内批量身份读取、共享已锁定配置和逐卡SQL CAS优化；owner/schema检查、提交前owner栅栏、完整目标指纹、15秒解析/30秒事务预算均保留。domain-batch-retry：5 PASS（含6000真实写入/SQL及回执故障回滚/重启重放/持久撤销），6000整组测试约29.1秒。最终同字节复验尚待本次冻结后执行。

---

# W5 连续实施（2026-11-01，当前授权优先）

额度充足，连续授权W5.2→W5.3。旧2%收口段为历史。四类原子执行/必要持久撤销审计/同步事务回执/到期覆盖已实现；首轮领域9 PASS（含6000实际写入、SQL及回执故障回滚、重启幂等和撤销），同步子项故障为同日已学卡应归relearn而非due池，修正驱动后PASS。最终冻结复验及正式Electron完整链尚未执行，不提前宣称W5.2/W5.3 DONE。

执行走既有同步host.atomic，回执/revision和业务写入同事务。使用settings的到期覆盖而非改FSRS due/scheduled_days；复盘清除覆盖，既有原始FSRS状态/历史/内容零修改。review_config_operations保存最小字段前后值、精确目标/指纹/来源动作摘要；audits只存实际变化摘要。撤销保守拒绝任何后续DB写入及已到期待复盘的延后；不覆盖后续学习。没有新表/新IPC/新调度引擎。Windows流程冻结SHA后更新，不改main/PR38。

---

# W5.2 当前检查点（2026-11-01）

**W5.2 IN_PROGRESS。A只读校验子项已实现并通过领域验证；完整A（已执行操作去重/写事务前最终复核）、B原子执行/撤销、C执行验收均未完成。执行/撤销保持disabled、写入方法未注册。**

本轮新增领域4 PASS /0 FAIL、协议21 PASS。6000跨片建议完整选择和重解析通过，**没有实际执行6000条写入**。四类动作规范重解析、显式/全合法选择、二次确认、来源/token/owner/修订/过期、版本/cycle/schedule/知识树/关联/策略指纹（含未提升revision的故障注入）和数据库全表零写入均通过。首次2 PASS/2 FAIL为来源摘要依赖对象键顺序，已改稳定键排序；原失败日志保留于evidence/w52/domain-first.log。

正式Linux Electron只读链 **4组PASS /0 FAIL、0 renderer error**：显式选择/二次确认、全选/取消/选择变化清除旧结果、真实修订变化使准备失效、页面返回及独立PID重启数据库一致。GUI只替换原生文件选择结果，未冒充物理Windows交互。**执行/撤销/幂等回执/operation.status/中途SQL回滚/后续复盘保护/跨模块执行同步/Windows与W5.3均NOT_RUN。**

本轮按2%额度在安全只读检查点收口，**不宣称完整A/B/C或W5.2 DONE**。已执行操作去重、准备凭据持有/消费、写事务内再次校验及所有写入验收须下轮完成后才可开放执行/撤销。现有recompute可提供审计结构参考，但其scheduled_days修改不能未经审查照搬为AI提前动作。

已保存并独立fetch核验源码及领域/GUI脚本远端 **`43534c7ed2cf68b399361df3bd4621e6065f3b5e`**，tree **`5318a254823a249bc325a0b6759f2b2576564dbf`**；本地冻结 **`6489c013b1ec7ecdcb0d50ef3d6dcc95dd2709d8`** 为完全相同tree。领域在提交前相同源码/脚本字节执行，GUI在冻结SHA执行；逐文件身份与原始报告见 [w52/SOURCE-IDENTITY.json](./evidence/w52/SOURCE-IDENTITY.json)。最终文档SHA从本路径Git历史与feature/v077 ref解析，不伪造自身SHA。

证据：[领域最终4 PASS](./evidence/w52/domain-final.log)、[首轮真实失败](./evidence/w52/domain-first.log)、[正式Electron报告](./evidence/w52/gui.json)、[GUI日志](./evidence/w52/gui.log)、[协议21 PASS](./evidence/w52/protocol.log)。命令：`node --experimental-strip-types --test tests/w52-preflight-v077.test.ts`、`tests/protocol-v2.test.ts`；`W52_EVIDENCE_DIR=validation-results/w52/gui node --experimental-strip-types tools/validation/v077/w52-preflight.mjs`；现有依赖复用、后端tsc/Vue类型/Vite必要增量及协议边界PASS，未安装/改锁/跑旧250或W1–W4整批。构建日志仅清除行尾空白。

普通CLI push仍缺HTTPS凭据，使用已授权GitHub接口从真实远端parent/base tree、expected_sha/force=false追加；未强推/绕过审批。源检查点树已独立验证；最终证据保存后再次核验完整SHA与所有变更文件并立即结束。未修改W6或Issue36，未操作PR38/新PR/合并/发布/CI/Windows构建。详见最新DESIGN段。额度约束下优先保存安全只读检查点；禁止把preparationToken当执行授权。以下为W5.1历史，不修改其证据身份。

---

# W5.1 — 安全导入与只读预览验收

**W5.1 DONE（Linux 定向验收）。W5.2 / W5.3 NOT_STARTED，尚未授权。**

仅实现安全解析、白名单/来源/修订校验和只读分页预览。执行、撤销按钮 disabled，未注册写入方法；无新表、影子库、调度引擎或已执行日志。未改 Issue #36 普通内容 ZIP，未操作 PR #38、合并、发布、Windows 构建或等待 CI。W1–W4/B1–B5/旧250整批未重跑。

## 实测结果

| CASE | 状态 | 本轮真实范围 |
|---|---|---|
| W5-01 | PASS | 1/500/501/1000/6000 条真实合法建议，多分片完整解析；6000条经正式网关分页逐项收集，6000唯一actionId、零遗漏；重复ZIP条目/恶意路径、错误CRC/哈希/字节/分片计数/总数、缺片/多片、版本、重复JSON字段/深度/UTF8/展开预算/高压缩比明确拒绝 |
| W5-02 | NOT_RUN（完整CASE） | **白名单校验子项PASS**：四类动作、retention 0.80/0.97、间隔1/3650及越界/非整数、未来提前/延后/已逾期/无排期、跨集、SQL/答案/FSRS字段拒绝；direct/aggregate卡片去重，重叠建议双向冲突。真正执行部分未授权，NOT_RUN |
| W5-03 | PASS | 真实网关及正式Electron导入/分页/取消/选择取消/拒绝后，SQLite全部业务表、元数据、回执和审计表逐内容摘要一致；没有虚假成功消息 |
| W5-04 | NOT_RUN（完整CASE） | **预览失效子项PASS**：真实数据库revision变化后旧token返回stale、再次导入旧来源拒绝；错误epoch拒绝，owner/时间条件注入失效；GUI通过现有激活和数据同步通知自动标记旧预览失效。执行前CAS未授权，NOT_RUN |
| W5-05～W5-10 | NOT_RUN | 原子执行、幂等、撤销、执行后跨模块同步、完整新PID集成与Windows交付均未实施或未运行。仅冲突检测属于本轮已验子项，不晋升整项 |

领域脚本 **5 PASS / 0 FAIL**；统一协议 **21 PASS / 0 FAIL**；最小正式 Linux Electron **6组 PASS / 0 FAIL**，renderer error=0。900/1366/1600三宽无新增页面横向溢出，真实52条建议分页50+2，执行/撤销不可用，返回学习分析通过。原生文件选择只替换选择结果，非物理Windows对话框验收。

首次领域测试4 PASS/1 FAIL：6000条预览token曾误用统一协议2MB单次预算。已改为逐行流式SHA256，未提高或绕过传输限制；页按字节预算缩小，以实际rows.length连续前移。构建日志仅去除行尾空白，结果和断言未改。失败原始证据保留于[domain-first.log](./evidence/domain-first.log)，最终6000条完整网关分页验证通过。其余已PASS部分仅因同一脚本最终冻结验收随组执行，无旧批次重跑。

## 源码、脚本与证据身份

| 身份 | SHA / tree |
|---|---|
| 起点最新远端 | `b912f0a3180f0470dcaa3af59354f0b2eb1eb71c`，保留W4之后的W6方案提交 |
| 已独立核验远端生产及全部W5领域/GUI脚本 | `e06437a580f43e945d05cfd58c9eb49f7a4d9b60` |
| 实际最终测试时本地HEAD | `1c477b88d5127445334d7e9b23865433a529de27` |
| 上述两个提交相同完整tree | `ba784d7a8bdd597133dea6696593bfb29cfae6b1` |
| 最终文档/证据SHA | 通过本路径Git历史与feature/v077远端ref解析；不在提交自身伪造自身SHA |

[SOURCE-IDENTITY.json](./evidence/SOURCE-IDENTITY.json)含全部11个实现/脚本/设计文件的字节数、SHA256和Git blob；GUI报告含所有生产输入文件SHA256。远端源检查点fetch后整树比较零差异。

证据：[领域最终日志](./evidence/domain-final.log)、[协议日志](./evidence/protocol.log)、[GUI报告](./evidence/gui-final.json)、[GUI日志](./evidence/gui-final.log)、[900px](./evidence/preview-900.png)、[1366px](./evidence/preview-1366.png)、[1600px](./evidence/preview-1600.png)。截图因环境缺中文字体而存在方框字形，只用于窗口/DOM布局证据，**中文字体视觉签核NOT_RUN**。

## 实现与命令

- `shared/protocol/ai-adjustments.ts`：严格小包/manifest/分片、四类动作及分页输出。统一registry新增3个query，当前173方法；不新增IPC通道。合同字段及预算见[DESIGN.md](./DESIGN.md)最新W5.1段。
- `adjustment-zip.ts`：不落盘解压，逐流核对实际展开量/CRC、路径/重复、SHA256/完整计数、UTF8/重复字段/深度。全部解析后才生成预览，资源超限整包拒绝，无建议总条数上限。
- `adjustment-preview.ts`：用户同时选择原W4 ZIP和AI ZIP核对来源；复用W4完整性检查、Schema606授权只读快照、既有配置/排期/知识关联。token绑定完整摘要/随机nonce、owner、epoch/revision和有效时间；只在内存保留一个预览。
- `UnifiedAiAnalysis.vue`：原学习分析入口内集成，展示来源、原因、before→after、计数/拒绝/冲突及连续分页；保留原布局和返回。未选/未执行不写学习或参数。
- `node --experimental-strip-types --test tests/w5-adjustment-preview-v077.test.ts`：最终5 PASS（约16.4秒，含6000卡夹具、原始ZIP及全量分页）。
- `node --experimental-strip-types --test tests/protocol-v2.test.ts`：21 PASS；`node tools/protocol/check-boundaries.mjs`、协议typecheck、Vue类型、后端类型及一次必要完整`npm run build`通过。最后仅因UI细节更新做必要renderer增量构建，日志均保存。已有依赖复用，未安装或改锁。
- `W5_EVIDENCE_DIR=validation-results/w5/gui-final node --experimental-strip-types tools/validation/v077/w5-adjustment-preview.mjs`：正式Electron 6组PASS。临时Schema606合成库，无用户真实数据。

普通CLI push因缺HTTPS写凭据失败；已授权连接器以真实parent/base tree、expected_sha、force=false追加保存。没有自动审批拒绝、强推或绕过保护。最终保存后独立fetch核验完整SHA/tree和所有变化文件，不等待CI。

## 限制与下轮入口

原W4没有已导出来源持久表或数字签名，本轮要求用户选择原分析ZIP作为来源基准；不把manifest自校验声称为数字签名认证。原包损坏、来源不同、当前revision/epoch变化均拒绝。达到资源预算时可拒绝合法但过大的包，不能部分接受。

超过6000条、接近32/64MiB或4096条目极限、独立内存峰值/真实资源耗尽/物理文件选择、Windows CI/Win10/Win11/真实125%DPI和中文字体视觉均 **NOT_RUN**。

**保存核验后立即停止。下轮仅新授权后从 W5/IMPLEMENTATION.md 的 W5.2 恢复**：重新取得规范动作与精确目标/周期/hash，用户明确选择确认，复用现有事务/CAS/幂等实现全有或全无；设计安全撤销及W1同步。不得把预览显示字符串直接当作写入依据，不得直接启用按钮。本轮没有实现执行/撤销，W5整体不标DONE。
