# B5 Markdown 逐节点导出与最终集成

**B5.1 / B5.2 / B5.3 DONE（2026-10-31，Linux定向验收）**；Windows NOT_RUN。

基线 `8fa4d94ac39dc7bcc98ec164eca09d7a221a3869`；唯一分支 feature/v077，Schema606。仅B5，三个检查点；不合并、不发布、不等待CI、不重跑旧250。

## B5.1 DONE：协议与唯一范围计算

现有 knowledge.md.export.preview/copy/save 入口不变，无新IPC/表/Store/业务服务。新请求 selectionVersion=2，expectedTreeHash、directNodeIds、rules[{nodeId,includeParentBodies,includeDescendants}]、excludedNodeIds。规则源必须直接选中；对派生行开规则时将该行提升为直接选择。不递归开启新规则。所有ID必须在当前树内，重复/孤立规则/冲突排除明确拒绝。空有效集拒绝导出。

未带版本的旧 nodeIds+全局布尔请求保留原语义，通过显式adapter进入同一范围算法；strict union拒绝混合新旧字段。现有生产UI在B5.2迁移v2，原测试/外部旧调用不静默改变含义。

shared/knowledge/export-selection.ts 是前后端唯一规则与树索引实现：追踪直接、逐规则父级/子树贡献、主动排除，按ID去重；关闭规则仅移除其独有贡献；手动取消派生点以排除覆盖，相关规则显示部分状态；再按部分按钮恢复该规则完整范围。取消规则源移除该源规则，仅将因此丢失的其他可见项转为直接选择，保留其他规则来源。关系遍历、稳定顺序、深度和完整路径在同一局部索引内复用。

正文集合严格等于有效选择。为保留真实层级必须存在的未选祖先仅导出空正文结构标题，nodeCount包含这些标题，bodyCount只包含有效选中ID（含空正文节点），界面须明确说明。Markdown序列化、图片、大小上限、token/epoch/tree修订、复制、文件保存/未知结果机制和导入保持原服务。

实际：18项定向测试PASS（B5新增12 + 原存储6），后端类型PASS。失败尝试原样保留：合成夹具误用了同父重名、测试未连接系统剪贴板；修正夹具与断言入口后通过，不修改生产保护。证据 `../evidence/b5/b51-domain-final2.tap`；未执行GUI/Windows。检查点SHA以该路径Git历史与远端读回为准。

## B5.2 DONE：正式双向界面

B5.1远端 `cfdb05fe0acab8619df93344c9821be6a139b27f`，tree `6175938f1e4e8edede19d95d0043040400ac6879`，与本地2f902d4完整tree相同；连接器独立读回。

正式KnowledgeMarkdownExchange使用一份ExportSelection、同一共享resolver的effective驱动两侧；去掉全局开关。每行真实层级、勾选、父级/子树按钮、灰色禁用/浅绿/深绿/部分状态。图谱点击/二次点击同步右行并滚动；右侧点击/条件/搜索聚焦左图；逐节点ID与完整路径区分重名。搜索Enter/定位不改选择，无结果1.2秒消失。每次选择变化废弃预览；v2附树hash，服务端重新验证。未选祖先仅保留空结构标题，计数说明明确。

复用KnowledgeExchangeMap/MindElixir 6.0.0-next.4的公开expandNodeAll/findEle/scale/move，不加图谱引擎。锁定版本scrollIntoView在300ms动画中忽略后续请求（dist/MindElixir.js的Ge/rt；公开签名见dist/types/index.d.ts），因此交换视图用公开move + 瞬时CSS转场，保证快速定位最后一次目标；不访问/修改依赖私有字段或node_modules。三宽测试检查目标实际位于画布内，而非仅检查focused类。影响仅共享交换图谱定位，B4编辑和筛选最小集成补验。

导入文件/挂载/冲突/正文策略/预览/确认保持原工作流；导出业务不进入公共知识点选择器。导出新操作开始清空上次notice，避免失败时残留旧成功提示；未知文件结果仍锁定重写并指向设置核对。

Vue类型、完整构建、最终renderer增量和协议检查21项PASS，163个方法入口未增加；领域/Markdown/媒体/边界29项PASS；B1–B4交界9 PASS。正式Electron先导操作链18组PASS，Windows NOT_RUN。B5.3将在远端冻结的源码与脚本SHA上进行最终验收。

## B5.3 DONE：冻结源码定向验收

**生产源码及测试脚本完整SHA：`e1268d0e977575a7a9df65e2b9d72e3c3ef7cbe5`**；完整tree `1d3736abacaf321831f443a0580f016e0312ce31`。B5.2连接器逐文件保存，与本地2fb4e83同tree；独立读回远端后检出该准确SHA，复用相同输入的已构建输出，完成最终正式GUI。脚本SHA256 `a379896afb683e9cfa3c2b55164e1e92db32617eb7ca949fe7e12faa86544524`。

| 验证 | 实际结果 | 证据 |
| --- | --- | --- |
| B5纯选择/协议/SQLite及Markdown/图片/边界 | 29 PASS | b5/domain-final.tap |
| B1–B4最小交界领域 | 9 PASS | b5/integration.tap、integration-supplement.tap |
| 协议/边界/类型及契约导出 | 21 PASS、仍163方法 | b5/protocol.txt |
| 后端/Vue类型 | PASS | b51-typecheck.txt、b52-typecheck-final2.txt |
| 完整构建 / 最终受影响renderer增量 | PASS | build.txt、renderer-focus.txt |
| 冻结SHA正式Linux Electron | **18组PASS，0 renderer error** | b5/gui-frozen/result.json、gui-frozen.txt |
| 900/1366/1600px | PASS，聚焦目标实际在画布内、逐行按钮可见 | b5/gui-frozen/export-*.webp |
| SQLite / 独立PID重启 | integrity_check=ok、foreign_key_check=0；PID39→112，数据逐表一致 | gui-frozen/result.json |
| Windows CI、Win10/Win11、真实125%缩放 | **NOT_RUN** | 不用Linux或模拟缩放代替 |

