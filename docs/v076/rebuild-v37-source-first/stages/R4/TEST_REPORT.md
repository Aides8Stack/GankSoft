# R4 — IN_PROGRESS

基线 bc159d50f2048ad02ed30135c18b3b2178796d5a。正式Vue/typed IPC/Schema606；仅R4，不进入R5。

## 编辑器增量

- UnifiedCardEditor / CardDraftForm：冻结原型头部、工具栏、30%元数据列、模式选择、字段/选项/答案/底栏，原生Crepe及事务保护保留；公共材料移至来源后。局部editor.css提取冻结R4声明并适配真实编辑器。未改数据库/协议/FSRS。
- `npm run build` PASS。
- `node --experimental-strip-types tools/validation/r3/prepare-fixture.ts` PASS：仅恢复现有合成缓存，未重新生成。
- `node --experimental-strip-types tools/validation/r4/editor.ts` PASS 4组：三模式草稿不提前改发布内容、切型取消、发布新版本及新Electron进程精确读回。证据evidence/editor.json。
- 图片/表格/LaTeX专项与模式确认切换：NOT_RUN；三宽严格对照NOT_RUN；复盘/分析未迁移，整个R4不DONE。
- Windows/全量跨页留R7/R8。

当前文档检查点以Git历史/独立远端读回解析；不等待CI、不合并、不发布。
