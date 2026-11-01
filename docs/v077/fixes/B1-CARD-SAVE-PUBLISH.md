# 2026-10-31 B1 最终保存已获用户明确授权

用户已明确回复“允许推送”，授权将本轮32个已核验文件保存到公开仓库 Aides8Stack/GankSoft 的 feature/v077。此前自动审批阻塞记录保留为历史，不再作为本轮待用户决定事项。B1三检查点与本地验收保持完成；本次仅正常保存并核验远端SHA/完整树，不重复测试、不进入B2、不等待CI、不合并或发布。最终保存SHA由本文件Git历史和远端HEAD解析。

---

# B1 手动草稿与直接发布 — 2026-10-31

**B1.1 / B1.2 / B1.3：DONE（本轮 Linux/领域定向验收）。Windows CI、Win10/11实机、物理剪贴板/IME：NOT_RUN。** 只完成 #16、#17、#19、#21、#22 的B1部分，不关闭Windows用户报告；B2独立草稿箱/全局导航仍未实施。保存核验后结束，不进入B2–B5。

唯一分支 `feature/v077`，目标 `develop`，Schema606；基线 `a84c581361471a267cae40cda5175cefac1d8524`。前序远端 B1.1 `854a692`、B1.2 `d98aa37424671cae3a6cc661bf4a31301ffd9e79`；最终提交由Git历史解析。

## 实现与结构

新建/编辑已发布卡片均先进入内存会话。只有主动保存（含原Ctrl+S快捷键）才调用 `draft.save`，允许空白/不完整草稿；同cardId/CAS更新唯一草稿，旧格式继续读取。打开、输入、类型切换、复制、粘贴和确认离开均不隐式保存。失败/冲突/未知回执不丢内存，用原请求重试不自动提交后续输入。

调用链：`UnifiedWorkspace → UnifiedCardEditor → CardDraftForm → CardDraftController → draft.save / card.publish → cards-unified → Schema606`。唯一控制器管理编辑状态、修订与保存回执；移除定时保存、离开自动flush、类型切换持久化、发布前强制saveAll。无新表、IPC通道、全局Store或平行业务服务。

现有 `card.publish` 接收当前 `fields` 快照，草稿修订允许为空；无草稿直接写正式版本，有草稿则在原事务内发布并清稿。保留正式/草稿CAS、幂等回执、媒体所有权、旧版本/学习周期/复盘/FSRS/有效知识关联；失败完整回滚版本及清稿，不写临时草稿。

UI共用必填规则，标题及三种模式必填标签有红星；缺项按钮仍可点击。单个中央半透明红色圆角提示约1秒，连续点击重置计时且零写库。保存/发布成功无后续修改则正确禁用，编辑后恢复；输入法组合阶段阻止提交。区分未保存、修改中、保存中、成功、失败/未知及已发布。

粘贴沿原Milkdown/ProseMirror扩展点；不支持的HTML字面标签降为文本，仅HTML输入提取安全文字并移除危险节点，不向正文插入外部DOM。保留图片暂存和引用保护；暂存图片不等同卡片草稿持久化。实际Windows来源仍需物理操作复验。

B1.3修正首次保存本地UUID时预览范围不允许无记录新卡的真实缺口，正式GUI空白保存已验；冲突后复制当前本地内容不再被旧修订阻止，媒体范围校验保留。清理类型切换/粘贴残留“自动保存/写入草稿”文案，移除控制器失效接口。

## 检查点与实际结果

| 范围 | 状态/结果 | 证据 |
| --- | --- | --- |
| B1.1 内存编辑/手动保存 | DONE | 前序状态机9项属于35项回归的一部分，不另计 |
| B1.2 直接发布/反馈/粘贴 | DONE | 前序35项回归、6项新增领域、协议/构建通过 |
| B1.3 正式GUI与完整性 | DONE | 下述18组GUI与本次2项领域补验 |
| Linux正式Electron主流程 | 12组PASS，3个独立PID | `../evidence/B1-ELECTRON-MAIN.json` |
| Linux正式Electron保存失败/冲突/确认离开 | 3组PASS | `../evidence/B1-ELECTRON-RECOVERY.json` |
| Linux正式Electron图片直接发布/重启 | 3组PASS，2个独立PID | `../evidence/B1-ELECTRON-MEDIA.json` |
| 图片无草稿直发、引用与备份闭包 | 本次1项PASS | `../evidence/B1-image-direct-test.tap` |
| 保存提交后回执丢失、重开及原请求重放 | 本次1项PASS | `../evidence/B1-save-lost-reply-test.tap` |
| GitHub Windows CI / Win10 / Win11 | NOT_RUN / NOT_RUN / NOT_RUN | 未冒称物理剪贴板/IME签核 |

