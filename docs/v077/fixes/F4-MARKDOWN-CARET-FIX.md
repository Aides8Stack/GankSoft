# F4 Markdown 字符错位专项修复 — 2026-10-30

结论：`AUTO-EDITOR-10-edcae784ef2d` 及重复项 `AUTO-MD-02-85c8380ced32` 为 **FIXED_PENDING_WINDOWS**。GitHub实际生产 SHA 为 `c8e133e2ced59bc7f9cf9e58c36d75fdc7995f19`，全套回归测试 SHA 为 `5957c89484de21b3eb77e8deb7c1a8f9206607c4`（完整源码树相等；远端SHA另复验原始两CASE）；两条原始正式 CASE 各自 PASS，两编辑器各 10 轮自然 GUI 回归、受控延迟 RAF、保存/SQLite/新 PID 重载均通过。没有执行剩余26条、Windows专项、合并或发布。

## F4.1：生产实现

基线为远端 `5cb6d613efef67a3baf684b220a206d44bb82b67`。锁定 `@milkdown/components/crepe/kit 7.22.3`，Node `24.22.1`、Electron `44.9.1`、Schema606。

最终根因沿用 F3：上游列表 NodeView mount 捕获绝对 anchor/head，下一帧无条件在新状态恢复旧选区；后续输入/移动后仍可把光标拉回，导致字符错位入库。不是 SQLite 或 Markdown 序列化重新排序。

核验安装包公开源码/导出：`Editor.remove()` 支持 create 前移除插件；`$view` 注册公开 NodeView 构造器；`ListItem`、`listItemBlockConfig`、`listItemBlockView` 均由 `@milkdown/kit/component/list-item-block` 公开导出。沿用既有 table adapter 的安装方式，不使用编辑器私有字段。

直接修改的生产文件仅三个：

- `src/editor/milkdown-adapter.ts`：在 `crepe.create()` 前安装列表扩展；卡片及知识正文沿用同一个正式适配器入口。
- `src/editor/list-interaction.ts`：通过 `editor.remove(listItemBlockView)` / `$view` 替换列表视图；保留上游公开 Vue `ListItem` 组件、图标配置、CSS类、contentDOM、任务复选框、属性更新、只读/选中、mutation及销毁行为。沿用部分 NodeView 生命周期已附上游 MIT 版权声明。
- `src/editor/list-selection-restore.ts`：每个 EditorView 合并一帧恢复，使用捕获的 **EditorState 对象身份**作为事务代际；后续任何文档或选区事务即拒绝旧捕获。另有输入/键盘/指针/组合/失焦事件 epoch、取消票据及 owner 存活保护。

只有仍为同一 EditorState、同一事件代际、焦点仍在本编辑器、可编辑、未组合输入、节点及 DOM 仍存活时，才允许修复 DOM 选区。文档变更后直接拒绝恢复，不把旧绝对位置映射到新文档，因此无需跨文档位置映射。卸载移除该项，最后一个列表卸载同时取消帧并解除监听；旧票据即使被测试强制延后执行，也不能消费新一帧的捕获。多个列表项只选择当前最新且存活的一项。

合法的挂载选区修复没有删除：安全路径派发当前选区后调用公开 `EditorView.focus()` 同步 DOM。其前提是本编辑器已持有焦点，不能抢其他控件焦点。此细节通过真实生产构建的受控实验验证：同一 JS turn 的 Enter 处理器创建列表项，刻意扰动浏览器 DOM selection，再释放当前有效回调，能够恢复正确选区。该诊断中的一条合成 Enter 事件不是自然 GUI 回归或 Windows IME证据。

第一次防护版本 `7a43f11b19c2daa2acdee656ca0711732b6b0420` 虽通过自然输入，但刻意扰动 DOM 的实验 FAIL：ProseMirror 对相等选区事务可能不重绘 DOM selection。依据公开 focus() 实现补齐主动同步后，所有下列验收在最终新生产源码上重建、重跑；没有用旧 PASS 冒充最终验收。原诊断失败及设施试跑均保留在独立原始包。

