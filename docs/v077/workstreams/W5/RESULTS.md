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
