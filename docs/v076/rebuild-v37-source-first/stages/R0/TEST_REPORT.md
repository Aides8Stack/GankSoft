# R0 实际测试报告

起始远端bccf6ff9f601bb586d5a3f1203378c825ac28eb8；本地同tree parent c074dfa33dc4786fdd77e6215b470baae1433c4f。Linux / Node24.22.1 / npm11.9.0 / Electron44.9.1；采集工作树包含新增工具和记录，生产实现指纹见manifest。没有修改生产源或锁文件。

| 实际命令 | 退出码 | 结果 |
|---|---:|---|
| sha256sum docs/v075/reference/OPEN-ME-v3.7.html package-lock.json | 0 | 原型与锁文件匹配预期 |
| timeout 90s npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000 | 0 | 381 packages / 11s；联网成功；http-proxy配置warning |
| npm ls --depth=0；首次require(electron) | 0 | 无缺项；下载锁定44.9.1二进制 |
| npm run build | 0 | 类型检查/生产bundle通过；保留大chunk提示 |
| node --experimental-strip-types --test --test-concurrency=1 tests/dashboard-v076.test.ts tests/unified-analytics-catalog-v075.test.ts tests/protocol-v2.test.ts | 0 | 28/28 PASS |
| npm run check:protocol | 0 | 21/21再次PASS，边界/类型PASS，导出148方法 |
| node --experimental-strip-types --test --test-concurrency=1 tests/unified-knowledge-v075.test.ts tests/unified-review-v075.test.ts tests/unified-workspace-v075.test.ts | 0 | 31/31 PASS |
| node tools/validation/r0/source-audit.mjs | 0 | AST/CSS/SFC/148协议索引，不算产品测试 |
| node tools/validation/capture-ui-reference-v076.mjs overview | 0 | 初步3图；缺字体试拍，不用作最终视觉证据 |
| node --experimental-strip-types tools/validation/r0/capture.ts（最终run7） | 0 | 3组实际验证，36张PNG；真实production UI/IPC/数据库与新进程读取 |
| node tools/validation/r0/reference-states.mjs | 0 | 52个原型DOM状态；只证明原型渲染 |
| python3 tools/validation/r0/collect.py | 0 | 36图尺寸/hash核验、36压缩快照、18并排图 |
| git diff --check；JSON/gzip/image/敏感模式检查 | 0 | 必须在保存前完成，不作为产品测试 |

59个不同业务/协议测试通过；包含check:protocol重复执行后合计80次通过执行，不把重复21项加成80个不同用例。

## 失败与修复（未改生产逻辑/断言）

1. 夹具多传mode/title → strict input ZodError（exit1）。改为仅传契约scope。
2. question/qa未reveal即submit → SESSION_STAGE_CONFLICT（exit1）。按真实状态机先reveal。
3. submit反思未存草稿 → SESSION_DRAFT_CONFLICT（exit1）。先保存一致反思。
4. direct已处reveal还改独立思路 → ANSWER_FROZEN（exit1）。保留被冻结思路。
5. 图谱选择器误写tag、再遇多元素strict/隐藏返回按钮（exit1）。根据真实DOM使用class及用户可见角色入口，不force click、不加固定sleep。
6. 初始中文缺字：安装官方Noto CJK字体并记录hash；旧图拒为验收。补字体后完整重拍，最终run7 exit0。

失败详情保存在evidence/*.txt；部分失败是同一脚本不同修订，不算产品功能失败。最后没有跳过测试或放宽断言。

## 分类门禁（本轮范围）

| 类别 | 状态 | 覆盖边界 |
|---|---|---|
| VISUAL | FAIL | 已人工看到overview/editor/settings明显结构差异；完整逐图签核NOT_RUN，PNG采集PASS不替代一致性 |
| UI_INTERACTION | PASS | 仅六页导航与真实编辑器/会话显示；保存/所有弹层/键盘全覆盖NOT_RUN |
| IPC_API | PASS | 21协议测试、真实夹具及生产读取；全148方法逐端到端NOT_RUN |
| BACKEND_INTEGRATION | PASS | 所列领域测试、真实606夹具与完整性；未宣称全量 |
| PERSISTENCE_RESTART | PASS | 新Electron进程实际读取卡片数/知识/草稿/暂停会话 |
| NEGATIVE_SECURITY | PASS | 关联测试的CAS/跨集/权限/边界；所有UI负向分支NOT_RUN |
| REGRESSION | PASS | 59个不同测试范围；全量npm test/Windows回归NOT_RUN |
| WINDOWS_REAL | NOT_RUN | 当前Linux，非Win10/Win11/IME/物理剪贴板验收 |

pr-trust: run40471765200/job122080307175，failure=CI_POLICY_REVIEW_REQUIRED。只保存必要脱敏片段和15个控制路径，不自批、不改workflow。起始PR quality run40471768208观察时ubuntu成功、windows进行中；未等待/轮询，不声称整套通过。

最终补充：reference-states最终脚本exit0，52原型DOM状态+6张同appearance/full-map参考；额外6张并排图。合计42张PNG、24并排WebP。`evidence/CHECKPOINT-FILES.json` 列本轮修改/新增的完整路径、大小与blob/hash（不含其自身）；未添加或修改tests/下文件。完整图像逐区域签核仍NOT_RUN。