未改 node_modules、锁文件、版本、Schema、发布配置、全局 RAF 或原生快捷语法；未给输入增加固定等待。测试环境的 RAF 控制仅在新增诊断脚本中。

## F4.2：最终构建与回归

| 项目 | 最终真实结果 |
| --- | --- |
| 类型及必要构建 | `npm run build` PASS，包含 vue-tsc、tsc、Vite |
| 选区竞争单元 | 18/18 PASS：文档/选区事务、撤销返回相同内容、事件代际、组合、失焦、销毁、卸载、多项及取消帧不消费新状态 |
| 编辑器/草稿单元 | 41/41 PASS；editor、draft controller/store、validation |
| 原始 EDITOR-10 | 未修改驱动及断言；正式 Electron 完整格式/保存/新PID链 PASS |
| 原始 MD-02 | 未修改驱动及断言；正式 Electron 标题/列表/链接/公式/表格/保存/新PID链 PASS |
| EDITOR-10 自然输入 | **10轮 / 0失败**；每轮原生键盘、保存、关闭重开及新PID |
| MD-02 自然输入 | **10轮 / 0失败**；每轮原生键盘、保存、关闭重开及新PID |
| 受控 RAF | 两编辑器均 PASS：中文、英文、方向键、范围选区、失焦再聚焦、Chromium组合输入、卸载；强制执行已取消回调仍不覆盖当前选区 |
| 合法 DOM 选区恢复 | 两编辑器均 PASS；证明有效挂载修复仍有作用 |
| 最小相邻正式 CASE | NEW-01、NEW-17、EDITOR-02、EDITOR-11、EDITOR-14、MD-04、MD-05 **7/7 PASS**，仅补回归证据、不晋升其他账本行 |
| FAULT-13 | 复用 F2 专项，合法/超长标题拒绝/保留内容/自动保存/已有及新卡草稿/显式发布/三新PID完整链 PASS |

正式9条入口：`node tools/validation/v077/run.mjs run --ids EDITOR-10,MD-02,EDITOR-02,EDITOR-11,EDITOR-14,MD-05,MD-04,NEW-01,NEW-17`。正式 run ID `2026-10-30T12-38-24-529Z-5`。

新增测试：`tests/list-selection-restore-v077.test.ts`、`tools/validation/v077/fixes/f4-natural.mjs`、`f4-controlled.mjs`。自然脚本按两个CASE分别执行10轮；没有控制RAF、等待帧或延迟逐字输入。测试读取 IPC/SQLite仅作验证；业务操作通过 GUI。每轮包括快捷语法后立即中文/英文、Enter续写、Tab嵌套/Shift+Tab提升、任务勾选、有序列表、退出、方向键/选区替换、撤销/重做、Ctrl+S、同PID关闭重开、新PID重开。

每轮输入、GUI完整Unicode文本和选区、序列化Markdown、SQLite只读正文及重启文本均已记录。GUI段落顺序与预期逐项相等；Markdown解析文本顺序相等，任务/有序格式另断言；SQLite正文与Markdown逐字相等，重载Markdown和GUI全文均保持一致。每轮原始详细数据在证据包 `raw/f4-final-natural-*/rounds.json`；GitHub精简记录见 `F4-RESULTS.json`，SQLite/重载哈希相等可独立核对。20轮均新Electron PID，不以单次自然PASS关闭时序BUG。

中文经 Electron/Chromium Unicode键盘输入及 CDP 真实组合事件模拟验证；**不等于物理Windows中文输入法**。Linux当前缺少中文字体，截图只用于布局观察，不宣称中文字体/Windows视觉验收；正文Unicode则通过DOM、Markdown、SQLite、重启精确比对。保留原ListItem渲染与配置，没有改OPEN-ME-v3.7的CSS及工具交互。

