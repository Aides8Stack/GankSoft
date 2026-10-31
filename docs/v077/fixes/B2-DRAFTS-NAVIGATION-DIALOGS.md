# B2 独立草稿箱、统一返回与弹窗 — 2026-10-31

**B2.1 / B2.2 / B2.3：DONE（领域与 Linux Electron 定向验收）。Windows CI / Win10 / Win11 / 真实125% DPI：NOT_RUN。** 三检查点完成后保存并结束，不进入B3，不等CI、不合并、不发布。

基线 `ad9af933199e8f2ba45409d9f33e797472900dbd`；唯一分支 `feature/v077` → `develop`；Schema606、版本、锁文件与旧250账本不变。没有重写B1 save/publish事务，没有新增自动保存、表、全局Store、业务服务或IPC通道。

## 检查点与来源

| 检查点 | 结果 | 已保存远端 |
| --- | --- | --- |
| B2.1 独立草稿箱与删除合同 | DONE，领域4 PASS | `ba4bf6ccbab24f2466c658f96edc875a6818f21c` |
| B2.2 来源栈/三选离开/弹窗 | DONE，导航3 PASS | `8b136ff153b26e78fe0c061eac4f63ee2feb7c73` |
| B2.3 定向正式Electron与收尾 | DONE，18组 PASS | 本报告Git历史/最终远端HEAD解析 |

前两次本地SHA分别 `f50d70a9a4a09b2859f952c97340de87bae6d223`、`26879ad0a1f1c8d00e434ee2db070a3700500acb`；远端树逐次相同（40b2049703e6fd74611a0d4a8ddaeb0681c85f54 / e6e44476c6d76c7322ade903eb6147bbaba61b91）。Git CLI无写凭据，使用已授权GitHub连接器，保留真实远端父提交与base tree，force=false、expected_sha校验，非强推。最终检查点仍同树保存并独立读回。

最终GUI实际执行本地HEAD `26879ad0a1f1c8d00e434ee2db070a3700500acb` 加 `UnifiedCardEditor.vue / UnifiedDraftInbox.vue / UnifiedWorkspace.vue` 三个已核验改动；**生产指纹 `f6a351091d014a2fc2b2cf5e7ee148c6ba1ad12dfc0fdb392e1e7d6930ebc1f8`**。317个生产文件与4个脚本的标准字节SHA256见 `../evidence/B2-SOURCE-IDENTITY.json`；最终保存不再改生产。原始runner的scriptSha256沿用B1的Buffer-JSON编码，已独立复算；标准脚本字节hash另列，原始结果未改写。

## 实现与最小API

- 两个草稿箱入口进入同一个 `UnifiedDraftInbox.vue` 子页面。列表显示标题/未命名占位、所属集、类型、新卡或修改草稿、更新时间；支持标题搜索、按游标加载、继续编辑、确认删除/放弃。旧自动草稿和裸payload读路径保留，不做静默迁移或清理。
- 复用 `draft.listSummary/get/save`，只扩展listSummary的query；新增唯一必要命令 `draft.discard`：deckId/cardId、expectedPublishedRevision、expectedDraftRevision、confirmDiscard。原gateway事务与幂等回执管理，失败回滚，未知结果核对同requestId，CAS冲突可取消后刷新。新卡删除settings草稿封套且不创建正式空壳；已发布卡只删除learning_card_drafts，正式版本、历史、学习周期、FSRS、知识关联不变。过时save不能复活已删除稿。
- 图片资产属于既有资源库，可能被多卡/历史共享。删除草稿释放该文档引用，**不同时删除共享/暂存资产**；资源继续可见并由原媒体API按引用保护管理。UI明确说明，测试核对正式图片字节与引用不变。
- 唯一 `SourceNavigation<Location>` 保存真实来源及deck/card/event/session/scroll；原system/detail专用来源状态移除。列表/筛选沿用lastLists/plannerStates，草稿查询/分页由InboxState保留并带deckId记忆，避免切集串状态。来源卡已删时安全回退列表；异步读源期间的再次返回被拒绝，避免重复pop。返回复盘重新读session。
- CardDraftForm一处close对话框与CardDraftController.leave三选动作，顶部返回、底部取消、主导航切换、真实BrowserWindow关闭共同复用。继续/放弃零写入；只在用户选保存时调用原flush一次。失败/未知保持页面与本地内容，未知时禁放弃，原请求可核对。放弃本次输入不删已有草稿，Esc继续编辑并恢复焦点。
- 新卡未发布尚无单卡调度实体，按钮显示“发布卡片后可设置单卡调度”提示且禁用；已发布卡调度往返真实通过，不伪造新卡policy。
- Prompt/粘贴窗口分别860/920px，受可用视口约束，高度最多700px/88vh；标题、Prompt配置和操作固定，中间内部滚动。保留原复制、粘贴解析/安全/确认合同，关闭不保存。

