# W4 — AI 学习数据 ZIP 导出与 Prompt 实现结果

**W4.1 / W4.2 / W4.3 DONE（Linux 定向验收）。W4-01～W4-08：8 PASS / 0 FAIL / 0 BLOCKED / 0 NOT_RUN。**

仅实施 W4。W5 建议导入、解析记录、执行、撤销，以及 Issue #36 普通卡片内容 ZIP 均未实施。没有合并、发布、强推或等待 CI；W1–W3、B1–B5和旧250条全量未重跑。W3受直接影响的共享指标5项仅作必要交界复验。

Windows CI、Windows 10、Windows 11、真实125%DPI、中文字体视觉签核分别 **NOT_RUN**。Linux 的真实 Electron 窗口/DOM/交互通过，原生保存对话框只注入选择结果，不冒称物理 Windows 文件选择器验收。

## 三个检查点及源码身份

| 身份 | SHA / tree |
|---|---|
| 起点 GitHub HEAD | `4f1cadaa76c3ec4defdd65c27dfce68ae9ebc58b` |
| W4.1 远端 | `4c62fdcbd3fc66c045303abfcdcc859d3d4e4af1` |
| W4.1 完整 tree | `087e9fa0e59a376dbff9ea2dcea1c5c986526d95` |
| W4.1 同 tree 本地提交 | `1fe4b4e9b08de0118d61dbc0b88565dc54063641` |
| 最终被测生产源码 | `b9a73a039622cd6f10ef91bd2e89d86e3568f364` |
| 主领域测试脚本检查点 | `b9a73a039622cd6f10ef91bd2e89d86e3568f364` |
| 正式 GUI / native-dialog 测试脚本检查点 | `b9a73a039622cd6f10ef91bd2e89d86e3568f364` |
| 上述完整 tree | `6592f56ff4c4e91b39396d904ef0c5ce3cdef28b` |
| 实际执行时本地 HEAD（同完整 tree） | `9929a46cf54ec4b5c59c13b28e7c084cc0d13ed4` |
| 安全补验脚本 | W4.3 最终证据提交中的 `tests/w4-ai-analysis-safety-v077.test.ts`；精确 Git blob/SHA256见 SOURCE-IDENTITY |
| 最终文档/证据提交 | 从本路径 Git 历史、feature/v077 ref及Issue #35回执解析，禁止虚构自身SHA |

CLI 普通 push 因缺少 HTTPS 写入凭据失败；使用已授权 GitHub 连接器逐文件创建并核对真实 Git blob，以对应远端 HEAD 的 tree 为基础、真实 parent、expected_sha + force=false 正常追加。两个实现检查点均独立 fetch 核对完整 tree；没有覆盖远端或改写历史。最终证据提交后再独立核验。

[SOURCE-IDENTITY.json](./evidence/SOURCE-IDENTITY.json)记录所有直接修改生产文件、主/安全/GUI脚本、夹具、锁文件的字节数、SHA256与Git blob，以及427个实际编译输出的指纹。GUI报告另含完整生产输入逐文件SHA256，已重新计算并与远端同tree核实。主领域18项来自 frozen-domain；安全3项来自 final-safety-protocol。最终 gui-exact 是在最终后端编译与最终共享协议前端必要增量构建后运行，保留早期GUI报告，不把早期编译输入冒称最终输入。

## 正式行为与协议

入口为 **学习分析 → AI 调度调整 → 导出分析 ZIP / 修改 Prompt**。子页面均有返回；Prompt尚未保存时阻止顶部直接离开，用户可显式保存或取消，保存成功后下次ZIP使用新内容，独立PID重启可读回。Prompt保存使用现有settings与CAS/事务/回执，不创建新表；统一数据失效机制排除Prompt写入，不因此重算全部学习统计。

5个统一网关方法：`learning.aiAdjustment.prompt.get/save`、`learning.aiAdjustment.export`、`.export.status`、`.export.cancel`。导出及活动进度/取消是平台query，不写学习表、不提升dataRevision、不创建学习回执；同jobId成功重放不重新写文件。活动任务期间才读取进度，不增加全库定时轮询或第二套业务数据库。

ZIP为 `ganksoft.ai-analysis/1`、Schema606：