## F4.3：证据审核与总账

GitHub实际生产 SHA：`c8e133e2ced59bc7f9cf9e58c36d75fdc7995f19`；本地全套测试 SHA：`5957c89484de21b3eb77e8deb7c1a8f9206607c4`；两者完整tree相同，另有远端精确SHA的原始两CASE复验。

最终构建指纹：`15339498e14c8c5fc2e31b60e3ca86a37910c486f246fe80cb0ad0c738b44907`；496输出逐哈希封存，最终加载 `milkdown-adapter-BJIv6AmL.js`。执行前后 `environment.mjs status` 均确认同指纹/输出有效。锁文件SHA256 `5b1e2cd201ee5cfcbaf0976444ea112b1f01e66833e7201de34408da58a51a28`。逐源码/脚本哈希、原CASE回执哈希及完整重复回归见 `F4-RESULTS.json`；精确本地源提交可从证据包增量Git bundle恢复。

按原始正式报告筛选仅 EDITOR-10/MD-02，执行既有 `collect.mjs` dry-run/write（无新增缺陷）及 `promote.mjs` dry-run/actual（只晋升2项）。受控诊断、重复输入及相邻CASE不冒充原始CASE或全量晋升。

最终250条：**211 PASS / 0 FAIL / 3 BLOCKED / 36 NOT_RUN**。与基线逐行比较，只改变两条CASE；其余248条及全部Windows字段原样保留。原始历史失败证据、重复关系及Windows结果未删除。两缺陷记录标记 `FIXED_PENDING_WINDOWS`；Win10/11实机、Windows CI、物理IME/剪贴板尚未验证。

原始截图、SQLite读取快照、输入/选区日志、失败诊断、构建清单及精确源bundle为独立 `GankSoft-v077-F4-evidence.zip`，4,148,474 bytes，SHA256 `f318ad93d6600fa92fc5544f5b2aa06db8d5dbcfbee0e57b5ba4ee2f41bcec73`。临时合成库按既有设施清理，包中保留只读SQL行快照；没有用户数据。GitHub仅文本及精简回执，不提交PNG、SQLite、依赖、bundle或构建输出。

最终GitHub保存提交包含同一生产/脚本内容；其完整SHA由本文件Git历史和远端HEAD解析，禁止为写入自身SHA循环提交。提交前重新获取远端并按文件/CASE安全合并；没有强推、重置远端或覆盖其他Work。F4.1/F4.2/F4.3结束后保存退出，不等待CI、不进入Windows/剩余26条、不合并develop、不发布。

## GitHub实际生产SHA独立复验回执

命令行push没有写入凭证，使用已连接GitHub通道在原HEAD后正常追加，实际生产SHA为 `c8e133e2ced59bc7f9cf9e58c36d75fdc7995f19`。其完整Git tree `67eff5db8c30d6b0ef486115cd283e902f5de56e` 与本地全套验收SHA `5957c89484de21b3eb77e8deb7c1a8f9206607c4` **完全相等**，不是在不同生产源码上复用PASS。GitHub只改变commit元数据，源/测试/配置/依赖内容均未变。

为进一步核实，已从远端重新fetch并精确检出实际生产SHA，environment验证仍为同指纹/496输出，两原始CASE重新执行，**EDITOR-10 PASS / MD-02 PASS**，run `2026-10-30T12-45-34-139Z-32`；在该精确SHA执行collect及promote dry-run/actual，只更新这两项。账本testedSha/fixSha指向实际GitHub生产SHA，其余248项及Windows原样保留。本地全套验收和远端确认分别记录，不冒充同一次运行。

最终报告/账本提交只修改文档；下一轮可直接冻结最终远端HEAD，生产及测试内容仍与上述生产SHA相同。完整证据见F4-RESULTS.json的sourceIdentity及remoteConfirmation，精确两个源提交均含独立bundle。
