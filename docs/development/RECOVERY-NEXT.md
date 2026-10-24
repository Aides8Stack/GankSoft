# S5 已归档，S6.a 协议基础检查点（2026-10-24）

S5精确297a0bea2397950f419e8d37eb0ee8782589261d / Run40094187621 scope、Windows、Linux、pr-gate全部success；Windows原始日志确认340业务、111方法、图谱7场景且errors/external=[]。S5/T23–T27自动化DONE，S5-ACCEPTANCE.json已归档。原PR13保持Draft，未审批trust/合并/发布。

S6 IN_PROGRESS：已实现shared/knowledge/markdown.ts，复用mdast-util-from-markdown2.1.0 CommonMark AST + GankSoft结构状态机，原文切片保留正文；字面结构标记单行Base64URL转义/单次解码，代码/引用/跨行注释上下文保护，BOM/CRLF边界规范，正文BOM及尾随空行保留。支持多根、同路径唯一、一至六级标题、深度/缺父/循环/错序/缺失诊断；不能表示的未闭合代码/HTML块拒绝输出，绝不扁平化或输出不可恢复结构。普通MD仅列候选，必须显式确认标题行，未选标题仍是正文。

原依赖树已有锁定2.1.0，现提升为明确生产依赖，没有升级版本；package-lock仅根依赖声明及传递dev标志变化。Windows和Linux ASAR复制入口同步包含该运行依赖。新增两份原包纯合成Markdown示例fixture。S6.a专项11/11、完整业务351/351、应用类型/构建、流水线182/182 PASS；首次TS空值缩窄错误已通过明确never函数声明修正。

范围边界：这只是协议基础，真实知识导入/导出事务、文件/剪贴板、Base64解码资源落库/宽度闭包、UI大纲尚未实现或验证。T32只有公式/颜色/逻辑图片URI文本往返，不能标真实图片测试PASS。当前知识正文图片保护仍生效。schema604生产入口不启用606，所有测试仅合成隔离；Win10/11人工/最终便携同包仍NOT_RUN。

下一项立即S6.b：复用现有知识API和protocol事务实现只读导入差异预览、同完整路径keep/replace/append、确认前树/正文/epoch重验与幂等/回执回滚；再接共享媒体校验/自主位置宽度、文件/剪贴板和Markdown大纲。完成S6后继续S7→S8→S9，不因推送/CI未结束或trust待审结束任务。原始阶段指令S6-MARKDOWN-KNOWLEDGE-EXCHANGE.md；精确语法/限制见KNOWLEDGE-MARKDOWN-ADR.md。自身SHA通过git/PR head解析，前序远端297a0bea。
