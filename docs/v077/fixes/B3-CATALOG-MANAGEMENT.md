# B3 卡片集目录管理正式实现

基线 `cda2d9446b60a022e65eb08f00ed24462bf2e93c`，唯一 `feature/v077`，Schema606。本次用户明确授权正式实现，前序“仅Vue预览”边界已接续。

**B3.1/B3.2/B3.3 DONE（Linux定向验收）**。最终19组正式Electron、17项领域/交换/回收、21项协议PASS，类型/构建/边界PASS，0 renderer error。Windows CI/Win10/Win11与物理系统交互NOT_RUN。

被测本地 `a5f14b491437a679275f1055d4a85bccab78dbfe` 与远端源码 `ef852f04dcf7650deb543e3edc65d7bbb47e9dbd` 的完整tree均为 `e35a0752cc656f31eec8bc4e2d9d50754380dd4e`。最终文档提交只改记录和证据，源码/测试不再修改；保存回执从远端HEAD和本文件历史读取。结果 [B3-RESULTS.json](../evidence/B3-RESULTS.json)，逐文件及原始日志哈希 [B3-SOURCE-IDENTITY.json](../evidence/B3-SOURCE-IDENTITY.json)。

## 已实现与调用层级

- `UnifiedCatalogBranch.vue`只展示/展开/发出manage事件；`UnifiedCatalogContextMenu.vue`纯操作选择，含键盘、焦点归还、Esc/外部关闭和窗口限位。`catalog-management.ts`只包含动作清单及最多500张的分页元数据收集，不处理ZIP。
- `UnifiedWorkspace.vue`路由事件，唯一目录展开集合保留刷新和已加载页；`UnifiedCatalogEditor.vue`复用同一个新建/改名/移动/删除对话框和原requestId。业务写入仍由已有领域服务负责。
- 根＋提供文件夹/卡片集/ZIP导入，文件夹和卡片集右键及hover⋯共用菜单；主页管理入口也接入同一菜单。文件夹不提供导出。
- `workspace.catalog/save`保留CAS、同名和循环规则；已有`catalog.folder.action`仅补可选expectedRevision及非级联上移重名拒绝，正式UI必须携带修订。不新建目录表、全局store、IPC通道或平行业务服务。
- 文件夹只删除自身、直接子项上移；同层重名原子拒绝并提示处理冲突。卡片集沿用`workspace.decks.batch`软删，设置回收站恢复；删除当前集清理旧导航来源并返回总览。文件夹删除后更新当前路径。
- `UnifiedCardExchange.vue`统一复用`card.exchange.open/import/preview/save`；整集导出先分页收集原生606卡片ID/revision。只补preview可选`expectedDataRevision`封住收集与冻结之间的增删窗口；已有冻结token在写盘前再校验全局修订。
- 文件写入结果未知仍保留原有系统操作锁，明确按钮前往现有设置“待核对操作”，不宣称成功、不自动重复写文件。设置初次挂载到该分类会实际加载待核对记录。SQL命令未知则原requestId重试，不允许关闭/改写载荷。

## ZIP明确范围

`ganksoft.cards` v1内容包，1–500张已发布卡、关联知识点及祖先正文/层级、卡片与知识正文图片和关联闭包；不含未关联知识、草稿、FSRS、调度配置、复盘历史。空集/501+拒绝，不截断冒充成功；完整数据用设置完整备份。导入产生独立deck/card/node/asset身份；相同包默认定位已导入的独立集，显式“另导一份”才复制，不覆盖来源。没有调用读取旧questions/memory_cards的exchange.deck.export，未扩展完整集快照协议或Schema。

## 验收与已修正失败

新测试 `tests/catalog-management-v077.test.ts`；既有606内容交换7项和卡片集回收5项定向回归。本轮17个唯一领域测试全部取得PASS（初次14 PASS，设施修正后仅定向复验3项）；首次测试脚本误读不存在的learning_card_knowledge和传入多余严格键，已修复后仅重跑失败3项，原日志保留。

正式Electron脚本 `tools/validation/v077/b3-catalog-management.mjs` 12组、`b3-catalog-boundaries.mjs` 7组：102卡两页内容包往返、图片字节/祖先/链接、新身份；当前集删除/设置恢复/不同PID重启；三宽900/1366/1600菜单限位；第二页目录选中和折叠刷新；CAS、空/重名/循环、未知目录保存/删除/导入、空集/取消/写入失败及过期token重新预览。

实际发现并修正：文件写入未知无法到设置核对；初次直接进入待核对分类未读列表；删除文件夹后当前路径遗留旧层；删除当前卡片集后CSS使hidden子导航仍显示；目录刷新丢失已加载第二页。最终冻结源码后主12组与补充7组全部通过，两个报告sourceSha均为上述被测本地SHA；实际不同PID为38/115（重启）、199（补充）。所有原始失败和最新源指纹均保存。

系统原生confirm、文件对话框结果为Linux测试注入；不是Windows物理对话框/剪贴板/IME/DPI验收。Windows CI/Win10/Win11全部NOT_RUN。无依赖安装、无Schema/锁/版本/调度模型变更；旧250账本不变。保存核验后结束，不等CI、不合并发布、不进入B4/B5。

## 结果与边界

| 检查点 | 实际结果 | 证据 |
| --- | --- | --- |
| B3.1 统一管理栏 | DONE；根/多层创建改名移动、CAS/循环/重名、19组中对应GUI、三宽键盘焦点 | b3/gui-frozen.json、supplement-frozen.json |
| B3.2 安全删除与ZIP | DONE；非级联上移、回滚、软删/设置恢复、102卡ZIP往返，拒绝空/超限/过期并处理未知回执 | 17项领域及GUI第05/07–12/15/18组 |
| B3.3 SQLite/Electron/重启 | DONE；17领域、19GUI、21协议、900/1366/1600和独立PID/SQLite完整性 | B3-RESULTS与SOURCE-IDENTITY |

未扩大完整卡片集快照协议；没有文件夹导出；文件夹原有软删服务保留，本轮设置恢复签收对象是卡片集，未新增文件夹恢复页。系统confirm与文件对话框仅注入返回，不能作为真实Windows确认。初次未形成完整报告的补充执行未计作通过，最终有完整7组报告。

结构检查：菜单只选择、树只展示、唯一编辑器提交既有服务；目录展开集合只存在于工作台、没有新增全局store；新建/改名/移动继续用原CAS/循环/同名逻辑；ZIP处理仍在原606服务；B4/B5源码不变。原型只更新交接注释，mock数据没有进入生产。主源码文件与两个脚本逐文件SHA已冻结。

执行命令：`node --experimental-strip-types --test --test-concurrency=1 tests/catalog-management-v077.test.ts tests/unified-card-exchange-v075.test.ts tests/unified-deck-recycle-v075.test.ts`；仅失败项用`--test-name-pattern`定向重试；`npm run check:protocol`；`npm run build`，UI变更后仅必要`vue-tsc --noEmit`和`vite build`；两个B3 Electron脚本。无安装依赖、无旧250/B1/B2重跑、无CI轮询。

保存检查点最多三个：统一实现；来源名称一致性最小修正；最终证据与交接。CLI缺凭据后通过GitHub连接器保留真实base tree/父链，force=false且带expected_sha正常追加。源码远端SHA/tree已核对，最终文档提交独立核验后结束，不进B4/B5、不合并或发布。