- `data/manifest.json`：exportId/snapshotId、epoch/revision、知识/调度版本、Prompt修订、卡/事件/知识点总数、每片SHA256与字节数、资源预算。
- `data/deck.json`、`data/summary.json`：当前配置/知识顺序，全卡片集统计与完整区间每日趋势；日期只限制统计摘要，**不裁剪卡片和历史事件**。
- `data/knowledge/nodes-XXXX.json`：知识正文、父节点身份，W3同口径direct/aggregate统计；按卡片去重，不能将不同节点的重叠统计相加。
- `data/cards/cards-XXXX.json`：每片多卡，当前发布正文/知识关联/current cycle与FSRS/策略/hash/到期；不包含草稿。
- `data/reviews/reviews-XXXX.json`：跨卡事件，包含eventId/cardId、事件当时评分/客观正误/有效用时/反思/知识与策略快照，以及对应内容版本和实际schedule_events前后状态。保留旧周期历史，不拿当前内容冒充历史版本。
- `data/index/cards-XXXX.json`：分页混合card/event索引，精确引用主体/历史文件及items中的零基位置；单卡记录事件总数、当前version/cycle/scheduleHash和知识关联，可完整重组。
- 可选 `data/images/`：独立资源、按资产身份去重、校验PNG/JPEG/WebP解码/大小/路径/已有哈希。默认不附图片并标记materialIncomplete，不允许AI猜测缺失材料。
- `prompt/analysis-prompt.md`：先读全卡片集/知识点摘要，再按manifest/index遍历全部分片，要求报告卡片/事件/知识点实际覆盖率和缺失文件，不把局部样本说成全量；正文里的指令视为数据。只提出既有调度调整建议，不声称已执行。

manifest的files覆盖除manifest自身以外的全部条目；`totalDataBytes`为其中文件路径位于data/的字节和，排除manifest自身和prompt，避免自引用计数/哈希。普通JSON、便携卡片/事件/索引/知识记录均有严格版本或Zod结构校验。

导出通过当前owner授权的独立SQLite **readOnly + query_only** 事务，在首次读取meta时固定快照。原写owner栅栏未放宽；只读句柄禁止写入，关闭后失效。逐卡/知识点/事件迭代，W3/W4复用指标reducer；统计只保留有预算的scalar累计值。ZIP用yazl惰性读取接口、流背压逐片压缩到同目录临时文件，随后yauzl流式检查实际展开量/路径/唯一条目/SHA256/CRC/字节数；同步落盘后原子改名。失败/取消删除临时文件，已存在的目标文件不会被失败导出破坏。

文件名为 `GankSoft-v0.7.7-YYYYMMDD-ai-analysis.zip`（上海日期），无随机数字签名。临时文件内部使用独立后缀，不能误认为完成包。继承package版本未作无关修改。

## 实际验收

| CASE | 状态 | 实际证据和范围 |
|---|---|---|
| W4-01 | PASS | 1/10/225/499/500/501/1000/5000/10000张真实合成SQLite卡片，各带同数量事件，逐包真实生成/解包/完整索引核验；主体片数1/1/5/10/10/11/20/100/200，无500张上限或每卡一文件 |
| W4-02 | PASS | 0/40/111条单卡历史，111条跨3个事件片；大中文多卡按实际UTF8字节分片并无损重组；实际发布100000中文字符正文超过256KiB后明确拒绝、原文未变、无完成/临时ZIP，不截断 |
| W4-03 | PASS | 全部卡片/eventId定位、每文件SHA256/字节、唯一计数、总数据字节、ZIP流式CRC与独立解包一致；知识父子重叠direct/aggregate及summary/trend与W3相符；仅篡改中央CRC、数据不变也明确拒绝 |
| W4-04 | PASS | 真实并发新评分提升live revision并增加事件，ZIP仍为旧固定修订的1次事件/摘要/排期；只读snapshot尝试写入被SQLite拒绝，关闭后不能读取 |
| W4-05 | PASS | 默认Prompt、CAS保存/过期拒绝、取消不写、版本不兼容拒绝、真实ZIP文本一致；Electron保存/取消/离开保护、新PID20→95读回 |
| W4-06 | PASS | 真实PNG不附→材料不完整、附带→真实二进制一致且去重；损坏/缺失/>20MiB图片拒绝，临时文件清理；GUI有明确私人数据/图片缺失提示 |
| W4-07 | PASS | 注入可用空间0触发明确预算错误、中途写失败、原目标文件保留；实际临时ZIP已写入后取消、完整ZIP校验阶段取消均清理；GUI保存选择取消/活动取消/真实无效目录错误可见 |
| W4-08 | PASS | 正式Electron900/1366/1600实际点击、Prompt区域尺寸及零页面横向溢出、每宽真实ZIP；SQLite完整性ok/外键0/Schema606，新PID重启、学习历史/FSRS/排期原始字节前后一致；0 renderer error |