29领域包含新增B5的12项及原Markdown存储6、媒体6、边界3、深层交换2；9项交界只选择B1无草稿直接发布/有草稿发布原子清除、B2草稿箱只读列表/搜索分页、来源栈/三选返回及未知保存、B3目录重命名移动/修订与重启、单集ZIP分页及独立身份、B4公共API确认；不重跑B1–B4全部或旧250。旧测试与账本原样保留。领域测试执行于B5.1+界面工作树；被测shared/electron/测试字节与冻结源码一致，逐文件身份见B5-SOURCE-IDENTITY.json；不把最终文档提交冒充被测源码。

正式GUI覆盖：左右点击/取消和实际定位；父级/全子树on/off、独立选择保留、重叠去重、主动排除后的部分状态；完整路径与ID搜索不选择；条件/选择变更使预览失效；实际正文修订使旧token失效；20节点完整内容预览/剪贴板/文件字节相等，长正文尾、图片、表格、公式、10层结构保留；取消/失败/写入未知不假成功且禁重复写；文件导入/挂载/冲突keep/差异预览及图片还原；B1保存→发布清稿、B2放弃返回、B4同一选择器和两步筛选/大纲；SQLite及新进程读回。B3 ZIP通过前述单项领域集成，不冒称本轮重跑B3全GUI。

### 失败与修正（原始尝试保留）

- 早期领域夹具同父重名违反现有合同；剪贴板未注入的领域fixture无法测系统copy，改用prepared导出入口，真实Electron剪贴板另测。
- GUI尝试1在预览态寻找已隐藏搜索框；尝试2误把完整路径匹配当作只匹配名称；尝试3用可见文字定位实际有aria-label的关闭按钮；尝试5测试locator误当函数。均是驱动问题，保留失败，不改业务保护/弱化断言。
- 尝试4的实际画布可见性检查暴露公共scrollIntoView动画期间丢弃定位请求，采用前述公开move修复；B5还修复旧notice残留。两项都是本轮导出集成直接相关的真实问题。
- 尝试6先导18组PASS；最终冻结源码再次18组PASS。失败及先导文本/JSON均保存，诊断PNG不重复上传。最终三宽采用无损WebP，逐像素RGBA与原PNG完全相等，哈希见B5-RESULTS.json。

### 架构与保留能力

只有一份瞬时ExportSelection，effective是只读派生，图谱/列表/计数/预览入口统一；前后端复用同一exportTree/resolveExportSelection，移除旧后端全局范围遍历，旧协议显式adapter。沿用原图谱组件、导出服务、Markdown序列化与图片服务、token/epoch/tree hash/大小限制、文件未知结果核对及导入工作流。**新增表0、IPC通道0、协议方法0、全局Store0、图谱引擎0、导出业务服务0**；B4公共选择API及宿主独立，未引入导出条件。未改Schema606、版本、锁文件、发布/CI配置或无关模块。

### 保存与后续界限

B5.1 `cfdb05fe0acab8619df93344c9821be6a139b27f`；B5.2为上述生产/脚本冻结SHA；B5.3为包含本报告及最终证据的文档提交，准确最终HEAD由Git历史/远端独立回执和Issue #28记录解析，提交不可能嵌入自身SHA。GitCLI缺写凭据，连接器基于真实base tree/parent、force=false/expected_sha追加，完整tree与各变更blob独立核验；没有强推/覆盖。

**B1–B5已完成阶段性Linux功能开发；整体交付与Windows体验验收尚未完成。** 本Work保存核验后立即结束，未合并、未发布、未等待CI、未进入新阶段。后续如用户授权，从同一已核验源码准备Windows64便携测试ZIP，由用户在Win10/11及真实125%缩放体验，不自动触发RC流程。

### 可复用的Windows手动测试包入口（仅说明，NOT_RUN）

在Windows10/11 x64、Node24、Python3的独立源码目录执行；使用完整原生依赖，不使用Linux node_modules：

```powershell
git fetch origin feature/v077
git switch --detach e1268d0e977575a7a9df65e2b9d72e3c3ef7cbe5
git rev-parse HEAD
npm ci --no-audit --no-fund
npm run package:portable:win
@{sourceSha='e1268d0e977575a7a9df65e2b9d72e3c3ef7cbe5';purpose='B5 manual test';windows10='NOT_RUN';windows11='NOT_RUN'} | ConvertTo-Json | Set-Content out/GankSoft-win32-x64/B5-source.json -Encoding utf8
python tools/build/zip-windows.py out/GankSoft-win32-x64 out/GankSoft-B5-e1268d0-win64-test.zip
Get-FileHash out/GankSoft-B5-e1268d0-win64-test.zip -Algorithm SHA256
```

以上复用现有打包/完整ZIP校验脚本，不调用release/portable-only发布流程。package.json仍是继承的0.7.6，B5未擅改版本；应以测试包名和B5-source.json中的完整源码SHA识别，不冒称已产出v0.7.7正式包。本轮没有构建Windows ZIP，也没有新增安装器或Release。
