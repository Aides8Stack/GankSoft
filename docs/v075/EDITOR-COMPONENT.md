# S2 独立验证组件使用与复现

状态BLOCKED，结论见MARKDOWN-EDITOR-ADR.md；不接正式页面/真实用户库。

1. Node24+执行npm ci（需要devDependencies）。
2. `npm run smoke:editor-spike`：构建原应用和独立验证入口，以GANKSOFT_E2E及全新临时数据目录启动真实Electron；资源走现有media.stage。系统剪贴板边界有明确测试注入，保存是内存adapter。输出validation-results/editor-v075.json，任何pageerror均使脚本exit1；表格竞态可间歇失败，不可重复至绿后当通过。
3. 稳定复现原生候选阻塞：`npm run build && npm run build:editor-spike && node tools/editor-spike/reproduce-table-race.mjs`，当前7.22.3产生mismatched transaction、exit1；输出s2-native-table-race.json。
4. Node6项专项：`node --experimental-strip-types --test tests/editor-v075.test.ts`；全量`npm run ci:quality`。正式应用build会清除独立入口，正式App/main未导入编辑器；不要把手工构建的验证页面对准用户数据目录。

可复用入口src/editor/MarkdownEditor.vue，契约shared/editor/document.ts；平台资源适配器src/editor/media-adapter.ts只调用src/services.media.stage，编辑器不访问文件系统/SQL。DocumentAdapter是注入接口，验证例子见src/editor-spike/EditorSpike.vue；未来正式草稿服务须后端验证expectedRevision/epoch/资源归属，不把内存示例当S3实现。

父组件以:key显式重建不同文档，监听changed/saveState/failure/disposed；切换/关闭前自行确认未保存内容并持久化，销毁不会自动保存。媒体服务暂存后不自动删除，避免破坏历史。正常业务UI不提供该验证导航，入口只在独立build产物内，验证脚本始终新建临时数据目录。