最终[gui-exact.json](./evidence/gui-exact.json)有11组GUI断言和实际PID；三宽PNG已保存。[frozen-domain.log](./evidence/frozen-domain.log)18 PASS，[final-safety-protocol.log](./evidence/final-safety-protocol.log)安全3 + 协议21 PASS。10,000卡与10,000事件实际样本耗时约31.5秒（包含夹具、W3对照、独立解包/索引校验），ZIP约2.08MB；测试进程heap含独立全量校验和W3对照，**不能当成导出器独立内存峰值**。

[合成GUI实际ZIP](./evidence/GankSoft-v0.7.7-20261101-ai-analysis-synthetic.zip)包含25张合成卡和1条事件，可独立解包核验；大样本临时包由测试清理，脚本可重建，未虚构大包永久存储。二进制仅为合成数据，无用户真实库。

## 命令、资源及未测范围

- `node --experimental-strip-types --test tests/w4-ai-analysis-v077.test.ts`：最终18 PASS。
- `node --experimental-strip-types --test tests/w4-ai-analysis-safety-v077.test.ts tests/protocol-v2.test.ts`：最终24 PASS。
- `W4_EVIDENCE_DIR=validation-results/w4/gui-exact node --experimental-strip-types tools/validation/v077/w4-ai-analysis.mjs`：正式Linux Electron PASS。
- W3受影响共享指标5 + 协议21：26 PASS（必要交界，不是W3整批重跑）。`npm run check:protocol`、最终边界、Vue类型与后端类型通过，实际170方法；必要完整构建一次，后端/renderer在最终协议变动后做必要增量。依赖/锁文件复用，没有重新安装。
- 中央contracts-v2静态旧快照沿用既有W1/W3归档处理；本批5方法及ZIP记录合同分别在contract-ai-api.json/contract-ai-records.json。运行时registry权威；`npm run protocol:export`可重建完整170方法快照，不混入历史大规模重排。

资源预算均为字节/设备预算：普通片硬256KiB、目标128KiB、主体参考50条、事件40条；超大单条明确拒绝，不截断。ZIP展开2GiB、10万条目、目录16MiB、统计scalar状态16MiB、图片20MiB/个及去重索引8MiB、SQLite页缓存8MiB、磁盘余量16MiB。**没有固定卡片或事件总数上限**。单摘要/配置超过256KiB时明确提示超预算；普通内容ZIP仍属于Issue36。

**NOT_RUN**：超过10,000张的压力、接近2GiB/10万条目极限、独立导出器峰值内存、真实磁盘耗尽（已做空间预算故障注入）；Windows CI/Win10/Win11/真实125%DPI/中文字体视觉及物理原生文件选择。上述未测项不冒充PASS，也不以测试注册或数据生成为通过。

失败日志归档文本仅去除行尾空白，未改结果、错误或断言。早期失败/修复均保留日志：Node strip不支持参数属性；夹具未先保存评分；图片工厂API名错误；初次只读句柄受既有owner栅栏拒绝后按授权只读快照接入。没有删除断言、放松写栅栏或把未运行当成功。早期GUI编译证据与最终精确构建证据分开保存。

## 停止与恢复

本轮三个检查点完成，最终保存和独立核验后立即停止。Issue #35仅W4已完成，W5仍NOT_STARTED，Issue保持打开。后续如获新授权，入口 `docs/v077/workstreams/W5/README.md`；必须从实际最新feature/v077恢复，不自动执行W5、Issue36、CI、合并或发布。