调用链：`UnifiedWorkspace → UnifiedDraftInbox → unifiedDrafts.listSummary/discard → registry/gateway → 既有cards-unified/draft-service/new-drafts`；编辑离开 `UnifiedWorkspace.leave → UnifiedCardEditor.close → CardDraftForm.close → 原CardDraftController.flush/close`。无平行导航或草稿服务；更改文件可用 `git diff --name-only ad9af933..HEAD` 核验。

## 实际验收

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 删除/搜索/历史兼容/分页/事务回滚/重启/正式图与FSRS保护 | 4 PASS | B2-domain-navigation.tap |
| 来源栈、三选零写入、未知保存不可丢弃 | 3 PASS | 同上 |
| 正式Linux Electron B2-01～12 | 12 PASS，2独立PID，0 renderer error | B2-ELECTRON-MAIN.json |
| 正式Linux Electron B2-13～18 | 6 PASS，2独立PID，0 renderer error | B2-ELECTRON-NAVIGATION-LAYOUTS.json |
| 协议、边界、协议类型/导出 | 21 PASS，163方法，全部PASS | B2-protocol.txt |
| Vue类型/后台构建/生产Vite | PASS | B2-build-status.json、源码身份 |
| Windows CI / Win10 / Win11 / 真实125% DPI | NOT_RUN | 未执行且不冒称通过 |

18组GUI覆盖：创建/查询/重开/新卡删除/正式修改稿放弃；历史草稿、搜索与53条加载；顶部返回/底部取消三选；保存失败与未知核对同requestId；删除提交后回执丢失重试与来源失效；详情/编辑/单卡调度/系统设置/筛选来源；保留筛选/排序、51条分页及500px滚动；延迟draft.get期间连点不重复出栈；真实窗口关闭继续编辑与明确保存后退出；SQLite独立读回、新进程一致。新卡与修改稿删除均没有调用正式卡删除API。

900×900、1366×768、1600×900均检查两个窗口边界及底部可达，长内容滚动时标题/配置/底部坐标不变。1280×720为1600×900/1.25的**CSS可用空间等效**，不能称Windows真实DPI。中文字体缺失只在Linux测试环境补充Noto Sans CJK SC，不改产品依赖；最终中文截图已本地目视核对。PNG不逐张提交或冒称远端持久化，数值与断言均进入JSON。

命令（复用依赖；B2主脚本产生的临时fixture供补验脚本接续）：

```bash
node --experimental-strip-types --test tests/draft-inbox-v077.test.ts tests/source-navigation-v077.test.ts
npm run check:protocol
npm run build
node --experimental-strip-types tools/validation/v077/b2-drafts-navigation.mjs
node --experimental-strip-types tools/validation/v077/b2-navigation-layouts.mjs
node tools/validation/v077/environment.mjs seal
node tools/validation/v077/environment.mjs status
```

零依赖安装、没有B1/旧250批次重跑。源码变化后首次完整构建；后续仅针对真实GUI/审查修正做必要Vue类型与Vite增量重建，未重复后台构建。最终416输出已封存，status=REUSE且hash一致，下轮相同生产输入可复用。

## 失败记录与边界

首次领域3 FAIL为discard把多余键传给strict DraftScope，已修正并4/4通过。首轮GUI4 PASS后进程在未发布卡policy返回处中断，结合真实API合同修正入口，未把中断计PASS。滚动补验2次FAIL：重置/恢复回调竞争与加载提示消失后的23px浏览器锚定偏移；合并滚动写入处、保留加载行高度并禁局部锚定后500→500真实通过。长Prompt测试模板漏必需{{card}}，作为TEST_INFRA保留，修正合规模板后复制实际通过。原始失败见B2-ATTEMPTS.json及B2-domain-attempt1.tap；最终没有未解决B2业务FAIL，不混入旧250总账。

Windows相关用户报告不关闭；不运行Windows CI、不触发便携包、审批、合并或发布。三检查点完成，本轮停止。**下一批B3仅在用户另行授权后**按IMPLEMENTATION-WORKPLAN.md执行卡片集目录管理，B4/B5未启动。

原始失败TAP含Node断言输出的空白行尾，作为原始证据保留；源码及其余文档diff空白检查通过。
