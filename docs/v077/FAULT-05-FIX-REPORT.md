# FAULT-05：被拒图片粘贴的请求级资源回收（2026-10-30）

用户已明确批准推荐规则并要求修复。当前 **FIXED_PENDING_WINDOWS**：正式Linux Electron `FAULT-05 / CLIP-14 / MEDIA-01 / MEDIA-03` **4/4 PASS**，含真正SIGKILL、新PID恢复及独立宽度持久化。关联媒体服务16/16、协议21/21、边界/类型检查/生产构建通过。没有扩大到剩余P1测试、全量91/250、发布或版本修改。

## 根因与批准后的合同

原media.stage先写暂存图片/metadata，旧adapter只有插入、没有失败释放。编辑器正确拒绝过期正文插入，但没有请求所有权或启动恢复规则。上一轮依照旧文档保留FAIL/合同待决，历史报告和证据仍保留；本次用户批准后更新合同并实现。

- 仅图片粘贴适配器选择独立`insertionId`。主进程分配全新asset ID，在首次文件写入之前提交包含文件名、哈希、deckId和请求身份的日志。暂存元数据也携带insertionId；不能用一个请求清理其他资源。
- editor完成原有书签/正文版本/实例检查；插入成功后确认accepted。被拒、取消或实例销毁在finally中结算rejected，错误会保留原拒绝原因及清理待重试提示。派发后发生异常时，若图片已在原生文档内，按accepted保护。
- pending图片不进入资源库选择列表，避免其他在途编辑提前采用。每个stage分配新资源，不共享其他请求的临时所有权。释放只定位该日志的资源，核对meta所有权、路径、普通文件/非符号链接与字节哈希；遇到合法引用则保留，并结束其失败请求自动回收资格。
- 回收保护包含草稿、未发布卡片、当前/非当前正式版本、知识正文、学习历史、回收/恢复记录及其他保留表；不只查询当前正文。引用不确定、文件改变或所有权改变时不删除。其他请求、其他卡片集和普通未引用暂存资源不会被全库清理。
- `media.stage.finish`提交结算状态/退役队列及协议回执后，才物理删除文件；`media.stage.status`返回清理是否仍待重试和错误原因。真实删除失败会登记错误并保留文件，后续成功写操作或取得独占数据Owner后的重启恢复重试。回执事务失败则状态/metadata回滚，文件不删除，原请求可重试。
- 启动只恢复本机制中未完成的pending请求；accepted、普通暂存和合法引用保留。日志覆盖“已写文件但尚未写media-draft metadata”的崩溃窗口。完整备份与恢复也执行同一引用保护。

只新增可选media.stage输入和两个媒体方法；Schema606不变，旧调用不传insertionId继续保留原语义。更新既有组件/ADR的对应条款与协议派生文档，没有重新设计测试框架。

## 实际验证

被测本地SHA：`cfbdac210940e6e4cb2281ff896d4108fc7ce6ed`。完全相同Git tree `100ef477cabe07cf4d9424cc1af12eba866016c2`的远端源码检查点：`11f0c5e773ffaa879580103fdce4e530c5a8535a`。保留并发成果后的分支生产提交：`2d5f05f749bfa4c7a4246a6f4d5f667e6f1b7203`。不改写原始测试来源SHA。

| 命令 | 实际结果 |
| --- | --- |
| `node tools/validation/v077/run.mjs run --ids FAULT-05,CLIP-14,MEDIA-01,MEDIA-03` | 4 PASS，正式生产Electron |
| `node --experimental-strip-types --test tests/media-insertion-v077.test.ts tests/media-library-v076.test.ts` | 16 PASS /0 FAIL |
| `npm run check:protocol` | 21 PASS，边界/类型/162方法导出PASS |
| `npm run build` | PASS，414输出；后续复用有效构建 |

FAULT-05原断言未降低：异步stage期间修改正文→GUI明确拒绝过期插入→正文无图片、草稿无错误引用→新进程后文件树与原图哈希完全相同。追加真实崩溃链：主进程真实stage完成但回复仍被测试端hold，确认多出1张PNG后SIGKILL；新Electron进程恢复日志，仅移除该孤立图，原草稿、原图和正式内容/历史受保护表保持一致。

CLIP-14验证编辑器销毁的失败释放；MEDIA-01验证成功接受资源可以正常保存、资源库读取及新进程加载；MEDIA-03验证同一asset的两个placement仍独立30%/80%，DOM、Markdown/draft.get及重启一致。

服务测试额外覆盖：其他在途/accepted/普通孤立/其他卡片集字节保留；跨集结算拒绝；注入协议回执失败完整回滚及同请求重试；草稿/非当前发布历史保护；文件删除边界EACCES登记/查询/启动重试；缺少stage metadata的崩溃窗口；不透明恢复引用/被改文件保护；完整备份恢复后的图像保护与pending回收。原媒体库引用/事务/跨集回归同时通过。

测试开发期间的接线/严格scope解析/SHA计算问题已在本地定向修正；最终以上命令均PASS，没有伪造成功或删除旧失败断言。依赖复用、无npm ci/锁变化；Linux x64/Node24.22.1/Electron44.9.1/Schema606合成隔离库；没有用户数据库访问。Windows物理输入/Win10/11与本次修复的Windows CI均NOT_RUN，保留已有效的其他Work旧Server CI证据，不把它当作当前源码验证。

## 生产文件与保存

生产涉及：`src/editor/media-adapter.ts`、`src/editor/milkdown-adapter.ts`、`src/services.ts`；`electron/main.ts`、`electron/protocol/gateway.ts`、`electron/modules/storage-unified/restore-session.ts`；`electron/modules/media/{drafts,library,reference-guard,staged-insertions}.ts`；`shared/protocol/{registry,media-insertion}.ts`。相关测试仅补充现有host/p0-editor和新增媒体服务专项。

永久文本证据：`evidence/FAULT-05-FIX-RESULTS.json`，包括GUI步骤、SQLite/文件摘要、哈希、两次重启与SIGKILL PID、原始case/diagnostics哈希、命令回执及源码tree映射。原始PNG与完整诊断仅本地，不向GitHub上传二进制。

远端期间前移至44960f9、fdabd07，已按Git合入：完整P1-B1报告/34条用例结果、新ENV-05/CAT-03缺陷和Windows Server测试代码/证据全部保留。源码先基于真实被测tree保存独立检查点，再以最新远端为第一父、该检查点为第二父正常追加；expected_sha/force=false，无新分支/PR、强推或覆盖。

因远端仅文档前移，结果晋升在精确被测SHA的隔离detached worktree中执行原promote.mjs dry-run/实际晋升，原case.json逐字复制；回到最新账本时先核对4条原对象未被并发更改，再只合并这4条。未削弱晋升器或改来源SHA。当前 **118 PASS /2 FAIL /3 BLOCKED /127 NOT_RUN**，其余246条CASE对象、所有Windows层、其他缺陷逐项保留。剩余FAIL是其他Work新发现的ENV-05、CAT-03，不在本轮范围。原GH-16/17/21未被关闭。

最终文档提交SHA由远端读回解析；不为写自身SHA重复提交。保存后停止，不等待CI、不合并develop、不发布。
