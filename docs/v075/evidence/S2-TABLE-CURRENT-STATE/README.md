# S2表格点击事务竞态：公开NodeView扩展检查点

父SHA4aebc2682c9e8b46c57bf311e9479432e9d3004a。原生Crepe/Kit7.22.3不改，npm本轮查询stable仍7.22.3。NATIVE-BASELINE-FAIL.json及TEST-OUTPUT的baseline是本轮真实原生复现，exit1/mismatched transaction；原最小复现文件与旧失败证据不改。新适配不是上游版本修复，不把原生FAIL重标PASS。

src/editor/table-interaction.ts经公开Editor.remove/use、$view、TableNodeView扩展，仅替换延迟点击选择；保留原表格UI/commands/drag与mutation处理。点击只保存expected state作意图令牌；新内容或仅选择事务、更新的点击、节点销毁会取消旧意图。回调不使用旧tr，条件满足才从current state构建选择事务；销毁取消RAF/timeout。保留原RAF/CellSelection20ms安排，没有额外延时输入或吞错误。MIT来源声明完整保留，无node_modules/私有方法/依赖版本/媒体DTO/数据库/生产入口/流水线变更。

TABLE-INTERACTIONS-PASS是固定19项x3=57/57；输入与仅选择更新都在点击后同步执行，完成观察等待在输入之后，仅确保旧回调有机会执行，不能解释为延迟输入避开竞态。覆盖mousedown及pointerdown+mousedown实际浏览器序列、TextSelection/CellSelection、表头、最后点击、表格删除/替换/销毁、同格输入、行列增删/选择/对齐、Markdown和重建完整JSON一致。拖拽柄仍存在，真实拖拽手势NOT_RUN，不把DOM柄存在冒称拖拽验收。

EDITOR-SMOKE-PASS是完整组件/媒体场景：16条记录（15项PASS+原生颜色限制探针），errors[]、external[]；包含合成标题/列表/表格中文长文undo/redo、Tab/ShiftTab实际键盘落格、30/80独立placement真实media.stage/解码/SQLite资源保存与重建/进程重启、公式/颜色、失败重试、双实例/销毁、恶意内容拒绝与Linux离线。平台剪贴板读取边界被注入，不能当系统剪贴板或真实OS IME。正式Draft接线/Base64属于后续阶段，不提前实现。

其余本地：Node editor6/6、quality业务273/协议21/基础设施5/ZIP1/边界/类型/78导出/build、默认Electron4+5完成标记通过。当前pr-quality没有自动运行新57专项；未来CI绿色不能冒称Windows编辑器或这57项已在CI重跑。pipeline未改，继承父SHA完整双平台CI，未另重跑C/D/全量基础设施。UI验证后只补MIT许可注释，最终类型/Node6重验，逻辑未变；VALIDATION.json记录最终6文件hash。

FIXTURE-DEVELOPMENT-FAILURES保留新夹具开发过程的失败：

- 单独pointerdown不是ProseMirror实际鼠标事件绑定；更正为浏览器会发出的pointerdown+mousedown序列，保留mousedown独立覆盖和最后点击真实结果断言。固定窗口内fixture并核hit-test，避免坐标越界空测。
- 原生列对齐菜单先选整列；单独对正文单元格setAlign不会改变Markdown的列头对齐，夹具现在复现正确操作链。
- selectRow/selectCol返回Boolean(dispatch(...))，原生dispatch是void，命令已成功也可能返回false；新断言核真正CellSelection.isRow/ColSelection与行列数量，非删功能断言。
- parser未经过Crepe trailing plugin，独立编辑器Schema的NodeType身份也不同，doc.eq不是跨实例持久合同；记录JSON逐项比对无差异后改为真实编辑器重建、Markdown及完整toJSON逐字相同，未忽略字段。原旧测试未删除/弱化；完整smoke只新增Tab断言。

Windows冷启动已解决：父Run39763577036双平台/pr-gate success，Windows独立D:\a\_temp正常安装13962.7299ms且全部隔离/锁/yaml/三模式PASS；不再性能调查。父pr-trust最新failure→39763767234，仍需所有者按当前完整SHA处理，用户授权局部S2修改不代表合并授权。

S2/T05总Gate仍BLOCKED：真实OS中文IME、Windows编辑器实机/脱网资源、系统剪贴板、Base64及真实拖拽未验。当前继续Milkdown+公开扩展候选，不宣布生产选型，不安装无必要备选；公开扩展若后续不能保留必要功能才用同fixture比较备选。S3不进入，FAST/FULL分级实施暂缓。

下一入口：核新SHA必要CI/可信状态，先在真实Windows环境按组件文档执行相同57专项+完整smoke及真实IME/光标/undo验收，再补系统剪贴板/离线资源/拖拽。新完整SHA/初始Run/status见原PR13描述及最终回执；不等CI，不自动审批/合并/发布。