18组GUI覆盖：新建/输入零卡片草稿写入；空白及部分保存；同ID反复保存；旧草稿保留与新PID读回；有草稿发布原子清除；编辑已发布卡不改正式内容；三种模式无草稿直接发布；缺项连点/中央提示和按钮状态；发布未知回执同requestId重试不重复建卡；保存失败/未知期间新输入保留；冲突仍可编辑/复制；明确确认离开不写库；同图两个placement的30/80宽度直发及图片字节重启一致。三份最终GUI报告均零renderer error。

领域还覆盖正式内容/历史/FSRS/知识关联保护、事务回执写入失败回滚、重复/过时请求不重复生成版本。前序35+6项、协议21项/边界/类型/导出162方法与构建PASS按既有记录继承，恢复时未重跑。历史250账本不变，不能以旧235 PASS证明新合同全量通过。

保留3次已定位的 **TEST_INFRA**：前序类型切换弹窗名称不符；本次Placement helper传入多余DTO键；宽泛img定位误计编辑器控件。修正精确参数及原有 `img[data-gank-placement]` 定位后通过，原始FAIL结果保留 `B1-ATTEMPT-*.json`，没有削弱SQLite/发布/重启断言。中断尝试不重复计数。未发现新增真实业务FAIL。

本次恢复命令：

```bash
node tools/validation/v077/environment.mjs status
node --experimental-strip-types --test --test-name-pattern='B1 T14:' tests/card-drafts-v075.test.ts
node --experimental-strip-types --test --test-name-pattern='committed save with lost response' tests/card-save-publish-v077.test.ts
B1_EVIDENCE_DIR=validation-results/v077/b1-media-verified node --experimental-strip-types tools/validation/v077/b1-save-publish.mjs --media-only
```

同一脚本无选项运行主流程，`--recovery-only`只运行恢复3组；源剪贴板为合成内容，不能等同Windows物理Ctrl+V。

## 源码身份与保存

主流程/恢复实际生产与脚本本地SHA：`0fcf5e58657f018cb67f6186d96a592b1f54f58a`。本次领域/图片实际HEAD：`8d7d8a5c88284e40029206cd9e4f3258a550bd00`，生产完全相同；图片脚本当时为测试增量，实际SHA256在原始结果，随后冻结于本地 `27ebfa1eba5fda838b73a8ba075e84cb5126b2a6`。执行SHA不得改写为远端最终文档SHA。逐文件生产/测试哈希、GUI原始结果、TAP、构建指纹及映射见 `../evidence/B1-RESULTS.json`，最终保存后核验相同树。

远端B1.2与本地对应检查点tree完全相同，普通合并保留父链和后续修正，基于已核实远端tree追加检查点，不强推。生成协议文档反映真实输入/输出合同，不新增平行实现。实际生产改动集中在卡片控制器/正式编辑器入口、已有共享模型及草稿/发布/卡片交换模块，无Schema、版本、锁文件内容或CI配置变化，无B2–B5页面重做。

本次恢复零依赖安装/零构建，414个输出按源指纹/文件哈希复用；不等待CI。原始PNG不作为已远程保存证据，必要数值/SQLite/回执结果保存在JSON。

**下一轮B2条件：** 从最终远端SHA恢复，复用本轮唯一编辑状态机及草稿/发布合同，再处理独立草稿箱查询/删除、返回来源页和弹窗尺寸；不重写发布事务。Windows物理粘贴/IME用户报告仍待原环境验收。本轮不自动关闭Issue、不合并develop、不发布RC或便携包。


## GitHub保存阻塞（2026-10-31本轮恢复）

最终本地源码/证据已提交于 `b8dbac3c7f866e29a5350eb0019949bbc1be3bc7`，但尚未远程保存。自动审批两次拒绝普通push；已核实当前账号拥有仓库且32个文本文件不含凭证/数据库/构建产物，复审仍要求用户明确批准向公开仓库 Aides8Stack/GankSoft 的 feature/v077 上传这32个文件。不得通过连接器绕过拒绝。

远端已核实HEAD仍为 `d98aa37424671cae3a6cc661bf4a31301ffd9e79`（最终交付前再读一次确认）。本轮不等待CI、不进入B2。恢复包保留Git增量bundle、32个最终文件及JSON/TAP证据；得到明确批准后先读远端最新HEAD，正常合并并保存，再核验完整树。无须重跑本轮通过的测试。
