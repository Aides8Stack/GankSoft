# 紧急保存与恢复起点（2026-10-25）

当前阶段：S6.b IN_PROGRESS。只进行保存，不新增开发、不重跑全量测试、不等待CI。
仓库 Aides8Stack/GankSoft；原分支 feature/v075-unified-learning-workspace；原 Draft PR #13。
保存前本地HEAD：e52f315c85767fed672c8eca3369aa0a627f7a58。
保存前已核实远端HEAD：1e4bd62f243289ace2cc3b7b8a83f5f03f4e5202（S6.a）。
本次保存SHA请通过下列git命令读取，禁止为回填自身SHA反复提交。
任务元数据的实际位置是 docs/development/TASK.json；根目录没有TASK.json，不创建重复文件。

## 已实现与未完成

S3、S4、S5自动化已归档DONE。S5精确297a0bea2397950f419e8d37eb0ee8782589261d / Run40094187621全部四项success，见S5-ACCEPTANCE.json。
S6.a已保存：CommonMark AST/state parser、标记转义、普通标题显式选择、原文正文保留、深度及结构诊断；专项11、业务351、流水线182通过。
S6.b本次保存：只读导入预览/分页/正文差异，完整路径默认keep、显式replace/append，确认前treeHash/epoch重验及原请求幂等回执；跨分支选择导出与必要祖先，父正文/后代可选；预览、剪贴板、文件共用同一序列化；原生MD打开/保存端口；122项协议及前端服务包装；6项合成SQLite集成测试。
预览仅内存保存，绑定DB handle/deck/epoch并有五分钟有效期，重启后需重新预览。文件写入后回执未知不能自动重复写入。

未完成：Base64图片MIME/大小/解码与资源落库、每处Placement宽度、资源完整性/备份闭包；导入导出UI、可编辑Markdown大纲及目录；真实图片数据库往返及S6 T28–T32/T36完整验收。现有知识正文图片拒绝保护仍生效。S7–S9未实现，不能标DONE。
生产schema仍604，不自动激活606；Win10/11人工IME、真实交互、最终便携同包验收仍NOT_RUN。

## 最新测试与阻断

沿用中断前已执行证据：S6.b专项6/6、业务357/357、协议21/122方法及类型/边界/导出、build PASS；ASAR日志末尾已观察到GANKSOFT_ASAR_COMPLETE。以上不是本次重跑；旧/tmp原始日志现已不存在，不上传日志也不虚构新测试。S6.b Windows、图片、UI未验证。
上一次紧急保存曾被平台自动审批检查阻止：workspace out of credits，动作未执行；本次额度恢复后重新核验并保存。CI本次不等待、不轮询；trust所有者审核只影响合并，禁止自行审批。

## 保存前尚未提交文件（本次纳入）

- `docs/protocol/API-INDEX.md`
- `docs/protocol/contracts-v2.json`
- `electron/main.ts`
- `electron/modules/knowledge-unified/storage.ts`
- `electron/protocol/gateway.ts`
- `shared/knowledge/markdown.ts`
- `shared/protocol/registry.ts`
- `src/services.ts`
- `electron/modules/knowledge-unified/markdown-exchange.ts`
- `shared/protocol/knowledge-markdown.ts`
- `tests/knowledge-markdown-store-v075.test.ts`
- `docs/development/RECOVERY-NEXT.md`
- `docs/development/TASK.json`

只上传上述项目原创源码、文档和合成测试；排除数据库、压缩包、私人物件及敏感日志。详细PROGRESS/HANDOFF/TEST_REPORT归档下次补齐。

## 新Work直接执行

```bash
git branch --show-current
git status --short
git log -1 --format=%H -- docs/development/RECOVERY-NEXT.md
git ls-remote origin refs/heads/feature/v075-unified-learning-workspace
cat docs/development/RECOVERY-NEXT.md
cat docs/development/TASK.json
```

先核对已保存SHA和一次CI实际状态；失败只读具体Job并最小修复，不重做S2/S3或已完成阶段。精确开发起点：S6.c图片/资源闭包，先读storage.ts、markdown-exchange.ts及现有media/drafts.ts和完整性/备份适配，复用已有资源边界、事务与回执；然后补导入导出UI及大纲、完成S6验收再S7→S8→S9。仅阅读原S6阶段指令和必要ADR，不重读整个工作包。新增功能后按范围验证；如需先核实文本后端，专项命令：

```bash
node --experimental-strip-types --test tests/knowledge-markdown-store-v075.test.ts
```

不得访问真实用户库，不新建分支/PR，不自动审批/合并/发布，不强推、不降门禁。此次用户明确要求保存后停止；下次恢复后再继续开发。
