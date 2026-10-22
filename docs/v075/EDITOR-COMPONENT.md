# 当前S2验证入口与限制

实现检查点父4aebc2682c9e8b46c57bf311e9479432e9d3004a+本轮工作树；当前仍S2/T05 BLOCKED，不接生产。真实IME/Win编辑器/系统剪贴板/Base64/拖拽手势仍须验证。

1. Node24+和锁定依赖；按需恢复Electron二进制（本轮npm rebuild electron，版本/lock不变）。运行npm run build，再npm run build:editor-spike。普通build会清理独立入口，需按此顺序。
2. 原生控制：node tools/editor-spike/reproduce-table-race.mjs，未适配Crepe仍应复现FAIL/exit1，原文件与pageerror证据保留。它是诊断，不是要求人为转绿的产品测试，单独执行，不串为成功前置。
3. 扩展专项：node tools/editor-spike/check-table-interactions.mjs，要求固定57/57、errors[]，任何断言/异常exit1。通过新tableRegression隔离入口仅装公开table-interaction扩展；保留原组件，不加载GankSoft安全/媒体adapter，隔离根因。
4. 完整集成：node tools/smoke-editor-v075.mjs，要求T05合成输入/Tab、T06资源/宽度/重建/进程重启、T07数学/颜色、T08恶意内容/离线/多实例/失败恢复及pageerror/external断言；没有真实OS IME证明。源码位于src/editor，仍通过DocumentAdapter/EditorMediaAdapter通信，接口/DTO未变。
5. 本轮Node editor6/quality273/协议21/build/Electron4+5通过；上述两项editor专项尚未接入自动CI，不能以PR CI绿代替本地或Windows专项证据。新sha Windows/Ubuntu/pr-gate/pr-trust仍须按原机制核实。

table-interaction通过公开插件生命周期在create前移除原tableBlockView并注册继承TableNodeView的$view，只接管click选择。取消被事务/选择/新点击/销毁取代的旧意图，现时state构造事务；原RAF及CellSelection20ms时序未加长。升级Milkdown前须重新跑57及集成smoke，确认公开导出/NodeView生命周期/表格全部必要操作，不把这一版本适配视作永远兼容。

---

历史使用说明，当前结果以上节为准。

# S2 独立验证组件使用与复现

状态BLOCKED，结论见MARKDOWN-EDITOR-ADR.md；不接正式页面/真实用户库。

1. Node24+执行npm ci（需要devDependencies）。
2. `npm run smoke:editor-spike`：构建原应用和独立验证入口，以GANKSOFT_E2E及全新临时数据目录启动真实Electron；资源走现有media.stage。系统剪贴板边界有明确测试注入，保存是内存adapter。输出validation-results/editor-v075.json，任何pageerror均使脚本exit1；表格竞态可间歇失败，不可重复至绿后当通过。
3. 稳定复现原生候选阻塞：`npm run build && npm run build:editor-spike && node tools/editor-spike/reproduce-table-race.mjs`，当前7.22.3产生mismatched transaction、exit1；输出s2-native-table-race.json。
4. Node6项专项：`node --experimental-strip-types --test tests/editor-v075.test.ts`；全量`npm run ci:quality`。正式应用build会清除独立入口，正式App/main未导入编辑器；不要把手工构建的验证页面对准用户数据目录。

可复用入口src/editor/MarkdownEditor.vue，契约shared/editor/document.ts；平台资源适配器src/editor/media-adapter.ts只调用src/services.media.stage，编辑器不访问文件系统/SQL。DocumentAdapter是注入接口，验证例子见src/editor-spike/EditorSpike.vue；未来正式草稿服务须后端验证expectedRevision/epoch/资源归属，不把内存示例当S3实现。

父组件以:key显式重建不同文档，监听changed/saveState/failure/disposed；切换/关闭前自行确认未保存内容并持久化，销毁不会自动保存。媒体服务暂存后不自动删除，避免破坏历史。正常业务UI不提供该验证导航，入口只在独立build产物内，验证脚本始终新建临时数据目录。
