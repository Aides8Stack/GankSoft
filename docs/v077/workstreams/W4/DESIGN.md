# W4 — 设计与接口合同

> **W4 / P1** — AI 分卡 ZIP 导出与 Prompt。状态：NOT_STARTED；模型：GPT-6 / Medium；W 内依赖：W1、W3；Issues #35（导出）。

**此处只是待实施的最终需求定义，不代表已进入正式 Electron。** 准确性与刷新遵守 [数据同步合同](../../requirements/DATA-SYNC-CONSISTENCY.md)。

**状态：待实施 / 生产测试 NOT_RUN。模型 GPT-6 / Medium，复杂一致性冲突局部升级 High。依赖 W1 与 W3 统计读模型。**
关联 [#35](https://github.com/Aides8Stack/GankSoft/issues/35)，设计源参考该 Issue 与之前提供的 Vue/HTML 预览（**该预览尚未整体入库，实施前需归档/核验正式原型**）。遵守 [DATA-SYNC-CONSISTENCY.md](./DATA-SYNC-CONSISTENCY.md)。

## 设计合同
- 「学习分析 → AI 调度调整」是子页面，内部提供「导出 ZIP」「导入解析」「解析记录」；此批**只实现导出 ZIP 和 Prompt 编辑**。Prompt 编辑也是二级子页面，有保存与取消/返回，不创建顶部主导航按钮。
- ZIP **恰好两类主要内容**：`data/` 学习数据和 `prompt/analysis-prompt.md`。`data/manifest.json` 记录 schema、exportId、snapshotId、dataEpoch/dataRevision、索引、哈希/尺寸；`deck.json`；`knowledge/nodes-XXXX.json` 与 `index/cards-XXXX.json` 分片；每张卡 `cards/<opaque-card-id>/card.json` 与 `reviews-0001.json` 等历史分片。**禁止只有一个巨型 study-data.json**。
- 事件文件每片上限约 40 条或软 128KiB、单 JSON 硬 256KiB；超长正文需要安全分片或明确拒绝，绝不默默截断。导出固定一致快照，不能在多文件之间混入新旧卡片或调度记录。大卡片集流式 SQLite→ZIP 临时文件；失败清理 temp。
- 可选图片附件默认不导出；包含关键图片但未勾选时标记「材料不完整」并阻止 AI 据此自动推断图像内容。用户明确选择导出图片时校验引用与大小、ZIP 路径。
- Prompt 是人为配置，可修改并显式保存；变更 Prompt 仅失效下一次导出文件，不触发卡片列表或调度全量刷新。AI 不是在线服务，本批不向任何外部接口上传数据。

## 设计边界

- 旧 B1–B5 是已完成的既有软件功能，不需要再开发或重验所有历史用例。
- 本设计只属于 W4，变更权限限于本批直接相关的业务/服务/界面。
